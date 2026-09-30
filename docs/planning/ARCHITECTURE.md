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

## 5. Pipeline de Codificación y Perfiles FFmpeg Extensibles

El renderizado final se orquesta a través de **`@remotion/renderer`**, aprovechando su gestión automática de pestañas de Chromium, concurrencia y reciclaje de memoria, mientras se inyectan argumentos personalizados de FFmpeg vía `overrideFfmpegArgs`.

### 5.1 Filosofía de Perfiles: Presets Base + Parámetros Sobreescribibles

El sistema **no es rígido**: los perfiles predefinidos (`tiktok`, `whatsapp`) son únicamente **presets de conveniencia** probados para las plataformas más comunes.

El pipeline permite:
1. **Crear perfiles personalizados** en un catálogo declarativo (`encoding-profiles.json`) o dentro del `config.json` de cada proyecto.
2. **Herencia de perfiles:** Extender un perfil base (ej. `tiktok`) y modificar únicamente los valores requeridos (ej. subir bitrate a 16M o forzar un GOP diferente) sin recompilar el proyecto.
3. **Sobreescritura dinámica por CLI:** Pasar cualquier parámetro puntual directamente en la terminal (ej: `--bitrate 15M`, `--crf 18`, `--gop 120`, `--preset fast`).

```
                              [ Preset Base (ej. "tiktok") ]
                                            │
                                            ▼
                 [ Config de Proyecto / Custom Profile (config.json) ]
                                            │
                                            ▼
                    [ Flags de Terminal CLI (--bitrate, --crf) ]
                                            │
                                            ▼
               ┌────────────────────────────────────────────────────────┐
               │ Perfil Resuelto en Caliente (EncodingProfile)          │
               │ • Codec: libx264 / h264_nvenc                          │
               │ • Bitrate / CRF / Preset                               │
               │ • Estructura GOP & VUI (Rec. 709)                      │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
                            @remotion/renderer (renderMedia)
                                  + overrideFfmpegArgs
```

### 5.2 Presets de Referencia Incluidos

| Parámetro | Preset: `tiktok` (Master) | Preset: `whatsapp` (Lite) |
| :--- | :--- | :--- |
| **Resolución** | 1080x1920 (9:16) | 1080x1920 (9:16) |
| **FPS** | 30 | 30 |
| **Bitrate Objetivo** | 10 Mbps (VBR) | 2.8 Mbps |
| **Maxrate / Bufsize** | 12 Mbps / 15 Mbps | 3.2 Mbps / 4 Mbps |
| **GOP (Keyframes)** | 60 frames (2s a 30fps) cerrado | 30 frames (1s a 30fps) cerrado |
| **Colorimetría VUI** | BT.709 / Limited range (`tv`) | BT.709 / Limited range (`tv`) |
| **H.264 Profile / Level** | High / 4.2 | Main / 4.0 |
| **Audio** | AAC 192 kbps estéreo (48 kHz) | AAC 128 kbps estéreo (44.1 kHz) |
| **Propósito** | Máxima nitidez sin recompresión | Peso menor a 16 MB para chats/estados |

---

### 5.3 Esquema Declarativo del Perfil (`EncodingProfile`)

```typescript
export interface EncodingProfile {
  name: string;
  base?: string;                 // Perfil del que hereda (ej. "tiktok")
  useGpu?: boolean;              // true para h264_nvenc, false para libx264
  videoCodec?: string;           // "libx264" | "h264_nvenc" | ...
  preset?: string;               // "slow", "medium", "p6", etc.
  tune?: string;                 // "hq", "film", etc.
  crf?: number;                  // Modo CRF psicovisual (ej. 18 - 23)
  bitrate?: string;              // "10M", "2800k", etc.
  maxrate?: string;              // "12M", etc.
  bufsize?: string;              // "15M", etc.
  gop?: number;                  // Tamaño de grupo de imágenes (frames)
  profile?: string;              // "high", "main", "baseline"
  level?: string;                // "4.2", "4.0", etc.
  audioCodec?: string;           // "aac"
  audioBitrate?: string;         // "192k", "128k"
  colorPrimaries?: string;       // "bt709"
  colorTrc?: string;             // "bt709"
  colorSpace?: string;           // "bt709"
  colorRange?: string;           // "tv"
  customArgs?: string[];         // Flags adicionales libres de FFmpeg
}
```

### 5.4 Inyección Programática (`overrideFfmpegArgs`)

```typescript
export function buildFfmpegArgs(profile: EncodingProfile): string[] {
  const args: string[] = [];

  // 1. Códec y Aceleración
  if (profile.useGpu) {
    args.push("-c:v", "h264_nvenc");
    if (profile.preset) args.push("-preset", profile.preset);
    if (profile.tune) args.push("-tune", profile.tune);
  } else {
    args.push("-c:v", profile.videoCodec || "libx264");
    if (profile.preset) args.push("-preset", profile.preset);
  }

  // 2. Control de Tasa (CRF o Bitrate VBR)
  if (profile.crf !== undefined) {
    args.push("-crf", profile.crf.toString());
  } else if (profile.bitrate) {
    args.push("-b:v", profile.bitrate);
    if (profile.maxrate) args.push("-maxrate", profile.maxrate);
    if (profile.bufsize) args.push("-bufsize", profile.bufsize);
  }

  // 3. Estructura GOP
  if (profile.gop) {
    args.push("-g", profile.gop.toString(), "-keyint_min", Math.floor(profile.gop / 2).toString(), "-sc_threshold", "0");
  }

  // 4. Perfil y Nivel H.264
  if (profile.profile) args.push("-profile:v", profile.profile);
  if (profile.level) args.push("-level:v", profile.level);

  // 5. Metadatos de Colorimetría VUI (Rec. 709)
  args.push(
    "-color_primaries", profile.colorPrimaries || "bt709",
    "-color_trc", profile.colorTrc || "bt709",
    "-colorspace", profile.colorSpace || "bt709",
    "-color_range", profile.colorRange || "tv"
  );

  // 6. Optimización para Streaming Web / Redes
  args.push("-movflags", "+faststart");

  // 7. Flags adicionales personalizados si se definieron
  if (profile.customArgs) {
    args.push(...profile.customArgs);
  }

  return args;
}
```

---

## 6. Comandos del Flujo de Trabajo y Ejemplos de Exportación

| Comando | Función |
| :--- | :--- |
| `npm run prepare -- --project <nombre>` | Procesa audio (MP3, WAV, FLAC) a FFT/ritmos y normaliza letras a `generated/`. |
| `npm run start` | Abre **Remotion Studio** con timeline interactivo y previsualización. |
| `npm run render -- --project <nombre> --profile tiktok` | Renderiza con preset maestro para TikTok / Instagram Reels. |
| `npm run render -- --project <nombre> --profile whatsapp` | Renderiza con preset ligero para WhatsApp. |
| `npm run render -- --project <nombre> --profile custom-profile` | Renderiza usando un perfil personalizado declarado en `config.json`. |
| `npm run render -- --project <nombre> --profile tiktok --bitrate 16M --gop 90` | Hereda del preset TikTok y **sobreescribe parámetros puntuales al vuelo**. |
| `npm run render -- --project <nombre> --gpu` | Habilita aceleración por hardware NVIDIA NVENC. |

---

## 7. Plan de Implementación y Fases

Para consultar el desglose detallado de hitos de desarrollo, tareas específicas y criterios de aceptación verificables:

👉 [**ROADMAP.md**](./ROADMAP.md)