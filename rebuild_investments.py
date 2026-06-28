import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Clean up broken additions
code = re.sub(r'case "banking":.*?;\n', '', code)
code = re.sub(r'\s*\{\s*id:\s*"banking".*?\},', '', code)

# Remove broken InvestmentsView if it exists
s_bad = code.find('function InvestmentsView({')
if s_bad != -1:
    e_bad = code.find('// ───', s_bad)
    if e_bad == -1: e_bad = code.find('function ', s_bad + 20)
    code = code[:s_bad] + code[e_bad:]

# 2. Rename NAV
code = re.sub(r'\{\s*id:\s*"investments".*?\}', '{ id: "investments", icon: "🏦", label: "Banking & Inv." }', code)

# 3. Inject new getDueInvestments if not present
due_logic = """
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
        due.push({ invId: inv.id, name: inv.name, provider: inv.provider||"", amount: inv.amount||inv.invested, dueDate: inv.startDate, cycle: "One-Time", icon: inv.icon, color: inv.color, type: inv.type, item: inv });
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
        due.push({ invId: inv.id, name: inv.name, provider: inv.provider||"", amount: inv.amount||inv.invested, dueDate: nextDateStr, cycle: "Monthly", icon: inv.icon, color: inv.color, type: inv.type, item: inv });
      }
      nextDate.setMonth(nextDate.getMonth() + 1);
      limit++;
    }
  });
  return due;
};
"""
if "const getDueInvestments =" not in code:
    code = code.replace("function InvestmentsViewLive", due_logic + "\nfunction InvestmentsViewLive")

# 4. Replace InvestmentsViewLive
live_start = code.find('function InvestmentsViewLive({')
live_end = code.find('// ───', live_start)
if live_end == -1: live_end = code.find('function ', live_start + 20)

new_live_code = """function InvestmentsViewLive({ investments, setInvestments }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [invFilter, setInvFilter] = useState("All");
  
  const [form, setForm] = useState({ name:"", provider:"", type:"Mutual Fund SIP", icon:"📈", amount:"", current:"", interestRate:"", maturityAmount:"", startDate: new Date().toISOString().split('T')[0], endDate:"", remarks:"", docName:"", docData:"", status:"Active", color:COLORS.secondary });

  const totalInvested = investments ? investments.reduce((sum, inv) => {
      const paid = inv.payments ? inv.payments.reduce((s, p) => s + p.amount, 0) : 0;
      return sum + (paid > 0 ? paid : (inv.invested || 0));
  }, 0) : 0;
  
  const totalCurrent = investments ? investments.reduce((sum, inv) => sum + (inv.current || inv.invested || 0), 0) : 0;
  const totalGain = totalCurrent - totalInvested;
  const gainPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : 0;

  const handleSave = () => {
    if (!form.name || (!form.amount && !form.invested) || !form.startDate) return alert("Name, Amount/Invested, and Start Date are required.");
    const amt = parseFloat(form.amount || form.invested);
    const item = { ...form, amount: amt, invested: amt, current: parseFloat(form.current || amt) };
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

  const displayedInvestments = invFilter === "All" ? investments : (investments || []).filter(i => i.type === invFilter);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:18,fontWeight:700,color:COLORS.text }}>Banking & Investments</div>
          <div style={{ fontSize:12,color:COLORS.textMuted }}>{investments?investments.length:0} holdings · Live tracking</div>
        </div>
        <button onClick={() => { setEditItem(null); setForm({ name:"", provider:"", type:"Mutual Fund SIP", icon:"📈", amount:"", current:"", interestRate:"", maturityAmount:"", startDate: new Date().toISOString().split('T')[0], endDate:"", remarks:"", docName:"", docData:"", status:"Active", color:COLORS.secondary }); setShowForm(true); }} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add Investment</button>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,minmax(80px,1fr))",gap:9,marginBottom:14 }}>
        {[{l:"Total Invested",v:`₹${(totalInvested/1000).toFixed(1)}K`,c:COLORS.textMuted},{l:"Current Value",v:`₹${(totalCurrent/1000).toFixed(1)}K`,c:COLORS.text},{l:`Gain (${gainPct}%)`,v:`${totalGain>=0?"+":""}₹${(totalGain/1000).toFixed(1)}K`,c:totalGain>=0?COLORS.secondary:COLORS.danger}].map(s=>(
          <div key={s.l} style={{ background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:11,padding:"10px 12px" }}>
            <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:3 }}>{s.l}</div>
            <div style={{ fontSize:14,fontWeight:700,color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:8, marginBottom:16 }}>
        {["All","Mutual Fund SIP","Stock","Fixed Deposit","Recurring Deposit","Gold","PPF","Other"].map(c => (
          <div key={c} onClick={() => setInvFilter(c)} style={{ whiteSpace:"nowrap", padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", background: invFilter===c ? COLORS.primary : "#1e293b", color: invFilter===c ? "#fff" : COLORS.textMuted }}>{c}</div>
        ))}
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12 }}>
        {displayedInvestments && displayedInvestments.map((inv,i) => {
          const paidAmt = inv.payments ? inv.payments.reduce((s,p)=>s+p.amount,0) : (inv.invested || 0);
          const isLump = (inv.type === "Fixed Deposit" || inv.type === "Mutual Fund Lumpsum" || inv.type === "Stock" || inv.type === "Gold" || inv.type === "Other (One-Time)");
          const pct = inv.maturityAmount ? Math.min(100, (paidAmt / inv.maturityAmount)*100) : 0;
          const curr = inv.current || inv.invested || 0;
          const gain = curr - paidAmt;
          const gPct = paidAmt > 0 ? ((gain / paidAmt)*100).toFixed(1) : 0;
          
          return (
          <div key={i} onClick={() => { setEditItem(inv); setForm({ ...inv, amount: inv.amount||inv.invested }); setShowForm(true); }} style={{ background:"#1a2236",borderRadius:12,border:`1px solid ${COLORS.border}`,position:"relative",overflow:"hidden",cursor:"pointer", opacity: inv.status==="Active"||!inv.status?1:0.6 }}>
            <div style={{ position:"absolute",left:0,top:0,bottom:0,width:4,background:inv.color||COLORS.primary }} />
            <div style={{ padding:12,paddingLeft:16 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                <div style={{ fontSize:20 }}>{inv.icon||"🏦"}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {inv.status && inv.status !== "Active" && <div style={{ fontSize:9,background:"#f59e0b33",color:"#f59e0b",padding:"2px 8px",borderRadius:12 }}>{inv.status}</div>}
                  <div style={{ fontSize:9,background:"rgba(255,255,255,0.1)",padding:"2px 8px",borderRadius:12,color:COLORS.textMuted }}>{inv.type}</div>
                </div>
              </div>
              <div style={{ fontSize:13,fontWeight:600,color:COLORS.text,marginBottom:2 }}>{inv.name}</div>
              <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:8 }}>{inv.provider || "Portfolio"}</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                <div>
                  <div style={{ fontSize:16,fontWeight:700,color:inv.color||COLORS.primary,marginBottom:2 }}>₹{(inv.amount||inv.invested||0).toLocaleString("en-IN")}<span style={{fontSize:10,fontWeight:400,color:COLORS.textMuted}}>{isLump ? "" : "/mo"}</span></div>
                  {inv.interestRate ? <div style={{ fontSize:10,color:COLORS.success }}>{inv.interestRate}% Interest</div> : <div style={{ fontSize:10,color:gain>=0?COLORS.secondary:COLORS.danger }}>{gain>=0?"+":""}₹{gain.toLocaleString("en-IN")} ({gPct}%)</div>}
                </div>
                {inv.maturityAmount ? (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize:12,fontWeight:700,color:COLORS.text }}>₹{Number(inv.maturityAmount).toLocaleString("en-IN")}</div>
                    <div style={{ fontSize:9,color:COLORS.textMuted }}>Maturity Value</div>
                  </div>
                ) : (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize:12,fontWeight:700,color:COLORS.text }}>₹{Number(curr).toLocaleString("en-IN")}</div>
                    <div style={{ fontSize:9,color:COLORS.textMuted }}>Current Value</div>
                  </div>
                )}
              </div>
              {inv.maturityAmount && (
                <div style={{ marginTop: 12, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: inv.color||COLORS.primary, borderRadius: 2 }} />
                </div>
              )}
              <div style={{ marginTop: 4, fontSize: 9, color: COLORS.textMuted, textAlign: "right" }}>Total Paid: ₹{paidAmt.toLocaleString("en-IN")}</div>
            </div>
          </div>
        )})}
      </div>

      {showForm && (
        <div style={{ background: "#1a2236", padding: 16, borderRadius: 12, marginBottom: 16, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Investment Name</label><input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="e.g. HDFC RD" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Bank / Provider</label><input value={form.provider} onChange={e=>setForm({...form, provider: e.target.value})} placeholder="e.g. HDFC Bank" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Type</label><select value={form.type} onChange={e=>setForm({...form, type: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="Recurring Deposit">Recurring Deposit (RD)</option><option value="Fixed Deposit">Fixed Deposit (FD)</option><option value="Mutual Fund SIP">Mutual Fund SIP</option><option value="Mutual Fund">Mutual Fund (Lumpsum)</option><option value="Stock">Stock/Equity</option><option value="Gold">Gold</option><option value="PPF">PPF</option><option value="Other">Other</option></select></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Amount / Principal (₹)</label><input type="number" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} placeholder="Principal or Monthly" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Current Value (₹)</label><input type="number" value={form.current} onChange={e=>setForm({...form, current: e.target.value})} placeholder="Current Value" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Start Date</label><input type="date" value={form.startDate||""} onChange={e=>setForm({...form, startDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>End Date</label><input type="date" value={form.endDate||""} onChange={e=>setForm({...form, endDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Interest Rate (%)</label><input type="number" value={form.interestRate||""} onChange={e=>setForm({...form, interestRate: e.target.value})} placeholder="e.g. 7.1" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Maturity Amount (₹)</label><input type="number" value={form.maturityAmount||""} onChange={e=>setForm({...form, maturityAmount: e.target.value})} placeholder="e.g. 150000" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Upload Certificate</label>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => {
                const file = e.target.files[0];
                if (file && file.size <= 2.5 * 1024 * 1024) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setForm({...form, docName: file.name, docData: ev.target.result});
                  reader.readAsDataURL(file);
                }
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
                <button onClick={() => setForm({...form, status: form.status === "Paused" ? "Active" : form.status === "Closed" ? "Active" : "Paused"})} style={{ background: form.status === "Active" || !form.status ? "#f59e0b" : "#10b981", color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>
                  {form.status === "Active" || !form.status ? "⏸ Pause" : "▶ Resume"}
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
    </div>
  );
}
"""

code = code[:live_start] + new_live_code + code[live_end:]

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Investments unified successfully.")
