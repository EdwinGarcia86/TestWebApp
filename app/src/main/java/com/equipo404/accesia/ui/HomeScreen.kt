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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Work
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

data class ServiceCategory(
    val title: String,
    val icon: ImageVector,
    val color: Color,
)

private val categories = listOf(
    ServiceCategory("Trámites", Icons.Default.Description, Color(0xFFDCEEFF)),
    ServiceCategory("Servicios de salud", Icons.Default.LocalHospital, Color(0xFFFFE0EC)),
    ServiceCategory("Educación", Icons.Default.School, Color(0xFFEADDFF)),
    ServiceCategory("Empleo y oportunidades", Icons.Default.Work, Color(0xFFFFE0B2)),
    ServiceCategory("Apoyos gubernamentales", Icons.Default.AccountBalance, Color(0xFFC8E6C9)),
    ServiceCategory("Información general", Icons.Default.Info, Color(0xFFB3E5FC)),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    simplified: Boolean,
    onCategory: (String) -> Unit,
    onAssistant: () -> Unit,
    onOpenAccessibility: () -> Unit,
) {
    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Color(0xFFC2185B))
                    Text("  AccesIA", fontWeight = FontWeight.Bold)
                }
            },
            actions = {
                IconButton(onClick = onOpenAccessibility) {
                    Icon(Icons.Default.Settings, contentDescription = "Accesibilidad")
                }
            },
        )

        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp),
        ) {
            Text(
                "¿En qué te podemos ayudar hoy?",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(18.dp))

            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                modifier = Modifier.height(if (simplified) 420.dp else 480.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                userScrollEnabled = false,
            ) {
                items(categories) { category ->
                    Card(
                        onClick = { onCategory(category.title) },
                        colors = CardDefaults.cardColors(containerColor = category.color),
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.fillMaxWidth().height(if (simplified) 120.dp else 132.dp),
                    ) {
                        Column(
                            Modifier.fillMaxSize().padding(14.dp),
                            verticalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Icon(category.icon, contentDescription = null, modifier = Modifier.size(32.dp))
                            Text(
                                category.title,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFF1D1B20),
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(20.dp))
            Button(
                onClick = onAssistant,
                modifier = Modifier.fillMaxWidth().height(60.dp),
                shape = RoundedCornerShape(18.dp),
            ) {
                Icon(Icons.Default.Mic, contentDescription = null)
                Spacer(Modifier.size(10.dp))
                Text("Hablar con el asistente IA")
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}
