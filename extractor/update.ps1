<#
  Atualização automática do Portal Shop Titans.
  1. Lê o build da Steam (appmanifest_1258080.acf) e compara com o último extraído.
  2. Se mudou (ou com -Force), roda o extrator.
  3. Se o projeto é um repositório Git com remoto, faz commit e push (o GitHub Pages publica sozinho).
  Registro em extractor\update.log.
#>
param(
  [string]$Game = "C:\Program Files (x86)\Steam\steamapps\common\ShopTitan",
  [switch]$Force
)
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here
$log = Join-Path $here "update.log"
function Log($m) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $m" | Tee-Object -FilePath $log -Append }

$manifest = Join-Path $Game "..\..\appmanifest_1258080.acf"
if (-not (Test-Path $manifest)) { Log "appmanifest não encontrado: $manifest"; exit 1 }
$build = ([regex]'"buildid"\s+"(\d+)"').Match((Get-Content $manifest -Raw)).Groups[1].Value
$stateFile = Join-Path $here ".last_build"
$last = if (Test-Path $stateFile) { (Get-Content $stateFile -Raw).Trim() } else { "" }
if ($build -eq $last -and -not $Force) { Log "build $build já extraído; nada a fazer"; exit 0 }

# o jogo pode estar sendo atualizado pela Steam: espera os arquivos ficarem estáveis
$state = ([regex]'"StateFlags"\s+"(\d+)"').Match((Get-Content $manifest -Raw)).Groups[1].Value
if ($state -ne "4") { Log "Steam ainda atualizando (StateFlags=$state); tento na próxima execução"; exit 0 }

$py = Join-Path $here ".venv\Scripts\python.exe"
if (-not (Test-Path $py)) {
  Log "criando ambiente Python"
  python -m venv (Join-Path $here ".venv")
  & $py -m pip install -q -r (Join-Path $here "requirements.txt")
}
Log "extraindo build $build (anterior: $last)"
& $py -I (Join-Path $here "extract.py") --game $Game 2>&1 | ForEach-Object { Log $_ }
if ($LASTEXITCODE -ne 0) { Log "extrator falhou ($LASTEXITCODE)"; exit 1 }
Set-Content -Path $stateFile -Value $build

Push-Location $root
try {
  if (Test-Path ".git") {
    git add -A
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
      git commit -q -m "Dados do jogo: build $build"
      Log "commit criado"
      if (git remote) { git push -q; Log "enviado para o GitHub" } else { Log "sem remoto configurado; commit só local" }
    } else { Log "nenhuma mudança nos arquivos do site" }
  }
} finally { Pop-Location }
Log "pronto"
