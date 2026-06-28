const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// The bad script `code = code.replace(/e\.target\.value\)\)\} style=/g, 'e.target.value}))} style=');`
// replaced `e.target.value)} style=` with `e.target.value}))} style=`. Wait, no, it replaced `e.target.value))} style=` with `e.target.value}))} style=`.

// Let's just fix the remaining ones by explicitly looking for what failed:
code = code.replace(/handlePeriodChange\("unit", e\.target\.value\)\)\}/g, 'handlePeriodChange("unit", e.target.value)}');

// To be safe, any handleX("...", e.target.value))} should be handleX("...", e.target.value)}
code = code.replace(/([a-zA-Z0-9_]+)\("([^"]+)", e\.target\.value\)\)\}/g, '$1("$2", e.target.value)}');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed handlePeriodChange and similar.');
