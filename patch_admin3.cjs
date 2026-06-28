const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// 1. AdminSettingsViewLive modifications
const adminStart = code.indexOf('function AdminSettingsViewLive');
const adminEnd = code.indexOf('export default function FinPilotAI');
let adminCode = code.substring(adminStart, adminEnd);

// Platform Form Initial State
adminCode = adminCode.replace(
  'const [platformForm, setPlatformForm] = useState({ name: "" });',
  'const [platformForm, setPlatformForm] = useState({ name: "", brands: [] });'
);
adminCode = adminCode.replace(
  'const handleAddPlatform = () => { setEditingPlatformIdx(null); setPlatformForm({ name: "" }); setShowPlatformModal(true); };',
  'const handleAddPlatform = () => { setEditingPlatformIdx(null); setPlatformForm({ name: "", brands: [] }); setShowPlatformModal(true); };'
);

// Platform Save Logic
adminCode = adminCode.replace(
  'setPlatformMaster([...platformMaster, { name: platformForm.name }]);',
  'setPlatformMaster([...platformMaster, { name: platformForm.name, brands: platformForm.brands || [] }]);'
);

// Platform Grid UI
const platformGridTarget = `<div style={{ fontWeight:700, fontSize:13 }}>{p.name}</div>`;
const platformGridReplace = `<div style={{ flex: 1 }}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{p.name}</div>
                      <div style={{ fontSize:11, color:COLORS.textMuted, display:"flex", flexWrap:"wrap", gap:4, marginTop: 4 }}>
                        {(p.brands || []).map((b, j) => (
                          <span key={j} style={{ background:"rgba(255,255,255,0.1)", padding:"2px 6px", borderRadius:4 }}>{b}</span>
                        ))}
                      </div>
                    </div>`;
adminCode = adminCode.replace(platformGridTarget, platformGridReplace);

// Platform Modal
const platformModalTarget = `<input autoFocus value={platformForm.name} onChange={e => setPlatformForm({...platformForm, name: e.target.value})} style={{ background: "#1a2236", border: \`1px solid \${COLORS.border}\`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>`;
const platformModalReplace = `<input autoFocus value={platformForm.name} onChange={e => setPlatformForm({...platformForm, name: e.target.value})} style={{ background: "#1a2236", border: \`1px solid \${COLORS.border}\`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>BRANDS AVAILABLE (COMMA SEPARATED)</label>
                <input value={(platformForm.brands || []).join(", ")} onChange={e => setPlatformForm({...platformForm, brands: e.target.value.split(",").map(b => b.trim()).filter(b => b)})} style={{ background: "#1a2236", border: \`1px solid \${COLORS.border}\`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} placeholder="e.g. Nike, Puma, Apple" />
              </div>
            </div>`;
adminCode = adminCode.replace(platformModalTarget, platformModalReplace);

code = code.substring(0, adminStart) + adminCode + code.substring(adminEnd);

// 2. AddExpenseModal modifications
const modalStart = code.indexOf('function AddExpenseModal');
const modalEnd = code.indexOf('function ExpenseViewLive');
let modalCode = code.substring(modalStart, modalEnd);

const filterTarget = `const filteredCompanies = form.category
    ? (companyMaster || []).filter(c => c.category?.toLowerCase() === form.category.toLowerCase() || !c.category)
    : (companyMaster || []);`;

const filterReplace = `let filteredCompanies = companyMaster || [];
  if (form.category) {
    filteredCompanies = filteredCompanies.filter(c => c.category?.toLowerCase() === form.category.toLowerCase() || !c.category);
  }
  if (form.platformName) {
    const plat = (platformMaster || []).find(p => p.name.toLowerCase() === form.platformName.toLowerCase());
    if (plat && plat.brands && plat.brands.length > 0) {
      filteredCompanies = filteredCompanies.filter(c => plat.brands.some(b => b.toLowerCase() === c.name.toLowerCase()));
    }
  }`;

modalCode = modalCode.replace(filterTarget, filterReplace);

const handleSaveTarget = `    if (setPlatformMaster && form.platformName) {
      const platExists = platformMaster.some(p => p.name.toLowerCase() === form.platformName.toLowerCase());
      if (!platExists) setPlatformMaster(prev => [...prev, { name: form.platformName }]);
    }`;

const handleSaveReplace = `    if (setPlatformMaster && form.platformName) {
      const platExists = platformMaster.find(p => p.name.toLowerCase() === form.platformName.toLowerCase());
      if (!platExists) {
        setPlatformMaster(prev => [...prev, { name: form.platformName, brands: form.companyName ? [form.companyName] : [] }]);
      } else if (form.companyName && (!platExists.brands || !platExists.brands.some(b => b.toLowerCase() === form.companyName.toLowerCase()))) {
        setPlatformMaster(prev => prev.map(p => p.name.toLowerCase() === form.platformName.toLowerCase() ? { ...p, brands: [...(p.brands || []), form.companyName] } : p));
      }
    }`;

modalCode = modalCode.replace(handleSaveTarget, handleSaveReplace);

code = code.substring(0, modalStart) + modalCode + code.substring(modalEnd);

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Successfully applied platform->brand dependencies.');
