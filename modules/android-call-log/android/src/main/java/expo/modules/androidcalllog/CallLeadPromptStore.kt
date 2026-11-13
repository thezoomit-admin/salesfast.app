package expo.modules.androidcalllog

import android.content.Context
import android.content.SharedPreferences

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

  fun setSessionActive(context: Context, active: Boolean) {
    prefs(context).edit().putBoolean(SESSION_ACTIVE, active).apply()
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
