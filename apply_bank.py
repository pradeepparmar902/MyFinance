import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# Update useState
code = code.replace(
  'remarks:"", color:COLORS.primary',
  'remarks:"", bank:"", color:COLORS.primary'
)

# Update Add Sub button
code = code.replace(
  'endDate:"", remarks:"", color:COLORS.primary',
  'endDate:"", remarks:"", bank:"", color:COLORS.primary'
)

# Inject UI field after Remarks
remarks_ui = '<input value={form.remarks} onChange={e=>setForm({...form, remarks: e.target.value})} placeholder="Purpose, connected ID, etc." style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />\n            </div>'

bank_ui = """
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Connected Bank / Card</label>
              <input value={form.bank || ""} onChange={e=>setForm({...form, bank: e.target.value})} placeholder="e.g. HDFC Credit Card" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>"""

if remarks_ui in code:
    code = code.replace(remarks_ui, remarks_ui + bank_ui)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)
print("Added bank field!")
