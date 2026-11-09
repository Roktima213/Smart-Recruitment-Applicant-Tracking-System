<#
.SYNOPSIS
    Initializes the local Git repository, creates all 5 team branches (main, devops, frontend, backend, cloud),
    and optionally connects and pushes to GitHub.

.PARAMETER RemoteUrl
    Optional GitHub remote repository URL (e.g. https://github.com/<username>/<repo>.git)
#>

param (
    [string]$RemoteUrl = ""
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Smart ATS - Git Repository & 5-Branch Setup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Initialize Git repository if needed
if (-not (Test-Path ".git")) {
    Write-Host "[1/5] Initializing Git repository with default branch 'main'..." -ForegroundColor Yellow
    git init -b main
} else {
    Write-Host "[1/5] Git repository already initialized." -ForegroundColor Green
    git checkout -B main
}

# 2. Stage and commit baseline files
Write-Host "[2/5] Staging files and creating initial repository commit..." -ForegroundColor Yellow
git add .
$status = git status --porcelain
if ($status) {
    git commit -m "chore(repo): initialize monorepo structure, 5-branch architecture, and 25-day checklist"
    Write-Host "Baseline commit created on 'main'." -ForegroundColor Green
} else {
    Write-Host "No changes to commit on 'main'." -ForegroundColor Gray
}

# 3. Create/Reset the 4 role branches from main
$branches = @("devops", "frontend", "backend", "cloud")
Write-Host "[3/5] Setting up the 4 role branches from 'main'..." -ForegroundColor Yellow

foreach ($branch in $branches) {
    git branch -f $branch main
    Write-Host "  -> Branch '$branch' synchronized with 'main'." -ForegroundColor Green
}

# Switch back to main
git checkout main

# 4. Display local branch status
Write-Host "`n[4/5] Current local branches:" -ForegroundColor Cyan
git branch -v

# 5. Remote GitHub connection & push
Write-Host "`n[5/5] GitHub Remote Configuration:" -ForegroundColor Cyan
if (-not $RemoteUrl) {
    $existingRemote = git remote get-url origin 2>$null
    if ($existingRemote) {
        Write-Host "Found existing origin remote: $existingRemote" -ForegroundColor Green
        $RemoteUrl = $existingRemote
    } else {
        Write-Host "No remote URL provided. You can link your remote anytime using:" -ForegroundColor Yellow
        Write-Host "  git remote add origin https://github.com/<username>/<repo>.git" -ForegroundColor White
        Write-Host "  git push -u origin --all" -ForegroundColor White
        Write-Host "`nLocal setup completed successfully!" -ForegroundColor Green
        exit 0
    }
}

try {
    $currentRemote = git remote get-url origin 2>$null
    if ($currentRemote) {
        git remote set-url origin $RemoteUrl
    } else {
        git remote add origin $RemoteUrl
    }
    Write-Host "Origin set to: $RemoteUrl" -ForegroundColor Green
    Write-Host "Pushing all 5 branches to GitHub..." -ForegroundColor Yellow
    git push -u origin --all
    Write-Host "`nSuccessfully pushed all 5 branches to GitHub!" -ForegroundColor Green
} catch {
    Write-Error "Failed to push branches: $_"
}
