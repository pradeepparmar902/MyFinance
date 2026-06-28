const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// Fix the over-replaced `...form` cases
code = code.replace(/onChange=\{e=>setForm\(\{\.\.\.form,\s*([a-zA-Z0-9_]+):\s*e\.target\.value\}\)\)\}/g, 'onChange={e=>setForm({...form, $1: e.target.value})}');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed over-replaced syntax.');
