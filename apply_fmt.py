import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

old_fmt = """  const fmtSubDue = (s) => {
    if (!s.startDate) return "";
    const d = new Date(s.startDate);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (s.cycle === "Annual") {
      return `${months[d.getMonth()]} '${(d.getFullYear()+1).toString().slice(-2)}`;
    }
    return `Day ${d.getDate()}`;
  };"""

new_fmt = """  const fmtSubDue = (s) => {
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
        const d = nextDate;
        if (nextDate <= today) return `Due: ${d.getDate()} ${months[d.getMonth()]}`;
        return `Next: ${d.getDate()} ${months[d.getMonth()]}`;
      }
      
      if (s.cycle === "Annual") nextDate.setFullYear(nextDate.getFullYear() + 1);
      else nextDate.setMonth(nextDate.getMonth() + 1);
      limit++;
    }
    return "";
  };"""

if old_fmt in code:
    code = code.replace(old_fmt, new_fmt)
    code = code.replace("Due: {fmtSubDue(s)}", "{fmtSubDue(s)}")
    with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
        f.write(code)
    print("Successfully updated fmtSubDue!")
else:
    print("old_fmt not found in code!")
