const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');
const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('))}')) {
    console.log(`Line ${i+1}: ${lines[i].trim()}`);
  }
}
