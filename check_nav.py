import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

print("NAV items:")
for line in code.split('\n'):
    if 'id: "investments"' in line:
        print(line)

print("\nRouting cases:")
for line in code.split('\n'):
    if 'case "investments":' in line:
        print(line)
