import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Inject SUBS_SEED and getDueSubscriptions
seed_and_helper = """
const SUBS_SEED = [
  { id:"s1", name:"Netflix",        icon:"🎬", amount:649,  cycle:"Monthly", startDate: "2024-05-18", endDate: "", remarks: "Family account", color:"#E50914", category:"Entertainment", payments: [] },
  { id:"s2", name:"Amazon Prime",   icon:"📦", amount:1499, cycle:"Annual",  startDate: "2024-02-15", endDate: "", remarks: "Shopping + Video", color:"#FF9900", category:"Shopping",      payments: [] },
  { id:"s3", name:"Spotify",        icon:"🎵", amount:119,  cycle:"Monthly", startDate: "2024-05-22", endDate: "", remarks: "Duo plan", color:"#1DB954", category:"Music",         payments: [] },
  { id:"s4", name:"ChatGPT Plus",   icon:"🤖", amount:1674, cycle:"Monthly", startDate: "2024-05-15", endDate: "", remarks: "AI tools", color:"#10A37F", category:"Productivity",  payments: [] },
  { id:"s5", name:"Hotstar",        icon:"⭐", amount:299,  cycle:"Monthly", startDate: "2024-05-28", endDate: "", remarks: "Sports package", color:"#1C2CC1", category:"Entertainment", payments: [] },
  { id:"s6", name:"Google One",     icon:"☁️", amount:130,  cycle:"Monthly", startDate: "2024-05-20", endDate: "", remarks: "200GB storage", color:"#4285F4", category:"Storage",       payments: [] },
  { id:"s7", name:"Jio Saavn",      icon:"🎶", amount:99,   cycle:"Monthly", startDate: "2024-05-25", endDate: "", remarks: "Music streaming", color:"#E8173C", category:"Music",         payments: [] },
  { id:"s8", name:"Microsoft 365",  icon:"💼", amount:5899, cycle:"Annual",  startDate: "2023-12-05", endDate: "", remarks: "Office apps", color:"#0078D4", category:"Productivity",  payments: [] },
  { id:"s9", name:"Swiggy One",     icon:"🍔", amount:1199, cycle:"Annual",  startDate: "2023-08-10", endDate: "", remarks: "Free delivery", color:"#FC8019", category:"Food",          payments: [] },
  { id:"s10", name:"Zoom Pro",       icon:"📹", amount:1300, cycle:"Monthly", startDate: "2024-05-30", endDate: "", remarks: "Meetings", color:"#2D8CFF", category:"Productivity",  payments: [] },
  { id:"s11", name:"iCloud 200GB",   icon:"🍎", amount:75,   cycle:"Monthly", startDate: "2024-05-10", endDate: "", remarks: "Phone backup", color:"#999999", category:"Storage",       payments: [] },
  { id:"s12", name:"Udemy Business", icon:"📚", amount:1250, cycle:"Monthly", startDate: "2024-05-12", endDate: "", remarks: "Courses", color:"#A435F0", category:"Education",     payments: [] },
];

const getDueSubscriptions = (subscriptions) => {
  if (!subscriptions) return [];
  const due = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  
  subscriptions.forEach(sub => {
    if (!sub.startDate) return;
    const start = new Date(sub.startDate);
    let nextDate = new Date(start);
    
    let limit = 0;
    while (nextDate <= today && limit < 1000) {
      if (sub.endDate && nextDate > new Date(sub.endDate)) break;
      
      const nextDateStr = nextDate.toISOString().split('T')[0];
      const isPaid = sub.payments && sub.payments.some(p => p.date === nextDateStr);
      
      if (!isPaid) {
        due.push({
          subId: sub.id,
          name: sub.name,
          amount: sub.amount,
          dueDate: nextDateStr,
          cycle: sub.cycle,
          icon: sub.icon,
          color: sub.color,
          category: sub.category
        });
      }
      
      if (sub.cycle === "Annual") {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      limit++;
    }
  });
  
  return due;
};
"""
code = code.replace("export default function FinPilotAI() {", seed_and_helper + "\nexport default function FinPilotAI() {")

# 2. Inject global state
code = code.replace(
    'const [goals,       setGoals]       = useLocalStorage("fp_goals",       GOALS_SEED);',
    'const [goals,       setGoals]       = useLocalStorage("fp_goals",       GOALS_SEED);\n  const [subscriptions, setSubscriptions] = useLocalStorage("fp_subscriptions", SUBS_SEED);'
)

# 3. Update routing cases
code = code.replace(
    'case "subscriptions":return <SubscriptionsView />;',
    'case "subscriptions":return <SubscriptionsView subscriptions={subscriptions} setSubscriptions={setSubscriptions} categoryMaster={categoryMaster} />;'
)
code = code.replace(
    'case "expenses":     return <ExpenseViewLive expenses={expenses} setExpenses={setExpenses} categoryMaster={categoryMaster} vendorMaster={vendorMaster} setCategoryMaster={setCategoryMaster} setVendorMaster={setVendorMaster} assets={assets} setAssets={setAssets} />;',
    'case "expenses":     return <ExpenseViewLive expenses={expenses} setExpenses={setExpenses} categoryMaster={categoryMaster} vendorMaster={vendorMaster} setCategoryMaster={setCategoryMaster} setVendorMaster={setVendorMaster} assets={assets} setAssets={setAssets} subscriptions={subscriptions} setSubscriptions={setSubscriptions} />;'
)

# 4. Replace SubscriptionsView
# Find exact start and end safely
start_idx = code.find("function SubscriptionsView()")
end_idx = code.find("// ─── Health Score View ───", start_idx)

new_sub_view = """function SubscriptionsView({ subscriptions, setSubscriptions, categoryMaster }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name:"", icon:"🎬", amount:"", cycle:"Monthly", startDate:"", endDate:"", remarks:"", color:COLORS.primary, category:"Entertainment" });

  const monthlyTotal = subscriptions ? subscriptions.filter(s=>s.cycle==="Monthly").reduce((a,s)=>a+s.amount,0) : 0;
  const annualCost   = subscriptions ? subscriptions.reduce((a,s)=>a+(s.cycle==="Monthly"?s.amount*12:s.amount),0) : 0;

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
      setSubscriptions(p => p.map(s => s.id === editItem.id ? { ...s, ...item } : s));
    } else {
      setSubscriptions(p => [...(p||[]), { ...item, id: "sub" + Date.now(), payments: [] }]);
    }
    setShowForm(false);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this subscription?")) {
      setSubscriptions(p => p.filter(s => s.id !== id));
      setShowForm(false);
    }
  };

  const fmtSubDue = (s) => {
    if (!s.startDate) return "";
    const d = new Date(s.startDate);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (s.cycle === "Annual") {
      return `${months[d.getMonth()]} '${(d.getFullYear()+1).toString().slice(-2)}`;
    }
    return `Day ${d.getDate()}`;
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:18,fontWeight:700,color:COLORS.text }}>Subscription Tracker</div>
        <button onClick={() => { setEditItem(null); setForm({ name:"", icon:"🎬", amount:"", cycle:"Monthly", startDate: new Date().toISOString().split('T')[0], endDate:"", remarks:"", color:COLORS.primary, category:"Entertainment" }); setShowForm(true); }} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add Sub</button>
      </div>

      {showForm && (
        <div style={{ background: "#1a2236", padding: 16, borderRadius: 12, marginBottom: 16, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Name</label>
              <input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="Name" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Icon (Emoji)</label>
              <input value={form.icon} onChange={e=>setForm({...form, icon: e.target.value})} placeholder="Icon" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Amount (₹)</label>
              <input type="number" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} placeholder="Amount" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Billing Cycle</label>
              <select value={form.cycle} onChange={e=>setForm({...form, cycle: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}>
                <option value="Monthly">Monthly</option>
                <option value="Annual">Annual</option>
              </select>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Category</label>
              <select value={form.category} onChange={e=>setForm({...form, category: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}>
                {categoryMaster && categoryMaster.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Card Color</label>
              <input type="color" value={form.color} onChange={e=>setForm({...form, color: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, padding: "4px", borderRadius: 8, height: 38, width: "100%" }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Start Date</label>
              <input type="date" value={form.startDate} onChange={e=>setForm({...form, startDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>End Date (Leave blank for Infinite)</label>
              <input type="date" value={form.endDate} onChange={e=>setForm({...form, endDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Remarks / User ID</label>
              <input value={form.remarks} onChange={e=>setForm({...form, remarks: e.target.value})} placeholder="Purpose, connected ID, etc." style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
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
          <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:4 }}>Monthly Cost</div>
          <div style={{ fontSize:16,fontWeight:700,color:COLORS.danger }}>₹{monthlyTotal.toLocaleString("en-IN")}</div>
        </div>
        <div style={{ background:"#1a2236",padding:"12px 16px",borderRadius:12,border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:4 }}>Annual Total</div>
          <div style={{ fontSize:16,fontWeight:700,color:"#F59E0B" }}>₹{(annualCost/1000).toFixed(1)}K</div>
        </div>
        <div style={{ background:"#1a2236",padding:"12px 16px",borderRadius:12,border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:4 }}>Active Subs</div>
          <div style={{ fontSize:16,fontWeight:700,color:"#3B82F6" }}>{subscriptions ? subscriptions.length : 0}</div>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12 }}>
        {subscriptions && subscriptions.map((s,i) => (
          <div key={i} onClick={() => { setEditItem(s); setForm(s); setShowForm(true); }} style={{ background:"#1a2236",borderRadius:12,border:`1px solid ${COLORS.border}`,position:"relative",overflow:"hidden",cursor:"pointer" }}>
            <div style={{ position:"absolute",left:0,top:0,bottom:0,width:4,background:s.color }} />
            <div style={{ padding:12,paddingLeft:16 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                <div style={{ fontSize:20 }}>{s.icon}</div>
                <div style={{ fontSize:9,background:"rgba(255,255,255,0.1)",padding:"2px 8px",borderRadius:12,color:COLORS.textMuted }}>{s.cycle}</div>
              </div>
              <div style={{ fontSize:13,fontWeight:600,color:COLORS.text,marginBottom:2 }}>{s.name}</div>
              <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:8 }}>{s.category}</div>
              <div style={{ fontSize:16,fontWeight:700,color:s.color,marginBottom:2 }}>₹{s.amount.toLocaleString("en-IN")}</div>
              <div style={{ fontSize:10,color:COLORS.textMuted }}>Due: {fmtSubDue(s)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
"""

if start_idx != -1 and end_idx != -1:
    code = code[:start_idx] + new_sub_view + code[end_idx:]

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)
print("Finished basic replacement")
