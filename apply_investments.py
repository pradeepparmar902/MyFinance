import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Seeds & Logic
investments_logic = """
const INVESTMENTS_SEED = [
  { id: "inv1", name: "SBI Tax Saver FD", provider: "SBI", type: "Fixed Deposit", icon: "🏦", amount: 150000, interestRate: 7.1, maturityAmount: 213000, startDate: "2024-03-15", endDate: "2029-03-15", remarks: "80C Saving", docName: "", docData: "", status: "Active", color: COLORS.primary, payments: [{ date: "2024-03-15", amount: 150000 }] },
  { id: "inv2", name: "HDFC RD", provider: "HDFC Bank", type: "Recurring Deposit", icon: "💰", amount: 5000, interestRate: 6.5, maturityAmount: 64000, startDate: "2024-01-10", endDate: "2025-01-10", remarks: "Emergency Fund", docName: "", docData: "", status: "Active", color: COLORS.secondary, payments: [] },
  { id: "inv3", name: "Parag Parikh Flexi", provider: "PPFAS", type: "Mutual Fund SIP", icon: "📈", amount: 10000, interestRate: 12, maturityAmount: "", startDate: new Date().toISOString().split('T')[0], endDate: "", remarks: "Long Term Wealth", docName: "", docData: "", status: "Active", color: "#10b981", payments: [] }
];

const getDueInvestments = (invList) => {
  if (!invList) return [];
  const due = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  
  invList.forEach(inv => {
    if (inv.status === "Paused" || inv.status === "Closed" || !inv.startDate) return;
    const start = new Date(inv.startDate);
    
    if (inv.type === "Fixed Deposit" || inv.type === "Mutual Fund Lumpsum" || inv.type === "Stock/Equity" || inv.type === "Other (One-Time)") {
      if (inv.payments && inv.payments.length > 0) return;
      if (start <= today) {
        due.push({ invId: inv.id, name: inv.name, provider: inv.provider, amount: inv.amount, dueDate: inv.startDate, cycle: "One-Time", icon: inv.icon, color: inv.color, type: inv.type });
      }
      return;
    }
    
    let nextDate = new Date(start);
    let limit = 0;
    while (nextDate <= today && limit < 1000) {
      if (inv.endDate && nextDate > new Date(inv.endDate)) break;
      const nextDateStr = nextDate.toISOString().split('T')[0];
      const isPaid = inv.payments && inv.payments.some(p => p.date === nextDateStr);
      if (!isPaid) {
        due.push({ invId: inv.id, name: inv.name, provider: inv.provider, amount: inv.amount, dueDate: nextDateStr, cycle: "Monthly", icon: inv.icon, color: inv.color, type: inv.type });
      }
      nextDate.setMonth(nextDate.getMonth() + 1);
      limit++;
    }
  });
  return due;
};

function InvestmentsView({ investments, setInvestments }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [invFilter, setInvFilter] = useState("All");
  const [form, setForm] = useState({ name:"", provider:"", type:"Mutual Fund SIP", icon:"📈", amount:"", interestRate:"", maturityAmount:"", startDate: new Date().toISOString().split('T')[0], endDate:"", remarks:"", docName:"", docData:"", status:"Active", color:COLORS.secondary });

  const monthlyTotal = investments ? investments.filter(i => (i.type==="Recurring Deposit" || i.type==="Mutual Fund SIP") && i.status==="Active").reduce((a,i)=>a+i.amount,0) : 0;
  const totalInvested = investments ? investments.reduce((a,inv) => a + (inv.payments?inv.payments.reduce((sum,p)=>sum+p.amount,0):0), 0) : 0;

  const handleSave = () => {
    if (!form.name || !form.amount || !form.startDate) return alert("Name, Amount, and Start Date are required.");
    const item = { ...form, amount: parseFloat(form.amount) };
    if (editItem) {
      setInvestments(p => p.map(i => i.id === editItem.id ? { ...i, ...item } : i));
    } else {
      setInvestments(p => [...(p||[]), { ...item, id: "inv" + Date.now(), payments: [] }]);
    }
    setShowForm(false);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this investment?")) { setInvestments(p => p.filter(i => i.id !== id)); setShowForm(false); }
  };

  const fmtDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const displayedInvestments = invFilter === "All" ? investments : (investments || []).filter(i => i.type === invFilter);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:18,fontWeight:700,color:COLORS.text }}>Banking & Investments</div>
        <button onClick={() => { setEditItem(null); setForm({ name:"", provider:"", type:"Mutual Fund SIP", icon:"📈", amount:"", interestRate:"", maturityAmount:"", startDate: new Date().toISOString().split('T')[0], endDate:"", remarks:"", docName:"", docData:"", status:"Active", color:COLORS.secondary }); setShowForm(true); }} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add Investment</button>
      </div>

      {showForm && (
        <div style={{ background: "#1a2236", padding: 16, borderRadius: 12, marginBottom: 16, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Investment Name</label>
              <input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="e.g. HDFC RD" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Bank / Provider</label>
              <input value={form.provider} onChange={e=>setForm({...form, provider: e.target.value})} placeholder="e.g. HDFC Bank" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Investment Type</label>
              <select value={form.type} onChange={e=>setForm({...form, type: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}>
                <option value="Recurring Deposit">Recurring Deposit (RD)</option>
                <option value="Fixed Deposit">Fixed Deposit (FD)</option>
                <option value="Mutual Fund SIP">Mutual Fund SIP</option>
                <option value="Mutual Fund Lumpsum">Mutual Fund Lumpsum</option>
                <option value="Stock/Equity">Stock/Equity</option>
                <option value="Other (One-Time)">Other (One-Time)</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Amount (₹)</label>
              <input type="number" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} placeholder="Principal or Monthly" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Start Date</label>
              <input type="date" value={form.startDate} onChange={e=>setForm({...form, startDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>End / Maturity Date (Optional)</label>
              <input type="date" value={form.endDate} onChange={e=>setForm({...form, endDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Expected Interest Rate (%)</label>
              <input type="number" value={form.interestRate} onChange={e=>setForm({...form, interestRate: e.target.value})} placeholder="e.g. 7.1" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Expected Maturity Amount (₹)</label>
              <input type="number" value={form.maturityAmount} onChange={e=>setForm({...form, maturityAmount: e.target.value})} placeholder="e.g. 150000" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Upload Certificate/Receipt</label>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => {
                const file = e.target.files[0];
                if (file && file.size <= 2.5 * 1024 * 1024) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setForm({...form, docName: file.name, docData: ev.target.result});
                  reader.readAsDataURL(file);
                } else if(file) alert("File too large (Limit 2.5MB)");
              }} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "5px 12px", borderRadius: 8 }} />
              {form.docName && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
                  <div style={{fontSize:11, color:COLORS.primary}}>📎 {form.docName}</div>
                  {form.docData && <button onClick={()=>{const a=document.createElement('a');a.href=form.docData;a.download=form.docName;a.click();}} style={{ background: "transparent", color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontSize: 10 }}>Download</button>}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleSave} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ background: "transparent", color: COLORS.textMuted, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            {editItem && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
                <button onClick={() => setForm({...form, status: form.status === "Paused" ? "Active" : form.status === "Closed" ? "Active" : "Paused"})} style={{ background: form.status === "Active" ? "#f59e0b" : "#10b981", color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>
                  {form.status === "Active" ? "⏸ Pause" : "▶ Resume"}
                </button>
                <button onClick={() => setForm({...form, status: "Closed"})} style={{ background: COLORS.accent, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>
                  Close / Mature
                </button>
                <button onClick={() => handleDelete(editItem.id)} style={{ background: COLORS.danger, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Delete</button>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,minmax(80px,1fr))",gap:9,marginBottom:14 }}>
        <div style={{ background:"#1a2236",padding:"12px 16px",borderRadius:12,border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:4 }}>Est. Monthly Outflow (RD/SIP)</div>
          <div style={{ fontSize:16,fontWeight:700,color:COLORS.danger }}>₹{monthlyTotal.toLocaleString("en-IN")}</div>
        </div>
        <div style={{ background:"#1a2236",padding:"12px 16px",borderRadius:12,border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:4 }}>Total Principal Invested</div>
          <div style={{ fontSize:16,fontWeight:700,color:COLORS.success }}>₹{totalInvested.toLocaleString("en-IN")}</div>
        </div>
        <div style={{ background:"#1a2236",padding:"12px 16px",borderRadius:12,border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:4 }}>Active / Total</div>
          <div style={{ fontSize:16,fontWeight:700,color:COLORS.secondary }}>{investments ? investments.filter(i=>i.status==="Active").length : 0} / {investments?investments.length:0}</div>
        </div>
      </div>

      <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:8, marginBottom:16 }}>
        {["All","Recurring Deposit","Fixed Deposit","Mutual Fund SIP","Mutual Fund Lumpsum","Stock/Equity","Other (One-Time)"].map(c => (
          <div key={c} onClick={() => setInvFilter(c)} style={{ whiteSpace:"nowrap", padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", background: invFilter===c ? COLORS.primary : "#1e293b", color: invFilter===c ? "#fff" : COLORS.textMuted }}>{c}</div>
        ))}
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12 }}>
        {displayedInvestments && displayedInvestments.map((inv,i) => {
          const paidAmt = inv.payments ? inv.payments.reduce((s,p)=>s+p.amount,0) : 0;
          const isLump = (inv.type === "Fixed Deposit" || inv.type === "Mutual Fund Lumpsum" || inv.type === "Stock/Equity" || inv.type === "Other (One-Time)");
          const pct = inv.maturityAmount ? Math.min(100, (paidAmt / inv.maturityAmount)*100) : 0;
          return (
          <div key={i} onClick={() => { setEditItem(inv); setForm(inv); setShowForm(true); }} style={{ background:"#1a2236",borderRadius:12,border:`1px solid ${COLORS.border}`,position:"relative",overflow:"hidden",cursor:"pointer", opacity: inv.status==="Active"?1:0.6 }}>
            <div style={{ position:"absolute",left:0,top:0,bottom:0,width:4,background:inv.color }} />
            <div style={{ padding:12,paddingLeft:16 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                <div style={{ fontSize:20 }}>{inv.icon}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {inv.status !== "Active" && <div style={{ fontSize:9,background:"#f59e0b33",color:"#f59e0b",padding:"2px 8px",borderRadius:12 }}>{inv.status}</div>}
                  <div style={{ fontSize:9,background:"rgba(255,255,255,0.1)",padding:"2px 8px",borderRadius:12,color:COLORS.textMuted }}>{inv.type}</div>
                </div>
              </div>
              <div style={{ fontSize:13,fontWeight:600,color:COLORS.text,marginBottom:2 }}>{inv.name}</div>
              <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:8 }}>{inv.provider}</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                <div>
                  <div style={{ fontSize:16,fontWeight:700,color:inv.color,marginBottom:2 }}>₹{inv.amount.toLocaleString("en-IN")}<span style={{fontSize:10,fontWeight:400,color:COLORS.textMuted}}>{isLump ? "" : "/mo"}</span></div>
                  {inv.interestRate && <div style={{ fontSize:10,color:COLORS.success }}>{inv.interestRate}% Interest</div>}
                </div>
                {inv.maturityAmount && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize:12,fontWeight:700,color:COLORS.text }}>₹{Number(inv.maturityAmount).toLocaleString("en-IN")}</div>
                    <div style={{ fontSize:9,color:COLORS.textMuted }}>Maturity Value</div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 12, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: inv.color, borderRadius: 2 }} />
              </div>
              <div style={{ marginTop: 4, fontSize: 9, color: COLORS.textMuted, textAlign: "right" }}>Invested: ₹{paidAmt.toLocaleString("en-IN")}</div>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}
"""

if "function InvestmentsView" not in code:
    code = code.replace('const INSURANCE_SEED = [', investments_logic + '\n\nconst INSURANCE_SEED = [')

# 2. Add investments to state in FinPilotAI
if 'const [investments, setInvestments] = useState(INVESTMENTS_SEED);' not in code:
    state_search = 'const [insurance, setInsurance] = useState(INSURANCE_SEED);'
    code = code.replace(state_search, state_search + '\n  const [investments, setInvestments] = useState(INVESTMENTS_SEED);')

# 3. Add to NAV
if '{ id: "investments", label: "Investments", icon: "🏦" },' not in code:
    nav_search = '{ id: "insurance", label: "Insurance", icon: "🛡️" },'
    code = code.replace(nav_search, nav_search + '\n    { id: "investments", label: "Banking & Inv.", icon: "🏦" },')

# 4. Add to Router
if 'case "investments":' not in code:
    route_search = 'case "insurance":      return <InsuranceView insurance={insurance} setInsurance={setInsurance} />;'
    code = code.replace(route_search, route_search + '\n      case "investments":      return <InvestmentsView investments={investments} setInvestments={setInvestments} />;')

# 5. Fix ExpenseViewLive signature and injection
old_expense_route = 'case "expense":      return <ExpenseViewLive expenses={expenses} setExpenses={setExpenses} filter={filter} subscriptions={subscriptions} setSubscriptions={setSubscriptions} insurance={insurance} setInsurance={setInsurance} />;'
new_expense_route = 'case "expense":      return <ExpenseViewLive expenses={expenses} setExpenses={setExpenses} filter={filter} subscriptions={subscriptions} setSubscriptions={setSubscriptions} insurance={insurance} setInsurance={setInsurance} investments={investments} setInvestments={setInvestments} />;'
code = code.replace(old_expense_route, new_expense_route)

old_expense_sig = 'function ExpenseViewLive({ expenses, setExpenses, filter, subscriptions, setSubscriptions, insurance, setInsurance }) {'
new_expense_sig = 'function ExpenseViewLive({ expenses, setExpenses, filter, subscriptions, setSubscriptions, insurance, setInsurance, investments, setInvestments }) {'
code = code.replace(old_expense_sig, new_expense_sig)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Investments baseline added.")
