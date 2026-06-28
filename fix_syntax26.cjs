const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// Replace any occurrence of `+e.target.value))}` with `+e.target.value)}`
code = code.replace(/\+e\.target\.value\)\)+\}/g, '+e.target.value)}');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed globally with +.');
