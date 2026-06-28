const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

code = code.split('e.target.value)))}').join('e.target.value)}');
code = code.split('+e.target.value))}').join('+e.target.value)}');
code = code.split('e.target.value))}').join('e.target.value)}');
code = code.split('e.target.value)) }').join('e.target.value)}');
code = code.split('+e.target.value)) }').join('+e.target.value)}');

// Fix the valid ones back
code = code.replace(/e=>setForm\(p=>\(\{\.\.\.p,\s*([a-zA-Z0-9_]+):\s*e\.target\.value\}\)\}/g, 'e=>setForm(p=>({...p,$1:e.target.value}))}');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed all remaining instances.');
