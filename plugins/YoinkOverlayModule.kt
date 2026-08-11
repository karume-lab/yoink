package com.karumelab.yoink

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Bridges the floating bubble to JS. Exposed as `NativeModules.YoinkOverlay`.
 */
class YoinkOverlayModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  @ReactMethod
  fun startBubble() {
    val context = reactApplicationContext
    if (!Settings.canDrawOverlays(context)) return
    val intent = Intent(context, FloatingBubbleService::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(intent)
    } else {
      context.startService(intent)
    }
  }

  @ReactMethod
  fun stopBubble() {
    reactApplicationContext.stopService(
      Intent(reactApplicationContext, FloatingBubbleService::class.java),
    )
  }

  @ReactMethod
  fun isBubbleActive(promise: Promise) {
    promise.resolve(FloatingBubbleService.isRunning)
  }

  @ReactMethod
  fun hasOverlayPermission(promise: Promise) {
    promise.resolve(Settings.canDrawOverlays(reactApplicationContext))
  }

  /**
   * Opens the "Display over other apps" screen and watches for the grant. The
   * moment it lands the app is brought back to the front, so the user never
   * has to navigate back to Yoink themselves.
   */
  @ReactMethod
  fun requestOverlayPermission() {
    val context = reactApplicationContext
    val intent = Intent(
      Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
      Uri.parse("package:${context.packageName}"),
    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    if (intent.resolveActivity(context.packageManager) != null) {
      context.startActivity(intent)
      pollForOverlayGrant()
    }
  }

  private fun pollForOverlayGrant() {
    pollHandler.removeCallbacksAndMessages(null)
    pollHandler.post(
      object : Runnable {
        var attempts = 0
        override fun run() {
          val context = reactApplicationContext
          if (Settings.canDrawOverlays(context)) {
            pollHandler.removeCallbacksAndMessages(null)
            bringAppToFront(context)
            return
          }
          attempts++
          if (attempts >= MAX_GRANT_POLLS) {
            pollHandler.removeCallbacksAndMessages(null)
            return
          }
          pollHandler.postDelayed(this, GRANT_POLL_INTERVAL_MS)
        }
      },
    )
  }

  private fun bringAppToFront(context: Context) {
    val intent = Intent(context, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    // Background activity launches are allowed here because the overlay
    // permission (which was just granted) exempts the app from that
    // restriction.
    runCatching { context.startActivity(intent) }
  }

  companion object {
    const val NAME = "YoinkOverlay"
    const val GRANT_POLL_INTERVAL_MS = 700L
    const val MAX_GRANT_POLLS = 240 // ~3 minutes before giving up
    val pollHandler = Handler(Looper.getMainLooper())
  }
}
