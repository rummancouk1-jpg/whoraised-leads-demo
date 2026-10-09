import fs from 'node:fs/promises';
import sharp from 'sharp';
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#0c1426"/><rect x="76" y="88" width="110" height="110" rx="25" fill="#f4d38c"/><text x="131" y="161" text-anchor="middle" font-family="Arial" font-size="48" font-weight="700" fill="#0c1426">GG</text><text x="76" y="320" font-family="Arial" font-size="80" font-weight="700" fill="#ffffff">GG Outreach</text><text x="80" y="405" font-family="Arial" font-size="34" fill="#c2ccde">Private workspace for the GG team only</text></svg>';
await sharp(Buffer.from(svg)).png().toFile('src/app/opengraph-image.png');
await fs.writeFile('src/app/opengraph-image.alt.txt','GG Outreach — Private workspace for the GG team only');
const png=await sharp(Buffer.from(await fs.readFile('src/app/icon.svg'))).resize(64,64).png().toBuffer();
const h=Buffer.alloc(22);h.writeUInt16LE(1,2);h.writeUInt16LE(1,4);h[6]=64;h[7]=64;h.writeUInt16LE(1,10);h.writeUInt16LE(32,12);h.writeUInt32LE(png.length,14);h.writeUInt32LE(22,18);await fs.writeFile('src/app/favicon.ico',Buffer.concat([h,png]));
