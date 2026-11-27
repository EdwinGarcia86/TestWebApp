package com.equipo404.accesia

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.equipo404.accesia.audio.Speaker
import com.equipo404.accesia.data.AppSettings
import com.equipo404.accesia.data.ChatMessage
import com.equipo404.accesia.data.GeminiRepository
import com.equipo404.accesia.data.SettingsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.io.File

class AppViewModel(application: Application) : AndroidViewModel(application) {
    private val settingsRepository = SettingsRepository(application.applicationContext)
    private val _settings = MutableStateFlow(settingsRepository.load())
    val settings: StateFlow<AppSettings> = _settings

    private val gemini = GeminiRepository(
        apiKeyProvider = { BuildConfig.GEMINI_API_KEY },
        modelProvider = { BuildConfig.GEMINI_MODEL },
    )

    private val _messages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val messages: StateFlow<List<ChatMessage>> = _messages

    private val _busy = MutableStateFlow(false)
    val busy: StateFlow<Boolean> = _busy

    private val _dictating = MutableStateFlow(false)
    val dictating: StateFlow<Boolean> = _dictating

    private val _translating = MutableStateFlow(false)
    val translating: StateFlow<Boolean> = _translating

    private val _translatedText = MutableStateFlow("")
    val translatedText: StateFlow<String> = _translatedText

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun updateSettings(block: (AppSettings) -> AppSettings) {
        val next = block(_settings.value)
        _settings.value = next
        settingsRepository.save(next)
    }

    fun finishSetup(language: String, lowVision: Boolean) {
        updateSettings {
            it.copy(
                configured = true,
                nativeLanguage = language,
                lowVision = lowVision,
                simplifiedUi = simplifiedUi || lowVision,
            )
        }
    }

    fun sendText(text: String) {
        val question = text.trim()
        if (question.isBlank() || _busy.value) return
        viewModelScope.launch {
            _busy.value = true
            val previous = _messages.value
            _messages.value = previous + ChatMessage(true, question)
            try {
                val answer = gemini.assistant(question, _settings.value.nativeLanguage, previous)
                _messages.value = _messages.value + ChatMessage(false, answer)
                speakIfEnabled(answer)
            } catch (e: Exception) {
                _error.value = friendlyError(e)
            } finally {
                _busy.value = false
            }
        }
    }

    fun sendAudioForAssistant(audio: File) {
        if (_busy.value) return
        viewModelScope.launch {
            _busy.value = true
            val previous = _messages.value
            _messages.value = previous + ChatMessage(true, "Audio enviado")
            try {
                val answer = gemini.assistantFromAudio(audio, _settings.value.nativeLanguage, previous)
                _messages.value = _messages.value + ChatMessage(false, answer)
                speakIfEnabled(answer)
            } catch (e: Exception) {
                _error.value = friendlyError(e)
            } finally {
                _busy.value = false
                audio.delete()
            }
        }
    }

    fun dictate(audio: File, onResult: (String) -> Unit) {
        if (_dictating.value) return
        viewModelScope.launch {
            _dictating.value = true
            try {
                val text = gemini.transcribe(audio, _settings.value.nativeLanguage)
                onResult(text)
                speakIfEnabled(text)
            } catch (e: Exception) {
                _error.value = friendlyError(e)
            } finally {
                _dictating.value = false
                audio.delete()
            }
        }
    }

    fun voiceCommand(audio: File, onResult: (String) -> Unit) {
        if (_dictating.value) return
        viewModelScope.launch {
            _dictating.value = true
            try {
                val command = gemini.classifyCommand(audio)
                onResult(command)
                if (command == "LEER") speakLast()
            } catch (e: Exception) {
                _error.value = friendlyError(e)
            } finally {
                _dictating.value = false
                audio.delete()
            }
        }
    }

    fun translate(text: String, from: String, to: String) {
        if (text.isBlank() || _translating.value) return
        viewModelScope.launch {
            _translating.value = true
            try {
                val result = gemini.translate(text, from, to)
                _translatedText.value = result
                speakIfEnabled(result)
            } catch (e: Exception) {
                _error.value = friendlyError(e)
            } finally {
                _translating.value = false
            }
        }
    }

    fun speakLast() {
        _messages.value.lastOrNull { !it.fromUser }?.text?.let { speakIfEnabled(it, force = true) }
    }

    fun speakIfEnabled(text: String, force: Boolean = false) {
        if (force || _settings.value.readAloudEnabled) {
            Speaker.speak(text, if (_settings.value.lowVision) 0.9f else 1f)
        }
    }

    fun setError(message: String) {
        _error.value = message
    }

    fun clearError() {
        _error.value = null
    }

    fun clearChat() {
        _messages.value = emptyList()
        Speaker.stop()
    }

    private fun friendlyError(e: Exception): String {
        val message = e.message.orEmpty()
        return when {
            message.contains("API key", true) -> message
            message.contains("401", true) -> "La API key no es válida. Revisa GEMINI_API_KEY en local.properties y vuelve a compilar."
            message.contains("403", true) -> "La API key no tiene acceso al modelo. Revisa tu proyecto en Google AI Studio."
            message.contains("429", true) -> "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo."
            message.contains("timeout", true) || message.contains("failed to connect", true) ->
                "No se pudo conectar. Revisa tu conexión a internet."
            message.contains("audio", true) -> "No se pudo procesar el audio. Intenta grabar de nuevo."
            else -> message.ifBlank { "Ocurrió un error inesperado." }
        }
    }
}
