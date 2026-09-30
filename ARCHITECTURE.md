# Pipeline Programático de Video: De HTML/React a Redes Sociales (TikTok, Reels, WhatsApp)

Documento técnico de arquitectura, especificación de componentes y pipeline de ejecución para una estación de trabajo de escritorio en Windows orientada a la creación, previsualización determinista y exportación de video automatizado con **Remotion**, **WebGL/Three.js**, sincronización rítmica/karaoke y codificación FFmpeg orientada a redes sociales.

---

## 1. Arquitectura del Sistema e Infraestructura Local (Windows)

La solución está concebida como una **aplicación de escritorio local en Windows** ejecutada mediante una arquitectura basada en **WebView** (Electron o Tauri con un backend o sidecar de Node.js). Esto desacopla el diseño de la escena, la previsualización interactiva y el motor de compilación pesado, guardando todos los artefactos en el almacenamiento local sin depender de la nube.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   APLICACIÓN DE ESCRITORIO (WINDOWS)                  │
├────────────────────────────────────────────────────────────────────────┤
│  INTERFAZ DE USUARIO (WEBVIEW: React + Tailwind + Lucide)              │
│  ├── Gestor de Workspaces / Proyectos (.json + assets)                 │
│  ├── Diseñador de Escenas / Compositor de Capas                        │
│  ├── Previsualizador (@remotion/player + Audio Sync)                   │
│  └── Ingesta de Audio, Timestamps (LRC/JSON) y FFT Precalculada        │
├──────────────────────────────────┬─────────────────────────────────────┤
│  PROCESO DE FONDO (NODE.JS IPC)  │  PIPELINE DE CODIFICACIÓN LOCAL     │
│  ├── Orquestador Remotion Bundler│  ├── Chromium Headless              │
│  ├── Watcher de Proyecto & Estado│  ├── FFmpeg (CPU: libx264)          │
│  └── Analizador Offline de Audio │  └── FFmpeg (GPU: h264_nvenc opc.) │
└──────────────────────────────────┴─────────────────────────────────────┘
```

### 1.1 Modos de Renderizado y Hardware en Windows

1. **Codificación por CPU (`libx264`) [Modo Master - Máxima Calidad]:**
   * Motor de referencia para la versión final de TikTok e Instagram Reels.
   * Utiliza compresión psicovisual avanzada (`crf` o `2-pass VBR`) que preserva detalles en gradientes y texto tipográfico fino sobre fondos oscuros.
2. **Aceleración por GPU NVIDIA (`h264_nvenc`) [Modo Rápido / Previews]:**
   * Utiliza el chip dedicado NVENC de tarjetas gráficas NVIDIA (GeForce / RTX).
   * Reduce drásticamente los tiempos de exportación al codificar fotogramas en paralelo con el pipeline de renderizado gráfico de Chromium, manteniendo los perfiles y restricciones de nivel para compatibilidad social.

---

## 2. Complejidad Visual y Determinismo Cuadro a Cuadro

El proyecto admite capas híbridas: gráficos procedurales 2D (Canvas/SVG), escenas 3D (Three.js / React Three Fiber), componentes DOM/CSS, tipografía cinética y videos pregrabados (B-roll).

### 2.1 Desacoplamiento del Loop Gráfico en Canvas y WebGL (Three.js)

En una aplicación web estándar, WebGL y Canvas dependen de `requestAnimationFrame` o `performance.now()`. Durante la exportación en Remotion, el tiempo no transcurre en tiempo real. **Si un frame tarda 200 ms en computarse, `requestAnimationFrame` se desfasaría, arruinando la sincronización**.

Para mantener un determinismo matemático absoluto:
* Se desactiva el render loop automático (`frameloop="never"` en React Three Fiber).
* Se fuerza el renderizado manual de la escena exactamente en la posición temporal calculada por `useCurrentFrame()`.

#### Implementación Determinista con React Three Fiber:

```tsx
import React, { useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";

// Componente que sincroniza la cámara y malla con el frame exacto de Remotion
const DeterministicScene: React.FC<{ beatIntensity: number }> = ({ beatIntensity }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Tiempo virtual determinista en segundos
  const virtualTime = frame / fps;

  useEffect(() => {
    if (!meshRef.current) return;
    // Rotación matemática pura en función del frame
    meshRef.current.rotation.x = virtualTime * 1.5;
    meshRef.current.rotation.y = virtualTime * 2.0;
    
    // Deformación reactiva a la intensidad del ritmo precalculado
    const scale = 1 + beatIntensity * 0.4;
    meshRef.current.scale.set(scale, scale, scale);
  }, [frame, virtualTime, beatIntensity]);

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2.5, 2.5, 2.5]} />
      <meshStandardMaterial color="#00ffcc" wireframe />
    </mesh>
  );
};

// Controlador manual de cuadro
const FrameDriver: React.FC = () => {
  const { gl, scene, camera } = useThree();
  const frame = useCurrentFrame();

  useEffect(() => {
    // Forzar el redibujado exacto del buffer WebGL
    gl.render(scene, camera);
  }, [frame, gl, scene, camera]);

  return null;
};

export const ThreeDimensionalLayer: React.FC<{ beatIntensity: number }> = ({ beatIntensity }) => {
  return (
    <Canvas
      frameloop="never" // CRÍTICO: Anula el reloj en tiempo real del navegador
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ position: [0, 0, 5], fov: 60 }}
      style={{ width: "100%", height: "100%", position: "absolute" }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} />
      <DeterministicScene beatIntensity={beatIntensity} />
      <FrameDriver />
    </Canvas>
  );
};
```

### 2.2 Capas de B-roll vs. Capas de Animación Estricta

* **Capas con Determinismo Estricto (Gráficos, SVG, Tipografía, WebGL):**
  * Su estado visual depende exclusivamente de fórmulas cerradas: $S(f) = f(\text{frame}, \text{props})$.
  * Garantiza que el fotograma 145 sea idéntico en el preview, en el render local y tras reiniciar la máquina.
* **Capas de Acompañamiento / B-roll (Clips pregrabados de fondo):**
  * Se procesan mediante el componente `<OffthreadVideo />` de Remotion.
  * FFmpeg extrae los fotogramas del archivo fuente en un hilo independiente fuera del DOM principal de Chromium, garantizando estabilidad de memoria sin bloquear las animaciones procedurales.

### 2.3 Renders de Larga Duración y Gestión de Memoria

Remotion no impone límites a la duración del video (15 segundos a varias horas). Sin embargo, en videos de más de 3 minutos con Canvas y Chromium Headless, la acumulación de texturas puede saturar la RAM.

* **Concurrencia Controlada:** Configurar `concurrency` en Remotion según la CPU/RAM del equipo local (ej. 50% de los núcleos lógicos disponibles).
* **Chunking y Stills:** Chromium se reinicia automáticamente tras cierto número de frames procesados (`maxTimelineTracks` / reciclaje de pestañas internas) para liberar el recolector de basura de JavaScript y buffers de GPU.

---

## 3. Sincronización Rítmica y Sistema de Subtítulos/Karaoke

El audio no se sintetiza en este flujo: se importa pregrabado (pistas de voz o música). Para sincronizar la imagen al compás sonoro sin sobrecargar el renderizador ni sufrir latencias en el preview, se separa el análisis de audio de la reproducción.

### 3.1 Pipeline de Análisis de Audio Precalculado (Offline FFT y Beattracking)

El análisis de frecuencias sonoras **no se realiza en tiempo de ejecución**. Un paso de precomputación en Node.js (usando librerías nativas como `meyda`, `music-metadata` o scripts auxiliares) analiza el archivo WAV/MP3 una sola vez y genera un archivo `audio-analysis.json`.

```
[ Pista de Audio (.mp3 / .wav) ]
              │
              ▼ (Precomputación Offline - Node.js Worker)
 ┌─────────────────────────────────────────────────────────────┐
 │ 1. Decodificación PCM                                      │
 │ 2. Detección de Transitorios / Golpes (Onset / Beat Detect) │
 │ 3. FFT enventanada (Ventana Hanning, Hop Size = 1/FPS)      │
 │ 4. Agrupación por bandas: Bass, Mid, Treble + RMS           │
 └─────────────────────────────────────────────────────────────┘
              │
              ▼
   [ audio-analysis.json ] ──► Consumido por el Preview y Remotion Render
```

#### Estructura del Archivo `audio-analysis.json`:
```json
{
  "fps": 30,
  "sampleRate": 44100,
  "durationInFrames": 900,
  "frames": [
    {
      "frame": 0,
      "rms": 0.02,
      "bass": 0.05,
      "mid": 0.01,
      "treble": 0.0,
      "isBeat": false
    },
    {
      "frame": 28,
      "rms": 0.78,
      "bass": 0.92,
      "mid": 0.45,
      "treble": 0.31,
      "isBeat": true
    }
  ]
}
```

Dentro de cualquier componente React, animar un elemento al ritmo de la música se reduce a una búsqueda $O(1)$ por índice de fotograma:

```tsx
import { useCurrentFrame } from "remotion";
import audioAnalysis from "./workspaces/project-1/audio-analysis.json";

export const ReactiveWave: React.FC = () => {
  const frame = useCurrentFrame();
  const currentAudioData = audioAnalysis.frames[frame] || { bass: 0, isBeat: false };

  return (
    <div
      style={{
        transform: `scale(${1 + currentAudioData.bass * 0.2})`,
        filter: currentAudioData.isBeat ? "drop-shadow(0 0 15px #ff0055)" : "none",
        transition: "transform 0.05s ease-out",
      }}
    />
  );
};
```

---

### 3.2 Timestamps Estandarizados: Esquema JSON y Conversión desde Enhanced LRC

La sincronización lírica (karaoke palabra por palabra y línea por línea) se apoya en un esquema de datos neutro.

#### A. Esquema Estándar (`lyrics.json`)
```json
{
  "version": "1.0",
  "metadata": {
    "title": "Track Title",
    "artist": "Artist Name",
    "offsetMs": 0
  },
  "lines": [
    {
      "id": "line-1",
      "startMs": 1250,
      "endMs": 4100,
      "text": "Creando contenido programático con código",
      "words": [
        { "text": "Creando", "startMs": 1250, "endMs": 1700 },
        { "text": "contenido", "startMs": 1720, "endMs": 2300 },
        { "text": "programático", "startMs": 2350, "endMs": 3200 },
        { "text": "con", "startMs": 3220, "endMs": 3450 },
        { "text": "código", "startMs": 3470, "endMs": 4100 }
      ]
    }
  ]
}
```

#### B. Pipeline Conversor: Enhanced LRC a JSON Estandarizado

El formato Enhanced LRC codifica las marcas de palabra mediante etiquetas angulares:
`[00:01.25] <00:01.25> Creando <00:01.72> contenido <00:02.35> programático`

Este módulo en TypeScript convierte el archivo `.lrc` al esquema estándar JSON:

```typescript
export interface WordToken {
  text: string;
  startMs: number;
  endMs: number;
}

export interface LyricLine {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  words: WordToken[];
}

export function parseEnhancedLrcToStandardJson(lrcContent: string): LyricLine[] {
  const lines = lrcContent.split("\n");
  const parsedLines: LyricLine[] = [];

  const timeTagRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  const wordTagRegex = /<(\d{2}):(\d{2})\.(\d{2,3})>([^<]+)/g;

  const toMs = (min: string, sec: string, frac: string) => {
    const msMultiplier = frac.length === 2 ? 10 : 1;
    return parseInt(min, 10) * 60000 + parseInt(sec, 10) * 1000 + parseInt(frac, 10) * msMultiplier;
  };

  lines.forEach((rawLine, lineIndex) => {
    const lineTimeMatch = rawLine.match(timeTagRegex);
    if (!lineTimeMatch) return;

    const lineStartMs = toMs(lineTimeMatch[1], lineTimeMatch[2], lineTimeMatch[3]);
    const words: WordToken[] = [];
    let match: RegExpExecArray | null;

    while ((match = wordTagRegex.exec(rawLine)) !== null) {
      const wordStartMs = toMs(match[1], match[2], match[3]);
      const wordText = match[4].trim();
      
      // Asigna endMs provisionalmente al inicio de la palabra siguiente
      if (words.length > 0) {
        words[words.length - 1].endMs = wordStartMs;
      }

      words.push({
        text: wordText,
        startMs: wordStartMs,
        endMs: wordStartMs + 300, // Duración default si es la última palabra
      });
    }

    if (words.length > 0) {
      const lineEndMs = words[words.length - 1].endMs;
      parsedLines.push({
        id: `line-${lineIndex + 1}`,
        startMs: lineStartMs,
        endMs: lineEndMs,
        text: words.map((w) => w.text).join(" "),
        words,
      });
    }
  });

  return parsedLines;
}
```

#### C. Componente de Subtítulos Cinéticos (Karaoke Word-by-Word)

```tsx
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { LyricLine } from "./lrc-parser";

interface SubtitlesProps {
  lyrics: LyricLine[];
}

export const KineticSubtitles: React.FC<SubtitlesProps> = ({ lyrics }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  // Buscar la línea activa
  const activeLine = lyrics.find(
    (line) => currentMs >= line.startMs - 200 && currentMs <= line.endMs + 300
  );

  if (!activeLine) return null;

  return (
    <div style={{
      position: "absolute",
      bottom: "280px",
      width: "100%",
      textAlign: "center",
      padding: "0 40px",
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: "14px",
    }}>
      {activeLine.words.map((word, index) => {
        const isCurrentWord = currentMs >= word.startMs && currentMs <= word.endMs;
        const isPastWord = currentMs > word.endMs;

        let scale = 1;
        let color = "rgba(255, 255, 255, 0.4)"; // Palabra inactiva

        if (isCurrentWord) {
          scale = 1.25;
          color = "#FFE600"; // Palabra cantada en el frame exacto
        } else if (isPastWord) {
          color = "#FFFFFF"; // Ya cantada
        }

        return (
          <span
            key={index}
            style={{
              fontSize: "52px",
              fontWeight: 900,
              fontFamily: "Inter, Montserrat, sans-serif",
              color,
              transform: `scale(${scale})`,
              display: "inline-block",
              transition: "transform 0.08s ease, color 0.08s ease",
              textShadow: isCurrentWord ? "0 0 20px rgba(255, 230, 0, 0.8)" : "0 2px 8px rgba(0,0,0,0.8)",
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};
```

---

## 4. Sistema de Proyectos y Persistencia (Workspace Model)

Para permitir pausar el avance, cambiar de video y retomarlo días después sin perder configuraciones ni assets, el sistema almacena cada proyecto en una carpeta aislada en disco.

### 4.1 Estructura del Árbol de Directorios del Workspace

```text
C:/VideoEngine/Workspaces/
  ├── workspace-manifest.json            # Registro global de proyectos locales
  └── project-alpha-tiktok/              # Carpeta de un proyecto específico
      ├── project.json                   # Estado de edición, props, configuración
      ├── audio/
      │   ├── main-track.mp3             # Pista de audio maestra
      │   └── audio-analysis.json        # Curvas FFT precalculadas (RMS, Bass, Beats)
      ├── lyrics/
      │   ├── source.lrc                 # Letra original (Enhanced LRC)
      │   └── lyrics.json                # Letra estandarizada parseada
      ├── assets/                        # Recursos de medios (Videos B-roll, PNGs, SVG, 3D GLTF)
      │   ├── b-roll-bg.mp4
      │   └── logo-badge.svg
      └── exports/                       # Videos finales renderizados
          ├── tiktok_master_20261001.mp4
          └── whatsapp_lite_20261001.mp4
```

### 4.2 Manifiesto del Proyecto (`project.json`)

```json
{
  "id": "proj-98214f",
  "name": "Promo Lanzamiento Single",
  "createdAt": "2026-09-30T14:20:00Z",
  "updatedAt": "2026-09-30T17:45:00Z",
  "settings": {
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "durationInFrames": 900
  },
  "timelineState": {
    "currentScrubberFrame": 142,
    "zoomLevel": 1.2
  },
  "sceneProps": {
    "themeColor": "#FF0055",
    "primaryFont": "Montserrat",
    "backgroundBlur": 15,
    "enable3DScene": true,
    "particleCount": 120
  }
}
```

---

## 5. Pipeline de Codificación: Perfiles TikTok/Reels y WhatsApp

Toda la compresión pasa por FFmpeg local con los metadatos y estructuras GOP estudiadas para resistir la re-transcodificación agresiva de las plataformas.

```
                    [ Chromium Headless (RGBA Raw Frames) ]
                                      │
                                      ▼
                        FFmpeg CLI (Local Pipe stdin)
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
     [ PERFIL A: TIKTOK / REELS ]                    [ PERFIL B: WHATSAPP LITE ]
     • Bitrate: 10 Mbps (VBR)                        • Bitrate: 2.8 Mbps
     • Maxrate: 12 Mbps / Buf: 15 Mbps               • Maxrate: 3.2 Mbps / Buf: 4 Mbps
     • GOP: 60 frames (2s a 30fps)                   • GOP: 30 frames (1s a 30fps)
     • VUI: Rec. 709 / Limited Range                 • VUI: Rec. 709 / Limited Range
     • H.264 High Profile Level 4.2                  • H.264 Main Profile Level 4.0
     • Audio: 192 kbps AAC Stereo                    • Audio: 128 kbps AAC Stereo
     • Objetivo: Máxima nitidez y HLS ready          • Objetivo: Archivo < 16 MB
```

### 5.1 Especificación de Comandos FFmpeg por Plataforma

#### Perfil Principal: TikTok / Instagram Reels (CPU `libx264`)
```bash
ffmpeg -f rawvideo -pix_fmt rgba -s 1080x1920 -r 30 -i - \
  -i audio/main-track.mp3 \
  -c:v libx264 -preset slow \
  -profile:v high -level:v 4.2 \
  -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv \
  -b:v 10M -maxrate 12M -bufsize 15M \
  -g 60 -keyint_min 30 -sc_threshold 0 \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart \
  -y exports/tiktok_master.mp4
```

#### Perfil Principal Acelerado: TikTok / Instagram Reels (NVIDIA GPU `h264_nvenc`)
```bash
ffmpeg -f rawvideo -pix_fmt rgba -s 1080x1920 -r 30 -i - \
  -i audio/main-track.mp3 \
  -c:v h264_nvenc -preset p6 -tune hq \
  -profile:v high -level 4.2 \
  -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -b:v 10M -maxrate 12M -bufsize 15M \
  -g 60 -forced-idr 1 \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart \
  -y exports/tiktok_master_nvenc.mp4
```

#### Perfil Secundario: Estados de WhatsApp (Bajo Peso y Alta Resistencia)
```bash
ffmpeg -f rawvideo -pix_fmt rgba -s 1080x1920 -r 30 -i - \
  -i audio/main-track.mp3 \
  -c:v libx264 -preset medium \
  -profile:v main -level:v 4.0 \
  -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv \
  -b:v 2800k -maxrate 3200k -bufsize 4000k \
  -g 30 -keyint_min 30 -sc_threshold 0 \
  -c:a aac -b:a 128k -ar 44100 \
  -movflags +faststart \
  -y exports/whatsapp_lite.mp4
```

---

## 6. Interfaz de Usuario y Flujo de Trabajo en la WebView

La aplicación de escritorio unifica el diseño dinámico en React con el renderizado final a través de cuatro áreas funcionales:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SUITE DE EDICIÓN LOCAL                          │
├────────────────────────┬───────────────────────────────────────────────┤
│ 1. PANEL DE TRABAJO    │ 3. MONITOR DE PREVIEW (@remotion/player)      │
│ • Selección Workspace  │                                               │
│ • Importador LRC/JSON  │        ┌─────────────────────────┐            │
│ • Carga de Audio MP3   │        │                         │            │
│ • Precompute FFT (btn) │        │     REPRODUCTOR 9:16    │            │
│                        │        │    (Canvas + WebGL +    │            │
│ 2. PROPS DE ESCENA     │        │     Audio Sincronizado) │            │
│ • Selector de color    │        │                         │            │
│ • Tamaños de fuente    │        │   "Creando contenido"   │            │
│ • Toggles 2D/3D        │        └─────────────────────────┘            │
│ • Opacidad de B-roll   │   ⏮  ⏸  ⏭   [======⚪======] 00:04.22/00:30.00 │
├────────────────────────┴───────────────────────────────────────────────┤
│ 4. PANEL DE EXPORTACIÓN                                                │
│ [x] TikTok Master (10Mbps)  [ ] WhatsApp Lite (2.8Mbps)                │
│ [x] Usar GPU NVENC          Ruta: C:/Videos/Exports/  [ EXPORTAR MP4 ] │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Implementación del Contenedor de la Suite (`DesktopStudio.tsx`)

```tsx
import React, { useState, useRef, useEffect } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { MainComposition } from "./MainComposition";
import { parseEnhancedLrcToStandardJson, LyricLine } from "./lrc-parser";

export const DesktopStudio: React.FC = () => {
  const playerRef = useRef<PlayerRef>(null);

  // 1. Estado persistente del Workspace
  const [workspacePath, setWorkspacePath] = useState("C:/VideoEngine/Workspaces/project-alpha-tiktok");
  const [lyricsData, setLyricsData] = useState<LyricLine[]>([]);
  const [audioAnalysis, setAudioAnalysis] = useState<any>(null);
  const [sceneConfig, setSceneConfig] = useState({
    themeColor: "#00FFCC",
    titleText: "Lyric Video Automático",
    show3DLayer: true,
  });

  // 2. Control de exportación
  const [exportProfile, setExportProfile] = useState<"tiktok" | "whatsapp">("tiktok");
  const [useHardwareAcc, setUseHardwareAcc] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Guardar estado localmente en el project.json
  const persistWorkspaceState = async () => {
    const payload = {
      settings: { width: 1080, height: 1920, fps: 30, durationInFrames: 900 },
      sceneProps: sceneConfig,
      lastSaved: new Date().toISOString(),
    };
    // Llamada IPC al backend de Node.js en Windows
    // @ts-ignore
    await window.electronAPI?.saveProject(workspacePath, payload);
  };

  const handleLrcUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseEnhancedLrcToStandardJson(content);
      setLyricsData(parsed);
    };
    reader.readAsText(file);
  };

  const triggerExport = async () => {
    setIsExporting(true);
    // Llamada IPC para iniciar FFmpeg y Remotion Render desatendido
    // @ts-ignore
    await window.electronAPI?.startRender({
      workspacePath,
      profile: exportProfile,
      useNvenc: useHardwareAcc,
      onProgress: (p: number) => setExportProgress(p),
    });
    setIsExporting(false);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", height: "100vh", background: "#111", color: "#FFF" }}>
      {/* Columna Izquierda: Parámetros y Workspace */}
      <div style={{ padding: "24px", overflowY: "auto", borderRight: "1px solid #222" }}>
        <h2>Workspace Local</h2>
        <p style={{ fontSize: "12px", color: "#888" }}>{workspacePath}</p>
        <button onClick={persistWorkspaceState} style={{ padding: "8px 16px", marginBottom: "20px" }}>
          💾 Guardar Progreso
        </button>

        <h3>1. Ingesta de Datos</h3>
        <label>Cargar Enhanced LRC:</label>
        <input type="file" accept=".lrc,.txt" onChange={handleLrcUpload} style={{ display: "block", marginBottom: "16px" }} />

        <h3>2. Configuración de Escena</h3>
        <label>Color de Acento:</label>
        <input
          type="color"
          value={sceneConfig.themeColor}
          onChange={(e) => setSceneConfig({ ...sceneConfig, themeColor: e.target.value })}
          style={{ display: "block", marginBottom: "16px" }}
        />

        <label>
          <input
            type="checkbox"
            checked={sceneConfig.show3DLayer}
            onChange={(e) => setSceneConfig({ ...sceneConfig, show3DLayer: e.target.checked })}
          />
          Habilitar Escena 3D (WebGL Determinista)
        </label>

        <hr style={{ margin: "24px 0", borderColor: "#222" }} />

        <h3>3. Exportación Final</h3>
        <label>Perfil de Salida:</label>
        <select
          value={exportProfile}
          onChange={(e: any) => setExportProfile(e.target.value)}
          style={{ width: "100%", padding: "8px", background: "#222", color: "#FFF", marginBottom: "12px" }}
        >
          <option value="tiktok">TikTok / Reels Master (10 Mbps, Rec. 709)</option>
          <option value="whatsapp">WhatsApp Lite (2.8 Mbps, &lt; 16MB)</option>
        </select>

        <label style={{ display: "block", marginBottom: "16px" }}>
          <input
            type="checkbox"
            checked={useHardwareAcc}
            onChange={(e) => setUseHardwareAcc(e.target.checked)}
          />
          Usar Aceleración NVIDIA NVENC
        </label>

        <button
          onClick={triggerExport}
          disabled={isExporting}
          style={{ width: "100%", padding: "12px", background: "#FF0055", fontWeight: "bold", border: "none", cursor: "pointer" }}
        >
          {isExporting ? `Exportando (${exportProgress}%)...` : "Renderizar Video MP4"}
        </button>
      </div>

      {/* Columna Derecha: Previsualización en Vivo */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ width: "380px", height: "675px", borderRadius: "16px", overflow: "hidden", boxShadow: "0 0 40px rgba(0,0,0,0.8)" }}>
          <Player
            ref={playerRef}
            component={MainComposition}
            inputProps={{
              lyrics: lyricsData,
              analysis: audioAnalysis,
              config: sceneConfig,
            }}
            durationInFrames={900}
            compositionWidth={1080}
            compositionHeight={1920}
            fps={30}
            controls
            loop
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>
    </div>
  );
};
```

---

## 7. Checklist de Verificación para Producción

* [ ] **Desacoplamiento de Canvas/WebGL:** Comprobar que ningún componente 3D utilice `requestAnimationFrame` y que todo el renderizado esté gobernado por `useCurrentFrame()`.
* [ ] **Precomputación de Audio:** Validar que el archivo `audio-analysis.json` exista en el workspace antes de iniciar el render final para evitar bloqueos en el hilo de compilación.
* [ ] **Validación de Timestamps:** Comprobar que el conversor de Enhanced LRC a JSON haya resuelto marcas temporales continuas sin solapamiento negativo de milisegundos.
* [ ] **Resolución Nativa Par:** Mantener estrictamente $1080 \times 1920$ px en vertical.
* [ ] **GOP Forzado:** Comprobar que el comando FFmpeg mantenga `-g 60` (o `-g 30` en WhatsApp) para garantizar que las redes sociales no apliquen re-compresión destructiva.
* [ ] **Metadatos VUI Rec. 709:** Verificar que los flags `-color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv` estén presentes para evitar pérdidas de contraste en pantallas OLED de smartphones.
* [ ] **Persistencia del Workspace:** Comprobar que `project.json` refleje el último estado de edición para permitir cerrar la aplicación y retomar el trabajo de inmediato.