import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# Add insFilter state
state_search = 'const [form, setForm] = useState({ name:"", provider:"", type:"Medical Insurance",'
state_replace = 'const [insFilter, setInsFilter] = useState("All");\n  const [form, setForm] = useState({ name:"", provider:"", type:"Medical Insurance",'
code = code.replace(state_search, state_replace)

# Add displayedInsurance logic
filter_logic = """  const displayedInsurance = insFilter === "All" ? insurance : (insurance || []).filter(i => i.type === insFilter);"""
annual_total_search = 'const annualTotal = insurance ? insurance.reduce((a,s)=>{'
code = code.replace(annual_total_search, filter_logic + '\n\n  ' + annual_total_search)

# Inject pills UI before the list
pills_ui = """      <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:8, marginBottom:16 }}>
        {["All","Medical Insurance","Life Insurance","Motor Insurance","Term Insurance","Home Insurance","Other"].map(c => (
          <div key={c} onClick={() => setInsFilter(c)} style={{ whiteSpace:"nowrap", padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", background: insFilter===c ? COLORS.primary : "#1e293b", color: insFilter===c ? "#fff" : COLORS.textMuted }}>{c}</div>
        ))}
      </div>
"""
grid_search = '<div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12 }}>'
code = code.replace(grid_search, pills_ui + '\n      ' + grid_search)

# Change map to use displayedInsurance
code = code.replace(
    '{insurance && insurance.map((s,i) => (',
    '{displayedInsurance && displayedInsurance.map((s,i) => ('
)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Applied filter patch.")
