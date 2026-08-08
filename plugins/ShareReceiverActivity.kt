package com.karumelab.yoink

import android.app.Activity
import android.content.Intent
import android.os.Build
import android.os.Bundle

/**
 * Transparent share target. Picking Yoink from the Android share sheet opens
 * this activity (declared with Theme.NoDisplay so nothing ever renders), which
 * hands the shared link to ShareReceiverService and finishes immediately. The
 * user stays in the app they shared from and only sees a download notification.
 */
class ShareReceiverActivity : Activity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    forwardToService(intent)
    finish()
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    forwardToService(intent)
    finish()
  }

  private fun forwardToService(intent: Intent?) {
    val text = intent?.getStringExtra(Intent.EXTRA_TEXT) ?: return
    if (text.isBlank()) return

    val serviceIntent = Intent(this, ShareReceiverService::class.java).apply {
      putExtra(Intent.EXTRA_TEXT, text)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      startForegroundService(serviceIntent)
    } else {
      startService(serviceIntent)
    }
  }
}
