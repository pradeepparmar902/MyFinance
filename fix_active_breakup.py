import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

modal_code = """      {activeBreakup && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, width: "90%", maxWidth: 500, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>{activeBreakup.title} Breakup</div>
              <button onClick={() => setActiveBreakup(null)} style={{ background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 20 }}>&times;</button>
            </div>
            
            <div style={{ overflowY: "auto", flex: 1, paddingRight: 8 }}>
              {activeBreakup.data.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${item.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{item.loanName} <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 400 }}>• {item.bank}</span></div>
                      <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>Inst #{item.monthIdx} • Due: {item.date}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>₹{item.amount.toLocaleString("en-IN", {maximumFractionDigits:0})}</div>
                    <div style={{ fontSize: 10, color: COLORS.textMuted }}>P: {item.principal.toLocaleString("en-IN", {maximumFractionDigits:0})} | I: {item.interest.toLocaleString("en-IN", {maximumFractionDigits:0})}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
"""

# Strip out ALL occurrences first
code = code.replace(modal_code + '\n      {showForm && (', '{showForm && (')

# Find EMIViewLive specifically
# The signature is: function EMIViewLive({ loans, setLoans, goals }) {
idx = code.find('function EMIViewLive({ loans, setLoans, goals }) {')
if idx != -1:
    # Find the next `{showForm && (` AFTER EMIViewLive declaration
    idx2 = code.find('{showForm && (', idx)
    if idx2 != -1:
        # Inject it exactly there
        code = code[:idx2] + modal_code + '\n      ' + code[idx2:]

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Cleaned up redundant activeBreakup modals and restored correctly.")
