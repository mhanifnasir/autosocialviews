# AutoViews Multi-Profile Proxy Browser Launcher
# Execute this script in Windows PowerShell to spawn isolated viewer profiles.

# 1. Locate Chrome Binary
$chromePaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:USERPROFILE\AppData\Local\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chromePath = $null
foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        $chromePath = $path
        break
    }
}

if (-not $chromePath) {
    Write-Error "❌ Google Chrome could not be located. Please install Google Chrome to use this script."
    Exit
}

Write-Host "✓ Google Chrome located at: $chromePath" -ForegroundColor Green

# 2. Setup Workspace Directories
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = Get-Location }
$profilesBaseDir = Join-Path $scriptDir ".profiles"
$proxyFile = Join-Path $scriptDir "proxies.txt"

if (-not (Test-Path $profilesBaseDir)) {
    New-Item -ItemType Directory -Path $profilesBaseDir | Out-Null
}

# Ensure proxies.txt exists with template default if not present
if (-not (Test-Path $proxyFile)) {
    $defaultTemplate = @"
server: 127.0.0.1
port: 8080
secret: username:password

server: 127.0.0.1
port: 8081
secret: username:password
"@
    Set-Content -Path $proxyFile -Value $defaultTemplate
    Write-Host "✓ Created proxies.txt in workspace. Customize it with your proxy details." -ForegroundColor Yellow
}

# 3. Read and Parse Proxies (Handles server:port:secret format)
$proxies = @()
$currentProxy = @{
    server = ""
    port = ""
    username = ""
    password = ""
}

$lines = Get-Content $proxyFile
foreach ($line in $lines) {
    $trimmed = $line.Trim()
    
    # Check if empty line (indicates end of current block)
    if ($trimmed -eq "") {
        if ($currentProxy.server -ne "" -and $currentProxy.port -ne "") {
            $proxies += @{
                server = $currentProxy.server
                port = $currentProxy.port
                username = $currentProxy.username
                password = $currentProxy.password
            }
            $currentProxy.server = ""
            $currentProxy.port = ""
            $currentProxy.username = ""
            $currentProxy.password = ""
        }
        continue
    }

    if ($trimmed -match "^server\s*:\s*(.+)$") {
        $currentProxy.server = $Matches[1].Trim()
    }
    elseif ($trimmed -match "^port\s*:\s*(.+)$") {
        $currentProxy.port = $Matches[1].Trim()
    }
    elseif ($trimmed -match "^secret\s*:\s*(.*)$") {
        $secretVal = $Matches[1].Trim()
        if ($secretVal -match "^([^:]+):(.+)$") {
            $currentProxy.username = $Matches[1].Trim()
            $currentProxy.password = $Matches[2].Trim()
        } elseif ($secretVal -ne "") {
            $currentProxy.username = $secretVal
            $currentProxy.password = ""
        }
    }
}

# Add trailing proxy if file didn't end with a blank line
if ($currentProxy.server -ne "" -and $currentProxy.port -ne "") {
    $proxies += @{
        server = $currentProxy.server
        port = $currentProxy.port
        username = $currentProxy.username
        password = $currentProxy.password
    }
}

Write-Host "✓ Loaded $($proxies.Count) proxies from proxies.txt" -ForegroundColor Cyan

# 4. Prompt for Instances Count
$defaultInstances = 4
if ($proxies.Count -gt 0) {
    $defaultInstances = $proxies.Count
}
$instancesInput = Read-Host "Enter number of browser profiles to launch (Default: $defaultInstances)"
$instances = $defaultInstances
if ($instancesInput -and [int]::TryParse($instancesInput, [ref]$instances)) {
    # Parsed successfully
} else {
    $instances = $defaultInstances
}

Write-Host "🚀 Spawning $instances isolated browser profiles..." -ForegroundColor Green

# 5. Launch Chrome Instances
for ($i = 1; $i -le $instances; $i++) {
    $profileDir = Join-Path $profilesBaseDir "profile_$i"
    if (-not (Test-Path $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir | Out-Null
    }

    $args = @(
        "--user-data-dir=`"$profileDir`"",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--autoplay-policy=no-user-gesture-required",
        "http://localhost:5173"
    )

    # Route through proxy and setup auth extension if credential exists
    if ($proxies.Count -ge $i) {
        $proxy = $proxies[$i - 1]
        $server = $proxy.server
        $port = $proxy.port
        
        $args += "--proxy-server=`"$server:$port`""

        # Check if auth details exist
        if ($proxy.username -ne "" -and $proxy.password -ne "") {
            $extDir = Join-Path $profilesBaseDir "ext_$i"
            if (-not (Test-Path $extDir)) {
                New-Item -ItemType Directory -Path $extDir | Out-Null
            }

            # Generate manifest.json
            $manifestContent = @"
{
  "manifest_version": 3,
  "name": "Proxy Auto-Auth $i",
  "version": "1.0",
  "permissions": [
    "webRequest",
    "webRequestAuthProvider"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  }
}
"@
            Set-Content -Path (Join-Path $extDir "manifest.json") -Value $manifestContent

            # Generate background.js with inline credentials
            $user = $proxy.username
            $pass = $proxy.password
            $bgContent = @"
chrome.webRequest.onAuthRequired.addListener(
  (details, callback) => {
    callback({
      authCredentials: {
        username: "$user",
        password: "$pass"
      }
    });
  },
  { urls: ["<all_urls>"] },
  ["asyncBlocking"]
);
"@
            Set-Content -Path (Join-Path $extDir "background.js") -Value $bgContent

            $args += "--load-extension=`"$extDir`""
            Write-Host "  ↳ Profile $i: Connected using proxy $server:$port (Autologin Enabled)" -ForegroundColor Gray
        } else {
            Write-Host "  ↳ Profile $i: Connected using proxy $server:$port (No credentials needed)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ↳ Profile $i: Launched using Local Network IP (No proxy available)" -ForegroundColor Yellow
    }

    $argString = $args -join " "
    Start-Process -FilePath $chromePath -ArgumentList $argString
    Start-Sleep -Milliseconds 400
}

Write-Host "`n🎉 Spawning sequence complete!" -ForegroundColor Green
Write-Host "💡 Note: To clear settings or reset logins, delete the '.profiles' folder in your workspace." -ForegroundColor Gray
