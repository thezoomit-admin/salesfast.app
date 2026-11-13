package expo.modules.androidcalllog

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import kotlin.concurrent.thread

/**
 * Phone-state broadcasts (manifest receiver, so it also runs while the app is
 * closed). Android sends each state twice to an app with READ_CALL_LOG: once
 * without the number and once with it.
 *
 * RINGING with a number → prompt now (the notification waits in the shade).
 * IDLE after a ring that was never prompted → read the number from the call
 * log instead, for phones that leave it out of the broadcast.
 */
class IncomingCallReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return
    val app = context.applicationContext
    val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return

    if (!CallLeadPromptStore.isActive(app)) {
      CallLeadPromptStore.endRing(app)
      return
    }

    when (state) {
      TelephonyManager.EXTRA_STATE_RINGING -> {
        val ringAt = CallLeadPromptStore.beginRing(app, System.currentTimeMillis())
        @Suppress("DEPRECATION")
        val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
        if (number.isNullOrBlank()) return
        runAsync { CallLeadPrompter.maybePrompt(app, number, ringAt) }
      }
      TelephonyManager.EXTRA_STATE_IDLE -> {
        // Outgoing calls never ring, so they have no open ring and end here.
        val (ringAt, prompted) = CallLeadPromptStore.endRing(app) ?: return
        if (prompted) return
        runAsync {
          // The dialer writes the call-log row just after the call ends.
          Thread.sleep(CALL_LOG_WRITE_DELAY_MS)
          val number = CallLeadPrompter.latestIncomingNumber(app, ringAt)
          if (number != null) CallLeadPrompter.maybePrompt(app, number, ringAt)
        }
      }
    }
  }

  /** Keeps the process alive for the work (limit ~10 s) via goAsync. */
  private fun runAsync(work: () -> Unit) {
    val pending = goAsync()
    thread(name = "call-lead-prompt") {
      try {
        work()
      } catch (_: Exception) {
        // A failed prompt must never crash the app in the background.
      } finally {
        pending.finish()
      }
    }
  }

  private companion object {
    const val CALL_LOG_WRITE_DELAY_MS = 2_000L
  }
}
