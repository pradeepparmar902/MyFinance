import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. State hook for FinPilotAI
if 'const [loans, setLoans] = useLocalStorage("fp_loans"' not in code:
    code = code.replace(
        'const [investments, setInvestments] = useLocalStorage("fp_investments", INV_SEED);',
        'const [investments, setInvestments] = useLocalStorage("fp_investments", INV_SEED);\n  const [loans, setLoans] = useLocalStorage("fp_loans", LOANS_SEED);'
    )

# 2. Update routing
code = code.replace(
    'case "emi":          return <EMIView />;',
    'case "emi":          return <EMIViewLive loans={loans} setLoans={setLoans} goals={goals} />;'
)

# 3. Update ExpenseViewLive signature and dependencies
code = code.replace(
    'function ExpenseViewLive({ expenses, setExpenses, filter, subscriptions, setSubscriptions, insurance, setInsurance, investments, setInvestments }) {',
    'function ExpenseViewLive({ expenses, setExpenses, filter, subscriptions, setSubscriptions, insurance, setInsurance, investments, setInvestments, loans, setLoans }) {'
)
code = code.replace(
    'case "expense":      return <ExpenseViewLive expenses={expenses} setExpenses={setExpenses} filter={filter} subscriptions={subscriptions} setSubscriptions={setSubscriptions} insurance={insurance} setInsurance={setInsurance} investments={investments} setInvestments={setInvestments} />;',
    'case "expense":      return <ExpenseViewLive expenses={expenses} setExpenses={setExpenses} filter={filter} subscriptions={subscriptions} setSubscriptions={setSubscriptions} insurance={insurance} setInsurance={setInsurance} investments={investments} setInvestments={setInvestments} loans={loans} setLoans={setLoans} />;'
)

# 4. Inject getDueEMIs into ExpenseViewLive
if 'const dueEmi = loans ? getDueEMIs(loans) : [];' not in code:
    code = code.replace(
        'const dueInv = investments ? getDueInvestments(investments) : [];',
        'const dueInv = investments ? getDueInvestments(investments) : [];\n  const dueEmi = loans ? getDueEMIs(loans) : [];'
    )
    
    # 5. Inject 🏠 Due EMIs block in ExpenseViewLive UI
    emi_block = """
        {dueEmi.length > 0 && (
          <div style={{ background: "rgba(255, 100, 100, 0.08)", border: `1px solid ${COLORS.danger}44`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.danger, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              🏠 Due EMIs ({dueEmi.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {dueEmi.map(emi => (
                <div key={emi.loanId + emi.dueDate} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{emi.name}</div>
                    <div style={{ fontSize: 10, color: COLORS.textMuted }}>{emi.bank} · Due: {emi.dueDate}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.danger }}>₹{emi.amount.toLocaleString("en-IN")}</div>
                    <button onClick={() => {
                      if (!window.confirm(`Pay EMI of ₹${emi.amount} for ${emi.name}?`)) return;
                      // 1. Log Expense
                      const nExp = { id: "e" + Date.now(), date: new Date().toISOString().split('T')[0], storeName: emi.bank, productName: emi.name + " EMI", cat: "EMI", amount: emi.amount, icon: "🏠", color: COLORS.danger, paymentMode: "Net Banking" };
                      setExpenses(p => [nExp, ...p]);
                      // 2. Mark Loan Paid
                      setLoans(p => p.map(l => l.id === emi.loanId ? { ...l, payments: [...(l.payments||[]), { date: emi.dueDate, amount: emi.amount }] } : l));
                    }} style={{ background: COLORS.danger, color: "#fff", padding: "6px 14px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Pay Now</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
"""
    code = code.replace('{dueSubs.length > 0 && (', emi_block + '\n        {dueSubs.length > 0 && (')


# 6. Replace old EMIView
s_emi = code.find('function EMIView() {')
if s_emi != -1:
    e_emi = code.find('// ─── Subscriptions View', s_emi)
    if e_emi == -1: e_emi = code.find('function ', s_emi + 20)
    
    new_emi_code = """
const LOANS_SEED = [
  { id: "loan1", name: "Home Loan", bank: "HDFC Bank", type: "Compound (PMT)", principal: 3850000, startDate: "2024-01-15", endDate: "2044-01-15", interestRate: 8.5, rateHistory: [], payments: [], remarks: "Dream home", linkedGoal: "", icon: "🏠", color: COLORS.primary },
  { id: "loan2", name: "Car Loan", bank: "ICICI Bank", type: "Fixed", principal: 600000, startDate: "2024-05-10", endDate: "2029-05-10", interestRate: 9.2, rateHistory: [], payments: [], remarks: "Honda City", linkedGoal: "", icon: "🚗", color: COLORS.secondary },
  { id: "loan3", name: "Floating Home Loan", bank: "SBI", type: "Floating", principal: 5000000, startDate: "2023-01-01", endDate: "2043-01-01", interestRate: 8.0, rateHistory: [{ date: "2025-01-01", rate: 8.5 }], payments: [], remarks: "Villa project", linkedGoal: "", icon: "🏘️", color: COLORS.accent }
];

const calculateAmortization = (loan) => {
  if (!loan || !loan.startDate || !loan.endDate || !loan.principal) return [];
  const [sy, sm, sd] = loan.startDate.split('-');
  const [ey, em, ed] = loan.endDate.split('-');
  const start = new Date(sy, sm-1, sd);
  const end = new Date(ey, em-1, ed);
  
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (months <= 0) months = 1;

  const schedule = [];
  let balance = parseFloat(loan.principal);
  let currentRate = parseFloat(loan.interestRate);
  
  // FIXED logic
  if (loan.type === "Fixed") {
    const totalInt = balance * (currentRate / 100) * (months / 12);
    const emi = (balance + totalInt) / months;
    const prinPerMonth = balance / months;
    const intPerMonth = totalInt / months;
    
    let dt = new Date(start);
    for (let i = 1; i <= months; i++) {
      const dStr = dt.toISOString().split('T')[0];
      schedule.push({ month: i, date: dStr, emi, principal: prinPerMonth, interest: intPerMonth, balance: Math.max(0, balance - prinPerMonth), rate: currentRate });
      balance -= prinPerMonth;
      dt.setMonth(dt.getMonth() + 1);
    }
    return schedule;
  }

  // COMPOUND / FLOATING logic
  const rh = (loan.rateHistory || []).map(r => {
    const [ry, rm, rd] = r.date.split('-');
    return { dateObj: new Date(ry, rm-1, rd), rate: parseFloat(r.rate) };
  }).sort((a,b) => a.dateObj - b.dateObj);

  let dt = new Date(start);
  let pmt = 0;
  
  const calcPMT = (P, rateAnnum, n) => {
    if (rateAnnum <= 0) return P / n;
    const r = rateAnnum / 12 / 100;
    return (P * r * Math.pow(1+r, n)) / (Math.pow(1+r, n) - 1);
  };
  
  pmt = calcPMT(balance, currentRate, months);

  for (let i = 1; i <= months; i++) {
    // Check floating rate changes
    if (loan.type === "Floating" && rh.length > 0) {
      const activeHist = rh.filter(r => r.dateObj <= dt).pop();
      if (activeHist && activeHist.rate !== currentRate) {
        currentRate = activeHist.rate;
        // Recalculate PMT with remaining balance and remaining months
        pmt = calcPMT(balance, currentRate, months - i + 1);
      }
    }

    const rMonth = currentRate / 12 / 100;
    const interest = balance * rMonth;
    let prin = pmt - interest;
    
    // Last month precision correction
    if (i === months) { prin = balance; pmt = prin + interest; }
    
    balance -= prin;
    if (balance < 0) balance = 0;

    const dStr = dt.toISOString().split('T')[0];
    schedule.push({ month: i, date: dStr, emi: pmt, principal: prin, interest: interest, balance, rate: currentRate });
    
    dt.setMonth(dt.getMonth() + 1);
  }
  return schedule;
};

const getDueEMIs = (loans) => {
  if (!loans) return [];
  const due = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  
  loans.forEach(loan => {
    if (loan.status === "Closed" || !loan.startDate) return;
    const schedule = calculateAmortization(loan);
    
    schedule.forEach(row => {
      const [ry, rm, rd] = row.date.split('-');
      const rDate = new Date(ry, rm-1, rd);
      if (rDate <= today) {
        const dStr = row.date.substring(0, 7); // match by YYYY-MM
        const isPaid = loan.payments && loan.payments.some(p => p.date.substring(0,7) === dStr);
        if (!isPaid) {
          due.push({ loanId: loan.id, name: loan.name, bank: loan.bank, amount: row.emi, dueDate: row.date, icon: loan.icon });
        }
      }
    });
  });
  
  // Deduplicate just in case multiple months are overdue, we only want to show the earliest unpaid per loan, or all? Let's show all overdue.
  return due;
};

function EMIViewLive({ loans, setLoans, goals }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name:"", bank:"", type:"Compound (PMT)", principal:"", startDate:"", endDate:"", interestRate:"", rateHistory:[], remarks:"", linkedGoal:"", icon:"🏠", color:COLORS.primary });
  
  const [viewSchedule, setViewSchedule] = useState(null); // stores loan to view schedule

  const totalEMI = loans ? loans.reduce((s,l) => {
    const sch = calculateAmortization(l);
    if(sch.length>0) return s + sch[0].emi;
    return s;
  }, 0) : 0;
  
  const totalBalance = loans ? loans.reduce((s,l) => {
    const sch = calculateAmortization(l);
    const paidCount = l.payments ? l.payments.length : 0;
    if(sch.length > paidCount) return s + sch[paidCount].balance;
    return s;
  }, 0) : 0;

  const handleSave = () => {
    if (!form.name || !form.principal || !form.startDate || !form.endDate) return alert("Required fields missing.");
    const item = { ...form, principal: parseFloat(form.principal), interestRate: parseFloat(form.interestRate||0) };
    if (editItem) {
      setLoans(p => p.map(i => i.id === editItem.id ? { ...i, ...item } : i));
    } else {
      setLoans(p => [...(p||[]), { ...item, id: "loan" + Date.now(), payments: [] }]);
    }
    setShowForm(false);
  };

  const addRateHist = () => {
    setForm(p => ({ ...p, rateHistory: [...p.rateHistory, { date: new Date().toISOString().split('T')[0], rate: "" }] }));
  };

  const updateRateHist = (idx, field, val) => {
    const rh = [...form.rateHistory];
    rh[idx][field] = val;
    setForm(p => ({ ...p, rateHistory: rh }));
  };
  
  const removeRateHist = (idx) => {
    setForm(p => ({ ...p, rateHistory: p.rateHistory.filter((_,i)=>i!==idx) }));
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:18,fontWeight:700,color:COLORS.text }}>EMI & Loans</div>
          <div style={{ fontSize:12,color:COLORS.textMuted }}>Advanced Amortization Tracker</div>
        </div>
        <button onClick={() => { setEditItem(null); setForm({ name:"", bank:"", type:"Compound (PMT)", principal:"", startDate:new Date().toISOString().split('T')[0], endDate:"", interestRate:"", rateHistory:[], remarks:"", linkedGoal:"", icon:"🏠", color:COLORS.primary }); setShowForm(true); }} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add Loan</button>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,minmax(80px,1fr))",gap:9,marginBottom:16 }}>
        {[
          { l:"Est. Monthly EMI", v:`₹${totalEMI.toLocaleString("en-IN", {maximumFractionDigits:0})}`,       c:COLORS.danger    },
          { l:"Outstanding Bal",  v:`₹${(totalBalance/100000).toFixed(2)}L`,       c:COLORS.accent    },
          { l:"Active Loans",     v:`${loans?loans.length:0}`,                             c:COLORS.primary   },
        ].map(s=>(
          <div key={s.l} style={{ background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:11,padding:"10px 12px" }}>
            <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:3 }}>{s.l}</div>
            <div style={{ fontSize:14,fontWeight:700,color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:11 }}>
        {loans && loans.map(l => {
          const sch = calculateAmortization(l);
          const paidCount = l.payments ? l.payments.length : 0;
          const pct = sch.length > 0 ? Math.round((paidCount / sch.length) * 100) : 0;
          const currEmi = sch.length > 0 ? (sch[paidCount < sch.length ? paidCount : sch.length-1].emi) : 0;
          const currBal = sch.length > 0 ? (paidCount < sch.length ? sch[paidCount].balance : 0) : 0;

          return (
            <div key={l.id} style={{ background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:14,padding:"14px 16px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{ width:38,height:38,borderRadius:10,background:`${l.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{l.icon}</div>
                  <div>
                    <div style={{ fontSize:13,fontWeight:600,color:COLORS.text }}>{l.name}</div>
                    <div style={{ fontSize:10.5,color:COLORS.textMuted }}>{l.bank} · {l.type}</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                  <div style={{ textAlign:"right",flexShrink:0 }}>
                    <div style={{ fontSize:16,fontWeight:700,color:l.color }}>₹{currEmi.toLocaleString("en-IN", {maximumFractionDigits:0})}<span style={{ fontSize:10,color:COLORS.textMuted }}>/mo</span></div>
                    <div style={{ fontSize:10.5,color:COLORS.textMuted }}>Bal: ₹{(currBal/100000).toFixed(2)}L</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                     <button onClick={() => setViewSchedule(l)} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "2px 6px", color: COLORS.textMuted, fontSize: 10, cursor: "pointer" }}>Schedule</button>
                     <button onClick={() => { setEditItem(l); setForm({...l}); setShowForm(true); }} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "2px 6px", color: COLORS.textMuted, fontSize: 10, cursor: "pointer" }}>Edit</button>
                  </div>
                </div>
              </div>
              <div style={{ background:"rgba(255,255,255,0.06)",borderRadius:4,height:6,marginBottom:6 }}>
                <div style={{ height:"100%",width:`${pct}%`,borderRadius:4,background:`linear-gradient(90deg,${l.color},${l.color}88)`,transition:"width 1s",boxShadow:`0 0 6px ${l.color}55` }}/>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:10.5,color:COLORS.textMuted }}>
                <span>{paidCount}/{sch.length} EMIs paid ({pct}%)</span>
                <span style={{ color:COLORS.secondary }}>{sch.length - paidCount} left</span>
              </div>
            </div>
          );
        })}
      </div>

      {viewSchedule && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:110,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div style={{ background:"#0f172a",border:`1px solid ${COLORS.border}`,borderRadius:16,width:"100%",maxWidth:600,maxHeight:"90vh",display:"flex",flexDirection:"column" }}>
            <div style={{ padding:16,borderBottom:`1px solid ${COLORS.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <div style={{ fontSize:15,fontWeight:700,color:COLORS.text }}>Amortization Schedule</div>
                <div style={{ fontSize:11,color:COLORS.textMuted }}>{viewSchedule.name} ({viewSchedule.type})</div>
              </div>
              <button onClick={()=>setViewSchedule(null)} style={{ background:"transparent",border:"none",color:COLORS.textMuted,cursor:"pointer",fontSize:20 }}>✕</button>
            </div>
            <div style={{ overflowY:"auto",padding:16 }}>
              <table style={{ width:"100%",borderCollapse:"collapse",fontSize:11,textAlign:"right" }}>
                <thead>
                  <tr style={{ color:COLORS.textMuted,borderBottom:`1px solid ${COLORS.border}` }}>
                    <th style={{ textAlign:"left",paddingBottom:8 }}>Mo/Date</th>
                    <th style={{ paddingBottom:8 }}>EMI</th>
                    <th style={{ paddingBottom:8 }}>Principal</th>
                    <th style={{ paddingBottom:8 }}>Interest</th>
                    <th style={{ paddingBottom:8 }}>Rate</th>
                    <th style={{ paddingBottom:8 }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateAmortization(viewSchedule).map((row, i) => {
                    const isPaid = viewSchedule.payments && i < viewSchedule.payments.length;
                    return (
                    <tr key={i} style={{ borderBottom:`1px solid rgba(255,255,255,0.03)`, color: isPaid ? COLORS.success : COLORS.text }}>
                      <td style={{ textAlign:"left",padding:"8px 0" }}>{row.month}<div style={{fontSize:9,color:COLORS.textMuted}}>{row.date} {isPaid?"✓":""}</div></td>
                      <td>₹{row.emi.toLocaleString("en-IN", {maximumFractionDigits:0})}</td>
                      <td style={{ color: COLORS.primary }}>₹{row.principal.toLocaleString("en-IN", {maximumFractionDigits:0})}</td>
                      <td style={{ color: COLORS.danger }}>₹{row.interest.toLocaleString("en-IN", {maximumFractionDigits:0})}</td>
                      <td style={{ color: COLORS.textMuted }}>{row.rate}%</td>
                      <td style={{ fontWeight:700 }}>₹{row.balance.toLocaleString("en-IN", {maximumFractionDigits:0})}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
          <div style={{ background:"#0d1526",border:`1px solid rgba(108,99,255,0.25)`,borderRadius:"20px 20px 0 0",padding:"20px 18px 32px",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <div style={{ fontSize:15,fontWeight:700,color:COLORS.text }}>{editItem?"✏️ Edit Loan":"➕ Add Loan"}</div>
              <button onClick={()=>setShowForm(false)} style={{ background:"rgba(255,255,255,0.07)",border:"none",borderRadius:8,width:30,height:30,color:COLORS.textMuted,cursor:"pointer",fontSize:16 }}>✕</button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Loan Name</label><input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="e.g. Home Loan" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Bank / Provider</label><input value={form.bank} onChange={e=>setForm({...form, bank: e.target.value})} placeholder="e.g. HDFC Bank" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Type</label><select value={form.type} onChange={e=>setForm({...form, type: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="Compound (PMT)">Compound (PMT Schedule)</option><option value="Fixed">Fixed Interest</option><option value="Floating">Floating Interest</option></select></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Principal Amount (₹)</label><input type="number" value={form.principal} onChange={e=>setForm({...form, principal: e.target.value})} placeholder="e.g. 5000000" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Start Date</label><input type="date" value={form.startDate} onChange={e=>setForm({...form, startDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>End Date</label><input type="date" value={form.endDate} onChange={e=>setForm({...form, endDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Base Interest Rate (%)</label><input type="number" value={form.interestRate} onChange={e=>setForm({...form, interestRate: e.target.value})} placeholder="e.g. 8.5" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>More Information / Purpose</label><input value={form.remarks||""} onChange={e=>setForm({...form, remarks: e.target.value})} placeholder="Purpose" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Linked Goal</label><select value={form.linkedGoal||""} onChange={e=>setForm({...form, linkedGoal: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="">None</option>{goals && goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
            </div>

            {form.type === "Floating" && (
              <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>Floating Rate History</div>
                  <button onClick={addRateHist} style={{ background: COLORS.primary, border: "none", color: "#fff", padding: "4px 8px", borderRadius: 4, fontSize: 10, cursor: "pointer" }}>+ Add Rate Change</button>
                </div>
                {form.rateHistory.map((rh, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <input type="date" value={rh.date} onChange={e=>updateRateHist(i, "date", e.target.value)} style={{ flex: 1, background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "6px", borderRadius: 4, fontSize: 10 }} />
                    <input type="number" value={rh.rate} onChange={e=>updateRateHist(i, "rate", e.target.value)} placeholder="New Rate %" style={{ flex: 1, background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "6px", borderRadius: 4, fontSize: 10 }} />
                    <button onClick={()=>removeRateHist(i)} style={{ background: "transparent", color: COLORS.danger, border: "none", cursor: "pointer" }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleSave} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save Loan</button>
          </div>
        </div>
      )}
    </div>
  );
}
"""
    code = code[:s_emi] + new_emi_code + code[e_emi:]


with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Applied EMI engine successfully.")
