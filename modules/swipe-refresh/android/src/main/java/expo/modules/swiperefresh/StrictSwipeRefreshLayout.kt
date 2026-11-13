package expo.modules.swiperefresh

import android.annotation.SuppressLint
import android.content.Context
import android.view.MotionEvent
import android.view.ViewConfiguration
import com.facebook.react.bridge.ReactContext
import com.facebook.react.views.swiperefresh.ReactSwipeRefreshLayout
import expo.modules.core.interfaces.DoNotStrip
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import kotlin.math.abs

/**
 * React Native's pull-to-refresh, but it only takes a clearly downward drag.
 *
 * The stock layout starts a pull as soon as the finger moves down by the touch
 * slop, however far it has moved sideways, so a sideways swipe that drifts
 * down a little pulls the spinner out and can refresh the page. Here the
 * gesture is judged once, when the finger first leaves the slop: unless it is
 * mostly downward, this layout leaves the whole gesture alone.
 */
@DoNotStrip
@SuppressLint("ViewConstructor")
class StrictSwipeRefreshLayout @DoNotStrip constructor(
  context: Context,
  @Suppress("UNUSED_PARAMETER") appContext: AppContext,
) : ReactSwipeRefreshLayout(context as ReactContext) {

  private val onRefresh by EventDispatcher()

  private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
  private var downX = 0f
  private var downY = 0f
  private var decided = false
  private var pullsDown = false

  /** The latest `refreshing` prop; applied after each props update. */
  internal var refreshingProp = false

  init {
    setOnRefreshListener { onRefresh(mapOf()) }
    // A little more pull than the stock 64 dp, so a short tug doesn't refresh.
    setDistanceToTriggerSync((TRIGGER_DISTANCE_DP * resources.displayMetrics.density).toInt())
  }

  override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
    when (ev.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        downX = ev.x
        downY = ev.y
        decided = false
        pullsDown = false
      }
      MotionEvent.ACTION_MOVE -> {
        if (!decided) {
          val dx = abs(ev.x - downX)
          val dy = ev.y - downY
          // Still inside the slop: too early to tell, and too early to pull.
          if (dx <= touchSlop && abs(dy) <= touchSlop) return false
          decided = true
          pullsDown = dy > touchSlop && dy > dx * VERTICAL_RATIO
        }
        if (!pullsDown) return false
      }
    }
    return super.onInterceptTouchEvent(ev)
  }

  private companion object {
    /** Down must be at least this many times the sideways travel (~27°). */
    const val VERTICAL_RATIO = 2f
    const val TRIGGER_DISTANCE_DP = 80f
  }
}
