import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

sub_start = code.find("function SubscriptionsView")
ins_start = code.find("function InsuranceView")

sub_code = code[sub_start:ins_start]

# The pills UI
pills_ui = """            <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:8, marginBottom:16 }}>
        {["All","Medical Insurance","Life Insurance","Motor Insurance","Term Insurance","Home Insurance","Other"].map(c => (
          <div key={c} onClick={() => setInsFilter(c)} style={{ whiteSpace:"nowrap", padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", background: insFilter===c ? COLORS.primary : "#1e293b", color: insFilter===c ? "#fff" : COLORS.textMuted }}>{c}</div>
        ))}
      </div>"""

if pills_ui in sub_code:
    sub_code = sub_code.replace(pills_ui + '\n\n', '')
    sub_code = sub_code.replace(pills_ui + '\n', '')
    sub_code = sub_code.replace(pills_ui, '')
    
    code = code[:sub_start] + sub_code + code[ins_start:]
    print("Removed bad pills UI from SubscriptionsView!")

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

