# Push this project to GitHub
# 1. Create a NEW empty repo on github.com (no README, no .gitignore)
# 2. Replace YOUR_USERNAME and YOUR_REPO_NAME below with your GitHub username and repo name
# 3. Run this script in PowerShell from this folder:
#    .\push-to-github.ps1

$ErrorActionPreference = "Stop"
$repoUrl = "https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"

if ($repoUrl -match "YOUR_USERNAME|YOUR_REPO_NAME") {
  Write-Host "ERROR: Edit this script and set YOUR_USERNAME and YOUR_REPO_NAME in repoUrl" -ForegroundColor Red
  exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: Git not found. Install from https://git-scm.com/download/win" -ForegroundColor Red
  exit 1
}

$root = $PSScriptRoot
Set-Location $root

if (-not (Test-Path ".git")) {
  git init
  git add .
  git commit -m "Initial commit: Total Volume Dashboard"
  git branch -M main
} else {
  git add -A
  $status = git status --porcelain
  if ($status) {
    git commit -m "Update: Total Volume Dashboard"
  }
}

git remote remove origin 2>$null
git remote add origin $repoUrl
git push -u origin main

Write-Host "Done. Check your repo at: $repoUrl" -ForegroundColor Green
