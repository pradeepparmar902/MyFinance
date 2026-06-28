import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update calculateAmortization (Fixed block)
old_fixed_loop = """    for (let i = 1; i <= months; i++) {
      if (balance <= 0) break;
      if (balance < prinPerMonth) prinPerMonth = balance;
      const dStr = dt.toISOString().split('T')[0];
      schedule.push({ month: i, date: dStr, emi: prinPerMonth + intPerMonth, principal: prinPerMonth, interest: intPerMonth, balance: Math.max(0, balance - prinPerMonth), rate: currentRate });
      balance -= prinPerMonth;
      dt.setMonth(dt.getMonth() + 1);
    }"""
new_fixed_loop = """    for (let i = 1; i <= months; i++) {
      if (balance <= 0) break;
      let ovPrin = prinPerMonth;
      let ovInt = intPerMonth;
      let ovEmi = prinPerMonth + intPerMonth;
      
      const dStr = dt.toISOString().split('T')[0];
      
      // SOA Overrides
      if (loan.soaOverrides) {
        const ov = loan.soaOverrides.find(o => o.month === i);
        if (ov) {
          if (ov.principal !== undefined) ovPrin = ov.principal;
          if (ov.interest !== undefined) ovInt = ov.interest;
          if (ov.emi !== undefined) ovEmi = ov.emi;
        }
      }
      // Actual Payments Override
      const isPaid = loan.payments && loan.payments.some(p => p.date === dStr || p.date.substring(0,7) === dStr.substring(0,7));
      if (isPaid) {
        const pData = loan.payments.find(p => p.date === dStr || p.date.substring(0,7) === dStr.substring(0,7));
        if (pData.principal !== undefined) ovPrin = parseFloat(pData.principal);
        if (pData.interest !== undefined) ovInt = parseFloat(pData.interest);
        if (pData.amount !== undefined) ovEmi = parseFloat(pData.amount);
      }
      
      if (balance < ovPrin) ovPrin = balance;
      
      schedule.push({ month: i, date: dStr, emi: ovEmi, principal: ovPrin, interest: ovInt, balance: Math.max(0, balance - ovPrin), rate: currentRate });
      balance -= ovPrin;
      dt.setMonth(dt.getMonth() + 1);
    }"""
code = code.replace(old_fixed_loop, new_fixed_loop)

# 2. Update calculateAmortization (Compound block)
old_comp_loop = """    const rMonth = currentRate / 12 / 100;
    const interest = balance * rMonth;
    let prin = pmt - interest;
    
    // Last month precision correction or if balance is exhausted early
    if (i === months || balance < (pmt - interest)) { prin = balance; pmt = prin + interest; }
    if (balance <= 0) {
      if (i !== 1) break; // If it's literally 0, stop generating future months
    }
    
    balance -= prin;
    if (balance < 0) balance = 0;

    const dStr = dt.toISOString().split('T')[0];
    schedule.push({ month: i, date: dStr, emi: pmt, principal: prin, interest: interest, balance, rate: currentRate });"""

new_comp_loop = """    const rMonth = currentRate / 12 / 100;
    let interest = balance * rMonth;
    let prin = pmt - interest;
    let currentPmt = pmt;
    
    // Last month precision correction or if balance is exhausted early
    if (i === months || balance < (pmt - interest)) { prin = balance; currentPmt = prin + interest; }
    
    const dStr = dt.toISOString().split('T')[0];
    
    // SOA Overrides
    if (loan.soaOverrides) {
      const ov = loan.soaOverrides.find(o => o.month === i);
      if (ov) {
        if (ov.principal !== undefined) prin = ov.principal;
        if (ov.interest !== undefined) interest = ov.interest;
        if (ov.emi !== undefined) currentPmt = ov.emi;
      }
    }
    // Actual Payments Override
    const isPaid = loan.payments && loan.payments.some(p => p.date === dStr || p.date.substring(0,7) === dStr.substring(0,7));
    if (isPaid) {
      const pData = loan.payments.find(p => p.date === dStr || p.date.substring(0,7) === dStr.substring(0,7));
      if (pData.principal !== undefined) prin = parseFloat(pData.principal);
      if (pData.interest !== undefined) interest = parseFloat(pData.interest);
      if (pData.amount !== undefined) currentPmt = parseFloat(pData.amount);
    }
    
    if (balance <= 0 && i !== 1) break;
    if (balance < prin) prin = balance;
    
    balance -= prin;
    if (balance < 0) balance = 0;

    schedule.push({ month: i, date: dStr, emi: currentPmt, principal: prin, interest: interest, balance, rate: currentRate });"""
code = code.replace(old_comp_loop, new_comp_loop)

# 3. Inject handleSoaEdit into EMIViewLive
handler_func = """  const handleSoaEdit = (loanId, month, field, valStr, currentPrin, currentInt, currentEmi) => {
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
"""
if 'const handleSoaEdit =' not in code:
    code = code.replace('const EMIViewLive = ({ loans, setLoans, goals }) => {', 'const EMIViewLive = ({ loans, setLoans, goals }) => {\n' + handler_func)

# 4. Make table cells editable
old_tds = """                      <td>₹{row.emi.toLocaleString("en-IN", {maximumFractionDigits:0})}</td>
                      <td style={{ color: COLORS.primary }}>₹{row.principal.toLocaleString("en-IN", {maximumFractionDigits:0})}</td>
                      <td style={{ color: COLORS.danger }}>₹{row.interest.toLocaleString("en-IN", {maximumFractionDigits:0})}</td>"""

new_tds = """                      <td>
                        <input type="number" value={row.emi} onChange={e => handleSoaEdit(viewSchedule.id, row.month, "emi", e.target.value, row.principal, row.interest, row.emi)} style={{ background:"transparent", border:"none", color:isPaid?COLORS.success:COLORS.text, width:"60px", fontSize:13 }} />
                      </td>
                      <td>
                        <input type="number" value={row.principal} onChange={e => handleSoaEdit(viewSchedule.id, row.month, "principal", e.target.value, row.principal, row.interest, row.emi)} style={{ background:"transparent", border:"none", color:isPaid?COLORS.success:COLORS.primary, width:"60px", fontSize:13 }} />
                      </td>
                      <td>
                        <input type="number" value={row.interest} onChange={e => handleSoaEdit(viewSchedule.id, row.month, "interest", e.target.value, row.principal, row.interest, row.emi)} style={{ background:"transparent", border:"none", color:isPaid?COLORS.success:COLORS.danger, width:"60px", fontSize:13 }} />
                      </td>"""
code = code.replace(old_tds, new_tds)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Injected SOA overrides successfully.")
