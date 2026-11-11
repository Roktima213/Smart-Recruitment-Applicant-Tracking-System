# Export Firebase Auth Emulator state to local directory (PowerShell)
[CmdletBinding()]
param (
    [string]$TargetDir = "$PSScriptRoot/../.firebase-emulator-data"
)

$ErrorActionPreference = "Stop"

Write-Host "==> Exporting Firebase Emulator data to: $TargetDir" -ForegroundColor Cyan
if (!(Test-Path -Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

$firebaseCmd = Get-Command "firebase" -ErrorAction SilentlyContinue
if ($firebaseCmd) {
    firebase emulators:export "$TargetDir" --force
    Write-Host "==> Export complete successfully." -ForegroundColor Green
} else {
    Write-Error "Firebase CLI ('firebase') was not found on PATH. Install with: npm i -g firebase-tools"
}
