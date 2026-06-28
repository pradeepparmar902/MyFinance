const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');
const adminStartClean = code.indexOf('function AdminSettingsViewLive');
const adminEndClean = code.indexOf('export default function FinPilotAI');
fs.writeFileSync('src/old_admin2.jsx', code.substring(adminStartClean, adminEndClean), 'utf8');
