package expo.modules.androidcalllog

import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.core.app.NotificationManagerCompat

/**
 * Sees WhatsApp call notifications once the user grants Notification access
 * (Settings → Notification access → SalesFast). WhatsApp keeps its calls out
 * of the phone's call log, so this is the only way a phone can know about them.
 *
 * Privacy: the very first check drops every notification that is not from
 * WhatsApp or WhatsApp Business; from those, only call notifications are
 * read (see [WhatsAppCallNotification]). Message text is never stored or sent.
 * Off in SalesFast settings, or signed out → every notification is ignored.
 */
class WhatsAppCallListener : NotificationListenerService() {
  override fun onListenerConnected() {
    super.onListenerConnected()
    if (!WhatsAppCallStore.isActive(applicationContext)) return
    // Calls that ended while we were not running.
    WhatsAppCallTracker.sweepAsync(applicationContext, liveCallPackages(exceptKey = null))
  }

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    val notification = sbn ?: return
    if (!isWhatsApp(notification.packageName)) return
    val app = applicationContext
    if (!WhatsAppCallStore.isActive(app) || !WhatsAppCallStore.isTracked(app, notification.packageName)) {
      return
    }
    val snapshot =
      try {
        WhatsAppCallNotification.read(notification)
      } catch (e: Exception) {
        Log.w(TAG, "Could not read a WhatsApp notification", e)
        null
      } ?: return
    WhatsAppCallTracker.onPosted(app, snapshot)
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification?) {
    val notification = sbn ?: return
    if (!isWhatsApp(notification.packageName)) return
    val app = applicationContext
    if (!WhatsAppCallStore.isActive(app) || !WhatsAppCallStore.isTracked(app, notification.packageName)) {
      return
    }
    if (!WhatsAppCallNotification.isLiveCall(notification)) return
    // Ring → in-call can swap notifications; the call ends only when none is left.
    val live = liveCallPackages(exceptKey = notification.key) ?: emptySet()
    if (notification.packageName in live) return
    WhatsAppCallTracker.onRemoved(app, notification.packageName)
  }

  /** WhatsApp apps with a live call notification showing; null if unreadable. */
  private fun liveCallPackages(exceptKey: String?): Set<String>? =
    try {
      activeNotifications
        ?.filter { isWhatsApp(it.packageName) && it.key != exceptKey && WhatsAppCallNotification.isLiveCall(it) }
        ?.map { it.packageName }
        ?.toSet()
    } catch (e: Exception) {
      // Not bound (yet): we cannot tell.
      null
    }

  companion object {
    private const val TAG = "WaCallTrack"

    fun isWhatsApp(packageName: String?) =
      packageName == WhatsAppCallStore.PKG_WHATSAPP || packageName == WhatsAppCallStore.PKG_BUSINESS

    fun component(context: Context) = ComponentName(context, WhatsAppCallListener::class.java)

    /** The user granted Notification access to SalesFast. */
    fun isAccessGranted(context: Context) =
      NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)

    /** Ask Android to (re)connect the listener after it was turned on in SalesFast. */
    fun requestRebind(context: Context) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return
      if (!isAccessGranted(context)) return
      try {
        NotificationListenerService.requestRebind(component(context))
      } catch (e: Exception) {
        Log.w(TAG, "Rebind failed", e)
      }
    }
  }
}
