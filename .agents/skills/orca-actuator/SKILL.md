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

### Paso 1: Crear el Workspace para la Feature
* Toda rama se deriva desde la rama base de integración del proyecto (`develop`, o `main` según la convención del repositorio).
* Comando:
  ```powershell
  orca worktree create --name feature/<nombre-tarea> --base-branch <base-branch> --no-parent --json
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

* El agente de testing escribe la suite de pruebas, ejecuta el runner de tests del proyecto (`npm test`, `pytest`, `cargo test`, etc.), y si detecta fallos, **los corrige de inmediato sobre el código fuente local**.

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

1. **Localidad de Contexto:** Nunca separar el testing de la codificación en ramas diferentes para una misma funcionalidad. Deben convivir en el mismo workspace para evitar sobrecostos de sincronización y merge.
2. **Un Solo Agente Central:** La sesión principal es la única que planifica, crea worktrees y orquesta la integración a la rama base.
3. **Límite de Concurrencia:** Máximo 2 o 3 workspaces paralelos activos al mismo tiempo para no saturar memoria RAM ni causar colisiones de puertos en dev servers.
