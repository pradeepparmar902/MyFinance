const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

code = code.replace(/e\.target\.value\}\)\} style=/g, 'e.target.value}))} style=');
code = code.replace(/e\.target\.value\}\} style=/g, 'e.target.value}))} style=');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed syntax by adding missing ) and }');
