const { execSync } = require('child_process');
const fs = require('fs');

let iterations = 0;
while (iterations < 50) {
  iterations++;
  try {
    execSync('npx esbuild src/FinPilotAI.jsx', { stdio: 'pipe' });
    console.log('Build succeeded!');
    break;
  } catch (err) {
    const output = err.stderr ? err.stderr.toString() : err.message;
    const match = output.match(/src\/FinPilotAI\.jsx:(\d+):\d+:/);
    if (match) {
      const lineNum = parseInt(match[1], 10) - 1;
      let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');
      let lines = code.split('\n');
      
      const expectedBrace = output.includes('Expected "}" but found ")"');
      const expectedParen = output.includes('Expected ")" but found "}"');
      
      if (expectedBrace) {
         lines[lineNum] = lines[lineNum].replace('))}', ')}');
         console.log(`Fixed line ${lineNum + 1}: replaced ))} with )}`);
      } else if (expectedParen) {
         if (lines[lineNum].includes(')}')) {
             lines[lineNum] = lines[lineNum].replace(')}', '))}');
             console.log(`Fixed line ${lineNum + 1}: replaced )} with ))}`);
         } else if (lines[lineNum].includes('}')) {
             lines[lineNum] = lines[lineNum].replace('}', ')}');
             console.log(`Fixed line ${lineNum + 1}: replaced } with )}`);
         }
      } else {
         console.log('Unknown error on line ' + (lineNum + 1) + '\n' + output);
         break;
      }
      fs.writeFileSync('src/FinPilotAI.jsx', lines.join('\n'), 'utf8');
    } else {
      console.log('Could not parse error:\n' + output);
      break;
    }
  }
}
