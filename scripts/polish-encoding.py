from pathlib import Path
p=Path('src/components/outreach/StatusStrip.tsx');s=p.read_bytes().decode('utf-8',errors='replace');start=s.index('`Priority:');end=s.index('${groups.join',start);s=s[:start]+'`Priority: ${priorityCount} \\u00b7 Long tail: ${longTailCount} \\u00b7 '+s[end:];p.write_text(s,encoding='utf-8')
for name in ['src/lib/outreach.ts','src/components/outreach/Workspace.tsx','src/components/outreach/StatusStrip.tsx','src/components/outreach/ConversionLoop.tsx','src/components/outreach/ClickAnalytics.tsx','src/lib/server/clicks.ts','src/contexts/OutreachContext.tsx','tests/outreach.spec.ts']:
 Path(name).read_text(encoding='utf-8')
print('PASS: edited files valid UTF-8')
