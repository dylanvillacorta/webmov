---
name: github-actuator
description: Use this skill whenever interacting with Git or GitHub (checking status, diffs, syncing branches with fetch/pull, and staging/committing/pushing code with explicit user confirmation).
---

# GitHub Actuator & Git Workflow

Protocolo estándar para operaciones de Git seguras, limpias y bajo control total del desarrollador en este proyecto.

---

## 🛑 Reglas Inquebrantables

1. **Confirmación Explícita Obligatoria:**
   - **NUNCA** ejecutar `git commit` ni `git push` de manera automática, intermedia o sin aprobación.
   - Solo al final de la tarea, presentar el resumen y esperar la aprobación explícita del usuario en el chat.
2. **Prohibición de Push Forzado:** `git push --force` / `-f` queda estrictamente prohibido salvo orden explícita del usuario.
3. **Higiene de Commits:** Cero secretos (`.env`, tokens, llaves) ni artefactos compilados/temporales en el commit.
4. **Mensajes Estándar:** Usar *Conventional Commits* (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).

---

## 🔄 Flujo 1: Sincronización Segura (Actualizar desde Remoto)

Para sincronizar la rama actual sin generar merge commits accidentales ni perder cambios locales:

```bash
# 1. Obtener novedades del remoto
git fetch origin --prune

# 2. Revisar si hay commits entrantes (rápido)
git log HEAD..@{u} --oneline

# 3. Integrar únicamente si es fast-forward
git pull --ff-only
```
> *Si hay conflictos o cambios locales sin commitear, detenerse y consultar antes de realizar stash o merge.*

---

## 📝 Flujo 2: Commit & Push (Fase Final de Tarea)

### Paso 1: Inspeccionar y Reportar al Chat
```bash
git status -s
git diff --stat
```
Presentar al usuario:
- Lista de archivos modificados/creados.
- Resumen breve de los cambios implementados.
- Mensaje de commit propuesto.
- **Solicitud de aprobación** (ej. *«¿Deseas que proceda con este commit y push?»*).

### Paso 2: Ejecutar (Solo tras confirmación explícita)
```bash
git add <archivos-específicos>
git commit -m "<tipo>(<alcance>): <descripción concisa>"
git push origin <rama-actual>
```
