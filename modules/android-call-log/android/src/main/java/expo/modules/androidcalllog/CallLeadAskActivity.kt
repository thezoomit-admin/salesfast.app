package expo.modules.androidcalllog

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.InputType
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.graphics.drawable.ColorDrawable

/**
 * Clean dialog-style popup after an unknown (not-in-CRM) caller.
 * Opened from the heads-up / full-screen notification — not from a background
 * receiver start, which Android blocks on modern versions.
 */
class CallLeadAskActivity : Activity() {
  private lateinit var phone: String
  private lateinit var key: String
  private var ringAt: Long = 0L

  private lateinit var root: LinearLayout
  private lateinit var card: LinearLayout
  private var nameField: EditText? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    phone = intent.getStringExtra(CallLeadPrompter.EXTRA_PHONE)?.trim().orEmpty()
    key = CallLeadPromptStore.phoneKey(intent.getStringExtra(CallLeadPrompter.EXTRA_KEY) ?: phone)
      ?: run {
        finish()
        return
      }
    ringAt = intent.getLongExtra(CallLeadPrompter.EXTRA_RING_AT, System.currentTimeMillis())

    window.setBackgroundDrawable(ColorDrawable(Color.parseColor("#990B1220")))
    window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
    setFinishOnTouchOutside(true)

    val pad = dp(20)
    root =
      LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER
        setPadding(pad, pad, pad, pad)
        layoutParams =
          ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT,
          )
        setOnClickListener { finish() }
      }

    card =
      LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        background = rounded(Color.WHITE, 20f)
        setPadding(dp(22), dp(22), dp(22), dp(18))
        elevation = dp(10).toFloat()
        layoutParams =
          LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        setOnClickListener { /* swallow */ }
      }

    root.addView(card)
    setContentView(root)
    showAskStep()
    CallLeadPrompter.cancel(this, key)
  }

  private fun showAskStep() {
    card.removeAllViews()
    card.addView(
      label("NEW CALLER", muted = true, sizeSp = 11f, weight = Typeface.BOLD).also {
        it.letterSpacing = 0.08f
      }
    )
    card.addView(space(8))
    card.addView(
      label(displayPhone(phone), muted = false, sizeSp = 26f, weight = Typeface.BOLD).also {
        it.setTextColor(Color.parseColor("#0F172A"))
      }
    )
    card.addView(space(10))
    card.addView(
      label(
        "This number isn’t in SalesFast yet. Add it as a lead assigned to you?",
        muted = true,
        sizeSp = 15f,
      )
    )
    card.addView(space(20))
    card.addView(
      primaryButton("Add as lead") {
        showNameStep()
      }
    )
    card.addView(space(10))
    card.addView(
      secondaryButton("Not a lead") {
        CallLeadPromptStore.addIgnoredKey(this, key)
        CallLeadPromptStore.removePending(this, key)
        CallLeadPrompter.cancel(this, key)
        finish()
      }
    )
  }

  private fun showNameStep() {
    card.removeAllViews()
    card.addView(
      label("LEAD NAME", muted = true, sizeSp = 11f, weight = Typeface.BOLD).also {
        it.letterSpacing = 0.08f
      }
    )
    card.addView(space(6))
    card.addView(
      label(displayPhone(phone), muted = false, sizeSp = 18f, weight = Typeface.BOLD).also {
        it.setTextColor(Color.parseColor("#0F172A"))
      }
    )
    card.addView(space(14))

    val field =
      EditText(this).apply {
        hint = "Customer name"
        setHintTextColor(Color.parseColor("#94A3B8"))
        setTextColor(Color.parseColor("#0F172A"))
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
        inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_WORDS
        background = rounded(Color.parseColor("#F1F5F9"), 12f)
        setPadding(dp(14), dp(14), dp(14), dp(14))
        layoutParams =
          LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
      }
    nameField = field
    card.addView(field)
    card.addView(space(8))
    card.addView(
      label("Leave blank to save as Unknown.", muted = true, sizeSp = 13f)
    )
    card.addView(space(18))
    card.addView(
      primaryButton("Save lead") {
        val typed = nameField?.text?.toString()?.trim()?.takeIf { it.isNotEmpty() }
        val lead = CallLeadPromptStore.PendingLead(key, phone, typed, ringAt)
        CallLeadPromptStore.putPending(this, lead)
        CallLeadSaver.save(this, lead, quiet = false)
        finish()
      }
    )
    card.addView(space(10))
    card.addView(secondaryButton("Back") { showAskStep() })
  }

  private fun primaryButton(title: String, onClick: () -> Unit): TextView =
    TextView(this).apply {
      text = title
      gravity = Gravity.CENTER
      setTextColor(Color.WHITE)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
      typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
      background = rounded(BRAND, 12f)
      setPadding(dp(16), dp(14), dp(16), dp(14))
      isClickable = true
      isFocusable = true
      setOnClickListener { onClick() }
      layoutParams =
        LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
    }

  private fun secondaryButton(title: String, onClick: () -> Unit): TextView =
    TextView(this).apply {
      text = title
      gravity = Gravity.CENTER
      setTextColor(Color.parseColor("#334155"))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
      typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
      background = rounded(Color.parseColor("#F1F5F9"), 12f)
      setPadding(dp(16), dp(13), dp(16), dp(13))
      isClickable = true
      isFocusable = true
      setOnClickListener { onClick() }
      layoutParams =
        LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
    }

  private fun label(
    text: String,
    muted: Boolean,
    sizeSp: Float,
    weight: Int = Typeface.NORMAL,
  ): TextView =
    TextView(this).apply {
      this.text = text
      setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
      setTextColor(if (muted) Color.parseColor("#64748B") else Color.parseColor("#0F172A"))
      typeface = Typeface.create(Typeface.DEFAULT, weight)
      layoutParams =
        LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
    }

  private fun space(h: Int): View =
    View(this).apply {
      layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(h))
    }

  private fun rounded(color: Int, radiusDp: Float): GradientDrawable =
    GradientDrawable().apply {
      setColor(color)
      cornerRadius = dp(radiusDp.toInt()).toFloat()
    }

  private fun dp(value: Int): Int =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics)
      .toInt()

  private fun displayPhone(raw: String): String {
    val digits = raw.filter { it.isDigit() }
    return if (digits.length >= 11) "+$digits" else raw
  }

  companion object {
    private const val BRAND = 0xFF3A83F7.toInt()
  }
}
