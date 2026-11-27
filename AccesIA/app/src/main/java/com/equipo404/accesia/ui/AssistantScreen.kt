package com.equipo404.accesia.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import com.equipo404.accesia.data.ChatMessage
import kotlinx.coroutines.delay
import java.io.File

enum class RecordKind { ASSISTANT, DICTATE }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AssistantScreen(
    messages: List<ChatMessage>,
    busy: Boolean,
    dictating: Boolean,
    dictationEnabled: Boolean,
    ensureMicPermission: ((Boolean) -> Unit) -> Unit,
    onSendText: (String) -> Unit,
    onAssistantAudio: (File) -> Unit,
    onDictate: (File, (String) -> Unit) -> Unit,
    onSpeak: () -> Unit,
    onClear: () -> Unit,
    onError: (String) -> Unit,
) {
    val context = LocalContext.current
    val recorder = remember { AudioRecorder(context) }
    var recording by remember { mutableStateOf(false) }
    var activeKind by remember { mutableStateOf(RecordKind.ASSISTANT) }
    var input by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.size - 1)
    }

    LaunchedEffect(recording) {
        if (recording) {
            delay(60_000)
            if (recorder.isRecording) {
                val file = recorder.stop()
                recording = false
                if (file != null) {
                    if (activeKind == RecordKind.ASSISTANT) onAssistantAudio(file) else onDictate(file) { input = it }
                }
            }
        }
    }

    fun handleFile(file: File) {
        when (activeKind) {
            RecordKind.ASSISTANT -> onAssistantAudio(file)
            RecordKind.DICTATE -> onDictate(file) { text -> input = text }
        }
    }

    fun toggleRecording(kind: RecordKind) {
        if (recording) {
            val file = recorder.stop()
            recording = false
            if (file != null) handleFile(file) else onError("No se grabó audio. Intenta de nuevo.")
            return
        }
        activeKind = kind
        ensureMicPermission { granted ->
            if (granted) {
                try {
                    recorder.start()
                    recording = true
                } catch (e: Exception) {
                    onError("No se pudo iniciar la grabación: ${e.message}")
                }
            } else {
                onError("Necesitas permitir el uso del micrófono.")
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Color(0xFFC2185B))
                    Text("  Asistente IA", fontWeight = FontWeight.Bold)
                }
            },
            actions = {
                IconButton(onClick = onSpeak) { Icon(Icons.Default.VolumeUp, contentDescription = "Escuchar última respuesta") }
                IconButton(onClick = onClear) { Icon(Icons.Default.DeleteSweep, contentDescription = "Borrar conversación") }
            },
        )

        LazyColumn(
            state = listState,
            modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                ) {
                    Text(
                        "Habla o escribe tu pregunta. Te explicaré paso a paso con palabras sencillas.",
                        modifier = Modifier.padding(14.dp),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
            items(messages) { message ->
                MessageBubble(message, onSpeak)
            }
            if (busy) {
                item {
                    Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.Center) {
                        Text("Pensando...", style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
            val last = messages.lastOrNull()
            if (!busy && last != null && !last.fromUser && last.text.contains("?")) {
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = { onSendText("Sí, continuar por favor") }, modifier = Modifier.weight(1f)) {
                            Text("Sí, continuar")
                        }
                        OutlinedButton(onClick = { onSendText("No, gracias") }, modifier = Modifier.weight(1f)) {
                            Text("No, gracias")
                        }
                    }
                }
            }
        }

        Row(
            Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surface)
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(
                onClick = { toggleRecording(RecordKind.DICTATE) },
                enabled = dictationEnabled && !busy,
            ) {
                Icon(
                    if (recording && activeKind == RecordKind.DICTATE) Icons.Default.Stop else Icons.Default.Mic,
                    contentDescription = "Dictar pregunta",
                    tint = if (recording && activeKind == RecordKind.DICTATE) Color.Red else MaterialTheme.colorScheme.primary,
                )
            }
            OutlinedTextField(
                value = input,
                onValueChange = { input = it },
                placeholder = { Text(if (recording) "Escuchando..." else "Habla o escribe tu pregunta...") },
                modifier = Modifier.weight(1f),
                singleLine = true,
                enabled = !busy,
            )
            Spacer(Modifier.size(6.dp))
            IconButton(onClick = { if (input.isNotBlank()) { onSendText(input); input = "" } }, enabled = !busy && input.isNotBlank()) {
                Icon(Icons.Default.Send, contentDescription = "Enviar", tint = MaterialTheme.colorScheme.primary)
            }
        }

        Row(
            Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.Center,
        ) {
            OutlinedButton(
                onClick = { toggleRecording(RecordKind.ASSISTANT) },
                enabled = !busy && !dictating,
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = if (recording && activeKind == RecordKind.ASSISTANT) Color.Red else MaterialTheme.colorScheme.primary,
                ),
            ) {
                Icon(
                    if (recording && activeKind == RecordKind.ASSISTANT) Icons.Default.Stop else Icons.Default.Mic,
                    contentDescription = null,
                )
                Spacer(Modifier.width(8.dp))
                Text(if (recording && activeKind == RecordKind.ASSISTANT) "Detener grabación" else "Habla con el asistente")
            }
        }
    }
}

@Composable
private fun MessageBubble(message: ChatMessage, onSpeak: () -> Unit) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = if (message.fromUser) Arrangement.End else Arrangement.Start,
    ) {
        Card(
            colors = CardDefaults.cardColors(
                containerColor = if (message.fromUser) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
            ),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth(0.88f),
        ) {
            Column(Modifier.padding(12.dp)) {
                Text(
                    if (message.fromUser) "Tú" else "Asistente IA",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                )
                Text(message.text, style = MaterialTheme.typography.bodyMedium)
                if (!message.fromUser) {
                    TextButton(onClick = onSpeak) {
                        Icon(Icons.Default.VolumeUp, contentDescription = null, modifier = Modifier.size(18.dp))
                        Text(" Escuchar")
                    }
                }
            }
        }
    }
}
