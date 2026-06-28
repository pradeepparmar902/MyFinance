import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace(
    '{ id: "emi", icon: "⊕", label: "EMI" }',
    '{ id: "emi", icon: "⊕", label: "EMI & Loan" }'
)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Renamed EMI to EMI & Loan successfully.")
