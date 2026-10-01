#!/usr/bin/env bash
# Sincronización rápida y no destructiva ("soft sync") para la rama develop.

set -e

REMOTE="${1:-origin}"
BRANCH="${2:-develop}"

CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    echo "⚠️ Cambiando a rama '$BRANCH' de forma segura..."
    git checkout "$BRANCH" --quiet || {
        echo "❌ No se pudo cambiar a la rama '$BRANCH'. Hay cambios pendientes."
        exit 1
    }
    CURRENT_BRANCH="$BRANCH"
fi

# Verificar si el árbol de trabajo está limpio
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️ Árbol de trabajo con cambios pendientes en '$CURRENT_BRANCH'."
    echo "   Para proteger tu trabajo, no se ejecutará ninguna acción destructiva:"
    git status -s
    exit 0
fi

# Fetch sin alterar local
git fetch "$REMOTE" "$BRANCH" --prune --quiet

REMOTE_REF="$REMOTE/$BRANCH"
LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse "$REMOTE_REF")

if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
    echo "⚡ [$BRANCH] Al día con $REMOTE_REF (100% sincronizado)."
    exit 0
fi

BEHIND=$(git rev-list --count HEAD.."$REMOTE_REF")
AHEAD=$(git rev-list --count "$REMOTE_REF"..HEAD)

if [ "$BEHIND" -gt 0 ] && [ "$AHEAD" -eq 0 ]; then
    echo "🔄 Descargando $BEHIND commit(s) pendientes de $REMOTE_REF vía fast-forward..."
    git pull --ff-only "$REMOTE" "$BRANCH"
    echo "✅ [$BRANCH] Sincronizado exitosamente con $REMOTE_REF ($BEHIND nuevos commits)."
    git log -n "$BEHIND" --oneline
elif [ "$AHEAD" -gt 0 ] && [ "$BEHIND" -eq 0 ]; then
    echo "ℹ️ [$BRANCH] Tienes $AHEAD commit(s) locales pendientes de push a $REMOTE_REF."
else
    echo "⚠️ [$BRANCH] Divergencia detectada (Local: +$AHEAD, Remoto: +$BEHIND)."
    echo "   No se aplican cambios automáticos para prevenir conflictos."
fi
