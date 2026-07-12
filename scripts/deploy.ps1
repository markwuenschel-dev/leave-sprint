#!/usr/bin/env pwsh
# One-command deploy of leave-sprint (Waypoint) to the shared AWS box.
#
#   ./scripts/deploy.ps1                # deploy latest main
#   ./scripts/deploy.ps1 -Ref <sha>     # roll back / deploy a specific commit or tag
#   ./scripts/deploy.ps1 -DryRun        # print the remote script instead of running it
#
# The manual loop (ssh -> git pull -> compose rebuild -> logs) plus a public-URL health check.
# The pull and the docker build happen on the box (flat EC2 bill), and DNS is not involved.
#
# App is `waypoint` in a pnpm monorepo; the box's compose builds ../leave-sprint with
# Dockerfile.leave-sprint. Persistence is file-backed PGlite on the leavesprint_pglite volume
# (compose sets WAYPOINT_PGLITE_DIR=/data/pglite). Tables bootstrap on boot via `pnpm db:migrate`.

param(
  [string]$Ref = "main",
  [string]$SshKey = (Join-Path $HOME ".ssh/shared-box.pem"),
  [string]$BoxHost = "ubuntu@44.198.76.44",
  [string]$Url = "https://leavesprint.44-198-76-44.nip.io",
  [int]$Tail = 40,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# The box's clone is deploy-only (never edited in place), so main can be hard-synced to origin.
# Any other ref — a rollback SHA, a tag — is checked out detached; `git checkout main` restores.
$sync = if ($Ref -eq "main") {
  "git checkout -q main && git reset --hard origin/main"
} else {
  "git checkout -q --detach '$Ref'"
}

$remote = @"
set -eu
cd /opt/stack/leave-sprint
git fetch -q origin
$sync
echo "deploying `$(git rev-parse --short HEAD): `$(git log -1 --format=%s)"
cd /opt/stack/infra
docker compose up -d --build leave-sprint
docker compose logs --tail=$Tail leave-sprint || echo "(log tail failed - check manually; deploy itself already succeeded)"
"@

if ($DryRun) { Write-Host $remote; exit 0 }

if (-not (Test-Path $SshKey)) { throw "SSH key not found: $SshKey" }

# ssh ships with Windows but isn't always on PATH; fall back to the bundled OpenSSH location.
$ssh = (Get-Command ssh -ErrorAction SilentlyContinue).Source
if (-not $ssh) { $ssh = Join-Path $env:WINDIR "System32\OpenSSH\ssh.exe" }
if (-not (Test-Path $ssh)) { throw "ssh client not found (looked on PATH and in $env:WINDIR\System32\OpenSSH)" }

# PowerShell's pipe to a native command appends CRLF to the FINAL line (and a CRLF checkout of this
# file would put \r on every line), so bash on the box would see 'leave-sprint\r' — "no such
# service". Strip CRs on the remote side before bash reads the script.
$remote | & $ssh -i $SshKey $BoxHost "tr -d '\r' | bash -s"
if ($LASTEXITCODE -ne 0) { throw "deploy failed (ssh exit $LASTEXITCODE)" }

# Prove the public URL serves the new build — logs alone don't show what Caddy is fronting.
# Invoke-WebRequest (not curl.exe, which isn't guaranteed on PATH). The freshly recreated container
# runs `db:migrate && next start` on boot, so Caddy returns 502 for a few seconds until the upstream
# is ready — retry through that warmup window before declaring the deploy unhealthy.
$code = $null
$lastErr = ""
foreach ($attempt in 1..12) {
  try {
    $code = (Invoke-WebRequest -Uri "$Url/" -MaximumRedirection 5 -TimeoutSec 30 -UseBasicParsing).StatusCode
    break
  } catch {
    $lastErr = $_.Exception.Message
    Start-Sleep -Seconds 5
  }
}
if (-not $code) { throw "deployed, but the health check against $Url never came up: $lastErr" }
Write-Host "$Url -> HTTP $code"
