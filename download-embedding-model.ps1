# ============================================
# 下载本地嵌入模型（all-MiniLM-L6-v2 ONNX）
# 使用 hf-mirror.com（国内镜像），因为 huggingface.co 无法访问
# 在 PowerShell 中运行：.\download-embedding-model.ps1
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
        Write-Host "[跳过] $($f.Name) 已存在"
        continue
    }
    Write-Host "[下载] $($f.Name)（可能需要一些时间，model.onnx 约 90MB）..."
    curl.exe -L --fail --progress-bar -o $dest $f.Url
    if ($LASTEXITCODE -ne 0) { throw "下载失败: $($f.Url)" }
    Write-Host "       -> $dest"
}

Write-Host ""
Write-Host "成功：嵌入模型文件已就绪，位于 $targetDir"
