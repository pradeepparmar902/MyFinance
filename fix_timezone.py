import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

old_inv = 'const start = new Date(inv.startDate);'
new_inv = '''const [sY, sM, sD] = inv.startDate.split('-');
    const start = new Date(sY, sM - 1, sD);'''
code = code.replace(old_inv, new_inv)

old_sub = 'const start = new Date(sub.startDate);'
new_sub = '''const [sY, sM, sD] = sub.startDate.split('-');
    const start = new Date(sY, sM - 1, sD);'''
code = code.replace(old_sub, new_sub)

old_ins = 'const start = new Date(ins.startDate);'
new_ins = '''const [sY, sM, sD] = ins.startDate.split('-');
    const start = new Date(sY, sM - 1, sD);'''
code = code.replace(old_ins, new_ins)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Fixed timezones!")
