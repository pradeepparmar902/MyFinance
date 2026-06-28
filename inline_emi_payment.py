import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update getDueEMIs to include principal and interest
old_due_push = 'due.push({ loanId: loan.id, name: loan.name, bank: loan.bank, amount: row.emi, dueDate: row.date, icon: loan.icon });'
new_due_push = 'due.push({ loanId: loan.id, name: loan.name, bank: loan.bank, amount: row.emi, principal: row.principal, interest: row.interest, dueDate: row.date, icon: loan.icon });'
code = code.replace(old_due_push, new_due_push)

# 2. Update ExpenseViewLive to add state for inline form
old_exp_state = 'const [showAdd,   setShowAdd]   = useState(false);'
new_exp_state = 'const [showAdd,   setShowAdd]   = useState(false);\n  const [payingEmi, setPayingEmi] = useState(null);\n  const [emiForm, setEmiForm] = useState({ date: "", amount: "", principal: "", interest: "" });'
if 'const [payingEmi' not in code:
    code = code.replace(old_exp_state, new_exp_state)

# 3. Replace immediate confirm with inline form
old_pay_block = """                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.danger }}>₹{emi.amount.toLocaleString("en-IN")}</div>
                    <button onClick={() => {
                      if (!window.confirm(`Pay EMI of ₹${emi.amount} for ${emi.name}?`)) return;
                      // 1. Log Expense
                      const nExp = { id: "e" + Date.now(), date: new Date().toISOString().split('T')[0], storeName: emi.bank, productName: emi.name + " EMI", cat: "EMI", amount: emi.amount, icon: "🏠", color: COLORS.danger, paymentMode: "Net Banking" };
                      setExpenses(p => [nExp, ...p]);
                      // 2. Mark Loan Paid
                      setLoans(p => p.map(l => l.id === emi.loanId ? { ...l, payments: [...(l.payments||[]), { date: emi.dueDate, amount: emi.amount }] } : l));
                    }} style={{ background: COLORS.danger, color: "#fff", padding: "6px 14px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Pay Now</button>
                  </div>"""

new_pay_block = """                  {payingEmi === emi.loanId + emi.dueDate ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                        <div><div style={{fontSize:9,color:COLORS.textMuted,marginBottom:2}}>Payment Date</div><input type="date" value={emiForm.date} onChange={e=>setEmiForm({...emiForm, date:e.target.value})} style={{ background: "#0f172a", color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: "6px", borderRadius: 4, fontSize: 11, width:"100%" }} /></div>
                        <div><div style={{fontSize:9,color:COLORS.textMuted,marginBottom:2}}>Interest (₹)</div><input type="number" value={emiForm.interest} onChange={e=>setEmiForm({...emiForm, interest:e.target.value})} style={{ background: "#0f172a", color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: "6px", borderRadius: 4, fontSize: 11, width:"100%" }} /></div>
                        <div><div style={{fontSize:9,color:COLORS.textMuted,marginBottom:2}}>Principal (₹)</div><input type="number" value={emiForm.principal} onChange={e=>setEmiForm({...emiForm, principal:e.target.value})} style={{ background: "#0f172a", color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: "6px", borderRadius: 4, fontSize: 11, width:"100%" }} /></div>
                        <div><div style={{fontSize:9,color:COLORS.textMuted,marginBottom:2}}>Total EMI (₹)</div><input type="number" value={emiForm.amount} onChange={e=>setEmiForm({...emiForm, amount:e.target.value})} style={{ background: "#0f172a", color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: "6px", borderRadius: 4, fontSize: 11, width:"100%" }} /></div>
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => setPayingEmi(null)} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                        <button onClick={() => {
                           const a = parseFloat(emiForm.amount)||0;
                           const pr = parseFloat(emiForm.principal)||0;
                           const int = parseFloat(emiForm.interest)||0;
                           const nExp = { id: "e" + Date.now(), date: emiForm.date, storeName: emi.bank, productName: emi.name + " EMI", cat: "EMI", amount: a, icon: "🏠", color: COLORS.danger, paymentMode: "Net Banking" };
                           setExpenses(p => [nExp, ...p]);
                           setLoans(p => p.map(l => l.id === emi.loanId ? { ...l, payments: [...(l.payments||[]), { date: emi.dueDate, payDate: emiForm.date, amount: a, principal: pr, interest: int }] } : l));
                           setPayingEmi(null);
                        }} style={{ background: COLORS.primary, border: "none", color: "#fff", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Confirm</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.danger }}>₹{emi.amount.toLocaleString("en-IN", {maximumFractionDigits:0})}</div>
                      <button onClick={() => {
                        setPayingEmi(emi.loanId + emi.dueDate);
                        setEmiForm({ date: new Date().toISOString().split('T')[0], amount: Math.round(emi.amount), principal: Math.round(emi.principal||0), interest: Math.round(emi.interest||0) });
                      }} style={{ background: COLORS.danger, color: "#fff", padding: "6px 14px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Pay Now</button>
                    </div>
                  )}"""

code = code.replace(old_pay_block, new_pay_block)

# Fix wrapping
code = code.replace('<div key={emi.loanId + emi.dueDate} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: 8 }}>', '<div key={emi.loanId + emi.dueDate} style={{ display: "flex", flexDirection: payingEmi === emi.loanId + emi.dueDate ? "column" : "row", justifyContent: "space-between", alignItems: payingEmi === emi.loanId + emi.dueDate ? "flex-start" : "center", background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: 8 }}>')

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Added inline EMI payment form successfully.")
