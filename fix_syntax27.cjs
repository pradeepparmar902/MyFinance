const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// Fix f.set
code = code.replace(/f\.set\(\+e\.target\.value\)\)\}/g, 'f.set(+e.target.value)}');

// Fix setXYZ({...xyz, prop: e.target.value}))} -> setXYZ({...xyz, prop: e.target.value})}
code = code.replace(/(\{[^{}]+\.\.\.[a-zA-Z0-9_]+[^}]*e\.target\.value\})\)\}/g, '$1}');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed all broken set methods globally.');
