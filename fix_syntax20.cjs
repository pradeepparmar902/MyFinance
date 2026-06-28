const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

code = code.replace(/e\.target\.value\)\)\}/g, 'e.target.value)}');

// But this will ALSO break e=>setForm(p=>({...p, bankId:e.target.value}))} which requires }))}
// So let's add the missing ) back ONLY for the setForm ones!
code = code.replace(/e=>setForm\(p=>\(\{\.\.\.p,([a-zA-Z0-9_]+):e\.target\.value\}\)\}/g, 'e=>setForm(p=>({...p,$1:e.target.value}))}');
code = code.replace(/e=>setForm\(p=>\(\{\.\.\.p,\s*([a-zA-Z0-9_]+):e\.target\.value\}\)\}/g, 'e=>setForm(p=>({...p,$1:e.target.value}))}');
code = code.replace(/e=>setForm\(p=>\(\{\.\.\.p, ([a-zA-Z0-9_]+): e\.target\.value\}\)\}/g, 'e=>setForm(p=>({...p,$1:e.target.value}))}');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed ALL remaining instances.');
