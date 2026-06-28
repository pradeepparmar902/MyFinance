import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update form initial state
old_form = 'const [form, setForm] = useState({ name:"", icon:"🎬", amount:"", cycle:"Monthly", startDate:"", endDate:"", remarks:"", bank:"", color:COLORS.primary, category:"Entertainment" });'
new_form = 'const [form, setForm] = useState({ name:"", icon:"🎬", amount:"", cycle:"Monthly", status:"Active", startDate:"", endDate:"", remarks:"", bank:"", color:COLORS.primary, category:"Entertainment" });'
code = code.replace(old_form, new_form)

# 2. Update Add Sub reset state
old_add_btn = 'setForm({ name:"", icon:"🎬", amount:"", cycle:"Monthly", startDate: new Date().toISOString().split(\'T\')[0], endDate:"", remarks:"", bank:"", color:COLORS.primary, category:"Entertainment" });'
new_add_btn = 'setForm({ name:"", icon:"🎬", amount:"", cycle:"Monthly", status:"Active", startDate: new Date().toISOString().split(\'T\')[0], endDate:"", remarks:"", bank:"", color:COLORS.primary, category:"Entertainment" });'
code = code.replace(old_add_btn, new_add_btn)

# 3. Update monthly and annual cost calculations
old_monthly = 'const monthlyTotal = subscriptions ? subscriptions.filter(s=>s.cycle==="Monthly").reduce((a,s)=>a+s.amount,0) : 0;'
new_monthly = 'const monthlyTotal = subscriptions ? subscriptions.filter(s=>s.cycle==="Monthly" && s.status!=="Paused").reduce((a,s)=>a+s.amount,0) : 0;'
code = code.replace(old_monthly, new_monthly)

old_annual = 'const annualCost   = subscriptions ? subscriptions.reduce((a,s)=>a+(s.cycle==="Monthly"?s.amount*12:s.amount),0) : 0;'
new_annual = 'const annualCost   = subscriptions ? subscriptions.filter(s=>s.status!=="Paused").reduce((a,s)=>a+(s.cycle==="Monthly"?s.amount*12:s.amount),0) : 0;'
code = code.replace(old_annual, new_annual)

# 4. Inject Status dropdown into the form
status_ui = """            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Status</label>
              <select value={form.status || "Active"} onChange={e=>setForm({...form, status: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}>
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
              </select>
            </div>"""

cat_search = '<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>\n              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Category</label>'
if status_ui not in code:
    code = code.replace(cat_search, status_ui + '\n            \n            ' + cat_search)

# 5. Update card appearance
old_card_style = 'style={{ background:"#1a2236",borderRadius:12,border:`1px solid ${COLORS.border}`,position:"relative",overflow:"hidden",cursor:"pointer" }}'
new_card_style = 'style={{ background:"#1a2236",borderRadius:12,border:`1px solid ${COLORS.border}`,position:"relative",overflow:"hidden",cursor:"pointer", opacity: s.status==="Paused"?0.6:1 }}'
code = code.replace(old_card_style, new_card_style)

old_cycle_badge = '<div style={{ fontSize:9,background:"rgba(255,255,255,0.1)",padding:"2px 8px",borderRadius:12,color:COLORS.textMuted }}>{s.cycle}</div>'
new_cycle_badge = '<div style={{ fontSize:9,background:s.status==="Paused"?"#f59e0b33":"rgba(255,255,255,0.1)",padding:"2px 8px",borderRadius:12,color:s.status==="Paused"?"#f59e0b":COLORS.textMuted }}>{s.status==="Paused" ? "Paused" : s.cycle}</div>'
code = code.replace(old_cycle_badge, new_cycle_badge)

# 6. Ignore paused subs in getDueSubscriptions
old_get_due = '  subscriptions.forEach(sub => {\n    if (!sub.startDate) return;'
new_get_due = '  subscriptions.forEach(sub => {\n    if (sub.status === "Paused" || !sub.startDate) return;'
code = code.replace(old_get_due, new_get_due)

# 7. Also handle "Active Subs" metric to not count paused ones
old_active_count = '<div style={{ fontSize:16,fontWeight:700,color:"#3B82F6" }}>{subscriptions ? subscriptions.length : 0}</div>'
new_active_count = '<div style={{ fontSize:16,fontWeight:700,color:"#3B82F6" }}>{subscriptions ? subscriptions.filter(s=>s.status!=="Paused").length : 0}</div>'
code = code.replace(old_active_count, new_active_count)


with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Applied Pause Subscription patch!")
