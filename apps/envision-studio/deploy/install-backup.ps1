param([string]$StudioDir = (Join-Path $env:LOCALAPPDATA 'EnvisionPersonalStudio'))
$ErrorActionPreference = 'Stop'
$name = 'Envision Personal Studio Backup'
if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
  throw 'A studio backup task already exists.'
}
foreach ($file in @('worker.json', 'pull-backup.py', 'backup.py')) {
  if (-not (Test-Path (Join-Path $StudioDir $file) -PathType Leaf)) {
    throw ("Install {0} in the studio directory before registering the backup." -f $file)
  }
}
$python = (Get-Command python.exe).Source
$arguments = '"{0}" --config "{1}"' -f (Join-Path $StudioDir 'pull-backup.py'), (Join-Path $StudioDir 'worker.json')
$action = New-ScheduledTaskAction -Execute $python -Argument $arguments -WorkingDirectory $StudioDir
$trigger = New-ScheduledTaskTrigger -Daily -At '04:15'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 25) -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings | Out-Null
Start-ScheduledTask -TaskName $name
Get-ScheduledTask -TaskName $name | Select-Object TaskName,State
