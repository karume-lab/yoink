package com.karumelab.yoink

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.DisplayMetrics
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.ImageView
import androidx.core.app.NotificationCompat
import kotlin.math.abs

/**
 * Foreground service that draws Yoink's draggable floating bubble on top of
 * every app (TikTok included). Tapping the bubble launches [BubbleActivity],
 * which reads the clipboard and hands the copied link to ShareReceiverService
 * for a headless download - the user never leaves the app they're in.
 */
class FloatingBubbleService : Service() {

  private var windowManager: WindowManager? = null
  private var bubbleView: View? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    isRunning = true
    startAsForeground()
    addBubble()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    isRunning = true
    startAsForeground()
    if (bubbleView == null) addBubble()
    return START_STICKY
  }

  override fun onDestroy() {
    removeBubble()
    isRunning = false
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }

  // MARK: - Overlay

  private fun addBubble() {
    // The overlay can't be drawn without the "Display over other apps" grant.
    if (!Settings.canDrawOverlays(this)) {
      stopSelf()
      return
    }

    val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    windowManager = wm
    if (bubbleView != null) return

    val metrics = DisplayMetrics().also { wm.defaultDisplay.getRealMetrics(it) }
    val screenW = metrics.widthPixels
    val screenH = metrics.heightPixels
    val size = dp(56)

    val iconView = ImageView(this).apply {
      setImageDrawable(packageManager.getApplicationIcon(packageName))
      scaleType = ImageView.ScaleType.FIT_CENTER
      setPadding(dp(12), dp(12), dp(12), dp(12))
      clipToOutline = true
      elevation = dp(12).toFloat()
      background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(BUBBLE_BG)
        setStroke(dp(1), Color.argb(64, 255, 255, 255))
      }
      contentDescription = "Yoink floating bubble"
    }

    val params = WindowManager.LayoutParams(
      size,
      size,
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      } else {
        WindowManager.LayoutParams.TYPE_PHONE
      },
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      x = screenW - size - dp(16)
      y = screenH / 3
    }

    attachDragAndTap(iconView, params, screenW, screenH, size)

    try {
      wm.addView(iconView, params)
      bubbleView = iconView
    } catch (t: Throwable) {
      stopSelf()
    }
  }

  private fun removeBubble() {
    bubbleView?.let { view ->
      runCatching { windowManager?.removeView(view) }
      bubbleView = null
    }
  }

  // Drag to reposition, tap to yoink the copied link, long-press to dismiss.
  private fun attachDragAndTap(
    view: View,
    params: WindowManager.LayoutParams,
    screenW: Int,
    screenH: Int,
    size: Int,
  ) {
    val handler = Handler(Looper.getMainLooper())
    val longPress = Runnable { stopSelf() }
    var downRawX = 0f
    var downRawY = 0f
    var moved = false

    view.setOnTouchListener { _, event ->
      when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          downRawX = event.rawX
          downRawY = event.rawY
          moved = false
          handler.postDelayed(longPress, LONG_PRESS_MS)
          true
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = event.rawX - downRawX
          val dy = event.rawY - downRawY
          if (!moved && (abs(dx) > dp(8) || abs(dy) > dp(8))) {
            moved = true
            handler.removeCallbacks(longPress)
          }
          if (moved) {
            params.x = (params.x + dx).toInt().coerceIn(0, screenW - size)
            params.y = (params.y + dy).toInt().coerceIn(0, screenH - size)
            downRawX = event.rawX
            downRawY = event.rawY
            runCatching { windowManager?.updateViewLayout(view, params) }
          }
          true
        }
        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
          handler.removeCallbacks(longPress)
          if (!moved) {
            openBubbleActivity()
          }
          true
        }
        else -> false
      }
    }
  }

  private fun openBubbleActivity() {
    val intent = Intent(this, BubbleActivity::class.java)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    runCatching { startActivity(intent) }
  }

  // MARK: - Foreground notification

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Floating bubble",
        NotificationManager.IMPORTANCE_LOW,
      )
      getSystemService(NotificationManager::class.java)
        .createNotificationChannel(channel)
    }
  }

  private fun buildNotification(): Notification {
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.stat_sys_download)
      .setContentTitle("Yoink bubble is on")
      .setContentText("Copy a link, then tap the bubble to download")
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setContentIntent(openAppIntent())
      .build()
  }

  private fun openAppIntent(): PendingIntent {
    val intent = Intent(this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    return PendingIntent.getActivity(
      this,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun startAsForeground() {
    ensureChannel()
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  // MARK: - Helpers

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

  companion object {
    const val TAG = "FloatingBubbleService"
    const val CHANNEL_ID = "floating-bubble"
    const val NOTIFICATION_ID = 2001
    const val LONG_PRESS_MS = 900L
    const val BUBBLE_BG = 0xFF18181B.toInt()

    @Volatile
    var isRunning = false
  }
}
