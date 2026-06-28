import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

old_sig = "function ExpenseViewLive({ expenses, setExpenses, filter, subscriptions, setSubscriptions }) {"
new_sig = "function ExpenseViewLive({ expenses, setExpenses, filter, subscriptions, setSubscriptions, insurance, setInsurance }) {"

code = code.replace(old_sig, new_sig)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Signature updated.")
