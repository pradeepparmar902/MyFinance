import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

due_ins_ui = """      {dueIns.length > 0 && (
        <div style={{ background: COLORS.secondary + "20", border: `1px solid ${COLORS.secondary}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.secondary, marginBottom: 12 }}>🛡️ Due Insurance Premiums ({dueIns.length})</div>
          <div style={{ display: "grid", gap: 10 }}>
            {dueIns.map(ins => (
              <div key={ins.insId + "-" + ins.dueDate} style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{ins.icon} {ins.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>Cycle: {ins.cycle}   Due: {fmtDate(ins.dueDate)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.secondary }}>₹{ins.amount.toLocaleString("en-IN")}</div>
                  {payingIns && payingIns.ins.insId === ins.insId && payingIns.ins.dueDate === ins.dueDate ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input type="date" value={payingIns.date} onChange={e => setPayingIns({...payingIns, date: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "4px 8px", borderRadius: 4 }} />
                        <input type="number" value={payingIns.amount} onChange={e => setPayingIns({...payingIns, amount: e.target.value})} style={{ width: 80, background: "#1a2236", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "4px 8px", borderRadius: 4 }} />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={handlePayInsConfirm} style={{ background: COLORS.primary, color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>Confirm</button>
                        <button onClick={() => setPayingIns(null)} style={{ background: "transparent", color: COLORS.textMuted, border: `1px solid ${COLORS.border}`, padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setPayingIns({ ins, date: ins.dueDate, amount: ins.amount })} style={{ background: COLORS.secondary, color: "#fff", border: "none", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Pay Now</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
"""

# 1. Remove it from wherever it is currently
if due_ins_ui in code:
    code = code.replace(due_ins_ui + '\n', '')
    print("Removed misplaced dueIns block.")

# 2. Insert it into ExpenseViewLive!
# We can find `ExpenseViewLive` start, then find `return (` and `<div>`.
expense_idx = code.find("function ExpenseViewLive({")
if expense_idx != -1:
    return_idx = code.find("return (", expense_idx)
    div_idx = code.find("<div>", return_idx)
    if div_idx != -1:
        insert_pos = div_idx + 5
        code = code[:insert_pos] + '\n' + due_ins_ui + code[insert_pos:]
        print("Successfully injected dueIns block into ExpenseViewLive.")

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

