package com.equipo404.accesia.audio

import android.content.Context
import android.speech.tts.TextToSpeech
import java.util.Locale

/**
 * Lectura en voz alta usando el motor TTS del dispositivo.
 * Las lenguas indígenas pueden no estar instaladas; se usa español como respaldo.
 */
object Speaker {
    private var tts: TextToSpeech? = null

    fun init(context: Context) {
        if (tts != null) return
        tts = TextToSpeech(context.applicationContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.setLanguage(Locale("es", "MX"))
            }
        }
    }

    fun speak(text: String, rate: Float = 1f) {
        val engine = tts ?: return
        engine.setSpeechRate(rate.coerceIn(0.5f, 2f))
        engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, "accesia_${System.currentTimeMillis()}")
    }

    fun stop() {
        tts?.stop()
    }

    fun shutdown() {
        tts?.shutdown()
        tts = null
    }
}
