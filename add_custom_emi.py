import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update calculateAmortization
old_fixed_logic = """  if (loan.type === "Fixed") {
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
  }"""

new_fixed_logic = """  if (loan.type === "Fixed") {
    const totalInt = balance * (currentRate / 100) * (months / 12);
    let emi = (balance + totalInt) / months;
    let prinPerMonth = balance / months;
    let intPerMonth = totalInt / months;
    
    if (loan.emiAmount && parseFloat(loan.emiAmount) > 0) {
      emi = parseFloat(loan.emiAmount);
      prinPerMonth = emi - intPerMonth;
    }
    
    let dt = new Date(start);
    for (let i = 1; i <= months; i++) {
      if (balance <= 0) break;
      if (balance < prinPerMonth) prinPerMonth = balance;
      const dStr = dt.toISOString().split('T')[0];
      schedule.push({ month: i, date: dStr, emi: prinPerMonth + intPerMonth, principal: prinPerMonth, interest: intPerMonth, balance: Math.max(0, balance - prinPerMonth), rate: currentRate });
      balance -= prinPerMonth;
      dt.setMonth(dt.getMonth() + 1);
    }
    return schedule;
  }"""
code = code.replace(old_fixed_logic, new_fixed_logic)

old_calc = """  pmt = calcPMT(balance, currentRate, months);

  for (let i = 1; i <= months; i++) {"""
new_calc = """  if (loan.emiAmount && parseFloat(loan.emiAmount) > 0) {
    pmt = parseFloat(loan.emiAmount);
  } else {
    pmt = calcPMT(balance, currentRate, months);
  }

  for (let i = 1; i <= months; i++) {"""
code = code.replace(old_calc, new_calc)

old_float_pmt = """        // Recalculate PMT with remaining balance and remaining months
        pmt = calcPMT(balance, currentRate, months - i + 1);"""
new_float_pmt = """        // Recalculate PMT with remaining balance and remaining months
        if (!loan.emiAmount || parseFloat(loan.emiAmount) <= 0) {
          pmt = calcPMT(balance, currentRate, months - i + 1);
        }"""
code = code.replace(old_float_pmt, new_float_pmt)

old_precision = """    // Last month precision correction
    if (i === months) { prin = balance; pmt = prin + interest; }"""
new_precision = """    // Last month precision correction or if balance is exhausted early
    if (i === months || balance < (pmt - interest)) { prin = balance; pmt = prin + interest; }
    if (balance <= 0) {
      if (i !== 1) break; // If it's literally 0, stop generating future months
    }"""
code = code.replace(old_precision, new_precision)

# 2. Add to form state
old_form = 'emiAmount:"", remarks:"", linkedGoal:"", icon:"🏠", color:COLORS.primary });'
if old_form not in code:
    code = code.replace('rateHistory:[], remarks:"", linkedGoal:"", icon:"🏠", color:COLORS.primary });', 'rateHistory:[], emiAmount:"", remarks:"", linkedGoal:"", icon:"🏠", color:COLORS.primary });')

old_reset1 = 'rateHistory:[], remarks:"", linkedGoal:"", icon:"🏠", color:COLORS.primary }); setShowForm(true); }} style={{ background: COLORS.primary'
new_reset1 = 'rateHistory:[], emiAmount:"", remarks:"", linkedGoal:"", icon:"🏠", color:COLORS.primary }); setShowForm(true); }} style={{ background: COLORS.primary'
code = code.replace(old_reset1, new_reset1)

# 3. Add UI field
ui_field = """<div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Custom EMI Amount (Optional)</label><input type="number" value={form.emiAmount||""} onChange={e=>setForm({...form, emiAmount: e.target.value})} placeholder="Overrides auto-calc" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>"""

target_ui = '<div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>More Information / Purpose</label>'
if 'Custom EMI Amount' not in code:
    code = code.replace(target_ui, ui_field + '\n              ' + target_ui)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Added EMI Amount field successfully.")
