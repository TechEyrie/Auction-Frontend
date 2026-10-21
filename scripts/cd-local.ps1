# Local CD simulation for docker-compose.prod.yml (port 13000; does not touch dev stack on 3000).

$ErrorActionPreference = 'Stop'

$argLine = $args -join ' '
if ($argLine -match '(?i)down\b.*\B-v\b|\B-v\b.*down\b') {
  Write-Error 'Refusing: docker compose down -v is not allowed.'
  exit 1
}

$FrontendRoot = Split-Path -Parent $PSScriptRoot
$SimRoot = Join-Path $FrontendRoot '.cd-sim'
New-Item -ItemType Directory -Force -Path $SimRoot | Out-Null

$NginxConf = Join-Path (Join-Path (Join-Path $FrontendRoot 'deploy') 'nginx') 'araqandkahramanauctions.qa.conf'
if (-not (Test-Path -LiteralPath $NginxConf)) {
  Write-Error "Missing nginx config: $NginxConf"
  exit 1
}
$nginxText = Get-Content -LiteralPath $NginxConf -Raw
if ($nginxText -notmatch 'proxy_pass\s+http://127\.0\.0\.1:4000') {
  Write-Error "nginx config must proxy API to http://127.0.0.1:4000"
  exit 1
}
if (Get-Command nginx -ErrorAction SilentlyContinue) {
  Write-Host 'skip: nginx -t (site fragment only); content check passed.'
} else {
  Write-Host 'skip: nginx not on PATH; content check passed.'
}

$env:WEB_BIND = '127.0.0.1:13000'
$env:COMPOSE_PROJECT_NAME = 'araq-fe-sim'

Push-Location -LiteralPath $FrontendRoot
try {
  docker compose -f docker-compose.prod.yml config | Out-Null
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  docker compose -f docker-compose.prod.yml up -d --build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  $homeUrl = 'http://127.0.0.1:13000/'
  $deadline = (Get-Date).AddMinutes(5)
  do {
    try {
      $resp = Invoke-WebRequest -Uri $homeUrl -UseBasicParsing -TimeoutSec 10
      if ($resp.StatusCode -eq 200) {
        Write-Host "OK ($homeUrl)"
        exit 0
      }
    } catch {
      # not ready yet
    }
    if ((Get-Date) -ge $deadline) {
      Write-Error "Timed out waiting for $homeUrl"
      exit 1
    }
    Start-Sleep -Seconds 3
  } while ($true)
} finally {
  Pop-Location
}
