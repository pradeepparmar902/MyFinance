const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');
const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === ')}') {
    lines[i] = lines[i].replace(')}', '))}');
  }
}
fs.writeFileSync('src/FinPilotAI.jsx', lines.join('\n'), 'utf8');
console.log('Restored standalone )} to ))}');
