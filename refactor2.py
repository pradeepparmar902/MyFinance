import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# Replace SubscriptionsView entirely
start_idx = code.find("function SubscriptionsView({ subscriptions, setSubscriptions, categoryMaster }) {")
end_idx = code.find("function HealthScoreViewLive", start_idx)
end_idx = code.rfind("}", start_idx, end_idx) + 1

new_sub_view = """function SubscriptionsView({ subscriptions, setSubscriptions, categoryMaster }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name:"", icon:"🎬", amount:"", cycle:"Monthly", startDate:"", endDate:"", remarks:"", color:COLORS.primary, category:"Entertainment" });

  const monthlyTotal = subscriptions.filter(s=>s.cycle==="Monthly").reduce((a,s)=>a+s.amount,0);
  const annualCost   = subscriptions.reduce((a,s)=>a+(s.cycle==="Monthly"?s.amount*12:s.amount),0);

  const handleSave = () => {
    if (!form.name || !form.amount || !form.startDate) return;
    const item = { 
      ...form, 
      amount: parseFloat(form.amount), 
      endDate: form.endDate || "" 
    };
    if (editItem) {
      setSubscriptions(p => p.map(s => s.id === editItem.id ? { ...s, ...item } : s));
    } else {
      setSubscriptions(p => [...p, { ...item, id: "sub" + Date.now(), payments: [] }]);
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
            <input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="Name" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            <input value={form.icon} onChange={e=>setForm({...form, icon: e.target.value})} placeholder="Icon (emoji)" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            <input type="number" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} placeholder="Amount" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            
            <select value={form.cycle} onChange={e=>setForm({...form, cycle: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}>
              <option value="Monthly">Monthly</option>
              <option value="Annual">Annual</option>
            </select>
            
            <select value={form.category} onChange={e=>setForm({...form, category: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}>
              {categoryMaster && categoryMaster.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>

            <input type="color" value={form.color} onChange={e=>setForm({...form, color: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, padding: "4px", borderRadius: 8, height: 38, width: "100%" }} />
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Start Date</label>
              <input type="date" value={form.startDate} onChange={e=>setForm({...form, startDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>End Date (Leave blank for Infinite)</label>
              <input type="date" value={form.endDate} onChange={e=>setForm({...form, endDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Remarks</label>
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
          <div style={{ fontSize:16,fontWeight:700,color:"#3B82F6" }}>{subscriptions.length}</div>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12 }}>
        {subscriptions.map((s,i) => (
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
}"""

if start_idx != -1 and end_idx != -1:
    code = code[:start_idx] + new_sub_view + code[end_idx:]

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)
print("Replaced SubscriptionsView")
