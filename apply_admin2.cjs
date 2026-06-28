const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');
let newAdmin = fs.readFileSync('src/old_admin2_patched.jsx', 'utf8');

const adminStartClean = code.indexOf('function AdminSettingsViewLive');
const adminEndClean = code.indexOf('export default function FinPilotAI');

const patchedCode = code.substring(0, adminStartClean) + newAdmin + '\n\n' + code.substring(adminEndClean);
fs.writeFileSync('src/FinPilotAI.jsx', patchedCode, 'utf8');
console.log('Patched AdminSettingsViewLive successfully!');
