# WebMov: Funcionalidades Futuras y Backlog Post-MVP

Este documento recopila las capacidades, módulos avanzados y extensiones técnicas planificadas para ser ejecutadas e incorporadas en **iteraciones posteriores**, una vez que el pipeline central (Hitos 1 a 3: ingesta, composición 2D y renderizado FFmpeg) esté completamente consolidado y estabilizado.

---

## 🔮 Funcionalidades para Futuras Iteraciones

### 1. Capa 3D WebGL y Three.js Determinista

* **Objetivo:** Incorporar elementos tridimensionales, shaders reactivos y geometrías procedurales sin comprometer el determinismo cuadro a cuadro ni la estabilidad de memoria de Chromium Headless.
* **Detalles Técnicos:**
  * **Integración desacoplada:** Uso de `@react-three/fiber` y `three`.
  * **Desactivación del reloj en tiempo real:** Configurar obligatoriamente `frameloop="never"` en el componente `<Canvas />` para evitar que `requestAnimationFrame` o el reloj interno del navegador generen desincronización o frames duplicados.
  * **Conductor determinista de cuadros (`FrameDriver`):** Renderizado forzado cuadro a cuadro gobernado estrictamente por `useCurrentFrame()`. En cada frame, se dispara explícitamente `gl.render(scene, camera)`.
  * **Reactividad sonora tridimensional:** Deformación de mallas (vertex displacement), rotación de partículas y cambios de iluminación sincronizados matemáticamente con los valores de `bass`, `rms` e `isBeat` de `audio-analysis.json`.
  * **Activación condicional:** Gobernado por la propiedad `"enable3D": true | false` dentro de `config.json` para que proyectos ligeros no carguen el bundle de Three.js.

---

## 📚 Enlaces de Referencia
* Para la arquitectura del núcleo actual: [**ARCHITECTURE.md**](./ARCHITECTURE.md)
* Para el ciclo de vida y diagramas de ejecución: [**PIPELINE.md**](./PIPELINE.md)
* Para la planificación secuencial por hitos: [**ROADMAP.md**](./ROADMAP.md)
