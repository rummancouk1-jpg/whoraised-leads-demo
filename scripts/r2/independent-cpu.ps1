param([string]$OutputPath)
$ErrorActionPreference = 'Stop'
Get-Counter -Counter '\Processor(_Total)\% Processor Time' -SampleInterval 1 -Continuous | ForEach-Object {
  [pscustomobject]@{ at = $_.Timestamp.ToUniversalTime().ToString('o'); cpu = [Math]::Round($_.CounterSamples[0].CookedValue,2) } | ConvertTo-Json -Compress | Add-Content -LiteralPath $OutputPath
}
