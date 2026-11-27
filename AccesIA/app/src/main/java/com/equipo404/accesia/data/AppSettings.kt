package com.equipo404.accesia.data

/**
 * Estado persistido de la aplicación. Se guarda en SharedPreferences.
 */
data class AppSettings(
    val configured: Boolean = false,
    val nativeLanguage: String = "Español",
    val lowVision: Boolean = false,
    val translationEnabled: Boolean = true,
    val readAloudEnabled: Boolean = true,
    val voiceNavEnabled: Boolean = false,
    val dictationEnabled: Boolean = true,
    val simplifiedUi: Boolean = false,
    val textScale: Float = 1f,
    val contrast: Int = 0, // 0 normal, 1 alto, 2 máximo
)

data class ChatMessage(
    val fromUser: Boolean,
    val text: String,
)

object Languages {
    val options = listOf(
        "Español",
        "Náhuatl",
        "Maya (Yucateco)",
        "Mixteco",
        "Zapoteco",
        "Otomí",
        "Totonaco",
        "Huichol",
        "Otra",
    )
}
