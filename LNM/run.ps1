#!/usr/bin/env pwsh
# LiveNetViz 3D - Quick Run Script
# Starts all components in separate windows

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  LiveNetViz 3D - Starting All Components" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Get-Location

# Start Backend
Write-Host "Starting Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\backend'; npm start"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\frontend'; npm run dev"

# Start a test agent
Write-Host "Starting Test Agent..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\agent'; python agent.py --server http://localhost:3000 --node-id local-agent"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  All Components Started!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop" -ForegroundColor Yellow
