const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// 1. Add Hooks
const categoryHookStr = '  const [categoryMaster, setCategoryMaster] = useLocalStorage("fp_category_master", [';
const categoryHookEnd = code.indexOf('  ]);', code.indexOf(categoryHookStr)) + 5;
const extraHooks = `
  const [companyMaster, setCompanyMaster] = useLocalStorage("fp_company_master", []);
  const [platformMaster, setPlatformMaster] = useLocalStorage("fp_platform_master", []);
`;
code = code.substring(0, categoryHookEnd) + '\n' + extraHooks + code.substring(categoryHookEnd);

// 2. Add Props to component calls
const propString = ' companyMaster={companyMaster} setCompanyMaster={setCompanyMaster} platformMaster={platformMaster} setPlatformMaster={setPlatformMaster} ';

code = code.replace(/<AdminSettingsViewLive([^>]*?)>/g, '<AdminSettingsViewLive$1' + propString + '>');
code = code.replace(/<ExpenseViewLive([^>]*?)>/g, '<ExpenseViewLive$1' + propString + '>');
code = code.replace(/<AddExpenseModal([^>]*?)onClose=/g, '<AddExpenseModal$1' + propString + ' onClose=');

// 3. Add Props to component signatures
code = code.replace(/function AdminSettingsViewLive\(\{([^\}]*?)\}\) \{/, function(match, p1) {
    return 'function AdminSettingsViewLive({' + p1 + ', companyMaster = [], setCompanyMaster, platformMaster = [], setPlatformMaster}) {';
});

code = code.replace(/function ExpenseViewLive\(\{([^\}]*?)\\}\) \{/, function(match, p1) {
    return 'function ExpenseViewLive({' + p1 + ', companyMaster = [], setCompanyMaster, platformMaster = [], setPlatformMaster}) {';
});

code = code.replace(/function AddExpenseModal\(\{([^\}]*?)\}\) \{/, function(match, p1) {
    return 'function AddExpenseModal({' + p1 + ', companyMaster, setCompanyMaster, platformMaster, setPlatformMaster}) {';
});

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Props and hooks added!');
