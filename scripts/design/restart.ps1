$c = Get-NetTCPConnection -LocalPort 3101 -State Listen -ErrorAction SilentlyContinue; if ($c) { Stop-Process -Id $c.OwningProcess -Force }
