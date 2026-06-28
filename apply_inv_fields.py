import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update routing
old_route = 'case "investments":  return <InvestmentsViewLive investments={investments} setInvestments={setInvestments} />;'
new_route = 'case "investments":  return <InvestmentsViewLive investments={investments} setInvestments={setInvestments} goals={goals} />;'
code = code.replace(old_route, new_route)

# 2. Update signature
old_sig = 'function InvestmentsViewLive({ investments, setInvestments }) {'
new_sig = 'function InvestmentsViewLive({ investments, setInvestments, goals }) {'
code = code.replace(old_sig, new_sig)

# 3. Add to form state
old_form = 'endDate:"", remarks:"", docName:"", docData:"", status:"Active", color:COLORS.secondary });'
new_form = 'endDate:"", remarks:"", linkedGoal:"", docName:"", docData:"", status:"Active", color:COLORS.secondary });'
code = code.replace(old_form, new_form)

# 4. Inject UI
ui_inject = """            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>More Information / Purpose</label><input value={form.remarks||""} onChange={e=>setForm({...form, remarks: e.target.value})} placeholder="Purpose of investment" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Linked Goal</label><select value={form.linkedGoal||""} onChange={e=>setForm({...form, linkedGoal: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="">None</option>{goals && goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>"""

target_ui = '<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>\n              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Upload Certificate</label>'
if 'More Information / Purpose' not in code:
    code = code.replace(target_ui, ui_inject + '\n            ' + target_ui)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Applied extra fields to InvestmentsViewLive")
