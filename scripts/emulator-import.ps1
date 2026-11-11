# Start Firebase Emulator with data persistence import/export (PowerShell)
[CmdletBinding()]
param (
    [string]$DataDir = "$PSScriptRoot/../.firebase-emulator-data"
)

$ErrorActionPreference = "Stop"

Write-Host "==> Starting Firebase Emulators with persistence dir: $DataDir" -ForegroundColor Cyan
if (!(Test-Path -Path $DataDir)) {
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}

$firebaseCmd = Get-Command "firebase" -ErrorAction SilentlyContinue
if ($firebaseCmd) {
    firebase emulators:start --import="$DataDir" --export-on-exit="$DataDir"
} else {
    Write-Error "Firebase CLI ('firebase') was not found on PATH. Install with: npm i -g firebase-tools"
}
