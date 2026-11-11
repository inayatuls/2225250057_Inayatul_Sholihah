# Menjalankan KartesiusKu di komputer ini (Windows PowerShell).
# Pemakaian:  klik kanan -> "Run with PowerShell", atau:
#             powershell -ExecutionPolicy Bypass -File .\jalankan.ps1
# Setelah berjalan, buka http://localhost:8000 di browser.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Cari Python & Node meskipun belum ada di PATH.
$python = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $python -or $python -like "*WindowsApps*") { $python = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" }
$nodeDir = "$env:LOCALAPPDATA\Programs\nodejs"
if (Test-Path "$nodeDir\node.exe") { $env:Path = "$nodeDir;$env:Path" }

Write-Host "== 1/4 Menyiapkan backend (Python) ==" -ForegroundColor Cyan
Set-Location "$root\backend"
if (-not (Test-Path ".venv")) { & $python -m venv .venv }
& .\.venv\Scripts\python.exe -m pip install --quiet --upgrade pip
& .\.venv\Scripts\python.exe -m pip install --quiet -e ".[dev]"
# Windows "Smart App Control" dapat memblokir DLL SQLAlchemy -> pakai versi Python murni.
$env:DISABLE_SQLALCHEMY_CEXT = "1"
& .\.venv\Scripts\python.exe -c "import sqlalchemy.util" 2>$null
if ($LASTEXITCODE -ne 0) {
  & .\.venv\Scripts\python.exe -m pip install --quiet --force-reinstall --no-deps --no-binary sqlalchemy "sqlalchemy>=2.0.36"
}
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }

Write-Host "== 2/4 Menyiapkan database & data materi ==" -ForegroundColor Cyan
& .\.venv\Scripts\alembic.exe upgrade head
& .\.venv\Scripts\python.exe -m app.seed --demo

Write-Host "== 3/4 Membangun frontend (React) ==" -ForegroundColor Cyan
Set-Location "$root\frontend"
if (-not (Test-Path "node_modules")) { npm install --no-fund --no-audit }
npm run build

Write-Host "== 4/4 Server berjalan di http://localhost:8000 ==" -ForegroundColor Green
Write-Host "HP di Wi-Fi yang sama: buka http://<IP-komputer-ini>:8000 (lihat IP dengan perintah ipconfig)." -ForegroundColor Yellow
Write-Host "Tekan Ctrl+C untuk menghentikan." -ForegroundColor Yellow
Set-Location "$root\backend"
& .\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000
