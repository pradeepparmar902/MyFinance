const fs = require('fs');
let code = fs.readFileSync('src/old_admin2.jsx', 'utf8');

// Update companyForm init state
code = code.replace(
  'const [companyForm, setCompanyForm] = useState({ name: "" });',
  'const [companyForm, setCompanyForm] = useState({ name: "", category: "", products: [] });'
);
code = code.replace(
  'const handleAddCompany = () => { setEditingCompanyIdx(null); setCompanyForm({ name: "" }); setShowCompanyModal(true); };',
  'const handleAddCompany = () => { setEditingCompanyIdx(null); setCompanyForm({ name: "", category: "", products: [] }); setShowCompanyModal(true); };'
);

// Update save company to init array if missing
code = code.replace(
  'setCompanyMaster([...companyMaster, { name: companyForm.name }]);',
  'setCompanyMaster([...companyMaster, { name: companyForm.name, category: companyForm.category || "", products: companyForm.products || [] }]);'
);

// Update Company Grid UI
const companyGridTarget = `<div style={{ fontWeight:700, fontSize:13 }}>{c.name}</div>`;
const companyGridReplace = `<div style={{ flex: 1 }}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{c.name}</div>
                      <div style={{ fontSize:11, color:COLORS.textMuted, marginBottom: 6 }}>{c.category || "Uncategorized"}</div>
                      <div style={{ fontSize:11, color:COLORS.textMuted, display:"flex", flexWrap:"wrap", gap:4 }}>
                        {(c.products || []).map((p, j) => (
                          <span key={j} style={{ background:"rgba(255,255,255,0.1)", padding:"2px 6px", borderRadius:4 }}>{p}</span>
                        ))}
                      </div>
                    </div>`;
code = code.replace(companyGridTarget, companyGridReplace);

// Update Company Modal
const companyModalTarget = `<input autoFocus value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} style={{ background: "#1a2236", border: \`1px solid \${COLORS.border}\`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>`;
const companyModalReplace = `<input autoFocus value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} style={{ background: "#1a2236", border: \`1px solid \${COLORS.border}\`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>DEFAULT CATEGORY</label>
                <input list="company-category-admin" value={companyForm.category || ""} onChange={e => setCompanyForm({...companyForm, category: e.target.value})} style={{ background: "#1a2236", border: \`1px solid \${COLORS.border}\`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} />
                <datalist id="company-category-admin">
                  {categoryMaster.map((cat, idx) => <option key={idx} value={cat.name} />)}
                </datalist>
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>PRODUCTS (COMMA SEPARATED)</label>
                <input value={(companyForm.products || []).join(", ")} onChange={e => setCompanyForm({...companyForm, products: e.target.value.split(",").map(p => p.trim()).filter(p => p)})} style={{ background: "#1a2236", border: \`1px solid \${COLORS.border}\`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} placeholder="e.g. TV, Headphones" />
              </div>
            </div>`;
code = code.replace(companyModalTarget, companyModalReplace);

fs.writeFileSync('src/old_admin2_patched.jsx', code, 'utf8');
