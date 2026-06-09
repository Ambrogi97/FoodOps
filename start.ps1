# FoodOps - Iniciar backend, frontend y abrir el navegador

Write-Host "Iniciando FoodOps..." -ForegroundColor Cyan

# Instalar dependencias si faltan
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "Instalando dependencias del backend..." -ForegroundColor Yellow
    Push-Location backend
    npm install
    Pop-Location
}

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "Instalando dependencias del frontend..." -ForegroundColor Yellow
    Push-Location frontend
    npm install
    Pop-Location
}

# Iniciar backend en una nueva ventana
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"

# Iniciar frontend en una nueva ventana
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

# Esperar a que Vite levante y abrir el navegador
Write-Host "Esperando que los servidores levanten..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

Write-Host "Listo! Backend en http://localhost:3000 - Frontend en http://localhost:5173" -ForegroundColor Green
