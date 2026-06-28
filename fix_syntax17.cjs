const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

code = code.replace('onChange={e => handlePurchaseDate("purchaseDay", e.target.value}))}', 'onChange={e => handlePurchaseDate("purchaseDay", e.target.value)}');
code = code.replace('onChange={e => handlePurchaseDate("purchaseMonth", e.target.value}))}', 'onChange={e => handlePurchaseDate("purchaseMonth", e.target.value)}');
code = code.replace('onChange={e => handlePurchaseDate("purchaseYear", e.target.value}))}', 'onChange={e => handlePurchaseDate("purchaseYear", e.target.value)}');
code = code.replace('onChange={e => handlePurchaseDate("warrantyYears", e.target.value}))}', 'onChange={e => handlePurchaseDate("warrantyYears", e.target.value)}');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed handlePurchaseDate explicitly.');
