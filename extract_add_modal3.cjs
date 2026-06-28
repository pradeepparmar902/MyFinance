const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');
const modalStart = code.indexOf('function AddExpenseModal');
const modalEnd = code.indexOf('function ExpenseView');
fs.writeFileSync('src/current_modal3.jsx', code.substring(modalStart, modalEnd), 'utf8');
