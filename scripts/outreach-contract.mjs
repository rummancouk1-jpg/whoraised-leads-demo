// Use the application's real CSV contract in maintenance scripts, without a second parser.
import fs from 'node:fs/promises';
import ts from 'typescript';
const moduleUrl=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const compile=code=>moduleUrl(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const types=compile(await fs.readFile('src/types/outreach.ts','utf8'));
const tracking=compile(await fs.readFile('src/lib/click-tracking.ts','utf8'));
const config=moduleUrl('export default '+await fs.readFile('src/config/fit-weights.json','utf8'));
const source=(await fs.readFile('src/lib/outreach.ts','utf8')).replace('"@/config/fit-weights.json"',JSON.stringify(config)).replace('"./click-tracking"',JSON.stringify(tracking)).replace('"@/types/outreach"',JSON.stringify(types));
export const contract=await import(compile(source));
export const schema=await import(types);
