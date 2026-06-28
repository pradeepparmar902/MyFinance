const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

code = code.replace(/handlePurchaseDate\("([a-zA-Z0-9]+)", e\.target\.value\)\)\}/g, 'handlePurchaseDate("$1", e.target.value)}');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed handlePurchaseDate syntax.');
