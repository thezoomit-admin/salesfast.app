package expo.modules.androidcalllog

import android.content.Context
import android.util.Log
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

/**
 * Saves a lead from the call notification while the app is closed:
 * POST {api}/crm/mobile/call-capture/leads with the narrow call-capture token
 * (never the user's session tokens, which the app keeps rotating).
 */
internal object CallCaptureClient {
  private const val TAG = "CallLeadPrompt"

  /** Both together stay under a broadcast receiver's ~10 s budget. */
  private const val CONNECT_TIMEOUT_MS = 4_000
  private const val READ_TIMEOUT_MS = 5_000

  sealed class Outcome {
    data class Saved(val leadId: Long, val name: String, val created: Boolean) : Outcome()

    /** [retry]: worth trying again later (offline, server error). */
    data class Failed(val message: String, val retry: Boolean) : Outcome()

    /** No usable token: the app must be opened (signed in) to finish. */
    object NeedsApp : Outcome()
  }

  fun save(context: Context, lead: CallLeadPromptStore.PendingLead): Outcome {
    val credentials = CallLeadPromptStore.credentials(context) ?: return Outcome.NeedsApp
    val url = URL(credentials.apiUrl.trimEnd('/') + "/crm/mobile/call-capture/leads")
    var connection: HttpURLConnection? = null
    return try {
      connection = (url.openConnection() as HttpURLConnection).apply {
        requestMethod = "POST"
        connectTimeout = CONNECT_TIMEOUT_MS
        readTimeout = READ_TIMEOUT_MS
        doOutput = true
        setRequestProperty("Content-Type", "application/json")
        setRequestProperty("Accept", "application/json")
        setRequestProperty("Authorization", "Bearer ${credentials.token}")
        setRequestProperty("Idempotency-Key", lead.idempotencyKey)
        credentials.deviceId?.let { setRequestProperty("X-Device-Id", it) }
      }
      val body =
        JSONObject()
          .put("phone", lead.phone)
          .put("fullName", lead.name ?: JSONObject.NULL)
          .put("ringAt", lead.ringAt)
      connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }

      val code = connection.responseCode
      val text =
        (if (code < 400) connection.inputStream else connection.errorStream)
          ?.bufferedReader()
          ?.use { it.readText() }
          .orEmpty()
      val json = runCatching { JSONObject(text) }.getOrNull()
      val message = json?.optString("message")?.takeIf { it.isNotBlank() }

      when {
        code in 200..299 -> {
          val data = json?.optJSONObject("data")
          val saved = data?.optJSONObject("lead")
          Outcome.Saved(
            leadId = saved?.optLong("id") ?: 0L,
            name = saved?.optString("fullName").orEmpty(),
            created = data?.optBoolean("created", true) ?: true,
          )
        }
        code == 401 -> {
          // Signed out or session revoked: the token is dead for good.
          CallLeadPromptStore.clearCredentials(context)
          Outcome.NeedsApp
        }
        // Server without this endpoint yet — finish in the app instead.
        code == 404 -> Outcome.NeedsApp
        code == 403 -> Outcome.Failed(message ?: "Your account cannot add leads.", retry = false)
        code in 400..499 -> Outcome.Failed(message ?: "The lead could not be saved.", retry = false)
        else -> Outcome.Failed("SalesFast is not responding. Try again.", retry = true)
      }
    } catch (e: IOException) {
      Log.w(TAG, "Save failed", e)
      Outcome.Failed("No internet connection. Try again.", retry = true)
    } finally {
      connection?.disconnect()
    }
  }
}
