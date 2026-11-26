package com.equipo404.accesia.ui

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density
import com.equipo404.accesia.data.AppSettings

@Composable
fun AccesIATheme(settings: AppSettings, content: @Composable () -> Unit) {
    val scheme: ColorScheme = when (settings.contrast) {
        1 -> darkColorScheme(
            primary = Color(0xFFFFD54F),
            onPrimary = Color.Black,
            secondary = Color(0xFF82E9FF),
            onSecondary = Color.Black,
            background = Color(0xFF121212),
            onBackground = Color.White,
            surface = Color(0xFF1E1E1E),
            onSurface = Color.White,
        )
        2 -> darkColorScheme(
            primary = Color(0xFFFFFF00),
            onPrimary = Color.Black,
            secondary = Color(0xFFFFFF00),
            onSecondary = Color.Black,
            background = Color.Black,
            onBackground = Color.White,
            surface = Color.Black,
            onSurface = Color.White,
            outline = Color.White,
        )
        else -> lightColorScheme(
            primary = Color(0xFF6750A4),
            onPrimary = Color.White,
            primaryContainer = Color(0xFFEADDFF),
            onPrimaryContainer = Color(0xFF21005D),
            secondary = Color(0xFF0284C7),
            onSecondary = Color.White,
            background = Color(0xFFFFFBFF),
            onBackground = Color(0xFF1D1B20),
            surface = Color.White,
            onSurface = Color(0xFF1D1B20),
        )
    }

    MaterialTheme(colorScheme = scheme) {
        val density = LocalDensity.current
        CompositionLocalProvider(
            LocalDensity provides Density(density.density, settings.textScale)
        ) {
            Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                content()
            }
        }
    }
}
