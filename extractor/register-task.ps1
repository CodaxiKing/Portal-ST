<#
  Registra (ou remove) a tarefa agendada do Windows que roda update.ps1
  todos os dias às 9h e 10 minutos depois de cada logon.
    powershell -ExecutionPolicy Bypass -File register-task.ps1           # registrar
    powershell -ExecutionPolicy Bypass -File register-task.ps1 -Remove   # remover
#>
param([switch]$Remove)
$name = "PortalShopTitans-Atualizar"
if ($Remove) { Unregister-ScheduledTask -TaskName $name -Confirm:$false; "Tarefa removida."; exit 0 }
$script = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "update.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""
$logon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$logon.Delay = "PT10M"
$triggers = @((New-ScheduledTaskTrigger -Daily -At 9am), $logon)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName $name -Action $action -Trigger $triggers -Settings $settings -Description "Re-extrai os dados do Shop Titans quando a Steam atualiza o jogo e publica o portal." -Force | Out-Null
"Tarefa '$name' registrada (diária às 9h e 10 min após o logon)."
