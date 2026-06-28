const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');
const modalStart = code.indexOf('function AddExpenseModal');
const modalEnd = code.indexOf('function ExpenseViewLive');
fs.writeFileSync('src/old_add_modal2.jsx', code.substring(modalStart, modalEnd), 'utf8');
