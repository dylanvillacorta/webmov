[CmdletBinding()]
param (
    [string]$Remote = "origin",
    [string]$Branch = "develop"
)

$ErrorActionPreference = "Stop"

try {
    $currentBranch = (git branch --show-current).Trim()
} catch {
    Write-Host "[sync] Error: Este directorio no es un repositorio Git valido." -ForegroundColor Red
    exit 1
}

if ($currentBranch -ne $Branch) {
    Write-Host "[sync] Cambiando a rama '$Branch'..." -ForegroundColor Yellow
    try {
        git checkout $Branch --quiet
        $currentBranch = $Branch
    } catch {
        Write-Host "[sync] Error al cambiar a '$Branch'. Hay cambios sin commitear." -ForegroundColor Red
        exit 1
    }
}

$uncommitted = git status --porcelain
if ($uncommitted) {
    Write-Host "[sync] Arbol de trabajo con cambios locales pendientes. Sincronizacion detenida para proteger archivos:" -ForegroundColor Yellow
    $uncommitted | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkYellow }
    exit 0
}

try {
    git fetch $Remote $Branch --prune --quiet
} catch {
    Write-Host "[sync] Error al conectar con el remoto '$Remote'." -ForegroundColor Red
    exit 1
}

$remoteRef = "$Remote/$Branch"
$localHash = (git rev-parse HEAD).Trim()
$remoteHash = (git rev-parse $remoteRef).Trim()

if ($localHash -eq $remoteHash) {
    Write-Host "[sync] Rama '$Branch' 100% al dia con $remoteRef (SKIP)." -ForegroundColor Green
    exit 0
}

$behind = [int](git rev-list --count HEAD..$remoteRef).Trim()
$ahead  = [int](git rev-list --count $remoteRef..HEAD).Trim()

if ($behind -gt 0 -and $ahead -eq 0) {
    Write-Host "[sync] Descargando $behind commit(s) pendientes de $remoteRef..." -ForegroundColor Cyan
    git pull --ff-only $Remote $Branch
    Write-Host "[sync] Sincronizado exitosamente con $remoteRef." -ForegroundColor Green
    git log -n $behind --oneline
} elseif ($ahead -gt 0 -and $behind -eq 0) {
    Write-Host "[sync] Tienes $ahead commit(s) locales pendientes de enviar a $remoteRef." -ForegroundColor Cyan
} else {
    Write-Host "[sync] Divergencia detectada (Local: +$ahead, Remoto: +$behind). Se requiere revision manual." -ForegroundColor Yellow
}
