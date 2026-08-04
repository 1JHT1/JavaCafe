# ============================================
# Download local embedding model (all-MiniLM-L6-v2 ONNX)
# Uses hf-mirror.com (China mirror) because huggingface.co is blocked
# Run in PowerShell:  .\download-embedding-model.ps1
# ============================================
$ErrorActionPreference = "Stop"

$targetDir = Join-Path $PSScriptRoot "data\onnx"
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

$base = "https://hf-mirror.com/sentence-transformers/all-MiniLM-L6-v2/resolve/main"
$files = @(
    @{ Name = "model.onnx";     Url = "$base/onnx/model.onnx" },
    @{ Name = "tokenizer.json"; Url = "$base/tokenizer.json" }
)

foreach ($f in $files) {
    $dest = Join-Path $targetDir $f.Name
    if (Test-Path $dest) {
        Write-Host "[SKIP] $($f.Name) already exists"
        continue
    }
    Write-Host "[DOWNLOAD] $($f.Name) (may take a while, ~90MB for model.onnx)..."
    curl.exe -L --fail --progress-bar -o $dest $f.Url
    if ($LASTEXITCODE -ne 0) { throw "Download failed: $($f.Url)" }
    Write-Host "       -> $dest"
}

Write-Host ""
Write-Host "SUCCESS: embedding model files are ready at $targetDir"
