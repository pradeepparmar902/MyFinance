const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

code = code.replace(/onChange=\{e=>setForm\(p=>\(\{\.\.\.p,bankId:e\.target\.value\}\)\) style=\{\{/g, 
  'onChange={e=>setForm(p=>({...p,bankId:e.target.value}))} style={{');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed syntax explicitly.');
