package expo.modules.androidcalllog

import android.Manifest
import android.content.pm.PackageManager
import android.provider.CallLog
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.concurrent.thread

class AndroidCallLogModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AndroidCallLog")

    AsyncFunction("hasPermission") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.READ_CALL_LOG
      ) == PackageManager.PERMISSION_GRANTED
    }

    AsyncFunction("getRecentCalls") { limit: Int, minDateMs: Double ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val granted =
        ContextCompat.checkSelfPermission(
          context,
          Manifest.permission.READ_CALL_LOG
        ) == PackageManager.PERMISSION_GRANTED

      if (!granted) {
        throw Exception("READ_CALL_LOG not granted")
      }

      val safeLimit = limit.coerceIn(1, 300)
      val minMs = minDateMs.toLong().coerceAtLeast(0L)
      val projection =
        arrayOf(
          CallLog.Calls._ID,
          CallLog.Calls.NUMBER,
          CallLog.Calls.TYPE,
          CallLog.Calls.DATE,
          CallLog.Calls.DURATION
        )

      val selection = if (minMs > 0L) "${CallLog.Calls.DATE} >= ?" else null
      val selectionArgs = if (minMs > 0L) arrayOf(minMs.toString()) else null

      val rows = mutableListOf<Map<String, Any?>>()
      context.contentResolver
        .query(
          CallLog.Calls.CONTENT_URI,
          projection,
          selection,
          selectionArgs,
          "${CallLog.Calls.DATE} DESC"
        )
        ?.use { cursor ->
          val idIdx = cursor.getColumnIndex(CallLog.Calls._ID)
          val numberIdx = cursor.getColumnIndex(CallLog.Calls.NUMBER)
          val typeIdx = cursor.getColumnIndex(CallLog.Calls.TYPE)
          val dateIdx = cursor.getColumnIndex(CallLog.Calls.DATE)
          val durationIdx = cursor.getColumnIndex(CallLog.Calls.DURATION)

          var count = 0
          while (cursor.moveToNext() && count < safeLimit) {
            val id = if (idIdx >= 0) cursor.getLong(idIdx).toString() else count.toString()
            val number = if (numberIdx >= 0) cursor.getString(numberIdx) ?: "" else ""
            val type = if (typeIdx >= 0) cursor.getInt(typeIdx) else 0
            val dateMs = if (dateIdx >= 0) cursor.getLong(dateIdx) else 0L
            val durationSec = if (durationIdx >= 0) cursor.getLong(durationIdx).toInt() else 0

            rows.add(
              mapOf(
                "id" to id,
                "number" to number,
                "type" to type,
                "dateMs" to dateMs.toDouble(),
                "durationSec" to durationSec
              )
            )
            count += 1
          }
        }

      rows
    }

    // ---- "Is this your lead?" call prompt ----

    AsyncFunction("getCallLeadPromptConfig") {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val config = CallLeadPromptStore.config(context)
      mapOf(
        "enabled" to config.enabled,
        "skipContacts" to config.skipContacts,
        "sessionActive" to config.sessionActive,
        "configuredAtMs" to config.configuredAt.toDouble(),
        "knownCount" to config.knownCount,
        "knownSyncedAtMs" to config.knownSyncedAt.toDouble(),
        "ignoredCount" to config.ignoredCount,
        "pendingCount" to config.pendingCount
      )
    }

    AsyncFunction("setCallLeadPromptConfig") { enabled: Boolean, skipContacts: Boolean ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      CallLeadPromptStore.setConfig(context, enabled, skipContacts)
      // Visible under App info → Notifications as soon as the feature is on.
      if (enabled) CallLeadPrompter.ensureChannel(context.applicationContext)
    }

    /** userId: who is signed in; a token of any other account is dropped. */
    AsyncFunction("setCallLeadSessionActive") { active: Boolean, userId: String? ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      CallLeadPromptStore.setSessionActive(context, active, userId)
    }

    /** The narrow token that lets the notification save a lead (app closed). */
    AsyncFunction("setCallCaptureCredentials") {
      apiUrl: String, token: String, userId: String, expiresAtMs: Double, deviceId: String? ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      CallLeadPromptStore.setCredentials(context, apiUrl, token, userId, expiresAtMs.toLong(), deviceId)
    }

    AsyncFunction("clearCallCaptureCredentials") {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      CallLeadPromptStore.clearCredentials(context)
    }

    AsyncFunction("getCallCaptureStatus") {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val (userId, expiresAt) = CallLeadPromptStore.credentialsInfo(context)
      mapOf("userId" to userId, "expiresAtMs" to expiresAt.toDouble())
    }

    /** Sends leads saved from the notification while offline / signed out. */
    AsyncFunction("flushPendingCallLeads") {
      val context = appContext.reactContext?.applicationContext ?: throw Exceptions.ReactContextLost()
      val count = CallLeadPromptStore.pendingLeads(context).size
      if (count > 0) thread(name = "call-lead-flush") { CallLeadSaver.flush(context) }
      count
    }

    AsyncFunction("setKnownLeadPhoneKeys") { keys: List<String> ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      CallLeadPromptStore.setKnownKeys(context, keys)
    }

    /** A lead now exists for this number: stop asking and clear its prompt. */
    AsyncFunction("markLeadPhoneKnown") { phone: String ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val key = CallLeadPromptStore.phoneKey(phone) ?: return@AsyncFunction
      CallLeadPromptStore.addKnownKey(context, key)
      CallLeadPromptStore.removePending(context, key)
      CallLeadPrompter.cancel(context, key)
    }

    /** "Not a lead" from inside the app. */
    AsyncFunction("ignoreLeadPhone") { phone: String ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val key = CallLeadPromptStore.phoneKey(phone) ?: return@AsyncFunction
      CallLeadPromptStore.addIgnoredKey(context, key)
      CallLeadPromptStore.removePending(context, key)
      CallLeadPrompter.cancel(context, key)
    }

    AsyncFunction("clearIgnoredLeadPhones") {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      CallLeadPromptStore.clearIgnored(context)
    }
  }
}
