const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

code = code.split('setWData(p => ({ ...p, type: t })}').join('setWData(p => ({ ...p, type: t }))}');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed line 757');
