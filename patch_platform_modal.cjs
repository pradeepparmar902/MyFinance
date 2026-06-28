const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

const target = `              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>BRANDS AVAILABLE (COMMA SEPARATED)</label>
                <input value={(platformForm.brands || []).join(", ")} onChange={e => setPlatformForm({...platformForm, brands: e.target.value.split(",").map(b => b.trim()).filter(b => b)})} style={{ background: "#1a2236", border: \`1px solid \${COLORS.border}\`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} placeholder="e.g. Nike, Puma, Apple" />
              </div>`;

const replacement = `              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>SELECT BRANDS</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, background: "#1a2236", border: \`1px solid \${COLORS.border}\`, borderRadius: 9, padding: "9px 12px", maxHeight: 150, overflowY: "auto" }}>
                  {companyMaster.map(c => {
                    const isSelected = (platformForm.brands || []).includes(c.name);
                    return (
                      <button key={c.name} onClick={() => {
                        const newBrands = isSelected
                          ? (platformForm.brands || []).filter(b => b !== c.name)
                          : [...(platformForm.brands || []), c.name];
                        setPlatformForm({...platformForm, brands: newBrands});
                      }} style={{
                        padding: "5px 11px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                        border: \`1px solid \${isSelected ? COLORS.primary : COLORS.border}\`,
                        background: isSelected ? \`\${COLORS.primary}22\` : "transparent",
                        color: isSelected ? COLORS.primary : COLORS.textMuted, transition: "all 0.15s"
                      }}>{c.name}</button>
                    );
                  })}
                  {companyMaster.length === 0 && <div style={{ fontSize: 11, color: COLORS.textMuted }}>No brands added yet. Add some in Companies & Brands.</div>}
                </div>
              </div>`;

code = code.replace(target, replacement);

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Platform modal patched successfully.');
