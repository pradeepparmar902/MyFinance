const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

code = code.split('e.target.value)))}').join('e.target.value)}');
code = code.split('e.target.value))}').join('e.target.value)}');
code = code.split('e.target.value)) }').join('e.target.value)}');

// And specifically fix the setForm ones that I broke in the process if any
code = code.split('e=>setForm(p=>({...p,bankId:e.target.value}))}').join('e=>setForm(p=>({...p,bankId:e.target.value}))}'); // Should be fine
code = code.split('e=>setForm({...form, type: e.target.value}))}').join('e=>setForm({...form, type: e.target.value})}');
code = code.split('e=>setForm({...form, amount: e.target.value}))}').join('e=>setForm({...form, amount: e.target.value})}');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed handlePurchaseDate explicitly with split/join.');
