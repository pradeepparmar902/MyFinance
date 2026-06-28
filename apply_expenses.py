import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

start_idx = code.find("function ExpenseViewLive({")
end_idx = code.find("function ConfirmDialog({", start_idx)
if end_idx == -1: end_idx = code.find("function BudgetViewLive", start_idx)

new_expense_view = """function ExpenseViewLive({ expenses, setExpenses, filter, categoryMaster, vendorMaster, setCategoryMaster, setVendorMaster, assets, setAssets, subscriptions, setSubscriptions }) {
  const [catFilter, setCatFilter] = useState("All");
  const [showAdd,   setShowAdd]   = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  
  const [payingSub, setPayingSub] = useState(null);
  const dueSubs = subscriptions ? getDueSubscriptions(subscriptions) : [];

  const handlePaySubConfirm = () => {
    if (!payingSub) return;
    const { sub, date, amount } = payingSub;
    const amt = parseFloat(amount);
    if (amt < 0) {
      alert("Values cannot be negative.");
      return;
    }
    const exp = {
      id: "e" + Date.now(),
      date: date,
      cat: sub.category || "Subscription",
      icon: sub.icon || "💳",
      color: sub.color || COLORS.primary,
      amount: amt,
      vendor: sub.name,
      notes: "Subscription Payment: " + sub.name + " (" + sub.dueDate + ")"
    };
    setExpenses(prev => [exp, ...prev]);
    setSubscriptions(prev => prev.map(s => {
      if (s.id !== sub.subId) return s;
      return { ...s, payments: [...(s.payments || []), { date: sub.dueDate, amount: amt, expenseId: exp.id }] };
    }));
    setPayingSub(null);
  };

  const cats = categoryMaster ? ["All", ...categoryMaster.map(c=>c.name)] : ["All","Food","Fuel","Grocery","Entertainment","Medical","Shopping","Utilities","Education","Travel"];

  const MS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtDate = d => { const dt=new Date(d); return `${dt.getDate()} ${MS[dt.getMonth()]}`; };

  const periodFiltered = expenses ? expenses.filter(t => {
    const d = new Date(t.date); const m=d.getMonth()+1, y=d.getFullYear();
    if (filter.mode==="month") return m===filter.month && y===filter.year;
    if (filter.mode==="year")  return y===filter.year;
    if (filter.mode==="range") { const k=y*100+m; return k>=filter.fromYear*100+filter.fromMonth && k<=filter.toYear*100+filter.toMonth; }
    return true;
  }) : [];

  const filtered = (catFilter==="All" ? periodFiltered : periodFiltered.filter(t=>t.cat===catFilter)).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const grandTotal = periodFiltered.reduce((a,t)=>a+t.amount,0);

  return (
    <div>
      {dueSubs.length > 0 && (
        <div style={{ background: COLORS.danger + "20", border: `1px solid ${COLORS.danger}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.danger, marginBottom: 12 }}>⚠️ Due Subscriptions ({dueSubs.length})</div>
          <div style={{ display: "grid", gap: 10 }}>
            {dueSubs.map(sub => (
              <div key={sub.subId + "-" + sub.dueDate} style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{sub.icon} {sub.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>Cycle: {sub.cycle}   Due: {fmtDate(sub.dueDate)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.danger }}>₹{sub.amount.toLocaleString("en-IN")}</div>
                  {payingSub && payingSub.sub.subId === sub.subId && payingSub.sub.dueDate === sub.dueDate ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input type="date" value={payingSub.date} onChange={e => setPayingSub({...payingSub, date: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "4px 8px", borderRadius: 4 }} />
                        <input type="number" value={payingSub.amount} onChange={e => setPayingSub({...payingSub, amount: e.target.value})} style={{ width: 80, background: "#1a2236", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "4px 8px", borderRadius: 4 }} />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={handlePaySubConfirm} style={{ background: COLORS.primary, color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>Confirm</button>
                        <button onClick={() => setPayingSub(null)} style={{ background: "transparent", color: COLORS.textMuted, border: `1px solid ${COLORS.border}`, padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setPayingSub({ sub, date: sub.dueDate, amount: sub.amount })} style={{ background: COLORS.danger, color: "#fff", border: "none", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Pay Now</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:18,fontWeight:700,color:COLORS.text }}>Expense Log</div>
        <button onClick={() => { setEditing(null); setShowAdd(true); }} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add Expense</button>
      </div>
      
      <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:8, marginBottom:16 }}>
        {cats.map(c => (
          <div key={c} onClick={() => setCatFilter(c)} style={{ whiteSpace:"nowrap", padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", background: catFilter===c ? COLORS.primary : "#1e293b", color: catFilter===c ? "#fff" : COLORS.textMuted }}>{c}</div>
        ))}
      </div>
      
      <div style={{ display:"grid", gap:10 }}>
        {filtered.map(t => (
          <div key={t.id} onClick={() => { setEditing(t); setShowAdd(true); }} style={{ background:"#1a2236", borderRadius:12, padding:16, display:"flex", justifyContent:"space-between", alignItems:"center", border:`1px solid ${COLORS.border}`, cursor:"pointer" }}>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ width:40, height:40, borderRadius:20, background:t.color+"20", color:t.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{t.icon}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:COLORS.text }}>{t.vendor}</div>
                <div style={{ fontSize:12, color:COLORS.textMuted }}>{t.cat} • {fmtDate(t.date)}</div>
              </div>
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:COLORS.danger }}>-₹{t.amount.toLocaleString("en-IN")}</div>
          </div>
        ))}
        {filtered.length===0 && <div style={{ textAlign:"center", padding:30, color:COLORS.textMuted }}>No expenses found.</div>}
      </div>
      
      {showAdd && (
        <AddExpenseModal onClose={() => setShowAdd(false)} onSave={(t) => {
          if (editing) setExpenses(p => p.map(x => x.id===editing.id ? {...x,...t} : x));
          else setExpenses(p => [{...t, id:"e"+Date.now()}, ...p]);
          setShowAdd(false);
        }} initialData={editing} />
      )}
    </div>
  );
}
"""

if start_idx != -1 and end_idx != -1:
    code = code[:start_idx] + new_expense_view + code[end_idx:]

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)
print("Finished expense replacement")
