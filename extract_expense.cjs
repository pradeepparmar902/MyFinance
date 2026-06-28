const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');
const expStart = code.indexOf('function ExpenseViewLive');
const expEnd = code.indexOf('function AdminSettingsViewLive');
fs.writeFileSync('src/old_expense.jsx', code.substring(expStart, expEnd), 'utf8');
