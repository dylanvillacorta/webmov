---
name: github-actuator
description: Use this skill whenever interacting with Git or GitHub (checking status, diffs, syncing branches with fetch/pull, staging/committing/pushing code, and enforcing branch hierarchy and PR workflow).
---

# GitHub Actuator & Git Workflow

Protocolo estándar para operaciones de Git seguras, limpias y bajo control total del desarrollador en este proyecto, basado en la jerarquía estricta **`feature/*` ➔ `develop` ➔ `main`**.

---

## 🛑 Reglas Inquebrantables

1. **Confirmación Explícita Obligatoria:**
   - **NUNCA** ejecutar `git commit` ni `git push` de manera automática, intermedia o sin aprobación.
   - Solo al final de la tarea, presentar el resumen previo (`git status -s`, `git diff --stat`) y esperar la aprobación explícita del usuario en el chat.
2. **Jerarquía Estricta de Ramas y Prohibición de Push Directo:**
   - **`main` (Producción):** Queda estrictamente prohibido hacer push directo o mergear features directamente a `main`. Solo recibe cambios desde `develop` mediante **Pull Request** cuando exista una versión funcional y testeada.
   - **`develop` (Integración):** Rama base activa para el desarrollo. Avanza recibiendo Pull Requests desde ramas de características o correcciones.
   - **`feature/*`, `fix/*` (Trabajo Aislado):** Toda rama de desarrollo debe nacer obligatoriamente de `origin/develop`.
3. **Prohibición de Push Forzado:** `git push --force` / `-f` queda estrictamente prohibido salvo orden explícita del usuario.
4. **Higiene de Commits:** Cero secretos (`.env`, tokens, llaves) ni artefactos compilados/temporales en el commit.
5. **Mensajes Estándar:** Usar *Conventional Commits* (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`).

---

## 🗺️ Jerarquía de Ramas y Flujo de Integración

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔴 RAMA `main` (Producción / Versión Estable)                               │
│ - SOLO recibe cambios desde `develop` mediante Pull Request formal.         │
│ - Protegida contra push directo y merges de features individuales.          │
│ - Representa siempre una versión funcional y testeada.                      │
└──────────────────────────────────────▲──────────────────────────────────────┘
                                       │ Pull Request (Release / Milestone)
┌──────────────────────────────────────┴──────────────────────────────────────┐
│ 🟡 RAMA `develop` (Integración de Desarrollo Activa)                        │
│ - Rama base para todo el equipo y para el Agente Coordinador.               │
│ - Avanza recibiendo Pull Requests desde las ramas de features.              │
└──────────────────────────────────────▲──────────────────────────────────────┘
                                       │ Pull Request (Feature completada y testeada)
         ┌─────────────────────────────┴─────────────────────────────┐
         │                                                           │
┌───────────────────────────┐                               ┌───────────────────────────┐
│ 🟢 RAMA `feature/modulo-a` │                               │ 🟢 RAMA `feature/modulo-b` │
│ (Workspace 1 en Orca)     │                               │ (Workspace 2 en Orca)     │
│ - Nace de: origin/develop │                               │ - Nace de: origin/develop │
│ - Code + Test in situ     │                               │ - Code + Test in situ     │
└───────────────────────────┘                               └───────────────────────────┘
```

---

## 🔄 Flujo 1: Sincronización Segura y Rápida (Soft Sync)

Para sincronizar la rama `develop` de forma automática, no destructiva y eficiente en tokens:

```powershell
# Sincronización automática de develop (PowerShell):
powershell -ExecutionPolicy Bypass -File scripts/sync-develop.ps1

# O en Bash:
./scripts/sync-develop.sh
```

**Comportamiento del script:**
1. Protege archivos locales: si detecta cambios sin commitear, aborta sin tocar nada.
2. Consulta `origin/develop`: si ya está al día, responde en milisegundos (`[sync] Rama 'develop' 100% al dia`).
3. Si hay novedades del remoto y no hay cambios locales divergentes, ejecuta un `git pull --ff-only` automático y reporta los commits integrados.
4. Si detecta divergencia, emite advertencia para intervención manual sin romper el árbol.

> *Equivalente manual paso a paso:*
> ```bash
> git fetch origin --prune
> git pull --ff-only origin develop
> ```


---

## 🌿 Flujo 2: Creación de Ramas de Trabajo (Vía Orca Worktrees)

Toda nueva tarea, feature o fix debe instanciarse **aislada en su propio worktree**, derivada de `origin/develop`, protegiendo el workspace raíz:

```powershell
# En el workspace raíz (Agente Coordinador):
orca worktree create --name feature/<nombre-descriptivo> --base-branch origin/develop --no-parent --json
```

> **IMPORTANTE:** Nunca ejecutar `git checkout -b` en el workspace raíz de `develop`. El directorio raíz debe permanecer intacto en `develop` para actuar como nodo coordinador. Toda modificación de archivos se realiza en el path asignado al worktree independiente.


---

## 📝 Flujo 3: Commit & Push (Fase Final de Tarea)

### Paso 1: Inspeccionar y Reportar al Chat
```bash
git status -s
git diff --stat
```
Presentar al usuario:
- Lista de archivos modificados/creados.
- Resumen breve de los cambios implementados.
- Mensaje de commit propuesto bajo *Conventional Commits*.
- **Solicitud de aprobación** (ej. *«¿Deseas que proceda con este commit y push?»*).

### Paso 2: Ejecutar (Solo tras confirmación explícita)
```bash
git add <archivos-específicos>
git commit -m "<tipo>(<alcance>): <descripción concisa>"
git push -u origin <rama-actual>
```

---

## 🔀 Flujo 4: Integración vía Pull Request

1. **De `feature/*` a `develop`:**
   * Una vez completada y testeada la funcionalidad en su workspace correspondiente, se abre un Pull Request hacia la rama `develop`.
   * Tras la revisión e integración del PR, la rama `feature/*` se puede archivar o eliminar.

2. **De `develop` a `main`:**
   * Cuando un conjunto de features en `develop` conforma un hito o versión funcional comprobada, se abre un Pull Request de `develop` hacia `main`.
   * `main` nunca recibe commits individuales directamente.
