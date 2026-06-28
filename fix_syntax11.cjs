const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// Fix handlePurchaseDate
code = code.replace(/handlePurchaseDate\("([^"]+)", e\.target\.value\)\)\)}/g, 'handlePurchaseDate("$1", e.target.value)}');
code = code.replace(/handlePurchaseDate\("([^"]+)", e\.target\.value\)\)}/g, 'handlePurchaseDate("$1", e.target.value)}');

// Fix the original setForm ones which might have too many ) now
// We want: onChange={e=>setForm(p=>({...p, bankId:e.target.value}))} style=
// Let's just find them and hardcode the correct string
code = code.replace(/onChange=\{e=>setForm\(p=>\(\{\.\.\.p,bankId:e\.target\.value[^}]+\} style=/g, 'onChange={e=>setForm(p=>({...p,bankId:e.target.value}))} style=');
code = code.replace(/onChange=\{e=>setForm\(p=>\(\{\.\.\.p,deductionBank:e\.target\.value[^}]+\} style=/g, 'onChange={e=>setForm(p=>({...p,deductionBank:e.target.value}))} style=');
code = code.replace(/onChange=\{e=>setForm\(p=>\(\{\.\.\.p,connectedBank:e\.target\.value[^}]+\} style=/g, 'onChange={e=>setForm(p=>({...p,connectedBank:e.target.value}))} style=');

// Fix any ...form ones
code = code.replace(/onChange=\{e=>setForm\(\{\.\.\.form, bankId:e\.target\.value[^}]+\} style=/g, 'onChange={e=>setForm({...form, bankId:e.target.value})} style=');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed over replacement.');
