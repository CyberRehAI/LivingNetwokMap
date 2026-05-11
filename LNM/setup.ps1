#!/usr/bin/env pwsh
# LiveNetViz 3D - Complete Setup Script for Windows
# This script sets up the entire project from scratch

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  LiveNetViz 3D - Complete Setup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "[1/6] Checking Node.js..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js $nodeVersion found" -ForegroundColor Green
} else {
    Write-Host "  ✗ Node.js not found. Please install Node.js 16+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check Python
Write-Host "[2/6] Checking Python..." -ForegroundColor Yellow
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonVersion = python --version
    Write-Host "  ✓ $pythonVersion found" -ForegroundColor Green
} else {
    Write-Host "  ✗ Python not found. Please install Python 3.8+ from https://python.org" -ForegroundColor Red
    exit 1
}

# Setup Backend
Write-Host "[3/6] Setting up Backend..." -ForegroundColor Yellow
Set-Location backend
if (Test-Path "package.json") {
    Write-Host "  Installing Node.js dependencies..." -ForegroundColor Cyan
    npm install
    
    Write-Host "  Creating .env file..." -ForegroundColor Cyan
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
    }
    
    Write-Host "  Compiling C++ scanner module..." -ForegroundColor Cyan
    npm run build-cpp
    
    Write-Host "  ✓ Backend setup complete" -ForegroundColor Green
} else {
    Write-Host "  ✗ package.json not found" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Setup Frontend
Write-Host "[4/6] Setting up Frontend..." -ForegroundColor Yellow
Set-Location frontend
if (Test-Path "package.json") {
    Write-Host "  Installing Node.js dependencies..." -ForegroundColor Cyan
    npm install
    Write-Host "  ✓ Frontend setup complete" -ForegroundColor Green
} else {
    Write-Host "  ✗ package.json not found" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Setup Agent
Write-Host "[5/6] Setting up Agent..." -ForegroundColor Yellow
Set-Location agent
if (Test-Path "requirements.txt") {
    Write-Host "  Installing Python dependencies..." -ForegroundColor Cyan
    python -m pip install -r requirements.txt
    Write-Host "  ✓ Agent setup complete" -ForegroundColor Green
} else {
    Write-Host "  ✗ requirements.txt not found" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Setup Tests
Write-Host "[6/6] Setting up Tests..." -ForegroundColor Yellow
Write-Host "  Test utilities ready" -ForegroundColor Green

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start backend:  cd backend ; npm start" -ForegroundColor White
Write-Host "  2. Start frontend: cd frontend ; npm run dev" -ForegroundColor White
Write-Host "  3. Start agent:    cd agent ; python agent.py --server http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Or use the run script: .\run.ps1" -ForegroundColor Cyan
Write-Host ""
