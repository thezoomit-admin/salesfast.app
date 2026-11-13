package expo.modules.swiperefresh

import android.graphics.Color
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Same props and event as React Native's Android RefreshControl. */
class SwipeRefreshModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SwipeRefresh")

    View(StrictSwipeRefreshLayout::class) {
      Events("onRefresh")

      Prop("refreshing") { view: StrictSwipeRefreshLayout, value: Boolean? ->
        view.refreshingProp = value ?: false
      }

      // Bumped by JS after each pull, so the props below are re-applied even
      // when `refreshing` never changed (a refetch that finished at once).
      Prop("syncKey") { _: StrictSwipeRefreshLayout, _: Int? -> }

      Prop("enabled") { view: StrictSwipeRefreshLayout, value: Boolean? ->
        view.isEnabled = value ?: true
      }

      Prop("colors") { view: StrictSwipeRefreshLayout, value: List<Int>? ->
        if (value.isNullOrEmpty()) {
          view.setColorSchemeColors()
        } else {
          view.setColorSchemeColors(*value.toIntArray())
        }
      }

      Prop("progressBackgroundColor") { view: StrictSwipeRefreshLayout, value: Int? ->
        view.setProgressBackgroundColorSchemeColor(value ?: Color.TRANSPARENT)
      }

      Prop("progressViewOffset") { view: StrictSwipeRefreshLayout, value: Float? ->
        view.setProgressViewOffset(value ?: 0f)
      }

      Prop("size") { view: StrictSwipeRefreshLayout, value: String? ->
        view.setSize(if (value == "large") SwipeRefreshLayout.LARGE else SwipeRefreshLayout.DEFAULT)
      }

      // The spinner shows what JS says, including after a pull JS didn't
      // follow with `refreshing: true`.
      OnViewDidUpdateProps { view: StrictSwipeRefreshLayout ->
        if (view.isRefreshing != view.refreshingProp) {
          view.isRefreshing = view.refreshingProp
        }
      }
    }
  }
}
