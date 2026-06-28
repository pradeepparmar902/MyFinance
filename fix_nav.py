import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# Fix the NAV array
code = code.replace('{ id: "investments", label: "Banking & Inv.", icon: "🏦" }', '{ id: "banking", label: "Banking & Inv.", icon: "🏦" }')

# Fix the routing
code = code.replace('case "investments":      return <InvestmentsView investments={investments} setInvestments={setInvestments} />;', 'case "banking":      return <InvestmentsView investments={investments} setInvestments={setInvestments} />;')

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Fixed NAV ID collision.")
