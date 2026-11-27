package com.equipo404.accesia.data

import android.content.Context

class SettingsRepository(context: Context) {
    private val prefs = context.applicationContext
        .getSharedPreferences("accesia_prefs", Context.MODE_PRIVATE)

    fun load(): AppSettings = AppSettings(
        configured = prefs.getBoolean("configured", false),
        nativeLanguage = prefs.getString("nativeLanguage", "Español") ?: "Español",
        lowVision = prefs.getBoolean("lowVision", false),
        translationEnabled = prefs.getBoolean("translationEnabled", true),
        readAloudEnabled = prefs.getBoolean("readAloudEnabled", true),
        voiceNavEnabled = prefs.getBoolean("voiceNavEnabled", false),
        dictationEnabled = prefs.getBoolean("dictationEnabled", true),
        simplifiedUi = prefs.getBoolean("simplifiedUi", false),
        textScale = prefs.getFloat("textScale", 1f),
        contrast = prefs.getInt("contrast", 0),
    )

    fun save(settings: AppSettings) {
        prefs.edit().apply {
            putBoolean("configured", settings.configured)
            putString("nativeLanguage", settings.nativeLanguage)
            putBoolean("lowVision", settings.lowVision)
            putBoolean("translationEnabled", settings.translationEnabled)
            putBoolean("readAloudEnabled", settings.readAloudEnabled)
            putBoolean("voiceNavEnabled", settings.voiceNavEnabled)
            putBoolean("dictationEnabled", settings.dictationEnabled)
            putBoolean("simplifiedUi", settings.simplifiedUi)
            putFloat("textScale", settings.textScale)
            putInt("contrast", settings.contrast)
            apply()
        }
    }
}
