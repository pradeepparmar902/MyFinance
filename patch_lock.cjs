const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// 1. Add isCategoryLocked state
code = code.replace(
  'const [quickSelectText, setQuickSelectText] = useState("");',
  'const [quickSelectText, setQuickSelectText] = useState("");\n  const [isCategoryLocked, setIsCategoryLocked] = useState(false);'
);

// 2. Set lock in handleQuickSelect
code = code.replace(
  'setQuickSelectText(""); // clear after selection so it doesnt clutter',
  'setIsCategoryLocked(true);\n      setQuickSelectText(""); // clear after selection so it doesnt clutter'
);

// 3. Unlock on product name change
code = code.replace(
  'onChange={e => setForm(p => ({ ...p, productName: e.target.value }))}',
  'onChange={e => { setForm(p => ({ ...p, productName: e.target.value })); setIsCategoryLocked(false); }}'
);

// 4. Update category buttons to use the lock
const oldCatButton = `<button key={c} onClick={() => setForm(p => ({ ...p, category: c }))} style={{
                    padding: "5px 11px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                    border: \`1px solid \${form.category === c ? COLORS.primary : COLORS.border}\`,
                    background: form.category === c ? \`\${COLORS.primary}22\` : "transparent",
                    color: form.category === c ? COLORS.primary : COLORS.textMuted, transition: "all 0.15s"
                  }}>{c}</button>`;

const newCatButton = `<button key={c} disabled={isCategoryLocked} onClick={() => setForm(p => ({ ...p, category: c }))} style={{
                    padding: "5px 11px", borderRadius: 20, fontSize: 11, cursor: isCategoryLocked ? "not-allowed" : "pointer",
                    opacity: isCategoryLocked && form.category !== c ? 0.3 : 1,
                    border: \`1px solid \${form.category === c ? COLORS.primary : COLORS.border}\`,
                    background: form.category === c ? \`\${COLORS.primary}22\` : "transparent",
                    color: form.category === c ? COLORS.primary : COLORS.textMuted, transition: "all 0.15s"
                  }}>{c}</button>`;

code = code.replace(oldCatButton, newCatButton);

// Also add a small note near CATEGORY label if locked
code = code.replace(
  '<label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>CATEGORY</label>',
  '<label style={{ fontSize: 11, color: COLORS.textMuted, display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span>CATEGORY</span> {isCategoryLocked && <span style={{ color: COLORS.accent, fontSize: 10 }}>?? Locked by Quick-Select</span>}</label>'
);

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Successfully patched category locking logic.');
