---
name: orca-actuator
description: Protocolo para orquestar workspaces y agentes paralelos en Orca IDE con Antigravity CLI, usando el modelo Feature Lifecycle (Codificación con Flash Low y Testing con Flash High en el mismo workspace).
---

# Orca Actuator & Parallel Agent Workflow

Protocolo agnóstico y reutilizable para operar como **Agente Coordinador Central** y desplegar workspaces paralelos en Orca IDE bajo el modelo **Feature Lifecycle**, utilizando **Antigravity CLI** (`agy`) y la familia **Gemini 3.8 Flash**.

---

## 🎯 Arquitectura: Feature Lifecycle y Paralelismo Horizontal

El paralelismo en Orca se organiza **por tarea o feature independiente**, no fragmentando el testing del código. En cada workspace coexisten la codificación y la verificación inmediata:

```
                           AGENTE COORDINADOR CENTRAL
                       (Workspace Raíz: Rama Base - Flash High)
                                       │
         ┌─────────────────────────────┴─────────────────────────────┐
         ▼                                                           ▼
┌─────────────────────────────────────────┐ ┌─────────────────────────────────────────┐
│ WORKSPACE: feature/modulo-a             │ │ WORKSPACE: feature/modulo-b             │
│ (Rama aislada: feature/modulo-a)        │ │ (Rama aislada: feature/modulo-b)        │
│                                         │ │                                         │
│  Fase 1: Codificación                   │ │  Fase 1: Codificación                   │
│  - Modelo: Gemini 3.8 Flash Low         │ │  - Modelo: Gemini 3.8 Flash Low         │
│  - Scaffolding y lógica rápida          │ │  - Scaffolding y lógica rápida          │
│                                         │ │                                         │
│  Fase 2: Testing & QA (Mismo workspace) │ │  Fase 2: Testing & QA (Mismo workspace) │
│  - Modelo: Gemini 3.8 Flash High        │ │  - Modelo: Gemini 3.8 Flash High        │
│  - Tests unitarios y corrección in situ │ │  - Tests unitarios y corrección in situ │
└─────────────────────────────────────────┘ └─────────────────────────────────────────┘
         │                                                           │
         └─────────────────────────────┬─────────────────────────────┘
                                       ▼
                       Coordinador inspecciona diffs
                       e integra hacia la rama base
```

---

## 🧠 Matriz de Modelos y Esfuerzo (Gemini 3.8 Flash Stack)

| Etapa del Ciclo de Vida | Dónde se Ejecuta | Modelo (`--model`) | Esfuerzo (`--effort`) | Propósito |
| :--- | :--- | :--- | :--- | :--- |
| **1. Planificación & Arquitectura** | Workspace Raíz (Rama Base) | `gemini-3.8-flash-high` | `high` | Diseñar interfaces, contratos y desglosar tareas del roadmap. |
| **2. Codificación & Scaffolding** | Workspace de la Feature | `gemini-3.8-flash-low` *(o `medium`)* | `low` | Escribir componentes, tipos y lógica con máxima velocidad. |
| **3. Testing, QA & Corrección** | **Mismo Workspace de la Feature** | `gemini-3.8-flash-high` | `high` | Diseñar tests exhaustivos, validar ejecución y corregir bugs in situ. |

---

## 🔄 Ciclo de Vida de una Feature en Orca

### Paso 1: Crear el Workspace y Desplegar el Agente en la Terminal Principal
* Toda rama se deriva desde la rama base de integración del proyecto (`develop`, o `main` según la convención del repositorio).
* **Despliegue Nativo Limpio (Recomendado):** Para evitar terminales vacías ("Terminal 1") o pestañas duplicadas ocultas en Orca, se utiliza el soporte nativo de Orca para lanzar a `antigravity` directamente en la terminal inicial:
  ```powershell
  orca worktree create --name feature/<nombre-tarea> --base-branch <base-branch> --agent antigravity --prompt "<instrucciones_de_codigo>" --no-parent --activate --json
  ```
  * `--agent antigravity`: Lanza Antigravity en la **primera y única terminal** del workspace (`startupTerminal` / `agentTerminalHandle`), mostrando la TUI visual con logo y spinners en vivo inmediatamente.
  * `--activate`: Sitúa la interfaz de Orca automáticamente en el nuevo workspace para que el usuario vea la ejecución gráfica en tiempo real.
  * Del JSON devuelto por Orca, guardar el identificador de la terminal: `result.agentTerminalHandle` (o `result.startupTerminal.handle`).

### Paso 2: Sincronización y Espera de la Fase de Codificación
* El Coordinador Central en la raíz no debe codificar a distancia. Espera la señal de que el agente secundario completó su turno interactivo en la TUI:
  ```powershell
  orca terminal wait --terminal <handle> --for tui-idle
  ```
  *(Si el agente se lanzó con un comando que finaliza el proceso de consola, se puede usar `--for exit`).*

### Paso 3: Ejecutar el Testing y Validación (Flash High) en el Mismo Workspace
Una vez que el código base está listo, en ese **mismo workspace** (aprovechando los archivos locales, dependencias y contexto), se despacha la fase de testing:
* **Opción A (Continuar en la misma terminal interactiva):**
  ```powershell
  orca terminal send --terminal <handle> --text "<instrucciones_de_testing_y_correccion>`n" --json
  orca terminal wait --terminal <handle> --for tui-idle
  ```
* **Opción B (Lanzar sesión dedicada de QA):**
  ```powershell
  orca terminal create --worktree name:feature/<nombre-tarea> --title "QA-Testing" --command "agy -i '<instrucciones_de_testing_y_correccion>' --model gemini-3.8-flash-high --effort high --dangerously-skip-permissions" --focus --json
  orca terminal wait --terminal <handle_qa> --for tui-idle
  ```
* El agente de testing ejecuta el runner de tests del proyecto (`npm test`, `pytest`, `cargo test`, `mvn test`, etc.), y si detecta fallos, **los corrige de inmediato sobre el código fuente local**.

### Paso 4: Cierre del Workspace y Entrega al Coordinador
Cuando la feature pasa todos los tests:
1. **Marcar como completado en Orca:**
   ```powershell
   orca worktree set --worktree name:feature/<nombre-tarea> --workspace-status completed --comment "Feature implementada y probada al 100%" --json
   ```
2. **Cerrar terminales para liberar memoria:**
   ```powershell
   orca terminal close --worktree name:feature/<nombre-tarea> --all --json
   ```
3. **El Coordinador Central revisa los cambios:**
   * Revisa el diff (`git diff <base-branch>...feature/<nombre-tarea>`).
   * Sigue las directrices de Git del proyecto (o `github-actuator` si está disponible) para solicitar aprobación del usuario e integrar a la rama base.

---

## 🛑 Reglas de Seguridad y Coordinación

0. **Inmutabilidad Absoluta del Workspace Raíz (`develop` - Regla Cero):**
   - El workspace raíz es **estrictamente de solo lectura operativa**: reservado únicamente para el Agente Coordinador Central (planificación, orquestación, lectura de documentación, inspección de diffs y merges hacia `develop`).
   - **TERMINANTEMENTE PROHIBIDO** en el workspace raíz:
     - Escribir o modificar archivos de código fuente, configs o assets.
     - Crear archivos `package.json` o ejecutar `npm install` / `npm run`.
     - Crear ramas directas o conmutar de rama (`git checkout -b`) en el directorio raíz.
     - **Modificar archivos de forma remota a través de rutas de worktrees** (ej. editar `~/orca/workspaces/...` desde la raíz). Toda codificación y ejecución debe ser llevada a cabo por el agente desplegado en dicho worktree.
   - **TODA** codificación, scaffolding, instalación de dependencias, scripts y tests debe residir y ejecutarse **exclusivamente dentro de los worktrees independientes** (`orca worktree create`).
1. **Prevención de Terminales Huérfanas y Manejo de Comillas:**
   - Usar preferentemente `orca worktree create ... --agent antigravity --prompt "..."` para que Orca asigne el agente a la terminal inicial (`Terminal 1`). Esto evita crear terminales vacías duplicadas y elimina problemas de truncado o escape de comillas en shells de Windows.
2. **Localidad de Contexto:** Nunca separar el testing de la codificación en ramas diferentes para una misma funcionalidad. Deben convivir en el mismo workspace para evitar sobrecostos de sincronización y merge.
3. **Un Solo Agente Central:** La sesión principal es la única que planifica, crea worktrees y orquesta la integración a la rama base.
4. **Límite de Concurrencia:** Máximo 2 o 3 workspaces paralelos activos al mismo tiempo para no saturar memoria RAM ni causar colisiones de puertos en dev servers.
5. **Ciclo de Scripts en Package.json:** Dado que `prepare` es un hook nativo en npm que se ejecuta automáticamente tras `npm install`, en los nuevos worktrees el script `"prepare"` debe tolerar llamadas sin parámetros (ej. omitiendo si no hay flags) o `npm install` debe ejecutarse con `--ignore-scripts` para evitar fallos antes de que el CLI esté implementado.
6. **Entornos Docker Aislados:** Si el testing de integración o E2E requiere microservicios y bases de datos activas, ejecutar exclusivamente `.\scripts\workspaces\workspace.ps1 up` (basado en `docker-compose.workspace.yml`). Nunca levantar composes tradicionales con puertos fijos de host.
