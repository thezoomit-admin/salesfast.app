package expo.modules.androidcalllog

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.RemoteInput
import kotlin.concurrent.thread

/** Buttons on the "Is this your lead?" notification (see [CallLeadPrompter]). */
class CallLeadActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val app = context.applicationContext
    val key = CallLeadPromptStore.phoneKey(intent.getStringExtra(CallLeadPrompter.EXTRA_KEY)) ?: return
    val phone = intent.getStringExtra(CallLeadPrompter.EXTRA_PHONE)?.trim().orEmpty()
    val ringAt = intent.getLongExtra(CallLeadPrompter.EXTRA_RING_AT, System.currentTimeMillis())

    when (intent.action) {
      CallLeadPrompter.ACTION_YES -> CallLeadPrompter.showNameEntry(app, phone, key, ringAt)

      // Not a lead: close it and never ask about this number again.
      CallLeadPrompter.ACTION_NO -> {
        CallLeadPromptStore.addIgnoredKey(app, key)
        CallLeadPromptStore.removePending(app, key)
        CallLeadPrompter.cancel(app, key)
      }

      CallLeadPrompter.ACTION_CLOSE -> {
        CallLeadPromptStore.removePending(app, key)
        CallLeadPrompter.cancel(app, key)
      }

      CallLeadPrompter.ACTION_SAVE -> {
        // Text from the inline box; none when "Save" was tapped → "Unknown".
        val typed =
          RemoteInput.getResultsFromIntent(intent)
            ?.getCharSequence(CallLeadPrompter.REMOTE_INPUT_NAME)
            ?.toString()
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
        val lead = CallLeadPromptStore.PendingLead(key, phone, typed, ringAt)
        CallLeadPromptStore.putPending(app, lead)
        saveInBackground(app, lead)
      }

      CallLeadPrompter.ACTION_RETRY -> {
        val lead =
          CallLeadPromptStore.pending(app, key)
            ?: CallLeadPromptStore.PendingLead(key, phone, null, ringAt)
        saveInBackground(app, lead)
      }
    }
  }

  /**
   * The request runs after onReceive returns; goAsync keeps the process alive
   * for it. The "Saving…" update also clears Android's inline-reply spinner.
   */
  private fun saveInBackground(app: Context, lead: CallLeadPromptStore.PendingLead) {
    val pending = goAsync()
    thread(name = "call-lead-save") {
      try {
        CallLeadSaver.save(app, lead, quiet = false)
      } catch (e: Exception) {
        Log.w("CallLeadPrompt", "Save crashed", e)
      } finally {
        pending.finish()
      }
    }
  }
}

/** Sends one queued call lead and shows the result on its notification. */
internal object CallLeadSaver {
  /**
   * [quiet]: a background retry from the app (on open). It only reports a
   * success or a final failure, never "still offline" again.
   */
  fun save(context: Context, lead: CallLeadPromptStore.PendingLead, quiet: Boolean) {
    if (!quiet) CallLeadPrompter.showSaving(context, lead)
    when (val outcome = CallCaptureClient.save(context, lead)) {
      is CallCaptureClient.Outcome.Saved -> {
        CallLeadPromptStore.removePending(context, lead.key)
        CallLeadPromptStore.addKnownKey(context, lead.key)
        CallLeadPrompter.showSaved(context, lead.key, outcome.leadId, outcome.name, outcome.created)
      }
      is CallCaptureClient.Outcome.Failed -> {
        if (!outcome.retry) CallLeadPromptStore.removePending(context, lead.key)
        if (!quiet || !outcome.retry) {
          CallLeadPrompter.showFailed(context, lead, outcome.message, outcome.retry)
        }
      }
      CallCaptureClient.Outcome.NeedsApp -> if (!quiet) CallLeadPrompter.showNeedsApp(context, lead)
    }
  }

  /** Every queued lead, one after another (called by the app when it opens). */
  fun flush(context: Context) {
    for (lead in CallLeadPromptStore.pendingLeads(context)) {
      save(context, lead, quiet = true)
    }
  }
}
