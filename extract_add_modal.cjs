const fs = require('fs');
const code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');
const start = code.indexOf('function AddExpenseModal');
const end = code.indexOf('function ExpenseView');
fs.writeFileSync('src/current_modal.jsx', code.substring(start, end), 'utf8');
