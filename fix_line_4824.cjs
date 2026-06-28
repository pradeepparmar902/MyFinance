const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');
let lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
   if (lines[i].includes('))))))')) {
      lines[i] = lines[i].replace(/\)\)+\}/g, ')}'); // Replace infinite parens with just )}
   }
}
fs.writeFileSync('src/FinPilotAI.jsx', lines.join('\n'), 'utf8');
console.log('Fixed infinite parens.');
