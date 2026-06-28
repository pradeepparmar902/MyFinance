function EMIViewLive({ loans, setLoans, goals, banks, creditCards }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name:"", bank:"", bankId:"", type:"Compound (PMT)", principal:"", startDate:"", endDate:"", interestRate:"", rateHistory:[], emiAmount:"", remarks:"", linkedGoal:"", icon:"🏠", color:COLORS.primary });
  
  const [viewSchedule, setViewSchedule] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const handleSoaEdit = (loanId, month, field, valStr, currentPrin, currentInt, currentEmi) => {
    const val = parseFloat(valStr) || 0;
    setLoans(prev => prev.map(l => {
      if (l.id !== loanId) return l;
      const overrides = [...(l.soaOverrides || [])];
      let ov = overrides.find(o => o.month === month);
      if (!ov) {
        ov = { month, emi: currentEmi, principal: currentPrin, interest: currentInt };
        overrides.push(ov);
      } else {
        ov = { ...ov }; // clone
        const idx = overrides.findIndex(o => o.month === month);
        overrides[idx] = ov;
      }
      
      if (field === "emi") {
        ov.emi = valStr === "" ? "" : val;
        if (ov.interest === 0) {
          ov.principal = val;
        } else {
          ov.interest = Math.max(0, val - ov.principal);
        }
      } else if (field === "interest") {
        ov.interest = valStr === "" ? "" : val;
        ov.principal = ov.emi - val;
      } else if (field === "principal") {
        ov.principal = valStr === "" ? "" : val;
        ov.interest = ov.emi - val;
      }
      
      return { ...l, soaOverrides: overrides };
    }));
  };
 // stores loan to view schedule

  const [activeBreakup, setActiveBreakup] = useState(null);
  
  const todayDate = new Date();
  todayDate.setHours(0,0,0,0);

  const breakupData = { paid: [], today: [], overdue: [], nextMonth: [], future: [] };
  const metrics = { paid: 0, today: 0, overdue: 0, nextMonth: 0, future: 0 };

  (loans || []).forEach(l => {
    if (l.status === "Closed" || !l.startDate) return;
    const schedule = calculateAmortization(l);
    schedule.forEach((row) => {
      const dStr = row.date.substring(0, 7);
      const isPaid = l.payments && l.payments.some(p => p.date.substring(0,7) === dStr);
      
      const item = { loanName: l.name, bank: l.bank, icon: l.icon, color: l.color, amount: row.emi, principal: row.principal, interest: row.interest, date: row.date, monthIdx: row.month };

      if (isPaid) {
        metrics.paid += row.emi;
        breakupData.paid.push(item);
      } else {
        const [ry, rm, rd] = row.date.split('-');
        const rDate = new Date(ry, parseInt(rm)-1, parseInt(rd));
        
        if (rDate.getTime() === todayDate.getTime()) {
          metrics.today += row.emi;
          breakupData.today.push(item);
        } else if (rDate < todayDate) {
          metrics.overdue += row.emi;
          breakupData.overdue.push(item);
        } else {
          // Check if it is NEXT calendar month
          let nextM = todayDate.getMonth() + 1;
          let nextY = todayDate.getFullYear();
          if (nextM > 11) { nextM = 0; nextY++; }
          
          if (rDate.getFullYear() === nextY && rDate.getMonth() === nextM) {
            metrics.nextMonth += row.emi;
            breakupData.nextMonth.push(item);
          } else {
            metrics.future += row.emi;
            breakupData.future.push(item);
          }
        }
      }
    });
  });

  const grandTotal = metrics.paid + metrics.today + metrics.overdue + metrics.nextMonth + metrics.future;


  const handleSave = () => {
    if (!form.name || !form.principal || !form.startDate || !form.endDate || !form.emiAmount) return alert("Name, Principal, Installment Amount, Start and End Dates are required.");
    const item = { ...form, principal: parseFloat(form.principal), interestRate: parseFloat(form.interestRate||0) };
    if (editItem) {
      setLoans(p => p.map(i => i.id === editItem.id ? { ...i, ...item } : i));
    } else {
      setLoans(p => [...(p||[]), { ...item, id: "loan" + Date.now(), payments: [], trxNo: item.trxNo || getNextTrxNo("LON", p) }]);
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
        <button onClick={() => { setEditItem(null); setForm({ name:"", bank:"", type:"Compound (PMT)", principal:"", startDate:new Date().toISOString().split('T')[0], endDate:"", interestRate:"", rateHistory:[], emiAmount:"", deductionBank:"", remarks:"", linkedGoal:"", icon:"🏠", color:COLORS.primary }); setShowForm(true); }} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add Loan</button>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(100px, 1fr))",gap:9,marginBottom:16 }}>
        {[
          { l:"Total Paid", v:`₹${metrics.paid.toLocaleString("en-IN", {maximumFractionDigits:0})}`, c:COLORS.primary, key: "paid" },
          { l:"Due Today",  v:`₹${metrics.today.toLocaleString("en-IN", {maximumFractionDigits:0})}`, c:COLORS.accent, key: "today" },
          { l:"Overdue",    v:`₹${metrics.overdue.toLocaleString("en-IN", {maximumFractionDigits:0})}`, c:COLORS.danger, key: "overdue" },
          { l:"Next Month", v:`₹${metrics.nextMonth.toLocaleString("en-IN", {maximumFractionDigits:0})}`, c:COLORS.secondary, key: "nextMonth" },
          { l:"Future Due", v:`₹${metrics.future.toLocaleString("en-IN", {maximumFractionDigits:0})}`, c:COLORS.text, key: "future" },
          { l:"Grand Total",v:`₹${grandTotal.toLocaleString("en-IN", {maximumFractionDigits:0})}`, c:"#fff", key: "all" },
        ].map(s=>(
          <div key={s.l} onClick={() => s.key !== 'all' && breakupData[s.key].length > 0 && setActiveBreakup({ title: s.l, data: breakupData[s.key] })} style={{ background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:11,padding:"10px 12px", cursor: s.key !== 'all' && breakupData[s.key]?.length > 0 ? "pointer" : "default", transition: "all 0.2s" }} onMouseOver={e => { if(s.key !== 'all' && breakupData[s.key]?.length > 0) e.currentTarget.style.background = COLORS.bgCardHover; }} onMouseOut={e => { e.currentTarget.style.background = COLORS.bgCard; }}>
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
                     <button onClick={() => setViewSchedule(l)} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "2px 6px", color: COLORS.textMuted, fontSize: 10, cursor: "pointer", width: "100%" }}>Schedule</button>
                     <button onClick={() => { setEditItem(l); setForm({...l}); setShowForm(true); }} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "2px 6px", color: COLORS.textMuted, fontSize: 10, cursor: "pointer", width: "100%" }}>Edit</button>
                     <button onClick={() => { 
                       setDeleteConfirm({ loan: l, step: 1 });
                     }} style={{ background: "rgba(255,50,50,0.1)", border: `1px solid rgba(255,50,50,0.2)`, borderRadius: 4, padding: "2px 6px", color: COLORS.danger, fontSize: 10, cursor: "pointer", width: "100%" }}>Delete</button>
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
                  {calculateAmortization(loans.find(l=>l.id===viewSchedule.id)||viewSchedule).map((row, i) => {
                    const activeLoan = loans.find(l=>l.id===viewSchedule.id)||viewSchedule;
                    const isPaid = activeLoan.payments && i < activeLoan.payments.length;
                    return (
                    <tr key={i} style={{ borderBottom:`1px solid rgba(255,255,255,0.03)`, color: isPaid ? COLORS.success : COLORS.text }}>
                      <td style={{ textAlign:"left",padding:"8px 0" }}>{row.month}<div style={{fontSize:9,color:COLORS.textMuted}}>{row.date} {isPaid?"✓":""}</div></td>
                      <td>
                        <input type="number" key={`emi-${row.month}-${Math.round(row.emi)}`} defaultValue={Math.round(row.emi)} onBlur={e => handleSoaEdit(activeLoan.id, row.month, "emi", e.target.value, row.principal, row.interest, row.emi)} style={{ background:"transparent", border:"1px solid transparent", borderBottom:`1px solid ${COLORS.border}`, color:isPaid?COLORS.success:COLORS.text, width:"60px", fontSize:13, padding:"2px 4px", outline:"none" }} onFocus={e => e.target.style.border=`1px solid ${COLORS.primary}`} />
                      </td>
                      <td>
                        <input type="number" key={`prin-${row.month}-${Math.round(row.principal)}`} defaultValue={Math.round(row.principal)} onBlur={e => handleSoaEdit(activeLoan.id, row.month, "principal", e.target.value, row.principal, row.interest, row.emi)} style={{ background:"transparent", border:"1px solid transparent", borderBottom:`1px solid ${COLORS.border}`, color:isPaid?COLORS.success:COLORS.primary, width:"60px", fontSize:13, padding:"2px 4px", outline:"none" }} onFocus={e => e.target.style.border=`1px solid ${COLORS.primary}`} />
                      </td>
                      <td>
                        <input type="number" key={`int-${row.month}-${Math.round(row.interest)}`} defaultValue={Math.round(row.interest)} onBlur={e => handleSoaEdit(activeLoan.id, row.month, "interest", e.target.value, row.principal, row.interest, row.emi)} style={{ background:"transparent", border:"1px solid transparent", borderBottom:`1px solid ${COLORS.border}`, color:isPaid?COLORS.success:COLORS.danger, width:"60px", fontSize:13, padding:"2px 4px", outline:"none" }} onFocus={e => e.target.style.border=`1px solid ${COLORS.primary}`} />
                      </td>
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

                  {deleteConfirm && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.7)", zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, width: "90%", maxWidth: 400, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: deleteConfirm.step === 2 ? COLORS.danger : COLORS.text, marginBottom: 8 }}>
              {deleteConfirm.step === 1 ? "Delete Loan" : "⚠️ Final Warning"}
            </div>
            <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 24 }}>
              {deleteConfirm.step === 1 
                ? `Are you sure you want to delete ${deleteConfirm.loan.name}?` 
                : "This will permanently erase the loan schedule and payment history. Proceed?"}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => {
                if (deleteConfirm.step === 1) {
                  setDeleteConfirm({ ...deleteConfirm, step: 2 });
                } else {
                  setLoans(p => p.filter(x => x.id !== deleteConfirm.loan.id));
                  setDeleteConfirm(null);
                }
              }} style={{ background: COLORS.danger, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>
                {deleteConfirm.step === 1 ? "Delete" : "Permanently Delete"}
              </button>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Bank / Provider</label>
              <select value={form.bankId||""} onChange={e=>setForm({...form, bankId:e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, padding: "9px 12px", color: COLORS.text, fontSize: 13, borderRadius: 9, width: "100%", outline: "none" }}>
                <option value="">Select Bank Account</option>
                {(banks||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Type</label><select value={form.type} onChange={e=>setForm({...form, type: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="Compound (PMT)">Compound (PMT Schedule)</option><option value="Fixed">Fixed Interest</option><option value="Floating">Floating Interest</option></select></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Principal Amount (₹)</label><input type="number" value={form.principal} onChange={e=>setForm({...form, principal: e.target.value})} placeholder="e.g. 5000000" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Start Date</label><input type="date" value={form.startDate} onChange={e=>setForm({...form, startDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>End Date</label><input type="date" value={form.endDate} onChange={e=>setForm({...form, endDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Base Interest Rate (%)</label><input type="number" value={form.interestRate} onChange={e=>setForm({...form, interestRate: e.target.value})} placeholder="e.g. 8.5" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Cycle</label><select value={form.cycle||"Monthly"} onChange={e=>setForm({...form, cycle: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option><option value="Half-Yearly">Half-Yearly</option><option value="Annually">Annually</option><option value="One-Time">One-Time</option></select></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Installment / Payable Amount (₹) *</label><input type="number" value={form.emiAmount||""} onChange={e=>setForm({...form, emiAmount: e.target.value})} placeholder="Amount to pay/invest" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Deduction Bank Account</label>
              <select value={form.bankId||""} onChange={e=>setForm({...form, bankId:e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, padding: "8px 12px", color: COLORS.text, fontSize: 13, borderRadius: 8, width: "100%", outline: "none" }}>
                <option value="">Select Account</option>
                <optgroup label="Bank Accounts">
                  {(banks||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </optgroup>
                <optgroup label="Credit Cards">
                  {(creditCards||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              </select>
            </div>
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
// ─── Subscriptions View ───────────────────────────────────────────────────────
