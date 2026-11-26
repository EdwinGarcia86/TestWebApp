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
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Groups
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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.equipo404.accesia.data.Languages

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SetupScreen(
    onSubmit: (language: String, lowVision: Boolean) -> Unit,
) {
    var language by remember { mutableStateOf("Español") }
    var expanded by remember { mutableStateOf(false) }
    var lowVision by remember { mutableStateOf<Boolean?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.Default.Groups,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(44.dp),
            )
            Column(Modifier.padding(start = 12.dp)) {
                Text("AccesIA", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text("Información y servicios para todas las personas", style = MaterialTheme.typography.bodyMedium)
            }
            Spacer(Modifier.weight(1f))
            Icon(
                Icons.Default.AutoAwesome,
                contentDescription = null,
                tint = Color(0xFFC2185B),
                modifier = Modifier.size(28.dp),
            )
        }

        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            shape = RoundedCornerShape(20.dp),
        ) {
            Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.VolumeUp, contentDescription = null)
                Column(Modifier.padding(start = 12.dp)) {
                    Text("Configuración inicial", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text("Te haremos unas preguntas para personalizar tu experiencia.")
                }
            }
        }

        Text("¿Cuál es tu lengua nativa?", style = MaterialTheme.typography.titleMedium)
        ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
            OutlinedTextField(
                value = language,
                onValueChange = {},
                readOnly = true,
                label = { Text("Selecciona una lengua") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                modifier = Modifier.menuAnchor().fillMaxWidth(),
            )
            ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                Languages.options.forEach { option ->
                    DropdownMenuItem(
                        text = { Text(option) },
                        onClick = { language = option; expanded = false },
                    )
                }
            }
        }

        Text("¿Tienes discapacidad visual severa?", style = MaterialTheme.typography.titleMedium)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(
                onClick = { lowVision = true },
                modifier = Modifier.weight(1f).height(56.dp),
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                    containerColor = if (lowVision == true) Color(0xFF2E7D32) else Color(0xFFA5D6A7),
                ),
            ) { Text("Sí") }
            Button(
                onClick = { lowVision = false },
                modifier = Modifier.weight(1f).height(56.dp),
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                    containerColor = if (lowVision == false) Color(0xFFC62828) else Color(0xFFEF9A9A),
                ),
            ) { Text("No") }
        }

        Button(
            onClick = { onSubmit(language, lowVision ?: false) },
            modifier = Modifier.fillMaxWidth().height(60.dp),
            shape = RoundedCornerShape(16.dp),
        ) {
            Text("Continuar")
            Spacer(Modifier.size(8.dp))
            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null)
        }
    }
}
