const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

code = code.split('e.target.value))} style=').join('e.target.value)} style=');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed handlePeriodChange explicitly with correct split/join.');
