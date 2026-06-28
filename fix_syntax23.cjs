const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

code = code.replace(/f\.set\(\+e\.target\.value\)\)\)\}/g, 'f.set(+e.target.value)}');
code = code.replace(/f\.set\(\+e\.target\.value\)\)\}/g, 'f.set(+e.target.value)}');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed f.set explicitly.');
