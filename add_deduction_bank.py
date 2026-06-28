import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add to form state
old_form = 'emiAmount:"", remarks:"", linkedGoal:"", icon:"🏠", color:COLORS.primary });'
if old_form not in code:
    code = code.replace('rateHistory:[], emiAmount:"", remarks:"", linkedGoal:"", icon:"🏠", color:COLORS.primary });', 'rateHistory:[], emiAmount:"", deductionBank:"", remarks:"", linkedGoal:"", icon:"🏠", color:COLORS.primary });')

old_reset1 = 'rateHistory:[], emiAmount:"", remarks:"", linkedGoal:"", icon:"🏠", color:COLORS.primary }); setShowForm(true); }} style={{ background: COLORS.primary'
new_reset1 = 'rateHistory:[], emiAmount:"", deductionBank:"", remarks:"", linkedGoal:"", icon:"🏠", color:COLORS.primary }); setShowForm(true); }} style={{ background: COLORS.primary'
code = code.replace(old_reset1, new_reset1)

# 2. Add UI field
ui_field = """<div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Deduction Bank Account</label><input value={form.deductionBank||""} onChange={e=>setForm({...form, deductionBank: e.target.value})} placeholder="e.g. HDFC Savings" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>"""

target_ui = '<div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>More Information / Purpose</label>'
if 'Deduction Bank Account' not in code:
    code = code.replace(target_ui, ui_field + '\n              ' + target_ui)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Added Deduction Bank field successfully.")
