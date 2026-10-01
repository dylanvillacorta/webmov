---
name: orca-actuator
description: Protocolo para orquestar workspaces y agentes paralelos en Orca IDE con Antigravity CLI, usando el modelo Feature Lifecycle (Codificación con Flash Low y Testing con Flash High en el mismo workspace).
---

# Orca Actuator & Parallel Agent Workflow

Protocolo estándar para operar como **Agente Coordinador Central** y desplegar workspaces paralelos en Orca IDE bajo el modelo **Feature Lifecycle**, utilizando **Antigravity CLI** (`agy`) y la familia **Gemini 3.8 Flash**.

---

## 🎯 Arquitectura: Feature Lifecycle y Paralelismo Horizontal

El paralelismo en Orca se organiza **por tarea o feature independiente**, no fragmentando el testing del código. En cada workspace coexisten la codificación y la verificación inmediata:

```
                           AGENTE COORDINADOR CENTRAL
                       (Workspace Raíz: develop - Flash High)
                                       │
         ┌─────────────────────────────┴─────────────────────────────┐
         ▼                                                           ▼
┌─────────────────────────────────────────┐ ┌─────────────────────────────────────────┐
│ WORKSPACE: feature/audio-processing     │ │ WORKSPACE: feature/lyrics-parser        │
│ (Rama aislada: feature/audio-processing)│ │ (Rama aislada: feature/lyrics-parser)   │
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
                       e integra hacia origin/develop
```

---

## 🧠 Matriz de Modelos y Esfuerzo (Gemini 3.8 Flash Stack)

| Etapa del Ciclo de Vida | Dónde se Ejecuta | Modelo (`--model`) | Esfuerzo (`--effort`) | Propósito |
| :--- | :--- | :--- | :--- | :--- |
| **1. Planificación & Arquitectura** | Workspace Raíz (`develop`) | `gemini-3.8-flash-high` | `high` | Diseñar interfaces, contratos y desglosar tareas del roadmap. |
| **2. Codificación & Scaffolding** | Workspace de la Feature | `gemini-3.8-flash-low` *(o `medium`)* | `low` | Escribir componentes, tipos y lógica con máxima velocidad. |
| **3. Testing, QA & Corrección** | **Mismo Workspace de la Feature** | `gemini-3.8-flash-high` | `high` | Diseñar tests exhaustivos, validar ejecución y corregir bugs in situ. |

---

## 🔄 Ciclo de Vida de una Feature en Orca

### Paso 1: Crear el Workspace para la Feature
* Toda rama se deriva obligatoriamente desde `origin/develop`.
* Comando:
  ```powershell
  orca worktree create --name feature/<nombre-tarea> --base-branch develop --no-parent --json
  ```

### Paso 2: Ejecutar la Codificación (Flash Low)
Se levanta una terminal interactiva en el workspace con el modelo rápido:

```powershell
orca terminal create --worktree name:feature/<nombre-tarea> --title "Code" --command "agy -i '<instrucciones_de_codigo>' --model gemini-3.8-flash-low --effort low --dangerously-skip-permissions" --focus --json
```

### Paso 3: Ejecutar el Testing y Validación (Flash High) en el Mismo Workspace
Una vez que el código base está listo, en ese **mismo workspace** (aprovechando los archivos locales, dependencias y contexto), se despacha la fase de testing con esfuerzo alto:

```powershell
orca terminal create --worktree name:feature/<nombre-tarea> --title "QA-Testing" --command "agy -i '<instrucciones_de_testing_y_correccion>' --model gemini-3.8-flash-high --effort high --dangerously-skip-permissions" --focus --json
```

* El agente de testing escribe la suite de pruebas, ejecuta `npm test` o el runner correspondiente, y si detecta fallos, **los corrige de inmediato sobre el código fuente local**.

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
   * Revisa el diff (`git diff develop...feature/<nombre-tarea>`).
   * Sigue el protocolo de [github-actuator](../github-actuator/SKILL.md) para solicitar aprobación del usuario e integrar a `develop`.

---

## 🛑 Reglas de Seguridad y Coordinación

1. **Localidad de Contexto:** Nunca separar el testing de la codificación en ramas diferentes para una misma funcionalidad. Deben convivir en el mismo workspace para evitar sobrecostos de sincronización y merge.
2. **Un Solo Agente Central:** La sesión principal es la única que planifica, crea worktrees y orquesta la integración a `develop`.
3. **Límite de Concurrencia:** Máximo 2 o 3 workspaces paralelos activos al mismo tiempo para no saturar memoria RAM ni causar colisiones de puertos en dev servers.
