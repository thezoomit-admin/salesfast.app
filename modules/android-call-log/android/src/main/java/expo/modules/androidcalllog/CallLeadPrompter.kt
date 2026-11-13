package expo.modules.androidcalllog

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.CallLog
import android.provider.ContactsContract
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.RemoteInput
import androidx.core.content.ContextCompat

/**
 * The "Is this your lead?" notification, one per number, updated in place:
 *
 *   Ask       "Is this your lead?"            [Yes] [No]
 *   Name      "Lead name"                     [Type name ✎] [Save] [Close]
 *   Saving    "Saving lead…"
 *   Saved     "Lead saved: <name>"            tap → the lead in the app
 *   Failed    "Couldn't save the lead"        [Retry] / tap → finish in the app
 *
 * "Type name" opens Android's inline text box; its send arrow saves with that
 * name. "Save" without a name saves the lead as "Unknown". Buttons are
 * handled by [CallLeadActionReceiver]; nothing opens the app.
 */
internal object CallLeadPrompter {
  private const val TAG = "CallLeadPrompt"

  const val CHANNEL_ID = "call_lead_prompt"
  const val NOTIFICATION_TAG = "salesfast-call-lead"

  const val ACTION_YES = "expo.modules.androidcalllog.CALL_LEAD_YES"
  const val ACTION_NO = "expo.modules.androidcalllog.CALL_LEAD_NO"
  const val ACTION_SAVE = "expo.modules.androidcalllog.CALL_LEAD_SAVE"
  const val ACTION_CLOSE = "expo.modules.androidcalllog.CALL_LEAD_CLOSE"
  const val ACTION_RETRY = "expo.modules.androidcalllog.CALL_LEAD_RETRY"

  const val EXTRA_KEY = "phoneKey"
  const val EXTRA_PHONE = "phone"
  const val EXTRA_RING_AT = "ringAt"
  const val REMOTE_INPUT_NAME = "leadName"

  /** Must match `scheme` in app.config.ts. */
  private const val APP_SCHEME = "salesfast"
  private const val BRAND_COLOR = 0xFF3A83F7.toInt()
  private const val PROMPT_TTL_MS = 24 * 60 * 60_000L
  private const val SAVED_TTL_MS = 2 * 60 * 60_000L

  private val lock = Any()

  /** One notification per number; a second call from it updates the first. */
  fun notificationId(key: String) = key.hashCode()

  /** Called off the main thread (contacts lookup does disk IO). */
  fun maybePrompt(context: Context, rawNumber: String, ringAt: Long) {
    val app = context.applicationContext
    val key = CallLeadPromptStore.phoneKey(rawNumber) ?: return
    synchronized(lock) {
      if (!CallLeadPromptStore.isActive(app)) return
      val now = System.currentTimeMillis()
      if (CallLeadPromptStore.wasJustPrompted(app, key, now)) {
        CallLeadPromptStore.markRingPrompted(app)
        return
      }
      if (CallLeadPromptStore.isKnownOrIgnored(app, key)) {
        // Already a lead, or the user said "No" before.
        CallLeadPromptStore.markRingPrompted(app)
        return
      }
      if (CallLeadPromptStore.skipContacts(app) && isSavedContact(app, rawNumber)) {
        CallLeadPromptStore.markRingPrompted(app)
        return
      }
      if (showAsk(app, rawNumber.trim(), key, ringAt)) {
        CallLeadPromptStore.recordPrompt(app, key, now)
        CallLeadPromptStore.markRingPrompted(app)
      }
    }
  }

  // ---- notification states ----

  fun showAsk(context: Context, phone: String, key: String, ringAt: Long): Boolean {
    val builder =
      base(context, key, phone, ringAt)
        .setContentTitle("Is this your lead?")
        .setContentText("Call from $phone")
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setTimeoutAfter(PROMPT_TTL_MS)
        .addAction(0, "Yes", actionIntent(context, ACTION_YES, key, phone, ringAt))
        .addAction(0, "No", actionIntent(context, ACTION_NO, key, phone, ringAt))
    return notify(context, key, builder.build())
  }

  fun showNameEntry(context: Context, phone: String, key: String, ringAt: Long) {
    val nameInput =
      RemoteInput.Builder(REMOTE_INPUT_NAME).setLabel("Customer name").build()
    val typeName =
      NotificationCompat.Action.Builder(
          0,
          "Type name",
          actionIntent(context, ACTION_SAVE, key, phone, ringAt, mutable = true),
        )
        .addRemoteInput(nameInput)
        .setAllowGeneratedReplies(false)
        .build()
    val builder =
      base(context, key, phone, ringAt)
        .setContentTitle("Lead name for $phone")
        .setContentText("Type the name, or tap Save to save it as Unknown.")
        .setStyle(
          NotificationCompat.BigTextStyle()
            .bigText(
              "Tap \"Type name\", write the name and press send. " +
                "Or tap Save to save it as Unknown. The lead is assigned to you."
            )
        )
        .setTimeoutAfter(PROMPT_TTL_MS)
        .addAction(typeName)
        // Its own request code: same action string, but no text box, so it saves "Unknown".
        .addAction(0, "Save", actionIntent(context, ACTION_SAVE, key, phone, ringAt, requestOffset = 1))
        .addAction(0, "Close", actionIntent(context, ACTION_CLOSE, key, phone, ringAt))
    notify(context, key, builder.build())
  }

  fun showSaving(context: Context, lead: CallLeadPromptStore.PendingLead) {
    val builder =
      base(context, lead.key, lead.phone, lead.ringAt)
        .setContentTitle("Saving lead…")
        .setContentText(lead.name ?: lead.phone)
        .setProgress(0, 0, true)
    notify(context, lead.key, builder.build())
  }

  fun showSaved(context: Context, key: String, leadId: Long, name: String, created: Boolean) {
    val label = name.ifBlank { "Unknown" }
    val open =
      PendingIntent.getActivity(
        context,
        notificationId(key),
        Intent(Intent.ACTION_VIEW, Uri.parse("$APP_SCHEME://leads/$leadId"))
          .setPackage(context.packageName),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    val builder =
      NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(smallIcon(context))
        .setColor(BRAND_COLOR)
        .setContentTitle(if (created) "Lead saved: $label" else "Already a lead: $label")
        .setContentText(
          if (created) "Assigned to you. Tap to open." else "This number is already in SalesFast. Tap to open."
        )
        .setContentIntent(open)
        .setAutoCancel(true)
        .setOnlyAlertOnce(true)
        .setTimeoutAfter(SAVED_TTL_MS)
    notify(context, key, builder.build())
  }

  /** [retry]: offer a Retry button (the lead stays queued). */
  fun showFailed(context: Context, lead: CallLeadPromptStore.PendingLead, message: String, retry: Boolean) {
    val builder =
      base(context, lead.key, lead.phone, lead.ringAt, lead.name)
        .setContentTitle("Couldn't save the lead")
        .setContentText(message)
        .setStyle(NotificationCompat.BigTextStyle().bigText("$message Tap to finish in SalesFast."))
        .setTimeoutAfter(PROMPT_TTL_MS)
    if (retry) {
      builder.addAction(0, "Retry", actionIntent(context, ACTION_RETRY, lead.key, lead.phone, lead.ringAt))
    }
    builder.addAction(0, "Close", actionIntent(context, ACTION_CLOSE, lead.key, lead.phone, lead.ringAt))
    notify(context, lead.key, builder.build())
  }

  /** No usable sign-in on the phone: the app saves it (queued) once opened. */
  fun showNeedsApp(context: Context, lead: CallLeadPromptStore.PendingLead) {
    val builder =
      base(context, lead.key, lead.phone, lead.ringAt, lead.name)
        .setContentTitle("Open SalesFast to finish")
        .setContentText("The lead for ${lead.phone} is saved when you open SalesFast.")
        .setTimeoutAfter(PROMPT_TTL_MS)
        .addAction(0, "Close", actionIntent(context, ACTION_CLOSE, lead.key, lead.phone, lead.ringAt))
    notify(context, lead.key, builder.build())
  }

  fun cancel(context: Context, key: String) {
    NotificationManagerCompat.from(context).cancel(NOTIFICATION_TAG, notificationId(key))
  }

  fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java) ?: return
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel =
      NotificationChannel(CHANNEL_ID, "Leads from calls", NotificationManager.IMPORTANCE_HIGH)
    channel.description = "Asks whether a call from a new number is a lead"
    manager.createNotificationChannel(channel)
  }

  // ---- building blocks ----

  /**
   * Shared look. Tapping the body opens the app's capture screen, the
   * fallback when inline reply is not available or saving needs the app.
   */
  private fun base(
    context: Context,
    key: String,
    phone: String,
    ringAt: Long,
    name: String? = null,
  ): NotificationCompat.Builder {
    val link =
      Uri.Builder()
        .scheme(APP_SCHEME)
        .authority("call-lead")
        .appendQueryParameter("phone", phone)
        .appendQueryParameter("at", ringAt.toString())
        .apply { if (!name.isNullOrBlank()) appendQueryParameter("name", name) }
        .build()
    val open =
      PendingIntent.getActivity(
        context,
        notificationId(key),
        Intent(Intent.ACTION_VIEW, link).setPackage(context.packageName),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    return NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(smallIcon(context))
      .setColor(BRAND_COLOR)
      .setCategory(NotificationCompat.CATEGORY_RECOMMENDATION)
      .setWhen(ringAt)
      .setShowWhen(true)
      .setContentIntent(open)
      .setAutoCancel(false)
      // Updates (Yes → name → saving) must not ring again.
      .setOnlyAlertOnce(true)
  }

  private fun actionIntent(
    context: Context,
    action: String,
    key: String,
    phone: String,
    ringAt: Long,
    mutable: Boolean = false,
    requestOffset: Int = 0,
  ): PendingIntent {
    val intent =
      Intent(context, CallLeadActionReceiver::class.java)
        .setAction(action)
        .putExtra(EXTRA_KEY, key)
        .putExtra(EXTRA_PHONE, phone)
        .putExtra(EXTRA_RING_AT, ringAt)
    // Inline reply needs a mutable intent (the system adds the typed text);
    // it is explicit (our own receiver), as Android 14 requires.
    val mutability =
      if (mutable && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE
      else PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getBroadcast(
      context,
      notificationId(key) + requestOffset,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or mutability,
    )
  }

  private fun notify(context: Context, key: String, notification: Notification): Boolean {
    val manager = NotificationManagerCompat.from(context)
    if (!manager.areNotificationsEnabled()) return false
    if (
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        !granted(context, Manifest.permission.POST_NOTIFICATIONS)
    ) {
      return false
    }
    ensureChannel(context)
    return try {
      manager.notify(NOTIFICATION_TAG, notificationId(key), notification)
      true
    } catch (e: SecurityException) {
      Log.w(TAG, "Notification blocked", e)
      false
    }
  }

  /**
   * Newest incoming / missed / rejected call since [sinceMs]. Fallback for
   * phones whose ringing broadcast carried no number.
   */
  fun latestIncomingNumber(context: Context, sinceMs: Long): String? {
    if (!granted(context, Manifest.permission.READ_CALL_LOG)) return null
    val incomingTypes =
      setOf(CallLog.Calls.INCOMING_TYPE, CallLog.Calls.MISSED_TYPE, CallLog.Calls.REJECTED_TYPE)
    return try {
      context.contentResolver
        .query(
          CallLog.Calls.CONTENT_URI,
          arrayOf(CallLog.Calls.NUMBER, CallLog.Calls.TYPE),
          "${CallLog.Calls.DATE} >= ?",
          arrayOf((sinceMs - 5_000L).toString()),
          "${CallLog.Calls.DATE} DESC",
        )
        ?.use { cursor ->
          val numberIdx = cursor.getColumnIndex(CallLog.Calls.NUMBER)
          val typeIdx = cursor.getColumnIndex(CallLog.Calls.TYPE)
          while (cursor.moveToNext()) {
            if (typeIdx >= 0 && cursor.getInt(typeIdx) !in incomingTypes) continue
            val number = if (numberIdx >= 0) cursor.getString(numberIdx) else null
            if (!number.isNullOrBlank()) return@use number
          }
          null
        }
    } catch (e: Exception) {
      Log.w(TAG, "Call log fallback failed", e)
      null
    }
  }

  private fun isSavedContact(context: Context, number: String): Boolean {
    // Without the permission we cannot tell, so we ask.
    if (!granted(context, Manifest.permission.READ_CONTACTS)) return false
    return try {
      val uri =
        Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(number))
      context.contentResolver
        .query(uri, arrayOf(ContactsContract.PhoneLookup._ID), null, null, null)
        ?.use { it.moveToFirst() } ?: false
    } catch (e: Exception) {
      Log.w(TAG, "Contact lookup failed", e)
      false
    }
  }

  /** The white status-bar icon expo-notifications generates (notification_icon). */
  private fun smallIcon(context: Context): Int {
    val generated =
      context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    return if (generated != 0) generated else context.applicationInfo.icon
  }

  private fun granted(context: Context, permission: String) =
    ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
}
