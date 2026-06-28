import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Seeds & Helper
seed_and_helper = """
const INSURANCE_SEED = [
  { id:"ins1", name:"HDFC Ergo Optima", provider:"HDFC Ergo", type:"Medical Insurance", amount:24000, cycle:"Annual", startDate:"2024-03-10", endDate:"", moreInfo:"Family Floater 10L", docLink:"", icon:"🏥", color:"#10B981", payments:[] },
  { id:"ins2", name:"LIC Jeevan Anand", provider:"LIC", type:"Life Insurance", amount:32000, cycle:"Annual", startDate:"2020-08-15", endDate:"", moreInfo:"Endowment plan", docLink:"", icon:"👨‍👩‍👧‍👦", color:"#F59E0B", payments:[] },
  { id:"ins3", name:"Bajaj Allianz Car", provider:"Bajaj Allianz", type:"Motor Insurance", amount:12500, cycle:"Annual", startDate:"2024-06-05", endDate:"", moreInfo:"Comprehensive Zero Dep", docLink:"", icon:"🚗", color:"#3B82F6", payments:[] },
];

const getDueInsurance = (insuranceList) => {
  if (!insuranceList) return [];
  const due = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  
  insuranceList.forEach(ins => {
    if (!ins.startDate) return;
    const start = new Date(ins.startDate);
    let nextDate = new Date(start);
    
    let limit = 0;
    while (nextDate <= today && limit < 1000) {
      if (ins.endDate && nextDate > new Date(ins.endDate)) break;
      
      const nextDateStr = nextDate.toISOString().split('T')[0];
      const isPaid = ins.payments && ins.payments.some(p => p.date === nextDateStr);
      
      if (!isPaid) {
        due.push({
          insId: ins.id,
          name: ins.name,
          provider: ins.provider,
          amount: ins.amount,
          dueDate: nextDateStr,
          cycle: ins.cycle,
          icon: ins.icon,
          color: ins.color,
          type: ins.type
        });
      }
      
      if (ins.cycle === "Annual") nextDate.setFullYear(nextDate.getFullYear() + 1);
      else if (ins.cycle === "Quarterly") nextDate.setMonth(nextDate.getMonth() + 3);
      else if (ins.cycle === "Half-Yearly") nextDate.setMonth(nextDate.getMonth() + 6);
      else nextDate.setMonth(nextDate.getMonth() + 1);
      limit++;
    }
  });
  
  return due;
};
"""
code = code.replace("export default function FinPilotAI() {", seed_and_helper + "\nexport default function FinPilotAI() {")

# 2. NAV mapping
code = code.replace(
    '{ id: "subscriptions", icon: "🔄", label: "Subscriptions" },',
    '{ id: "subscriptions", icon: "🔄", label: "Subscriptions" },\n    { id: "insurance", icon: "🛡️", label: "Insurance" },'
)
# (Fallback if previous search fails because of icon mismatch)
code = code.replace(
    'label: "Subscriptions" },',
    'label: "Subscriptions" },\n    { id: "insurance", icon: "🛡️", label: "Insurance" },'
)

# 3. State Setup inside FinPilotAI
state_hook = 'const [insurance, setInsurance] = useLocalStorage("fp_insurance", INSURANCE_SEED);'
code = code.replace(
    'const [subscriptions, setSubscriptions] = useLocalStorage("fp_subscriptions", SUBS_SEED);',
    'const [subscriptions, setSubscriptions] = useLocalStorage("fp_subscriptions", SUBS_SEED);\n  ' + state_hook
)

# 4. Routing
code = code.replace(
    'case "subscriptions":return <SubscriptionsView subscriptions={subscriptions} setSubscriptions={setSubscriptions} categoryMaster={[]} />;',
    'case "subscriptions":return <SubscriptionsView subscriptions={subscriptions} setSubscriptions={setSubscriptions} categoryMaster={[]} />;\n      case "insurance":    return <InsuranceView insurance={insurance} setInsurance={setInsurance} />;'
)

# 5. Connect ExpenseViewLive routing
old_expense_route = 'case "expense":      return <ExpenseViewLive expenses={expenses} setExpenses={setExpenses} filter={filter} subscriptions={subscriptions} setSubscriptions={setSubscriptions} />;'
new_expense_route = 'case "expense":      return <ExpenseViewLive expenses={expenses} setExpenses={setExpenses} filter={filter} subscriptions={subscriptions} setSubscriptions={setSubscriptions} insurance={insurance} setInsurance={setInsurance} />;'
code = code.replace(old_expense_route, new_expense_route)

# 6. Inject InsuranceView Component before ExpenseViewLive
insurance_view_code = """
// ─── Insurance View ────────────────────────────────────────────────────────────
function InsuranceView({ insurance, setInsurance }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name:"", provider:"", type:"Medical Insurance", icon:"🛡️", amount:"", cycle:"Annual", startDate:"", endDate:"", moreInfo:"", docLink:"", color:COLORS.primary });

  const monthlyTotal = insurance ? insurance.reduce((a,s)=>{
    let m = s.amount;
    if(s.cycle==="Annual") m = m/12;
    if(s.cycle==="Quarterly") m = m/3;
    if(s.cycle==="Half-Yearly") m = m/6;
    return a+m;
  },0) : 0;
  const annualTotal = insurance ? insurance.reduce((a,s)=>{
    let y = s.amount;
    if(s.cycle==="Monthly") y = y*12;
    if(s.cycle==="Quarterly") y = y*4;
    if(s.cycle==="Half-Yearly") y = y*2;
    return a+y;
  },0) : 0;

  const handleSave = () => {
    if (!form.name || !form.amount || !form.startDate) {
      alert("Name, Amount, and Start Date are required.");
      return;
    }
    const item = { 
      ...form, 
      amount: parseFloat(form.amount), 
      endDate: form.endDate || "" 
    };
    if (editItem) {
      setInsurance(p => p.map(s => s.id === editItem.id ? { ...s, ...item } : s));
    } else {
      setInsurance(p => [...(p||[]), { ...item, id: "ins" + Date.now(), payments: [] }]);
    }
    setShowForm(false);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this insurance policy?")) {
      setInsurance(p => p.filter(s => s.id !== id));
      setShowForm(false);
    }
  };

  const fmtInsDue = (s) => {
    if (!s.startDate) return "";
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(s.startDate);
    let nextDate = new Date(start);
    let limit = 0;
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    
    while (limit < 1000) {
      if (s.endDate && nextDate > new Date(s.endDate)) return "Ended";
      const nextDateStr = nextDate.toISOString().split('T')[0];
      const isPaid = s.payments && s.payments.some(p => p.date === nextDateStr);
      if (!isPaid) {
        if (nextDate <= today) return `Due: ${nextDate.getDate()} ${months[nextDate.getMonth()]}`;
        return `Next: ${nextDate.getDate()} ${months[nextDate.getMonth()]}`;
      }
      if (s.cycle === "Annual") nextDate.setFullYear(nextDate.getFullYear() + 1);
      else if (s.cycle === "Quarterly") nextDate.setMonth(nextDate.getMonth() + 3);
      else if (s.cycle === "Half-Yearly") nextDate.setMonth(nextDate.getMonth() + 6);
      else nextDate.setMonth(nextDate.getMonth() + 1);
      limit++;
    }
    return "";
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:18,fontWeight:700,color:COLORS.text }}>Insurance Tracker</div>
        <button onClick={() => { setEditItem(null); setForm({ name:"", provider:"", type:"Medical Insurance", icon:"🛡️", amount:"", cycle:"Annual", startDate: new Date().toISOString().split('T')[0], endDate:"", moreInfo:"", docLink:"", color:COLORS.primary }); setShowForm(true); }} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add Policy</button>
      </div>

      {showForm && (
        <div style={{ background: "#1a2236", padding: 16, borderRadius: 12, marginBottom: 16, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Policy Name</label>
              <input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="e.g. Optima Restore" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Provider</label>
              <input value={form.provider} onChange={e=>setForm({...form, provider: e.target.value})} placeholder="e.g. HDFC Ergo" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Insurance Type</label>
              <select value={form.type} onChange={e=>setForm({...form, type: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}>
                <option value="Medical Insurance">Medical Insurance</option>
                <option value="Life Insurance">Life Insurance</option>
                <option value="Motor Insurance">Motor Insurance</option>
                <option value="Term Insurance">Term Insurance</option>
                <option value="Home Insurance">Home Insurance</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Premium Amount (₹)</label>
              <input type="number" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} placeholder="Amount" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Payment Cycle</label>
              <select value={form.cycle} onChange={e=>setForm({...form, cycle: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Half-Yearly">Half-Yearly</option>
                <option value="Annual">Annual</option>
              </select>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Icon & Color</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={form.icon} onChange={e=>setForm({...form, icon: e.target.value})} placeholder="Icon" style={{ flex: 1, background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
                <input type="color" value={form.color} onChange={e=>setForm({...form, color: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, padding: "4px", borderRadius: 8, height: 38, width: 40 }} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Start Date</label>
              <input type="date" value={form.startDate} onChange={e=>setForm({...form, startDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>End Date (Leave blank if none)</label>
              <input type="date" value={form.endDate} onChange={e=>setForm({...form, endDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>More Information</label>
              <input value={form.moreInfo} onChange={e=>setForm({...form, moreInfo: e.target.value})} placeholder="Policy No, Details, etc." style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Policy Document Link/Path</label>
              <input value={form.docLink} onChange={e=>setForm({...form, docLink: e.target.value})} placeholder="Drive Link or Local Path" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleSave} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ background: "transparent", color: COLORS.textMuted, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            {editItem && <button onClick={() => handleDelete(editItem.id)} style={{ background: COLORS.danger, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, marginLeft: "auto" }}>Delete</button>}
          </div>
        </div>
      )}

      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,minmax(80px,1fr))",gap:9,marginBottom:14 }}>
        <div style={{ background:"#1a2236",padding:"12px 16px",borderRadius:12,border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:4 }}>Est. Monthly Outflow</div>
          <div style={{ fontSize:16,fontWeight:700,color:COLORS.danger }}>₹{Math.round(monthlyTotal).toLocaleString("en-IN")}</div>
        </div>
        <div style={{ background:"#1a2236",padding:"12px 16px",borderRadius:12,border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:4 }}>Total Annual Premium</div>
          <div style={{ fontSize:16,fontWeight:700,color:"#F59E0B" }}>₹{(annualTotal/1000).toFixed(1)}K</div>
        </div>
        <div style={{ background:"#1a2236",padding:"12px 16px",borderRadius:12,border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:4 }}>Active Policies</div>
          <div style={{ fontSize:16,fontWeight:700,color:"#3B82F6" }}>{insurance ? insurance.length : 0}</div>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12 }}>
        {insurance && insurance.map((s,i) => (
          <div key={i} onClick={() => { setEditItem(s); setForm(s); setShowForm(true); }} style={{ background:"#1a2236",borderRadius:12,border:`1px solid ${COLORS.border}`,position:"relative",overflow:"hidden",cursor:"pointer" }}>
            <div style={{ position:"absolute",left:0,top:0,bottom:0,width:4,background:s.color }} />
            <div style={{ padding:12,paddingLeft:16 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                <div style={{ fontSize:20 }}>{s.icon}</div>
                <div style={{ fontSize:9,background:"rgba(255,255,255,0.1)",padding:"2px 8px",borderRadius:12,color:COLORS.textMuted }}>{s.cycle}</div>
              </div>
              <div style={{ fontSize:13,fontWeight:600,color:COLORS.text,marginBottom:2 }}>{s.name}</div>
              <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:8 }}>{s.type} • {s.provider}</div>
              <div style={{ fontSize:16,fontWeight:700,color:s.color,marginBottom:2 }}>₹{s.amount.toLocaleString("en-IN")}</div>
              <div style={{ fontSize:10,color:COLORS.textMuted }}>{fmtInsDue(s)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
"""

code = code.replace("function ExpenseViewLive({", insurance_view_code + "\nfunction ExpenseViewLive({")

# 7. Update ExpenseViewLive code to handle Due Insurance
# We need to inject the insurance logic inside ExpenseViewLive.
expense_signature = "function ExpenseViewLive({ expenses, setExpenses, filter, subscriptions, setSubscriptions, insurance, setInsurance }) {"
if expense_signature in code:
    print("Expense signature updated successfully.")

# Inside ExpenseViewLive, right after `const [payingSub, setPayingSub] = useState(null);`
code = code.replace(
    'const [payingSub, setPayingSub] = useState(null);',
    'const [payingSub, setPayingSub] = useState(null);\n  const [payingIns, setPayingIns] = useState(null);\n  const dueIns = insurance ? getDueInsurance(insurance) : [];'
)

# And right after `handlePaySubConfirm`, add `handlePayInsConfirm`
ins_payment_handler = """  const handlePayInsConfirm = () => {
    if (!payingIns) return;
    const { ins, date, amount } = payingIns;
    const amt = parseFloat(amount);
    if (amt < 0) { alert("Values cannot be negative."); return; }
    const exp = {
      id: "e" + Date.now(),
      date: date,
      cat: ins.type || "Insurance",
      icon: ins.icon || "🛡️",
      color: ins.color || COLORS.primary,
      amount: amt,
      vendor: ins.provider || ins.name,
      notes: "Premium Payment: " + ins.name + " (" + ins.dueDate + ")"
    };
    setExpenses(prev => [exp, ...prev]);
    setInsurance(prev => prev.map(s => {
      if (s.id !== ins.insId) return s;
      return { ...s, payments: [...(s.payments || []), { date: ins.dueDate, amount: amt, expenseId: exp.id }] };
    }));
    setPayingIns(null);
  };
"""
code = code.replace(
    'const cats = ["All",',
    ins_payment_handler + '\n  const cats = ["All",'
)

# And render `dueIns` just above or below `dueSubs`
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
code = code.replace(
    '<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>',
    due_ins_ui + '\n      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>',
    1 # Only replace the first occurrence (which is inside ExpenseViewLive)
)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Applied Insurance patch.")
