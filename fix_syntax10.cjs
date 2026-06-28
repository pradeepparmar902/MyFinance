const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

code = code.replace(/value\}\)\)\} style=/g, 'value}))} style='); // Undo any double } if they exist
code = code.replace(/e\.target\.value\)\)\} style=/g, 'e.target.value}))} style=');
code = code.replace(/e\.target\.value\)\} style=/g, 'e.target.value}))} style=');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed missing object literal closing brace.');
