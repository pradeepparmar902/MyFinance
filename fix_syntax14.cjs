const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

code = code.replace(/handlePurchaseDate\("purchaseDay", e\.target\.value\)\)\}/g, 'handlePurchaseDate("purchaseDay", e.target.value)}');
code = code.replace(/handlePurchaseDate\("purchaseMonth", e\.target\.value\)\)\}/g, 'handlePurchaseDate("purchaseMonth", e.target.value)}');
code = code.replace(/handlePurchaseDate\("purchaseYear", e\.target\.value\)\)\}/g, 'handlePurchaseDate("purchaseYear", e.target.value)}');
code = code.replace(/handlePurchaseDate\("warrantyYears", e\.target\.value\)\)\}/g, 'handlePurchaseDate("warrantyYears", e.target.value)}');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed handlePurchaseDate explicitly.');
