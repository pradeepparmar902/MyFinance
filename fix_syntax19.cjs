const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// Literally split and join to replace all remaining instances of the bad replace
code = code.split('e.target.value))} style={').join('e.target.value)} style={');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed handlePeriodChange explicitly with split/join.');
