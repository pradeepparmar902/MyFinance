import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

inv_state = """  const [payingInv, setPayingInv] = useState(null);
  const dueInv = investments ? getDueInvestments(investments) : [];
  
  const handlePayInvConfirm = () => {
    if (!payingInv) return;
    const inv = payingInv.inv;
    
    // Log expense
    setExpenses(p => [{ id: "e" + Date.now(), title: inv.name + (inv.cycle==="One-Time"?" (Lumpsum)":" (Installment)"), amount: parseFloat(payingInv.amount), date: payingInv.date, category: "Investment", icon: inv.icon, color: inv.color }, ...p]);
    
    // Log payment in investment
    setInvestments(p => p.map(s => {
      if (s.id === inv.invId) {
        return { ...s, payments: [...(s.payments||[]), { date: payingInv.date, amount: parseFloat(payingInv.amount) }] };
      }
      return s;
    }));
    
    setPayingInv(null);
  };
"""

state_search = '  const [payingIns, setPayingIns] = useState(null);'
if 'setPayingInv' not in code:
    code = code.replace(state_search, inv_state + '\n' + state_search)

inv_ui = """      {dueInv.length > 0 && (
        <div style={{ background: "#10b98120", border: `1px solid #10b981`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981", marginBottom: 12 }}>🏦 Due Investments ({dueInv.length})</div>
          <div style={{ display: "grid", gap: 10 }}>
            {dueInv.map(inv => (
              <div key={inv.invId + "-" + inv.dueDate} style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{inv.icon} {inv.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{inv.type}   Due: {fmtDate(inv.dueDate)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#10b981" }}>₹{inv.amount.toLocaleString("en-IN")}</div>
                  {payingInv && payingInv.inv.invId === inv.invId && payingInv.inv.dueDate === inv.dueDate ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input type="date" value={payingInv.date} onChange={e => setPayingInv({...payingInv, date: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "4px 8px", borderRadius: 4 }} />
                        <input type="number" value={payingInv.amount} onChange={e => setPayingInv({...payingInv, amount: e.target.value})} style={{ width: 80, background: "#1a2236", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "4px 8px", borderRadius: 4 }} />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={handlePayInvConfirm} style={{ background: COLORS.primary, color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>Confirm</button>
                        <button onClick={() => setPayingInv(null)} style={{ background: "transparent", color: COLORS.textMuted, border: `1px solid ${COLORS.border}`, padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setPayingInv({ inv, date: inv.dueDate, amount: inv.amount })} style={{ background: "#10b981", color: "#fff", border: "none", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Pay Now</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}"""

due_ins_search = '      {dueIns.length > 0 && ('
if '🏦 Due Investments' not in code:
    code = code.replace(due_ins_search, inv_ui + '\n\n' + due_ins_search)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Applied Due Investments UI to Expenses.")
