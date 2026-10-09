// WCAG 2.2 contrast check of the semantic token pairs in globals.css. Exits non-zero on any failure.
import fs from 'node:fs/promises';
const lum=h=>{const [r,g,b]=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*b};
const cr=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05)};
const T={
 light:{bg:'#f6f7f9',surface:'#ffffff',surface2:'#eef1f5',text:'#0f172a',text2:'#435063',text3:'#566377',line:'#7a8699',accent:'#4338ca',onAccent:'#ffffff',accentText:'#3730a3',accentWeak:'#e8eaff',ok:'#047857',warn:'#92400e',bad:'#be123c',focus:'#4338ca',
   sNew:'#4f46e5',sContacted:'#7c3aed',sReplied:'#b45309',sJoined:'#047857',sDeclined:'#be123c',toastBg:'#0f172a',toastFg:'#f1f5f9',toastAccent:'#a5b4fc'},
 dark:{bg:'#0a0d12',surface:'#11151c',surface2:'#171c25',text:'#f1f5f9',text2:'#b7c0cf',text3:'#97a2b5',line:'#6f7b8f',accent:'#a5b4fc',onAccent:'#0b1020',accentText:'#c7d2fe',accentWeak:'#1e2347',ok:'#34d399',warn:'#fbbf24',bad:'#fb7185',focus:'#c7d2fe',
   sNew:'#a5b4fc',sContacted:'#c4b5fd',sReplied:'#fbbf24',sJoined:'#34d399',sDeclined:'#fb7185',toastBg:'#f1f5f9',toastFg:'#0f172a',toastAccent:'#4338ca'}};
const pairs=[ // [fg, bg, min, label]
 ['text','bg',4.5],['text','surface',4.5],['text','surface2',4.5],['text2','surface',4.5],['text2','bg',4.5],['text2','surface2',4.5],['text3','surface',4.5],['text3','bg',4.5],['text3','surface2',4.5],
 ['onAccent','accent',4.5],['accentText','surface',4.5],['accentText','bg',4.5],['accentText','accentWeak',4.5],['ok','surface',4.5],['warn','surface',4.5],['bad','surface',4.5],['ok','bg',4.5],['warn','bg',4.5],['bad','bg',4.5],
 ['toastFg','toastBg',4.5],['toastAccent','toastBg',4.5],['line','surface',3],['line','bg',3],['focus','surface',3],['focus','bg',3],
 ['sNew','surface',4.5],['sContacted','surface',4.5],['sReplied','surface',4.5],['sJoined','surface',4.5],['sDeclined','surface',4.5],['sNew','bg',4.5],['sContacted','bg',4.5],['sReplied','bg',4.5],['sJoined','bg',4.5],['sDeclined','bg',4.5],
];
const rows=[];let bad=0;
for(const [scheme,t] of Object.entries(T))for(const [f,b,min] of pairs){const r=cr(t[f],t[b]);const pass=r>=min;if(!pass)bad++;rows.push({scheme,fg:f,bg:b,ratio:+r.toFixed(2),min,pass});}
for(const r of rows)if(!r.pass)console.log('FAIL',r.scheme,r.fg,'on',r.bg,r.ratio,'<',r.min);
console.log(rows.length,'pairs;',bad,'failures');
await fs.mkdir('evidence/design-elevation',{recursive:true});await fs.writeFile('evidence/design-elevation/contrast.json',JSON.stringify(rows,null,2));
process.exit(bad?1:0);
