package expo.modules.androidcalllog

import android.Manifest
import android.content.pm.PackageManager
import android.provider.CallLog
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AndroidCallLogModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AndroidCallLog")

    AsyncFunction("hasPermission") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.READ_CALL_LOG
      ) == PackageManager.PERMISSION_GRANTED
    }

    AsyncFunction("getRecentCalls") { limit: Int, minDateMs: Double ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val granted =
        ContextCompat.checkSelfPermission(
          context,
          Manifest.permission.READ_CALL_LOG
        ) == PackageManager.PERMISSION_GRANTED

      if (!granted) {
        throw Exception("READ_CALL_LOG not granted")
      }

      val safeLimit = limit.coerceIn(1, 300)
      val minMs = minDateMs.toLong().coerceAtLeast(0L)
      val projection =
        arrayOf(
          CallLog.Calls._ID,
          CallLog.Calls.NUMBER,
          CallLog.Calls.TYPE,
          CallLog.Calls.DATE,
          CallLog.Calls.DURATION
        )

      val selection = if (minMs > 0L) "${CallLog.Calls.DATE} >= ?" else null
      val selectionArgs = if (minMs > 0L) arrayOf(minMs.toString()) else null

      val rows = mutableListOf<Map<String, Any?>>()
      context.contentResolver
        .query(
          CallLog.Calls.CONTENT_URI,
          projection,
          selection,
          selectionArgs,
          "${CallLog.Calls.DATE} DESC"
        )
        ?.use { cursor ->
          val idIdx = cursor.getColumnIndex(CallLog.Calls._ID)
          val numberIdx = cursor.getColumnIndex(CallLog.Calls.NUMBER)
          val typeIdx = cursor.getColumnIndex(CallLog.Calls.TYPE)
          val dateIdx = cursor.getColumnIndex(CallLog.Calls.DATE)
          val durationIdx = cursor.getColumnIndex(CallLog.Calls.DURATION)

          var count = 0
          while (cursor.moveToNext() && count < safeLimit) {
            val id = if (idIdx >= 0) cursor.getLong(idIdx).toString() else count.toString()
            val number = if (numberIdx >= 0) cursor.getString(numberIdx) ?: "" else ""
            val type = if (typeIdx >= 0) cursor.getInt(typeIdx) else 0
            val dateMs = if (dateIdx >= 0) cursor.getLong(dateIdx) else 0L
            val durationSec = if (durationIdx >= 0) cursor.getLong(durationIdx).toInt() else 0

            rows.add(
              mapOf(
                "id" to id,
                "number" to number,
                "type" to type,
                "dateMs" to dateMs.toDouble(),
                "durationSec" to durationSec
              )
            )
            count += 1
          }
        }

      rows
    }
  }
}
