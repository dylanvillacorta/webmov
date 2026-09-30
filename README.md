# WebMov 🎬

> Pipeline programático de generación y renderizado de video vertical para redes sociales (TikTok, Reels, WhatsApp) construido con **React**, **Remotion**, **Three.js** y **FFmpeg**.

---

## 📌 Visión General

**WebMov** es una aplicación de escritorio diseñada para crear, previsualizar en tiempo real de forma determinista y renderizar videos automatizados en formato vertical (9:16 - 1080x1920) listos para redes sociales.

### Características Principales

* 🎯 **Renderizado Cuadro a Cuadro Determinista:** Desacoplamiento total de los loops en tiempo real en WebGL/Three.js y Canvas para garantizar idéntico resultado en preview y exportación final.
* 🎵 **Sincronización Rítmica y Subtítulos Cinéticos:**
  * Ingesta de archivos Enhanced LRC (`.lrc`) con marcas palabra por palabra.
  * Análisis de audio offline precalculado (`audio-analysis.json`) con detección de transitorios, ritmos (beats) y bandas espectrales (Bass, Mid, Treble, RMS) sin sobrecargar el hilo de renderizado.
* ⚡ **Pipeline de Exportación con FFmpeg:**
  * **Master TikTok / Instagram Reels:** Perfil de alta fidelidad H.264 (10 Mbps VBR, GOP cerrado de 60 frames, colorimetría Rec. 709). Soporte para CPU (`libx264`) y aceleración por GPU (`h264_nvenc`).
  * **WhatsApp Lite:** Perfil ligero (< 16 MB, 2.8 Mbps, GOP 30 frames) diseñado para evitar la compresión destructiva en estados y chats.
* 💾 **Persistencia por Workspaces Locales:** Arquitectura basada en carpetas aisladas por proyecto (`project.json`, audio, letras, assets y exports) para pausar y reanudar proyectos en cualquier momento.

---

## 📖 Arquitectura y Especificación Técnica

Para detalles exhaustivos sobre la infraestructura local, esquema de datos, componentes de sincronización y comandos de codificación, consulta la documentación principal:

👉 [**ARCHITECTURE.md**](./ARCHITECTURE.md)

---

## 🗺️ Hoja de Ruta (Roadmap)

- [x] Especificación de arquitectura y pipeline de renderizado.
- [ ] Inicialización del entorno de desarrollo (Node.js, TypeScript, Remotion, UI Framework).
- [ ] Definición del wrapper de escritorio (Electron vs. Tauri + sidecar).
- [ ] Módulo analizador de audio offline (extracción FFT y onsets).
- [ ] Parser y validador de Enhanced LRC a JSON estándar.
- [ ] Componente visual de subtítulos dinámicos / karaoke.
- [ ] Integración de capas 3D deterministas con `@react-three/fiber`.
- [ ] Orquestador de exportación con FFmpeg local.
