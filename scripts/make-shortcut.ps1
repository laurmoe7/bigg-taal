# Makes the BiggTaal shortcuts (Desktop, Start menu, and one in the project folder) run the app straight from
# this project folder, with Electron from node_modules. No installer and no build: whatever is saved in the
# folder is what you get the next time you open it. Your data stays in %APPDATA%\biggtaal either way.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\make-shortcut.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$electron = Join-Path $root 'node_modules\electron\dist\electron.exe'
$icon = Join-Path $root 'build\icon.ico'
if (-not (Test-Path $electron)) { throw "Electron is missing. Run: npm install   (in $root)" }
if (-not (Test-Path $icon)) { throw "build\icon.ico is missing" }

$targets = @(
    (Join-Path $root 'BiggTaal.lnk'),
    (Join-Path ([Environment]::GetFolderPath('Desktop')) 'BiggTaal.lnk'),
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\BiggTaal.lnk')
)
$shell = New-Object -ComObject WScript.Shell
foreach ($path in $targets) {
    $lnk = $shell.CreateShortcut($path)
    $lnk.TargetPath = $electron
    $lnk.Arguments = '"' + $root + '"'
    $lnk.WorkingDirectory = $root
    $lnk.IconLocation = $icon + ',0'
    $lnk.Description = 'BiggTaal: learn Dutch (runs from the project folder)'
    $lnk.Save()
    Write-Host "Created $path"
}
