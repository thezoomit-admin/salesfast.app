package expo.modules.androidcalllog

import expo.modules.androidcalllog.WhatsAppCallNotification.Kind
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Run: ./gradlew :android-call-log:testReleaseUnitTest (from salesfast.app/android). */
class WhatsAppCallLogicTest {
  private val pkg = WhatsAppCallStore.PKG_WHATSAPP
  private val number = "+880 1622-398341"

  private fun step(
    current: WhatsAppCallStore.ActiveCall?,
    kind: Kind,
    now: Long,
    connectedAt: Long? = null,
    number: String? = this.number,
  ) = WhatsAppCallLogic.apply(current, pkg, kind, connectedAt, number, video = false, now = now)

  @Test
  fun `incoming call answered then hung up`() {
    var call = step(null, Kind.RINGING_IN, now = 1_000)
    call = step(call, Kind.CONNECTED, now = 6_000, connectedAt = 5_000)
    val outcome = WhatsAppCallLogic.outcome(call, endedAt = 197_000)
    assertEquals("INCOMING", outcome.direction)
    assertEquals(192, outcome.durationSec)
  }

  @Test
  fun `ringing replaced by a plain call notification counts as answered`() {
    var call = step(null, Kind.RINGING_IN, now = 1_000)
    call = step(call, Kind.DIALING, now = 4_000)
    val outcome = WhatsAppCallLogic.outcome(call, endedAt = 64_000)
    assertEquals("INCOMING", outcome.direction)
    assertEquals(60, outcome.durationSec)
  }

  @Test
  fun `incoming call never answered is missed`() {
    val call = step(null, Kind.RINGING_IN, now = 1_000)
    val outcome = WhatsAppCallLogic.outcome(call, endedAt = 30_000)
    assertEquals("MISSED", outcome.direction)
    assertEquals(0, outcome.durationSec)
  }

  @Test
  fun `outgoing call answered`() {
    var call = step(null, Kind.DIALING, now = 1_000)
    // Still "Ringing…" a few times before the other side picks up.
    call = step(call, Kind.DIALING, now = 3_000)
    call = step(call, Kind.CONNECTED, now = 8_000, connectedAt = 8_000)
    val outcome = WhatsAppCallLogic.outcome(call, endedAt = 68_000)
    assertEquals("OUTGOING", outcome.direction)
    assertEquals(60, outcome.durationSec)
    assertFalse(call.incoming)
  }

  @Test
  fun `outgoing call nobody answered has no duration`() {
    val call = step(null, Kind.DIALING, now = 1_000)
    val outcome = WhatsAppCallLogic.outcome(call, endedAt = 40_000)
    assertEquals("OUTGOING", outcome.direction)
    assertEquals(0, outcome.durationSec)
  }

  @Test
  fun `call first seen mid-way has unknown direction`() {
    val call = step(null, Kind.CONNECTED, now = 50_000, connectedAt = 20_000)
    assertFalse(call.known)
    val outcome = WhatsAppCallLogic.outcome(call, endedAt = 80_000)
    assertEquals("UNKNOWN", outcome.direction)
    assertEquals(60, outcome.durationSec)
  }

  @Test
  fun `a timer start before the ring is clamped to the ring`() {
    var call = step(null, Kind.RINGING_IN, now = 10_000)
    call = step(call, Kind.CONNECTED, now = 12_000, connectedAt = 2_000)
    assertEquals(10_000L, call.connectedAt)
  }

  @Test
  fun `a timer start in the future is clamped to now`() {
    val call = step(null, Kind.CONNECTED, now = 10_000, connectedAt = 99_000)
    assertEquals(10_000L, call.connectedAt)
  }

  @Test
  fun `the first resolved number sticks`() {
    var call = step(null, Kind.RINGING_IN, now = 1_000, number = null)
    call = step(call, Kind.RINGING_IN, now = 2_000, number = "+8801711111111")
    call = step(call, Kind.CONNECTED, now = 3_000, number = "+8801999999999")
    assertEquals("+8801711111111", call.number)
  }

  @Test
  fun `a new notification reopens a call that looked ended`() {
    var call = step(null, Kind.RINGING_IN, now = 1_000)
    call = call.copy(endedAt = 2_000)
    call = step(call, Kind.CONNECTED, now = 2_500)
    assertEquals(0L, call.endedAt)
    assertTrue(call.incoming)
  }

  @Test
  fun `duration never goes negative or past a day`() {
    val call = step(null, Kind.CONNECTED, now = 10_000, connectedAt = 10_000)
    assertEquals(0, WhatsAppCallLogic.outcome(call, endedAt = 5_000).durationSec)
    assertEquals(86_400, WhatsAppCallLogic.outcome(call, endedAt = 10_000 + 200_000_000L).durationSec)
  }

  @Test
  fun `call id is stable for one call`() {
    assertEquals(
      "com.whatsapp:1000:1622398341",
      WhatsAppCallLogic.callId(pkg, 1_000, "1622398341"),
    )
  }

  @Test
  fun `phone key matches local and international forms`() {
    assertEquals(
      CallLeadPromptStore.phoneKey("01622398341"),
      CallLeadPromptStore.phoneKey("+880 1622-398341"),
    )
  }

  @Test
  fun `channel defaults to the phone line`() {
    assertEquals(CallChannel.PHONE, CallChannel.from(null))
    assertEquals(CallChannel.PHONE, CallChannel.from("PHONE"))
    assertEquals(CallChannel.WHATSAPP, CallChannel.from("WHATSAPP"))
    assertEquals("call-lead", CallChannel.PHONE.idempotencyPrefix)
    assertEquals("wa-call-lead", CallChannel.WHATSAPP.idempotencyPrefix)
  }
}
