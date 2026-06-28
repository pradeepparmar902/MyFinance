import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

with open(r"c:\Users\Pradeep.Parmar\OneDrive - insidemedia.net\personal\My Website\MyFinance\finpilot-ai\src\FinPilotAI.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines[1246:1330]):
    print(f"{i+1247}: {line}", end='')
