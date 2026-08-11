package com.karumelab.yoink

import android.app.Activity
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Toast

/**
 * Transparent activity opened when the floating bubble is tapped. Reading the
 * clipboard from a background service is blocked on Android 10+, so the bubble
 * bounces through this invisible activity: it grabs window focus, reads the
 * copied link, hands it to ShareReceiverService for a headless download, and
 * finishes before the user ever notices they left TikTok.
 */
class BubbleActivity : Activity() {

  private var handled = false

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // Keep the transparent window truly invisible (no default theme flash).
    window.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

    // Safety net in case window focus never arrives (some OEMs).
    Handler(Looper.getMainLooper()).postDelayed(
      {
        if (!handled) {
          handled = true
          handleClipboard()
          finish()
        }
      },
      FALLBACK_MS,
    )
  }

  // The clipboard is only readable once this activity owns window focus.
  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus && !handled) {
      handled = true
      Handler(Looper.getMainLooper()).post {
        handleClipboard()
        finish()
      }
    }
  }

  private fun handleClipboard() {
    val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    val text = clipboard.primaryClip
      ?.let { clip ->
        buildList {
          for (i in 0 until clip.itemCount) {
            clip.getItemAt(i)
              .coerceToText(this@BubbleActivity)
              .toString()
              .takeIf { it.isNotBlank() }
              ?.let { add(it) }
          }
        }
      }
      ?.joinToString(" ")
      ?.trim()
      ?: ""

    val url = extractUrl(text)
    if (url == null || !isSupportedUrl(url)) {
      toast("Copy a TikTok or Instagram link, then tap the bubble")
      return
    }

    val now = System.currentTimeMillis()
    if (url == lastHandledUrl && now - lastHandledAt < DEBOUNCE_MS) {
      return
    }
    lastHandledUrl = url
    lastHandledAt = now

    val serviceIntent = Intent(this, ShareReceiverService::class.java).apply {
      putExtra(Intent.EXTRA_TEXT, url)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      startForegroundService(serviceIntent)
    } else {
      startService(serviceIntent)
    }
    toast("Yoinking…")
  }

  private fun extractUrl(text: String): String? {
    val match = Regex("https?://[^\\s]+").find(text) ?: return null
    return match.value.trimEnd(')', ',', '.', '}', ']', '"', '\'', '?', '!')
  }

  private fun isSupportedUrl(url: String): Boolean {
    val lower = url.lowercase()
    return lower.contains("tiktok.com") ||
      lower.contains("instagram.com/p/") ||
      lower.contains("instagram.com/reel/") ||
      lower.contains("instagram.com/reels/")
  }

  private fun toast(message: String) {
    runCatching {
      Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
  }

  companion object {
    const val FALLBACK_MS = 700L
    const val DEBOUNCE_MS = 1500L

    @Volatile
    private var lastHandledUrl: String? = null

    @Volatile
    private var lastHandledAt: Long = 0L
  }
}
