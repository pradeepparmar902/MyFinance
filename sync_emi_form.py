import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

old_int = 'onChange={e=>setEmiForm({...emiForm, interest:e.target.value})}'
new_int = 'onChange={e=>{ const int = parseFloat(e.target.value)||0; const prin = parseFloat(emiForm.principal)||0; setEmiForm({...emiForm, interest:e.target.value, amount: prin + int}); }}'

old_prin = 'onChange={e=>setEmiForm({...emiForm, principal:e.target.value})}'
new_prin = 'onChange={e=>{ const prin = parseFloat(e.target.value)||0; const int = parseFloat(emiForm.interest)||0; setEmiForm({...emiForm, principal:e.target.value, amount: prin + int}); }}'

old_amt = 'onChange={e=>setEmiForm({...emiForm, amount:e.target.value})}'
new_amt = 'onChange={e=>{ const amt = parseFloat(e.target.value)||0; const int = parseFloat(emiForm.interest)||0; const prin = parseFloat(emiForm.principal)||0; if (int === 0) { setEmiForm({...emiForm, amount:e.target.value, principal: amt}); } else { setEmiForm({...emiForm, amount:e.target.value, interest: Math.max(0, amt - prin)}); } }}'

code = code.replace(old_int, new_int)
code = code.replace(old_prin, new_prin)
code = code.replace(old_amt, new_amt)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Updated inline form dynamic calculation.")
