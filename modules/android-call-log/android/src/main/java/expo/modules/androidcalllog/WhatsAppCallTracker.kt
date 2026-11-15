package expo.modules.androidcalllog

import android.content.Context
import android.util.Log
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

/**
 * Pure rules of a WhatsApp call's life, kept apart from Android so they can
 * be unit tested: ring / dial → connect → end, then direction and length.
 */
internal object WhatsAppCallLogic {
  /** A call notification may go away and come back (ring → in call) this fast. */
  const val END_GRACE_MS = 4_000L

  /** The notification gave no end (process killed): give up after this. */
  const val STALE_MS = 3 * 60 * 60_000L

  private const val MAX_DURATION_SEC = 86_400

  fun apply(
    current: WhatsAppCallStore.ActiveCall?,
    packageName: String,
    kind: WhatsAppCallNotification.Kind,
    connectedAt: Long?,
    number: String?,
    video: Boolean,
    now: Long,
  ): WhatsAppCallStore.ActiveCall {
    if (current == null) {
      val connected =
        if (kind == WhatsAppCallNotification.Kind.CONNECTED) (connectedAt ?: now).coerceAtMost(now) else 0L
      return WhatsAppCallStore.ActiveCall(
        packageName = packageName,
        number = number,
        startedAt = if (connected > 0L) connected else now,
        incoming = kind == WhatsAppCallNotification.Kind.RINGING_IN,
        connectedAt = connected,
        endedAt = 0L,
        prompted = false,
        video = video,
        // First seen mid-call (listener just turned on): direction unknown.
        known = kind != WhatsAppCallNotification.Kind.CONNECTED,
        lastSeenAt = now,
      )
    }
    var connected = current.connectedAt
    when (kind) {
      WhatsAppCallNotification.Kind.CONNECTED ->
        if (connected == 0L) {
          connected = (connectedAt ?: now).coerceIn(current.startedAt, now)
        }
      // The ringing notification was replaced by a plain call one: answered.
      WhatsAppCallNotification.Kind.DIALING ->
        if (current.incoming && connected == 0L) connected = now
      else -> Unit
    }
    val incoming =
      current.incoming || (kind == WhatsAppCallNotification.Kind.RINGING_IN && current.connectedAt == 0L)
    return current.copy(
      number = current.number ?: number,
      incoming = incoming,
      connectedAt = connected,
      endedAt = 0L,
      video = current.video || video,
      lastSeenAt = now,
    )
  }

  data class Outcome(val direction: String, val durationSec: Int)

  fun outcome(call: WhatsAppCallStore.ActiveCall, endedAt: Long): Outcome {
    val connected = call.connectedAt > 0L
    val direction =
      when {
        !call.known -> "UNKNOWN"
        call.incoming -> if (connected) "INCOMING" else "MISSED"
        else -> "OUTGOING"
      }
    val durationSec =
      if (connected) ((endedAt - call.connectedAt) / 1000L).toInt().coerceIn(0, MAX_DURATION_SEC) else 0
    return Outcome(direction, durationSec)
  }

  /** The finished call's id: app, start and number — stable across resends. */
  fun callId(packageName: String, startedAt: Long, phoneKey: String) =
    "$packageName:$startedAt:$phoneKey"
}

/**
 * Follows WhatsApp calls from the notification listener. All work runs on
 * one background thread, in order, so contacts lookups never block the
 * listener and two events of one call never race.
 */
internal object WhatsAppCallTracker {
  private const val TAG = "WaCallTrack"

  private val executor: ScheduledExecutorService by lazy {
    Executors.newSingleThreadScheduledExecutor { runnable ->
      Thread(runnable, "whatsapp-call-tracker").apply { isDaemon = true }
    }
  }

  @Volatile private var lastShape: String? = null

  fun onPosted(context: Context, snapshot: WhatsAppCallNotification.Snapshot) {
    val app = context.applicationContext
    submit {
      val now = System.currentTimeMillis()
      recordShape(app, snapshot, now)
      sweep(app, now, livePackages = null)
      if (snapshot.kind == WhatsAppCallNotification.Kind.MISSED) {
        onMissed(app, snapshot, now)
        return@submit
      }
      val current = WhatsAppCallStore.activeCall(app, snapshot.packageName)
      val number =
        if (current?.number != null) null else WhatsAppCallNotification.resolveNumber(app, snapshot)
      val next =
        WhatsAppCallLogic.apply(
          current,
          snapshot.packageName,
          snapshot.kind,
          snapshot.connectedAt,
          number,
          snapshot.video,
          now,
        )
      WhatsAppCallStore.putActive(app, next)
    }
  }

  /** The last live call notification of [packageName] went away. */
  fun onRemoved(context: Context, packageName: String) {
    val app = context.applicationContext
    submit {
      val current = WhatsAppCallStore.activeCall(app, packageName) ?: return@submit
      if (current.endedAt == 0L) {
        WhatsAppCallStore.putActive(app, current.copy(endedAt = System.currentTimeMillis()))
      }
      executor.schedule(
        { safely { finishIfEnded(app, packageName, System.currentTimeMillis()) } },
        WhatsAppCallLogic.END_GRACE_MS,
        TimeUnit.MILLISECONDS,
      )
    }
  }

  /**
   * Ends calls whose notification is gone. [livePackages]: WhatsApp apps
   * with a call notification showing right now (null = unknown).
   */
  fun sweepAsync(context: Context, livePackages: Set<String>?) {
    val app = context.applicationContext
    submit { sweep(app, System.currentTimeMillis(), livePackages) }
  }

  private fun sweep(app: Context, now: Long, livePackages: Set<String>?) {
    for (call in WhatsAppCallStore.activeCalls(app)) {
      when {
        call.endedAt > 0L && now - call.endedAt >= WhatsAppCallLogic.END_GRACE_MS ->
          finish(app, call, call.endedAt)
        call.endedAt == 0L && livePackages != null && call.packageName !in livePackages ->
          // Ended while the listener was not running: last sighting is the best end we have.
          finish(app, call, call.lastSeenAt)
        call.endedAt == 0L && now - call.lastSeenAt > WhatsAppCallLogic.STALE_MS ->
          finish(app, call, call.lastSeenAt)
      }
    }
  }

  private fun finishIfEnded(app: Context, packageName: String, now: Long) {
    val call = WhatsAppCallStore.activeCall(app, packageName) ?: return
    // A new notification arrived in the grace period: the call goes on.
    if (call.endedAt == 0L) return
    if (now - call.endedAt < WhatsAppCallLogic.END_GRACE_MS - 250L) return
    finish(app, call, call.endedAt)
  }

  private fun finish(app: Context, call: WhatsAppCallStore.ActiveCall, endedAt: Long) {
    WhatsAppCallStore.removeActive(app, call.packageName)
    val outcome = WhatsAppCallLogic.outcome(call, endedAt)
    val number = call.number
    if (number == null) {
      WhatsAppCallStore.countUnresolved(app)
      Log.d(TAG, "Call ended (${outcome.direction}) without a resolvable number")
      return
    }
    val key = CallLeadPromptStore.phoneKey(number) ?: return
    if (WhatsAppCallStore.syncActive(app)) {
      WhatsAppCallStore.addFinished(
        app,
        WhatsAppCallStore.FinishedCall(
          id = WhatsAppCallLogic.callId(call.packageName, call.startedAt, key),
          packageName = call.packageName,
          number = number,
          direction = outcome.direction,
          startedAt = call.startedAt,
          durationSec = outcome.durationSec,
          video = call.video,
        ),
      )
    }
    // Asked after the call, never while it rings: the popup must not cover
    // WhatsApp's Answer button.
    if (call.incoming && WhatsAppCallStore.promptActive(app)) {
      CallLeadPrompter.maybePrompt(app, number, call.startedAt, CallChannel.WHATSAPP)
    }
  }

  private fun onMissed(app: Context, snapshot: WhatsAppCallNotification.Snapshot, now: Long) {
    val current = WhatsAppCallStore.activeCall(app, snapshot.packageName)
    if (current != null) {
      // The ring just ended unanswered.
      val number = current.number ?: WhatsAppCallNotification.resolveNumber(app, snapshot)
      finish(app, current.copy(number = number, incoming = true), if (current.endedAt > 0L) current.endedAt else now)
      return
    }
    val number = WhatsAppCallNotification.resolveNumber(app, snapshot)
    if (number == null) {
      WhatsAppCallStore.countUnresolved(app)
      return
    }
    // Never rang on screen (e.g. WhatsApp "Silence unknown callers").
    finish(
      app,
      WhatsAppCallStore.ActiveCall(
        packageName = snapshot.packageName,
        number = number,
        startedAt = snapshot.eventAt,
        incoming = true,
        connectedAt = 0L,
        endedAt = snapshot.eventAt,
        prompted = false,
        video = snapshot.video,
        known = true,
        lastSeenAt = snapshot.eventAt,
      ),
      snapshot.eventAt,
    )
  }

  private fun recordShape(app: Context, snapshot: WhatsAppCallNotification.Snapshot, now: Long) {
    val shape = "${snapshot.packageName.removePrefix("com.")} ${snapshot.shape}"
    if (shape == lastShape) return
    lastShape = shape
    val time = SimpleDateFormat("dd MMM HH:mm:ss", Locale.US).format(Date(now))
    WhatsAppCallStore.addDiagnostic(app, "$time $shape")
    Log.d(TAG, shape)
  }

  private fun submit(work: () -> Unit) {
    executor.execute { safely(work) }
  }

  /** Tracking must never crash the app. */
  private fun safely(work: () -> Unit) {
    try {
      work()
    } catch (e: Exception) {
      Log.w(TAG, "WhatsApp call tracking failed", e)
    }
  }
}
