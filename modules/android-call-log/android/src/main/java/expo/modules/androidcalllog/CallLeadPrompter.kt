package expo.modules.androidcalllog

import android.Manifest
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
import androidx.core.content.ContextCompat

/**
 * Posts "Is this your lead?" after an incoming call from a number that is not
 * a CRM lead yet. "Yes, add lead" opens salesfast://call-lead, where the user
 * types the name and the app creates the lead assigned to them.
 */
internal object CallLeadPrompter {
  private const val TAG = "CallLeadPrompt"

  const val CHANNEL_ID = "call_lead_prompt"
  const val NOTIFICATION_TAG = "salesfast-call-lead"
  const val ACTION_IGNORE = "expo.modules.androidcalllog.CALL_LEAD_IGNORE"
  const val EXTRA_KEY = "phoneKey"

  /** Must match `scheme` in app.config.ts. */
  private const val APP_SCHEME = "salesfast"
  private const val BRAND_COLOR = 0xFF3A83F7.toInt()
  private const val PROMPT_TTL_MS = 24 * 60 * 60_000L

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
        // Already a lead, or the user said "Not a lead" before.
        CallLeadPromptStore.markRingPrompted(app)
        return
      }
      if (CallLeadPromptStore.skipContacts(app) && isSavedContact(app, rawNumber)) {
        CallLeadPromptStore.markRingPrompted(app)
        return
      }
      if (post(app, rawNumber, key, ringAt)) {
        CallLeadPromptStore.recordPrompt(app, key, now)
        CallLeadPromptStore.markRingPrompted(app)
      }
    }
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

  /**
   * Newest incoming / missed / rejected call since [sinceMs]. Fallback for
   * phones whose ringing broadcast carried no number.
   */
  fun latestIncomingNumber(context: Context, sinceMs: Long): String? {
    if (!granted(context, Manifest.permission.READ_CALL_LOG)) return null
    val incomingTypes =
      setOf(
        CallLog.Calls.INCOMING_TYPE,
        CallLog.Calls.MISSED_TYPE,
        CallLog.Calls.REJECTED_TYPE,
      )
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

  private fun post(context: Context, rawNumber: String, key: String, ringAt: Long): Boolean {
    val manager = NotificationManagerCompat.from(context)
    if (!manager.areNotificationsEnabled()) return false
    if (
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        !granted(context, Manifest.permission.POST_NOTIFICATIONS)
    ) {
      return false
    }
    ensureChannel(context)

    val id = notificationId(key)
    val number = rawNumber.trim()
    val link =
      Uri.Builder()
        .scheme(APP_SCHEME)
        .authority("call-lead")
        .appendQueryParameter("phone", number)
        .appendQueryParameter("at", ringAt.toString())
        .build()
    val open =
      PendingIntent.getActivity(
        context,
        id,
        Intent(Intent.ACTION_VIEW, link).setPackage(context.packageName),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    val ignore =
      PendingIntent.getBroadcast(
        context,
        id,
        Intent(context, CallLeadActionReceiver::class.java)
          .setAction(ACTION_IGNORE)
          .putExtra(EXTRA_KEY, key),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )

    val notification =
      NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(smallIcon(context))
        .setColor(BRAND_COLOR)
        .setContentTitle("Is this your lead?")
        .setContentText("Call from $number. Tap to save it as a lead.")
        .setStyle(
          NotificationCompat.BigTextStyle()
            .bigText("Call from $number. Save it as a lead in SalesFast — you only type the name.")
        )
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setCategory(NotificationCompat.CATEGORY_RECOMMENDATION)
        .setWhen(ringAt)
        .setShowWhen(true)
        .setContentIntent(open)
        // Kept until the lead is saved or declined, so an abandoned form can be resumed.
        .setAutoCancel(false)
        .setOnlyAlertOnce(true)
        .setTimeoutAfter(PROMPT_TTL_MS)
        .addAction(0, "Yes, add lead", open)
        .addAction(0, "Not a lead", ignore)
        .build()

    return try {
      manager.notify(NOTIFICATION_TAG, id, notification)
      true
    } catch (e: SecurityException) {
      Log.w(TAG, "Notification blocked", e)
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
