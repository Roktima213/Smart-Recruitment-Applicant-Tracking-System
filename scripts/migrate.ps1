<#
.SYNOPSIS
    Automated SQL Migration Runner for Windows PowerShell.
#>

param (
    [string]$HostName = $env:DB_HOST,
    [string]$Port = $env:DB_PORT,
    [string]$Database = $env:DB_NAME,
    [string]$User = $env:DB_USER
)

if (-not $HostName) { $HostName = "localhost" }
if (-not $Port) { $Port = "5432" }
if (-not $Database) { $Database = "smart_ats_db" }
if (-not $User) { $User = "postgres" }

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Executing Smart ATS Database Migrations via ts-node..." -ForegroundColor Cyan
Write-Host "Target: ${User}@${HostName}:${Port}/${Database}" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$scriptPath = Join-Path $PSScriptRoot "migrate.ts"
node ./backend/node_modules/ts-node/dist/bin.js --project ./backend/tsconfig.json $scriptPath
