const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// Fix handlePurchaseDate
code = code.replace(/handlePurchaseDate\("([^"]+)", e\.target\.value\)\)\}/g, 'handlePurchaseDate("$1", e.target.value)}');

// Fix any other `value}))}` that should be `value})}`
// We only want `}))}` for `e=>setForm(p=>({...p, ...}))}`
code = code.replace(/onChange=\{e\s*=>\s*setForm\(\{\.\.\.form,\s*([a-zA-Z0-9_]+):\s*e\.target\.value\}\)\)\}/g, 'onChange={e=>setForm({...form, $1: e.target.value})}');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed syntax errors.');
