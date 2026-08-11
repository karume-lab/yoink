package com.karumelab.yoink

import android.content.Intent
import android.net.Uri
import android.os.Build
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

  @ReactMethod
  fun openOverlayPermissionSettings() {
    val context = reactApplicationContext
    val intent = Intent(
      Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
      Uri.parse("package:${context.packageName}"),
    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    if (intent.resolveActivity(context.packageManager) != null) {
      context.startActivity(intent)
    }
  }

  companion object {
    const val NAME = "YoinkOverlay"
  }
}
