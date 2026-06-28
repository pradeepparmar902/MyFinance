import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update form initial state
old_form_state = 'const [form, setForm] = useState({ name:"", provider:"", type:"Medical Insurance", icon:"🛡️", amount:"", cycle:"Annual", startDate:"", endDate:"", moreInfo:"", docLink:"", color:COLORS.primary });'
new_form_state = 'const [form, setForm] = useState({ name:"", provider:"", type:"Medical Insurance", icon:"🛡️", amount:"", coverage:"", cycle:"Annual", startDate:"", endDate:"", moreInfo:"", docLink:"", docName:"", docData:"", color:COLORS.primary });'
code = code.replace(old_form_state, new_form_state)

# 2. Update the "Add Policy" button clear logic
old_add_btn = 'setForm({ name:"", provider:"", type:"Medical Insurance", icon:"🛡️", amount:"", cycle:"Annual", startDate: new Date().toISOString().split(\'T\')[0], endDate:"", moreInfo:"", docLink:"", color:COLORS.primary }); setShowForm(true);'
new_add_btn = 'setForm({ name:"", provider:"", type:"Medical Insurance", icon:"🛡️", amount:"", coverage:"", cycle:"Annual", startDate: new Date().toISOString().split(\'T\')[0], endDate:"", moreInfo:"", docLink:"", docName:"", docData:"", color:COLORS.primary }); setShowForm(true);'
code = code.replace(old_add_btn, new_add_btn)

# 3. Add Coverage input UI
coverage_ui = """            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Coverage Value (Sum Insured)</label>
              <input value={form.coverage || ""} onChange={e=>setForm({...form, coverage: e.target.value})} placeholder="e.g. ₹10,00,000" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>"""

premium_amount_search = '<label style={{ fontSize: 10, color: COLORS.textMuted }}>Premium Amount (₹)</label>'
if coverage_ui not in code:
    code = code.replace(
        premium_amount_search,
        '</label>\n            </div>\n' + coverage_ui + '\n            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>\n              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Premium Amount (₹)</label>'
    )

# 4. Replace Document Link UI with File Upload UI
old_doc_ui = """<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Policy Document Link/Path</label>
              <input value={form.docLink} onChange={e=>setForm({...form, docLink: e.target.value})} placeholder="Drive Link or Local Path" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>"""

new_doc_ui = """            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Upload Policy Document</label>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  if (file.size > 2.5 * 1024 * 1024) {
                    alert("File is too large! Please keep it under 2.5MB to save in browser memory.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setForm({...form, docName: file.name, docData: ev.target.result});
                  };
                  reader.readAsDataURL(file);
                }
              }} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "5px 12px", borderRadius: 8 }} />
              
              {form.docName && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
                  <div style={{fontSize:11, color:COLORS.primary}}>📎 {form.docName}</div>
                  {form.docData && (
                    <button onClick={() => {
                      const a = document.createElement('a');
                      a.href = form.docData;
                      a.download = form.docName;
                      a.click();
                    }} style={{ background: "transparent", color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontSize: 10 }}>Download</button>
                  )}
                </div>
              )}
            </div>"""

code = code.replace(old_doc_ui, new_doc_ui)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Applied coverage and upload patch.")
