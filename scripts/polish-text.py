from pathlib import Path
chars='–—×÷…↥↗→←✓‘’“”·'
count=0
for folder in ['src','docs','scripts','tests']:
 for p in Path(folder).rglob('*'):
  if p.suffix not in ['.ts','.tsx','.md','.mjs','.py']:continue
  try:s=p.read_text(encoding='utf-8')
  except UnicodeDecodeError:continue
  original=s
  for ch in chars:
   try:bad=ch.encode('utf-8').decode('cp1252')
   except UnicodeDecodeError:continue
   s=s.replace(bad,ch)
  if s!=original:p.write_text(s,encoding='utf-8');count+=1
p=Path('src/app/globals.css')
with p.open('a',encoding='utf-8') as f:f.write('\n.gg-filters .gg-toggle { display: flex; align-items: center; gap: 8px; color: #334155; margin-bottom: 12px; }\n.gg-dark-panel .gg-filters .gg-toggle { color: #cbd5e1; }\n')
print('Repaired text encoding in',count,'files; improved tier toggle label contrast')
