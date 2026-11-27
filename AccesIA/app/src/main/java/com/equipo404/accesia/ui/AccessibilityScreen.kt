package com.equipo404.accesia.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Accessibility
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.equipo404.accesia.audio.AudioRecorder
import com.equipo404.accesia.data.AppSettings
import com.equipo404.accesia.data.Languages

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccessibilityScreen(
    settings: AppSettings,
    translatedText: String,
    translating: Boolean,
    onUpdate: ((AppSettings) -> AppSettings) -> Unit,
    onTranslate: (String, String, String) -> Unit,
    onSpeakTranslated: () -> Unit,
    ensureMicPermission: ((Boolean) -> Unit) -> Unit,
    onCommandAudio: (java.io.File, (String) -> Unit) -> Unit,
    onNavigate: (String) -> Unit,
    onError: (String) -> Unit,
) {
    val context = LocalContext.current
    val recorder = remember { AudioRecorder(context) }
    var recording by remember { mutableStateOf(false) }

    var sourceLang by remember { mutableStateOf(settings.nativeLanguage) }
    var targetLang by remember {
        mutableStateOf(if (settings.nativeLanguage == "Español") "Náhuatl" else "Español")
    }
    var textToTranslate by remember { mutableStateOf("") }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Accessibility, contentDescription = null, modifier = Modifier.size(34.dp), tint = MaterialTheme.colorScheme.primary)
            Text("  Accesibilidad", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        }

        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer), shape = RoundedCornerShape(18.dp)) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                SettingSwitch("Traducción de idioma", "Español ↔ lenguas indígenas", settings.translationEnabled) {
                    onUpdate { s -> s.copy(translationEnabled = it) }
                }
                SettingSwitch("Lectura en voz alta", "Escucha la información en audio", settings.readAloudEnabled) {
                    onUpdate { s -> s.copy(readAloudEnabled = it) }
                }
                SettingSwitch("Navegación por voz", "Controla la app con comandos de voz", settings.voiceNavEnabled) {
                    onUpdate { s -> s.copy(voiceNavEnabled = it) }
                }
                SettingSwitch("Dictado por voz", "Escribe con tu voz", settings.dictationEnabled) {
                    onUpdate { s -> s.copy(dictationEnabled = it) }
                }
                SettingSwitch("Interfaz simplificada", "Botones grandes y textos claros", settings.simplifiedUi) {
                    onUpdate { s -> s.copy(simplifiedUi = it) }
                }
            }
        }

        if (settings.voiceNavEnabled) {
            Card(shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Comando por voz", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Di por ejemplo: inicio, asistente, accesibilidad, traducir o leer.", style = MaterialTheme.typography.bodySmall)
                    Button(
                        onClick = {
                            if (recording) {
                                val file = recorder.stop()
                                recording = false
                                if (file != null) {
                                    onCommandAudio(file) { command ->
                                        when (command) {
                                            "INICIO" -> onNavigate("home")
                                            "ASISTENTE" -> onNavigate("assistant")
                                            "ACCESIBILIDAD", "TRADUCIR" -> onNavigate("accessibility")
                                            else -> onError("No entendí el comando. Intenta de nuevo.")
                                        }
                                    }
                                } else onError("No se grabó audio.")
                            } else {
                                ensureMicPermission { granted ->
                                    if (granted) {
                                        try { recorder.start(); recording = true }
                                        catch (e: Exception) { onError("No se pudo grabar: ${e.message}") }
                                    } else onError("Permiso de micrófono denegado.")
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(if (recording) Icons.Default.Stop else Icons.Default.Mic, contentDescription = null)
                        Spacer(Modifier.size(8.dp))
                        Text(if (recording) "Detener y enviar" else "Decir un comando")
                    }
                }
            }
        }

        if (settings.translationEnabled) {
            Card(shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Translate, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Text("  Traducción con Gemini", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }
                    LanguageSelector("Desde", sourceLang) { sourceLang = it }
                    LanguageSelector("Hacia", targetLang) { targetLang = it }
                    OutlinedTextField(
                        value = textToTranslate,
                        onValueChange = { textToTranslate = it },
                        label = { Text("Texto a traducir") },
                        modifier = Modifier.fillMaxWidth().height(110.dp),
                        maxLines = 4,
                    )
                    Button(
                        onClick = { onTranslate(textToTranslate, sourceLang, targetLang) },
                        enabled = textToTranslate.isNotBlank() && !translating,
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text(if (translating) "Traduciendo..." else "Traducir") }
                    if (translatedText.isNotBlank()) {
                        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)) {
                            Column(Modifier.padding(14.dp)) {
                                Text("Resultado", style = MaterialTheme.typography.labelMedium)
                                Text(translatedText, style = MaterialTheme.typography.bodyLarge)
                                TextButton(onClick = onSpeakTranslated) {
                                    Icon(Icons.Default.VolumeUp, contentDescription = null)
                                    Text(" Escuchar")
                                }
                            }
                        }
                    }
                    Text("La precisión depende de la lengua y de los datos disponibles en el modelo.", style = MaterialTheme.typography.bodySmall)
                }
            }
        }

        Card(shape = RoundedCornerShape(18.dp)) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Tamaño del texto", style = MaterialTheme.typography.titleMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(1f, 1.15f, 1.3f).forEach { scale ->
                        OutlinedButton(
                            onClick = { onUpdate { s -> s.copy(textScale = scale) } },
                            modifier = Modifier.weight(1f),
                        ) { Text("A", style = MaterialTheme.typography.bodyMedium.copy(fontSize = if (scale == 1f) MaterialTheme.typography.bodyMedium.fontSize else if (scale == 1.15f) MaterialTheme.typography.bodyLarge.fontSize else MaterialTheme.typography.titleMedium.fontSize)) }
                    }
                }
                Text("Contraste", style = MaterialTheme.typography.titleMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Normal" to 0, "Alto" to 1, "Máximo" to 2).forEach { (label, value) ->
                        OutlinedButton(
                            onClick = { onUpdate { s -> s.copy(contrast = value) } },
                            modifier = Modifier.weight(1f),
                        ) { Text(label) }
                    }
                }
            }
        }

        Card(shape = RoundedCornerShape(18.dp)) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Configuración de la app", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(
                    "La conexión con Gemini ya viene integrada en la compilación. " +
                        "No necesitas escribir ni ver claves en la aplicación.",
                    style = MaterialTheme.typography.bodySmall,
                )
                OutlinedButton(
                    onClick = { onUpdate { s -> s.copy(configured = false) } },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Nueva configuración")
                }
            }
        }
        Text("AccesIA · ODS 10: reducción de las desigualdades", style = MaterialTheme.typography.bodySmall, color = Color(0xFFC2185B))
    }
}

@Composable
private fun SettingSwitch(
    title: String,
    subtitle: String,
    checked: Boolean,
    onChecked: (Boolean) -> Unit,
) {
    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
            Text(subtitle, style = MaterialTheme.typography.bodySmall)
        }
        Switch(checked = checked, onCheckedChange = onChecked)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LanguageSelector(label: String, value: String, onSelect: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = value,
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
            modifier = Modifier.menuAnchor().fillMaxWidth(),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            Languages.options.forEach { option ->
                DropdownMenuItem(text = { Text(option) }, onClick = { onSelect(option); expanded = false })
            }
        }
    }
}
