const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// Replace any broken select tag with a perfectly formed one
code = code.replace(/<select value=\{form\.bankId\|\|""\} onChange=\{[^}]+\}\s*\)?\}?\s*style=\{\{[^}]+\}\}\s*>/g, 
  '<select value={form.bankId||""} onChange={e=>setForm({...form, bankId:e.target.value})} style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${COLORS.border}`, padding: "10px 14px", color: COLORS.text, fontSize: 13, borderRadius: 12, width: "100%", outline: "none" }}>');

code = code.replace(/<select value=\{form\.deductionBank\|\|""\} onChange=\{[^}]+\}\s*\)?\}?\s*style=\{\{[^}]+\}\}\s*>/g, 
  '<select value={form.deductionBank||""} onChange={e=>setForm(p=>({...p, deductionBank:e.target.value}))} style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${COLORS.border}`, padding: "10px 14px", color: COLORS.text, fontSize: 13, borderRadius: 12, width: "100%", outline: "none" }}>');

code = code.replace(/<select value=\{form\.connectedBank\|\|""\} onChange=\{[^}]+\}\s*\)?\}?\s*style=\{\{[^}]+\}\}\s*>/g, 
  '<select value={form.connectedBank||""} onChange={e=>setForm(p=>({...p, connectedBank:e.target.value}))} style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${COLORS.border}`, padding: "10px 14px", color: COLORS.text, fontSize: 13, borderRadius: 12, width: "100%", outline: "none" }}>');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed syntax using precise complete tags.');
