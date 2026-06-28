const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

const target1 = '<div style={{ fontSize:14, fontWeight:600, color:COLORS.text }}>{t.vendor || t.storeName || t.title}</div>';
const replace1 = '<div style={{ fontSize:14, fontWeight:600, color:COLORS.text }}>{t.vendor || t.storeName || t.title} {t.platformName && <span style={{ fontSize: 11, color: COLORS.secondary, fontWeight: 500, marginLeft: 6 }}>({t.platformName})</span>}</div>';

const target2 = '<div style={{ fontSize:12, color:COLORS.textMuted }}>';
const replace2 = '<div style={{ fontSize:12, color:COLORS.textMuted }}>\n                  {t.companyName && <span style={{ color: COLORS.primary, fontWeight: 600 }}>{t.companyName} • </span>}';

code = code.replace(target1, replace1).replace(target2, replace2);

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('ExpenseViewLive patched');
