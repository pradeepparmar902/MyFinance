import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# Extract NAV
nav_start = code.find('const NAV = [')
nav_end = code.find('];', nav_start) + 2

new_nav = """const NAV = [
  { id: "dashboard", icon: "⬡", label: "Dashboard" },
  { id: "income", icon: "↑", label: "Income" },
  { id: "expense", icon: "↓", label: "Expenses" },
  { id: "budget", icon: "◈", label: "Budget" },
  { id: "goals", icon: "◎", label: "Goals" },
  { id: "emi", icon: "⊕", label: "EMI" },
  { id: "investments", icon: "🏦", label: "Banking & Inv." },
  { id: "subscriptions", icon: "⊞", label: "Subscriptions" },
  { id: "insurance", icon: "🛡️", label: "Insurance" },
  { id: "score", icon: "★", label: "Health Score" },
  { id: "ai", icon: "✦", label: "AI Advisor" },
  { id: "retirement", icon: "⏱", label: "Retire Planner" },
  { id: "freedom", icon: "🏁", label: "FI Calculator" },
  { id: "reports", icon: "📊", label: "Reports" },
];"""

code = code[:nav_start] + new_nav + code[nav_end:]

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Reordered NAV array successfully!")
