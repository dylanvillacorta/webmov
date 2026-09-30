# WebMov: Pipeline de Ejecución y Ciclo de Vida Operativo

Este documento describe a **alto nivel** el ciclo de vida de ejecución, el flujo de datos y las reglas operativas de caché de **WebMov**. 

> [!NOTE]
> **Principio de Fuente Única de Verdad (SSOT):**
> Este documento se enfoca exclusivamente en la **orquestación visual del flujo**. Las especificaciones técnicas de bajo nivel (esquemas JSON de `_meta`, tipos TypeScript, perfiles de compresión y parámetros FFmpeg) residen únicamente en [**ARCHITECTURE.md**](./ARCHITECTURE.md).

---

## 1. Diagrama de Flujo Global de Extremo a Extremo

```mermaid
flowchart TD
    subgraph S1["1. Fuentes Inmutables (sources/ + config.json)"]
        direction TB
        A1["sources/audio/ (MP3, WAV, FLAC)"]
        A2["sources/lyrics/ (*.lrc, *.json)"]
        A3["sources/assets/ (B-roll, Imágenes)"]
        A4["config.json (Estilos, Tracks, Layout)"]
    end

    subgraph S2["2. Ingesta y Caché Inteligente (npm run prepare)"]
        direction TB
        B1{"¿audio-analysis.json al día?<br/>(Verifica SHA-256 en _meta)"}
        B2["FFmpeg + FFT Offline<br/>Segmentación en ventanas de 1/30s"]
        B3["⚡ SKIP Audio FFT"]

        B4{"¿Pistas en lyrics/*.json al día?<br/>(Verifica SHA-256 por archivo)"}
        B5["Parser Enhanced LRC / JSON<br/>Validación temporal por palabra"]
        B6["⚡ SKIP Pistas no modificadas"]

        B7["generated/ (Caché derivada para React)"]
    end

    subgraph S3["3. Composición en Vivo (npm run start)"]
        direction TB
        C1["Remotion Studio (30 FPS)"]
        C2["MainComposition.tsx (useCurrentFrame)"]
        C3["Gráficos 2D Reactivos (O(1) a FFT)"]
        C4["Subtítulos Multi-Pista Concurrentes"]
    end

    subgraph S4["4. Exportación Final (npm run render)"]
        direction TB
        D1["profile-resolver.ts (Preset + Overrides)"]
        D2["Chromium Headless (Captura cuadro a cuadro)"]
        D3["FFmpeg Pipe (Inyección Rec. 709 + GOP estricto)"]
        D4["Video MP4 Optimizado (projects/exports/)"]
    end

    %% Relaciones de Flujo
    A1 --> B1
    B1 -- "No o --force" --> B2 --> B7
    B1 -- "Sí (Cache Hit)" --> B3 --> B7

    A2 --> B4
    B4 -- "No o --force" --> B5 --> B7
    B4 -- "Sí (Cache Hit)" --> B6 --> B7

    B7 --> C1
    A4 --> C1
    A3 --> C1
    C1 --> C2 --> C3
    C2 --> C4

    B7 --> D1
    A4 --> D1
    D1 --> D2 --> D3 --> D4

    style S1 fill:#1e293b,stroke:#475569,stroke-width:2px,color:#fff
    style S2 fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff
    style S3 fill:#14532d,stroke:#22c55e,stroke-width:2px,color:#fff
    style S4 fill:#4c0519,stroke:#e11d48,stroke-width:2px,color:#fff
```

---

## 2. Etapa 1: Ingesta Incremental Granular (`npm run prepare`)

El comando `prepare` actúa como un filtro inteligente: transforma insumos humanos en datos estructurados de alta velocidad, evitando cálculos redundantes mediante verificación de hashes criptográficos.

```mermaid
flowchart TD
    Start["npm run prepare -- --project <nombre>"] --> AudioCheck{"¿Audio modificado?<br/>hash(sources/audio) !== _meta.sourceHash"}
    
    AudioCheck -- "SÍ (o flag --force)" --> RunAudio["Decodificación FFmpeg + FFT Meyda<br/>Escribe generated/audio-analysis.json"]
    AudioCheck -- "NO" --> SkipAudio["⚡ SKIP: Mantener audio-analysis.json"]

    RunAudio --> LyricsScan["Escanear fuentes en sources/lyrics/"]
    SkipAudio --> LyricsScan

    LyricsScan --> TrackLoop["Iterar sobre cada pista detectada (.lrc / .json)"]
    
    TrackLoop --> TrackCheck{"¿Pista modificada?<br/>hash(pista) !== _meta.sourceHash"}
    TrackCheck -- "SÍ (o flag --force)" --> RunTrack["Parser Enhanced LRC / JSON<br/>Escribe generated/lyrics/trackId.json"]
    TrackCheck -- "NO" --> SkipTrack["⚡ SKIP: Pista sin cambios"]

    RunTrack --> Done["Fin de Preparación (Reporte en Consola)"]
    SkipTrack --> Done

    style SkipAudio fill:#065f46,color:#fff
    style SkipTrack fill:#065f46,color:#fff
```

### Reglas de Caché y Omisión:
* **Caché Hit Total:** Si nada cambió en `sources/`, el script concluye en milisegundos sin consumir CPU.
* **Caché Hit Parcial:** Si solo se ajusta un archivo de letras secundario (ej. `backing.lrc`), se omite la decodificación de audio y las demás pistas, procesando exclusivamente el archivo modificado.
* **Sobreescritura forzada:** La bandera `--force` invalida todos los hashes y fuerza la recomputación completa.

---

## 3. Etapa 2: Composición Cuadro a Cuadro en React (`npm run start`)

Remotion desacopla la reproducción temporal de los milisegundos del sistema, gobernando la composición estrictamente a través de fotogramas (`useCurrentFrame()`).

```mermaid
flowchart LR
    Frame["Frame Actual: useCurrentFrame()<br/>(0 a N frames @ 30 FPS)"] --> Root["MainComposition.tsx"]

    subgraph RENDER_PARALELO["Capas Visuales Evaluadas por Frame"]
        direction TB
        C1["Capa Fondo<br/>B-roll con blur y escala"]
        C2["Capa Audio Reactiva<br/>Consulta O(1) de RMS y Bass por frame"]
        C3["Capa Letra Principal<br/>KineticSubtitles (trackId: lead)"]
        C4["Capa Letra Secundaria<br/>KineticSubtitles (trackId: backing)"]
        C5["Capa Safe Zone Overlay<br/>Guía visual TikTok / Reels (Conmutable)"]
    end

    Root --> C1
    Root --> C2
    Root --> C3
    Root --> C4
    Root --> C5

    RENDER_PARALELO --> Canvas["Lienzo Remotion Studio (1080x1920)"]
```

* Cada pista de subtítulos es una instancia autónoma de `<KineticSubtitles />` con su propia coordenada $Y$, escala y paleta de color configuradas en `config.json`.
* Ninguna capa de React accede a `sources/`; leen exclusivamente los datos ya normalizados en `generated/`.

---

## 4. Etapa 3: Exportación Headless y Multiplexado (`npm run render`)

```mermaid
flowchart TD
    CLI["npm run render -- --project <nombre> --profile [tiktok|whatsapp]"] --> PreCheck{"¿Existe generated/?"}
    
    PreCheck -- "NO" --> Error["Error: Proyecto no preparado.<br/>Ejecute 'npm run prepare'"]
    PreCheck -- "SÍ" --> Resolver["profile-resolver.ts<br/>(Resuelve Preset + Overrides CLI)"]

    Resolver --> Bundler["@remotion/bundler<br/>Empaqueta la composición React"]
    Bundler --> Renderer["@remotion/renderer (renderMedia)<br/>Abre Chromium Headless"]

    subgraph ENGINE["Canal de Renderizado Determinista"]
        Chromium["Chromium Headless<br/>Captura frames 0..N"] -- "Frames crudos (pipe)" --> FFmpeg["FFmpeg (overrideFfmpegArgs)<br/>Codificación x264/nvenc + GOP + Rec.709"]
    end

    Renderer --> ENGINE
    FFmpeg --> Output["MP4 Final en projects/<nombre>/exports/"]

    style Output fill:#15803d,stroke:#22c55e,stroke-width:2px,color:#fff
    style Error fill:#991b1b,color:#fff
```

---

## 5. Matriz de Estados de Ejecución

| Escenario del Desarrollador | ¿Requiere `prepare`? | ¿Qué ejecuta internamente? | Comando sugerido |
| :--- | :--- | :--- | :--- |
| **Proyecto nuevo o recién clonado** | **Obligatorio** | Decodificación audio FFT + Parsing de todas las pistas de letras | `npm run prepare -- --project <nombre>` |
| **Continuar diseño visual existente** | **No** (Se salta por completo) | Abre directamente Remotion Studio consumiendo la caché existente | `npm run start` |
| **Edición de un archivo de letra (`.lrc`)** | **Recomendado** | Omite audio FFT; procesa únicamente la pista modificada (<100ms) | `npm run prepare -- --project <nombre>` |
| **Cambio de archivo de audio (`.mp3`/`.wav`)**| **Recomendado** | Recalcula audio FFT; omite parsing de letras | `npm run prepare -- --project <nombre>` |
| **Exportación final directa** | **No** (si `generated/` está al día)| Empaqueta headless, renderiza cuadros e inyecta perfiles FFmpeg | `npm run render -- --project <nombre> --profile tiktok` |
| **Forzar recomputación absoluta** | Manual | Invalida todas las cachés y recalcula todo desde cero | `npm run prepare -- --project <nombre> --force` |

---

## 6. Referencias Complementarias

* Para la especificación de tipos, metadatos `_meta` y tablas de perfiles de codificación, consulta [**ARCHITECTURE.md**](./ARCHITECTURE.md).
* Para el seguimiento de fases de implementación y criterios de aceptación, consulta [**ROADMAP.md**](./ROADMAP.md).
