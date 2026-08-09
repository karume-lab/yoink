package com.karumelab.yoink

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ContentValues
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.MediaStore
import android.util.Log
import androidx.core.app.NotificationCompat
import java.io.File
import java.util.UUID
import java.util.concurrent.Executors
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject

/**
 * Background share target. Picking Yoink from the Android share sheet starts
 * this service instead of launching the app, so the download runs headlessly
 * with only a notification for feedback.
 */
class ShareReceiverService : Service() {

  private val executor = Executors.newSingleThreadExecutor()
  private val mainHandler = Handler(Looper.getMainLooper())

  private val client = OkHttpClient.Builder()
    .followRedirects(true)
    .followSslRedirects(true)
    .build()

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startAsForeground()

    val text = intent?.getStringExtra(Intent.EXTRA_TEXT)
    if (text.isNullOrBlank()) {
      notifyFailed("No link was shared with Yoink.")
      stopSelf(startId)
      return START_NOT_STICKY
    }

    val url = extractUrl(text)
    if (url == null) {
      notifyFailed("Yoink couldn't find a link in what was shared.")
      stopSelf(startId)
      return START_NOT_STICKY
    }

    executor.execute {
      try {
        process(url)
      } catch (t: Throwable) {
        Log.e(TAG, "Share download failed", t)
        notifyFailed("Download failed: ${t.message ?: "Unknown error"}")
      } finally {
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf(startId)
      }
    }

    return START_NOT_STICKY
  }

  override fun onDestroy() {
    executor.shutdown()
    super.onDestroy()
  }

  // MARK: - Pipeline

  private fun process(sharedUrl: String) {
    var url = sharedUrl
    if (url.contains("vm.tiktok.com") || url.contains("vt.tiktok.com")) {
      url = resolveShortLink(url)
    }

    val platform = detectPlatform(url)
    if (platform == null) {
      notifyFailed("Unsupported link. Yoink downloads TikTok and Instagram links.")
      return
    }

    if (platform == "instagram-story") {
      notifyFailed("Instagram stories need a session cookie — open Yoink to download them.")
      return
    }

    updateForeground("Downloading video", "Extracting…", 0)

    val extracted = when {
      platform == "tiktok" -> extractTikTok(url)
      else -> extractInstagramPublic(url, platform)
    }

    val safeAuthor = extracted.author
      ?.replace(Regex("[^a-z0-9]", RegexOption.IGNORE_CASE), "_")
      ?.takeIf { it.isNotBlank() } ?: "unknown"
    val filename = "${extracted.platform}-$safeAuthor-${System.currentTimeMillis()}.mp4"

    val file = downloadToFile(
      extracted.videoUrl,
      filename,
      extracted.platform,
      extracted.cookies,
    )

    val label = extracted.author?.let { "$it (${extracted.platform})" }
      ?: "Your video"
    val fileSize = file.length()
    val savedUri = saveToYoinkAlbum(file, filename)

    // Record the download so the app's History and Queue tabs reflect it on
    // the next launch (the service runs headless, without the JS runtime).
    recordNativeDownload(extracted, url, savedUri, fileSize)

    notifyDone(label)
  }

  // MARK: - Extraction

  private fun resolveShortLink(url: String): String {
    val request = Request.Builder().url(url).header("User-Agent", MOBILE_UA).build()
    return runCatching {
      client.newCall(request).execute().use { response ->
        response.request.url.toString()
      }
    }.getOrDefault(url)
  }

  private fun detectPlatform(url: String): String? {
    val lower = url.lowercase()
    return when {
      lower.contains("tiktok.com") ||
        lower.contains("vm.tiktok.com") ||
        lower.contains("vt.tiktok.com") -> "tiktok"
      lower.contains("instagram.com/stories/") -> "instagram-story"
      lower.contains("instagram.com/reel/") ||
        lower.contains("instagram.com/reels/") -> "instagram-reel"
      lower.contains("instagram.com/p/") -> "instagram-post"
      else -> null
    }
  }

  private data class Extracted(
    val platform: String,
    val videoUrl: String,
    val author: String?,
    val cookies: String?,
  )

  private fun fetchPage(url: String, cookie: String? = null): Pair<String, String> {
    val builder = Request.Builder()
      .url(url)
      .header("User-Agent", MOBILE_UA)
      .header(
        "Accept",
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      )
      .header("Accept-Language", "en-US,en;q=0.5")
    if (cookie != null) builder.header("Cookie", cookie)

    val response = client.newCall(builder.build()).execute()
    if (!response.isSuccessful) {
      response.close()
      throw IllegalStateException("Fetch failed with status ${response.code}")
    }
    val cookies = extractSessionCookies(response.headers("Set-Cookie"))
    val body = response.body?.string() ?: ""
    response.close()
    return body to cookies
  }

  private fun extractTikTok(url: String): Extracted {
    val (html, cookies) = fetchPage(url)

    fun find(regex: Regex): String? {
      val match = regex.find(html)
      return match?.groupValues?.getOrNull(1)
    }

    val videoUrl = find(Regex(""""playAddr":"([^"]+)""""))
      ?: find(Regex(""""downloadAddr":"([^"]+)""""))
      ?: throw IllegalStateException("Could not find the video URL in the page source")

    val author = find(Regex(""""uniqueId":"([^"]+)""""))
    val coverUrl = find(Regex(""""cover":"([^"]+)""""))
    coverUrl // kept in sync with the TS extractor; cover is unused by the service

    return Extracted(
      platform = "tiktok",
      videoUrl = decodeTikTokEscapes(videoUrl),
      author = author,
      cookies = cookies.takeIf { it.isNotBlank() },
    )
  }

  private fun extractInstagramPublic(url: String, platform: String): Extracted {
    val shortcode = Regex("(?:reel|reels|p|tv)/([A-Za-z0-9_-]+)")
      .find(url)?.groupValues?.getOrNull(1)
      ?: throw IllegalStateException("Could not determine the Instagram post ID from that URL")

    val embedUrl = "https://www.instagram.com/p/$shortcode/embed/captioned/"
    val (html, _) = fetchPage(embedUrl)

    val videoMatch = Regex(""""video_url\\?":\s*\\?"(https:[^"]+)"""").find(html)
      ?: throw IllegalStateException(
        "Could not find a video URL. The post may be private or Instagram is blocking anonymous access.",
      )
    val videoUrl = unescapeInstagramUrl(videoMatch.groupValues[1])

    val author = Regex(""""username\\?":\s*\\?"([^"\\]+)"""").find(html)
      ?.groupValues?.getOrNull(1)

    return Extracted(
      platform = platform,
      videoUrl = videoUrl,
      author = author,
      cookies = null,
    )
  }

  // MARK: - Download & Save

  private fun downloadToFile(
    videoUrl: String,
    filename: String,
    platform: String,
    cookies: String?,
  ): File {
    val builder = Request.Builder()
      .url(videoUrl)
      .header("User-Agent", MOBILE_UA)
      .header("Referer", refererFor(platform))
      .header("Accept", "video/mp4,video/*;q=0.9,*/*;q=0.8")
    if (cookies != null) builder.header("Cookie", cookies)

    val response = client.newCall(builder.build()).execute()
    if (!response.isSuccessful) {
      response.close()
      throw IllegalStateException("Media server refused the download (status ${response.code})")
    }

    val dest = File(cacheDir, filename)
    response.body?.let { body ->
      body.byteStream().use { input ->
        dest.outputStream().use { output -> input.copyTo(output) }
      }
      response.close()
    }

    if (!dest.exists() || dest.length() < 10_000) {
      throw IllegalStateException("Downloaded file is too small to be a valid video")
    }
    return dest
  }

  private fun saveToYoinkAlbum(file: File, filename: String): Uri? {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val values = ContentValues().apply {
        put(MediaStore.Video.Media.DISPLAY_NAME, filename)
        put(MediaStore.Video.Media.MIME_TYPE, "video/mp4")
        put(MediaStore.Video.Media.RELATIVE_PATH, "${Environment.DIRECTORY_PICTURES}/Yoink")
        put(MediaStore.Video.Media.IS_PENDING, 1)
      }
      val resolver = contentResolver
      val uri = resolver.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values)
        ?: throw IllegalStateException("Could not save to the gallery")
      resolver.openOutputStream(uri)?.use { out ->
        file.inputStream().use { input -> input.copyTo(out) }
      } ?: throw IllegalStateException("Could not save to the gallery")
      values.clear()
      values.put(MediaStore.Video.Media.IS_PENDING, 0)
      resolver.update(uri, values, null, null)
      file.delete()
      return uri
    } else {
      val dir = File(
        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES),
        "Yoink",
      )
      if (!dir.exists()) dir.mkdirs()
      val dest = File(dir, filename)
      file.inputStream().use { input -> dest.outputStream().use { output -> input.copyTo(output) } }
      MediaScannerConnection.scanFile(this, arrayOf(dest.absolutePath), arrayOf("video/mp4"), null)
      file.delete()
      return Uri.fromFile(dest)
    }
  }

  // MARK: - Native -> JS record

  private fun recordNativeDownload(
    extracted: Extracted,
    sourceUrl: String,
    savedUri: Uri?,
    fileSize: Long,
  ) {
    if (savedUri == null) return
    val recordFile = File(filesDir, NATIVE_DOWNLOADS_FILE)
    val record = JSONObject().apply {
      put("id", UUID.randomUUID().toString())
      put("platform", extracted.platform)
      put("sourceUrl", sourceUrl)
      put("author", extracted.author ?: JSONObject.NULL)
      put("localUri", savedUri.toString())
      put("assetId", savedUri.lastPathSegment ?: savedUri.toString())
      put("fileSize", fileSize)
      put("createdAt", System.currentTimeMillis())
    }

    var records = JSONArray()
    try {
      if (recordFile.exists()) {
        records = JSONArray(recordFile.readText())
      }
    } catch (t: Throwable) {
      Log.w(TAG, "Discarding unreadable native downloads file", t)
    }
    records.put(record)

    try {
      recordFile.writeText(records.toString())
    } catch (t: Throwable) {
      Log.w(TAG, "Failed to record native download", t)
    }
  }

  // MARK: - Notifications

  private fun channelId(): String = CHANNEL_ID

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Downloads",
        NotificationManager.IMPORTANCE_DEFAULT,
      )
      getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
  }

  private fun startAsForeground() {
    ensureChannel()
    val notification = buildNotification("Downloading", "Preparing…", indeterminate = true)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun updateForeground(title: String, text: String, progress: Int) {
    val notification = buildNotification(title, text, progress = progress)
    getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification)
  }

  private fun buildNotification(
    title: String,
    text: String,
    progress: Int = 0,
    indeterminate: Boolean = false,
  ): Notification {
    return NotificationCompat.Builder(this, channelId())
      .setSmallIcon(android.R.drawable.stat_sys_download)
      .setContentTitle(title)
      .setContentText(text)
      .setOnlyAlertOnce(true)
      .setOngoing(true)
      .setProgress(100, progress, indeterminate)
      .setContentIntent(openAppIntent())
      .build()
  }

  private fun notifyDone(label: String) {
    val notification = NotificationCompat.Builder(this, channelId())
      .setSmallIcon(android.R.drawable.stat_sys_download_done)
      .setContentTitle("Download complete")
      .setContentText("$label — saved to the Yoink album")
      .setAutoCancel(true)
      .setContentIntent(openAppIntent())
      .build()
    getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification)
  }

  private fun notifyFailed(message: String) {
    val notification = NotificationCompat.Builder(this, channelId())
      .setSmallIcon(android.R.drawable.stat_sys_warning)
      .setContentTitle("Download failed")
      .setContentText(message)
      .setAutoCancel(true)
      .setContentIntent(openAppIntent())
      .build()
    getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification)
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

  // MARK: - Helpers

  private fun extractUrl(text: String): String? {
    val match = Regex("https?://[^\\s]+").find(text) ?: return null
    return match.value.trimEnd(')', ',', '.', '}', ']', '"', '\'', '?', '!')
  }

  private fun refererFor(platform: String): String = when (platform) {
    "tiktok" -> "https://www.tiktok.com/"
    else -> "https://www.instagram.com/"
  }

  private fun decodeTikTokEscapes(value: String): String {
    return value
      .replace(Regex("\\\\u[0-9A-Fa-f]{4}")) { match ->
        match.value.substring(2).toInt(16).toChar().toString()
      }
      .replace("\\n", "\n")
  }

  private fun unescapeInstagramUrl(value: String): String {
    var s = value
    while (s.endsWith("\\")) s = s.dropLast(1)
    return s
      .replace("\\\\/", "/")
      .replace("\\\\", "\\")
      .replace("\\/", "/")
      .replace("\\u0026", "&")
      .replace("&amp;", "&")
  }

  private fun extractSessionCookies(setCookies: List<String>): String {
    val names = listOf("tt_chain_token", "ttwid", "msToken", "tt_csrf_token", "s_v_web_id")
    val found = mutableListOf<String>()
    val all = setCookies.joinToString(";")
    for (name in names) {
      val match = Regex("(?:^|[;,])\\s*$name=([^;,]++)").find(all)
      match?.groupValues?.getOrNull(1)?.let { found.add("$name=$it") }
    }
    return found.joinToString("; ")
  }

  private companion object {
    const val TAG = "ShareReceiverService"
    const val CHANNEL_ID = "downloads"
    const val NOTIFICATION_ID = 1001
    const val NATIVE_DOWNLOADS_FILE = "native-downloads.json"
    const val MOBILE_UA =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  }
}
