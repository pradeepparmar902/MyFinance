const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// 1. Add companyMaster, platformMaster to ExpenseViewLive props
const targetProps = `function ExpenseViewLive({ expenses, setExpenses, filter, subscriptions, setSubscriptions, insurance, setInsurance, investments, setInvestments, loans, setLoans, creditCards, setCreditCards, banks, setDeletedTransactions , vendorMaster, setVendorMaster, categoryMaster, setCategoryMaster }) {`;
const replaceProps = `function ExpenseViewLive({ expenses, setExpenses, filter, subscriptions, setSubscriptions, insurance, setInsurance, investments, setInvestments, loans, setLoans, creditCards, setCreditCards, banks, setDeletedTransactions , vendorMaster, setVendorMaster, categoryMaster, setCategoryMaster, companyMaster, setCompanyMaster, platformMaster, setPlatformMaster }) {`;
code = code.replace(targetProps, replaceProps);

// 2. Add vendorMaster, categoryMaster to AddExpenseModal call inside ExpenseViewLive
const targetCall = `<AddExpenseModal banks={banks} creditCards={creditCards}  companyMaster={companyMaster} setCompanyMaster={setCompanyMaster} platformMaster={platformMaster} setPlatformMaster={setPlatformMaster}  onClose={() => setShowAdd(false)} onSave={(t) => {`;
const replaceCall = `<AddExpenseModal banks={banks} creditCards={creditCards} vendorMaster={vendorMaster} setVendorMaster={setVendorMaster} categoryMaster={categoryMaster} setCategoryMaster={setCategoryMaster} companyMaster={companyMaster} setCompanyMaster={setCompanyMaster} platformMaster={platformMaster} setPlatformMaster={setPlatformMaster} onClose={() => setShowAdd(false)} onSave={(t) => {`;
code = code.replace(targetCall, replaceCall);

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('ExpenseViewLive patched to fix missing variables.');
