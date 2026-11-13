package expo.modules.androidcalllog

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject

/**
 * Settings and number lists for the "Is this your lead?" call prompt.
 *
 * The phone-state receiver runs when the JS app is not running, so every value
 * it needs lives here (app-private SharedPreferences), written by JS through
 * [AndroidCallLogModule] and read by [IncomingCallReceiver].
 */
internal object CallLeadPromptStore {
  private const val PREFS = "salesfast_call_lead_prompt"

  private const val ENABLED = "enabled"
  private const val SKIP_CONTACTS = "skip_contacts"
  private const val SESSION_ACTIVE = "session_active"
  private const val CONFIGURED_AT = "configured_at"
  private const val KNOWN_KEYS = "known_lead_keys"
  private const val KNOWN_SYNCED_AT = "known_synced_at"
  private const val IGNORED_KEYS = "ignored_keys"

  /** The ring in progress (receivers are new objects for every broadcast). */
  private const val RING_AT = "ring_at"
  private const val RING_PROMPTED = "ring_prompted"

  private const val LAST_PROMPT_KEY = "last_prompt_key"
  private const val LAST_PROMPT_AT = "last_prompt_at"

  /** Call-capture credentials (token encrypted by [SecretBox]). */
  private const val API_URL = "capture_api_url"
  private const val TOKEN_ENC = "capture_token_enc"
  private const val TOKEN_USER = "capture_token_user"
  private const val TOKEN_EXPIRES_AT = "capture_token_expires_at"
  private const val DEVICE_ID = "capture_device_id"

  /** Leads the user saved from the notification that the server has not confirmed. */
  private const val PENDING = "pending_leads"

  /** A "Not a lead" list larger than this is cut to half (sets keep no order). */
  private const val MAX_IGNORED = 2_000

  private fun prefs(context: Context): SharedPreferences =
    context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /**
   * Same key as the app's `phoneMatchKey` and the server's match directory:
   * the last 10 digits, so 01712345678 and +8801712345678 are one number.
   * Hidden and short numbers have no key and are never prompted.
   */
  fun phoneKey(raw: String?): String? {
    val digits = raw.orEmpty().filter { it.isDigit() }
    if (digits.length < 7) return null
    return if (digits.length >= 10) digits.takeLast(10) else digits
  }

  data class Config(
    val enabled: Boolean,
    val skipContacts: Boolean,
    val sessionActive: Boolean,
    val configuredAt: Long,
    val knownCount: Int,
    val knownSyncedAt: Long,
    val ignoredCount: Int,
    val pendingCount: Int,
  )

  fun config(context: Context): Config {
    val p = prefs(context)
    return Config(
      enabled = p.getBoolean(ENABLED, false),
      skipContacts = p.getBoolean(SKIP_CONTACTS, true),
      sessionActive = p.getBoolean(SESSION_ACTIVE, false),
      configuredAt = p.getLong(CONFIGURED_AT, 0L),
      knownCount = p.getStringSet(KNOWN_KEYS, null)?.size ?: 0,
      knownSyncedAt = p.getLong(KNOWN_SYNCED_AT, 0L),
      ignoredCount = p.getStringSet(IGNORED_KEYS, null)?.size ?: 0,
      pendingCount = pendingJson(context).length(),
    )
  }

  /** Prompt only when the user turned it on and someone is signed in. */
  fun isActive(context: Context): Boolean {
    val p = prefs(context)
    return p.getBoolean(ENABLED, false) && p.getBoolean(SESSION_ACTIVE, false)
  }

  fun skipContacts(context: Context) = prefs(context).getBoolean(SKIP_CONTACTS, true)

  fun setConfig(context: Context, enabled: Boolean, skipContacts: Boolean) {
    prefs(context)
      .edit()
      .putBoolean(ENABLED, enabled)
      .putBoolean(SKIP_CONTACTS, skipContacts)
      .putLong(CONFIGURED_AT, System.currentTimeMillis())
      .apply()
  }

  /**
   * Signed in (with this user) or signed out. A token that belongs to another
   * account is dropped at once, so a call can never be saved to the wrong user.
   */
  fun setSessionActive(context: Context, active: Boolean, userId: String?) {
    val p = prefs(context)
    val editor = p.edit().putBoolean(SESSION_ACTIVE, active)
    if (!active || (userId != null && p.getString(TOKEN_USER, null) != userId)) {
      clearCredentials(editor)
    }
    editor.commit()
  }

  // ---- call-capture credentials ----

  data class Credentials(
    val apiUrl: String,
    val token: String,
    val userId: String,
    val expiresAt: Long,
    val deviceId: String?,
  )

  fun setCredentials(
    context: Context,
    apiUrl: String,
    token: String,
    userId: String,
    expiresAt: Long,
    deviceId: String?,
  ): Boolean {
    val sealed = SecretBox.encrypt(token) ?: return false
    prefs(context)
      .edit()
      .putString(API_URL, apiUrl)
      .putString(TOKEN_ENC, sealed)
      .putString(TOKEN_USER, userId)
      .putLong(TOKEN_EXPIRES_AT, expiresAt)
      .putString(DEVICE_ID, deviceId)
      .commit()
    return true
  }

  /** Usable credentials, or null (none, expired, or the Keystore key is gone). */
  fun credentials(context: Context): Credentials? {
    val p = prefs(context)
    val apiUrl = p.getString(API_URL, null) ?: return null
    val sealed = p.getString(TOKEN_ENC, null) ?: return null
    val userId = p.getString(TOKEN_USER, null) ?: return null
    val expiresAt = p.getLong(TOKEN_EXPIRES_AT, 0L)
    if (expiresAt <= System.currentTimeMillis()) return null
    val token = SecretBox.decrypt(sealed) ?: return null
    return Credentials(apiUrl, token, userId, expiresAt, p.getString(DEVICE_ID, null))
  }

  /** userId and expiry of the stored token, without decrypting it. */
  fun credentialsInfo(context: Context): Pair<String?, Long> {
    val p = prefs(context)
    if (p.getString(TOKEN_ENC, null) == null) return null to 0L
    return p.getString(TOKEN_USER, null) to p.getLong(TOKEN_EXPIRES_AT, 0L)
  }

  fun clearCredentials(context: Context) {
    val editor = prefs(context).edit()
    clearCredentials(editor)
    editor.commit()
  }

  private fun clearCredentials(editor: SharedPreferences.Editor) {
    editor.remove(TOKEN_ENC).remove(TOKEN_USER).remove(TOKEN_EXPIRES_AT)
  }

  // ---- leads waiting for the server ----

  data class PendingLead(val key: String, val phone: String, val name: String?, val ringAt: Long) {
    /** Same key the app's capture screen sends, so the server dedupes the two. */
    val idempotencyKey get() = "call-lead:$key:$ringAt"
  }

  @Synchronized
  fun putPending(context: Context, lead: PendingLead) {
    val all = pendingJson(context)
    all.put(
      lead.key,
      JSONObject()
        .put("phone", lead.phone)
        .put("name", lead.name ?: JSONObject.NULL)
        .put("ringAt", lead.ringAt),
    )
    prefs(context).edit().putString(PENDING, all.toString()).commit()
  }

  @Synchronized
  fun removePending(context: Context, key: String) {
    val all = pendingJson(context)
    if (all.remove(key) == null) return
    prefs(context).edit().putString(PENDING, all.toString()).commit()
  }

  @Synchronized
  fun pending(context: Context, key: String): PendingLead? =
    pendingJson(context).optJSONObject(key)?.let { toPending(key, it) }

  @Synchronized
  fun pendingLeads(context: Context): List<PendingLead> {
    val all = pendingJson(context)
    return all.keys().asSequence().mapNotNull { key -> all.optJSONObject(key)?.let { toPending(key, it) } }.toList()
  }

  private fun toPending(key: String, json: JSONObject) =
    PendingLead(
      key = key,
      phone = json.optString("phone"),
      name = if (json.isNull("name")) null else json.optString("name"),
      ringAt = json.optLong("ringAt"),
    )

  private fun pendingJson(context: Context): JSONObject =
    try {
      JSONObject(prefs(context).getString(PENDING, null) ?: "{}")
    } catch (_: Exception) {
      JSONObject()
    }

  /** Replaces the CRM lead numbers (match-directory keys). */
  fun setKnownKeys(context: Context, keys: Collection<String>) {
    val next = keys.mapNotNull { phoneKey(it) }.toHashSet()
    val p = prefs(context)
    val editor = p.edit().putLong(KNOWN_SYNCED_AT, System.currentTimeMillis())
    // Skip the big rewrite when the directory did not change.
    if (p.getStringSet(KNOWN_KEYS, null) != next) editor.putStringSet(KNOWN_KEYS, next)
    editor.apply()
  }

  fun addKnownKey(context: Context, key: String) = addToSet(context, KNOWN_KEYS, key, Int.MAX_VALUE)

  fun addIgnoredKey(context: Context, key: String) = addToSet(context, IGNORED_KEYS, key, MAX_IGNORED)

  fun clearIgnored(context: Context) {
    prefs(context).edit().remove(IGNORED_KEYS).apply()
  }

  fun isKnownOrIgnored(context: Context, key: String): Boolean {
    val p = prefs(context)
    return p.getStringSet(KNOWN_KEYS, null)?.contains(key) == true ||
      p.getStringSet(IGNORED_KEYS, null)?.contains(key) == true
  }

  private fun addToSet(context: Context, name: String, key: String, max: Int) {
    val p = prefs(context)
    // The returned set must not be modified in place.
    val next = LinkedHashSet(p.getStringSet(name, emptySet()) ?: emptySet())
    if (!next.add(key)) return
    val trimmed = if (next.size > max) next.drop(next.size - max / 2).toHashSet() else next
    p.edit().putStringSet(name, trimmed).apply()
  }

  // ---- ring tracking ----

  /** Starts a ring unless one is already open; returns when it started. */
  fun beginRing(context: Context, now: Long): Long {
    val p = prefs(context)
    val open = p.getLong(RING_AT, 0L)
    // A ring older than 10 minutes was never closed (process killed) — start over.
    if (open > 0L && now - open < 10 * 60_000L) return open
    p.edit().putLong(RING_AT, now).putBoolean(RING_PROMPTED, false).commit()
    return now
  }

  /** Closes the open ring. Returns its start and whether it was prompted. */
  fun endRing(context: Context): Pair<Long, Boolean>? {
    val p = prefs(context)
    val open = p.getLong(RING_AT, 0L)
    if (open == 0L) return null
    val prompted = p.getBoolean(RING_PROMPTED, false)
    p.edit().remove(RING_AT).remove(RING_PROMPTED).commit()
    return open to prompted
  }

  fun markRingPrompted(context: Context) {
    prefs(context).edit().putBoolean(RING_PROMPTED, true).apply()
  }

  /** One prompt per number per call: both phone-state broadcasts reach us. */
  fun wasJustPrompted(context: Context, key: String, now: Long): Boolean {
    val p = prefs(context)
    return p.getString(LAST_PROMPT_KEY, null) == key &&
      now - p.getLong(LAST_PROMPT_AT, 0L) < 2 * 60_000L
  }

  fun recordPrompt(context: Context, key: String, now: Long) {
    prefs(context).edit().putString(LAST_PROMPT_KEY, key).putLong(LAST_PROMPT_AT, now).commit()
  }
}
