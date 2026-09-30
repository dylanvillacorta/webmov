# WebMov: Pipeline Programático de Video (React + Remotion + FFmpeg)

Especificación técnica de arquitectura, flujo de trabajo developer-first y pipeline de ejecución en Windows para la creación de video automatizado en formato vertical (9:16 - 1080x1920) optimizado para **TikTok, Instagram Reels y WhatsApp**.

---

## 1. Arquitectura del Sistema y Filosofía de Trabajo

El proyecto adopta un **enfoque Developer-First** centrado en código React y orquestado directamente mediante el ecosistema oficial de **Remotion** sobre Node.js y TypeScript en Windows. Se descartan contenedores pesados de escritorio (Electron o Tauri) en favor de la máxima velocidad de desarrollo, reproducibilidad matemática y estabilidad.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ENTORNO DEVELOPER-FIRST                         │
├────────────────────────────────────────────────────────────────────────┤
│ 1. PREPARACIÓN (CLI)                                                   │
│    npm run prepare -- --project <nombre>                               │
│    ├── Decodificación de Audio Universal (FFmpeg: MP3, WAV, FLAC)     │
│    ├── Análisis Espectral y Detección de Ritmo (audio-analysis.json)   │
│    └── Parser de Enhanced LRC a Marcas de Tiempo (lyrics.json)         │
├────────────────────────────────────────────────────────────────────────┤
│ 2. DESARROLLO Y PREVISUALIZACIÓN INTERACTIVA (REMOTION STUDIO)         │
│    npm run start                                                       │
│    ├── Timeline interactivo con scrubber cuadro a cuadro (30 FPS)      │
│    ├── Audio sincronizado en vivo                                      │
│    ├── Subtítulos cinéticos palabra por palabra (Karaoke dinámico)     │
│    ├── Gráficos 2D reactivos al compás (RMS, Bass, Beats)              │
│    └── Panel lateral nativo para ajuste de propiedades en caliente     │
├────────────────────────────────────────────────────────────────────────┤
│ 3. RENDERIZADO Y CODIFICACIÓN FINAL (@remotion/renderer + FFmpeg)      │
│    npm run render -- --project <nombre> --profile [tiktok|whatsapp]    │
│    ├── Chromium Headless (Captura determinista frame a frame)          │
│    ├── overrideFfmpegArgs (Inyección de perfiles GOP y VUI Rec. 709)   │
│    └── Aceleración por Hardware (CPU libx264 o NVIDIA GPU h264_nvenc)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Estructura de Proyectos y Gestión de Datos (SSOT y Caché Derivada)

El diseño aplica el principio de **Fuente Única de Verdad (Single Source of Truth - SSOT)**:
* **`sources/`:** Insumos originales humanos/externos (audio original, archivo `.lrc` o `.json` fuente, videos B-roll). Son inmutables para el pipeline y editables por el desarrollador.
* **`generated/`:** Caché efímera y reproducible al 100%. Generada exclusivamente por `npm run prepare`. Si se necesitan correcciones finas de palabras o milisegundos, se corrigen en `sources/lyrics/` y se vuelve a ejecutar `prepare`.

```text
webmov/
  ├── projects/
  │   └── promo-single-01/               # Proyecto específico
  │       ├── config.json                # Configuración de estilo, capas y parámetros
  │       ├── sources/                   # FUENTE ÚNICA DE VERDAD (Insumos originales)
  │       │   ├── audio/                 # track.mp3 / track.wav / track.flac
  │       │   ├── lyrics/                # track.lrc (o track.json fuente de Whisper)
  │       │   └── assets/                # Imágenes, videos B-roll, SVGs
  │       ├── generated/                 # CACHÉ DERIVADA REGENERABLE (Consumida por React)
  │       │   ├── audio-analysis.json    # FFT, bajos y ritmos por frame + _meta
  │       │   └── lyrics.json            # Letra palabra por palabra normalizada + _meta
  │       └── exports/                   # Videos MP4 renderizados
  ├── src/
  │   ├── compositions/                  # Composiciones de Remotion
  │   │   ├── MainComposition.tsx        # Composición vertical principal
  │   │   ├── KineticSubtitles.tsx       # Subtítulos cinéticos karaoke
  │   │   └── AudioWaveform2D.tsx        # Elementos 2D reactivos al sonido
  │   ├── audio/                         # Algoritmos de análisis FFT y ritmos
  │   ├── lrc/                           # Parser y validador de Enhanced LRC
  │   ├── Root.tsx                       # Registro de composiciones Remotion
  │   └── index.ts                       # Punto de entrada
  └── scripts/
      ├── prepare-project.ts             # Script 'npm run prepare'
      └── render-video.ts                # Script 'npm run render'
```

### 2.1 Manifiesto de Configuración del Proyecto (`config.json`)

```json
{
  "title": "Promo Lanzamiento Single",
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "durationInFrames": 900,
  "theme": {
    "primaryColor": "#FFE600",
    "secondaryColor": "#FF0055",
    "backgroundColor": "#0A0A0A",
    "fontFamily": "Inter, Montserrat, sans-serif"
  },
  "layers": {
    "showSubtitles": true,
    "showWaveform": true,
    "showParticles": true,
    "enable3D": false
  }
}
```

---

## 3. Ingesta de Audio y Sistema de Subtítulos Cinéticos

### 3.1 Soporte Universal de Audio y FFT Offline (`generated/audio-analysis.json`)

Para evitar cuellos de botella y desfases durante la previsualización y el render, el audio se procesa **offline** antes de entrar a React:

1. **Formatos Soportados:** Obligatoriamente **MP3**, **WAV** y **FLAC**, además de cualquier contenedor legible por FFmpeg ubicado en `sources/audio/`.
2. **Decodificación:** FFmpeg extrae un stream PCM WAV estandarizado (44.1 kHz, 16-bit, mono/estéreo).
3. **Análisis Espectral:** Un algoritmo en Node.js segmenta el audio en ventanas correspondientes exactamente a $\frac{1}{\text{FPS}}$ segundos ($\approx 33.3\text{ ms}$ a 30 FPS).
4. **Métricas Extraídas por Cuadro:**
   * `rms`: Nivel general de energía/volumen ($0.0 - 1.0$).
   * `bass`: Energía en frecuencias bajas ($20 - 250\text{ Hz}$).
   * `mid`: Energía en frecuencias medias ($250 - 4000\text{ Hz}$).
   * `treble`: Energía en agudos ($4000 - 20000\text{ Hz}$).
   * `isBeat`: Booleano calculado mediante detección de transitorios de energía.

Acceder a las métricas del sonido dentro de cualquier componente React se reduce a una consulta instantánea $O(1)$:

```tsx
import { useCurrentFrame } from "remotion";

export const AudioPulse: React.FC<{ analysis: AudioAnalysisData }> = ({ analysis }) => {
  const frame = useCurrentFrame();
  const current = analysis.frames[frame] || { bass: 0, isBeat: false };

  return (
    <div
      style={{
        transform: `scale(${1 + current.bass * 0.3})`,
        filter: current.isBeat ? "drop-shadow(0 0 25px #FF0055)" : "none",
        transition: "transform 0.05s ease-out",
      }}
    />
  );
};
```

---

### 3.2 Trazabilidad de Letras, Parsing y Metadatos (`generated/lyrics.json`)

Para mantener retrocompatibilidad, trazabilidad y permitir migraciones futuras, todo archivo generado en `generated/` incluye un bloque de metadatos `_meta`.

#### Flujo de Ingesta de Letras:
1. **Si el insumo es `.lrc` (`sources/lyrics/*.lrc`):**
   El conversor parsea las etiquetas `[mm:ss.xx] <mm:ss.xx> palabra`, calcula los intervalos `startMs` y `endMs`, valida solapamientos y escribe el resultado en `generated/lyrics.json`.
2. **Si el insumo ya es `.json` (`sources/lyrics/*.json`):**
   Si la fuente proviene de un modelo externo (ej. Whisper o transcripción automática), `prepare` valida su esquema y lo normaliza a `generated/lyrics.json`.

#### Estructura con Metadatos (`generated/lyrics.json`):
```json
{
  "_meta": {
    "generator": "webmov",
    "version": "1.0.0",
    "generatedAt": "2026-09-30T18:15:00.000Z",
    "sourceFile": "sources/lyrics/track.lrc",
    "sourceHash": "a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890"
  },
  "lines": [
    {
      "id": "line-1",
      "startMs": 1250,
      "endMs": 4100,
      "text": "Creando contenido programático",
      "words": [
        { "text": "Creando", "startMs": 1250, "endMs": 1720 },
        { "text": "contenido", "startMs": 1720, "endMs": 2350 },
        { "text": "programático", "startMs": 2350, "endMs": 4100 }
      ]
    }
  ]
}
```

---

## 4. Estrategia Visual Progresiva

El desarrollo visual se organiza en dos fases para garantizar estabilidad inmediata:

### Fase 1 (Prioridad Actual: Tipografía Cinética y Reactividad 2D)
* **Subtítulos palabra por palabra (Karaoke):** Resaltado activo milisegundo a milisegundo con efectos de escala y colorimetría dinámica.
* **Componentes 2D reactivos:** Barras de espectro, ondas sonoras, halos de brillo (glow) y fondos pulsantes impulsados por `audio-analysis.json`.
* **Capas de medios B-roll:** Fondos en video o imágenes estáticas integrados con `<OffthreadVideo />` y `<Img />` de Remotion.

### Fase 2 (Siguiente Iteración: WebGL y Three.js Determinista)
* Integración de `@react-three/fiber` desactivando el reloj en tiempo real (`frameloop="never"`).
* Renderizado forzado cuadro a cuadro gobernado estrictamente por `useCurrentFrame()`.

---

## 5. Pipeline de Codificación y Perfiles FFmpeg

El renderizado final se orquesta a través de **`@remotion/renderer`**, aprovechando su gestión automática de pestañas de Chromium, concurrencia y reciclaje de memoria, mientras se inyectan argumentos personalizados de FFmpeg vía `overrideFfmpegArgs`.

```
                    [ Chromium Headless (Captura de Cuadros) ]
                                       │
                                       ▼
                       @remotion/renderer (renderMedia)
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
       [ PERFIL A: TIKTOK / REELS ]                  [ PERFIL B: WHATSAPP LITE ]
       • Resolución: 1080x1920 (9:16)                • Resolución: 1080x1920 (9:16)
       • FPS: 30                                     • FPS: 30
       • Bitrate: 10 Mbps (VBR)                      • Bitrate: 2.8 Mbps
       • Maxrate: 12 Mbps / Buf: 15 Mbps             • Maxrate: 3.2 Mbps / Buf: 4 Mbps
       • GOP: 60 frames cerrado (2s)                 • GOP: 30 frames cerrado (1s)
       • VUI: Rec. 709 / Limited Range               • VUI: Rec. 709 / Limited Range
       • H.264 High Profile 4.2                      • H.264 Main Profile 4.0
       • Audio: AAC 192 kbps estéreo                 • Audio: AAC 128 kbps estéreo
       • Objetivo: Nitidez máxima sin recompresión   • Objetivo: Archivo ligero (< 16 MB)
```

### 5.1 Implementación de `overrideFfmpegArgs`

```typescript
export function getFfmpegArgsForProfile(profile: "tiktok" | "whatsapp", useGpu: boolean): string[] {
  const commonVui = [
    "-color_primaries", "bt709",
    "-color_trc", "bt709",
    "-colorspace", "bt709",
    "-color_range", "tv",
  ];

  if (profile === "tiktok") {
    const videoCodecArgs = useGpu
      ? ["-c:v", "h264_nvenc", "-preset", "p6", "-tune", "hq"]
      : ["-c:v", "libx264", "-preset", "slow"];

    return [
      ...videoCodecArgs,
      "-profile:v", "high",
      "-level:v", "4.2",
      "-b:v", "10M",
      "-maxrate", "12M",
      "-bufsize", "15M",
      "-g", "60",
      "-keyint_min", "30",
      "-sc_threshold", "0",
      "-movflags", "+faststart",
      ...commonVui,
    ];
  }

  // Perfil WhatsApp Lite
  return [
    "-c:v", "libx264",
    "-preset", "medium",
    "-profile:v", "main",
    "-level:v", "4.0",
    "-b:v", "2800k",
    "-maxrate", "3200k",
    "-bufsize", "4000k",
    "-g", "30",
    "-keyint_min", "30",
    "-sc_threshold", "0",
    "-movflags", "+faststart",
    ...commonVui,
  ];
}
```

---

## 6. Comandos del Flujo de Trabajo

| Comando | Función |
| :--- | :--- |
| `npm run prepare -- --project <nombre>` | Procesa audio (MP3, WAV, FLAC) a FFT/ritmos y parsea LRC a JSON. |
| `npm run start` | Abre **Remotion Studio** con scrubber interactivo y previsualización. |
| `npm run render -- --project <nombre> --profile tiktok` | Renderiza video maestro para TikTok / Instagram Reels. |
| `npm run render -- --project <nombre> --profile whatsapp` | Renderiza video ligero (<16 MB) para WhatsApp. |
| `npm run render -- --project <nombre> --gpu` | Renderiza acelerado por GPU NVIDIA NVENC. |