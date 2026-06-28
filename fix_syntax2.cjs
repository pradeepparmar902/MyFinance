const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// The error is onChange={e=>setForm(p=>({...p,bankId:e.target.value})) style=
// It's missing `}` for onChange
code = code.replace(/onChange=\{e=>setForm\(p=>\(\{\.\.\.p,bankId:e\.target\.value\}\)\) style=/g, 
  'onChange={e=>setForm(p=>({...p,bankId:e.target.value}))} style=');

// Just to be safe, find any onChange={e=>setForm... style= that is missing the closing }
code = code.replace(/onChange=\{([^}]+?)\)\)(?!\}) style=/g, 'onChange={$1))} style=');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed syntax again.');
