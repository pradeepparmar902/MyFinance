const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

code = code.replace(/onChange=\{e=>setForm\(p=>\(\{\.\.\.p,bankId:e\.target\.value\}\)\)\}/g, 'onChange={(e) => setForm((p) => { return { ...p, bankId: e.target.value }; })}');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed syntax by expanding arrow functions.');
