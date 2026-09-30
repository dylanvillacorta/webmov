# Directrices para Agentes de IA (AGENTS.md)

Este repositorio contiene **WebMov**, un pipeline programático de generación de video vertical (9:16) para redes sociales construido con **React**, **Remotion** y **FFmpeg**.

---

## 🎯 Reglas Fundamentales

1. **Principio de Fuente Única de Verdad (SSOT):**
   * Los insumos humanos/externos residen en `projects/<nombre>/sources/` (audio, letras `.lrc` o `.json`, assets).
   * La carpeta `projects/<nombre>/generated/` es una **caché efímera y derivada** creada exclusivamente por `npm run prepare`.
   * **Nunca** hagas que los componentes de React lean directamente de `sources/`. React consume exclusivamente `generated/`.
   * **Nunca** edites manualmente archivos en `generated/`. Las correcciones se realizan en `sources/` y se reejecuta `prepare`.

2. **Determinismo Estricto Cuadro a Cuadro:**
   * En Remotion el tiempo se mide en **cuadros (frames)**, no en segundos ni tiempo real.
   * Utiliza siempre `useCurrentFrame()` y `useVideoConfig()`.
   * Prohibido el uso de `Date.now()`, `performance.now()`, `requestAnimationFrame` o números aleatorios sin semilla dentro de las composiciones de video.

3. **Flujo de Comandos:**
   * `npm run prepare -- --project <nombre>`: Procesa audio (MP3/WAV/FLAC) a FFT/ritmos y normaliza letras a `generated/`.
   * `npm run start`: Lanza **Remotion Studio** para desarrollo visual y previsualización interactiva.
   * `npm run render -- --project <nombre> --profile [tiktok|whatsapp]`: Renderiza con `@remotion/renderer` inyectando perfiles FFmpeg.

---

## 📚 Documentación de Referencia

* Consulta [ARCHITECTURE.md](./ARCHITECTURE.md) para detalles exhaustivos de esquemas (`_meta`), perfiles FFmpeg y arquitectura.
* Consulta [README.md](./README.md) para visión general del proyecto.
