import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Inject state
old_state = 'const [viewSchedule, setViewSchedule] = useState(null);'
new_state = 'const [viewSchedule, setViewSchedule] = useState(null);\n  const [deleteConfirm, setDeleteConfirm] = useState(null);'
if 'const [deleteConfirm' not in code:
    code = code.replace(old_state, new_state)

# 2. Update button
old_btn = """                     <button onClick={() => { 
                       if (window.confirm("Are you sure you want to delete this loan?")) {
                         if (window.confirm("WARNING: This will permanently erase the loan schedule and payment history. Proceed?")) {
                           setLoans(p => p.filter(x => x.id !== l.id));
                         }
                       }
                     }} style={{ background: "rgba(255,50,50,0.1)", border: `1px solid rgba(255,50,50,0.2)`, borderRadius: 4, padding: "2px 6px", color: COLORS.danger, fontSize: 10, cursor: "pointer", width: "100%" }}>Delete</button>"""

new_btn = """                     <button onClick={() => { 
                       setDeleteConfirm({ loan: l, step: 1 });
                     }} style={{ background: "rgba(255,50,50,0.1)", border: `1px solid rgba(255,50,50,0.2)`, borderRadius: 4, padding: "2px 6px", color: COLORS.danger, fontSize: 10, cursor: "pointer", width: "100%" }}>Delete</button>"""
code = code.replace(old_btn, new_btn)

# 3. Inject modal UI
modal_ui = """      {deleteConfirm && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.7)", zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, width: "90%", maxWidth: 400, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: deleteConfirm.step === 2 ? COLORS.danger : COLORS.text, marginBottom: 8 }}>
              {deleteConfirm.step === 1 ? "Delete Loan" : "⚠️ Final Warning"}
            </div>
            <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 24 }}>
              {deleteConfirm.step === 1 
                ? `Are you sure you want to delete ${deleteConfirm.loan.name}?` 
                : "This will permanently erase the loan schedule and payment history. Proceed?"}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => {
                if (deleteConfirm.step === 1) {
                  setDeleteConfirm({ ...deleteConfirm, step: 2 });
                } else {
                  setLoans(p => p.filter(x => x.id !== deleteConfirm.loan.id));
                  setDeleteConfirm(null);
                }
              }} style={{ background: COLORS.danger, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>
                {deleteConfirm.step === 1 ? "Delete" : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
"""
if 'deleteConfirm.step === 1 ? "Delete Loan"' not in code:
    code = code.replace('{showForm && (', modal_ui + '\n      {showForm && (')

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Injected custom delete modal successfully.")
