# WebMov 🎬

> Pipeline programático de generación y renderizado de video vertical para redes sociales (TikTok, Reels, WhatsApp) construido con **React**, **Remotion** y **FFmpeg**.

---

## 📌 Visión General

**WebMov** es un entorno de desarrollo *developer-first* diseñado para crear, previsualizar en tiempo real y renderizar videos automatizados en formato vertical (9:16 - 1080x1920) listos para redes sociales.

### Características Principales

* ⚡ **Enfoque Developer-First con Remotion Studio:** Edición directa en componentes React con timeline interactivo cuadro a cuadro, reproducción de audio sincronizada y ajuste en caliente de propiedades.
* 🎵 **Sincronización Rítmica y Subtítulos Cinéticos (Karaoke):**
  * Ingesta de archivos Enhanced LRC (`.lrc`) con marcas palabra por palabra.
  * Análisis de audio offline precalculado (`audio-analysis.json`) con detección de transitorios, ritmos (beats) y bandas espectrales (Bass, Mid, Treble, RMS) a 30 FPS.
  * Soporte universal de audio: **MP3, WAV y FLAC**.
* 🎨 **Estrategia Visual Progresiva:**
  * **Fase 1:** Tipografía cinética (karaoke palabra por palabra), componentes 2D reactivos al sonido (espectros, ondas, glow) y capas B-roll.
  * **Fase 2:** Capas 3D deterministas con WebGL y Three.js (`frameloop="never"`).
* 🚀 **Pipeline de Exportación con FFmpeg (`@remotion/renderer`):**
  * **Master TikTok / Instagram Reels:** 10 Mbps VBR, GOP cerrado de 60 cuadros, colorimetría Rec. 709. Soporte para CPU (`libx264`) y GPU NVIDIA (`h264_nvenc`).
  * **WhatsApp Lite:** Perfil ligero (< 16 MB, 2.8 Mbps, GOP 30 cuadros) para evitar compresión destructiva en estados y chats.
* 📁 **Estructura Modular por Proyectos:** Organización en carpetas independientes (`projects/<nombre>/`) con su audio, letra, configuración y videos exportados.

---

## 🛠️ Flujo de Trabajo

```bash
# 1. Preparar audio y letras del proyecto (genera audio-analysis.json y lyrics.json)
npm run prepare -- --project promo-single-01

# 2. Abrir Remotion Studio para desarrollo visual interactivo
npm run start

# 3. Exportar video final optimizado para redes
npm run render -- --project promo-single-01 --profile tiktok
npm run render -- --project promo-single-01 --profile whatsapp
```

---

## 📖 Documentación de Arquitectura

Para especificaciones técnicas detalladas, esquemas de datos y parámetros de codificación, consulta:

👉 [**ARCHITECTURE.md**](./planning/ARCHITECTURE.md)
