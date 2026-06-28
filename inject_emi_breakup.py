import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. State for Breakup Modal
state_inj = """  const [activeBreakup, setActiveBreakup] = useState(null);
  
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
"""

old_metrics = """  const totalEMI = loans ? loans.reduce((s,l) => {
    const sch = calculateAmortization(l);
    if(sch.length>0) return s + sch[0].emi;
    return s;
  }, 0) : 0;
  
  const totalBalance = loans ? loans.reduce((s,l) => {
    const sch = calculateAmortization(l);
    const paidCount = l.payments ? l.payments.length : 0;
    if(sch.length > paidCount) return s + sch[paidCount].balance;
    return s;
  }, 0) : 0;"""

code = code.replace(old_metrics, state_inj)


# 2. Render Cards
old_cards = """      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,minmax(80px,1fr))",gap:9,marginBottom:16 }}>
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
      </div>"""

new_cards = """      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(100px, 1fr))",gap:9,marginBottom:16 }}>
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
      </div>"""

code = code.replace(old_cards, new_cards)

# 3. Inject Breakup Modal
modal_code = """      {activeBreakup && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, width: "90%", maxWidth: 500, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>{activeBreakup.title} Breakup</div>
              <button onClick={() => setActiveBreakup(null)} style={{ background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 20 }}>&times;</button>
            </div>
            
            <div style={{ overflowY: "auto", flex: 1, paddingRight: 8 }}>
              {activeBreakup.data.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${item.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{item.loanName} <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 400 }}>• {item.bank}</span></div>
                      <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>Inst #{item.monthIdx} • Due: {item.date}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>₹{item.amount.toLocaleString("en-IN", {maximumFractionDigits:0})}</div>
                    <div style={{ fontSize: 10, color: COLORS.textMuted }}>P: {item.principal.toLocaleString("en-IN", {maximumFractionDigits:0})} | I: {item.interest.toLocaleString("en-IN", {maximumFractionDigits:0})}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
"""
if 'activeBreakup && (' not in code:
    code = code.replace('{showForm && (', modal_code + '\n      {showForm && (')


with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Injected EMI Breakup logic successfully.")
