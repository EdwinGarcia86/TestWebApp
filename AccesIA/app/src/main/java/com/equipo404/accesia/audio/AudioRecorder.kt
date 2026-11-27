package com.equipo404.accesia.audio

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Graba audio con el micrófono en formato M4A/AAC compatible con Gemini.
 */
class AudioRecorder(private val context: Context) {
    private var recorder: MediaRecorder? = null
    var outputFile: File? = null
        private set

    val isRecording: Boolean
        get() = recorder != null

    fun start() {
        if (recorder != null) return
        val file = File(context.cacheDir, "audio_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())}.m4a")
        outputFile = file

        val mr = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(context)
        } else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }
        mr.apply {
            setAudioSource(MediaRecorder.AudioSource.MIC)
            setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            setAudioSamplingRate(44_100)
            setAudioEncodingBitRate(128_000)
            setOutputFile(file.absolutePath)
            prepare()
            start()
        }
        recorder = mr
    }

    fun stop(): File? {
        val current = recorder ?: return outputFile
        try {
            current.stop()
        } catch (_: RuntimeException) {
            // Grabación demasiado corta: se descarta.
        }
        current.release()
        recorder = null
        return outputFile?.takeIf { it.exists() && it.length() > 0 }
    }

    fun cancel() {
        recorder?.let {
            try { it.stop() } catch (_: RuntimeException) { }
            try { it.release() } catch (_: RuntimeException) { }
        }
        recorder = null
        outputFile?.delete()
        outputFile = null
    }
}
