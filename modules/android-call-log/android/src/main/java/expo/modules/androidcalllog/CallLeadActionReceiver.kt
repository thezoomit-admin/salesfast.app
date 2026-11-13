package expo.modules.androidcalllog

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** "Not a lead" on the prompt: remember the number and never ask about it again. */
class CallLeadActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != CallLeadPrompter.ACTION_IGNORE) return
    val key = CallLeadPromptStore.phoneKey(intent.getStringExtra(CallLeadPrompter.EXTRA_KEY)) ?: return
    val app = context.applicationContext
    CallLeadPromptStore.addIgnoredKey(app, key)
    CallLeadPrompter.cancel(app, key)
  }
}
