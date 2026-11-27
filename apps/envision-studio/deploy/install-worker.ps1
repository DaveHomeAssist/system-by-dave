param([Parameter(Mandatory=$true)][string]$StudioOrigin,
      [Parameter(Mandatory=$true)][string]$Checkpoint,
      [string]$StudioDir = (Join-Path $env:LOCALAPPDATA 'EnvisionPersonalStudio'))
$ErrorActionPreference = 'Stop'
$taskName = 'Envision Personal Studio Worker'
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { throw 'An Envision worker task already exists.' }
if (-not (Test-Path (Join-Path $StudioDir 'worker.key'))) { throw 'Provision the worker key first.' }
if (-not (Test-Path $Checkpoint -PathType Leaf)) { throw 'Configured checkpoint missing.' }
$python = (Get-Command python.exe).Source
$pythonw = Join-Path (Split-Path $python) 'pythonw.exe'
if (-not (Test-Path $pythonw)) { throw 'Install the Windows Python interpreter with pythonw.' }
$cfg = Join-Path $StudioDir 'worker.json'
@{origin=$StudioOrigin; checkpoint=$Checkpoint; modelSha256=(Get-FileHash $Checkpoint -Algorithm SHA256).Hash.ToLowerInvariant(); keyFile=(Join-Path $StudioDir 'worker.key');
  state=(Join-Path $StudioDir 'state'); worker=$env:COMPUTERNAME} | ConvertTo-Json | Set-Content -Encoding utf8 $cfg
$action = New-ScheduledTaskAction -Execute $pythonw -Argument ('"{0}" --config "{1}"' -f (Join-Path $StudioDir 'worker.py'), $cfg) -WorkingDirectory $StudioDir
$trigger = New-ScheduledTaskTrigger -AtLogOn -User ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -RestartCount 4 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings | Out-Null
Start-ScheduledTask -TaskName $taskName
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName,State
