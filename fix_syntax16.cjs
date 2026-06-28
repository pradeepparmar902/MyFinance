const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// The issue is `handlePurchaseDate("...", e.target.value))}` -> we want `)}` instead of `))}`
code = code.replace(/handlePurchaseDate\("([^"]+)", e\.target\.value\)\)+\}/g, 'handlePurchaseDate("$1", e.target.value)}');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed handlePurchaseDate correctly.');
