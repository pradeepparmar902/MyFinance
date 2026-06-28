const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// Replace any occurrence of `e.target.value))}` with `e.target.value)}`
code = code.replace(/e\.target\.value\)\)+\}/g, 'e.target.value)}');

// NOW, restore the ones that ACTUALLY NEED `}))}`!
// The only ones that need it are the `setForm(p => ({ ...p, key: e.target.value }))}`
code = code.replace(/e=>setForm\(p=>\(\{\.\.\.p,([^:]+):e\.target\.value\}\)\}/g, 'e=>setForm(p=>({...p,$1:e.target.value}))}');
code = code.replace(/e=>setForm\(p=>\(\{\.\.\.p,\s*([^:]+):\s*e\.target\.value\}\)\}/g, 'e=>setForm(p=>({...p,$1:e.target.value}))}');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed globally.');
