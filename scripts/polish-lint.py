from pathlib import Path
p=Path('scripts/verify-polish-data.mjs');s=p.read_text(encoding='utf-8').replace("import {contract} from './outreach-contract.mjs';",'');p.write_text(s,encoding='utf-8')
