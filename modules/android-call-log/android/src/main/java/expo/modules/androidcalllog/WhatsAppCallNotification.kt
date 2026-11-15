package expo.modules.androidcalllog

import android.Manifest
import android.app.Notification
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.ContactsContract
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * Reads one WhatsApp notification and says whether it is about a call, and
 * which state the call is in. Chat messages and everything else return null
 * and are never looked at again.
 *
 * Signals are structural (category, ongoing flag, call timer, full-screen
 * intent, Android's CallStyle type), not the visible text: WhatsApp shows
 * that text in the phone's language and changes it between versions. Text
 * is used only as a last hint for missed calls and for "call in progress".
 */
internal object WhatsAppCallNotification {
  private const val TAG = "WaCallTrack"

  enum class Kind {
    /** Incoming call ringing (Answer / Decline). */
    RINGING_IN,
    /** Call notification without a running timer: dialing, or "Ringing…". */
    DIALING,
    /** Call connected — the timer is running. */
    CONNECTED,
    /** "Missed voice / video call". */
    MISSED,
  }

  data class Snapshot(
    val packageName: String,
    val notificationKey: String,
    val kind: Kind,
    /** Raw text the caller may be in: a number, or a contact name. */
    val numberHint: String?,
    val nameHint: String?,
    val video: Boolean,
    /** For CONNECTED: when the timer started, if the notification says. */
    val connectedAt: Long?,
    /** For MISSED: when the call was. */
    val eventAt: Long,
    /** Short description of the notification's shape, for diagnostics. */
    val shape: String,
  )

  private const val CATEGORY_MISSED_CALL = "missed_call"
  private const val EXTRA_CALL_TYPE = "android.callType"
  private const val EXTRA_CALL_PERSON = "android.callPerson"
  private const val CALL_TYPE_INCOMING = 1

  private val MISSED_RE =
    Regex(
      "missed (voice |video )?calls?|silenced (voice |video )?calls?|মিসড|মিস (ভয়েস |ভিডিও )?কল|ছুটে যাওয়া",
      RegexOption.IGNORE_CASE,
    )
  private val ONGOING_RE =
    Regex("ongoing (voice |video )?call|in call|চলমান|কলে আছেন", RegexOption.IGNORE_CASE)
  private val VIDEO_RE = Regex("video|ভিডিও", RegexOption.IGNORE_CASE)
  private val PHONE_RE = Regex("\\+?\\d[\\d\\s\\-().]{5,}\\d")

  /** Titles that name the app or the call, not the caller. */
  private val GENERIC_TITLE_RE =
    Regex(
      "^(whatsapp( business)?|incoming (voice |video )?call|ongoing (voice |video )?call|" +
        "calling…?|ringing…?|missed (voice |video )?calls?|ইনকামিং.*|.*\\bcalls?\\b.*)$",
      RegexOption.IGNORE_CASE,
    )

  fun read(sbn: StatusBarNotification): Snapshot? {
    val n = sbn.notification ?: return null
    if ((n.flags and Notification.FLAG_GROUP_SUMMARY) != 0) return null
    val extras = n.extras ?: Bundle.EMPTY
    val category = n.category.orEmpty()
    // Chat messages are never calls, whatever their text says.
    if (category == Notification.CATEGORY_MESSAGE || category == Notification.CATEGORY_EMAIL) return null

    val channelId =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) n.channelId.orEmpty().lowercase() else ""
    val ongoing = (n.flags and Notification.FLAG_ONGOING_EVENT) != 0
    val chronometer = extras.getBoolean(Notification.EXTRA_SHOW_CHRONOMETER, false)
    val callType = extras.getInt(EXTRA_CALL_TYPE, 0)
    val fullScreen = n.fullScreenIntent != null

    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
    val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim().orEmpty()
    val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim().orEmpty()
    val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()?.trim().orEmpty()
    val allText = listOf(title, text, bigText, subText).joinToString(" ")

    val callChannel = channelId.contains("voip") || channelId.contains("call")
    val missedChannel = channelId.contains("missed")
    val isCall = category == Notification.CATEGORY_CALL || callType != 0 || callChannel

    val kind =
      when {
        category == CATEGORY_MISSED_CALL || missedChannel -> Kind.MISSED
        !ongoing && !isCall && MISSED_RE.containsMatchIn(allText) -> Kind.MISSED
        !ongoing && category == Notification.CATEGORY_CALL && MISSED_RE.containsMatchIn(allText) -> Kind.MISSED
        !isCall -> return null
        // A call notification the user can swipe away is not a live call.
        !ongoing && callType == 0 && !fullScreen -> return null
        callType == CALL_TYPE_INCOMING -> Kind.RINGING_IN
        chronometer -> Kind.CONNECTED
        fullScreen -> Kind.RINGING_IN
        ONGOING_RE.containsMatchIn(allText) -> Kind.CONNECTED
        else -> Kind.DIALING
      }

    val person = callPerson(extras)
    val numberHint =
      listOfNotNull(person?.second, title, text, bigText, subText)
        .firstNotNullOfOrNull { phoneIn(it) }
    val nameHint =
      listOfNotNull(person?.first, title)
        .map { cleanName(it) }
        .firstOrNull { it.isNotEmpty() && !GENERIC_TITLE_RE.matches(it) && phoneIn(it) == null }

    val now = System.currentTimeMillis()
    // `when` is the timer's start on a connected call; trust it only if sane.
    val whenAt = n.`when`
    val connectedAt =
      if (kind == Kind.CONNECTED && whenAt in (now - 6 * 60 * 60_000L)..(now + 5_000L)) whenAt else null
    val eventAt = if (kind == Kind.MISSED && whenAt in (now - 24 * 60 * 60_000L)..now) whenAt else now

    val shape =
      "cat=${category.ifEmpty { "-" }} ch=${channelId.ifEmpty { "-" }} ongoing=${ongoing.bit()} " +
        "timer=${chronometer.bit()} type=$callType fs=${fullScreen.bit()} " +
        "actions=${n.actions?.size ?: 0} title=${describe(title)} number=${(numberHint != null).bit()} " +
        "name=${(nameHint != null).bit()} → $kind"

    return Snapshot(
      packageName = sbn.packageName,
      notificationKey = sbn.key,
      kind = kind,
      numberHint = numberHint,
      nameHint = nameHint,
      video = VIDEO_RE.containsMatchIn(allText),
      connectedAt = connectedAt,
      eventAt = eventAt,
      shape = shape,
    )
  }

  /** True for a live call notification (not a missed-call one). */
  fun isLiveCall(sbn: StatusBarNotification): Boolean {
    val snapshot = runCatching { read(sbn) }.getOrNull() ?: return false
    return snapshot.kind != Kind.MISSED
  }

  /**
   * The caller's number: from the notification itself, or — WhatsApp shows
   * the contact name for saved numbers — from the phone's contacts. A name
   * that fits more than one number gives null, never a guess.
   */
  fun resolveNumber(context: Context, snapshot: Snapshot): String? {
    snapshot.numberHint?.let { return it }
    val name = snapshot.nameHint ?: return null
    return numberForName(context, name)
  }

  fun numberForName(context: Context, name: String): String? {
    if (
      ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS) !=
        PackageManager.PERMISSION_GRANTED
    ) {
      return null
    }
    val whatsAppKeys = LinkedHashMap<String, String>()
    val phoneKeys = LinkedHashMap<String, String>()
    try {
      context.contentResolver
        .query(
          ContactsContract.Data.CONTENT_URI,
          arrayOf(ContactsContract.Data.MIMETYPE, ContactsContract.Data.DATA1),
          "${ContactsContract.Data.DISPLAY_NAME} = ? AND " +
            "(${ContactsContract.Data.MIMETYPE} = ? OR ${ContactsContract.Data.MIMETYPE} LIKE ?)",
          arrayOf(
            name,
            ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE,
            "%whatsapp%",
          ),
          null,
        )
        ?.use { cursor ->
          val mimeIdx = cursor.getColumnIndex(ContactsContract.Data.MIMETYPE)
          val dataIdx = cursor.getColumnIndex(ContactsContract.Data.DATA1)
          while (cursor.moveToNext()) {
            val mime = if (mimeIdx >= 0) cursor.getString(mimeIdx).orEmpty() else ""
            val data = if (dataIdx >= 0) cursor.getString(dataIdx).orEmpty() else ""
            if (mime.contains("whatsapp", ignoreCase = true)) {
              // WhatsApp's own contact rows: "8801712345678@s.whatsapp.net".
              if (!data.contains("@s.whatsapp.net")) continue
              val digits = data.substringBefore('@').filter { it.isDigit() }
              CallLeadPromptStore.phoneKey(digits)?.let { whatsAppKeys.putIfAbsent(it, "+$digits") }
            } else {
              CallLeadPromptStore.phoneKey(data)?.let { phoneKeys.putIfAbsent(it, data) }
            }
          }
        }
    } catch (e: Exception) {
      Log.w(TAG, "Contact lookup failed", e)
      return null
    }
    // WhatsApp's row says exactly which of the contact's numbers called.
    if (whatsAppKeys.size == 1) return whatsAppKeys.values.first()
    if (whatsAppKeys.size > 1) return null
    return if (phoneKeys.size == 1) phoneKeys.values.first() else null
  }

  /** Android 12+ CallStyle caller: (name, number from a tel: uri). */
  private fun callPerson(extras: Bundle): Pair<String?, String?>? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return null
    return try {
      @Suppress("DEPRECATION")
      val person = extras.getParcelable<android.app.Person>(EXTRA_CALL_PERSON) ?: return null
      val uri = person.uri.orEmpty()
      val number = if (uri.startsWith("tel:")) uri.removePrefix("tel:") else null
      person.name?.toString() to number
    } catch (_: Exception) {
      null
    }
  }

  private fun phoneIn(raw: String): String? {
    val match = PHONE_RE.find(raw) ?: return null
    val value = match.value.trim()
    val digits = value.count { it.isDigit() }
    // Durations ("12:05") and short codes are not numbers.
    if (digits < 10) return null
    return value
  }

  private fun cleanName(raw: String) =
    raw.trim().removePrefix("~").trim().replace(Regex("\\s+"), " ")

  private fun describe(title: String) =
    when {
      title.isEmpty() -> "empty"
      phoneIn(title) != null -> "number"
      GENERIC_TITLE_RE.matches(cleanName(title)) -> "generic"
      else -> "name"
    }

  private fun Boolean.bit() = if (this) 1 else 0
}
