#!/bin/bash
# Rebuild and restart the local production server on :3101.
cd "D:/Official/Dev Websites/whoraised-leads-demo"
powershell -NoProfile -File scripts/design/restart.ps1
npx next build > evidence/design-elevation/build-after.log 2>&1 || { tail -30 evidence/design-elevation/build-after.log; exit 1; }
(INSTANTLY_STUB=1 node scripts/design/serve.mjs 3101 > evidence/design-elevation/server-after.log 2>&1 &)
for i in 1 2 3 4 5 6 7 8; do sleep 2; curl -s -o /dev/null -w "%{http_code}" http://localhost:3101/login | grep -q 200 && echo "server up" && exit 0; done
echo "server did not start"; exit 1
