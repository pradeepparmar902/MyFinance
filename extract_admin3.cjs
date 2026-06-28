const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');
const adminStart = code.indexOf('function AdminSettingsViewLive');
const adminEnd = code.indexOf('export default function FinPilotAI');
fs.writeFileSync('src/admin3.jsx', code.substring(adminStart, adminEnd), 'utf8');
