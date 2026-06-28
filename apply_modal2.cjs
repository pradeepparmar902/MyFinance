const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');
let newModal = fs.readFileSync('src/old_add_modal2_patched.jsx', 'utf8');

const modalStart = code.indexOf('function AddExpenseModal');
const modalEnd = code.indexOf('function ExpenseViewLive');

const patchedCode = code.substring(0, modalStart) + newModal + code.substring(modalEnd);
fs.writeFileSync('src/FinPilotAI.jsx', patchedCode, 'utf8');
console.log('Patched AddExpenseModal successfully!');
