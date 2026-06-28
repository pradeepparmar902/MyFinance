function ExpenseViewLive({ expenses, setExpenses, filter, subscriptions, setSubscriptions, insurance, setInsurance, investments, setInvestments, loans, setLoans, creditCards, setCreditCards, banks, setDeletedTransactions , vendorMaster, setVendorMaster, categoryMaster, setCategoryMaster }) {
  const [catFilter, setCatFilter] = useState("All");
  const [showAdd,   setShowAdd]   = useState(false);
  const [payingEmi, setPayingEmi] = useState(null);
  const [emiForm, setEmiForm] = useState({ date: "", amount: "", principal: "", interest: "" });
  const [editing,   setEditing]   = useState(null);
  
  const [payingSub, setPayingSub] = useState(null);
  const [deletingExp, setDeletingExp] = useState(null);
  const [payingInv, setPayingInv] = useState(null);
  const dueInv = investments ? getDueInvestments(investments) : [];
  const dueEmi = loans ? getDueEMIs(loans) : [];
  
  const handlePayInvConfirm = () => {
    if (!payingInv) return;
    const inv = payingInv.inv;
    
    // Log expense
    const expId = "e" + Date.now();
    setExpenses(p => [{ id: expId, trxNo: getNextTrxNo("EXP", p), title: inv.name + (inv.cycle==="One-Time"?" (Lumpsum)":" (Installment)"), amount: parseFloat(payingInv.amount), date: payingInv.date, category: "Investment", cat: "Investment", icon: inv.icon, color: inv.color, bankId: inv.bankId || "", paymentMode: inv.bankId ? "Net Banking" : "UPI", expenseId: inv.invId }, ...p]);
    
    // Log payment in investment
    setInvestments(p => p.map(s => {
      if (s.id === inv.invId) {
        return { ...s, payments: [...(s.payments||[]), { date: inv.dueDate, amount: parseFloat(payingInv.amount), expenseId: expId }] };
      }
      return s;
    }));
    
    setPayingInv(null);
  };

  const [payingIns, setPayingIns] = useState(null);
  const dueIns = insurance ? getDueInsurance(insurance) : [];
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
      trxNo: getNextTrxNo("EXP", expenses),
      date: date,
      cat: sub.category || "Subscription",
      icon: sub.icon || "💳",
      color: sub.color || COLORS.primary,
      amount: amt,
      vendor: sub.name,
      notes: `Linked to: ${sub.trxNo || sub.name} (${sub.dueDate})`,
      bankId: sub.bankId || "", paymentMode: sub.bankId ? "Net Banking" : "UPI"
    };
    setExpenses(prev => [exp, ...prev]);
    setSubscriptions(prev => prev.map(s => {
      if (s.id !== sub.subId) return s;
      return { ...s, payments: [...(s.payments || []), { date: sub.dueDate, amount: amt, expenseId: exp.id }] };
    }));
    setPayingSub(null);
  };

    const handlePayInsConfirm = () => {
    if (!payingIns) return;
    const { ins, date, amount } = payingIns;
    const amt = parseFloat(amount);
    if (amt < 0) { alert("Values cannot be negative."); return; }
    const exp = {
      id: "e" + Date.now(),
      trxNo: getNextTrxNo("EXP", expenses),
      date: date,
      cat: ins.type || "Insurance",
      icon: ins.icon || "🛡️",
      color: ins.color || COLORS.primary,
      amount: amt,
      vendor: ins.provider || ins.name,
      notes: "Premium Payment: " + ins.name + " (" + ins.dueDate + ")",
      bankId: ins.bankId || "", paymentMode: ins.bankId ? "Net Banking" : "UPI"
    };
    setExpenses(prev => [exp, ...prev]);
    setInsurance(prev => prev.map(s => {
      if (s.id !== ins.insId) return s;
      return { ...s, payments: [...(s.payments || []), { date: ins.dueDate, amount: amt, expenseId: exp.id }] };
    }));
    setPayingIns(null);
  };

  const cats = ["All","Food","Fuel","Grocery","Entertainment","Medical","Shopping","Utilities","Education","Travel"];
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

  const getMappedSection = (t) => {
    let match;
    if (t.expenseId) {
      if ((match = investments?.find(i => i.id === t.expenseId))) return `Investment - ${match.name}`;
      if ((match = subscriptions?.find(s => s.id === t.expenseId))) return `Subscription - ${match.name}`;
      if ((match = insurance?.find(i => i.id === t.expenseId))) return `Insurance - ${match.name}`;
      if ((match = loans?.find(l => l.id === t.expenseId))) return `EMI - ${match.name}`;
    }
    if ((match = subscriptions?.find(s => s.payments?.some(p => p.expenseId === t.id)))) return `Subscription - ${match.name}`;
    if ((match = insurance?.find(i => i.payments?.some(p => p.expenseId === t.id)))) return `Insurance - ${match.name}`;
    if ((match = investments?.find(i => i.payments?.some(p => p.expenseId === t.id)))) return `Investment - ${match.name}`;
    if ((match = loans?.find(l => l.payments?.some(p => p.expenseId === t.id)))) return `EMI - ${match.name}`;
    
    // Fallback for older items without expenseId
    if ((match = subscriptions?.find(s => s.payments?.some(p => !p.expenseId && (p.payDate === t.date || p.date === t.date) && parseFloat(p.amount) === parseFloat(t.amount))))) return `Subscription - ${match.name}`;
    if ((match = insurance?.find(i => i.payments?.some(p => !p.expenseId && (p.payDate === t.date || p.date === t.date) && parseFloat(p.amount) === parseFloat(t.amount))))) return `Insurance - ${match.name}`;
    if ((match = investments?.find(i => i.payments?.some(p => !p.expenseId && (p.payDate === t.date || p.date === t.date) && parseFloat(p.amount) === parseFloat(t.amount))))) return `Investment - ${match.name}`;
    if ((match = loans?.find(l => l.payments?.some(p => !p.expenseId && (p.payDate === t.date || p.date === t.date) && parseFloat(p.amount) === parseFloat(t.amount))))) return `EMI - ${match.name}`;
    
    return null;
  };

  return (
    <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16 }}>
        {dueInv.length > 0 && (
        <div style={{ background: "#10b98120", border: `1px solid #10b981`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981", marginBottom: 12 }}>🏦 Due Investments ({dueInv.length})</div>
          <div style={{ display: "grid", gap: 10 }}>
            {dueInv.map(inv => (
              <div key={inv.invId + "-" + inv.dueDate} style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{inv.icon} {inv.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{inv.type}   Due: {fmtDate(inv.dueDate)}</div>
                  {inv.bankId && <div style={{ fontSize: 11, color: COLORS.secondary, marginTop: 4, fontWeight: 600 }}>🏦 {banks?.find(b => b.id === inv.bankId)?.name || "Unknown Bank"}</div>}
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
      )}

      {dueIns.length > 0 && (
        <div style={{ background: COLORS.secondary + "20", border: `1px solid ${COLORS.secondary}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.secondary, marginBottom: 12 }}>🛡️ Due Insurance Premiums ({dueIns.length})</div>
          <div style={{ display: "grid", gap: 10 }}>
            {dueIns.map(ins => (
              <div key={ins.insId + "-" + ins.dueDate} style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{ins.icon} {ins.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>Cycle: {ins.cycle}   Due: {fmtDate(ins.dueDate)}</div>
                  {ins.bankId && <div style={{ fontSize: 11, color: COLORS.secondary, marginTop: 4, fontWeight: 600 }}>🏦 {banks?.find(b => b.id === ins.bankId)?.name || "Unknown Bank"}</div>}
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

      
        {dueEmi.length > 0 && (
          <div style={{ background: "rgba(255, 100, 100, 0.08)", border: `1px solid ${COLORS.danger}44`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.danger, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              🏠 Due EMIs ({dueEmi.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {dueEmi.map(emi => (
                <div key={emi.loanId + emi.dueDate} style={{ display: "flex", flexDirection: payingEmi === emi.loanId + emi.dueDate ? "column" : "row", justifyContent: "space-between", alignItems: payingEmi === emi.loanId + emi.dueDate ? "flex-start" : "center", background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{emi.name}</div>
                    <div style={{ fontSize: 10, color: COLORS.textMuted }}>{emi.bank} · Due: {emi.dueDate}</div>
                    {emi.bankId && <div style={{ fontSize: 11, color: COLORS.secondary, marginTop: 4, fontWeight: 600 }}>🏦 {banks?.find(b => b.id === emi.bankId)?.name || "Unknown Bank"}</div>}
                  </div>
                  {payingEmi === emi.loanId + emi.dueDate ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                        <div><div style={{fontSize:9,color:COLORS.textMuted,marginBottom:2}}>Payment Date</div><input type="date" value={emiForm.date} onChange={e=>setEmiForm({...emiForm, date:e.target.value})} style={{ background: "#0f172a", color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: "6px", borderRadius: 4, fontSize: 11, width:"100%" }} /></div>
                        <div><div style={{fontSize:9,color:COLORS.textMuted,marginBottom:2}}>Interest (₹)</div><input type="number" value={emiForm.interest} onChange={e=>{ const int = parseFloat(e.target.value)||0; const prin = parseFloat(emiForm.principal)||0; setEmiForm({...emiForm, interest:e.target.value, amount: prin + int}); }} style={{ background: "#0f172a", color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: "6px", borderRadius: 4, fontSize: 11, width:"100%" }} /></div>
                        <div><div style={{fontSize:9,color:COLORS.textMuted,marginBottom:2}}>Principal (₹)</div><input type="number" value={emiForm.principal} onChange={e=>{ const prin = parseFloat(e.target.value)||0; const int = parseFloat(emiForm.interest)||0; setEmiForm({...emiForm, principal:e.target.value, amount: prin + int}); }} style={{ background: "#0f172a", color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: "6px", borderRadius: 4, fontSize: 11, width:"100%" }} /></div>
                        <div><div style={{fontSize:9,color:COLORS.textMuted,marginBottom:2}}>Total EMI (₹)</div><input type="number" value={emiForm.amount} onChange={e=>{ const amt = parseFloat(e.target.value)||0; const int = parseFloat(emiForm.interest)||0; const prin = parseFloat(emiForm.principal)||0; if (int === 0) { setEmiForm({...emiForm, amount:e.target.value, principal: amt}); } else { setEmiForm({...emiForm, amount:e.target.value, interest: Math.max(0, amt - prin)}); } }} style={{ background: "#0f172a", color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: "6px", borderRadius: 4, fontSize: 11, width:"100%" }} /></div>
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => setPayingEmi(null)} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                        <button onClick={() => {
                           const a = parseFloat(emiForm.amount)||0;
                           const pr = parseFloat(emiForm.principal)||0;
                           const int = parseFloat(emiForm.interest)||0;
                           const nExp = { id: "e" + Date.now(), trxNo: getNextTrxNo("EXP", expenses), date: emiForm.date, storeName: emi.bank, productName: emi.name + " EMI", cat: "EMI", amount: a, icon: "🏠", color: COLORS.danger, paymentMode: "Net Banking", bankId: emi.bankId || "" };
                           setExpenses(p => [nExp, ...p]);
                           setLoans(p => p.map(l => l.id === emi.loanId ? { ...l, payments: [...(l.payments||[]), { date: emi.dueDate, payDate: emiForm.date, amount: a, principal: pr, interest: int, expenseId: nExp.id }] } : l));
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
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {dueSubs.length > 0 && (
        <div style={{ background: COLORS.danger + "20", border: `1px solid ${COLORS.danger}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.danger, marginBottom: 12 }}>⚠️ Due Subscriptions ({dueSubs.length})</div>
          <div style={{ display: "grid", gap: 10 }}>
            {dueSubs.map(sub => {
              const statusInfo = getDueStatusAndStyle(sub.dueDate);
              return (
                <div key={sub.subId + "-" + sub.dueDate} style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{sub.icon} {sub.name}</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                      <span>Cycle: {sub.cycle}</span>
                      <span>•</span>
                      <span>Due: {fmtDate(sub.dueDate)}</span>
                      <span style={{ 
                        padding: "1px 6px", 
                        borderRadius: 4, 
                        fontSize: 9, 
                        fontWeight: 700, 
                        color: statusInfo.color, 
                        background: `${statusInfo.color}15`, 
                        border: `1px solid ${statusInfo.color}25` 
                      }}>{statusInfo.label}</span>
                    </div>
                    {sub.bankId && <div style={{ fontSize: 11, color: COLORS.secondary, marginTop: 4, fontWeight: 600 }}>🏦 {banks?.find(b => b.id === sub.bankId)?.name || "Unknown Bank"}</div>}
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
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => {
                          if (window.confirm(`Mark ${sub.name} as Not Used for this cycle?`)) {
                            setSubscriptions(prev => prev.map(s => {
                              if (s.id !== sub.subId) return s;
                              return { ...s, payments: [...(s.payments || []), { date: sub.dueDate, amount: 0, skipped: true }] };
                            }));
                          }
                        }}
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          color: COLORS.textMuted,
                          border: `1px solid ${COLORS.border}`,
                          padding: "6px 12px",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: 12,
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                      >
                        Not Used
                      </button>
                      <button onClick={() => setPayingSub({ sub, date: sub.dueDate, amount: sub.amount })} style={{ background: COLORS.danger, color: "#fff", border: "none", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Pay Now</button>
                    </div>
                  )}
                </div>
              </div>
            )})}
          </div>
        </div>
      )}


      </div>
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
                <div style={{ fontSize:14, fontWeight:600, color:COLORS.text }}>{t.vendor || t.storeName || t.title}</div>
                <div style={{ fontSize:12, color:COLORS.textMuted }}>
                  {t.cat || t.category} • {fmtDate(t.date)}
                  {t.bankId && banks && banks.find(b => b.id === t.bankId) ? " • " + banks.find(b => b.id === t.bankId).name : ""}
                  {t.creditCardId && creditCards && creditCards.find(c => c.id === t.creditCardId) ? " • " + creditCards.find(c => c.id === t.creditCardId).bank : ""}
                  {!t.bankId && !t.creditCardId && t.paymentMode ? " • " + t.paymentMode : ""}
                  {t.trxNo ? " • " : ""}
                  <span style={{color:COLORS.primary, fontWeight:700}}>{t.trxNo}</span>
                  {(() => {
                    const mapped = getMappedSection(t);
                    return mapped ? <span style={{ marginLeft: 8, padding: "2px 6px", borderRadius: 4, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: 9, fontWeight: 700 }}>🔗 {mapped}</span> : null;
                  })()}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize:16, fontWeight:700, color:COLORS.danger }}>-₹{parseFloat(t.amount||0).toLocaleString("en-IN")}</div>
              <button onClick={(e) => { e.stopPropagation(); setDeletingExp(t.id); }} style={{ background:"transparent", border:"none", cursor:"pointer", padding:0, fontSize:16 }} title="Delete Expense">🗑️</button>
            </div>
          </div>
        ))}
        {filtered.length===0 && <div style={{ textAlign:"center", padding:30, color:COLORS.textMuted }}>No expenses found.</div>}
      </div>

      {deletingExp && (
        <ConfirmDialog 
          msg="Are you sure you want to delete this expense? This action cannot be undone." 
          onConfirm={() => {
            const expToDelete = expenses.find(e => e.id === deletingExp);
            if (!expToDelete) { setDeletingExp(null); return; }
            
            const linkedPayments = [];
            
            const findAndRemovePayment = (s, moduleName) => {
               // First try by expenseId
               let removed = (s.payments||[]).find(p => p.expenseId === deletingExp);
               
               // Fallback for historical payments that didn't have expenseId
               if (!removed) {
                 removed = (s.payments||[]).find(p => !p.expenseId && (p.payDate === expToDelete.date || p.date === expToDelete.date) && parseFloat(p.amount) === parseFloat(expToDelete.amount));
               }
               
               if (removed) {
                 linkedPayments.push({ module: moduleName, itemId: s.id, payment: removed });
                 return { ...s, payments: (s.payments||[]).filter(p => p !== removed) };
               }
               return s;
            };
            
            if (setSubscriptions) setSubscriptions(prev => prev.map(s => findAndRemovePayment(s, "subscriptions")));
            if (setInsurance) setInsurance(prev => prev.map(s => findAndRemovePayment(s, "insurance")));
            if (setInvestments) setInvestments(prev => prev.map(s => findAndRemovePayment(s, "investments")));
            if (setLoans) setLoans(prev => prev.map(s => findAndRemovePayment(s, "loans")));
            if (setCreditCards) setCreditCards(prev => prev.map(s => findAndRemovePayment(s, "creditCards")));

            if (setDeletedTransactions) {
               setDeletedTransactions(p => [{ id: "del_"+Date.now(), type: "expense", item: expToDelete, deletedAt: new Date().toISOString(), linkedPayments }, ...p]);
            }
            
            setExpenses(p => p.filter(e => e.id !== deletingExp));
            setDeletingExp(null);
          }} 
          onCancel={() => setDeletingExp(null)} 
        />
      )}
      {showAdd && (
        <AddExpenseModal banks={banks} creditCards={creditCards}  companyMaster={companyMaster} setCompanyMaster={setCompanyMaster} platformMaster={platformMaster} setPlatformMaster={setPlatformMaster}  onClose={() => setShowAdd(false)} onSave={(t) => {
          const itemWithCat = { ...t, cat: t.category || t.cat };
          if (editing) setExpenses(p => p.map(x => x.id===editing.id ? {...x,...itemWithCat, trxNo: x.trxNo || getNextTrxNo("EXP", p)} : x));
          else setExpenses(p => [{...itemWithCat, id:"e"+Date.now(), trxNo: getNextTrxNo("EXP", p)}, ...p]);
          setShowAdd(false);
        }} initialData={editing} />
      )}
    </div>
  );
}
function ReportsViewLive({ incomes, expenses, filter }) {
  // Build monthly rows from live data
  const allMonths = {};
  [...incomes, ...expenses].forEach(item => {
    const d = new Date(item.date);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    if (!allMonths[key]) allMonths[key] = { key, year:d.getFullYear(), month:d.getMonth()+1, label:`${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`, income:0, expense:0 };
  });
  incomes.forEach(i => {
    const d=new Date(i.date); const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    if(allMonths[key]) allMonths[key].income+=parseFloat(i.amount||0);
  });
  expenses.forEach(e => {
    const d=new Date(e.date); const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    if(allMonths[key]) allMonths[key].expense+=parseFloat(e.amount||0);
  });
  const rows = Object.values(allMonths).map(r=>({...r,savings:r.income-r.expense})).sort((a,b)=>a.key.localeCompare(b.key));

  const filtered = rows.filter(r => {
    if (filter.mode==="month") return r.month===filter.month && r.year===filter.year;
    if (filter.mode==="year")  return r.year===filter.year;
    if (filter.mode==="range") { const k=r.year*100+r.month; return k>=filter.fromYear*100+filter.fromMonth&&k<=filter.toYear*100+filter.toMonth; }
    return true;
  });
  const totals = filtered.reduce((acc,r)=>({income:acc.income+r.income,expense:acc.expense+r.expense,savings:acc.savings+r.savings}),{income:0,expense:0,savings:0});

  return (
    <div>
      <div style={{ fontSize:18, fontWeight:700, color:COLORS.text, marginBottom:4 }}>Reports & Analytics</div>
      <div style={{ fontSize:12, color:COLORS.textMuted, marginBottom:14 }}>{filterLabel(filter)} · {filtered.length} month{filtered.length!==1?"s":""} · Live data</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(80px,1fr))", gap:10, marginBottom:14 }}>
        {[
          { label:"Total Income",  val:`₹${(totals.income/100000).toFixed(2)}L`,  color:COLORS.secondary },
          { label:"Total Expense", val:`₹${(totals.expense/100000).toFixed(2)}L`, color:COLORS.danger },
          { label:"Net Savings",   val:`₹${(totals.savings/100000).toFixed(2)}L`, color:totals.savings>=0?COLORS.primary:COLORS.danger },
        ].map(s=>(
          <div key={s.label} style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:"12px 14px" }}>
            <div style={{ fontSize:10, color:COLORS.textMuted, marginBottom:3 }}>{s.label}</div>
            <div style={{ fontSize:17, fontWeight:700, color:s.color }}>{s.val}</div>
          </div>
        ))}
      </div>
      {filtered.length===0 ? (
        <div style={{ textAlign:"center", padding:40, color:COLORS.textMuted }}>No data for selected period. Add income or expense entries.</div>
      ) : (
        <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:14, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 0.8fr", padding:"10px 14px", borderBottom:`1px solid ${COLORS.border}` }}>
            {["Month","Income","Expense","Savings","Rate"].map(h=>(
              <div key={h} style={{ fontSize:9.5, color:COLORS.textMuted, fontWeight:600 }}>{h.toUpperCase()}</div>
            ))}
          </div>
          {filtered.map((d,i)=>(
            <div key={d.key} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 0.8fr", padding:"10px 14px", borderBottom:i<filtered.length-1?`1px solid rgba(255,255,255,0.04)`:"none" }}>
              <div style={{ fontSize:12, color:COLORS.text, fontWeight:600 }}>{d.label}</div>
              <div style={{ fontSize:11, color:COLORS.secondary }}>₹{(d.income/1000).toFixed(1)}K</div>
              <div style={{ fontSize:11, color:COLORS.danger }}>₹{(d.expense/1000).toFixed(1)}K</div>
              <div style={{ fontSize:11, color:d.savings>=0?COLORS.primary:COLORS.danger }}>₹{(d.savings/1000).toFixed(1)}K</div>
              <div style={{ fontSize:11, color:COLORS.accent }}>{d.income>0?((d.savings/d.income)*100).toFixed(0):0}%</div>
            </div>
          ))}
          {filtered.length>1 && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 0.8fr", padding:"10px 14px", background:"rgba(108,99,255,0.1)", borderTop:`1px solid rgba(108,99,255,0.2)` }}>
              <div style={{ fontSize:11, color:COLORS.primary, fontWeight:700 }}>TOTAL</div>
              <div style={{ fontSize:11, color:COLORS.secondary, fontWeight:700 }}>₹{(totals.income/1000).toFixed(1)}K</div>
              <div style={{ fontSize:11, color:COLORS.danger, fontWeight:700 }}>₹{(totals.expense/1000).toFixed(1)}K</div>
              <div style={{ fontSize:11, color:totals.savings>=0?COLORS.primary:COLORS.danger, fontWeight:700 }}>₹{(totals.savings/1000).toFixed(1)}K</div>
              <div style={{ fontSize:11, color:COLORS.accent, fontWeight:700 }}>{totals.income>0?((totals.savings/totals.income)*100).toFixed(0):0}%</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Live Dashboard ───────────────────────────────────────────────────────────
function DashboardLive({ incomes, expenses, filter, creditCards, investments, loans, goals, banks }) {
  const periodInc = incomes.filter(i => {
    const d=new Date(i.date); const m=d.getMonth()+1,y=d.getFullYear();
    if(filter.mode==="month") return m===filter.month&&y===filter.year;
    if(filter.mode==="year")  return y===filter.year;
    if(filter.mode==="range"){const k=y*100+m;return k>=filter.fromYear*100+filter.fromMonth&&k<=filter.toYear*100+filter.toMonth;}
    return true;
  });
  const periodExp = expenses.filter(e => {
    const d=new Date(e.date); const m=d.getMonth()+1,y=d.getFullYear();
    if(filter.mode==="month") return m===filter.month&&y===filter.year;
    if(filter.mode==="year")  return y===filter.year;
    if(filter.mode==="range"){const k=y*100+m;return k>=filter.fromYear*100+filter.fromMonth&&k<=filter.toYear*100+filter.toMonth;}
    return true;
  });
  const totalIncome  = periodInc.reduce((s,i)=>s+parseFloat(i.amount||0),0);
  const totalExpense = periodExp.reduce((s,e)=>s+parseFloat(e.amount||0),0);
  const netSavings   = totalIncome - totalExpense;
  const savingsRate  = totalIncome > 0 ? ((netSavings/totalIncome)*100).toFixed(1) : 0;

  // Build last 6 months spark data
  const now = new Date();
  const spark = Array.from({length:6},(_,i)=>{ const d=new Date(now.getFullYear(),now.getMonth()-5+i,1); return {m:d.getMonth()+1,y:d.getFullYear()}; });
  const incSpark = spark.map(s=>incomes.filter(i=>{const d=new Date(i.date);return d.getMonth()+1===s.m&&d.getFullYear()===s.y;}).reduce((a,i)=>a+parseFloat(i.amount||0),0));
  const expSpark = spark.map(s=>expenses.filter(e=>{const d=new Date(e.date);return d.getMonth()+1===s.m&&d.getFullYear()===s.y;}).reduce((a,e)=>a+parseFloat(e.amount||0),0));
  const savSpark = incSpark.map((v,i)=>v-expSpark[i]);

  // Live investment totals from actual investments data
  const invList = investments || [];
  const totalInvested = invList.reduce((s,i)=>s+parseFloat(i.invested||i.amount||0),0);
  const totalInvCurrent = invList.reduce((s,i)=>s+parseFloat(i.current||i.invested||i.amount||0),0);
  // Group investments by type for donut chart
  const INV_TYPE_COLORS = { "Mutual Fund":COLORS.primary, "Stock":COLORS.accent, "Fixed Deposit":COLORS.secondary, "Gold":"#F59E0B", "PPF":"#8B5CF6", "NPS":"#06B6D4", "EPF":"#10B981", "Crypto":"#EF4444", "Real Estate":"#8B5CF6", "Other":"#64748B" };
  const invByType = {};
  invList.forEach(inv => {
    const t = inv.type || "Other";
    if (!invByType[t]) invByType[t] = { name: t, value: 0, color: INV_TYPE_COLORS[t] || "#64748B" };
    invByType[t].value += parseFloat(inv.current||inv.invested||inv.amount||0);
  });
  const invData = Object.values(invByType).filter(d=>d.value>0);
  const fallbackInvData = invData.length > 0 ? invData : [{name:"No investments yet",value:1,color:COLORS.textMuted}];

  // Live goals data
  const goalsList = (goals||[]).map(g=>({ label: g.name||g.label, pct: g.target>0?Math.round(((g.saved||g.current||0)/g.target)*100):0, color: g.color }));

  // Live bank balances total
  const banksList = banks || [];
  const totalBankBalance = banksList.reduce((sum, bank) => {
    const bankInc = (incomes||[]).filter(i => i.bankId === bank.id).reduce((s,i) => s + parseFloat(i.amount||0), 0);
    const bankExp = (expenses||[]).filter(e => e.bankId === bank.id).reduce((s,e) => s + parseFloat(e.amount||0), 0);
    return sum + parseFloat(bank.initialBalance||0) + bankInc - bankExp;
  }, 0);

  // Net worth = bank balances + investment current value + net savings (unlinked)
  const allTimeInc = (incomes||[]).reduce((s,i)=>s+parseFloat(i.amount||0),0);
  const allTimeExp = (expenses||[]).reduce((s,e)=>s+parseFloat(e.amount||0),0);
  const liveNetWorth = totalBankBalance + totalInvCurrent;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:11 }}>
        <KPICard label="Total Income"  value={totalIncome}  trend={0} trendLabel="" color={COLORS.secondary} sparkData={incSpark.length>1?incSpark:[0,totalIncome]} icon="↑" />
        <KPICard label="Total Expense" value={totalExpense} trend={0} trendLabel="" color={COLORS.danger}    sparkData={expSpark.length>1?expSpark:[0,totalExpense]} icon="↓" />
        <KPICard label="Net Savings"   value={netSavings}   trend={0} trendLabel="" color={netSavings>=0?COLORS.accent:COLORS.danger} sparkData={savSpark.length>1?savSpark:[0,netSavings]} icon="★" />
        <KPICard label="Savings Rate"  value={parseFloat(savingsRate)} prefix="" suffix="%" trend={0} trendLabel="" color={COLORS.primary} sparkData={[parseFloat(savingsRate)]} icon="⊕" />
        <KPICard label="Investments"   value={totalInvCurrent} trend={totalInvested>0?parseFloat(((totalInvCurrent-totalInvested)/totalInvested*100).toFixed(1)):0} trendLabel="gain" color="#8B5CF6" sparkData={totalInvCurrent>0?[totalInvested,totalInvCurrent]:[0]} icon="◎" />
        <KPICard label="Net Worth"     value={liveNetWorth} trend={0} trendLabel="YoY" color={COLORS.primary} sparkData={liveNetWorth>0?[liveNetWorth*0.75,liveNetWorth*0.85,liveNetWorth*0.92,liveNetWorth]:[0]} icon="◈" />
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ gridColumn:"unset", background:COLORS.bgCard, borderRadius:16, padding:"16px 18px", border:`1px solid ${COLORS.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <div><div style={{ fontSize:13, fontWeight:600, color:COLORS.text }}>Income vs Expense</div><div style={{ fontSize:11, color:COLORS.textMuted }}>Last 6 months · Live</div></div>
            <div style={{ display:"flex", gap:10, fontSize:10 }}><span style={{ color:COLORS.secondary }}>● Income</span><span style={{ color:COLORS.danger }}>● Expense</span></div>
          </div>
          {incSpark.some(v=>v>0)||expSpark.some(v=>v>0) ? <BarChart months={spark.map(s=>MONTH_NAMES[s.m-1])} income={incSpark} expense={expSpark} /> : <div style={{ padding:"20px 0", textAlign:"center", color:COLORS.textMuted, fontSize:12 }}>Add income & expense entries to see chart</div>}
        </div>
        <div style={{ background:COLORS.bgCard, borderRadius:16, padding:"16px 18px", border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:4 }}>Investments</div>
          {invData.length > 0 ? (
            <>
              <div style={{ display:"flex", justifyContent:"center" }}><DonutChart data={fallbackInvData} /></div>
              <div style={{ display:"flex", flexDirection:"column", gap:4, marginTop:6 }}>
                {invData.map(d=>(
                  <div key={d.name} style={{ display:"flex", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:7,height:7,borderRadius:"50%",background:d.color }}/><span style={{ fontSize:10, color:COLORS.textMuted }}>{d.name}</span></div>
                    <span style={{ fontSize:10, color:COLORS.text }}>₹{d.value>=100000?(d.value/100000).toFixed(2)+"L":(d.value/1000).toFixed(0)+"K"}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ padding:"20px 0", textAlign:"center", color:COLORS.textMuted, fontSize:12 }}>Add investments to see your portfolio breakdown</div>
          )}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:14 }}>
        <div style={{ background:COLORS.bgCard, borderRadius:16, padding:"16px 18px", border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:12 }}>Goal Progress</div>
          {goalsList.length > 0 ? (
            <div style={{ display:"flex", justifyContent:"space-around", flexWrap:"wrap", gap:8 }}>{goalsList.map(g=><CircularProgress key={g.label} pct={g.pct} color={g.color} label={g.label}/>)}</div>
          ) : (
            <div style={{ padding:"20px 0", textAlign:"center", color:COLORS.textMuted, fontSize:12 }}>Add goals to track your progress</div>
          )}
        </div>
        <div style={{ background:COLORS.bgCard, borderRadius:16, padding:"16px 18px", border:`1px solid rgba(108,99,255,0.2)` }}>
          <div style={{ fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
            <span>✦</span> AI Financial Advisor
            <span style={{ marginLeft:"auto", fontSize:9, background:`${COLORS.primary}33`, color:COLORS.primary, padding:"2px 8px", borderRadius:20 }}>LIVE</span>
          </div>
          <AIChatPanel />
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

const SUBS_SEED = [];

const getDueStatusAndStyle = (dueDateStr) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  const [y, m, d] = dueDateStr.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  due.setHours(0,0,0,0);
  
  if (due < today) {
    return {
      label: "OVERDUE",
      color: "#ef4444",
      bg: "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)",
      border: "4px solid #ef4444",
      iconBg: "rgba(239, 68, 68, 0.2)",
      icon: "🚨"
    };
  }
  
  if (due.getMonth() === today.getMonth() && due.getFullYear() === today.getFullYear()) {
    return {
      label: "DUE",
      color: "#f59e0b",
      bg: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)",
      border: "4px solid #f59e0b",
      iconBg: "rgba(245, 158, 11, 0.2)",
      icon: "⏳"
    };
  }
  
  return {
    label: "UPCOMING",
    color: "#3b82f6",
    bg: "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)",
    border: "4px solid #3b82f6",
    iconBg: "rgba(59, 130, 246, 0.2)",
    icon: "📅"
  };
};

const getDueSubscriptions = (subscriptions) => {
  if (!subscriptions) return [];
  const due = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  
  subscriptions.forEach(sub => {
    if (sub.status === "Paused" || !sub.startDate) return;
    const [sY, sM, sD] = sub.startDate.split('-');
    const start = new Date(sY, sM - 1, sD);
    let nextDate = new Date(start);
    
    let limit = 0;
    while (nextDate <= today && limit < 1000) {
      if (sub.endDate && nextDate > new Date(sub.endDate)) break;
      
      const nextDateStr = toLocalYYYYMMDD(nextDate);
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
          category: sub.category,
          bankId: sub.bankId
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


const INSURANCE_SEED = [];

const getDueInsurance = (insuranceList) => {
  if (!insuranceList) return [];
  const due = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  
  insuranceList.forEach(ins => {
    if (!ins.startDate || ins.status === "Closed" || ins.status === "Paused") return;
    const [sY, sM, sD] = ins.startDate.split('-');
    const start = new Date(sY, sM - 1, sD);
    
    if (ins.cycle === "One-Time") {
      if (ins.payments && ins.payments.length > 0) return;
      if (start <= today) {
        due.push({
          insId: ins.id,
          name: ins.name,
          provider: ins.provider,
          amount: ins.amount,
          dueDate: ins.startDate,
          cycle: ins.cycle,
          icon: ins.icon,
          color: ins.color,
          type: ins.type,
          bankId: ins.bankId
        });
      }
      return;
    }
    
    let nextDate = new Date(start);
    let limit = 0;
    while (nextDate <= today && limit < 1000) {
      if (ins.endDate && nextDate > new Date(ins.endDate)) break;
      
      const nextDateStr = toLocalYYYYMMDD(nextDate);
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
          type: ins.type,
          bankId: ins.bankId
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


function BanksViewLive({ banks, setBanks, expenses, incomes }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({ name:"", type:"Savings", initialBalance:"", accountNumber:"", color:COLORS.primary });
  const [showPassbook, setShowPassbook] = useState(null);

  const handleSave = () => {
    if (!form.name || form.initialBalance==="") return alert("Name and Initial Balance are required.");
    const item = { ...form, initialBalance: parseFloat(form.initialBalance) };
    if (editItem) {
      setBanks(p => p.map(i => i.id === editItem.id ? { ...i, ...item } : i));
    } else {
      setBanks(p => [...(p||[]), { ...item, id: "bank" + Date.now() }]);
    }
    setShowForm(false);
    setEditItem(null);
  };

  const getLiveBalance = (bankId, initial) => {
    const inc = incomes ? incomes.filter(i => i.bankId === bankId).reduce((s, i) => s + parseFloat(i.amount||0), 0) : 0;
    const exp = expenses ? expenses.filter(e => e.bankId === bankId).reduce((s, e) => s + parseFloat(e.amount||0), 0) : 0;
    return parseFloat(initial||0) + inc - exp;
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 60 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div style={{ fontSize:24, fontWeight:700, color:COLORS.text }}>Bank Accounts</div>
          <div style={{ fontSize:14, color:COLORS.textMuted, marginTop:4 }}>Manage your accounts & balances</div>
        </div>
        <button onClick={() => { setForm({ name:"", type:"Savings", initialBalance:"", accountNumber:"", color:COLORS.primary }); setEditItem(null); setShowForm(true); }} style={{ background:COLORS.primary, color:"#fff", border:"none", padding:"10px 16px", borderRadius:12, fontWeight:600, cursor:"pointer" }}>+ Add Bank</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:16 }}>
        {(banks || []).map(bank => {
          const liveBal = getLiveBalance(bank.id, bank.initialBalance);
          return (
            <div key={bank.id} style={{ background:COLORS.bgCard, borderRadius:16, border:`1px solid ${COLORS.border}`, overflow:"hidden", display:"flex", flexDirection:"column" }}>
              <div style={{ height:6, background:bank.color || COLORS.primary }} />
              <div style={{ padding:20, flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, color:COLORS.text }}>{bank.name}</div>
                    <div style={{ fontSize:12, color:COLORS.textMuted, marginTop:2 }}>{bank.type} {bank.accountNumber ? `· ${bank.accountNumber}` : ""}</div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => { setForm(bank); setEditItem(bank); setShowForm(true); }} style={{ background:"transparent", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:14 }}>✎</button>
                    <button onClick={() => setDeleteConfirm(bank)} style={{ background:"transparent", border:"none", color:"#FF5B5B", cursor:"pointer", fontSize:14 }}>×</button>
                  </div>
                </div>
                <div style={{ marginTop:24 }}>
                  <div style={{ fontSize:12, color:COLORS.textMuted, marginBottom:4 }}>Live Balance</div>
                  <div style={{ fontSize:28, fontWeight:700, color:COLORS.text }}>₹{liveBal.toLocaleString("en-IN")}</div>
                </div>
                <div style={{ marginTop:24, display:"flex" }}>
                   <button onClick={() => setShowPassbook(bank.id)} style={{ flex:1, background:"rgba(255,255,255,0.05)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"8px", borderRadius:8, fontWeight:600, cursor:"pointer", fontSize:13 }}>📖 View Passbook</button>
                </div>
              </div>
            </div>
          );
        })}
        {(!banks || banks.length === 0) && (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:40, background:COLORS.bgCard, borderRadius:16, border:`1px solid ${COLORS.border}`, color:COLORS.textMuted }}>
            No bank accounts added yet. Click "+ Add Bank" to get started.
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ display: "flex", gap: 24, background:COLORS.bgCard, width:"90%", maxWidth: 850, borderRadius:20, padding:24, border:`1px solid ${COLORS.border}`, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ flex: "1 1 60%" }}>
            <div style={{ fontSize:18, fontWeight:700, color:COLORS.text, marginBottom:20 }}>{editItem ? "Edit Bank" : "Add Bank"}</div>
            
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:13, color:COLORS.textMuted, marginBottom:6 }}>Bank Name *</div>
              <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="e.g. HDFC Bank" style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 14px", borderRadius:10 }} autoFocus />
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <div>
                <div style={{ fontSize:13, color:COLORS.textMuted, marginBottom:6 }}>Account Type</div>
                <select value={form.type} onChange={e=>setForm({...form, type:e.target.value})} style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 14px", borderRadius:10 }}>
                  <option value="Savings">Savings</option>
                  <option value="Current">Current</option>
                  <option value="Salary">Salary</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize:13, color:COLORS.textMuted, marginBottom:6 }}>A/c Number (Last 4)</div>
                <input value={form.accountNumber} onChange={e=>setForm({...form, accountNumber:e.target.value})} placeholder="e.g. 1234" maxLength={4} style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 14px", borderRadius:10 }} />
              </div>
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:13, color:COLORS.textMuted, marginBottom:6 }}>Initial Balance (₹) *</div>
              <input type="number" value={form.initialBalance} onChange={e=>setForm({...form, initialBalance:e.target.value})} placeholder="0" style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 14px", borderRadius:10 }} />
            </div>

            <div style={{ display:"flex", gap:12 }}>
              <button onClick={()=>setShowForm(false)} style={{ flex:1, padding:"12px", background:"rgba(255,255,255,0.05)", border:"none", borderRadius:10, color:COLORS.text, fontWeight:600, cursor:"pointer" }}>Cancel</button>
              <button onClick={handleSave} style={{ flex:1, padding:"12px", background:COLORS.primary, border:"none", borderRadius:10, color:"#fff", fontWeight:600, cursor:"pointer" }}>Save Bank</button>
            </div>
            </div>
            
            {(() => {
            if (!editItem) return <div style={{ flex: "1 1 35%" }}></div>;
               const bInc = (incomes||[]).filter(i => i.bankId === editItem.id).map(x => ({...x, isInc: true}));
               const bExp = (expenses||[]).filter(e => e.bankId === editItem.id).map(x => ({...x, isInc: false}));
               const allTx = [...bInc, ...bExp].sort((a,b)=>new Date(b.date)-new Date(a.date));
               return (
                  <div style={{ flex: "1 1 40%", position: "sticky", top: 0, background: "rgba(0,0,0,0.15)", padding: 20, borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>🧾</span> Bank Ledger
                    </div>
                      
                if (allTx.length === 0) return <div style={{ flex: "1 1 35%" }}></div>;
                return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
                        {allTx.map((p, idx) => {
                          const trxNo = p.trxNo || "—";
                          return (
                            <div key={"tx-"+idx} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}`, padding: "12px 16px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 18, background: p.isInc ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 91, 91, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{p.isInc ? "↓" : "↑"}</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{p.name || (p.isInc?"Income":"Expense")}</div>
                                    <div style={{ fontSize: 9, background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: 12, color: COLORS.textMuted, fontWeight: 600 }}>{trxNo}</div>
                                  </div>
                                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{formatLocalDateString(p.date)} • {p.isInc ? p.source : (p.category||p.paymentMode)}</div>
                                </div>
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: p.isInc ? COLORS.secondary : COLORS.text }}>{p.isInc?"+":""}₹{parseFloat(p.amount).toLocaleString("en-IN")}</div>
                            </div>
                          );
                        })}
                      </div>

                  </div>
               );
            })()}

          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:COLORS.bgCard, width:360, borderRadius:20, padding:24, border:`1px solid ${COLORS.border}` }}>
            <div style={{ fontSize:18, fontWeight:700, color:COLORS.text, marginBottom:8 }}>Delete Bank?</div>
            <div style={{ fontSize:14, color:COLORS.textMuted, marginBottom:24 }}>Are you sure you want to delete {deleteConfirm.name}?</div>
            <div style={{ display:"flex", gap:12 }}>
              <button onClick={()=>setDeleteConfirm(null)} style={{ flex:1, padding:"12px", background:"rgba(255,255,255,0.05)", border:"none", borderRadius:10, color:COLORS.text, fontWeight:600, cursor:"pointer" }}>Cancel</button>
              <button onClick={() => { setBanks(p => p.filter(i => i.id !== deleteConfirm.id)); setDeleteConfirm(null); }} style={{ flex:1, padding:"12px", background:"#FF5B5B", border:"none", borderRadius:10, color:"#fff", fontWeight:600, cursor:"pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showPassbook && (
         <PassbookModal bank={banks.find(b => b.id === showPassbook)} incomes={incomes} expenses={expenses} onClose={() => setShowPassbook(null)} />
      )}
    </div>
  );
}

function PassbookModal({ bank, incomes, expenses, onClose }) {
  const [drillDown, setDrillDown] = useState(null);

  const bInc = (incomes || []).filter(i => i.bankId === bank.id).map(i => ({
    id: i.id, date: i.date, type: "income", amount: parseFloat(i.amount || 0),
    title: i.source || i.title || "Income", desc: i.note || i.notes || i.description || "", raw: i
  }));
  const bExp = (expenses || []).filter(e => e.bankId === bank.id).map(e => ({
    id: e.id, date: e.date, type: "expense", amount: parseFloat(e.amount || 0),
    title: e.vendor || e.storeName || "Expense", desc: e.note || e.notes || e.description || "", raw: e
  }));

  let merged = [...bInc, ...bExp].sort((a, b) => new Date(a.date) - new Date(b.date));
  let currentBalance = parseFloat(bank.initialBalance || 0);
  merged = merged.map(txn => {
    if (txn.type === "income") currentBalance += txn.amount;
    else currentBalance -= txn.amount;
    return { ...txn, balance: currentBalance };
  });
  merged.reverse();

  return (
    <div style={{ position:"fixed", top:0, right:0, bottom:0, zIndex:100, display:"flex", justifyContent:"flex-end", pointerEvents:"none" }}>
      <div style={{ pointerEvents:"auto", background:"#0F172A", width:500, height:"100vh", display:"flex", flexDirection:"column", borderLeft:`1px solid rgba(255,255,255,0.08)`, boxShadow:"-5px 0 25px rgba(0,0,0,0.5)" }}>
        {drillDown ? (
          <>
            <div style={{ padding:"24px", borderBottom:`1px solid rgba(255,255,255,0.08)`, display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(255,255,255,0.03)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <button onClick={() => setDrillDown(null)} style={{ background:"rgba(255,255,255,0.1)", border:"none", color:"#F1F5F9", cursor:"pointer", width:32, height:32, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
                <div style={{ fontSize:18, fontWeight:700, color:"#F1F5F9" }}>Transaction Details</div>
              </div>
              <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#94A3B8", cursor:"pointer", fontSize:24 }}>×</button>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:24 }}>
               <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(255,255,255,0.03)", padding:20, borderRadius:12, border:"1px solid rgba(255,255,255,0.08)" }}>
                     <div style={{ fontSize:14, color:"#94A3B8" }}>Type</div>
                     <div style={{ padding:"4px 12px", borderRadius:20, fontSize:13, fontWeight:700, background:drillDown.type==="income"?"rgba(0,200,150,0.15)":"rgba(255,91,91,0.15)", color:drillDown.type==="income"?"#00C896":"#FF5B5B", textTransform:"capitalize" }}>{drillDown.type}</div>
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.03)", padding:20, borderRadius:12, border:"1px solid rgba(255,255,255,0.08)" }}>
                     <div style={{ fontSize:12, color:"#94A3B8", marginBottom:4, textTransform:"uppercase", fontWeight:600 }}>Amount</div>
                     <div style={{ fontSize:24, fontWeight:700, color:drillDown.type==="income"?"#00C896":"#FF5B5B" }}>{drillDown.type==="income"?"+":"-"}₹{drillDown.amount.toLocaleString("en-IN")}</div>
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.03)", padding:20, borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", display:"flex", flexDirection:"column", gap:16 }}>
                     {Object.entries(drillDown.raw).map(([k, v]) => {
                        if (k==="id" || k==="bankId" || k==="color" || k==="icon" || typeof v === 'object') return null;
                        return (
                           <div key={k}>
                              <div style={{ fontSize:12, color:"#94A3B8", marginBottom:4, textTransform:"uppercase", fontWeight:600 }}>{k.replace(/([A-Z])/g, ' $1')}</div>
                              <div style={{ fontSize:15, color:"#F1F5F9", wordBreak:"break-word" }}>{v ? v.toString() : "—"}</div>
                           </div>
                        )
                     })}
                  </div>
               </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding:"24px", borderBottom:`1px solid rgba(255,255,255,0.08)`, display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(255,255,255,0.03)" }}>
              <div>
                <div style={{ fontSize:18, fontWeight:700, color:"#F1F5F9" }}>📖 {bank.name} Passbook</div>
                <div style={{ fontSize:12, color:"#94A3B8", marginTop:4 }}>Initial Balance: ₹{(bank.initialBalance||0).toLocaleString("en-IN")}</div>
              </div>
              <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#94A3B8", cursor:"pointer", fontSize:24 }}>×</button>
            </div>
            
            <div style={{ flex:1, overflowY:"auto", padding:16 }}>
              {merged.length === 0 ? (
                <div style={{ textAlign:"center", padding:40, color:"#94A3B8" }}>No transactions found for this bank account.</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {merged.map((txn, i) => (
                    <div key={txn.id + i} onClick={() => setDrillDown(txn)} style={{ cursor:"pointer", display:"grid", gridTemplateColumns:"65px 1fr 75px 85px", gap:8, background:"rgba(255,255,255,0.03)", padding:"12px 14px", borderRadius:12, alignItems:"center", border:`1px solid rgba(255,255,255,0.06)`, transition:"background 0.2s" }} onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"} onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}>
                      <div style={{ fontSize:11, color:"#94A3B8" }}>{formatLocalDateString(txn.date)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"#F1F5F9", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{txn.title}</div>
                        {txn.desc && <div style={{ fontSize:10, color:"#94A3B8", marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{txn.desc}</div>}
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, textAlign:"right", color: txn.type==="income"?"#00C896":"#FF5B5B" }}>
                        {txn.type==="income"?"+":"-"}₹{txn.amount.toLocaleString("en-IN")}
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, textAlign:"right", color:"#F1F5F9" }}>
                        ₹{txn.balance.toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ padding:"16px 24px", borderTop:`1px solid rgba(255,255,255,0.08)`, background:"rgba(0,0,0,0.2)", display:"flex", justifyContent:"flex-end" }}>
               <div style={{ fontSize:16, fontWeight:700, color:"#F1F5F9" }}>Current Balance: <span style={{ color:"#00C896" }}>₹{currentBalance.toLocaleString("en-IN")}</span></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}




function RecycleBinView({ deletedTransactions, setDeletedTransactions, expenses, setExpenses, incomes, setIncomes, subscriptions, setSubscriptions, loans, setLoans, insurance, setInsurance, investments, setInvestments, creditCards, setCreditCards }) {
  const [filter, setFilter] = useState("All");

  const handleRestore = (record) => {
    if (!record || !record.item) return;

    if (record.type === "expense") {
      // 1. Re-add to expenses
      setExpenses(p => [record.item, ...p]);
      // 2. Re-link payments if they existed
      if (record.linkedPayments) {
        record.linkedPayments.forEach(link => {
          if (link.module === "subscriptions" && setSubscriptions) {
            setSubscriptions(prev => prev.map(s => s.id === link.itemId ? { ...s, payments: [...(s.payments||[]), link.payment] } : s));
          } else if (link.module === "loans" && setLoans) {
            setLoans(prev => prev.map(s => s.id === link.itemId ? { ...s, payments: [...(s.payments||[]), link.payment] } : s));
          } else if (link.module === "insurance" && setInsurance) {
            setInsurance(prev => prev.map(s => s.id === link.itemId ? { ...s, payments: [...(s.payments||[]), link.payment] } : s));
          } else if (link.module === "investments" && setInvestments) {
            setInvestments(prev => prev.map(s => s.id === link.itemId ? { ...s, payments: [...(s.payments||[]), link.payment] } : s));
          } else if (link.module === "creditCards" && setCreditCards) {
            setCreditCards(prev => prev.map(s => s.id === link.itemId ? { ...s, payments: [...(s.payments||[]), link.payment] } : s));
          }
        });
      }
    } else if (record.type === "income") {
      setIncomes(p => [record.item, ...p]);
    }
    
    // Remove from recycle bin
    setDeletedTransactions(p => p.filter(x => x.id !== record.id));
  };

  const handlePermanentDelete = (id) => {
    if (window.confirm("Are you sure you want to permanently delete this item? This cannot be undone.")) {
      setDeletedTransactions(p => p.filter(x => x.id !== id));
    }
  };

  const handleEmptyBin = () => {
    if (window.confirm("Are you sure you want to empty the Recycle Bin?")) {
      setDeletedTransactions([]);
    }
  };

  const displayed = deletedTransactions.filter(t => filter === "All" || t.type === filter);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:700, color:COLORS.text }}>Recycle Bin</div>
          <div style={{ fontSize:12, color:COLORS.textMuted }}>Restore deleted transactions</div>
        </div>
        <button onClick={handleEmptyBin} disabled={deletedTransactions.length===0} style={{ background: "rgba(255,50,50,0.1)", color: COLORS.danger, border: `1px solid rgba(255,50,50,0.2)`, padding: "8px 16px", borderRadius: 8, cursor: deletedTransactions.length===0 ? "not-allowed" : "pointer", fontWeight: 600, opacity: deletedTransactions.length===0 ? 0.5 : 1 }}>Empty Bin</button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {["All", "expense", "income"].map(f => (
          <div key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? COLORS.primary : "transparent", border: `1px solid ${filter === f ? COLORS.primary : COLORS.border}`, padding: "6px 16px", borderRadius: 20, fontSize: 12, cursor: "pointer", color: filter === f ? "#fff" : COLORS.textMuted, textTransform: "capitalize" }}>{f}</div>
        ))}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {displayed.length === 0 ? (
          <div style={{ textAlign:"center", padding:40, background:COLORS.bgCard, borderRadius:16, border:`1px solid ${COLORS.border}` }}>
            <div style={{ fontSize:40, marginBottom:16, opacity:0.5 }}>🗑️</div>
            <div style={{ color:COLORS.textMuted }}>Recycle Bin is empty</div>
          </div>
        ) : (
          displayed.map(record => (
            <div key={record.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:COLORS.bgCard, padding:16, borderRadius:12, border:`1px solid ${COLORS.border}` }}>
              <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                <div style={{ width:40, height:40, borderRadius:12, background: `${record.item.color||COLORS.primary}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{record.item.icon || (record.type==="expense"?"💸":"💰")}</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:COLORS.text }}>{record.item.title || record.item.productName || record.item.vendor || "Transaction"} <span style={{ fontSize:10, padding:"2px 6px", background:"rgba(255,255,255,0.1)", borderRadius:4, marginLeft:8, textTransform:"capitalize" }}>{record.type}</span></div>
                  <div style={{ fontSize:11, color:COLORS.textMuted, marginTop:4 }}>Deleted: {new Date(record.deletedAt).toLocaleString()}</div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ fontSize:16, fontWeight:700, color: record.type==="expense" ? COLORS.danger : COLORS.success, textAlign:"right" }}>
                  {record.type==="expense" ? "-" : "+"}₹{parseFloat(record.item.amount||0).toLocaleString("en-IN")}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => handleRestore(record)} style={{ background:"rgba(0,200,150,0.1)", color:COLORS.secondary, border:`1px solid rgba(0,200,150,0.2)`, padding:"6px 12px", borderRadius:6, fontSize:11, cursor:"pointer", fontWeight:600 }}>Restore</button>
                  <button onClick={() => handlePermanentDelete(record.id)} style={{ background:"transparent", color:COLORS.danger, border:`1px solid rgba(255,50,50,0.2)`, padding:"6px 12px", borderRadius:6, fontSize:11, cursor:"pointer" }}>Delete</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getNextTrxNo(prefix, list) {
  let max = 0;
  if (list && list.length > 0) {
    for (const item of list) {
      if (item.trxNo && item.trxNo.startsWith(prefix + "-")) {
        const numStr = item.trxNo.substring(prefix.length + 1);
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > max) {
          max = num;
        }
      }
    }
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

