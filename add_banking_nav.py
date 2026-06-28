import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# The exact line in FinPilotAI.jsx
old_line = '    { id: "insurance", icon: "🛡️", label: "Insurance" },'
new_line = '    { id: "insurance", icon: "🛡️", label: "Insurance" },\n  { id: "banking", icon: "🏦", label: "Banking & Inv." },'

if '{ id: "banking", icon: "🏦", label: "Banking & Inv." },' not in code:
    if old_line in code:
        code = code.replace(old_line, new_line)
        print("Successfully added Banking & Inv. to NAV")
    else:
        print("ERROR: old_line not found. Let's try regex.")
        code = re.sub(r'\{ id: "insurance".*?\},', r'\g<0>\n  { id: "banking", icon: "🏦", label: "Banking & Inv." },', code)
        print("Used regex to add to NAV")

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)
