import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Remove the Status dropdown
status_dropdown = """            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Status</label>
              <select value={form.status || "Active"} onChange={e=>setForm({...form, status: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}>
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
              </select>
            </div>
            
"""
code = code.replace(status_dropdown, "")

# 2. Add the Pause button next to Delete
old_actions = """          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleSave} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ background: "transparent", color: COLORS.textMuted, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            {editItem && <button onClick={() => handleDelete(editItem.id)} style={{ background: COLORS.danger, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, marginLeft: "auto" }}>Delete</button>}
          </div>"""

new_actions = """          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleSave} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ background: "transparent", color: COLORS.textMuted, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            
            {editItem && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
                <button onClick={() => setForm({...form, status: form.status === "Paused" ? "Active" : "Paused"})} style={{ background: form.status === "Paused" ? "#10b981" : "#f59e0b", color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>
                  {form.status === "Paused" ? "▶ Resume" : "⏸ Pause"}
                </button>
                <button onClick={() => handleDelete(editItem.id)} style={{ background: COLORS.danger, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Delete</button>
              </div>
            )}
          </div>"""
code = code.replace(old_actions, new_actions)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Applied Pause button fix.")
