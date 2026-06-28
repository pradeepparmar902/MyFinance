const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// Any setX(p => ({ ...p, Y: Z })} should be setX(p => ({ ...p, Y: Z }))}
code = code.replace(/([a-zA-Z0-9_]+)\(p => \(\{ \.\.\.p, ([^:]+): ([^\}]+)\ \}\)\}/g, '$1(p => ({ ...p, $2: $3 }))}');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed missing parens in updater functions.');
