from pathlib import Path
p=Path('src/components/outreach/StatusStrip.tsx');s=p.read_text();s=s.replace('`All qualified groups · ${groups.join', '`Priority: ${priorityCount} · Long tail: ${longTailCount} · ${groups.join');p.write_text(s)
