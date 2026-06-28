import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# Fix the dangling label/div
bad_label_div = """            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              </label>
            </div>"""
code = code.replace(bad_label_div, "")

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

lines = code.split("\n")
for i in range(2640, min(2660, len(lines))):
    print(str(i+1) + ': ' + lines[i].encode('ascii', 'ignore').decode('ascii'))
