package com.equipo404.accesia.data

import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

/**
 * Cliente REST de Gemini (Google AI Studio) usando una API key.
 * No guarda la clave en logs ni en el código: se toma de BuildConfig o de los ajustes.
 */
class GeminiRepository(
    private val apiKeyProvider: () -> String,
    private val modelProvider: () -> String,
) {
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .writeTimeout(90, TimeUnit.SECONDS)
        .readTimeout(90, TimeUnit.SECONDS)
        .build()

    suspend fun translate(text: String, from: String, to: String): String = withContext(Dispatchers.IO) {
        val system = """
            Eres un traductor preciso y respetuoso de lenguas indígenas.
            Traduce el texto del usuario de $from a $to.
            Devuelve SOLO la traducción, sin explicaciones, sin comillas y sin encabezados.
            Si no conoces la lengua, conserva el texto original y añade una nota breve.
        """.trimIndent()
        generate(
            prompt = "Texto a traducir:\n$text",
            systemInstruction = system,
            maxTokens = 600,
        )
    }

    suspend fun assistant(
        question: String,
        language: String,
        history: List<ChatMessage>,
    ): String = withContext(Dispatchers.IO) {
        generate(
            prompt = "Pregunta del usuario: $question",
            systemInstruction = assistantSystem(language),
            history = history,
            maxTokens = 1200,
        )
    }

    suspend fun assistantFromAudio(
        audio: File,
        language: String,
        history: List<ChatMessage>,
    ): String = withContext(Dispatchers.IO) {
        generate(
            prompt = """
                El usuario envió un audio.
                1) Transcribe literalmente lo que dice en una primera línea que empiece con "Escuché: ".
                2) Responde a esa pregunta en $language con instrucciones claras y sencillas.
                3) Máximo 5 pasos numerados. Al final, si tiene sentido, haz una pregunta breve de seguimiento.
            """.trimIndent(),
            systemInstruction = assistantSystem(language),
            audio = audio,
            history = history,
            maxTokens = 1400,
        )
    }

    suspend fun transcribe(audio: File, language: String): String = withContext(Dispatchers.IO) {
        generate(
            prompt = """
                Transcribe literalmente el audio en $language.
                Devuelve SOLO el texto hablado. No añadas explicaciones, ni comillas, ni etiquetas.
            """.trimIndent(),
            systemInstruction = "Eres un transcriptor exacto de audio.",
            audio = audio,
            maxTokens = 500,
        )
    }

    suspend fun classifyCommand(audio: File): String = withContext(Dispatchers.IO) {
        val raw = generate(
            prompt = """
                Escucha el audio y devuelve SOLO una de estas palabras en mayúsculas:
                INICIO, ASISTENTE, ACCESIBILIDAD, TRADUCIR, LEER, AYUDA.
                Elige AYUDA si la orden no es clara.
            """.trimIndent(),
            systemInstruction = "Clasificador de comandos de voz para una aplicación móvil.",
            audio = audio,
            maxTokens = 20,
        )
        Languages.options.firstOrNull { raw.contains(it, ignoreCase = true) }?.let { return@withContext it }
        listOf("INICIO", "ASISTENTE", "ACCESIBILIDAD", "TRADUCIR", "LEER", "AYUDA")
            .firstOrNull { raw.contains(it, ignoreCase = true) } ?: "AYUDA"
    }

    private fun assistantSystem(language: String): String = """
        Eres AccesIA, un asistente digital inclusivo que ayuda con trámites, salud,
        educación, empleo, apoyos gubernamentales e información general en México.
        Responde siempre en $language.
        Usa frases cortas, vocabulario sencillo y máximo 5 pasos numerados.
        No uses Markdown con asteriscos ni tablas. Usa texto plano y números.
        Si el usuario tiene discapacidad visual, haz que cada paso sea audible y claro.
        Si no tienes datos oficiales actualizados, dilo y sugiere verificar en el sitio oficial.
    """.trimIndent()

    private fun generate(
        prompt: String,
        systemInstruction: String,
        audio: File? = null,
        history: List<ChatMessage> = emptyList(),
        maxTokens: Int,
    ): String {
        val key = apiKeyProvider().trim()
        if (key.isBlank()) {
            throw IllegalStateException("Falta la API key. Agrega GEMINI_API_KEY en local.properties y vuelve a compilar.")
        }

        val contents = JSONArray()
        history.takeLast(8).forEach { message ->
            contents.put(
                JSONObject()
                    .put("role", if (message.fromUser) "user" else "model")
                    .put("parts", JSONArray().put(JSONObject().put("text", message.text)))
            )
        }

        val parts = JSONArray().put(JSONObject().put("text", prompt))
        if (audio != null && audio.exists()) {
            val mime = when (audio.extension.lowercase()) {
                "wav" -> "audio/wav"
                "mp3" -> "audio/mp3"
                "ogg" -> "audio/ogg"
                "webm" -> "audio/webm"
                else -> "audio/m4a"
            }
            val encoded = Base64.encodeToString(audio.readBytes(), Base64.NO_WRAP)
            parts.put(
                JSONObject().put(
                    "inline_data",
                    JSONObject().put("mime_type", mime).put("data", encoded)
                )
            )
        }
        contents.put(JSONObject().put("role", "user").put("parts", parts))

        val body = JSONObject()
            .put("system_instruction", JSONObject().put("parts", JSONArray().put(JSONObject().put("text", systemInstruction))))
            .put("contents", contents)
            .put(
                "generation_config",
                JSONObject()
                    .put("temperature", 0.2)
                    .put("maxOutputTokens", maxTokens)
            )

        val model = modelProvider().trim().ifBlank { "gemini-3.5-flash-lite" }
        val url = "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent"
        val request = Request.Builder()
            .url(url)
            .header("x-goog-api-key", key)
            .header("Content-Type", "application/json")
            .post(body.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
            .build()

        client.newCall(request).execute().use { response ->
            val responseBody = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                throw RuntimeException(readError(response.code, responseBody))
            }
            val partsArray = JSONObject(responseBody)
                .optJSONArray("candidates")
                ?.optJSONObject(0)
                ?.optJSONObject("content")
                ?.optJSONArray("parts")

            val text = if (partsArray == null) "" else buildString {
                for (i in 0 until partsArray.length()) {
                    val part = partsArray.optJSONObject(i) ?: continue
                    val chunk = part.optString("text", "")
                    if (chunk.isNotBlank()) append(chunk)
                }
            }.trim()

            if (text.isBlank()) {
                throw RuntimeException("Gemini no devolvió texto. Verifica el modelo configurado.")
            }
            return text
        }
    }

    private fun readError(code: Int, body: String): String = try {
        val message = JSONObject(body).optJSONObject("error")?.optString("message", "")
        if (message.isNullOrBlank()) "$code: ${body.take(240)}" else "$code: $message"
    } catch (_: Exception) {
        "$code: ${body.take(240)}"
    }
}
