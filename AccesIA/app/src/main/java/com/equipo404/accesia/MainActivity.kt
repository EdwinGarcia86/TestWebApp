package com.equipo404.accesia

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Accessibility
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import com.equipo404.accesia.audio.Speaker
import com.equipo404.accesia.ui.AccessibilityScreen
import com.equipo404.accesia.ui.AccesIATheme
import com.equipo404.accesia.ui.AssistantScreen
import com.equipo404.accesia.ui.HomeScreen
import com.equipo404.accesia.ui.SetupScreen

class MainActivity : ComponentActivity() {

    private var micCallback: ((Boolean) -> Unit)? = null

    private val requestMic = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        micCallback?.invoke(granted)
        micCallback = null
    }

    private fun ensureMicPermission(callback: (Boolean) -> Unit) {
        val granted = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
        if (granted) {
            callback(true)
        } else {
            micCallback = callback
            requestMic.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val viewModel: AppViewModel by viewModels()
        Speaker.init(applicationContext)

        setContent {
            val settings by viewModel.settings.collectAsState()
            AccesIATheme(settings) {
                AppRoot(viewModel, ::ensureMicPermission)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        Speaker.shutdown()
    }
}

@Composable
private fun AppRoot(
    viewModel: AppViewModel,
    ensureMicPermission: ((Boolean) -> Unit) -> Unit,
) {
    val settings by viewModel.settings.collectAsState()
    val error by viewModel.error.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    var route by remember { mutableStateOf(if (settings.configured) "home" else "setup") }

    LaunchedEffect(error) {
        error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            if (route != "setup") {
                NavigationBar {
                    NavigationBarItem(
                        selected = route == "home",
                        onClick = { route = "home" },
                        icon = { Icon(Icons.Default.Home, contentDescription = null) },
                        label = { Text("Inicio") },
                    )
                    NavigationBarItem(
                        selected = route == "assistant",
                        onClick = { route = "assistant" },
                        icon = { Icon(Icons.Default.AutoAwesome, contentDescription = null) },
                        label = { Text("Asistente") },
                    )
                    NavigationBarItem(
                        selected = route == "accessibility",
                        onClick = { route = "accessibility" },
                        icon = { Icon(Icons.Default.Accessibility, contentDescription = null) },
                        label = { Text("Accesibilidad") },
                    )
                }
            }
        },
    ) { padding ->
        Box(Modifier.padding(padding)) {
            when (route) {
                "setup" -> SetupScreen(
                    onSubmit = { language, lowVision ->
                        viewModel.finishSetup(language, lowVision)
                        route = "home"
                    },
                )

                "home" -> HomeScreen(
                    simplified = settings.simplifiedUi,
                    onCategory = { category ->
                        viewModel.sendText("Quiero información y ayuda sobre: $category")
                        route = "assistant"
                    },
                    onAssistant = { route = "assistant" },
                    onOpenAccessibility = { route = "accessibility" },
                )

                "assistant" -> {
                    val messages by viewModel.messages.collectAsState()
                    val busy by viewModel.busy.collectAsState()
                    val dictating by viewModel.dictating.collectAsState()
                    AssistantScreen(
                        messages = messages,
                        busy = busy,
                        dictating = dictating,
                        dictationEnabled = settings.dictationEnabled,
                        ensureMicPermission = ensureMicPermission,
                        onSendText = { viewModel.sendText(it) },
                        onAssistantAudio = { viewModel.sendAudioForAssistant(it) },
                        onDictate = { file, onResult -> viewModel.dictate(file, onResult) },
                        onSpeak = { viewModel.speakLast() },
                        onClear = { viewModel.clearChat() },
                        onError = { viewModel.setError(it) },
                    )
                }

                "accessibility" -> {
                    val translatedText by viewModel.translatedText.collectAsState()
                    val translating by viewModel.translating.collectAsState()
                    AccessibilityScreen(
                        settings = settings,
                        translatedText = translatedText,
                        translating = translating,
                        onUpdate = { block -> viewModel.updateSettings(block) },
                        onTranslate = { text, from, to -> viewModel.translate(text, from, to) },
                        onSpeakTranslated = { viewModel.speakIfEnabled(translatedText, force = true) },
                        ensureMicPermission = ensureMicPermission,
                        onCommandAudio = { file, onResult -> viewModel.voiceCommand(file, onResult) },
                        onNavigate = { route = it },
                        onError = { viewModel.setError(it) },
                    )
                }
            }
        }
    }
}
