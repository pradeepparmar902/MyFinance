const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

code = code.replace(/value\}\)\) style=\{\{/g, 'value\}))} style={{');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed syntax by adding the missing }');
