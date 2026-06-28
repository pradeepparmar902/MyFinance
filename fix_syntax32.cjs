const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');
const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '))}') {
    // Traverse backwards to find what opened it.
    let j = i - 1;
    let depthParen = 0;
    let depthBrace = 0;
    let foundOpener = null;
    
    while (j >= 0) {
      let line = lines[j];
      // simplified counting...
      for (let c = line.length - 1; c >= 0; c--) {
        if (line[c] === ')') depthParen++;
        if (line[c] === '}') depthBrace++;
        if (line[c] === '(') depthParen--;
        if (line[c] === '{') depthBrace--;
        
        if (depthParen < 0 || depthBrace < 0) {
           // We found an opener!
           if (depthParen < 0) {
             foundOpener = '(';
             break;
           }
        }
      }
      
      if (foundOpener === '(') {
         if (line.includes('&& (') || line.includes('? (') || line.includes('|| (')) {
           // It's a condition!
           lines[i] = lines[i].replace('))}', ')}');
         }
         break;
      }
      j--;
    }
  }
}
fs.writeFileSync('src/FinPilotAI.jsx', lines.join('\n'), 'utf8');
console.log('Fixed parens heuristically.');
