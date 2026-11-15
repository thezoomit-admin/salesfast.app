package expo.modules.androidcalllog

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * WhatsApp call tracking on this phone: settings, the call in progress, and
 * finished calls waiting for the app's call sync.
 *
 * Everything lives in app-private SharedPreferences on this device only, so
 * each phone signed in to the same account has its own on/off switches.
 * Only calls are stored (number, direction, time, length) — never names,
 * message text or anything else a notification carries.
 */
internal object WhatsAppCallStore {
  private const val PREFS = "salesfast_whatsapp_calls"

  const val PKG_WHATSAPP = "com.whatsapp"
  const val PKG_BUSINESS = "com.whatsapp.w4b"

  private const val SYNC_ENABLED = "sync_enabled"
  private const val PROMPT_ENABLED = "prompt_enabled"
  private const val TRACK_WHATSAPP = "track_whatsapp"
  private const val TRACK_BUSINESS = "track_business"
  private const val CONFIGURED_AT = "configured_at"

  private const val ACTIVE = "active_calls"
  private const val FINISHED = "finished_calls"
  private const val LAST_EVENT_AT = "last_event_at"
  private const val UNRESOLVED_COUNT = "unresolved_count"
  private const val DIAGNOSTICS = "diagnostics"

  /** Same window as the phone call log the app reads (300 rows). */
  private const val MAX_FINISHED = 300
  private const val FINISHED_MAX_AGE_MS = 30L * 24 * 60 * 60_000L
  private const val MAX_DIAGNOSTICS = 25

  private fun prefs(context: Context): SharedPreferences =
    context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  // ---- settings ----

  data class Config(
    val syncEnabled: Boolean,
    val promptEnabled: Boolean,
    val trackWhatsApp: Boolean,
    val trackBusiness: Boolean,
    val configuredAt: Long,
    val lastEventAt: Long,
    val finishedCount: Int,
    val unresolvedCount: Int,
  )

  fun config(context: Context): Config {
    val p = prefs(context)
    return Config(
      syncEnabled = p.getBoolean(SYNC_ENABLED, false),
      promptEnabled = p.getBoolean(PROMPT_ENABLED, false),
      trackWhatsApp = p.getBoolean(TRACK_WHATSAPP, true),
      trackBusiness = p.getBoolean(TRACK_BUSINESS, true),
      configuredAt = p.getLong(CONFIGURED_AT, 0L),
      lastEventAt = p.getLong(LAST_EVENT_AT, 0L),
      finishedCount = finishedJson(context).length(),
      unresolvedCount = p.getInt(UNRESOLVED_COUNT, 0),
    )
  }

  fun setConfig(
    context: Context,
    syncEnabled: Boolean,
    promptEnabled: Boolean,
    trackWhatsApp: Boolean,
    trackBusiness: Boolean,
  ) {
    val editor =
      prefs(context)
        .edit()
        .putBoolean(SYNC_ENABLED, syncEnabled)
        .putBoolean(PROMPT_ENABLED, promptEnabled)
        .putBoolean(TRACK_WHATSAPP, trackWhatsApp)
        .putBoolean(TRACK_BUSINESS, trackBusiness)
        .putLong(CONFIGURED_AT, System.currentTimeMillis())
    // Turned fully off: forget the call in progress, keep nothing half-done.
    if (!syncEnabled && !promptEnabled) editor.remove(ACTIVE)
    editor.commit()
  }

  /** Signed in, and at least one WhatsApp feature is on. */
  fun isActive(context: Context): Boolean {
    val p = prefs(context)
    val anyOn = p.getBoolean(SYNC_ENABLED, false) || p.getBoolean(PROMPT_ENABLED, false)
    return anyOn && CallLeadPromptStore.isSessionActive(context)
  }

  fun syncActive(context: Context) =
    prefs(context).getBoolean(SYNC_ENABLED, false) && CallLeadPromptStore.isSessionActive(context)

  fun promptActive(context: Context) =
    prefs(context).getBoolean(PROMPT_ENABLED, false) && CallLeadPromptStore.isSessionActive(context)

  /** WhatsApp / WhatsApp Business, each with its own switch. */
  fun isTracked(context: Context, packageName: String): Boolean {
    val p = prefs(context)
    return when (packageName) {
      PKG_WHATSAPP -> p.getBoolean(TRACK_WHATSAPP, true)
      PKG_BUSINESS -> p.getBoolean(TRACK_BUSINESS, true)
      else -> false
    }
  }

  // ---- the call in progress (one per WhatsApp app) ----

  data class ActiveCall(
    val packageName: String,
    /** Raw number as found; null until one is resolved. */
    val number: String?,
    /** First time any notification of this call was seen. */
    val startedAt: Long,
    /** Seen ringing with Answer/Decline → it was an incoming call. */
    val incoming: Boolean,
    /** Call connected (timer running); 0 = never connected. */
    val connectedAt: Long,
    /** The call notification went away; 0 = still showing. */
    val endedAt: Long,
    val prompted: Boolean,
    val video: Boolean,
    /** Seen from the start (ring or dial), so the direction is known. */
    val known: Boolean,
    /** Last time a notification of this call was posted. */
    val lastSeenAt: Long,
  ) {
    fun toJson(): JSONObject =
      JSONObject()
        .put("pkg", packageName)
        .put("number", number ?: JSONObject.NULL)
        .put("startedAt", startedAt)
        .put("incoming", incoming)
        .put("connectedAt", connectedAt)
        .put("endedAt", endedAt)
        .put("prompted", prompted)
        .put("video", video)
        .put("known", known)
        .put("lastSeenAt", lastSeenAt)

    companion object {
      fun fromJson(json: JSONObject) =
        ActiveCall(
          packageName = json.optString("pkg"),
          number = if (json.isNull("number")) null else json.optString("number").ifBlank { null },
          startedAt = json.optLong("startedAt"),
          incoming = json.optBoolean("incoming"),
          connectedAt = json.optLong("connectedAt"),
          endedAt = json.optLong("endedAt"),
          prompted = json.optBoolean("prompted"),
          video = json.optBoolean("video"),
          known = json.optBoolean("known", true),
          lastSeenAt = json.optLong("lastSeenAt"),
        )
    }
  }

  @Synchronized
  fun activeCall(context: Context, packageName: String): ActiveCall? =
    activeJson(context).optJSONObject(packageName)?.let { ActiveCall.fromJson(it) }

  @Synchronized
  fun activeCalls(context: Context): List<ActiveCall> {
    val all = activeJson(context)
    return all.keys().asSequence().mapNotNull { all.optJSONObject(it)?.let(ActiveCall::fromJson) }.toList()
  }

  @Synchronized
  fun putActive(context: Context, call: ActiveCall) {
    val all = activeJson(context)
    all.put(call.packageName, call.toJson())
    prefs(context)
      .edit()
      .putString(ACTIVE, all.toString())
      .putLong(LAST_EVENT_AT, System.currentTimeMillis())
      .commit()
  }

  @Synchronized
  fun removeActive(context: Context, packageName: String) {
    val all = activeJson(context)
    if (all.remove(packageName) == null) return
    prefs(context).edit().putString(ACTIVE, all.toString()).commit()
  }

  private fun activeJson(context: Context): JSONObject =
    try {
      JSONObject(prefs(context).getString(ACTIVE, null) ?: "{}")
    } catch (_: Exception) {
      JSONObject()
    }

  // ---- finished calls (read by the app's call sync) ----

  data class FinishedCall(
    val id: String,
    val packageName: String,
    val number: String,
    /** INCOMING / OUTGOING / MISSED / UNKNOWN — the server's call-sync values. */
    val direction: String,
    val startedAt: Long,
    val durationSec: Int,
    val video: Boolean,
  )

  /**
   * Adds a finished call. The same call reported twice (an end and then a
   * "missed call" notification) is kept once: same app, number and minute.
   */
  @Synchronized
  fun addFinished(context: Context, call: FinishedCall): Boolean {
    val now = System.currentTimeMillis()
    val key = CallLeadPromptStore.phoneKey(call.number) ?: return false
    val current = finishedJson(context)
    val kept = JSONArray()
    for (i in 0 until current.length()) {
      val row = current.optJSONObject(i) ?: continue
      if (now - row.optLong("startedAt") > FINISHED_MAX_AGE_MS) continue
      val sameCall =
        row.optString("pkg") == call.packageName &&
          CallLeadPromptStore.phoneKey(row.optString("number")) == key &&
          kotlin.math.abs(row.optLong("startedAt") - call.startedAt) < DUPLICATE_WINDOW_MS
      if (sameCall) return false
      kept.put(row)
    }
    kept.put(
      JSONObject()
        .put("id", call.id)
        .put("pkg", call.packageName)
        .put("number", call.number)
        .put("direction", call.direction)
        .put("startedAt", call.startedAt)
        .put("durationSec", call.durationSec)
        .put("video", call.video)
    )
    // Oldest first in storage; keep the newest MAX_FINISHED.
    val trimmed =
      if (kept.length() <= MAX_FINISHED) kept
      else JSONArray().also { out -> for (i in kept.length() - MAX_FINISHED until kept.length()) out.put(kept.get(i)) }
    prefs(context)
      .edit()
      .putString(FINISHED, trimmed.toString())
      .putLong(LAST_EVENT_AT, now)
      .commit()
    return true
  }

  /** Newest first, at most [limit], none older than [minStartedAt]. */
  @Synchronized
  fun finishedCalls(context: Context, limit: Int, minStartedAt: Long): List<FinishedCall> {
    val all = finishedJson(context)
    val out = ArrayList<FinishedCall>()
    for (i in all.length() - 1 downTo 0) {
      if (out.size >= limit) break
      val row = all.optJSONObject(i) ?: continue
      val startedAt = row.optLong("startedAt")
      if (startedAt < minStartedAt) continue
      out.add(
        FinishedCall(
          id = row.optString("id"),
          packageName = row.optString("pkg"),
          number = row.optString("number"),
          direction = row.optString("direction", "UNKNOWN"),
          startedAt = startedAt,
          durationSec = row.optInt("durationSec"),
          video = row.optBoolean("video"),
        )
      )
    }
    return out
  }

  fun clearFinished(context: Context) {
    prefs(context).edit().remove(FINISHED).remove(UNRESOLVED_COUNT).remove(DIAGNOSTICS).apply()
  }

  /** A call whose number could not be worked out (name only, group call). */
  fun countUnresolved(context: Context) {
    val p = prefs(context)
    p.edit().putInt(UNRESOLVED_COUNT, p.getInt(UNRESOLVED_COUNT, 0) + 1).apply()
  }

  private fun finishedJson(context: Context): JSONArray =
    try {
      JSONArray(prefs(context).getString(FINISHED, null) ?: "[]")
    } catch (_: Exception) {
      JSONArray()
    }

  // ---- diagnostics (shape of call notifications, no names or numbers) ----

  @Synchronized
  fun addDiagnostic(context: Context, line: String) {
    val p = prefs(context)
    val current =
      try {
        JSONArray(p.getString(DIAGNOSTICS, null) ?: "[]")
      } catch (_: Exception) {
        JSONArray()
      }
    current.put(line)
    val trimmed =
      if (current.length() <= MAX_DIAGNOSTICS) current
      else JSONArray().also { out -> for (i in current.length() - MAX_DIAGNOSTICS until current.length()) out.put(current.get(i)) }
    p.edit().putString(DIAGNOSTICS, trimmed.toString()).apply()
  }

  fun diagnostics(context: Context): List<String> {
    val all =
      try {
        JSONArray(prefs(context).getString(DIAGNOSTICS, null) ?: "[]")
      } catch (_: Exception) {
        JSONArray()
      }
    return (0 until all.length()).map { all.optString(it) }
  }

  /** An end and a later "missed call" notification for one call land this close. */
  private const val DUPLICATE_WINDOW_MS = 90_000L
}
