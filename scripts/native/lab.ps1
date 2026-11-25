<#
.SYNOPSIS
  Run QueryShield Lab natively on Windows (no Docker).

.DESCRIPTION
  LOCAL-ONLY LAB. PostgreSQL, the API and the web dev server all bind 127.0.0.1.
  Never expose these ports publicly.

  Commands:
    setup   Download portable PostgreSQL 17 into .local\, create the cluster,
            install API (uv, Python 3.12) and web (pnpm via npx) dependencies.
    start   Start PostgreSQL, run the idempotent lab bootstrap, then open the API
            and web dev server in two console windows.
    stop    Stop the API, the web dev server and PostgreSQL.
    status  Show what is running.
    reset   Restore fixture data and clear experiment history (local CLI only).
    check   Print dataset version and row counts.

  Settings are read from the repository .env (same keys as the Docker setup).
#>
param(
    [Parameter(Position = 0)]
    [ValidateSet('setup', 'start', 'stop', 'status', 'reset', 'check')]
    [string]$Command = 'start'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$PostgresVersion = '17.7-1'
$PostgresZipUrl = "https://get.enterprisedb.com/postgresql/postgresql-$PostgresVersion-windows-x64-binaries.zip"
$UvVersion = '0.8.15'
# Called through npx: the corepack bundled with older Node 22 fails npm signature checks.
$PnpmSpec = 'pnpm@10.15.1'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$LocalDir = Join-Path $RepoRoot '.local'
$PgHome = Join-Path $LocalDir 'pgsql'
$PgBin = Join-Path $PgHome 'bin'
$PgData = Join-Path $LocalDir 'pgdata'
$PgLog = Join-Path $LocalDir 'postgres.log'
$PidDir = Join-Path $LocalDir 'pids'
$ApiDir = Join-Path $RepoRoot 'apps\api'
$WebDir = Join-Path $RepoRoot 'apps\web'

function Write-Step([string]$Message) { Write-Host "==> $Message" -ForegroundColor Cyan }

function Read-DotEnv([string]$Path) {
    $values = @{}
    if (-not (Test-Path $Path)) { return $values }
    foreach ($line in Get-Content -Path $Path -Encoding UTF8) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#') -or -not $trimmed.Contains('=')) { continue }
        $parts = $trimmed.Split('=', 2)
        $values[$parts[0].Trim()] = $parts[1].Trim().Trim('"').Trim("'")
    }
    return $values
}

function Get-LabConfig {
    $envFile = Join-Path $RepoRoot '.env'
    if (-not (Test-Path $envFile)) {
        Copy-Item (Join-Path $RepoRoot '.env.example') $envFile
        Write-Host 'Created .env from .env.example (unsafe lab disabled by default).'
    }
    $dotEnv = Read-DotEnv $envFile
    $get = {
        param($Name, $Default)
        if ($dotEnv.ContainsKey($Name) -and $dotEnv[$Name]) { $dotEnv[$Name] } else { $Default }
    }
    # Same disposable local-only defaults as infra/compose.yaml.
    return [pscustomobject]@{
        AppEnv          = & $get 'APP_ENV' 'development'
        LabEnableUnsafe = & $get 'LAB_ENABLE_UNSAFE' 'false'
        WebPort         = & $get 'WEB_PORT' '5173'
        ApiPort         = & $get 'API_PORT' '8000'
        PgPort          = & $get 'POSTGRES_PORT' '5433'
        PgUser          = & $get 'POSTGRES_USER' 'queryshield'
        PgPassword      = & $get 'POSTGRES_PASSWORD' 'queryshield_local_only'
        QueryPassword   = & $get 'LAB_QUERY_DB_PASSWORD' 'qs_lab_query_local_only'
        AppPassword     = & $get 'LAB_APP_DB_PASSWORD' 'qs_lab_app_local_only'
    }
}

function Get-DbUrl($Config, [string]$User, [string]$Password, [string]$Database) {
    $u = [uri]::EscapeDataString($User)
    $p = [uri]::EscapeDataString($Password)
    return "postgresql://${u}:${p}@127.0.0.1:$($Config.PgPort)/$Database"
}

function Invoke-Native([string]$File, [string[]]$Arguments, [string]$WorkDir = $RepoRoot) {
    Push-Location $WorkDir
    try {
        & $File @Arguments
        if ($LASTEXITCODE -ne 0) { throw "Command failed ($LASTEXITCODE): $File $($Arguments -join ' ')" }
    }
    finally { Pop-Location }
}

function Invoke-Uv([string[]]$Arguments) {
    Invoke-Native 'python' (@('-m', 'uv') + $Arguments) $ApiDir
}

function Test-PortListening([string]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $client.Connect('127.0.0.1', [int]$Port)
        return $true
    }
    catch { return $false }
    finally { $client.Dispose() }
}

function Test-PostgresRunning {
    if (-not (Test-Path (Join-Path $PgBin 'pg_ctl.exe'))) { return $false }
    & (Join-Path $PgBin 'pg_ctl.exe') status -D $PgData *> $null
    return ($LASTEXITCODE -eq 0)
}

# ---------------------------------------------------------------- setup

function Install-Postgres($Config) {
    if (Test-Path (Join-Path $PgBin 'postgres.exe')) {
        Write-Step "PostgreSQL binaries already present in $PgHome"
    }
    else {
        $downloadDir = Join-Path $LocalDir 'downloads'
        New-Item -ItemType Directory -Force -Path $downloadDir | Out-Null
        $zip = Join-Path $downloadDir "postgresql-$PostgresVersion.zip"
        if (-not (Test-Path $zip)) {
            Write-Step "Downloading PostgreSQL $PostgresVersion (portable, ~300 MB)"
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $PostgresZipUrl -OutFile "$zip.part" -UseBasicParsing
            Move-Item "$zip.part" $zip
        }
        Write-Step 'Extracting PostgreSQL (skipping pgAdmin and debug symbols)'
        # Windows ships bsdtar, which is much faster than Expand-Archive.
        Invoke-Native 'tar' @('-xf', $zip, '-C', $LocalDir, '--exclude', 'pgsql/pgAdmin 4', '--exclude', 'pgsql/symbols', '--exclude', 'pgsql/StackBuilder')
    }

    if (Test-Path (Join-Path $PgData 'PG_VERSION')) {
        Write-Step "Database cluster already initialised in $PgData"
        return
    }
    Write-Step 'Initialising local database cluster'
    $pwFile = Join-Path $LocalDir 'initdb-pw.tmp'
    try {
        [IO.File]::WriteAllText($pwFile, $Config.PgPassword)
        Invoke-Native (Join-Path $PgBin 'initdb.exe') @(
            '-D', $PgData, '-U', $Config.PgUser, "--pwfile=$pwFile",
            '--auth=scram-sha-256', '--encoding=UTF8', '--no-locale'
        )
    }
    finally { Remove-Item $pwFile -ErrorAction SilentlyContinue }

    # Loopback only, regardless of any later edits to the port.
    Add-Content -Path (Join-Path $PgData 'postgresql.conf') -Encoding ASCII -Value @(
        '',
        '# QueryShield Lab: local-only.',
        "listen_addresses = '127.0.0.1'"
    )
}

function Install-ApiDependencies {
    $uvOk = $false
    try { & python -m uv --version *> $null; $uvOk = ($LASTEXITCODE -eq 0) } catch { }
    if (-not $uvOk) {
        Write-Step "Installing uv $UvVersion (user site-packages)"
        Invoke-Native 'python' @('-m', 'pip', 'install', '--user', '--disable-pip-version-check', "uv==$UvVersion")
    }
    Write-Step 'Installing API dependencies (uv will fetch Python 3.12 if needed)'
    Invoke-Uv @('sync', '--locked', '--python', '3.12')
}

function Install-WebDependencies {
    # node_modules built inside a Linux container lacks the Windows esbuild/rollup binaries.
    $nodeModules = Join-Path $WebDir 'node_modules'
    $winEsbuild = Get-ChildItem -Path (Join-Path $nodeModules '.pnpm') -Filter '@esbuild+win32-x64*' -Directory -ErrorAction SilentlyContinue
    if ((Test-Path $nodeModules) -and -not $winEsbuild) {
        Write-Step 'Removing non-Windows node_modules'
        Remove-Item -Recurse -Force $nodeModules
    }
    Write-Step "Installing web dependencies ($PnpmSpec via npx)"
    Invoke-Native 'npx.cmd' @('--yes', $PnpmSpec, 'install', '--frozen-lockfile') $WebDir
}

function Invoke-Setup {
    $config = Get-LabConfig
    New-Item -ItemType Directory -Force -Path $LocalDir | Out-Null
    Install-Postgres $config
    Install-ApiDependencies
    Install-WebDependencies
    Write-Step 'Setup done. Next: scripts\native\lab.cmd start'
}

# ---------------------------------------------------------------- run

function Start-Postgres($Config) {
    if (-not (Test-Path (Join-Path $PgData 'PG_VERSION'))) {
        throw 'PostgreSQL is not set up. Run: scripts\native\lab.cmd setup'
    }
    if (Test-PostgresRunning) {
        Write-Step 'PostgreSQL already running'
        return
    }
    if (Test-PortListening $Config.PgPort) {
        throw "Port $($Config.PgPort) is already in use (Docker stack still running?). Stop it or change POSTGRES_PORT in .env."
    }
    Write-Step "Starting PostgreSQL on 127.0.0.1:$($Config.PgPort)"
    # Detached hidden process: the postmaster must not inherit this console's handles,
    # otherwise piped callers hang and closing the terminal kills PostgreSQL.
    # WaitForExit() waits for pg_ctl only; Start-Process -Wait would also wait for the postmaster.
    $proc = Start-Process -FilePath (Join-Path $PgBin 'pg_ctl.exe') -WindowStyle Hidden -PassThru `
        -ArgumentList @('start', '-D', "`"$PgData`"", '-l', "`"$PgLog`"", '-w', '-o', "`"-p $($Config.PgPort)`"")
    $proc.WaitForExit()
    if (-not (Test-PostgresRunning)) { throw "PostgreSQL failed to start; see $PgLog" }
}

function Set-AdminEnvironment($Config) {
    $env:ADMIN_DATABASE_URL = Get-DbUrl $Config $Config.PgUser $Config.PgPassword 'postgres'
    $env:LAB_DATABASE_NAME = 'queryshield_lab'
    $env:LAB_QUERY_DB_PASSWORD = $Config.QueryPassword
    $env:LAB_APP_DB_PASSWORD = $Config.AppPassword
}

function Invoke-LabAdmin($Config, [string]$Action) {
    Set-AdminEnvironment $Config
    try { Invoke-Uv @('run', 'python', '-m', 'queryshield_api.db.admin', $Action) }
    finally {
        # The API process must never inherit the privileged URL.
        Remove-Item Env:ADMIN_DATABASE_URL -ErrorAction SilentlyContinue
    }
}

function Start-LabWindow([string]$Name, [string]$WorkDir, [string]$CommandLine) {
    $pidFile = Join-Path $PidDir "$Name.pid"
    if (Test-Path $pidFile) {
        $old = Get-Process -Id ([int](Get-Content $pidFile)) -ErrorAction SilentlyContinue
        if ($old) { Write-Step "$Name already running (PID $($old.Id))"; return }
    }
    $script = "`$Host.UI.RawUI.WindowTitle = 'QueryShield $Name'; Set-Location -LiteralPath '$WorkDir'; $CommandLine"
    $proc = Start-Process -FilePath 'powershell.exe' -PassThru -WorkingDirectory $WorkDir `
        -ArgumentList @('-NoExit', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $script)
    Set-Content -Path $pidFile -Value $proc.Id -Encoding ASCII
    Write-Step "$Name started in a new window (PID $($proc.Id))"
}

function Wait-Http([string]$Url, [int]$Seconds) {
    $deadline = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($r.StatusCode -eq 200) { return $true }
        }
        catch { }
        Start-Sleep -Milliseconds 700
    }
    return $false
}

function Invoke-Start {
    $config = Get-LabConfig
    New-Item -ItemType Directory -Force -Path $PidDir | Out-Null
    foreach ($port in @($config.ApiPort, $config.WebPort)) {
        if (Test-PortListening $port) {
            throw "Port $port is already in use (Docker stack or a previous run?). Run 'lab.cmd stop' or change ports in .env."
        }
    }

    Start-Postgres $config
    Write-Step 'Bootstrapping lab database (idempotent)'
    Invoke-LabAdmin $config 'bootstrap'

    # Runtime API gets only the two least-privileged roles.
    $queryUrl = Get-DbUrl $config 'qs_lab_query' $config.QueryPassword 'queryshield_lab'
    $appUrl = Get-DbUrl $config 'qs_lab_app' $config.AppPassword 'queryshield_lab'
    $apiCmd = @(
        "`$env:APP_ENV = '$($config.AppEnv)'",
        "`$env:LAB_ENABLE_UNSAFE = '$($config.LabEnableUnsafe)'",
        "`$env:LAB_QUERY_DATABASE_URL = '$queryUrl'",
        "`$env:LAB_APP_DATABASE_URL = '$appUrl'",
        "python -m uv run uvicorn queryshield_api.main:app --host 127.0.0.1 --port $($config.ApiPort)"
    ) -join '; '
    Start-LabWindow 'api' $ApiDir $apiCmd

    $webCmd = @(
        "`$env:VITE_API_PROXY_TARGET = 'http://127.0.0.1:$($config.ApiPort)'",
        "npx.cmd --yes $PnpmSpec exec vite --host 127.0.0.1 --port $($config.WebPort) --strictPort"
    ) -join '; '
    Start-LabWindow 'web' $WebDir $webCmd

    $apiOk = Wait-Http "http://127.0.0.1:$($config.ApiPort)/api/v1/health" 60
    $webOk = Wait-Http "http://127.0.0.1:$($config.WebPort)/" 60
    Write-Host ''
    Write-Host "  API  : $(if ($apiOk) {'OK  '} else {'FAIL'}) http://127.0.0.1:$($config.ApiPort)/docs"
    Write-Host "  Web  : $(if ($webOk) {'OK  '} else {'FAIL'}) http://127.0.0.1:$($config.WebPort)/"
    Write-Host "  DB   : OK   127.0.0.1:$($config.PgPort)"
    if (-not ($apiOk -and $webOk)) { Write-Warning 'Check the API/web windows for errors.'; exit 1 }
}

function Invoke-Stop {
    foreach ($name in @('web', 'api')) {
        $pidFile = Join-Path $PidDir "$name.pid"
        if (-not (Test-Path $pidFile)) { continue }
        $procId = [int](Get-Content $pidFile)
        if (Get-Process -Id $procId -ErrorAction SilentlyContinue) {
            & taskkill.exe /PID $procId /T /F *> $null
            Write-Step "Stopped $name (PID $procId)"
        }
        Remove-Item $pidFile -ErrorAction SilentlyContinue
    }
    if (Test-PostgresRunning) {
        Invoke-Native (Join-Path $PgBin 'pg_ctl.exe') @('stop', '-D', $PgData, '-m', 'fast', '-w')
        Write-Step 'Stopped PostgreSQL'
    }
}

function Invoke-Status {
    $config = Get-LabConfig
    Write-Host "PostgreSQL : $(if (Test-PostgresRunning) {'running'} else {'stopped'}) (127.0.0.1:$($config.PgPort))"
    Write-Host "API        : $(if (Test-PortListening $config.ApiPort) {'listening'} else {'stopped'}) (127.0.0.1:$($config.ApiPort))"
    Write-Host "Web        : $(if (Test-PortListening $config.WebPort) {'listening'} else {'stopped'}) (127.0.0.1:$($config.WebPort))"
    Write-Host "Unsafe lab : APP_ENV=$($config.AppEnv), LAB_ENABLE_UNSAFE=$($config.LabEnableUnsafe)"
}

switch ($Command) {
    'setup' { Invoke-Setup }
    'start' { Invoke-Start }
    'stop' { Invoke-Stop }
    'status' { Invoke-Status }
    'reset' { $c = Get-LabConfig; Start-Postgres $c; Invoke-LabAdmin $c 'reset' }
    'check' { $c = Get-LabConfig; Start-Postgres $c; Invoke-LabAdmin $c 'check' }
}
