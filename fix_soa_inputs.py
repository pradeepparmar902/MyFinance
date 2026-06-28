import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

old_inputs = """                      <td>
                        <input type="number" value={row.emi} onChange={e => handleSoaEdit(viewSchedule.id, row.month, "emi", e.target.value, row.principal, row.interest, row.emi)} style={{ background:"transparent", border:"none", color:isPaid?COLORS.success:COLORS.text, width:"60px", fontSize:13 }} />
                      </td>
                      <td>
                        <input type="number" value={row.principal} onChange={e => handleSoaEdit(viewSchedule.id, row.month, "principal", e.target.value, row.principal, row.interest, row.emi)} style={{ background:"transparent", border:"none", color:isPaid?COLORS.success:COLORS.primary, width:"60px", fontSize:13 }} />
                      </td>
                      <td>
                        <input type="number" value={row.interest} onChange={e => handleSoaEdit(viewSchedule.id, row.month, "interest", e.target.value, row.principal, row.interest, row.emi)} style={{ background:"transparent", border:"none", color:isPaid?COLORS.success:COLORS.danger, width:"60px", fontSize:13 }} />
                      </td>"""

new_inputs = """                      <td>
                        <input type="number" key={`emi-${row.month}-${Math.round(row.emi)}`} defaultValue={Math.round(row.emi)} onBlur={e => handleSoaEdit(viewSchedule.id, row.month, "emi", e.target.value, row.principal, row.interest, row.emi)} style={{ background:"transparent", border:"1px solid transparent", borderBottom:`1px solid ${COLORS.border}`, color:isPaid?COLORS.success:COLORS.text, width:"60px", fontSize:13, padding:"2px 4px", outline:"none" }} onFocus={e => e.target.style.border=`1px solid ${COLORS.primary}`} />
                      </td>
                      <td>
                        <input type="number" key={`prin-${row.month}-${Math.round(row.principal)}`} defaultValue={Math.round(row.principal)} onBlur={e => handleSoaEdit(viewSchedule.id, row.month, "principal", e.target.value, row.principal, row.interest, row.emi)} style={{ background:"transparent", border:"1px solid transparent", borderBottom:`1px solid ${COLORS.border}`, color:isPaid?COLORS.success:COLORS.primary, width:"60px", fontSize:13, padding:"2px 4px", outline:"none" }} onFocus={e => e.target.style.border=`1px solid ${COLORS.primary}`} />
                      </td>
                      <td>
                        <input type="number" key={`int-${row.month}-${Math.round(row.interest)}`} defaultValue={Math.round(row.interest)} onBlur={e => handleSoaEdit(viewSchedule.id, row.month, "interest", e.target.value, row.principal, row.interest, row.emi)} style={{ background:"transparent", border:"1px solid transparent", borderBottom:`1px solid ${COLORS.border}`, color:isPaid?COLORS.success:COLORS.danger, width:"60px", fontSize:13, padding:"2px 4px", outline:"none" }} onFocus={e => e.target.style.border=`1px solid ${COLORS.primary}`} />
                      </td>"""

code = code.replace(old_inputs, new_inputs)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Updated inputs to use onBlur and defaultValue")
