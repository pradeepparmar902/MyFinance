import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

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

target = 'const [viewSchedule, setViewSchedule] = useState(null);'
if 'const handleSoaEdit =' not in code:
    code = code.replace(target, target + '\n' + handler_func)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Injected handleSoaEdit successfully.")
