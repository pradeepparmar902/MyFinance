import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# Replace calculateAmortization(viewSchedule) with activeLoan logic
old_tbody = '<tbody>\n                  {calculateAmortization(viewSchedule).map((row, i) => {'
new_tbody = '<tbody>\n                  {calculateAmortization(loans.find(l=>l.id===viewSchedule.id)||viewSchedule).map((row, i) => {\n                    const activeLoan = loans.find(l=>l.id===viewSchedule.id)||viewSchedule;'
code = code.replace(old_tbody, new_tbody)

# Replace viewSchedule.payments with activeLoan.payments
old_isPaid = 'const isPaid = viewSchedule.payments && i < viewSchedule.payments.length;'
new_isPaid = 'const isPaid = activeLoan.payments && i < activeLoan.payments.length;'
code = code.replace(old_isPaid, new_isPaid)

# Replace handleSoaEdit(viewSchedule.id, ...)
old_onBlurEmi = 'handleSoaEdit(viewSchedule.id, row.month, "emi"'
new_onBlurEmi = 'handleSoaEdit(activeLoan.id, row.month, "emi"'
code = code.replace(old_onBlurEmi, new_onBlurEmi)

old_onBlurPrin = 'handleSoaEdit(viewSchedule.id, row.month, "principal"'
new_onBlurPrin = 'handleSoaEdit(activeLoan.id, row.month, "principal"'
code = code.replace(old_onBlurPrin, new_onBlurPrin)

old_onBlurInt = 'handleSoaEdit(viewSchedule.id, row.month, "interest"'
new_onBlurInt = 'handleSoaEdit(activeLoan.id, row.month, "interest"'
code = code.replace(old_onBlurInt, new_onBlurInt)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Patched viewSchedule static reference to dynamically lookup from loans.")
