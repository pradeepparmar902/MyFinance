import { useState, useEffect, useRef, Fragment, Component, useMemo } from "react";
import { db, auth, storage } from "./firebase.js";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { signOut } from "firebase/auth";

// ─── Firebase Storage Upload Helper ───────────────────────────────────────────
// Uploads a File object to Firebase Storage and returns the public download URL.
// path: e.g. "users/{uid}/expenses/{id}/receipt"
async function uploadFileToStorage(file, path) {
  if (!file || !(file instanceof File)) return null;
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return url;
  } catch (err) {
    console.error("Firebase Storage upload failed:", err);
    return null;
  }
}

const COLORS = {
  primary: "#6C63FF",
  secondary: "#00C896",
  accent: "#FFB547",
  danger: "#FF5B5B",
  success: "#10b981",
  bg: "#0F172A",
  bgCard: "rgba(255,255,255,0.06)",
  bgCardHover: "rgba(255,255,255,0.1)",
  border: "rgba(255,255,255,0.08)",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
};

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const step = 16;
    const steps = duration / step;
    const inc = value / steps;
    const timer = setInterval(() => {
      start += inc;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, step);
    return () => clearInterval(timer);
  }, [value]);
  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString("en-IN");
  return <span>{prefix}{formatted}{suffix}</span>;
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────
function Sparkline({ data, color, height = 40 }) {
  const w = 100, h = height;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min + 1)) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const areaPath = `M0,${h} L${pts.split(" ").map(p => p).join(" L")} L${w},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }}>
      <defs>
        <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg-${color})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ data, size = 140 }) {
  const r = 52, cx = 70, cy = 70;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);
  let offset = 0;
  const segs = data.map((d, i) => {
    const pct = d.value / total;
    const dash = pct * circ;
    const seg = (
      <circle key={i} cx={cx} cy={cy} r={r}
        fill="none" stroke={d.color} strokeWidth="18"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={-offset}
        style={{ transition: "stroke-dasharray 1s ease", transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      />
    );
    offset += dash;
    return seg;
  });
  return (
    <svg width={size} height={size} viewBox="0 0 140 140">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="18" />
      {segs}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#F1F5F9" fontSize="13" fontWeight="600">Total</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill={COLORS.secondary} fontSize="11">₹{(total / 100000).toFixed(1)}L</text>
    </svg>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({ months, income, expense }) {
  const max = Math.max(...income, ...expense);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, paddingTop: 8 }}>
      {months.map((m, i) => (
        <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 80 }}>
            <div style={{
              width: 8, height: `${(income[i] / max) * 80}px`,
              background: COLORS.secondary, borderRadius: "3px 3px 0 0",
              transition: "height 0.8s ease", opacity: 0.85
            }} />
            <div style={{
              width: 8, height: `${(expense[i] / max) * 80}px`,
              background: COLORS.danger, borderRadius: "3px 3px 0 0",
              transition: "height 0.8s ease", opacity: 0.75
            }} />
          </div>
          <span style={{ fontSize: 9, color: COLORS.textMuted }}>{m}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Circular Progress ────────────────────────────────────────────────────────
function CircularProgress({ pct, color, size = 60, label }) {
  const r = 24, cx = 30, cy = 30, circ = 2 * Math.PI * r;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} viewBox="0 0 60 60">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${(pct / 100) * circ} ${circ}`}
          strokeDashoffset={circ * 0.25}
          style={{ transition: "stroke-dasharray 1s ease", transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
        />
        <text x={cx} y={cy + 4} textAnchor="middle" fill="#F1F5F9" fontSize="10" fontWeight="700">{pct}%</text>
      </svg>
      <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────
function AIChatPanel() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "👋 Hi! I'm your FinPilot AI Advisor. Ask me anything about your finances." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  const systemPrompt = `You are FinPilot AI, a smart personal finance advisor for Indian users. 
  The user has: Monthly Income ₹1,20,000 | Expenses ₹68,500 | Savings ₹51,500 | Investments ₹3,40,000 | EMI ₹22,000 | Net Worth ₹12,40,000 | Financial Score 74/100.
  Investment breakdown: Mutual Funds ₹1,40,000, Stocks ₹80,000, FD ₹60,000, Gold ₹40,000, PPF ₹20,000.
  Goals: House by 2029 (₹80L target, 12% saved), Car by 2025 (₹12L target, 65% saved), Retirement corpus ₹5Cr by age 60.
  Give concise, practical, India-specific financial advice. Use ₹ symbol. Keep responses under 120 words. Be warm and encouraging.`;

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      // ⚠️ SETUP REQUIRED: This calls YOUR OWN backend at /api/chat,
      // which should securely call the Anthropic API using a server-side API key.
      // NEVER call api.anthropic.com directly from the browser — it will expose your key
      // and will also be blocked by CORS. See README.md "Connecting the AI Advisor" section.
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, message: userMsg })
      });
      if (!res.ok) throw new Error("Backend not configured");
      const data = await res.json();
      const reply = data.reply || "Sorry, I couldn't process that.";
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "⚠️ AI Advisor backend isn't connected yet. See README.md to set up the /api/chat endpoint with your Anthropic API key." }]);
    }
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  const suggestions = ["Can I save more?", "When can I retire?", "Am I overspending?", "Best SIP for me?"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4, maxHeight: 220 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start"
          }}>
            <div style={{
              maxWidth: "85%", padding: "8px 12px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: m.role === "user" ? COLORS.primary : "rgba(255,255,255,0.08)",
              fontSize: 12.5, color: COLORS.text, lineHeight: 1.5
            }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex" }}>
            <div style={{ padding: "8px 12px", borderRadius: "14px 14px 14px 4px", background: "rgba(255,255,255,0.08)" }}>
              <span style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map(j => (
                  <span key={j} style={{
                    width: 6, height: 6, borderRadius: "50%", background: COLORS.textMuted,
                    animation: `bounce 1s ${j * 0.2}s infinite`
                  }} />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10, marginBottom: 8 }}>
        {suggestions.map(s => (
          <button key={s} onClick={() => setInput(s)} style={{
            background: "rgba(108,99,255,0.15)", border: "1px solid rgba(108,99,255,0.3)",
            borderRadius: 20, padding: "3px 10px", fontSize: 10.5, color: COLORS.primary,
            cursor: "pointer", transition: "all 0.2s"
          }}>{s}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask your AI advisor..." style={{
            flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "9px 12px", color: COLORS.text, fontSize: 12.5,
            outline: "none"
          }} />
        <button onClick={send} disabled={loading} style={{
          background: `linear-gradient(135deg, ${COLORS.primary}, #8B5CF6)`,
          border: "none", borderRadius: 10, padding: "9px 16px",
          color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600
        }}>↑</button>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const DEFAULT_NAV = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "income", icon: "💰", label: "Income" },
  { id: "expense", icon: "💸", label: "Expenses" },
  { id: "budget", icon: "🎯", label: "Budget" },
  { id: "goals", icon: "🏆", label: "Goals" },
  { id: "emi", icon: "🏦", label: "EMI & Loan" },
  { id: "friendlyloans", icon: "🤝", label: "Friendly Loans" },
  { id: "investments", icon: "📈", label: "Banking & Inv." },
  { id: "creditcards", icon: "💳", label: "Credit Cards" },
  { id: "subscriptions", icon: "🔄", label: "Subscriptions" },
  { id: "insurance", icon: "🛡️", label: "Insurance" },
  { id: "banks", icon: "🏛️", label: "Bank Accounts" },
  { id: "interworkspace", icon: "🔀", label: "Inter-Workspace" },
  { id: "score", icon: "❤️", label: "Health Score" },
  { id: "ai", icon: "✨", label: "AI Advisor" },
  { id: "recyclebin", icon: "🗑️", label: "Recycle Bin" },
  { id: "retirement", icon: "🌴", label: "Retire Planner" },
  { id: "freedom", icon: "🦅", label: "FI Calculator" },
  { id: "reports", icon: "📄", label: "Reports" },
  { id: "admin", icon: "⚙️", label: "Admin Settings" },
];

function WorkspaceSelector({ workspaces, activeWorkspaceId, setActiveWorkspaceId, setWorkspaces }) {
  const [open, setOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [renameWorkspaceData, setRenameWorkspaceData] = useState({ id: "", name: "" });
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

  const getAmortizeMonths = () => {
    if (!useAverageMode) return 1;
    if (amortizeMode === "1") return 1;
    if (amortizeMode === "3") return 3;
    if (amortizeMode === "6") return 6;
    if (amortizeMode === "12") return 12;
    if (amortizeMode === "custom") {
      const start = amortizeRange.fromYear * 12 + amortizeRange.fromMonth;
      const end = amortizeRange.toYear * 12 + amortizeRange.toMonth;
      return Math.max(1, (end - start) + 1);
    }
    return 1;
  };

  const getCycleDivisor = (cycle) => {
    if (!cycle) return 1;
    if (cycle === "Annually" || cycle === "Annual") return 12;
    if (cycle === "Half-Yearly") return 6;
    if (cycle === "Quarterly") return 3;
    if (cycle === "One-Time") return 0; 
    return 1;
  };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || { name: "Default Workspace" };

  const handleSelect = (id) => {
    setActiveWorkspaceId(id);
    setOpen(false);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    const newId = "ws_" + Date.now();
    const newWs = { id: newId, name: newWorkspaceName.trim() };
    
    // Seed new workspace in localStorage to prevent loading previous states
    localStorage.setItem("fp_banks_" + newId, JSON.stringify([]));
    localStorage.setItem("fp_incomes_" + newId, JSON.stringify([]));
    localStorage.setItem("fp_creditcards_" + newId, JSON.stringify([]));
    localStorage.setItem("fp_expenses_" + newId, JSON.stringify([]));
    localStorage.setItem("fp_budgets_" + newId, JSON.stringify([]));
    localStorage.setItem("fp_investments_" + newId, JSON.stringify([]));
    localStorage.setItem("fp_loans_" + newId, JSON.stringify([]));
    localStorage.setItem("fp_goals_" + newId, JSON.stringify([]));
    localStorage.setItem("fp_subscriptions_" + newId, JSON.stringify([]));
    localStorage.setItem("fp_insurance_" + newId, JSON.stringify([]));
    localStorage.setItem("fp_deleted_" + newId, JSON.stringify([]));

    setWorkspaces([...workspaces, newWs]);
    setActiveWorkspaceId(newId);
    setNewWorkspaceName("");
    setShowCreateModal(false);
  };

  const handleRenameSubmit = (e) => {
    e.preventDefault();
    if (!renameWorkspaceData.name.trim()) return;
    setWorkspaces(workspaces.map(w => w.id === renameWorkspaceData.id ? { ...w, name: renameWorkspaceData.name.trim() } : w));
    setShowRenameModal(false);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (workspaces.length <= 1) {
      alert("You must keep at least one workspace.");
      return;
    }
    if (confirm("Are you sure you want to delete this workspace? All its data will be lost permanently.")) {
      const remaining = workspaces.filter(w => w.id !== id);
      setWorkspaces(remaining);
      
      // Clean up localStorage keys
      localStorage.removeItem("fp_banks_" + id);
      localStorage.removeItem("fp_incomes_" + id);
      localStorage.removeItem("fp_creditcards_" + id);
      localStorage.removeItem("fp_expenses_" + id);
      localStorage.removeItem("fp_budgets_" + id);
      localStorage.removeItem("fp_investments_" + id);
      localStorage.removeItem("fp_loans_" + id);
      localStorage.removeItem("fp_goals_" + id);
      localStorage.removeItem("fp_subscriptions_" + id);
      localStorage.removeItem("fp_insurance_" + id);
      localStorage.removeItem("fp_deleted_" + id);

      if (activeWorkspaceId === id) {
        setActiveWorkspaceId(remaining[0].id);
      }
    }
  };

  const handleSetDefault = (e, id) => {
    e.stopPropagation();
    setWorkspaces(workspaces.map(w => ({ ...w, isDefault: w.id === id })));
  };

  return (
    <div ref={dropdownRef} style={{ padding: "0 10px 12px", position: "relative", zIndex: 30 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`,
        borderRadius: 10, color: COLORS.text, cursor: "pointer", fontSize: 13, outline: "none"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 14 }}>📁</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
            {activeWorkspace.isDefault ? <span style={{ color: "#F59E0B" }}>★ </span> : ""}{activeWorkspace.name}
          </span>
        </div>
        <span style={{ fontSize: 10, color: COLORS.textMuted }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 10, right: 10, marginTop: 4,
          background: "#161E31", border: `1px solid ${COLORS.border}`, borderRadius: 12,
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)", overflow: "hidden", zIndex: 100
        }}>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {workspaces.map(ws => (
              <div key={ws.id} onClick={() => handleSelect(ws.id)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 12px", background: ws.id === activeWorkspaceId ? "rgba(108,99,255,0.15)" : "transparent",
                color: ws.id === activeWorkspaceId ? COLORS.primary : COLORS.text, cursor: "pointer",
                fontSize: 13, transition: "background 0.2s"
              }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                 onMouseLeave={e => e.currentTarget.style.background = ws.id === activeWorkspaceId ? "rgba(108,99,255,0.15)" : "transparent"}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: ws.id === activeWorkspaceId ? 600 : 400 }}>
                  {ws.isDefault ? "★ " : ""}{ws.name}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  {!ws.isDefault && (
                    <button onClick={(e) => handleSetDefault(e, ws.id)} style={{
                      background: "transparent", border: "none", color: COLORS.textMuted,
                      cursor: "pointer", fontSize: 13, padding: "0 4px", borderRadius: 4
                    }} title="Set as Default Workspace"
                       onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.color = "#F59E0B"; }}
                       onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}>☆</button>
                  )}
                  {ws.isDefault && (
                    <span title="Default Workspace" style={{ color: "#F59E0B", fontSize: 13, padding: "0 4px", display: "flex", alignItems: "center" }}>★</span>
                  )}
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setRenameWorkspaceData({ id: ws.id, name: ws.name });
                    setShowRenameModal(true);
                    setOpen(false);
                  }} style={{
                    background: "transparent", border: "none", color: COLORS.textMuted,
                    cursor: "pointer", fontSize: 13, padding: "0 4px", borderRadius: 4
                  }} onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.color = "#fff"; }}
                     onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}>✎</button>
                  {workspaces.length > 1 && (
                    <button onClick={(e) => handleDelete(e, ws.id)} style={{
                      background: "transparent", border: "none", color: COLORS.danger,
                      cursor: "pointer", fontSize: 12, padding: "2px 4px", borderRadius: 4
                    }} onMouseEnter={e => e.stopPropagation()}>✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => { setShowCreateModal(true); setOpen(false); }} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
            padding: "10px 12px", border: "none", borderTop: `1px solid ${COLORS.border}`,
            background: "rgba(108,99,255,0.1)", color: COLORS.primary, cursor: "pointer",
            fontSize: 12, fontWeight: 600, transition: "background 0.2s"
          }} onMouseEnter={e => e.currentTarget.style.background = "rgba(108,99,255,0.15)"}
             onMouseLeave={e => e.currentTarget.style.background = "rgba(108,99,255,0.1)"}>
            <span>＋</span> Create Workspace
          </button>
        </div>
      )}

      {showCreateModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }}>
          <div style={{
            background: "#0d1526", border: `1px solid rgba(108,99,255,0.3)`,
            borderRadius: 16, padding: "20px 20px 24px", width: "100%", maxWidth: 360,
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
          }}>
            <h3 style={{ margin: "0 0 16px", color: COLORS.text, fontSize: 16 }}>Create Workspace</h3>
            <form onSubmit={handleCreate}>
              <input type="text" placeholder="Workspace Name (e.g. Personal)" value={newWorkspaceName}
                onChange={e => setNewWorkspaceName(e.target.value)} autoFocus style={{
                  background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 8,
                  padding: "10px 12px", color: COLORS.text, fontSize: 13, width: "100%",
                  outline: "none", boxSizing: "border-box", marginBottom: 20
                }} />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => { setShowCreateModal(false); setNewWorkspaceName(""); }} style={{
                  background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8,
                  padding: "8px 14px", color: COLORS.textMuted, cursor: "pointer", fontSize: 12
                }}>Cancel</button>
                <button type="submit" style={{
                  background: COLORS.primary, border: "none", borderRadius: 8,
                  padding: "8px 14px", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600
                }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {showRenameModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }}>
          <div style={{
            background: "#0d1526", border: `1px solid rgba(108,99,255,0.3)`,
            borderRadius: 16, padding: "20px 20px 24px", width: "100%", maxWidth: 360,
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
          }}>
            <h3 style={{ margin: "0 0 16px", color: COLORS.text, fontSize: 16 }}>Rename Workspace</h3>
            <form onSubmit={handleRenameSubmit}>
              <input type="text" placeholder="Workspace Name" value={renameWorkspaceData.name}
                onChange={e => setRenameWorkspaceData({ ...renameWorkspaceData, name: e.target.value })} autoFocus style={{
                  background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 8,
                  padding: "10px 12px", color: COLORS.text, fontSize: 13, width: "100%",
                  outline: "none", boxSizing: "border-box", marginBottom: 20
                }} />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowRenameModal(false)} style={{
                  background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8,
                  padding: "8px 14px", color: COLORS.textMuted, cursor: "pointer", fontSize: 12
                }}>Cancel</button>
                <button type="submit" style={{
                  background: COLORS.primary, border: "none", borderRadius: 8,
                  padding: "8px 14px", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600
                }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Sidebar({ active, setActive, mobileOpen, setMobileOpen, workspaces, activeWorkspaceId, setActiveWorkspaceId, setWorkspaces, computedNav }) {
  // Detect if screen is narrow (mobile)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const handleNav = (id) => {
    setActive(id);
    if (isMobile) setMobileOpen(false);
  };

  const sidebarContent = (
    <div style={{
      width: 220, height: "100%",
      background: "rgba(13,20,38,0.98)", backdropFilter: "blur(24px)",
      borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column",
      overflow: "hidden"
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: `linear-gradient(135deg, ${COLORS.primary}, #8B5CF6)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, fontWeight: 800, color: "#fff"
          }}>F</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, letterSpacing: "0.5px" }}>FinPilot</div>
            <div style={{ fontSize: 9, color: COLORS.primary, letterSpacing: "1.5px" }}>AI FINANCE</div>
          </div>
        </div>
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, width: 30, height: 30, color: COLORS.textMuted, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        )}
      </div>

      {/* Workspace Selector */}
      <WorkspaceSelector workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} setActiveWorkspaceId={setActiveWorkspaceId} setWorkspaces={setWorkspaces} />

      {/* Nav items */}
      <div style={{ flex: 1, padding: "4px 10px", overflowY: "auto" }}>
        {computedNav.filter(item => !item.isHidden).map(item => (
          item.isDivider ? (
            <div key={item.id} style={{ margin: "16px 12px 8px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              {item.label && <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>{item.label}</div>}
              {item.label && <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />}
            </div>
          ) : (
            <button key={item.id} onClick={() => handleNav(item.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 11,
              padding: "10px 12px",
              background: active === item.id ? `linear-gradient(135deg, rgba(108,99,255,0.22), rgba(139,92,246,0.12))` : "transparent",
              border: "none", borderRadius: 10, cursor: "pointer", marginBottom: 1,
              borderLeft: active === item.id ? `3px solid ${COLORS.primary}` : "3px solid transparent",
              transition: "all 0.18s", textAlign: "left"
            }}>
              <span style={{ fontSize: 15, color: active === item.id ? COLORS.primary : COLORS.textMuted, flexShrink: 0, width: 20, textAlign: "center" }}>{item.icon}</span>
              <span style={{ fontSize: 13, color: active === item.id ? COLORS.text : COLORS.textMuted, fontWeight: active === item.id ? 600 : 400, whiteSpace: "nowrap" }}>{item.label}</span>
            </button>
          )
        ))}
      </div>

      {/* Bottom profile */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.primary}, #8B5CF6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>P</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Pradeep</div>
          <div style={{ fontSize: 10, color: COLORS.secondary }}>Score: 74/100</div>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {/* Overlay backdrop */}
        {mobileOpen && (
          <div onClick={() => setMobileOpen(false)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40,
            backdropFilter: "blur(2px)"
          }} />
        )}
        {/* Slide-in drawer */}
        <div style={{
          position: "fixed", top: 0, left: 0, height: "100%", zIndex: 50,
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)"
        }}>
          {sidebarContent}
        </div>
      </>
    );
  }

  // Desktop: static sidebar
  return (
    <div style={{ width: 220, flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
      {sidebarContent}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, prefix = "₹", suffix = "", trend, trendLabel, color, sparkData, icon }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      background: hover ? COLORS.bgCardHover : COLORS.bgCard,
      border: `1px solid ${hover ? "rgba(108,99,255,0.3)" : COLORS.border}`,
      borderRadius: 16, padding: "18px 20px 12px",
      transition: "all 0.25s", transform: hover ? "translateY(-3px)" : "none",
      boxShadow: hover ? `0 12px 32px rgba(108,99,255,0.15)` : "none",
      backdropFilter: "blur(12px)", cursor: "default"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4, letterSpacing: "0.5px" }}>{label.toUpperCase()}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, letterSpacing: "-0.5px" }}>
            <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
          </div>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, border: `1px solid ${color}33`
        }}>{icon}</div>
      </div>
      {sparkData && <div style={{ margin: "8px -4px 4px" }}><Sparkline data={sparkData} color={color} /></div>}
      {trend && <div style={{ fontSize: 11, color: trend > 0 ? COLORS.secondary : COLORS.danger, display: "flex", alignItems: "center", gap: 4 }}>
        <span>{trend > 0 ? "▲" : "▼"}</span>
        <span>{Math.abs(trend)}% {trendLabel}</span>
      </div>}
    </div>
  );
}

// ─── Warranty Modal ────────────────────────────────────────────────────────────
function WarrantyModal({ onClose, onSave, productName, uid, initialData }) {
  const now = new Date();
  const [uploading, setUploading] = useState(false);
  const [cardBase64, setCardBase64] = useState(null); // base64 fallback for guest mode / storage failure
  const [viewingReceipt, setViewingReceipt] = useState(null); // in-app document viewer
  const [wData, setWData] = useState(() => {
    if (initialData) {
      let pDay = String(now.getDate());
      let pMonth = String(now.getMonth() + 1);
      let pYear = String(now.getFullYear());
      if (initialData.purchaseDate) {
        const parts = initialData.purchaseDate.split("-");
        if (parts.length === 3) {
          pYear = String(parseInt(parts[0]));
          pMonth = String(parseInt(parts[1]));
          pDay = String(parseInt(parts[2]));
        }
      }
      
      let eDay = "";
      let eMonth = "";
      let eYear = "";
      if (initialData.expiryDate) {
        const parts = initialData.expiryDate.split("-");
        if (parts.length === 3) {
          eYear = String(parseInt(parts[0]));
          eMonth = String(parseInt(parts[1]));
          eDay = String(parseInt(parts[2]));
        }
      }

      return {
        period: initialData.period || "",
        unit: initialData.unit || "months",
        type: initialData.type || "Warranty",
        purchaseDay: pDay,
        purchaseMonth: pMonth,
        purchaseYear: pYear,
        expiryDay: eDay || initialData.expiryDay || "",
        expiryMonth: eMonth || initialData.expiryMonth || "",
        expiryYear: eYear || initialData.expiryYear || "",
        notes: initialData.notes || "",
        reminder: initialData.reminder !== undefined ? initialData.reminder : true,
        cardUrl: initialData.cardUrl || (typeof initialData.card === 'string' ? initialData.card : ""),
        cardPreview: null,
        cardFile: null
      };
    }
    return {
      period: "", unit: "months", type: "Warranty",
      purchaseDay: String(now.getDate()), purchaseMonth: String(now.getMonth() + 1), purchaseYear: String(now.getFullYear()),
      expiryDay: "", expiryMonth: "", expiryYear: "",
      cardFile: null, cardPreview: null, notes: "", reminder: true
    };
  });

  useEffect(() => {
    return () => {
      if (wData.cardPreview && wData.cardPreview.startsWith("blob:")) {
        URL.revokeObjectURL(wData.cardPreview);
      }
    };
  }, [wData.cardPreview]);

  const iStyle = { background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box", WebkitAppearance: "none", appearance: "none", caretColor: "#6C63FF" };
  const selStyle = { ...iStyle, cursor: "pointer" };

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const years = Array.from({ length: 15 }, (_, i) => now.getFullYear() + i);
  const pastYears = Array.from({ length: 10 }, (_, i) => now.getFullYear() - i).reverse();

  // Auto-calculate expiry date when period or purchase date changes
  const calcExpiry = (period, unit, pDay, pMonth, pYear) => {
    if (!period || !pDay || !pMonth || !pYear) return {};
    const base = new Date(parseInt(pYear), parseInt(pMonth) - 1, parseInt(pDay));
    const months = unit === "years" ? parseInt(period) * 12 : parseInt(period);
    base.setMonth(base.getMonth() + months);
    return {
      expiryDay: String(base.getDate()),
      expiryMonth: String(base.getMonth() + 1),
      expiryYear: String(base.getFullYear())
    };
  };

  const handlePeriodChange = (field, val) => {
    const updated = { ...wData, [field]: val };
    const expiry = calcExpiry(
      field === "period" ? val : updated.period,
      field === "unit" ? val : updated.unit,
      updated.purchaseDay, updated.purchaseMonth, updated.purchaseYear
    );
    setWData(p => ({ ...p, [field]: val, ...expiry }));
  };

  const handlePurchaseDate = (field, val) => {
    const updated = { ...wData, [field]: val };
    const expiry = calcExpiry(updated.period, updated.unit,
      field === "purchaseDay" ? val : updated.purchaseDay,
      field === "purchaseMonth" ? val : updated.purchaseMonth,
      field === "purchaseYear" ? val : updated.purchaseYear
    );
    setWData(p => ({ ...p, [field]: val, ...expiry }));
  };

  const handleCardUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setWData(p => ({ ...p, cardFile: file, cardPreview: url }));

    const reader = new FileReader();
    reader.onload = (ev) => setCardBase64(ev.target.result);
    reader.readAsDataURL(file);
  };

  const expiryFormatted = wData.expiryDay && wData.expiryMonth && wData.expiryYear
    ? `${wData.expiryDay} ${MONTHS[parseInt(wData.expiryMonth) - 1]} ${wData.expiryYear}` : null;
  const purchaseFormatted = wData.purchaseDay && wData.purchaseMonth && wData.purchaseYear
    ? `${wData.purchaseDay} ${MONTHS[parseInt(wData.purchaseMonth) - 1]} ${wData.purchaseYear}` : null;

  // Build ISO string for saving
  const toISO = (d, m, y) => y && m && d ? `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}` : "";

  const labelStyle = { fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 6, letterSpacing: "0.5px" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#111827", border: `1px solid rgba(108,99,255,0.3)`, borderRadius: 20, padding: "22px 18px", width: "100%", maxWidth: 420, maxHeight: "92vh", overflowY: "auto", position: "relative", isolation: "isolate" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>🛡️ Warranty / Guarantee</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{productName}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 8, width: 32, height: 32, color: COLORS.textMuted, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Type selector */}
          <div>
            <label style={labelStyle}>TYPE</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["Warranty", "Guarantee", "Both"].map(t => (
                <button key={t} onClick={() => setWData(p => ({ ...p, type: t }))} style={{
                  flex: 1, padding: "9px 0", borderRadius: 9, border: `1px solid ${wData.type === t ? COLORS.primary : COLORS.border}`,
                  background: wData.type === t ? `${COLORS.primary}22` : "#1a2236",
                  color: wData.type === t ? COLORS.primary : COLORS.textMuted,
                  fontSize: 12.5, cursor: "pointer", fontWeight: wData.type === t ? 700 : 400
                }}>{t}</button>
              ))}
            </div>
          </div>

          {/* Purchase Date */}
          <div>
            <label style={labelStyle}>PURCHASE DATE</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1.2fr", gap: 8 }}>
              <select value={wData.purchaseDay} onChange={e => handlePurchaseDate("purchaseDay", e.target.value)} style={selStyle}>
                <option value="">Day</option>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={wData.purchaseMonth} onChange={e => handlePurchaseDate("purchaseMonth", e.target.value)} style={selStyle}>
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select value={wData.purchaseYear} onChange={e => handlePurchaseDate("purchaseYear", e.target.value)} style={selStyle}>
                <option value="">Year</option>
                {pastYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {purchaseFormatted && <div style={{ fontSize: 10.5, color: COLORS.secondary, marginTop: 5 }}>📅 Purchased: {purchaseFormatted}</div>}
          </div>

          {/* Warranty Period */}
          <div>
            <label style={labelStyle}>WARRANTY / GUARANTEE PERIOD</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number" inputMode="numeric" placeholder="e.g. 12"
                value={wData.period} onChange={e => handlePeriodChange("period", e.target.value)}
                style={{ ...iStyle, flex: 1 }}
              />
              <select value={wData.unit} onChange={e => handlePeriodChange("unit", e.target.value)} style={{ ...selStyle, width: 110 }}>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
            {/* Quick select buttons */}
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {[{label:"6M",p:"6",u:"months"},{label:"1Y",p:"1",u:"years"},{label:"2Y",p:"2",u:"years"},{label:"3Y",p:"3",u:"years"},{label:"5Y",p:"5",u:"years"}].map(q => (
                <button key={q.label} onClick={() => { handlePeriodChange("period", q.p); setWData(prev => {
                  const upd = { ...prev, period: q.p, unit: q.u };
                  return { ...upd, ...calcExpiry(q.p, q.u, upd.purchaseDay, upd.purchaseMonth, upd.purchaseYear) };
                }); }} style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                  border: `1px solid ${wData.period === q.p && wData.unit === q.u ? COLORS.accent : COLORS.border}`,
                  background: wData.period === q.p && wData.unit === q.u ? `${COLORS.accent}22` : "transparent",
                  color: wData.period === q.p && wData.unit === q.u ? COLORS.accent : COLORS.textMuted
                }}>{q.label}</button>
              ))}
            </div>
          </div>

          {/* Expiry Date — auto-filled OR manual */}
          <div>
            <label style={labelStyle}>LAST DATE / EXPIRY DATE</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1.2fr", gap: 8 }}>
              <select value={wData.expiryDay} onChange={e => setWData(p => ({ ...p, expiryDay: e.target.value }))} style={selStyle}>
                <option value="">Day</option>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={wData.expiryMonth} onChange={e => setWData(p => ({ ...p, expiryMonth: e.target.value }))} style={selStyle}>
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select value={wData.expiryYear} onChange={e => setWData(p => ({ ...p, expiryYear: e.target.value }))} style={selStyle}>
                <option value="">Year</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {/* Result display */}
            {expiryFormatted ? (
              <div style={{ marginTop: 8, background: "rgba(0,200,150,0.08)", border: `1px solid rgba(0,200,150,0.25)`, borderRadius: 9, padding: "9px 13px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10.5, color: COLORS.textMuted }}>EXPIRES ON</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.secondary }}>{expiryFormatted}</div>
                </div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, textAlign: "right" }}>
                  {wData.period && <div>{wData.period} {wData.unit}</div>}
                  {wData.type && <div style={{ color: COLORS.primary }}>{wData.type}</div>}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 6, fontSize: 10.5, color: COLORS.textMuted }}>
                💡 Auto-fills when you set period + purchase date, or select manually above
              </div>
            )}
          </div>

          {/* Warranty Card Upload */}
          <div>
            <label style={labelStyle}>UPLOAD WARRANTY CARD / DOCUMENT</label>
            {wData.cardPreview ? (
              <div style={{ 
                borderRadius: 12, 
                border: `1px solid ${COLORS.border}`, 
                background: "rgba(108,99,255,0.06)", 
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>
                      {wData.cardFile?.type?.startsWith("image/") ? "🖼️" : "📄"}
                    </span>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {wData.cardFile?.name}
                      </div>
                      <div style={{ fontSize: 10.5, color: COLORS.textMuted }}>
                        {wData.cardFile ? `${(wData.cardFile.size / 1024).toFixed(1)} KB` : "0 KB"} · {wData.cardFile?.type?.split("/")[1]?.toUpperCase() || "File"}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setWData(p => ({ ...p, cardFile: null, cardPreview: null }))} 
                    style={{ 
                      background: "rgba(239, 68, 68, 0.15)", 
                      border: "none", 
                      borderRadius: 8, 
                      width: 30, 
                      height: 30, 
                      color: "#ef4444", 
                      cursor: "pointer", 
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s"
                    }}
                    title="Remove document"
                  >
                    ✕
                  </button>
                </div>

                {wData.cardFile?.type?.startsWith("image/") && (
                  <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid rgba(255,255,255,0.05)` }}>
                    <img src={wData.cardPreview} alt="warranty preview" style={{ width: "100%", maxHeight: 120, objectFit: "cover", display: "block" }} />
                  </div>
                )}

                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    setViewingReceipt({ url: wData.cardPreview, name: "Selected Warranty Card" });
                  }}
                  style={{ 
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    background: "rgba(108, 99, 255, 0.15)",
                    color: COLORS.primary,
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "none",
                    width: "100%",
                    textAlign: "center",
                    transition: "all 0.2s"
                  }}
                >
                  👁️ View Selected Document
                </button>
              </div>
            ) : wData.cardUrl ? (
              <div style={{ 
                borderRadius: 12, 
                border: `1px solid ${COLORS.border}`, 
                background: "rgba(0,200,150,0.06)", 
                padding: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>📄</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text }}>Cloud Document Uploaded</div>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        setViewingReceipt({ url: wData.cardUrl, name: "Cloud Warranty Card" });
                      }}
                      style={{ fontSize: 11, color: COLORS.secondary, fontWeight: 600, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}
                    >
                      👁️ View Cloud Document
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => setWData(p => ({ ...p, cardUrl: null }))} 
                  style={{ 
                    background: "rgba(255,255,255,0.08)", 
                    border: `1px solid ${COLORS.border}`, 
                    borderRadius: 8, 
                    padding: "6px 12px", 
                    color: COLORS.text, 
                    cursor: "pointer", 
                    fontSize: 11,
                    fontWeight: 500
                  }}
                >
                  Replace
                </button>
              </div>
            ) : (
              <label style={{ display: "flex", alignItems: "center", gap: 14, border: `2px dashed rgba(108,99,255,0.28)`, borderRadius: 10, padding: "14px", cursor: "pointer", background: "rgba(108,99,255,0.04)" }}>
                <span style={{ fontSize: 26 }}>📎</span>
                <div>
                  <div style={{ fontSize: 12.5, color: COLORS.primary, fontWeight: 500 }}>Tap to upload warranty card</div>
                  <div style={{ fontSize: 10.5, color: COLORS.textMuted, marginTop: 2 }}>JPG, PNG, or PDF · Max 10MB</div>
                </div>
                <input type="file" accept="image/*,application/pdf" onChange={handleCardUpload} style={{ display: "none" }} />
              </label>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>NOTES (optional)</label>
            <textarea
              value={wData.notes}
              onChange={e => setWData(p => ({ ...p, notes: e.target.value }))}
              placeholder="Serial number, service center, claim process..."
              rows={3}
              style={{ ...iStyle, resize: "none", lineHeight: 1.6 }}
            />
          </div>

          {/* Expiry Reminder */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,183,71,0.07)", border: `1px solid rgba(255,183,71,0.2)`, borderRadius: 12, padding: "12px 14px" }}>
            <div>
              <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>⏰ Expiry Reminder</div>
              <div style={{ fontSize: 10.5, color: COLORS.textMuted, marginTop: 2 }}>Notify 30 days before expiry</div>
            </div>
            <button onClick={() => setWData(p => ({ ...p, reminder: !p.reminder }))} style={{
              width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
              background: wData.reminder ? COLORS.accent : "rgba(255,255,255,0.15)",
              position: "relative", flexShrink: 0, transition: "background 0.2s"
            }}>
              <div style={{ position: "absolute", top: 3, left: wData.reminder ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
            </button>
          </div>

          {/* Save — uploads warranty card to Firebase Storage first */}
          <button onClick={async () => {
            setUploading(true);
            let cardUrl = wData.cardUrl || null;
            if (wData.cardFile) {
              if (uid) {
                const path = `users/${uid}/warranties/${Date.now()}_${wData.cardFile.name}`;
                const firebaseUrl = await uploadFileToStorage(wData.cardFile, path);
                cardUrl = firebaseUrl || cardBase64 || null;
              } else {
                cardUrl = cardBase64 || null;
              }
            }
            onSave({
              ...wData,
              expiryDate: toISO(wData.expiryDay, wData.expiryMonth, wData.expiryYear),
              purchaseDate: toISO(wData.purchaseDay, wData.purchaseMonth, wData.purchaseYear),
              cardUrl,
              cardFile: null,   // don't store File object in Firestore
              cardPreview: null // don't store data-URL in Firestore
            });
            setUploading(false);
            onClose();
          }} disabled={uploading} style={{
            width: "100%", padding: "13px", borderRadius: 13, border: "none",
            background: uploading ? "rgba(255,255,255,0.15)" : `linear-gradient(135deg, ${COLORS.primary}, #8B5CF6)`,
            color: uploading ? COLORS.textMuted : "#fff", fontSize: 14, fontWeight: 700,
            cursor: uploading ? "not-allowed" : "pointer", marginTop: 2,
            boxShadow: uploading ? "none" : `0 4px 16px rgba(108,99,255,0.35)`
          }}>
            {uploading ? "⏳ Uploading to Cloud…" : (expiryFormatted ? `Save · Expires ${expiryFormatted}` : "Save Warranty Details")}
          </button>

        </div>
      </div>

      {/* In-app Document Viewer Modal */}
      {viewingReceipt && (
        <div 
          onClick={() => setViewingReceipt(null)}
          style={{ 
            position: "fixed", 
            inset: 0, 
            background: "rgba(10, 15, 30, 0.88)", 
            backdropFilter: "blur(12px)",
            zIndex: 200, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            padding: 16
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ 
              background: "#0d1526", 
              border: `1px solid rgba(108,99,255,0.25)`, 
              borderRadius: 16, 
              padding: 20, 
              width: "100%", 
              maxWidth: 640, 
              maxHeight: "90vh", 
              display: "flex", 
              flexDirection: "column",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)"
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLORS.text }}>📄 View Document</h4>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: COLORS.textMuted }}>{viewingReceipt.name}</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a 
                  href={viewingReceipt.url} 
                  download={`warranty_${Date.now()}.png`}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid rgba(255,255,255,0.1)`,
                    borderRadius: 8,
                    padding: "6px 12px",
                    color: COLORS.text,
                    fontSize: 12,
                    fontWeight: 500,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer"
                  }}
                >
                  📥 Download
                </a>
                <button 
                  onClick={() => setViewingReceipt(null)}
                  style={{ 
                    background: "rgba(255,255,255,0.06)", 
                    border: `1px solid rgba(255,255,255,0.1)`, 
                    borderRadius: 8, 
                    width: 32, 
                    height: 32, 
                    color: COLORS.text, 
                    cursor: "pointer", 
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div style={{ 
              flex: 1, 
              overflowY: "auto", 
              background: "#070c16", 
              borderRadius: 12, 
              border: "1px solid rgba(255,255,255,0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 320,
              padding: 10
            }}>
              {viewingReceipt.url.includes("data:application/pdf") || viewingReceipt.url.includes(".pdf") ? (
                <iframe 
                  src={viewingReceipt.url} 
                  title="Document PDF" 
                  style={{ width: "100%", height: "60vh", border: "none", borderRadius: 8 }}
                />
              ) : (
                <img 
                  src={viewingReceipt.url} 
                  alt="Warranty Card" 
                  style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: 8 }} 
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Expense Modal ─────────────────────────────────────────────────────────
function AddExpenseModal({ pastExpenses, onClose, onSave, initialData, creditCards, banks , vendorMaster, setVendorMaster, categoryMaster, setCategoryMaster , companyMaster, setCompanyMaster, platformMaster, setPlatformMaster, uid, workspaces = [], activeWorkspaceId = "" }) {
  const [step, setStep] = useState(1); // 1=details, 2=warranty
  const [showWarranty, setShowWarranty] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptBase64, setReceiptBase64] = useState(null); // local fallback
  const [uploading, setUploading] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState(null); // in-app document viewer
  const [quickSelectText, setQuickSelectText] = useState("");
  const [isCategoryLocked, setIsCategoryLocked] = useState(false);

  useEffect(() => {
    return () => {
      if (receiptPreview && receiptPreview.startsWith("blob:")) {
        URL.revokeObjectURL(receiptPreview);
      }
    };
  }, [receiptPreview]);

  const pastCombos = useMemo(() => {
    const combos = new Map();

    const addCombo = (prod, cat, brand, plat, store) => {
        if (!prod) return;
        const key = `${prod}|${cat}|${brand}|${plat}|${store}`.toLowerCase();
        if (!combos.has(key)) {
            const labelParts = [prod, brand, cat, store, plat].filter(Boolean);
            combos.set(key, {
                label: labelParts.join("  �  "),
                data: { productName: prod, category: cat || "Shopping", companyName: brand, platformName: plat, storeName: store }
            });
        }
    };

    // 1. Synthesize fully connected chains from Master Data
    (companyMaster || []).forEach(comp => {
       (comp.products || []).forEach(prod => {
          // Find platforms that carry this brand
          const platforms = (platformMaster || []).filter(p => (p.brands || []).some(b => b.toLowerCase() === comp.name.toLowerCase()));
          
          if (platforms.length > 0) {
              platforms.forEach(plat => {
                  // Find stores on this platform
                  const stores = (vendorMaster || []).filter(v => v.platform?.toLowerCase() === plat.name.toLowerCase());
                  if (stores.length > 0) {
                      stores.forEach(store => addCombo(prod, comp.category, comp.name, plat.name, store.name));
                  } else {
                      addCombo(prod, comp.category, comp.name, plat.name, "");
                  }
              });
          } else {
              // No platform for this brand, just add the product & brand combo
              addCombo(prod, comp.category, comp.name, "", "");
          }
       });
    });

    // 2. Pull from Category Master (for products without a brand yet)
    (categoryMaster || []).forEach(cat => {
       (cat.products || []).forEach(prod => {
          addCombo(prod, cat.name, "", "", "");
       });
    });

    // 3. Pull from Past Expenses (Ensures actual manual combinations are captured too)
    (pastExpenses || []).forEach(e => {
      addCombo(e.productName, e.cat || e.category || "", e.companyName || "", e.platformName || "", e.storeName || e.vendor || "");
    });

    return Array.from(combos.values());
  }, [pastExpenses, companyMaster, categoryMaster, platformMaster, vendorMaster]);

  const handleQuickSelect = (e) => {
    const val = e.target.value;
    setQuickSelectText(val);
    const match = pastCombos.find(c => c.label === val);
    if (match) {
      setForm(p => ({
        ...p,
        productName: match.data.productName,
        category: match.data.category,
        companyName: match.data.companyName,
        platformName: match.data.platformName,
        storeName: match.data.storeName || p.storeName
      }));
      setIsCategoryLocked(true);
      setQuickSelectText(""); // clear after selection so it doesnt clutter
    }
  };

  const [form, setForm] = useState(() => {
    if (initialData) {
      return {
        ...initialData,
        storeName: initialData.storeName || initialData.vendor || initialData.title || "",
        category: initialData.category || initialData.cat || "Shopping",
        productName: initialData.productName || "",
        companyName: initialData.companyName || "",
        platformName: initialData.platformName || "",
        description: initialData.description || initialData.notes || "",
        paymentMode: initialData.paymentMode || "Net Banking",
        bankId: initialData.bankId || "",
        receiptUrl: initialData.receiptUrl || (typeof initialData.receipt === 'string' ? initialData.receipt : ""),
        paidByOther: !!initialData.paidByWorkspaceId,
        paidByWorkspaceId: initialData.paidByWorkspaceId || "",
        paidForWorkspaceId: initialData.paidForWorkspaceId || "",
        paidForWorkspaceName: initialData.paidForWorkspaceName || ""
      };
    }
    return {
      storeName: "", date: new Date().toISOString().split("T")[0], category: "Shopping",
      amount: "", productName: "", companyName: "", platformName: "", description: "", paymentMode: "UPI", hasWarranty: false, warrantyData: null,
      bankId: "",
      paidByOther: false, paidByWorkspaceId: "", paidForWorkspaceId: "", paidForWorkspaceName: ""
    };
  });

  const iStyle = { background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box", WebkitAppearance: "none", appearance: "none", caretColor: "#6C63FF" };
  
  const filteredVendors = form.platformName
    ? (vendorMaster || []).filter(v => v.platform?.toLowerCase() === form.platformName.toLowerCase() || !v.platform)
    : (vendorMaster || []);
    
  let filteredCompanies = companyMaster || [];
  if (form.category) {
    filteredCompanies = filteredCompanies.filter(c => c.category?.toLowerCase() === form.category.toLowerCase() || !c.category);
  }
  if (form.platformName) {
    const plat = (platformMaster || []).find(p => p.name.toLowerCase() === form.platformName.toLowerCase());
    if (plat && plat.brands && plat.brands.length > 0) {
      filteredCompanies = filteredCompanies.filter(c => plat.brands.some(b => b.toLowerCase() === c.name.toLowerCase()));
    }
  }

  let availableProducts = [];
  if (form.companyName) {
    const comp = (companyMaster || []).find(c => c.name.toLowerCase() === form.companyName.toLowerCase());
    if (comp && comp.products) availableProducts = [...comp.products];
  }
  if (availableProducts.length === 0 && form.category) {
    const cat = (categoryMaster || []).find(c => c.name.toLowerCase() === form.category.toLowerCase());
    if (cat && cat.products) availableProducts = [...availableProducts, ...cat.products];
  }
  availableProducts = Array.from(new Set(availableProducts));

  const cats = Array.from(new Set([
    "Food", "Grocery", "Fuel", "Medical", "Shopping", "Travel", "Entertainment", "Education", "Utilities", "Electronics", "Other",
    ...(categoryMaster || []).map(c => c.name),
    form.category
  ])).filter(Boolean);
  const payModes = ["UPI", "Cash", "Credit Card", "Debit Card", "Net Banking", "EMI"];

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    setReceiptPreview(blobUrl);
    setReceiptFile(file);
    // Also read as base64 for reliable local storage fallback
    const reader = new FileReader();
    reader.onload = (ev) => setReceiptBase64(ev.target.result);
    reader.readAsDataURL(file);
  };

  
  const handleSave = async () => {
    if (!form.storeName || !form.amount) return;

    if (setVendorMaster && form.storeName) {
      const vendorExists = vendorMaster.some(v => v.name.toLowerCase() === form.storeName.toLowerCase());
      if (!vendorExists) {
        setVendorMaster(prev => [...prev, { name: form.storeName, category: form.category || "Other", platform: form.platformName || "" }]);
      } else if (form.category || form.platformName) {
        setVendorMaster(prev => prev.map(v => v.name.toLowerCase() === form.storeName.toLowerCase() ? { ...v, category: form.category || v.category, platform: form.platformName || v.platform } : v));
      }
    }

    if (setCategoryMaster && form.category) {
      const catExists = categoryMaster.find(c => c.name.toLowerCase() === form.category.toLowerCase());
      if (!catExists) {
        setCategoryMaster(prev => [...prev, { name: form.category, products: form.productName ? [form.productName] : [] }]);
      } else if (form.productName && (!catExists.products || !catExists.products.some(p => p.toLowerCase() === form.productName.toLowerCase()))) {
        setCategoryMaster(prev => prev.map(c => c.name.toLowerCase() === form.category.toLowerCase() ? { ...c, products: [...(c.products || []), form.productName] } : c));
      }
    }

    if (setCompanyMaster && form.companyName) {
      const compExists = companyMaster.find(c => c.name.toLowerCase() === form.companyName.toLowerCase());
      if (!compExists) {
        setCompanyMaster(prev => [...prev, { name: form.companyName, category: form.category || "", products: form.productName ? [form.productName] : [] }]);
      } else if (form.productName && (!compExists.products || !compExists.products.some(p => p.toLowerCase() === form.productName.toLowerCase()))) {
        setCompanyMaster(prev => prev.map(c => c.name.toLowerCase() === form.companyName.toLowerCase() ? { ...c, products: [...(c.products || []), form.productName] } : c));
      }
    }

    if (setPlatformMaster && form.platformName) {
      const platExists = platformMaster.find(p => p.name.toLowerCase() === form.platformName.toLowerCase());
      if (!platExists) {
        setPlatformMaster(prev => [...prev, { name: form.platformName, brands: form.companyName ? [form.companyName] : [] }]);
      } else if (form.companyName && (!platExists.brands || !platExists.brands.some(b => b.toLowerCase() === form.companyName.toLowerCase()))) {
        setPlatformMaster(prev => prev.map(p => p.name.toLowerCase() === form.platformName.toLowerCase() ? { ...p, brands: [...(p.brands || []), form.companyName] } : p));
      }
    }

    const finalCardId = form.paymentMode === 'Credit Card' && !form.creditCardId && creditCards && creditCards.length > 0 ? creditCards[0].id : form.creditCardId;

    // Upload receipt to Firebase Storage; fall back to base64 if upload fails or no uid
    setUploading(true);
    let receiptUrl = form.receiptUrl || null;
    if (receiptFile) {
      if (uid) {
        // Try Firebase Storage first
        const path = `users/${uid}/receipts/${Date.now()}_${receiptFile.name}`;
        const firebaseUrl = await uploadFileToStorage(receiptFile, path);
        receiptUrl = firebaseUrl || receiptBase64 || null; // fallback to base64 if upload fails
      } else {
        // No Firebase auth — store as base64 data URL in localStorage
        receiptUrl = receiptBase64 || null;
      }
    }

    onSave({
      ...form,
      amount: parseFloat(form.amount) || 0,
      creditCardId: finalCardId,
      receiptUrl,   // Firebase URL or base64 data URL
      receipt: null // don't store File object
    });
    setUploading(false);
    onClose();
  };
  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div style={{ background: "#0d1526", border: `1px solid rgba(108,99,255,0.25)`, borderRadius: "20px 20px 0 0", padding: "20px 18px 28px", width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{initialData ? "✏️ Edit Expense" : "➕ Add Expense"}</div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 8, width: 30, height: 30, color: COLORS.textMuted, cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Quick Select */}
            <div style={{ background: "rgba(108,99,255,0.08)", border: `1px solid ${COLORS.primary}44`, borderRadius: 12, padding: "12px 14px", marginBottom: 4 }}>
              <label style={{ fontSize: 11, color: COLORS.primary, display: "block", marginBottom: 5, fontWeight: 700 }}>⚡ QUICK AUTO-FILL (PAST EXPENSES & MASTER DATA)</label>
              <input 
                list="quick-select-list" 
                placeholder="Search past products (e.g. Milk, TV...)" 
                value={quickSelectText} 
                onChange={handleQuickSelect} 
                style={{ ...iStyle, borderColor: `${COLORS.primary}88`, background: "rgba(0,0,0,0.2)" }} 
              />
              <datalist id="quick-select-list">
                {pastCombos.map((c, i) => <option key={i} value={c.label} />)}
              </datalist>
              <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 6 }}>Selecting an item will instantly fill the Product, Brand, Category, Platform, and Store fields below.</div>
            </div>

            {/* Receipt Upload */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>UPLOAD BILL / RECEIPT (optional)</label>
              {receiptPreview ? (
                <div style={{ 
                  borderRadius: 12, 
                  border: `1px solid ${COLORS.border}`, 
                  background: "rgba(108,99,255,0.06)", 
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 24 }}>
                        {receiptFile?.type?.startsWith("image/") ? "🖼️" : "📄"}
                      </span>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {receiptFile?.name}
                        </div>
                        <div style={{ fontSize: 10.5, color: COLORS.textMuted }}>
                          {receiptFile ? `${(receiptFile.size / 1024).toFixed(1)} KB` : "0 KB"} · {receiptFile?.type?.split("/")[1]?.toUpperCase() || "File"}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setReceiptPreview(null); setReceiptFile(null); setReceiptBase64(null); }} 
                      style={{ 
                        background: "rgba(239, 68, 68, 0.15)", 
                        border: "none", 
                        borderRadius: 8, 
                        width: 30, 
                        height: 30, 
                        color: "#ef4444", 
                        cursor: "pointer", 
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s"
                      }}
                      title="Remove receipt"
                    >
                      ✕
                    </button>
                  </div>

                  {receiptFile?.type?.startsWith("image/") && (
                    <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid rgba(255,255,255,0.05)` }}>
                      <img src={receiptPreview} alt="receipt preview" style={{ width: "100%", maxHeight: 120, objectFit: "cover", display: "block" }} />
                    </div>
                  )}

                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      setViewingReceipt({ url: receiptPreview, name: receiptFile?.name || "Selected Receipt" });
                    }}
                    style={{ 
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      background: "rgba(108, 99, 255, 0.15)",
                      color: COLORS.primary,
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "none",
                      width: "100%",
                      textAlign: "center",
                      transition: "all 0.2s"
                    }}
                  >
                    👁️ View Selected Document
                  </button>
                </div>
              ) : form.receiptUrl ? (
                <div style={{ 
                  borderRadius: 12, 
                  border: `1px solid ${COLORS.border}`, 
                  background: "rgba(0,200,150,0.06)", 
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>📄</span>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text }}>Cloud Receipt Uploaded</div>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        setViewingReceipt({ url: form.receiptUrl, name: "Saved Receipt Document" });
                      }}
                      style={{ fontSize: 11, color: COLORS.secondary, fontWeight: 600, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}
                    >
                      👁️ View Cloud Document
                    </button>
                  </div>
                  </div>
                  <button 
                    onClick={() => setForm(p => ({...p, receiptUrl: null}))} 
                    style={{ 
                      background: "rgba(255,255,255,0.08)", 
                      border: `1px solid ${COLORS.border}`, 
                      borderRadius: 8, 
                      padding: "6px 12px", 
                      color: COLORS.text, 
                      cursor: "pointer", 
                      fontSize: 11,
                      fontWeight: 500
                    }}
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <label style={{ display: "flex", alignItems: "center", gap: 12, border: `2px dashed rgba(108,99,255,0.25)`, borderRadius: 10, padding: "13px 14px", cursor: "pointer", background: "rgba(108,99,255,0.04)", transition: "background 0.2s" }}>
                  <span style={{ fontSize: 22 }}>📄</span>
                  <div>
                    <div style={{ fontSize: 12, color: COLORS.primary, fontWeight: 500 }}>Upload bill, receipt or invoice</div>
                    <div style={{ fontSize: 10.5, color: COLORS.textMuted }}>JPG, PNG, PDF • Max 10MB</div>
                  </div>
                  <input type="file" accept="image/*,application/pdf" onChange={handleReceiptUpload} style={{ display: "none" }} />
                </label>
              )}
            </div>

            {/* Product Name */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>PRODUCT / ITEM NAME</label>
              <input placeholder="e.g. Samsung TV, Grocery items, Petrol..." list="products-list-add" value={form.productName} onChange={e => { setForm(p => ({ ...p, productName: e.target.value })); setIsCategoryLocked(false); }} style={iStyle} />
              <datalist id="products-list-add">
                {availableProducts.map((p, i) => <option key={i} value={p} />)}
              </datalist>
            </div>

            {/* Company / Brand */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>COMPANY / BRAND</label>
              <input placeholder="e.g. Nike, Apple, Sony..." list="company-list-add" value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))} style={iStyle} />
              <datalist id="company-list-add">
                {filteredCompanies.map((c, i) => <option key={i} value={c.name} />)}
              </datalist>
            </div>

            {/* Store / Buyer Name */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>STORE / SELLER NAME *</label>
              <input placeholder="e.g. Amazon, Big Bazaar, Pharmacy..." list="vendors-list-add" value={form.storeName} onChange={e => setForm(p => ({ ...p, storeName: e.target.value }))} style={iStyle} />
              <datalist id="vendors-list-add">
                {filteredVendors.map((v, i) => <option key={i} value={v.name} />)}
              </datalist>
            </div>

            {/* Platform / Mall */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>PLATFORM / MALL / LOCATION</label>
              <input placeholder="e.g. Phoenix Mall, Amazon.in..." list="platform-list-add" value={form.platformName} onChange={e => setForm(p => ({ ...p, platformName: e.target.value }))} style={iStyle} />
              <datalist id="platform-list-add">
                {platformMaster?.map((p, i) => <option key={i} value={p.name} />)}
              </datalist>
            </div>

            {/* Date + Amount side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>DATE *</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={iStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>AMOUNT (₹) *</label>
                <input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} style={iStyle} />
              </div>
            </div>

            {/* Category */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span>CATEGORY</span> {isCategoryLocked && <span style={{ color: COLORS.accent, fontSize: 10 }}>LOCKED BY QUICK-SELECT</span>}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {cats.map(c => (
                  <button key={c} disabled={isCategoryLocked} onClick={() => setForm(p => ({ ...p, category: c }))} style={{
                    padding: "5px 11px", borderRadius: 20, fontSize: 11, cursor: isCategoryLocked ? "not-allowed" : "pointer",
                    opacity: isCategoryLocked && form.category !== c ? 0.3 : 1,
                    border: `1px solid ${form.category === c ? COLORS.primary : COLORS.border}`,
                    background: form.category === c ? `${COLORS.primary}22` : "transparent",
                    color: form.category === c ? COLORS.primary : COLORS.textMuted, transition: "all 0.15s"
                  }}>{c}</button>
                ))}
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>PAYMENT MODE</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {payModes.map(m => (
                  <button key={m} onClick={() => setForm(p => ({ ...p, paymentMode: m }))} style={{
                    padding: "5px 11px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                    border: `1px solid ${form.paymentMode === m ? COLORS.secondary : COLORS.border}`,
                    background: form.paymentMode === m ? `${COLORS.secondary}20` : "transparent",
                    color: form.paymentMode === m ? COLORS.secondary : COLORS.textMuted, transition: "all 0.15s"
                  }}>{m}</button>
                ))}
              </div>
            </div>

            {/* Inter-Workspace toggle */}
            {/* Inter-Workspace toggle */}
            {form.paidForWorkspaceId ? (
              <div style={{ background: "rgba(16,185,129,0.08)", border: `1px solid rgba(16,185,129,0.3)`, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                 <div style={{ fontSize: 24 }}>🔀</div>
                 <div>
                    <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>Cost incurred by {form.paidForWorkspaceName || "another workspace"}</div>
                    <div style={{ fontSize: 10.5, color: COLORS.textMuted, marginTop: 2 }}>Paid by this workspace</div>
                 </div>
              </div>
            ) : (
              <div style={{ background: form.paidByOther ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${form.paidByOther ? "rgba(245,158,11,0.3)" : COLORS.border}`, borderRadius: 12, padding: "12px 14px", transition: "all 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>🔀 Paid by someone else?</div>
                    <div style={{ fontSize: 10.5, color: COLORS.textMuted, marginTop: 2 }}>Assign this expense to another workspace</div>
                  </div>
                  <button onClick={() => setForm(p => ({ ...p, paidByOther: !p.paidByOther, bankId: !p.paidByOther ? "" : p.bankId }))} style={{
                    width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative", flexShrink: 0,
                    background: form.paidByOther ? "#F59E0B" : "rgba(255,255,255,0.15)", transition: "background 0.2s"
                  }}>
                    <div style={{ position: "absolute", top: 3, left: form.paidByOther ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                  </button>
                </div>
                
                {form.paidByOther && workspaces && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed rgba(255,255,255,0.1)` }}>
                    <label style={{ fontSize: 11, color: COLORS.textMuted, display: 'block', marginBottom: 5 }}>SELECT PAYER WORKSPACE *</label>
                    <select 
                      value={form.paidByWorkspaceId} 
                      onChange={e => setForm(p => ({ ...p, paidByWorkspaceId: e.target.value }))} 
                      style={iStyle}
                    >
                       <option value="">-- Select Workspace --</option>
                       {workspaces.filter(w => w.id !== activeWorkspaceId).map(w => (
                         <option key={w.id} value={w.id}>{w.name}</option>
                       ))}
                    </select>
                  </div>
                )}
              </div>
            )}
                        
            {!form.paidByOther && form.paymentMode !== 'Cash' && form.paymentMode !== 'EMI' && (
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: 'block', marginBottom: 5 }}>SELECT PAYMENT ACCOUNT</label>
                <select 
                  value={form.bankId || form.creditCardId || ""} 
                  onChange={e => {
                    const val = e.target.value;
                    const isCC = creditCards.some(c => c.id === val);
                    setForm(p => ({ ...p, bankId: isCC ? "" : val, creditCardId: isCC ? val : "" }));
                  }} 
                  style={iStyle}
                >
                   <option value="">No Account selected</option>
                   <optgroup label="Bank Accounts">
                     {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                   </optgroup>
                   <optgroup label="Credit Cards">
                     {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </optgroup>
                </select>
              </div>
            )}
            {/* Description */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>NOTES / DESCRIPTION</label>
              <textarea placeholder="Additional details about this expense..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} style={{ ...iStyle, resize: "none" }} />
            </div>

            {/* Warranty Toggle */}
            <div style={{ background: form.hasWarranty ? "rgba(108,99,255,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${form.hasWarranty ? "rgba(108,99,255,0.3)" : COLORS.border}`, borderRadius: 12, padding: "12px 14px", transition: "all 0.2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>🛡️ Has Warranty / Guarantee?</div>
                  <div style={{ fontSize: 10.5, color: COLORS.textMuted, marginTop: 2 }}>Enable to save warranty card & period</div>
                </div>
                <button onClick={() => setForm(p => ({ ...p, hasWarranty: !p.hasWarranty }))} style={{
                  width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative", flexShrink: 0,
                  background: form.hasWarranty ? COLORS.primary : "rgba(255,255,255,0.15)", transition: "background 0.2s"
                }}>
                  <div style={{ position: "absolute", top: 3, left: form.hasWarranty ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                </button>
              </div>

              {form.hasWarranty && (
                <button onClick={() => setShowWarranty(true)} style={{
                  marginTop: 10, width: "100%", padding: "9px", borderRadius: 9, border: `1px dashed rgba(108,99,255,0.4)`,
                  background: "transparent", color: COLORS.primary, fontSize: 12, fontWeight: 600, cursor: "pointer"
                }}>
                  {form.warrantyData ? "✓ Warranty saved — Edit details" : "➕ Add warranty card & details"}
                </button>
              )}
              {form.hasWarranty && (form.warrantyData?.cardUrl || form.warrantyData?.card) && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setViewingReceipt({ url: form.warrantyData.cardUrl || form.warrantyData.card, name: "Warranty Card" });
                  }}
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    background: "rgba(139, 92, 246, 0.15)",
                    color: "#8B5CF6",
                    border: "1px solid rgba(139, 92, 246, 0.25)",
                    borderRadius: 9,
                    padding: "8px 12px",
                    width: "100%",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  👁️ View Saved Warranty Card
                </button>
              )}
              {form.warrantyData && (
                <div style={{ marginTop: 8, display: "flex", gap: 10, fontSize: 11, color: COLORS.textMuted }}>
                  <span>📅 Expires: {form.warrantyData.expiryDate || "—"}</span>
                  <span>· {form.warrantyData.period} {form.warrantyData.unit}</span>
                  <span>· {form.warrantyData.type}</span>
                </div>
              )}
            </div>

            {/* Save Button */}
            <button onClick={handleSave} disabled={!form.storeName || !form.amount} style={{
              width: "100%", padding: "13px", borderRadius: 12, border: "none",
              background: (!form.storeName || !form.amount) ? "rgba(255,255,255,0.08)" : `linear-gradient(135deg, ${COLORS.primary}, #8B5CF6)`,
              color: (!form.storeName || !form.amount) ? COLORS.textMuted : "#fff",
              fontSize: 14, fontWeight: 700, cursor: (!form.storeName || !form.amount) ? "not-allowed" : "pointer",
              transition: "all 0.2s", marginTop: 4
            }}>Save Expense</button>
          </div>
        </div>
      </div>

      {/* Warranty Modal stacked on top */}
      {showWarranty && (
        <WarrantyModal
          productName={form.productName || form.storeName || "Product"}
          uid={uid}
          initialData={form.warrantyData}
          onClose={() => setShowWarranty(false)}
          onSave={(wData) => setForm(p => ({ ...p, warrantyData: wData }))}
        />
      )}
      {/* In-app Document Viewer Modal */}
      {viewingReceipt && (
        <div 
          onClick={() => setViewingReceipt(null)}
          style={{ 
            position: "fixed", 
            inset: 0, 
            background: "rgba(10, 15, 30, 0.88)", 
            backdropFilter: "blur(12px)",
            zIndex: 180, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            padding: 16
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ 
              background: "#0d1526", 
              border: `1px solid rgba(108,99,255,0.25)`, 
              borderRadius: 16, 
              padding: 20, 
              width: "100%", 
              maxWidth: 640, 
              maxHeight: "90vh", 
              display: "flex", 
              flexDirection: "column",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)"
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLORS.text }}>📄 View Document</h4>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: COLORS.textMuted }}>{viewingReceipt.name}</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a 
                  href={viewingReceipt.url} 
                  download={`receipt_${Date.now()}.png`}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid rgba(255,255,255,0.1)`,
                    borderRadius: 8,
                    padding: "6px 12px",
                    color: COLORS.text,
                    fontSize: 12,
                    fontWeight: 500,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer"
                  }}
                >
                  📥 Download
                </a>
                <button 
                  onClick={() => setViewingReceipt(null)}
                  style={{ 
                    background: "rgba(255,255,255,0.06)", 
                    border: `1px solid rgba(255,255,255,0.1)`, 
                    borderRadius: 8, 
                    width: 32, 
                    height: 32, 
                    color: COLORS.text, 
                    cursor: "pointer", 
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div style={{ 
              flex: 1, 
              overflowY: "auto", 
              background: "#070c16", 
              borderRadius: 12, 
              border: "1px solid rgba(255,255,255,0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 320,
              padding: 10
            }}>
              {viewingReceipt.url.includes("data:application/pdf") || viewingReceipt.url.includes(".pdf") ? (
                <iframe 
                  src={viewingReceipt.url} 
                  title="Document PDF" 
                  style={{ width: "100%", height: "60vh", border: "none", borderRadius: 8 }}
                />
              ) : (
                <img 
                  src={viewingReceipt.url} 
                  alt="Receipt Document" 
                  style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: 8 }} 
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Expense View ─────────────────────────────────────────────────────────────
function ExpenseView() {
  const [catFilter, setCatFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [transactions, setTransactions] = useState([
    { id:1,  storeName:"Swiggy",           productName:"Butter Chicken + Naan",  cat:"Food",          amount:480,  date:"Jun 12", icon:"🍽️", color:COLORS.danger,    paymentMode:"UPI",         hasWarranty:false },
    { id:2,  storeName:"BPCL Fuel Station", productName:"Petrol 25L",             cat:"Fuel",          amount:2500, date:"Jun 12", icon:"⛽", color:COLORS.accent,    paymentMode:"UPI",         hasWarranty:false },
    { id:3,  storeName:"Reliance Fresh",    productName:"Monthly Groceries",      cat:"Grocery",       amount:4200, date:"Jun 11", icon:"🛒", color:COLORS.secondary, paymentMode:"Credit Card", creditCardId:"cc1", hasWarranty:false },
    { id:4,  storeName:"PVR Cinemas",       productName:"Kalki 2898-AD (2 seats)",cat:"Entertainment", amount:840,  date:"Jun 10", icon:"🎬", color:"#8B5CF6",        paymentMode:"UPI",         hasWarranty:false },
    { id:5,  storeName:"Apollo Pharmacy",   productName:"BP Medicines + Vitamins",cat:"Medical",       amount:1240, date:"Jun 10", icon:"💊", color:COLORS.primary,   paymentMode:"Cash",        hasWarranty:false },
    { id:6,  storeName:"Amazon India",      productName:"Samsung Galaxy Buds2",   cat:"Shopping",      amount:5999, date:"Jun 9",  icon:"📦", color:COLORS.accent,    paymentMode:"Credit Card", creditCardId:"cc2", hasWarranty:true,
      warrantyData:{ type:"Warranty", period:"12", unit:"months", expiryDate:"2026-06-09", expiryDay:"9", expiryMonth:"6", expiryYear:"2026", purchaseDate:"2025-06-09" }},
    { id:7,  storeName:"Zomato",            productName:"Pizza + Garlic Bread",   cat:"Food",          amount:620,  date:"Jun 9",  icon:"🍽️", color:COLORS.danger,    paymentMode:"UPI",         hasWarranty:false },
    { id:8,  storeName:"MSEDCL",            productName:"Electricity Bill",       cat:"Utilities",     amount:1820, date:"Jun 8",  icon:"💡", color:"#F59E0B",        paymentMode:"Net Banking", hasWarranty:false },
    { id:9,  storeName:"Mahatma Jyoti Academy","productName":"Daughter's Tuition",cat:"Education",    amount:3500, date:"Jun 8",  icon:"📚", color:COLORS.primary,   paymentMode:"NEFT",        hasWarranty:false },
    { id:10, storeName:"IndiGo Airlines",   productName:"Mumbai → Bengaluru",     cat:"Travel",        amount:5600, date:"Jun 7",  icon:"✈️", color:"#06B6D4",        paymentMode:"Debit Card",  hasWarranty:false },
    { id:11, storeName:"D-Mart",            productName:"Household Items",        cat:"Grocery",       amount:2100, date:"Jun 6",  icon:"🛒", color:COLORS.secondary, paymentMode:"Cash",        hasWarranty:false },
    { id:12, storeName:"Croma",             productName:"Philips Air Fryer",      cat:"Shopping",      amount:8500, date:"Jun 5",  icon:"🛍️", color:COLORS.accent,   paymentMode:"EMI",         hasWarranty:true,
      warrantyData:{ type:"Guarantee", period:"24", unit:"months", expiryDate:"2027-06-05", expiryDay:"5", expiryMonth:"6", expiryYear:"2027", purchaseDate:"2025-06-05" }},
    { id:13, storeName:"Myntra",            productName:"3x T-shirts + Jeans",    cat:"Shopping",      amount:2499, date:"Jun 4",  icon:"👕", color:COLORS.accent,    paymentMode:"Credit Card", creditCardId:"cc1", hasWarranty:false },
    { id:14, storeName:"IOCL Petrol Pump",  productName:"Diesel 40L",             cat:"Fuel",          amount:3680, date:"Jun 4",  icon:"⛽", color:COLORS.accent,    paymentMode:"UPI",         hasWarranty:false },
    { id:15, storeName:"Cafe Coffee Day",   productName:"Coffee + Sandwiches",    cat:"Food",          amount:380,  date:"Jun 3",  icon:"☕", color:COLORS.danger,    paymentMode:"UPI",         hasWarranty:false },
    { id:16, storeName:"Jio Fiber",         productName:"1 Gbps Plan Jun 2025",   cat:"Utilities",     amount:1199, date:"Jun 3",  icon:"📡", color:"#F59E0B",        paymentMode:"Auto-debit",  hasWarranty:false },
    { id:17, storeName:"BigBasket",         productName:"Fruits & Vegetables",    cat:"Grocery",       amount:890,  date:"Jun 2",  icon:"🥦", color:COLORS.secondary, paymentMode:"UPI",         hasWarranty:false },
    { id:18, storeName:"Decathlon",         productName:"Running Shoes Nike",     cat:"Shopping",      amount:3999, date:"Jun 2",  icon:"👟", color:COLORS.accent,    paymentMode:"Debit Card",  hasWarranty:true,
      warrantyData:{ type:"Warranty", period:"6", unit:"months", expiryDate:"2025-12-02", expiryDay:"2", expiryMonth:"12", expiryYear:"2025", purchaseDate:"2025-06-02" }},
    { id:19, storeName:"Mahanagar Gas",     productName:"PNG Bill May 2025",      cat:"Utilities",     amount:740,  date:"Jun 1",  icon:"🔥", color:"#F59E0B",        paymentMode:"Net Banking", hasWarranty:false },
    { id:20, storeName:"Manipal Hospital",  productName:"Annual Health Checkup",  cat:"Medical",       amount:2800, date:"Jun 1",  icon:"🏥", color:COLORS.primary,   paymentMode:"Credit Card", creditCardId:"cc1", hasWarranty:false },
    { id:21, storeName:"BookMyShow",        productName:"Ed Sheeran Live Ticket", cat:"Entertainment", amount:3200, date:"May 31", icon:"🎵", color:"#8B5CF6",        paymentMode:"Credit Card", creditCardId:"cc1", hasWarranty:false },
    { id:22, storeName:"Makemytrip",        productName:"Goa Hotel 3N/4D",        cat:"Travel",        amount:12500,date:"May 30", icon:"🏨", color:"#06B6D4",        paymentMode:"EMI",         hasWarranty:false },
    { id:23, storeName:"HDFC Life",         productName:"Term Insurance Premium", cat:"Utilities",     amount:6800, date:"May 28", icon:"🛡️", color:"#F59E0B",       paymentMode:"Net Banking", hasWarranty:false },
    { id:24, storeName:"Swiggy Instamart",  productName:"Snacks + Beverages",     cat:"Grocery",       amount:560,  date:"May 27", icon:"🛒", color:COLORS.secondary, paymentMode:"UPI",         hasWarranty:false },
    { id:25, storeName:"Unacademy",         productName:"UPSC Prep 6M Plan",      cat:"Education",     amount:4999, date:"May 26", icon:"📖", color:COLORS.primary,   paymentMode:"Credit Card", creditCardId:"cc1", hasWarranty:false },
  ]);

    const handlePayInsConfirm = () => {
    if (!payingIns) return;
    const { ins, date, amount } = payingIns;
    const amt = parseFloat(amount);
    if (amt < 0) { alert("Values cannot be negative."); return; }
    const exp = {
      id: "e" + Date.now(),
      date: date,
      cat: ins.type || "Insurance",
      icon: ins.icon || "🛡️",
      color: ins.color || COLORS.primary,
      amount: amt,
      vendor: ins.provider || ins.name,
      notes: "Premium Payment: " + ins.name + " (" + ins.dueDate + ")",
      bankId: ins.bankId || "", paymentMode: ins.bankId ? "Net Banking" : "UPI"
    };
    setExpenses(prev => [exp, ...prev]);
    setInsurance(prev => prev.map(s => {
      if (s.id !== ins.insId) return s;
      return { ...s, payments: [...(s.payments || []), { date: ins.dueDate, amount: amt, expenseId: exp.id }] };
    }));
    setPayingIns(null);
  };

  const cats = ["All","Food","Fuel","Grocery","Entertainment","Medical","Shopping","Utilities","Education","Travel"];
  const catIcons  = { Food:"🍽️",Fuel:"⛽",Grocery:"🛒",Entertainment:"🎬",Medical:"💊",Shopping:"📦",Utilities:"💡",Education:"📚",Travel:"✈️",Electronics:"🖥️" };
  const catColors = { Food:COLORS.danger,Fuel:COLORS.accent,Grocery:COLORS.secondary,Entertainment:"#8B5CF6",Medical:COLORS.primary,Shopping:COLORS.accent,Utilities:"#F59E0B",Education:COLORS.primary,Travel:"#06B6D4" };

  const filtered    = catFilter === "All" ? transactions : transactions.filter(t => t.cat === catFilter);
  const totalFiltered = filtered.reduce((a,t) => a+t.amount, 0);
  const grandTotal  = transactions.reduce((a,t) => a+t.amount, 0);
  const catTotals   = cats.slice(1).map(c => ({ cat:c, total:transactions.filter(t=>t.cat===c).reduce((a,t)=>a+t.amount,0) })).sort((a,b)=>b.total-a.total);

  const handleAddExpense = (newExp) => {
    const icon  = catIcons[newExp.category]  || "💰";
    const color = catColors[newExp.category] || COLORS.textMuted;
    setTransactions(prev => [{
      id:Date.now(), storeName:newExp.storeName, productName:newExp.productName,
      cat:newExp.category, amount:parseFloat(newExp.amount), date:newExp.date,
      icon, color, paymentMode:newExp.paymentMode, hasWarranty:newExp.hasWarranty,
      warrantyData:newExp.warrantyData, receipt:newExp.receipt
    }, ...prev]);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700, color:COLORS.text }}>Expense Tracker</div>
          <div style={{ fontSize:12, color:COLORS.textMuted }}>
                  {t.companyName && <span style={{ color: COLORS.primary, fontWeight: 600 }}>{t.companyName} � </span>}Jun 2025 · Total: <b style={{ color:COLORS.danger }}>₹{grandTotal.toLocaleString("en-IN")}</b> · {transactions.length} transactions</div>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ background:`linear-gradient(135deg, ${COLORS.primary}, #8B5CF6)`, border:"none", borderRadius:12, padding:"9px 16px", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", flexShrink:0 }}>➕ Add</button>
      </div>

      <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:"16px 18px", marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:12 }}>Spending by Category</div>
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {catTotals.filter(c=>c.total>0).map(c => {
            const max = catTotals[0].total;
            return (
              <div key={c.cat} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:16, textAlign:"center", fontSize:12 }}>{catIcons[c.cat]}</div>
                <div style={{ width:72, fontSize:11, color:COLORS.textMuted, flexShrink:0 }}>{c.cat}</div>
                <div style={{ flex:1, background:"rgba(255,255,255,0.05)", borderRadius:4, height:7 }}>
                  <div style={{ height:"100%", width:`${(c.total/max)*100}%`, background:`linear-gradient(90deg,${catColors[c.cat]||COLORS.primary},${catColors[c.cat]||COLORS.primary}88)`, borderRadius:4, transition:"width 1.1s" }} />
                </div>
                <div style={{ width:58, fontSize:11, color:COLORS.text, fontWeight:600, textAlign:"right" }}>₹{(c.total/1000).toFixed(1)}K</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} style={{ padding:"5px 12px", borderRadius:20, fontSize:11, cursor:"pointer", border:"1px solid", borderColor:catFilter===c?COLORS.primary:COLORS.border, background:catFilter===c?`${COLORS.primary}22`:"transparent", color:catFilter===c?COLORS.primary:COLORS.textMuted, transition:"all 0.18s" }}>{c}</button>
        ))}
        {catFilter!=="All" && <span style={{ fontSize:11, color:COLORS.textMuted, alignSelf:"center" }}>→ <b style={{ color:COLORS.danger }}>₹{totalFiltered.toLocaleString("en-IN")}</b></span>}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.map(t => (
          <div key={t.id} style={{ background:COLORS.bgCard, border:`1px solid ${t.hasWarranty?"rgba(108,99,255,0.25)":COLORS.border}`, borderRadius:12, padding:"12px 14px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:`${t.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>{t.icon}</div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:COLORS.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.storeName}</div>
                  <div style={{ fontSize:10.5, color:COLORS.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.productName} · {t.cat} · {t.date} · {t.paymentMode}</div>
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0, marginLeft:8, display:"flex", flexDirection:"column", alignItems:"flex-end" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:COLORS.danger }}>−₹{parseFloat(t.amount||0).toLocaleString("en-IN")}</div>
                  <button onClick={() => setDeletingExp(t.id)} style={{ background:"transparent", border:"none", cursor:"pointer", padding:0, fontSize:13 }} title="Delete Expense">🗑️</button>
                </div>
                {t.hasWarranty && (() => {
                  const MS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                  let lbl = "";
                  if (t.warrantyData?.expiryDate) { const [y,m,d]=t.warrantyData.expiryDate.split("-"); lbl=` · ${parseInt(d)} ${MS[parseInt(m)-1]} ${y}`; }
                  const isExp  = t.warrantyData?.expiryDate && new Date(t.warrantyData.expiryDate)<new Date();
                  const isSoon = t.warrantyData?.expiryDate && !isExp && (new Date(t.warrantyData.expiryDate)-new Date())<30*24*60*60*1000;
                  const bc = isExp?COLORS.danger:isSoon?COLORS.accent:COLORS.primary;
                  return <div style={{ fontSize:9.5, color:bc, marginTop:3, background:`${bc}18`, padding:"2px 7px", borderRadius:10, border:`1px solid ${bc}30` }}>🛡️ {t.warrantyData?.type||"Warranty"}{lbl}{isExp?" · EXPIRED":""}{isSoon?" · EXPIRING SOON":""}</div>;
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>
      

      {showAdd && <AddExpenseModal pastExpenses={expenses} banks={banks} creditCards={creditCards} vendorMaster={vendorMaster} setVendorMaster={setVendorMaster} categoryMaster={categoryMaster} setCategoryMaster={setCategoryMaster}  companyMaster={companyMaster} setCompanyMaster={setCompanyMaster} platformMaster={platformMaster} setPlatformMaster={setPlatformMaster}  onClose={() => setShowAdd(false)} onSave={handleAddExpense} />}

    </div>
  );
}

// ─── Budget View ──────────────────────────────────────────────────────────────
// ─── Shared confirm dialog ────────────────────────────────────────────────────
function ConfirmDialog({ msg, onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div style={{ background:"#111827",borderRadius:18,padding:"24px 20px",maxWidth:300,width:"100%",border:`1px solid ${COLORS.danger}33` }}>
        <div style={{ fontSize:26,textAlign:"center",marginBottom:10 }}>🗑️</div>
        <div style={{ fontSize:14,fontWeight:700,color:COLORS.text,textAlign:"center",marginBottom:6 }}>Delete?</div>
        <div style={{ fontSize:12,color:COLORS.textMuted,textAlign:"center",marginBottom:18 }}>{msg}</div>
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onCancel} style={{ flex:1,padding:"10px",borderRadius:10,border:`1px solid ${COLORS.border}`,background:"transparent",color:COLORS.textMuted,cursor:"pointer",fontSize:13 }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex:1,padding:"10px",borderRadius:10,border:"none",background:COLORS.danger,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700 }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Budget Error Boundary ────────────────────────────────────────────────────
class BudgetErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("Budget Error:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9", marginBottom: 8 }}>Budget Page Error</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>{String(this.state.error?.message || "Unknown error")}</div>
          <button
            onClick={() => {
              ["fp_inv_trackers","fp_budget_amort_range","fp_amort_range","fp_budget_expanded","fp_disabled_inv_ids","fp_use_avg_mode","fp_amort_mode","fp_budget_amort_mode"].forEach(k => localStorage.removeItem(k));
              this.setState({ hasError: false, error: null });
            }}
            style={{ background: "#6C63FF", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >🔄 Reset Budget Settings &amp; Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Live Budget View ─────────────────────────────────────────────────────────
const BUDGET_SEED = [];
function BudgetViewLive({ expenses, budgets, setBudgets, filter, incomes = [], investments = [], insurance = [], loans = [] }) {
  // Self-healing: clear any corrupted budget localStorage keys that could cause blank page
  (() => {
    try {
      const keysToValidate = ["fp_inv_trackers", "fp_budget_amort_range", "fp_amort_range", "fp_budget_expanded"];
      keysToValidate.forEach(key => {
        const v = localStorage.getItem(key);
        if (v) { try { JSON.parse(v); } catch { localStorage.removeItem(key); } }
      });
    } catch(e) { /* ignore */ }
  })();

  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [delId,    setDelId]      = useState(null);
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [form,     setForm]       = useState({ name:"", budget:"", icon:"💰", color:COLORS.primary, linkedCategories: [] });
  
  // Benchmark target investment percentage
  const getLegacy = (key, def) => {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : def; } catch { return def; }
  };
  
  const [trackers, setTrackers] = useLocalStorage("fp_inv_trackers", [{
    id: "default",
    name: "Investment Rate Tracker",
    targetPct: getLegacy("fp_target_inv_pct", 10),
    incomeSources: getLegacy("fp_income_sources", ["Salary"]),
    inclBankInv: getLegacy("fp_incl_bank_inv", true),
    inclInsurance: getLegacy("fp_incl_insurance", true),
    inclAssetLoans: getLegacy("fp_incl_asset_loans", true)
  }]);

  const updateTracker = (id, updates) => setTrackers(ts => ts.map(t => t.id === id ? { ...t, ...updates } : t));
  const deleteTracker = (id) => setTrackers(ts => ts.filter(t => t.id !== id));
  const addTracker = () => {
    setTrackers(ts => [{
      id: "trk_" + Date.now(),
      name: "New Tracker",
      targetPct: 10,
      incomeSources: ["Salary"],
      inclBankInv: true,
      inclInsurance: true,
      inclAssetLoans: true
    }, ...ts]);
  };

  // Individual investment plan disabled tracking
  const [disabledInvIds, setDisabledInvIds] = useLocalStorage("fp_disabled_inv_ids", []);
  
  // Amortized payments toggle
  const [useAverageMode, setUseAverageMode] = useLocalStorage("fp_use_avg_mode", false);
  const [amortizeMode, setAmortizeMode] = useLocalStorage("fp_amort_mode", "1");
  const [amortizeRange, setAmortizeRange] = useLocalStorage("fp_amort_range", { fromMonth: 1, fromYear: new Date().getFullYear(), toMonth: 12, toYear: new Date().getFullYear() });
  const [budgetAmortizeMode, setBudgetAmortizeMode] = useLocalStorage("fp_budget_amort_mode", "1");
  const [budgetAmortizeRange, setBudgetAmortizeRange] = useLocalStorage("fp_budget_amort_range", { fromMonth: 1, fromYear: new Date().getFullYear(), toMonth: 12, toYear: new Date().getFullYear() });

  // Section collapse states
  const [expandedSections, setExpandedSections] = useLocalStorage("fp_budget_expanded", { 1: true, 2: true, 3: true, 4: true });
  // Investment sub-section collapse states
  const [expandedCoverage, setExpandedCoverage] = useState({});
  const toggleSection = (step) => setExpandedSections(prev => ({ ...prev, [step]: !prev[step] }));

  // Step-Up Planner settings
  const [stepUpBase, setStepUpBase] = useLocalStorage("fp_stepup_base", 15000);
  const [stepUpPct, setStepUpPct]   = useLocalStorage("fp_stepup_pct", 10);
  const [stepUpYears, setStepUpYears] = useLocalStorage("fp_stepup_years", 5);

  const iStyle = { background:"#1a2236", border:`1px solid ${COLORS.border}`, borderRadius:9, padding:"9px 12px", color:COLORS.text, fontSize:13, width:"100%", outline:"none", boxSizing:"border-box", caretColor:"#6C63FF" };
  const ICONS = ["🍽️","🛒","⛽","🎬","🛍️","💊","💡","📚","✈️","🏠","💻","🎵","💰","🎁","🏋️"];

  // Unique and standard categories for group selection
  const standardCategories = ["Food", "Grocery", "Fuel", "Medical", "Shopping", "Travel", "Entertainment", "Education", "Utilities", "Electronics", "Other"];
  const uniqueExpenseCats = Array.from(new Set(expenses.map(e => e.cat || e.category).filter(Boolean)));
  const allCategories = Array.from(new Set([...standardCategories, ...uniqueExpenseCats]));

  // Compute period totals
  const periodExp = expenses.filter(e => {
    const d=new Date(e.date),m=d.getMonth()+1,y=d.getFullYear();
    if(filter.mode==="month") return m===filter.month&&y===filter.year;
    if(filter.mode==="year")  return y===filter.year;
    if(filter.mode==="range"){const k=y*100+m;return k>=filter.fromYear*100+filter.fromMonth&&k<=filter.toYear*100+filter.toMonth;}
    return true;
  });

  const periodInc = incomes.filter(i => {
    const d=new Date(i.date),m=d.getMonth()+1,y=d.getFullYear();
    if(filter.mode==="month") return m===filter.month&&y===filter.year;
    if(filter.mode==="year")  return y===filter.year;
    if(filter.mode==="range"){const k=y*100+m;return k>=filter.fromYear*100+filter.fromMonth&&k<=filter.toYear*100+filter.toMonth;}
    return true;
  });

  // Calculate actual investments in this period
  const getTrackerFilter = () => {
    let startM = filter.mode === "range" ? filter.fromMonth : filter.month || new Date().getMonth() + 1;
    let startY = filter.mode === "range" ? filter.fromYear : filter.year || new Date().getFullYear();
    
    if (amortizeMode === "custom") {
       return { mode: "range", fromMonth: amortizeRange.fromMonth, fromYear: amortizeRange.fromYear, toMonth: amortizeRange.toMonth, toYear: amortizeRange.toYear };
    }
    
    let monthsToAdd = parseInt(amortizeMode) - 1;
    let endM = startM + monthsToAdd;
    let endY = startY;
    while (endM > 12) {
       endM -= 12;
       endY += 1;
    }
    
    return { mode: "range", fromMonth: startM, fromYear: startY, toMonth: endM, toYear: endY };
  };

  const getPeriodInvestmentsList = () => {
    const tFilter = getTrackerFilter();
    let items = [];
    const invList = investments || [];
    invList.forEach(inv => {
      let itemTotal = 0;
      if (inv.payments && inv.payments.length > 0) {
        inv.payments.forEach(p => {
          const d = new Date(p.date), m = d.getMonth() + 1, y = d.getFullYear();
          let inPeriod = false;
          if (tFilter.mode === "month") inPeriod = (m === tFilter.month && y === tFilter.year);
          else if (tFilter.mode === "year") inPeriod = (y === tFilter.year);
          else if (tFilter.mode === "range") { const k = y * 100 + m; inPeriod = (k >= tFilter.fromYear * 100 + tFilter.fromMonth && k <= tFilter.toYear * 100 + tFilter.toMonth); } 
          else inPeriod = true;
          if (inPeriod) itemTotal += parseFloat(p.amount || 0);
        });
      } else if (inv.startDate) {
        const d = new Date(inv.startDate), m = d.getMonth() + 1, y = d.getFullYear();
        let inPeriod = false;
        if (filter.mode === "month") inPeriod = (m === filter.month && y === filter.year);
        else if (filter.mode === "year") inPeriod = (y === filter.year);
        else if (filter.mode === "range") { const k = y * 100 + m; inPeriod = (k >= filter.fromYear * 100 + filter.fromMonth && k <= filter.toYear * 100 + filter.toMonth); } 
        else inPeriod = true;
        if (inPeriod) itemTotal += parseFloat(inv.emiAmount || inv.amount || inv.invested || 0);
      }
      items.push({ id: inv.id, name: inv.name || inv.assetName || "Investment", amount: itemTotal });
    });
    return items;
  };

  // Insurance premiums paid in period
  const getInsurancePaidList = () => {
    const tFilter = getTrackerFilter();
    let items = [];
    (insurance || []).forEach(ins => {
      let itemTotal = 0;
      if (ins.payments && ins.payments.length > 0) {
        ins.payments.forEach(p => {
          const d = new Date(p.date || p.payDate), m = d.getMonth() + 1, y = d.getFullYear();
          let inPeriod = false;
          if (tFilter.mode === "month") inPeriod = (m === tFilter.month && y === tFilter.year);
          else if (tFilter.mode === "year") inPeriod = (y === tFilter.year);
          else if (tFilter.mode === "range") { const k = y*100+m; inPeriod = (k >= tFilter.fromYear*100+tFilter.fromMonth && k <= tFilter.toYear*100+tFilter.toMonth); }
          else inPeriod = true;
          if (inPeriod) itemTotal += parseFloat(p.amount || 0);
        });
      } else if (ins.startDate || ins.dueDate) {
        const d = new Date(ins.startDate || ins.dueDate), m = d.getMonth() + 1, y = d.getFullYear();
        let inPeriod = false;
        if (filter.mode === "month") inPeriod = (m === filter.month && y === filter.year);
        else if (filter.mode === "year") inPeriod = (y === filter.year);
        else if (filter.mode === "range") { const k = y*100+m; inPeriod = (k >= filter.fromYear*100+filter.fromMonth && k <= filter.toYear*100+filter.toMonth); }
        else inPeriod = true;
        if (inPeriod) itemTotal += parseFloat(ins.amount || ins.premium || 0);
      }
      items.push({ id: ins.id, name: ins.name || ins.policyName || "Insurance", amount: itemTotal });
    });
    return items;
  };

  // Asset-related Loan EMIs paid in period
  const getLoanEmiPaidList = () => {
    const tFilter = getTrackerFilter();
    let items = [];
    (loans || []).forEach(loan => {
      let itemTotal = 0;
      if (loan.payments && loan.payments.length > 0) {
        loan.payments.forEach(p => {
          const d = new Date(p.date || p.payDate), m = d.getMonth() + 1, y = d.getFullYear();
          let inPeriod = false;
          if (tFilter.mode === "month") inPeriod = (m === tFilter.month && y === tFilter.year);
          else if (tFilter.mode === "year") inPeriod = (y === tFilter.year);
          else if (tFilter.mode === "range") { const k = y*100+m; inPeriod = (k >= tFilter.fromYear*100+tFilter.fromMonth && k <= tFilter.toYear*100+tFilter.toMonth); }
          else inPeriod = true;
          if (inPeriod) itemTotal += parseFloat(p.amount || p.emi || 0);
        });
      } else if (loan.startDate && loan.emiAmount) {
        const d = new Date(loan.startDate), m = d.getMonth() + 1, y = d.getFullYear();
        let inPeriod = false;
        if (filter.mode === "month") inPeriod = (m === filter.month && y === filter.year);
        else if (filter.mode === "year") inPeriod = (y === filter.year);
        else if (filter.mode === "range") { const k = y*100+m; inPeriod = (k >= filter.fromYear*100+filter.fromMonth && k <= filter.toYear*100+filter.toMonth); }
        else inPeriod = true;
        if (inPeriod) itemTotal += parseFloat(loan.emiAmount || 0);
      }
      items.push({ id: loan.id, name: loan.name || loan.loanName || "Loan", amount: itemTotal });
    });
    return items;
  };

  // Income base calculations tailored to the Tracker Period
  const trackerInc = (() => {
    const tFilter = getTrackerFilter();
    return incomes.filter(i => {
      const d = new Date(i.date), m = d.getMonth() + 1, y = d.getFullYear();
      if (tFilter.mode === "month") return m === tFilter.month && y === tFilter.year;
      if (tFilter.mode === "year") return y === tFilter.year;
      if (tFilter.mode === "range") { const k = y*100+m; return k >= tFilter.fromYear*100+tFilter.fromMonth && k <= tFilter.toYear*100+tFilter.toMonth; }
      return true;
    });
  })();

  const getBudgetFilter = () => {
    let startM = filter.mode === "range" ? filter.fromMonth : filter.month || new Date().getMonth() + 1;
    let startY = filter.mode === "range" ? filter.fromYear : filter.year || new Date().getFullYear();
    if (budgetAmortizeMode === "custom") {
       return { mode: "range", fromMonth: budgetAmortizeRange.fromMonth, fromYear: budgetAmortizeRange.fromYear, toMonth: budgetAmortizeRange.toMonth, toYear: budgetAmortizeRange.toYear };
    }
    let monthsToAdd = parseInt(budgetAmortizeMode) - 1;
    let endM = startM + monthsToAdd;
    let endY = startY;
    while (endM > 12) { endM -= 12; endY += 1; }
    return { mode: "range", fromMonth: startM, fromYear: startY, toMonth: endM, toYear: endY };
  };

  const budgetPeriodExp = (() => {
    const bFilter = getBudgetFilter();
    return expenses.filter(e => {
      const d = new Date(e.date), m = d.getMonth() + 1, y = d.getFullYear();
      const k = y * 100 + m;
      return k >= bFilter.fromYear * 100 + bFilter.fromMonth && k <= bFilter.toYear * 100 + bFilter.toMonth;
    });
  })();

  const totalIncome = trackerInc.reduce((s, i) => s + parseFloat(i.amount || 0), 0);

  // All distinct income sources present in this period with their totals
  const ALL_INCOME_SOURCES = ["Salary", "Freelancing", "Rental", "Business", "Dividend", "Interest", "Bonus", "Gift", "Other"];
  const incomeBySource = ALL_INCOME_SOURCES.reduce((acc, src) => {
    acc[src] = trackerInc.filter(i => (i.source || "") === src).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
    return acc;
  }, {});
  // Also capture any unlisted sources from actual data
  const presentSources = Array.from(new Set(trackerInc.map(i => i.source).filter(Boolean)));
  const allPresentSources = Array.from(new Set([...ALL_INCOME_SOURCES, ...presentSources]));

  // baseIncome = sum of only the user-selected income sources


  // Averaged Calculations
  const getAveragedInvestmentsList = () => {
    const months = getAmortizeMonths();
    let items = [];
    (investments || []).forEach(inv => {
      const cycle = inv.cycle || "Monthly";
      const div = getCycleDivisor(cycle);
      if (div === 0) return; // skip one-time
      const isLump = inv.type === "Mutual Fund (Lumpsum)" || inv.type === "Fixed Deposit" || inv.cycle === "One-Time" || !inv.cycle;
      if (isLump) return; // exclude lump sums from recurring averages
      const latestPayment = inv.payments && inv.payments.length > 0 ? inv.payments[inv.payments.length - 1].amount : null;
      const baseAmt = parseFloat(latestPayment || inv.emiAmount || inv.amount || inv.invested || 0);
      items.push({ id: inv.id, name: inv.name || inv.assetName || "Investment", amount: Math.round((baseAmt / div) * months) });
    });
    return items;
  };

  const getAveragedInsuranceList = () => {
    const months = getAmortizeMonths();
    let items = [];
    (insurance || []).forEach(ins => {
      const cycle = ins.cycle || ins.premiumCycle || "Annually"; 
      const div = getCycleDivisor(cycle);
      if (div === 0) return;
      const latestPayment = ins.payments && ins.payments.length > 0 ? ins.payments[ins.payments.length - 1].amount : null;
      const baseAmt = parseFloat(latestPayment || ins.amount || ins.premium || 0);
      items.push({ id: ins.id, name: ins.name || ins.policyName || "Insurance", amount: Math.round((baseAmt / div) * months) });
    });
    return items;
  };

  const getAveragedLoansList = () => {
    const months = getAmortizeMonths();
    let items = [];
    (loans || []).forEach(loan => {
      const cycle = loan.cycle || "Monthly"; 
      const div = getCycleDivisor(cycle);
      if (div === 0) return;
      const latestPayment = loan.payments && loan.payments.length > 0 ? (loan.payments[loan.payments.length - 1].amount || loan.payments[loan.payments.length - 1].emi) : null;
      const baseAmt = parseFloat(latestPayment || loan.emiAmount || loan.emi || loan.amount || 0);
      items.push({ id: loan.id, name: loan.name || loan.loanName || "Loan", amount: Math.round((baseAmt / div) * months) });
    });
    return items;
  };

  const bankItems      = useAverageMode ? getAveragedInvestmentsList() : getPeriodInvestmentsList();
  const insuranceItems = useAverageMode ? getAveragedInsuranceList() : getInsurancePaidList();
  const loanItems      = useAverageMode ? getAveragedLoansList() : getLoanEmiPaidList();

  const invBankTotal  = bankItems.filter(i => !disabledInvIds.includes(i.id)).reduce((s, i) => s + i.amount, 0);
  const invInsurance  = insuranceItems.filter(i => !disabledInvIds.includes(i.id)).reduce((s, i) => s + i.amount, 0);
  const invLoans      = loanItems.filter(i => !disabledInvIds.includes(i.id)).reduce((s, i) => s + i.amount, 0);

  // Total actual invested = sum of selected coverage components
  const globalTotalInvested = invBankTotal + invInsurance + invLoans;

  // Map expense cats to budget names (rough match for legacy fallback)
  const catMap = { "Food":["Food & Dining"],"Grocery":["Grocery"],"Fuel":["Fuel & Commute"],"Entertainment":["Entertainment"],"Shopping":["Shopping"],"Medical":["Medical"],"Utilities":["Utilities"],"Education":["Education"],"Travel":["Travel"] };
  const getActual = (b) => {
    const linked = b.linkedCategories || [];
    if (linked.length > 0) {
      return budgetPeriodExp.filter(e => linked.includes(e.cat || e.category)).reduce((s,e)=>s+parseFloat(e.amount||0),0);
    }
    // Fallback
    return budgetPeriodExp.filter(e => {
      const categoryName = e.cat || e.category;
      if (categoryName === b.name) return true;
      return Object.entries(catMap).some(([cat,names])=>names.includes(b.name)&&categoryName===cat);
    }).reduce((s,e)=>s+parseFloat(e.amount||0),0);
  };

  const getBudgetMonths = () => {
    const bFilter = getBudgetFilter();
    let mCount = (bFilter.toYear - bFilter.fromYear) * 12 + (bFilter.toMonth - bFilter.fromMonth) + 1;
    return mCount > 0 ? mCount : 1;
  };

  const enriched = budgets.map(b => {
    let adjustedBudget = parseFloat(b.budget || 0);
    if (b.type === "cumulative") {
       adjustedBudget = adjustedBudget * getBudgetMonths();
    }
    return { ...b, budget: adjustedBudget, baseBudget: parseFloat(b.budget || 0), actual: getActual(b) };
  });
  const totalBudget = enriched.reduce((s,b)=>s+b.budget,0);
  const totalActual = enriched.reduce((s,b)=>s+b.actual,0);

  const unallocatedCash = totalIncome - totalActual - globalTotalInvested;

  // Current Month Pacing Details
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const monthProgress = currentDay / daysInMonth;
  const isCurrentPeriod = (filter.mode === "month" && filter.month === (today.getMonth() + 1) && filter.year === today.getFullYear());

  // ── Section Header helper ──────────────────────────────────────────────────
  const SectionHeader = ({ step, icon, title, desc }) => {
    const isExpanded = expandedSections[step];
    return (
      <div 
        onClick={() => toggleSection(step)}
        style={{ 
          display: "flex", alignItems: "center", justifyContent: "space-between", 
          marginBottom: 8, marginTop: 4, cursor: "pointer", 
          background: isExpanded ? "transparent" : "rgba(255,255,255,0.03)",
          padding: isExpanded ? 0 : "10px 14px",
          borderRadius: 12,
          border: isExpanded ? "none" : `1px solid ${COLORS.border}`,
          transition: "all 0.2s"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.primary}, #8B5CF6)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0
          }}>{step}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>{icon} {title}</div>
            <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 1 }}>{desc}</div>
          </div>
        </div>
        <div style={{ fontSize: 14, color: COLORS.textMuted, opacity: 0.6 }}>
          {isExpanded ? "▲" : "▼"}
        </div>
      </div>
    );
  };

  const openAdd = () => { setEditItem(null); setForm({name:"",budget:"",icon:"🍽️",color:COLORS.primary,linkedCategories:[],type:"fixed"}); setShowForm(true); };
  const openEdit = (b) => { setEditItem(b); setForm({name:b.name,budget:b.baseBudget || b.budget,icon:b.icon,color:b.color,linkedCategories:b.linkedCategories || [],type:b.type||"fixed"}); setShowForm(true); };
  const handleSave = () => {
    if(!form.name||!form.budget) return;
    const item = {...form,budget:parseFloat(form.budget),linkedCategories: form.linkedCategories || [],type:form.type||"fixed"};
    if(editItem) setBudgets(p=>p.map(b=>b.id===editItem.id?{...b,...item}:b));
    else setBudgets(p=>[...p,{...item,id:"b"+Date.now()}]);
    setShowForm(false);
  };

  // Generate Step-up table rows
  const stepUpProjections = [];
  let currentSip = stepUpBase;
  for (let i = 0; i < stepUpYears; i++) {
    const yearNum = today.getFullYear() + i;
    stepUpProjections.push({ year: yearNum, monthly: currentSip, annualTotal: currentSip * 12 });
    currentSip = currentSip * (1 + stepUpPct / 100);
  }

  return (
    <div style={{ display: "flex", gap: 18, alignItems: "flex-start", width: "100%", flexWrap: "wrap" }}>
      {/* Left Column: Input Forms, Tracker Dashboard, Budget Cards, Step-Up SIP Calculator */}
      <div style={{ flex: "1 1 500px", minWidth: 320, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* ── Page Header ─────────────────────────────── */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 12 }}>
          <div>
            <div style={{ fontSize:18,fontWeight:700,color:COLORS.text }}>💰 Budget & Savings Planner</div>
            <div style={{ fontSize:12,color:COLORS.textMuted, marginTop: 2 }}>{filterLabel(filter)} — This page has 4 sections. Read each section header to understand its purpose.</div>
          </div>
          <button onClick={openAdd} style={{ background:`linear-gradient(135deg,${COLORS.primary},#8B5CF6)`,border:"none",borderRadius:12,padding:"9px 14px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0 }}>➕ Add Budget</button>
        </div>

        {/* ── SECTION 1: Investment Rate Tracker ────── */}
        <SectionHeader step="1" icon="📊" title="Investment Rate Tracker" desc="How much of your income are you investing? Set your target % and track actuals from Bank, Insurance & Loans." />
        {expandedSections["1"] && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={addTracker} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "6px 12px", color: COLORS.text, fontSize: 11, cursor: "pointer" }}>+ Add Tracker</button>
            </div>
            {trackers.map((tracker, index) => {
              const tBaseIncome = allPresentSources.reduce((s, src) => {
                if ((tracker.incomeSources || ["Salary"]).includes(src)) {
                  return s + (incomeBySource[src] || trackerInc.filter(i => i.source === src).reduce((a, i) => a + parseFloat(i.amount || 0), 0));
                }
                return s;
              }, 0);
              
              const tTotalInvested = (tracker.inclBankInv ? invBankTotal : 0) + (tracker.inclInsurance ? invInsurance : 0) + (tracker.inclAssetLoans ? invLoans : 0);
              const tInvPct = tBaseIncome > 0 ? (tTotalInvested / tBaseIncome) * 100 : 0;
              const tIsMeetingBenchmark = tInvPct >= tracker.targetPct;

              return (
                <div key={tracker.id} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16 }}>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", padding: "4px 10px", borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
                        <span style={{ fontSize: 13 }}>🎯</span>
                        <input 
                          value={tracker.name} 
                          onChange={e => updateTracker(tracker.id, { name: e.target.value })}
                          placeholder="Tracker Name"
                          style={{ background: "transparent", border: "none", color: COLORS.text, fontSize: 14, fontWeight: 700, outline: "none", width: 220 }}
                        />
                        <span style={{ fontSize: 12, color: COLORS.textMuted }}>✎</span>
                      </div>
                      <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4, width: "100%" }}>
                        <input 
                          value={tracker.description || ""} 
                          onChange={e => updateTracker(tracker.id, { description: e.target.value })}
                          placeholder="Track how much of your income goes toward wealth building"
                          style={{ background: "transparent", border: "none", borderBottom: `1px dashed ${COLORS.border}`, color: COLORS.textMuted, fontSize: 10, outline: "none", width: 320, paddingBottom: 2 }}
                        />
                        <span style={{ fontSize: 9, color: COLORS.textMuted, opacity: 0.5 }}>✎</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10, color: COLORS.textMuted }}>Target:</span>
                        <select
                          value={tracker.targetPct}
                          onChange={e => updateTracker(tracker.id, { targetPct: parseInt(e.target.value) })}
                          style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 6, fontSize: 11, padding: "3px 6px", outline: "none" }}
                        >
                          {[5,10,15,20,25,30,35,40,50].map(pct => (
                            <option key={pct} value={pct}>{pct}%</option>
                          ))}
                        </select>
                      </div>
                      {trackers.length > 1 && (
                        <button onClick={() => deleteTracker(tracker.id)} style={{ background: "transparent", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 12 }} title="Delete Tracker">✖</button>
                      )}
                    </div>
                  </div>

                  {/* Income Base - Per-Source Multi-Select */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontSize: 10, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Income Base</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>Total: ₹{tBaseIncome.toLocaleString("en-IN")}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                      {allPresentSources.map(src => {
                        const isSelected = (tracker.incomeSources || ["Salary"]).includes(src);
                        const srcAmt = incomeBySource[src] || trackerInc.filter(i => i.source === src).reduce((a, i) => a + parseFloat(i.amount || 0), 0);
                        const srcIcons = { Salary: "💼", Freelancing: "💻", Rental: "🏠", Business: "🏬", Dividend: "📈", Interest: "🏦", Bonus: "🎁", Gift: "💝", Other: "✨" };
                        return (
                          <button
                            key={src}
                            type="button"
                            onClick={() => {
                              const cur = tracker.incomeSources || ["Salary"];
                              if (isSelected && cur.length === 1) return;
                              updateTracker(tracker.id, { incomeSources: isSelected ? cur.filter(s => s !== src) : [...cur, src] });
                            }}
                            style={{
                              display: "flex", flexDirection: "column", alignItems: "flex-start",
                              padding: "6px 10px", borderRadius: 9, cursor: "pointer",
                              border: `1px solid ${isSelected ? COLORS.primary : COLORS.border}`,
                              background: isSelected ? `${COLORS.primary}1A` : "rgba(255,255,255,0.02)",
                              transition: "all 0.2s", minWidth: 80
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                              <span style={{ fontSize: 11 }}>{srcIcons[src] || "✨"}</span>
                              <span style={{ fontSize: 10, color: isSelected ? COLORS.text : COLORS.textMuted, fontWeight: isSelected ? 600 : 400 }}>{src}</span>
                              {isSelected && <span style={{ fontSize: 8, color: COLORS.primary, marginLeft: 2 }}>✓</span>}
                            </div>
                            <div style={{ fontSize: 10, color: srcAmt > 0 ? COLORS.secondary : COLORS.textMuted, fontWeight: 600 }}>
                              {srcAmt > 0 ? `₹${srcAmt.toLocaleString("en-IN")}` : "₹0"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 5 }}>
                      Tap to include/exclude income sources. At least one must stay selected.
                    </div>
                  </div>

                  {/* Investment Coverage Toggles */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontSize: 10, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Investment Coverage</div>
                      {index === 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <select
                              value={amortizeMode}
                              onChange={e => setAmortizeMode(e.target.value)}
                              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 10, padding: "4px 8px", outline: "none" }}
                            >
                              <option value="1" style={{ background: "#1a2236" }}>1 Month</option>
                              <option value="3" style={{ background: "#1a2236" }}>3 Months</option>
                              <option value="6" style={{ background: "#1a2236" }}>6 Months</option>
                              <option value="12" style={{ background: "#1a2236" }}>12 Months</option>
                              <option value="custom" style={{ background: "#1a2236" }}>Custom Range</option>
                            </select>
                            {amortizeMode === "custom" && (
                              <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "2px 6px" }}>
                                <input type="number" min="1" max="12" value={amortizeRange.fromMonth} onChange={e => setAmortizeRange({...amortizeRange, fromMonth: parseInt(e.target.value)||1})} style={{ width: 28, background: "transparent", border: "none", color: COLORS.text, fontSize: 10, textAlign: "center", outline: "none" }} />
                                <span style={{ color: COLORS.textMuted, fontSize: 10 }}>/</span>
                                <input type="number" min="2000" max="2100" value={amortizeRange.fromYear} onChange={e => setAmortizeRange({...amortizeRange, fromYear: parseInt(e.target.value)||new Date().getFullYear()})} style={{ width: 36, background: "transparent", border: "none", color: COLORS.text, fontSize: 10, textAlign: "center", outline: "none" }} />
                                <span style={{ color: COLORS.textMuted, fontSize: 10, margin: "0 2px" }}>-</span>
                                <input type="number" min="1" max="12" value={amortizeRange.toMonth} onChange={e => setAmortizeRange({...amortizeRange, toMonth: parseInt(e.target.value)||1})} style={{ width: 28, background: "transparent", border: "none", color: COLORS.text, fontSize: 10, textAlign: "center", outline: "none" }} />
                                <span style={{ color: COLORS.textMuted, fontSize: 10 }}>/</span>
                                <input type="number" min="2000" max="2100" value={amortizeRange.toYear} onChange={e => setAmortizeRange({...amortizeRange, toYear: parseInt(e.target.value)||new Date().getFullYear()})} style={{ width: 36, background: "transparent", border: "none", color: COLORS.text, fontSize: 10, textAlign: "center", outline: "none" }} />
                              </div>
                            )}
                          </div>
                          <div 
                            onClick={() => setUseAverageMode(p => !p)}
                            style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", background: "rgba(255,255,255,0.03)", padding: "4px 8px", borderRadius: 12, border: `1px solid ${COLORS.border}` }}
                          >
                            <span style={{ fontSize: 9, color: useAverageMode ? COLORS.secondary : COLORS.textMuted, fontWeight: useAverageMode ? 600 : 400 }}>Amortize Payments</span>
                            <div style={{
                              width: 20, height: 12, borderRadius: 6,
                              background: useAverageMode ? COLORS.secondary : "rgba(255,255,255,0.1)",
                              position: "relative", transition: "background 0.3s"
                            }}>
                              <div style={{ position: "absolute", top: 2, left: useAverageMode ? 10 : 2, width: 8, height: 8, borderRadius: "50%", background: "#fff", transition: "left 0.3s" }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { key: "inclBankInv", label: "Bank/Broker", amt: invBankTotal, icon: "🏦" },
                        { key: "inclInsurance", label: "Insurance", amt: invInsurance, icon: "🛡️" },
                        { key: "inclAssetLoans", label: "Asset Loans", amt: invLoans, icon: "🚗" }
                      ].map(t => (
                        <div key={t.key} onClick={() => updateTracker(tracker.id, { [t.key]: !tracker[t.key] })} style={{ display: "flex", alignItems: "center", gap: 6, background: tracker[t.key] ? `${COLORS.secondary}1A` : "rgba(255,255,255,0.02)", border: `1px solid ${tracker[t.key] ? COLORS.secondary : COLORS.border}`, padding: "4px 10px", borderRadius: 12, cursor: "pointer", transition: "all 0.2s" }}>
                          <span style={{ fontSize: 11 }}>{t.icon}</span>
                          <span style={{ fontSize: 10, color: tracker[t.key] ? COLORS.text : COLORS.textMuted }}>{t.label}</span>
                          {tracker[t.key] && <span style={{ fontSize: 9, color: COLORS.secondary }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary Bar & Bar Chart */}
                  <div style={{ background: `linear-gradient(90deg, ${COLORS.bgLight}, rgba(255,255,255,0.02))`, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      
                      {/* Left: Stats */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Investment Performance</div>
                        
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 2 }}>Actual Rate</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                            <span style={{ fontSize: 28, fontWeight: 800, color: tIsMeetingBenchmark ? COLORS.secondary : COLORS.accent }}>
                              {tInvPct.toFixed(1)}%
                            </span>
                            <span style={{ fontSize: 11, color: COLORS.textMuted }}>of ₹{tBaseIncome.toLocaleString("en-IN")}</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 24 }}>
                          <div>
                            <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 2 }}>Target Budget ({tracker.targetPct}%)</div>
                            <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text }}>₹{Math.round(tBaseIncome * tracker.targetPct / 100).toLocaleString("en-IN")}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 2 }}>Actual Invested</div>
                            <div style={{ fontSize: 16, fontWeight: 600, color: tIsMeetingBenchmark ? COLORS.secondary : COLORS.accent }}>₹{tTotalInvested.toLocaleString("en-IN")}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right: CSS Bar Chart */}
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 20, height: 100, borderBottom: `1px solid ${COLORS.border}80`, paddingBottom: 0, width: 140, justifyContent: "center", position: "relative" }}>
                        {(() => {
                          const targetAmt = Math.round(tBaseIncome * tracker.targetPct / 100);
                          const maxAmt = Math.max(targetAmt, tTotalInvested) * 1.15 || 1; 
                          const targetH = Math.min(100, Math.max(2, (targetAmt / maxAmt) * 100));
                          const actualH = Math.min(100, Math.max(2, (tTotalInvested / maxAmt) * 100));
                          return (
                            <>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 4 }}>
                                <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 600, opacity: targetH > 10 ? 1 : 0 }}>₹{(targetAmt/1000).toFixed(targetAmt>=10000?0:1)}K</div>
                                <div style={{ width: 36, height: `${targetH}%`, background: "rgba(255,255,255,0.1)", borderRadius: "4px 4px 0 0", position: "relative" }}>
                                  <div style={{ position: "absolute", top: 0, width: "100%", height: 2, background: "rgba(255,255,255,0.4)" }} />
                                </div>
                                <div style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 4, position: "absolute", bottom: -20 }}>TARGET</div>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 4 }}>
                                <div style={{ fontSize: 10, color: tIsMeetingBenchmark ? COLORS.secondary : COLORS.accent, fontWeight: 700, opacity: actualH > 10 ? 1 : 0 }}>₹{(tTotalInvested/1000).toFixed(tTotalInvested>=10000?0:1)}K</div>
                                <div style={{ width: 36, height: `${actualH}%`, background: tIsMeetingBenchmark ? `linear-gradient(to top, ${COLORS.secondary}40, ${COLORS.secondary})` : `linear-gradient(to top, ${COLORS.accent}40, ${COLORS.accent})`, borderRadius: "4px 4px 0 0", boxShadow: tIsMeetingBenchmark ? `0 -2px 10px ${COLORS.secondary}40` : "none" }} />
                                <div style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 4, position: "absolute", bottom: -20 }}>ACTUAL</div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div style={{ marginTop: 36, padding: "10px 14px", background: tIsMeetingBenchmark ? `${COLORS.secondary}1A` : `${COLORS.accent}1A`, border: `1px solid ${tIsMeetingBenchmark ? COLORS.secondary : COLORS.accent}40`, borderRadius: 8, fontSize: 11, color: COLORS.text, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{tIsMeetingBenchmark ? '🌟' : '💡'}</span>
                      {tIsMeetingBenchmark 
                        ? `Excellent! You are investing ₹${Math.round(tTotalInvested - (tBaseIncome * tracker.targetPct / 100)).toLocaleString("en-IN")} more than your target budget.`
                        : `Invest ₹${Math.max(0, Math.round(tBaseIncome * tracker.targetPct / 100 - tTotalInvested)).toLocaleString("en-IN")} more to reach your ${tracker.targetPct}% goal.`
                      }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* ── SECTION 2: Cashflow Summary ──────────── */}
        <SectionHeader step="2" icon="💸" title="Cashflow Summary" desc="Where does your total income go? Income minus Expenses minus Investments = what's left unallocated." />
        {expandedSections["2"] && (
        <div style={{ background: `linear-gradient(135deg, #1e293b, #0f172a)`, border: `1px solid rgba(108,99,255,0.15)`, borderRadius: 16, padding: 14 }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Zero-Based Cashflow Summary</div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, color: COLORS.text }}>
            <span>₹{totalIncome.toLocaleString("en-IN")} <span style={{ fontSize: 10, color: COLORS.textMuted }}>(Income)</span></span>
            <span style={{ color: COLORS.textMuted }}>-</span>
            <span>₹{totalActual.toLocaleString("en-IN")} <span style={{ fontSize: 10, color: COLORS.textMuted }}>(Expenses)</span></span>
            <span style={{ color: COLORS.textMuted }}>-</span>
            <span>₹{globalTotalInvested.toLocaleString("en-IN")} <span style={{ fontSize: 10, color: COLORS.textMuted }}>(Investments)</span></span>
            <span style={{ color: COLORS.textMuted }}>=</span>
            <span style={{ color: unallocatedCash === 0 ? "#10B981" : unallocatedCash > 0 ? COLORS.accent : COLORS.danger, fontWeight: 700 }}>
              ₹{unallocatedCash.toLocaleString("en-IN")} <span style={{ fontSize: 10, fontWeight: 400 }}>Unallocated</span>
            </span>
          </div>
          <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 6 }}>
            {unallocatedCash === 0 ? "🎉 Zero-based budget perfectly balanced! Every rupee has a job." : unallocatedCash > 0 ? "💡 You have unallocated cash. Consider allocating it to one of your active goals or investments." : "⚠️ Overdraft! Your expenses and investments exceed your income. Revise your budgets."}
          </div>
        </div>
        )}

        {/* ── SECTION 3: Expense Budget Pools ─────── */}
        <SectionHeader step="3" icon="🗂️" title="Expense Budget Pools" desc="Category-wise spend limits. Click any pool below to see individual transactions. Add a pool with ➕ above." />
        {expandedSections["3"] && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 10, color: COLORS.textMuted, textTransform: "uppercase" }}>Budget Period:</div>
            <select
              value={budgetAmortizeMode}
              onChange={e => setBudgetAmortizeMode(e.target.value)}
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 10, padding: "4px 8px", outline: "none" }}
            >
              <option value="1" style={{ background: "#1a2236" }}>1 Month</option>
              <option value="3" style={{ background: "#1a2236" }}>3 Months</option>
              <option value="6" style={{ background: "#1a2236" }}>6 Months</option>
              <option value="12" style={{ background: "#1a2236" }}>12 Months</option>
              <option value="custom" style={{ background: "#1a2236" }}>Custom Range</option>
            </select>
            {budgetAmortizeMode === "custom" && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "2px 6px" }}>
                <input type="number" min="1" max="12" value={budgetAmortizeRange.fromMonth} onChange={e => setBudgetAmortizeRange({...budgetAmortizeRange, fromMonth: parseInt(e.target.value)||1})} style={{ width: 28, background: "transparent", border: "none", color: COLORS.text, fontSize: 10, textAlign: "center", outline: "none" }} />
                <span style={{ color: COLORS.textMuted, fontSize: 10 }}>/</span>
                <input type="number" min="2000" max="2100" value={budgetAmortizeRange.fromYear} onChange={e => setBudgetAmortizeRange({...budgetAmortizeRange, fromYear: parseInt(e.target.value)||new Date().getFullYear()})} style={{ width: 36, background: "transparent", border: "none", color: COLORS.text, fontSize: 10, textAlign: "center", outline: "none" }} />
                <span style={{ color: COLORS.textMuted, fontSize: 10, margin: "0 2px" }}>-</span>
                <input type="number" min="1" max="12" value={budgetAmortizeRange.toMonth} onChange={e => setBudgetAmortizeRange({...budgetAmortizeRange, toMonth: parseInt(e.target.value)||1})} style={{ width: 28, background: "transparent", border: "none", color: COLORS.text, fontSize: 10, textAlign: "center", outline: "none" }} />
                <span style={{ color: COLORS.textMuted, fontSize: 10 }}>/</span>
                <input type="number" min="2000" max="2100" value={budgetAmortizeRange.toYear} onChange={e => setBudgetAmortizeRange({...budgetAmortizeRange, toYear: parseInt(e.target.value)||new Date().getFullYear()})} style={{ width: 36, background: "transparent", border: "none", color: COLORS.text, fontSize: 10, textAlign: "center", outline: "none" }} />
              </div>
            )}
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,minmax(80px,1fr))",gap:9 }}>
            {[{l:"Budget Pool",v:`₹${(totalBudget/1000).toFixed(1)}K`,c:COLORS.primary},{l:"Total Spent",v:`₹${(totalActual/1000).toFixed(1)}K`,c:totalActual>totalBudget?COLORS.danger:COLORS.secondary},{l:"Pool Remaining",v:`₹${((totalBudget-totalActual)/1000).toFixed(1)}K`,c:COLORS.accent}].map(s=>(
              <div key={s.l} style={{ background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:11,padding:"10px 12px" }}>
                <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:3 }}>{s.l}</div>
                <div style={{ fontSize:15,fontWeight:700,color:s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* 4. Active Budgets Grid/List */}
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {enriched.map(c=>{
              const pct=Math.min(c.budget>0?(c.actual/c.budget)*100:0,100);
              const over=c.actual>c.budget;
              
              // Pacing check for current month
              const spentPct = c.budget > 0 ? (c.actual / c.budget) * 100 : 0;
              const currentProgressPct = monthProgress * 100;
              const isOverpacing = isCurrentPeriod && spentPct > currentProgressPct && spentPct < 100;

              const isSelected = c.id === selectedBudgetId;

              return (
                <div 
                  key={c.id} 
                  onClick={() => setSelectedBudgetId(isSelected ? null : c.id)}
                  style={{ 
                    background:COLORS.bgCard,
                    border:`1px solid ${isSelected ? COLORS.primary : over?"rgba(255,91,91,0.25)":COLORS.border}`,
                    borderRadius:12,
                    padding:"12px 14px",
                    cursor: "pointer",
                    boxShadow: isSelected ? `0 0 12px ${COLORS.primary}33` : "none",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7 }}>
                    <div style={{ display:"flex",flexDirection:"column",minWidth:0,gap:3 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8,minWidth:0 }}>
                        <span style={{ fontSize:16,flexShrink:0 }}>{c.icon}</span>
                        <span style={{ fontSize:13,color:COLORS.text,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.name}</span>
                      </div>
                      {c.linkedCategories && c.linkedCategories.length > 0 && (
                        <div style={{ fontSize: 9, color: COLORS.textMuted, display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {c.linkedCategories.map(cat => (
                            <span key={cat} style={{ background: "rgba(255,255,255,0.05)", padding: "1px 5px", borderRadius: 4 }}>{cat}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:6,flexShrink:0,marginLeft:8 }}>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:11,color:over?COLORS.danger:COLORS.secondary,fontWeight:600 }}>₹{c.actual.toLocaleString("en-IN")} / ₹{c.budget.toLocaleString("en-IN")}</div>
                        <div style={{ fontSize:10,color:over?COLORS.danger:COLORS.textMuted }}>{over?`▲ ₹${(c.actual-c.budget).toLocaleString("en-IN")} over`:`₹${(c.budget-c.actual).toLocaleString("en-IN")} left`}</div>
                      </div>
                      <button onClick={(e)=>{ e.stopPropagation(); openEdit(c); }} style={{ background:`${COLORS.primary}22`,border:`1px solid ${COLORS.primary}44`,borderRadius:7,width:26,height:26,color:COLORS.primary,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>✏️</button>
                      <button onClick={(e)=>{ e.stopPropagation(); setDelId(c.id); }} style={{ background:`${COLORS.danger}18`,border:`1px solid ${COLORS.danger}33`,borderRadius:7,width:26,height:26,color:COLORS.danger,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>🗑</button>
                    </div>
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.06)",borderRadius:4,height:6,overflow:"hidden" }}>
                    <div style={{ height:"100%",width:`${pct}%`,borderRadius:4,background:over?`linear-gradient(90deg,${COLORS.danger},#FF8A8A)`:`linear-gradient(90deg,${COLORS.secondary},${COLORS.primary})`,transition:"width 1s" }}/>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <div style={{ fontSize:10,color:COLORS.textMuted }}>{pct.toFixed(0)}% used</div>
                    {isOverpacing && (
                      <div style={{ fontSize: 9, color: "#F59E0B", fontWeight: 500, display: "flex", alignItems: "center", gap: 3 }}>
                        ⚠️ Over pacing (Day {currentDay}/{daysInMonth})
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${COLORS.border}`, cursor: "default" }} onClick={e => e.stopPropagation()}>
                      <div style={{ fontSize: 10, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Expenses Breakup ({(() => {
                        const linked = c.linkedCategories || [];
                        const matching = budgetPeriodExp.filter(e => {
                          if (linked.length > 0) return linked.includes(e.cat || e.category);
                          if (e.cat === c.name || e.category === c.name) return true;
                          return Object.entries(catMap).some(([cat,names])=>names.includes(c.name)&&(e.cat===cat || e.category===cat));
                        });
                        return matching.length;
                      })()})</div>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto", paddingRight: 4 }}>
                        {(() => {
                          const linked = c.linkedCategories || [];
                          const matching = budgetPeriodExp.filter(e => {
                            if (linked.length > 0) return linked.includes(e.cat || e.category);
                            if (e.cat === c.name || e.category === c.name) return true;
                            return Object.entries(catMap).some(([cat,names])=>names.includes(c.name)&&(e.cat===cat || e.category===cat));
                          });
                          
                          if (matching.length === 0) return <div style={{ fontSize: 11, color: COLORS.textMuted }}>No transactions found in this period.</div>;
                          
                          return matching.map((e, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(0,0,0,0.15)", borderRadius: 8, border: `1px solid rgba(255,255,255,0.02)` }}>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{e.name || e.merchant || e.description || e.cat}</div>
                                <div style={{ fontSize: 9, color: COLORS.textMuted }}>{e.cat || e.category} • {e.date} • {e.mode}</div>
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.danger }}>-₹{e.amount.toLocaleString("en-IN")}</div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* ── SECTION 4: Step-Up SIP Planner ──────── */}
        <SectionHeader step="4" icon="📈" title="Step-Up Investment Planner" desc="Plan how your monthly SIP should grow year-on-year (e.g. +10% each year with salary hikes)." />
        {expandedSections["4"] && (
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16, marginTop: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>📈 Step-Up / Incremental Investment Planner</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 12 }}>Ensure your investment grows yearly in tandem with your salary hikes.</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 9, color: COLORS.textMuted, display: "block", marginBottom: 3 }}>BASE SIP (₹)</label>
              <input 
                type="number" 
                value={stepUpBase} 
                onChange={e => setStepUpBase(parseFloat(e.target.value) || 0)} 
                style={{ ...iStyle, padding: "6px 8px" }} 
              />
            </div>
            <div>
              <label style={{ fontSize: 9, color: COLORS.textMuted, display: "block", marginBottom: 3 }}>STEP-UP % YEARLY</label>
              <input 
                type="number" 
                value={stepUpPct} 
                onChange={e => setStepUpPct(parseFloat(e.target.value) || 0)} 
                style={{ ...iStyle, padding: "6px 8px" }} 
              />
            </div>
            <div>
              <label style={{ fontSize: 9, color: COLORS.textMuted, display: "block", marginBottom: 3 }}>YEARS</label>
              <input 
                type="number" 
                value={stepUpYears} 
                onChange={e => setStepUpYears(parseInt(e.target.value) || 1)} 
                style={{ ...iStyle, padding: "6px 8px" }} 
              />
            </div>
          </div>

          {/* Comparison banner */}
          <div style={{ background: "rgba(255,255,255,0.03)", padding: 10, borderRadius: 8, border: `1px solid rgba(255,255,255,0.05)`, marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: COLORS.textMuted }}>Current Year Target vs. Actual Investments</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>Target: ₹{stepUpBase.toLocaleString("en-IN")}/mo</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: globalTotalInvested >= stepUpBase ? "#10B981" : "#F59E0B" }}>
                Actual: ₹{globalTotalInvested.toLocaleString("en-IN")}
              </span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 3, height: 4, overflow: "hidden", marginTop: 6 }}>
              <div style={{ height: "100%", width: `${Math.min(100, (globalTotalInvested / stepUpBase) * 100)}%`, background: globalTotalInvested >= stepUpBase ? "#10B981" : "#F59E0B" }} />
            </div>
          </div>

          {/* Future projection list */}
          <div style={{ background: "#161b2a", borderRadius: 10, padding: 8, border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: 10, fontWeight: 600, color: COLORS.textMuted, borderBottom: `1px solid rgba(255,255,255,0.05)`, paddingBottom: 4, marginBottom: 4 }}>
              <span>Year</span>
              <span style={{ textAlign: "right" }}>Monthly target</span>
              <span style={{ textAlign: "right" }}>Annual Invested</span>
            </div>
            {stepUpProjections.map((p, idx) => (
              <div key={p.year} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontSize: 11, color: idx === 0 ? COLORS.secondary : COLORS.text, padding: "4px 0", borderBottom: idx < stepUpProjections.length - 1 ? `1px solid rgba(255,255,255,0.02)` : "none" }}>
                <span>{p.year} {idx === 0 && "(Base)"}</span>
                <span style={{ textAlign: "right", fontWeight: idx === 0 ? 600 : 400 }}>₹{Math.round(p.monthly).toLocaleString("en-IN")}</span>
                <span style={{ textAlign: "right" }}>₹{Math.round(p.annualTotal).toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>


      {/* Add/Edit Modal */}
      {showForm && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
          <div style={{ background:"#0d1526",border:`1px solid rgba(108,99,255,0.25)`,borderRadius:"20px 20px 0 0",padding:"20px 18px 32px",width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <div style={{ fontSize:15,fontWeight:700,color:COLORS.text }}>{editItem?"✏️ Edit Budget":"➕ Add Budget Category"}</div>
              <button onClick={()=>setShowForm(false)} style={{ background:"rgba(255,255,255,0.07)",border:"none",borderRadius:8,width:30,height:30,color:COLORS.textMuted,cursor:"pointer",fontSize:16 }}>✕</button>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <div><label style={{ fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:5 }}>BUDGET POOL NAME *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Leisure & Fun" style={iStyle}/></div>
              <div><label style={{ fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:5 }}>MONTHLY BUDGET (₹) *</label><input type="number" inputMode="numeric" value={form.budget} onChange={e=>setForm(p=>({...p,budget:e.target.value}))} placeholder="5000" style={iStyle}/></div>
              
              <div>
                <label style={{ fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:5 }}>BUDGET TYPE</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <label style={{ fontSize: 12, color: COLORS.text, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="radio" name="budgetType" value="fixed" checked={form.type === "fixed" || !form.type} onChange={() => setForm(p => ({ ...p, type: "fixed" }))} /> Fixed
                  </label>
                  <label style={{ fontSize: 12, color: COLORS.text, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="radio" name="budgetType" value="cumulative" checked={form.type === "cumulative"} onChange={() => setForm(p => ({ ...p, type: "cumulative" }))} /> Cumulative (Period-wise)
                  </label>
                </div>
              </div>

              {/* Dynamic Categories Selection */}
              <div>
                <label style={{ fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:5 }}>LINKED EXPENSE CATEGORIES (DYNAMIC CLUBBING)</label>
                <div style={{ display:"flex",flexWrap:"wrap",gap:6,maxHeight:140,overflowY:"auto",padding:10,background:"rgba(255,255,255,0.02)",borderRadius:10,border:`1px solid ${COLORS.border}` }}>
                  {allCategories.map(cat => {
                    const isChecked = form.linkedCategories && form.linkedCategories.includes(cat);
                    return (
                      <button 
                        key={cat} 
                        type="button"
                        onClick={() => {
                          const currentLinked = form.linkedCategories || [];
                          const updatedLinked = currentLinked.includes(cat)
                            ? currentLinked.filter(c => c !== cat)
                            : [...currentLinked, cat];
                          setForm(p => ({ ...p, linkedCategories: updatedLinked }));
                        }}
                        style={{
                          background: isChecked ? `${COLORS.primary}22` : "rgba(255,255,255,0.04)",
                          border: `1px solid ${isChecked ? COLORS.primary : COLORS.border}`,
                          color: isChecked ? COLORS.text : COLORS.textMuted,
                          borderRadius: 8,
                          padding: "5px 10px",
                          fontSize: 11,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 4
                        }}
                      >
                        {isChecked ? "✓ " : "+ "} {cat}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 4 }}>Selecting categories clubs them into this budget. Leaving it empty maps matches using the budget name.</div>
              </div>

              <div>
                <label style={{ fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:8 }}>ICON</label>
                <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>{ICONS.map(ic=><button key={ic} type="button" onClick={()=>setForm(p=>({...p,icon:ic}))} style={{ fontSize:22,padding:"6px 8px",borderRadius:9,border:`1px solid ${form.icon===ic?COLORS.primary:COLORS.border}`,background:form.icon===ic?`${COLORS.primary}22`:"transparent",cursor:"pointer" }}>{ic}</button>)}</div>
              </div>
              
              <button onClick={handleSave} disabled={!form.name||!form.budget} style={{ padding:"13px",borderRadius:12,border:"none",background:(form.name&&form.budget)?`linear-gradient(135deg,${COLORS.primary},#8B5CF6)`:"rgba(255,255,255,0.08)",color:(form.name&&form.budget)?"#fff":COLORS.textMuted,fontSize:14,fontWeight:700,cursor:(form.name&&form.budget)?"pointer":"not-allowed",marginTop:8 }}>{editItem?"Update":"Save Category"}</button>
            </div>
          </div>
        </div>
      )}
      {delId && <ConfirmDialog msg="Remove this budget category?" onConfirm={()=>{setBudgets(p=>p.filter(b=>b.id!==delId));setDelId(null);}} onCancel={()=>setDelId(null)} />}
    </div>
  );
}

// ─── Live Investments View ────────────────────────────────────────────────────
const INV_SEED = [];
const INV_TYPES = ["Mutual Fund","Stock","Fixed Deposit","Gold","PPF","NPS","EPF","Crypto","Real Estate","Other"];

const toLocalYYYYMMDD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseLocalYYYYMMDD = (str) => {
  if (!str) return null;
  const parts = str.split('-');
  if (parts.length !== 3) return new Date(str);
  const [y, m, d] = parts.map(Number);
  return new Date(y, m - 1, d);
};

const formatLocalDateString = (dateStr) => {
  if (!dateStr) return "";
  let cleanStr = dateStr;
  if (dateStr.includes('T')) {
    cleanStr = dateStr.split('T')[0];
  }
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${d} ${months[m - 1]} ${y}`;
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const getDueInvestments = (invList) => {
  if (!invList) return [];
  const due = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  
  invList.forEach(inv => {
    if (inv.status === "Paused" || inv.status === "Closed" || !inv.startDate) return;
    const [sY, sM, sD] = inv.startDate.split('-');
    const start = new Date(sY, sM - 1, sD);
    
    let nextDate = new Date(start);
    let limit = 0;
    const cycle = inv.cycle || "Monthly";
    if (cycle === "One-Time" || inv.type === "Fixed Deposit" || inv.type === "Mutual Fund Lumpsum" || inv.type === "Stock/Equity" || inv.type === "Other (One-Time)") {
      if (inv.payments && inv.payments.length > 0) return;
      if (start <= today) {
        due.push({ invId: inv.id, name: inv.name, provider: inv.provider||"", amount: parseFloat(inv.emiAmount) || inv.amount || inv.invested, dueDate: inv.startDate, cycle: "One-Time", icon: inv.icon, color: inv.color, type: inv.type, item: inv, bankId: inv.bankId });
      }
      return;
    }
    
    while (nextDate <= today && limit < 1000) {
      if (inv.endDate && nextDate > new Date(inv.endDate)) break;
      const nextDateStr = toLocalYYYYMMDD(nextDate);
      const isPaid = inv.payments && inv.payments.some(p => p.date === nextDateStr);
      if (!isPaid) {
        due.push({ invId: inv.id, name: inv.name, provider: inv.provider||"", amount: parseFloat(inv.emiAmount) || inv.amount || inv.invested, dueDate: nextDateStr, cycle: cycle, icon: inv.icon, color: inv.color, type: inv.type, item: inv, bankId: inv.bankId });
      }
      if (cycle === "Quarterly") nextDate.setMonth(nextDate.getMonth() + 3);
      else if (cycle === "Half-Yearly") nextDate.setMonth(nextDate.getMonth() + 6);
      else if (cycle === "Annually") nextDate.setFullYear(nextDate.getFullYear() + 1);
      else nextDate.setMonth(nextDate.getMonth() + 1);
      limit++;
    }
  });
  return due;
};

const getDueInsurancePayouts = (insList) => {
  if (!insList) return [];
  const due = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  
  insList.forEach(inv => {
    if (inv.status === "Paused" || inv.status === "Closed" || !inv.hasPayout) return;
    const cycle = inv.payoutCycle || "Monthly";

    if (cycle === "Custom Schedule") {
      (inv.customPayouts || []).forEach(cp => {
        if (!cp.date || !cp.amount) return;
        const [sY, sM, sD] = cp.date.split('-');
        const cpDate = new Date(sY, sM - 1, sD);
        if (cpDate <= today) {
          const alreadyPaid = inv.incomePayments && inv.incomePayments.some(p => p.date === cp.date);
          if (!alreadyPaid) {
            due.push({ insId: inv.id, name: inv.name, provider: inv.provider||"", amount: parseFloat(cp.amount), dueDate: cp.date, cycle: "Custom", icon: inv.icon, color: inv.color, type: inv.type, item: inv, bankId: inv.bankId });
          }
        }
      });
      return;
    }

    if (!inv.payoutStartDate || !inv.payoutAmount) return;
    const [sY, sM, sD] = inv.payoutStartDate.split('-');
    const start = new Date(sY, sM - 1, sD);
    
    let nextDate = new Date(start);
    let limit = 0;
    
    while (nextDate <= today && limit < 1000) {
      const dStr = nextDate.toISOString().split('T')[0];
      const alreadyPaid = inv.incomePayments && inv.incomePayments.some(p => p.date === dStr);
      
      if (!alreadyPaid) {
        due.push({ insId: inv.id, name: inv.name, provider: inv.provider||"", amount: parseFloat(inv.payoutAmount), dueDate: dStr, cycle: cycle, icon: inv.icon, color: inv.color, type: inv.type, item: inv, bankId: inv.bankId });
      }
      
      if (cycle === "Monthly") nextDate.setMonth(nextDate.getMonth() + 1);
      else if (cycle === "Quarterly") nextDate.setMonth(nextDate.getMonth() + 3);
      else if (cycle === "Half-Yearly") nextDate.setMonth(nextDate.getMonth() + 6);
      else if (cycle === "Annually") nextDate.setFullYear(nextDate.getFullYear() + 1);
      
      limit++;
    }
  });
  return due;
};

function InvestmentsViewLive({ investments, setInvestments, goals, banks, creditCards, expenses, incomes }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [invFilter, setInvFilter] = useState("All");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const [form, setForm] = useState({ name:"", provider:"", type:"Mutual Fund SIP", icon:"📈", amount:"", current:"", interestRate:"", maturityAmount:"", startDate: new Date().toISOString().split('T')[0], endDate:"", remarks:"", linkedGoal:"", docName:"", docData:"", status:"Active", color:COLORS.secondary });

  const ledgerItem = editItem ? {
    ...editItem,
    ...form,
    amount: parseFloat(form.amount || form.invested || form.emiAmount || 0) || 0
  } : null;

  const totalInvested = investments ? investments.reduce((sum, inv) => {
      const paid = inv.payments ? inv.payments.reduce((s, p) => s + p.amount, 0) : 0;
      return sum + (paid > 0 ? paid : (inv.invested || 0));
  }, 0) : 0;
  
  const totalCurrent = investments ? investments.reduce((sum, inv) => sum + (inv.current || inv.invested || 0), 0) : 0;
  const totalGain = totalCurrent - totalInvested;
  const gainPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : 0;

  const handleSave = () => {
    if (!form.name || !form.startDate || !form.emiAmount) return alert("Name, Payable Amount, and Start Date are required.");
    const amt = parseFloat(form.amount || form.invested || form.emiAmount || 0);
    const item = { ...form, amount: amt, invested: amt, current: parseFloat(form.current || amt) };
    if (editItem) {
      setInvestments(p => p.map(i => i.id === editItem.id ? { ...i, ...item } : i));
    } else {
      setInvestments(p => [...(p||[]), { ...item, id: "inv" + Date.now(), payments: [], incomePayments: [], trxNo: item.trxNo || getNextTrxNo("INV", p) }]);
    }
    setShowForm(false);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this investment?")) { setInvestments(p => p.filter(i => i.id !== id)); setShowForm(false); }
  };

  const displayedInvestments = invFilter === "All" ? investments : (investments || []).filter(i => i.type === invFilter);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:18,fontWeight:700,color:COLORS.text }}>Banking & Investments</div>
          <div style={{ fontSize:12,color:COLORS.textMuted }}>{investments?investments.length:0} holdings · Live tracking</div>
        </div>
        <button onClick={() => { setEditItem(null); setForm({ name:"", provider:"", type:"Mutual Fund SIP", cycle:"Monthly", icon:"📈", amount:"", current:"", interestRate:"", maturityAmount:"", startDate: new Date().toISOString().split('T')[0], endDate:"", remarks:"", linkedGoal:"", docName:"", docData:"", status:"Active", color:COLORS.secondary, hasPayout: false, payoutAmount: "", payoutCycle: "Monthly", payoutStartDate: new Date().toISOString().split('T')[0], customPayouts: [] }); setShowForm(true); }} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add Investment</button>
      </div>

      {showForm && !editItem && (
<div style={{ background: "#1a2236", padding: 16, borderRadius: 12, marginBottom: 16, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Investment Name</label><input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="e.g. HDFC RD" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Bank / Provider</label><input value={form.provider} onChange={e=>setForm({...form, provider: e.target.value})} placeholder="e.g. HDFC Bank" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Type</label><select value={form.type} onChange={e=>setForm({...form, type: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="Recurring Deposit">Recurring Deposit (RD)</option><option value="Fixed Deposit">Fixed Deposit (FD)</option><option value="Mutual Fund SIP">Mutual Fund SIP</option><option value="Mutual Fund">Mutual Fund (Lumpsum)</option><option value="Stock">Stock/Equity</option><option value="Gold">Gold</option><option value="PPF">PPF</option><option value="Other">Other</option></select></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity: form.type === "Recurring Deposit" ? 0.5 : 1 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Amount / Principal (₹)</label>
              <input 
                type="number" 
                value={form.type === "Recurring Deposit" ? "" : form.amount} 
                onChange={e=>setForm({...form, amount: e.target.value})} 
                placeholder={form.type === "Recurring Deposit" ? "Not applicable" : "Principal or Monthly"} 
                disabled={form.type === "Recurring Deposit"} 
                style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8, cursor: form.type === "Recurring Deposit" ? "not-allowed" : "auto" }} 
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity: form.type === "Recurring Deposit" ? 0.5 : 1 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Current Value (₹)</label>
              <input 
                type="number" 
                value={form.type === "Recurring Deposit" ? "" : form.current} 
                onChange={e=>setForm({...form, current: e.target.value})} 
                placeholder={form.type === "Recurring Deposit" ? "Not applicable" : "Current Value"} 
                disabled={form.type === "Recurring Deposit"} 
                style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8, cursor: form.type === "Recurring Deposit" ? "not-allowed" : "auto" }} 
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Start Date</label><input type="date" value={form.startDate||""} onChange={e=>setForm({...form, startDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>End Date</label><input type="date" value={form.endDate||""} onChange={e=>setForm({...form, endDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Interest Rate (%)</label><input type="number" value={form.interestRate||""} onChange={e=>setForm({...form, interestRate: e.target.value})} placeholder="e.g. 7.1" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Maturity Amount (₹)</label><input type="number" value={form.maturityAmount||""} onChange={e=>setForm({...form, maturityAmount: e.target.value})} placeholder="e.g. 150000" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Cycle</label><select value={form.cycle||"Monthly"} onChange={e=>setForm({...form, cycle: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option><option value="Half-Yearly">Half-Yearly</option><option value="Annually">Annually</option><option value="One-Time">One-Time</option></select></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Installment / Payable Amount (₹) *</label><input type="number" value={form.emiAmount||""} onChange={e=>setForm({...form, emiAmount: e.target.value})} placeholder="Amount to pay/invest" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Deduction Bank Account</label>
              <select value={form.bankId||""} onChange={e=>setForm({...form, bankId: e.target.value})} style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${COLORS.border}`, padding: "10px 14px", color: COLORS.text, fontSize: 13, borderRadius: 12, width: "100%", outline: "none" }}>
                  <option value="">� Select Account �</option>
                  <optgroup label="Bank Accounts">
                    {(banks||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </optgroup>
                  <optgroup label="Credit Cards">
                    {(creditCards||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                </select>
            </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>More Information / Purpose</label><input value={form.remarks||""} onChange={e=>setForm({...form, remarks: e.target.value})} placeholder="Purpose of investment" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Linked Goal</label><select value={form.linkedGoal||""} onChange={e=>setForm({...form, linkedGoal: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="">— None —</option>{(goals||[]).map(g => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}</select></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Upload Certificate</label>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => {
                const file = e.target.files[0];
                if (file && file.size <= 2.5 * 1024 * 1024) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setForm({...form, docName: file.name, docData: ev.target.result});
                  reader.readAsDataURL(file);
                }
              }} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "5px 12px", borderRadius: 8 }} />
              {form.docName && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
                  <div style={{fontSize:11, color:COLORS.primary}}>📎 {form.docName}</div>
                  {form.docData && <button onClick={()=>{const a=document.createElement('a');a.href=form.docData;a.download=form.docName;a.click();}} style={{ background: "transparent", color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontSize: 10 }}>Download</button>}
                </div>
              )}
            </div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16, padding: 12, background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.text, fontSize: 13, fontWeight: 600 }}>
              <span>Provides Periodic Returns / Income Payouts?</span>
              <select value={form.hasPayout ? "Yes" : "No"} onChange={e => setForm({...form, hasPayout: e.target.value === "Yes"})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "6px 12px", borderRadius: 6, marginLeft: "auto", outline: "none", cursor: "pointer", fontWeight: 600 }}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            {form.hasPayout && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(16, 185, 129, 0.2)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, color: COLORS.textMuted }}>Payout Schedule Type</label>
                  <select value={form.payoutCycle||"Monthly"} onChange={e=>setForm({...form, payoutCycle: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Annually">Annually</option>
                    <option value="Custom Schedule">Custom Schedule (Dynamic)</option>
                  </select>
                </div>
                
                {form.payoutCycle !== "Custom Schedule" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Payout Amount (₹) *</label><input type="number" value={form.payoutAmount||""} onChange={e=>setForm({...form, payoutAmount: e.target.value})} placeholder="Amount received" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>First Payout Date</label><input type="date" value={form.payoutStartDate||""} onChange={e=>setForm({...form, payoutStartDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 10, color: COLORS.textMuted }}>Custom Payout Dates & Amounts</label>
                    {(form.customPayouts || []).map((cp, idx) => (
                      <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="date" value={cp.date} onChange={e => {
                          const n = [...(form.customPayouts || [])];
                          n[idx].date = e.target.value;
                          setForm({...form, customPayouts: n});
                        }} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8, flex: 1 }} />
                        <input type="number" value={cp.amount} onChange={e => {
                          const n = [...(form.customPayouts || [])];
                          const newAmt = e.target.value;
                          n[idx].amount = newAmt;
                          for (let i = idx + 1; i < n.length; i++) { n[i].amount = newAmt; }
                          setForm({ ...form, customPayouts: n });
                        }} placeholder="Amount" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8, flex: 1 }} />
                        <button onClick={() => {
                          const n = [...(form.customPayouts || [])];
                          n.splice(idx, 1);
                          setForm({...form, customPayouts: n});
                        }} style={{ background: "transparent", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 16 }}>×</button>
                      </div>
                    ))}
                    <button onClick={() => {
                      const cps = form.customPayouts || [];
                      let nextDate = new Date().toISOString().split('T')[0];
                      let nextAmt = "";
                      if (cps.length > 0) {
                        const last = cps[cps.length - 1];
                        if (last.date) {
                          const d = new Date(last.date);
                          d.setFullYear(d.getFullYear() + 1);
                          nextDate = d.toISOString().split('T')[0];
                        }
                        nextAmt = last.amount;
                      }
                      setForm({...form, customPayouts: [...cps, { date: nextDate, amount: nextAmt }]});
                    }} style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "none", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>+ Add Next Payout</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleSave} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ background: "transparent", color: COLORS.textMuted, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            {editItem && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
                <button onClick={() => setForm({...form, status: form.status === "Paused" ? "Active" : form.status === "Closed" ? "Active" : "Paused"})} style={{ background: form.status === "Active" || !form.status ? "#f59e0b" : "#10b981", color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>
                  {form.status === "Active" || !form.status ? "⏸ Pause" : "▶ Resume"}
                </button>
                <button onClick={() => setForm({...form, status: "Closed"})} style={{ background: COLORS.accent, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>
                  Close / Mature
                </button>
                <button onClick={() => setDeleteConfirm({ item: editItem, step: 1 })} style={{ background: COLORS.danger, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Delete</button>
              </div>
            )}
          </div>
        </div>
)}
<div style={{ display:"grid",gridTemplateColumns:"repeat(3,minmax(80px,1fr))",gap:9,marginBottom:14 }}>
        {[{l:"Total Invested",v:`₹${(totalInvested/1000).toFixed(1)}K`,c:COLORS.textMuted},{l:"Current Value",v:`₹${(totalCurrent/1000).toFixed(1)}K`,c:COLORS.text},{l:`Gain (${gainPct}%)`,v:`${totalGain>=0?"+":""}₹${(totalGain/1000).toFixed(1)}K`,c:totalGain>=0?COLORS.secondary:COLORS.danger}].map(s=>(
          <div key={s.l} style={{ background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:11,padding:"10px 12px" }}>
            <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:3 }}>{s.l}</div>
            <div style={{ fontSize:14,fontWeight:700,color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:8, marginBottom:16 }}>
        {["All","Mutual Fund SIP","Stock","Fixed Deposit","Recurring Deposit","Gold","PPF","Other"].map(c => (
          <div key={c} onClick={() => setInvFilter(c)} style={{ whiteSpace:"nowrap", padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", background: invFilter===c ? COLORS.primary : "#1e293b", color: invFilter===c ? "#fff" : COLORS.textMuted }}>{c}</div>
        ))}
      </div>


      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12 }}>
        {displayedInvestments && displayedInvestments.map((inv,i) => {
          const paidAmt = inv.payments ? inv.payments.reduce((s,p)=>s+p.amount,0) : (inv.invested || 0);
          const isLump = (inv.type === "Fixed Deposit" || inv.type === "Mutual Fund Lumpsum" || inv.type === "Stock" || inv.type === "Gold" || inv.type === "Other (One-Time)");
          const pct = inv.maturityAmount ? Math.min(100, (paidAmt / inv.maturityAmount)*100) : 0;
          const curr = inv.current || inv.invested || 0;
          const gain = curr - paidAmt;
          const gPct = paidAmt > 0 ? ((gain / paidAmt)*100).toFixed(1) : 0;
          
          return (
          <Fragment key={i}>
            <div onClick={() => { setEditItem(inv); setForm({ ...inv, amount: parseFloat(inv.emiAmount) || inv.amount || inv.invested }); setShowForm(true); }} style={{ background:"#1a2236",borderRadius:12,border:`1px solid ${COLORS.border}`,position:"relative",overflow:"hidden",cursor:"pointer", opacity: inv.status==="Active"||!inv.status?1:0.6 }}>
            <div style={{ position:"absolute",left:0,top:0,bottom:0,width:4,background:inv.color||COLORS.primary }} />
            <div style={{ padding:12,paddingLeft:16 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                <div style={{ fontSize:20 }}>{inv.icon||"🏦"}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {inv.status && inv.status !== "Active" && <div style={{ fontSize:9,background:"#f59e0b33",color:"#f59e0b",padding:"2px 8px",borderRadius:12 }}>{inv.status}</div>}
                  <div style={{ fontSize:9,background:"rgba(255,255,255,0.1)",padding:"2px 8px",borderRadius:12,color:COLORS.textMuted }}>{inv.type}</div>
                </div>
              </div>
              <div style={{ fontSize:13,fontWeight:600,color:COLORS.text,marginBottom:2 }}>{inv.name}</div>
              <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:8 }}>{inv.provider || "Portfolio"}</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                <div>
                  <div style={{ fontSize:16,fontWeight:700,color:inv.color||COLORS.primary,marginBottom:2 }}>₹{(isLump ? (parseFloat(inv.invested||inv.amount||0)) : (parseFloat(inv.emiAmount||inv.amount||inv.invested||0))).toLocaleString("en-IN")}<span style={{fontSize:10,fontWeight:400,color:COLORS.textMuted}}>{isLump ? "" : "/mo"}</span></div>
                  {inv.interestRate ? <div style={{ fontSize:10,color:COLORS.success }}>{inv.interestRate}% Interest</div> : <div style={{ fontSize:10,color:gain>=0?COLORS.secondary:COLORS.danger }}>{gain>=0?"+":""}₹{gain.toLocaleString("en-IN")} ({gPct}%)</div>}
                </div>
                {inv.maturityAmount ? (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize:12,fontWeight:700,color:COLORS.text }}>₹{Number(inv.maturityAmount).toLocaleString("en-IN")}</div>
                    <div style={{ fontSize:9,color:COLORS.textMuted }}>Maturity Value</div>
                  </div>
                ) : (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize:12,fontWeight:700,color:COLORS.text }}>₹{Number(curr).toLocaleString("en-IN")}</div>
                    <div style={{ fontSize:9,color:COLORS.textMuted }}>Current Value</div>
                  </div>
                )}
              </div>
              {inv.maturityAmount && (
                <div style={{ marginTop: 12, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: inv.color||COLORS.primary, borderRadius: 2 }} />
                </div>
              )}
              <div style={{ marginTop: 4, fontSize: 9, color: COLORS.textMuted, textAlign: "right" }}>Total Paid: ₹{paidAmt.toLocaleString("en-IN")}</div>
            </div>
          </div>

            {showForm && editItem?.id === inv.id && (
<div style={{ gridColumn: '1 / -1' }}>
<div style={{ display: "flex", gap: 24, marginBottom: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
<div style={{ flex: "1 1 60%", background: "#1a2236", padding: 16, borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Investment Name</label><input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="e.g. HDFC RD" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Bank / Provider</label><input value={form.provider} onChange={e=>setForm({...form, provider: e.target.value})} placeholder="e.g. HDFC Bank" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Type</label><select value={form.type} onChange={e=>setForm({...form, type: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="Recurring Deposit">Recurring Deposit (RD)</option><option value="Fixed Deposit">Fixed Deposit (FD)</option><option value="Mutual Fund SIP">Mutual Fund SIP</option><option value="Mutual Fund">Mutual Fund (Lumpsum)</option><option value="Stock">Stock/Equity</option><option value="Gold">Gold</option><option value="PPF">PPF</option><option value="Other">Other</option></select></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity: form.type === "Recurring Deposit" ? 0.5 : 1 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Amount / Principal (₹)</label>
              <input 
                type="number" 
                value={form.type === "Recurring Deposit" ? "" : form.amount} 
                onChange={e=>setForm({...form, amount: e.target.value})} 
                placeholder={form.type === "Recurring Deposit" ? "Not applicable" : "Principal or Monthly"} 
                disabled={form.type === "Recurring Deposit"} 
                style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8, cursor: form.type === "Recurring Deposit" ? "not-allowed" : "auto" }} 
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity: form.type === "Recurring Deposit" ? 0.5 : 1 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Current Value (₹)</label>
              <input 
                type="number" 
                value={form.type === "Recurring Deposit" ? "" : form.current} 
                onChange={e=>setForm({...form, current: e.target.value})} 
                placeholder={form.type === "Recurring Deposit" ? "Not applicable" : "Current Value"} 
                disabled={form.type === "Recurring Deposit"} 
                style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8, cursor: form.type === "Recurring Deposit" ? "not-allowed" : "auto" }} 
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Start Date</label><input type="date" value={form.startDate||""} onChange={e=>setForm({...form, startDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>End Date</label><input type="date" value={form.endDate||""} onChange={e=>setForm({...form, endDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Interest Rate (%)</label><input type="number" value={form.interestRate||""} onChange={e=>setForm({...form, interestRate: e.target.value})} placeholder="e.g. 7.1" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Maturity Amount (₹)</label><input type="number" value={form.maturityAmount||""} onChange={e=>setForm({...form, maturityAmount: e.target.value})} placeholder="e.g. 150000" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Cycle</label><select value={form.cycle||"Monthly"} onChange={e=>setForm({...form, cycle: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option><option value="Half-Yearly">Half-Yearly</option><option value="Annually">Annually</option><option value="One-Time">One-Time</option></select></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Installment / Payable Amount (₹) *</label><input type="number" value={form.emiAmount||""} onChange={e=>setForm({...form, emiAmount: e.target.value})} placeholder="Amount to pay/invest" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Deduction Bank Account</label>
              <select value={form.bankId||""} onChange={e=>setForm({...form, bankId: e.target.value})} style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${COLORS.border}`, padding: "10px 14px", color: COLORS.text, fontSize: 13, borderRadius: 12, width: "100%", outline: "none" }}>
                  <option value="">� Select Account �</option>
                  <optgroup label="Bank Accounts">
                    {(banks||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </optgroup>
                  <optgroup label="Credit Cards">
                    {(creditCards||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                </select>
            </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>More Information / Purpose</label><input value={form.remarks||""} onChange={e=>setForm({...form, remarks: e.target.value})} placeholder="Purpose of investment" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Linked Goal</label><select value={form.linkedGoal||""} onChange={e=>setForm({...form, linkedGoal: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="">— None —</option>{(goals||[]).map(g => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}</select></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Upload Certificate</label>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => {
                const file = e.target.files[0];
                if (file && file.size <= 2.5 * 1024 * 1024) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setForm({...form, docName: file.name, docData: ev.target.result});
                  reader.readAsDataURL(file);
                }
              }} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "5px 12px", borderRadius: 8 }} />
              {form.docName && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
                  <div style={{fontSize:11, color:COLORS.primary}}>📎 {form.docName}</div>
                  {form.docData && <button onClick={()=>{const a=document.createElement('a');a.href=form.docData;a.download=form.docName;a.click();}} style={{ background: "transparent", color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontSize: 10 }}>Download</button>}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16, padding: 12, background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.text, fontSize: 13, fontWeight: 600 }}>
              <span>Provides Periodic Returns / Income Payouts?</span>
              <select value={form.hasPayout ? "Yes" : "No"} onChange={e => setForm({...form, hasPayout: e.target.value === "Yes"})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "6px 12px", borderRadius: 6, marginLeft: "auto", outline: "none", cursor: "pointer", fontWeight: 600 }}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            {form.hasPayout && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(16, 185, 129, 0.2)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, color: COLORS.textMuted }}>Payout Schedule Type</label>
                  <select value={form.payoutCycle||"Monthly"} onChange={e=>setForm({...form, payoutCycle: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Annually">Annually</option>
                    <option value="Custom Schedule">Custom Schedule (Dynamic)</option>
                  </select>
                </div>
                
                {form.payoutCycle !== "Custom Schedule" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Payout Amount (₹) *</label><input type="number" value={form.payoutAmount||""} onChange={e=>setForm({...form, payoutAmount: e.target.value})} placeholder="Amount received" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>First Payout Date</label><input type="date" value={form.payoutStartDate||""} onChange={e=>setForm({...form, payoutStartDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 10, color: COLORS.textMuted }}>Custom Payout Dates & Amounts</label>
                    {(form.customPayouts || []).map((cp, idx) => (
                      <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="date" value={cp.date} onChange={e => {
                          const n = [...(form.customPayouts || [])];
                          n[idx].date = e.target.value;
                          setForm({...form, customPayouts: n});
                        }} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8, flex: 1 }} />
                        <input type="number" value={cp.amount} onChange={e => {
                          const n = [...(form.customPayouts || [])];
                          const newAmt = e.target.value;
                          n[idx].amount = newAmt;
                          for (let i = idx + 1; i < n.length; i++) { n[i].amount = newAmt; }
                          setForm({ ...form, customPayouts: n });
                        }} placeholder="Amount" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8, flex: 1 }} />
                        <button onClick={() => {
                          const n = [...(form.customPayouts || [])];
                          n.splice(idx, 1);
                          setForm({...form, customPayouts: n});
                        }} style={{ background: "transparent", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 16 }}>×</button>
                      </div>
                    ))}
                    <button onClick={() => {
                      const cps = form.customPayouts || [];
                      let nextDate = new Date().toISOString().split('T')[0];
                      let nextAmt = "";
                      if (cps.length > 0) {
                        const last = cps[cps.length - 1];
                        if (last.date) {
                          const d = new Date(last.date);
                          d.setFullYear(d.getFullYear() + 1);
                          nextDate = d.toISOString().split('T')[0];
                        }
                        nextAmt = last.amount;
                      }
                      setForm({...form, customPayouts: [...cps, { date: nextDate, amount: nextAmt }]});
                    }} style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "none", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>+ Add Next Payout</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleSave} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ background: "transparent", color: COLORS.textMuted, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            {editItem && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
                <button onClick={() => setForm({...form, status: form.status === "Paused" ? "Active" : form.status === "Closed" ? "Active" : "Paused"})} style={{ background: form.status === "Active" || !form.status ? "#f59e0b" : "#10b981", color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>
                  {form.status === "Active" || !form.status ? "⏸ Pause" : "▶ Resume"}
                </button>
                <button onClick={() => setForm({...form, status: "Closed"})} style={{ background: COLORS.accent, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>
                  Close / Mature
                </button>
                <button onClick={() => setDeleteConfirm({ item: editItem, step: 1 })} style={{ background: COLORS.danger, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Delete</button>
              </div>
            )}
          </div>
        </div>
        
          {(() => {
            if (!ledgerItem) return <div style={{ flex: "1 1 35%" }}></div>;
            const getDue = () => {
              const cycle = ledgerItem.cycle || "Monthly";
              if (cycle === "One-Time") return [];
              const lumpTypes = ["Mutual Fund Lumpsum", "Stock", "Other (One-Time)"];
              if (lumpTypes.includes(ledgerItem.type) && cycle === "Monthly") return [];
              const d = parseLocalYYYYMMDD(ledgerItem.startDate);
              if (!d || isNaN(d.getTime())) return [];
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              let dues = [];
              let cycleMonths = cycle === "Monthly" ? 1 : cycle === "Quarterly" ? 3 : cycle === "Half-Yearly" ? 6 : 12;
              const payments = ledgerItem.payments || [];
              while (d <= now) {
                const nextDateStr = toLocalYYYYMMDD(d);
                let paid = payments.some(p => p.date === nextDateStr);
                if (!paid) {
                  dues.push({ 
                    ...ledgerItem, 
                    dueDate: nextDateStr, 
                    amount: parseFloat(ledgerItem.emiAmount) || ledgerItem.amount || ledgerItem.invested 
                  });
                }
                d.setMonth(d.getMonth() + cycleMonths);
              }
              return dues;
            };
            const dues = getDue();
            const payments = ledgerItem.payments || [];
            const incomePayments = (incomes || []).filter(inc => inc.linkedPayout && inc.linkedPayout.type === 'investment' && inc.linkedPayout.itemId === ledgerItem.id).map(inc => ({ date: inc.linkedPayout.date || inc.date, amount: inc.amount, incomeId: inc.id }));
            const historyItems = [
              ...payments.map(p => ({ ...p, type: 'paid', dateObj: new Date(p.date) })),
              ...incomePayments.map(p => ({ ...p, type: 'received', dateObj: new Date(p.date) }))
            ].sort((a, b) => b.dateObj - a.dateObj);
            
            const groupedHistory = {};
            historyItems.forEach(p => {
              const dStr = p.date;
              if (!groupedHistory[dStr]) groupedHistory[dStr] = { date: dStr, dateObj: p.dateObj, paid: 0, received: 0, items: [] };
              if (p.type === 'paid') {
                 groupedHistory[dStr].paid += (parseFloat(p.amount) || 0);
              } else {
                 groupedHistory[dStr].received += (parseFloat(p.amount) || 0);
              }
              groupedHistory[dStr].items.push(p);
            });
            const groupedHistoryArray = Object.values(groupedHistory).sort((a,b) => b.dateObj - a.dateObj);
            
            const totalPaidHistory = payments.reduce((sum, p) => sum + (parseFloat(p.amount)||0), 0);
            const totalReceivedHistory = incomePayments.reduce((sum, p) => sum + (parseFloat(p.amount)||0), 0);
            
            // Get payouts for this specific investment
            const thisInvPayouts = getDueInvestmentPayouts(ledgerItem ? [ledgerItem] : []);
            const today_rp = new Date(); today_rp.setHours(0,0,0,0);
            const overduePayable = dues.filter(d => { const [y,m,dd] = d.dueDate.split('-').map(Number); const dt = new Date(y,m-1,dd); dt.setHours(0,0,0,0); return dt < today_rp; });
            const dueThisMonthPayable = dues.filter(d => { const [y,m,dd] = d.dueDate.split('-').map(Number); const dt = new Date(y,m-1,dd); dt.setHours(0,0,0,0); return dt.getMonth() === today_rp.getMonth() && dt.getFullYear() === today_rp.getFullYear() && dt >= today_rp; });
            const overdueReceivable = thisInvPayouts.filter(d => { const [y,m,dd] = d.dueDate.split('-').map(Number); const dt = new Date(y,m-1,dd); dt.setHours(0,0,0,0); return dt < today_rp; });
            const dueThisMonthReceivable = thisInvPayouts.filter(d => { const [y,m,dd] = d.dueDate.split('-').map(Number); const dt = new Date(y,m-1,dd); dt.setHours(0,0,0,0); return dt.getMonth() === today_rp.getMonth() && dt.getFullYear() === today_rp.getFullYear() && dt >= today_rp; });
            const totalPayOD = overduePayable.reduce((s,d) => s + (parseFloat(d.amount)||0), 0);
            const totalPayDue = dueThisMonthPayable.reduce((s,d) => s + (parseFloat(d.amount)||0), 0);
            const totalRecvOD = overdueReceivable.reduce((s,d) => s + (parseFloat(d.amount)||0), 0);
            const totalRecvDue = dueThisMonthReceivable.reduce((s,d) => s + (parseFloat(d.amount)||0), 0);
            const hasPayable = dues.length > 0;
            const hasReceivable = thisInvPayouts.length > 0;
            const hasLedger = historyItems.length > 0;
            
            return (
              <div style={{ flex: "1 1 35%", position: "sticky", top: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                {/* ── Box 1: Payable – Installments / Premiums ── */}
                <div style={{ background: "linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(245, 158, 11, 0.04) 100%)", border: `1px solid rgba(239, 68, 68, 0.25)`, borderRadius: 14, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>💸</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>Payable – Installments</div>
                      <div style={{ fontSize: 9, color: COLORS.textMuted }}>{dues.length} pending</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    {totalPayOD > 0 && <div style={{ flex: 1, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 8, padding: "6px 8px" }}>
                      <div style={{ fontSize: 8, color: "#ef4444", fontWeight: 700, letterSpacing: 0.5, marginBottom: 1 }}>🚨 OVERDUE</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#ef4444" }}>₹{totalPayOD.toLocaleString("en-IN")}</div>
                      <div style={{ fontSize: 8, color: COLORS.textMuted }}>{overduePayable.length} item{overduePayable.length !== 1 ? "s" : ""}</div>
                    </div>}
                    {totalPayDue > 0 && <div style={{ flex: 1, background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: 8, padding: "6px 8px" }}>
                      <div style={{ fontSize: 8, color: "#f59e0b", fontWeight: 700, letterSpacing: 0.5, marginBottom: 1 }}>⏳ DUE THIS MONTH</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>₹{totalPayDue.toLocaleString("en-IN")}</div>
                      <div style={{ fontSize: 8, color: COLORS.textMuted }}>{dueThisMonthPayable.length} item{dueThisMonthPayable.length !== 1 ? "s" : ""}</div>
                    </div>}
                    {totalPayOD === 0 && totalPayDue === 0 && <div style={{ flex: 1, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#10b981", fontWeight: 600 }}>✅ All Caught Up!</div>
                    </div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 140, overflowY: "auto" }}>
                    {dues.slice(0, 6).map((d, idx) => {
                      const si = getDueStatusAndStyle(d.dueDate);
                      return (
                        <div key={"pay-"+idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "rgba(0,0,0,0.15)", borderRadius: 6, borderLeft: `3px solid ${si.color}` }}>
                          <div style={{ fontSize: 10, color: COLORS.text }}>{formatLocalDateString(d.dueDate)} <span style={{ color: si.color, fontWeight: 700, fontSize: 9 }}>{si.label}</span></div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: si.color }}>₹{parseFloat(d.amount).toLocaleString("en-IN")}</div>
                        </div>
                      );
                    })}
                    {dues.length > 6 && <div style={{ fontSize: 9, color: COLORS.textMuted, textAlign: "center", padding: 2 }}>+{dues.length - 6} more...</div>}
                  </div>
                </div>

                {/* ── Box 2: Receivable – Benefits / Payouts ── */}
                <div style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(59, 130, 246, 0.04) 100%)", border: `1px solid rgba(16, 185, 129, 0.25)`, borderRadius: 14, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>💰</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>Receivable – Payouts</div>
                      <div style={{ fontSize: 9, color: COLORS.textMuted }}>{thisInvPayouts.length} pending</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    {totalRecvOD > 0 && <div style={{ flex: 1, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 8, padding: "6px 8px" }}>
                      <div style={{ fontSize: 8, color: "#ef4444", fontWeight: 700, letterSpacing: 0.5, marginBottom: 1 }}>🚨 OVERDUE</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#ef4444" }}>₹{totalRecvOD.toLocaleString("en-IN")}</div>
                      <div style={{ fontSize: 8, color: COLORS.textMuted }}>{overdueReceivable.length} payout{overdueReceivable.length !== 1 ? "s" : ""}</div>
                    </div>}
                    {totalRecvDue > 0 && <div style={{ flex: 1, background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: 8, padding: "6px 8px" }}>
                      <div style={{ fontSize: 8, color: "#f59e0b", fontWeight: 700, letterSpacing: 0.5, marginBottom: 1 }}>⏳ DUE THIS MONTH</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>₹{totalRecvDue.toLocaleString("en-IN")}</div>
                      <div style={{ fontSize: 8, color: COLORS.textMuted }}>{dueThisMonthReceivable.length} payout{dueThisMonthReceivable.length !== 1 ? "s" : ""}</div>
                    </div>}
                    {totalRecvOD === 0 && totalRecvDue === 0 && <div style={{ flex: 1, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#10b981", fontWeight: 600 }}>✅ No Payouts Pending</div>
                    </div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 140, overflowY: "auto" }}>
                    {thisInvPayouts.slice(0, 6).map((d, idx) => {
                      const si = getDueStatusAndStyle(d.dueDate);
                      return (
                        <div key={"recv-"+idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "rgba(0,0,0,0.15)", borderRadius: 6, borderLeft: `3px solid ${si.color}` }}>
                          <div style={{ fontSize: 10, color: COLORS.text }}>{formatLocalDateString(d.dueDate)} <span style={{ color: si.color, fontWeight: 700, fontSize: 9 }}>{si.label}</span></div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: si.color }}>₹{parseFloat(d.amount).toLocaleString("en-IN")}</div>
                        </div>
                      );
                    })}
                    {thisInvPayouts.length > 6 && <div style={{ fontSize: 9, color: COLORS.textMuted, textAlign: "center", padding: 2 }}>+{thisInvPayouts.length - 6} more...</div>}
                  </div>
                </div>

                {/* ── Transaction Ledger ── */}
                <div style={{ background: "rgba(0,0,0,0.15)", padding: 16, borderRadius: 14, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🧾</span> Transaction Ledger
                  </div>
                  
                  <div style={{ overflowX: "auto", border: `1px solid ${COLORS.border}`, borderRadius: 8, background: "rgba(0,0,0,0.2)", maxHeight: 300, overflowY: "auto" }}>
                    <table className="excel-table">
                      <thead>
                        <tr>
                          <th>Transaction Date</th>
                          <th style={{ textAlign: "right" }}>Paid amount</th>
                          <th style={{ textAlign: "right" }}>Received Amount</th>
                          <th style={{ textAlign: "right" }}>Net value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyItems.map((p, idx) => {
                          let desc = "";
                          let paidVal = "";
                          let recvVal = "";
                          let netVal = 0;
                          let netColor = COLORS.text;
                          
                          if (p.type === 'paid') {
                            const exp = (expenses || []).find(e => e.id === p.expenseId);
                            const trxNo = exp ? exp.trxNo : "";
                            const bId = exp ? exp.bankId : null;
                            const b = bId ? [...(banks||[]), ...(creditCards||[])].find(x => x.id === bId) : null;
                            const bankName = b ? b.name : (exp ? (exp.paymentMode || "Cash") : "—");
                            desc = `Paid Installment${trxNo ? ' (' + trxNo + ')' : ''}${bankName ? ' • ' + bankName : ''}`;
                            paidVal = `₹${parseFloat(p.amount).toLocaleString("en-IN")}`;
                            netVal = -parseFloat(p.amount);
                            netColor = "#ef4444";
                          } else {
                            const inc = (incomes || []).find(i => i.id === p.incomeId);
                            const bId = inc ? inc.bankId : null;
                            const b = bId ? [...(banks||[]), ...(creditCards||[])].find(x => x.id === bId) : null;
                            const bankName = b ? b.name : "";
                            desc = `Received Payout${bankName ? ' • ' + bankName : ''}`;
                            recvVal = `₹${parseFloat(p.amount).toLocaleString("en-IN")}`;
                            netVal = parseFloat(p.amount);
                            netColor = "#10b981";
                          }
                          
                          return (
                            <tr key={"hist-row-" + idx}>
                              <td>
                                <div style={{ fontWeight: 600 }}>{formatLocalDateString(p.date)}</div>
                                <div style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 2 }}>{desc}</div>
                              </td>
                              <td style={{ textAlign: "right", color: "#ef4444", fontWeight: p.type === 'paid' ? 600 : 400 }}>
                                {paidVal || "—"}
                              </td>
                              <td style={{ textAlign: "right", color: "#3b82f6", fontWeight: p.type === 'received' ? 600 : 400 }}>
                                {recvVal || "—"}
                              </td>
                              <td style={{ textAlign: "right", color: netColor, fontWeight: 700 }}>
                                {netVal < 0 ? "-" : "+"}₹{Math.abs(netVal).toLocaleString("en-IN")}
                              </td>
                            </tr>
                          );
                        })}
                        {historyItems.length === 0 && (
                          <tr>
                            <td colSpan={4} style={{ padding: "20px", textAlign: "center", color: COLORS.textMuted }}>No transactions yet.</td>
                          </tr>
                        )}
                      </tbody>
                      {historyItems.length > 0 && (
                        <tfoot>
                          <tr>
                            <td>Total</td>
                            <td style={{ textAlign: "right", color: "#ef4444" }}>
                              ₹{totalPaidHistory.toLocaleString("en-IN")}
                            </td>
                            <td style={{ textAlign: "right", color: "#3b82f6" }}>
                              ₹{totalReceivedHistory.toLocaleString("en-IN")}
                            </td>
                            <td style={{ textAlign: "right", color: (totalReceivedHistory - totalPaidHistory) >= 0 ? "#10b981" : "#ef4444" }}>
                              {(totalReceivedHistory - totalPaidHistory) < 0 ? "-" : "+"}₹{Math.abs(totalReceivedHistory - totalPaidHistory).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
</div>
</div>
)}
          </Fragment>
        )})}
      </div>

                  {deleteConfirm && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.7)", zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, width: "90%", maxWidth: 400, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: deleteConfirm.step === 2 ? COLORS.danger : COLORS.text, marginBottom: 8 }}>
              {deleteConfirm.step === 1 ? "Delete Investment" : "⚠️ Final Warning"}
            </div>
            <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 24 }}>
              {deleteConfirm.step === 1 
                ? `Are you sure you want to delete ${deleteConfirm.item.name}?` 
                : "This will permanently erase the investment and all its records. Proceed?"}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => {
                if (deleteConfirm.step === 1) {
                  setDeleteConfirm({ ...deleteConfirm, step: 2 });
                } else {
                  setInvestments(p => p.filter(x => x.id !== deleteConfirm.item.id));
                  setDeleteConfirm(null);
                  setShowForm(false);
                }
              }} style={{ background: COLORS.danger, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>
                {deleteConfirm.step === 1 ? "Delete" : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
}
// ─── Live Goals View ──────────────────────────────────────────────────────────
const GOALS_SEED = [];
function GoalsViewLive({ goals, setGoals, investments, loans, insurance }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [delId,    setDelId]    = useState(null);
  const [activeGoal, setActiveGoal] = useState(null);
  const emptyForm = { name:"",icon:"🎯",target:"",saved:"",monthly:"",deadline:"",tip:"",color:COLORS.primary,description:"" };
  const [form, setForm] = useState(emptyForm);
  const MONTH_NAMES_S = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const iStyle = { background:"#1a2236",border:`1px solid ${COLORS.border}`,borderRadius:9,padding:"9px 12px",color:COLORS.text,fontSize:13,width:"100%",outline:"none",boxSizing:"border-box",caretColor:"#6C63FF" };
  const ICONS = ["🏠","🚗","✈️","🎓","🛡️","🌴","💍","📱","💻","🏋️","🎯","💎","🏖️","🎪","🎸"];
  const GCOLORS = [COLORS.primary,COLORS.secondary,COLORS.accent,"#8B5CF6","#06B6D4","#F59E0B","#10B981","#EC4899"];

  const openAdd  = () => { setEditItem(null); setForm({...emptyForm,color:COLORS.primary}); setShowForm(true); };
  const openEdit = (g) => { setEditItem(g); setForm({...g,target:g.target,saved:g.saved,monthly:g.monthly,description:g.description||""}); setShowForm(true); };
  const handleSave = () => {
    if(!form.name||!form.target) return;
    const item = {...form,target:parseFloat(form.target),saved:parseFloat(form.saved||0),monthly:parseFloat(form.monthly||0),description:form.description||""};
    if(editItem) setGoals(p=>p.map(g=>g.id===editItem.id?{...g,...item}:g));
    else setGoals(p=>[...p,{...item,id:"g"+Date.now()}]);
    setShowForm(false);
  };

  const fmtDeadline = d => { if(!d) return "—"; const dt=new Date(d); return `${MONTH_NAMES_S[dt.getMonth()]} ${dt.getFullYear()}`; };

  const calcAutoPaid = (item, type) => {
    if (!item.startDate) return 0;
    const start = new Date(item.startDate);
    const today = new Date();
    const end = item.endDate ? new Date(item.endDate) : today;
    const toDate = today < end ? today : end;
    if (toDate < start) return 0;
    
    let months = (toDate.getFullYear() - start.getFullYear()) * 12 + (toDate.getMonth() - start.getMonth());
    if (toDate.getDate() >= start.getDate()) months++;
    
    if (type === 'loan') {
      return months * (parseFloat(item.emiAmount) || 0);
    } else if (type === 'insurance') {
      const amt = parseFloat(item.amount) || 0;
      let cycles = 0;
      if (item.cycle === "Monthly") cycles = months;
      else if (item.cycle === "Quarterly") cycles = Math.ceil(months / 3);
      else if (item.cycle === "Half-Yearly") cycles = Math.ceil(months / 6);
      else if (item.cycle === "Annual") cycles = Math.ceil(months / 12);
      else cycles = 1;
      return cycles * amt;
    }
    return 0;
  };

  const getGoalData = (g) => {
    const manualSaved = parseFloat(g.saved || 0);
    const linkedInvestments = (investments || []).filter(inv => inv.linkedGoal === g.id);
    const investmentsSum = linkedInvestments.reduce((sum, inv) => sum + parseFloat(inv.current || inv.invested || inv.amount || 0), 0);
    
    const linkedLoans = (loans || []).filter(l => l.linkedGoal === g.id);
    const loansSum = linkedLoans.reduce((sum, l) => {
      const valuation = parseFloat(l.assetValuation || 0);
      return sum + (valuation > 0 ? valuation : calcAutoPaid(l, 'loan'));
    }, 0);
    
    const linkedInsurance = (insurance || []).filter(ins => ins.linkedGoal === g.id);
    const insuranceSum = linkedInsurance.reduce((sum, ins) => {
      const valuation = parseFloat(ins.currentValuation || 0);
      return sum + (valuation > 0 ? valuation : calcAutoPaid(ins, 'insurance'));
    }, 0);
    
    const actualValue = manualSaved + investmentsSum + loansSum + insuranceSum;
    const pct = g.target > 0 ? Math.min(Math.round((actualValue / g.target) * 100), 100) : 0;
    return { manualSaved, linkedInvestments, investmentsSum, linkedLoans, loansSum, linkedInsurance, insuranceSum, actualValue, pct };
  };

  const ag = activeGoal ? goals.find(g => g.id === activeGoal) : null;
  const agData = ag ? getGoalData(ag) : null;

  return (
    <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>

      {/* LEFT: Goal Cards */}
      <div style={{ flex: ag ? "0 0 54%" : "1 1 100%", transition:"flex 0.3s" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
          <div>
            <div style={{ fontSize:18,fontWeight:700,color:COLORS.text }}>Goal Planner</div>
            <div style={{ fontSize:12,color:COLORS.textMuted }}>{goals.length} active goals</div>
          </div>
          <button onClick={openAdd} style={{ background:`linear-gradient(135deg,${COLORS.primary},#8B5CF6)`,border:"none",borderRadius:12,padding:"9px 14px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0 }}>➕ Add Goal</button>
        </div>

        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {goals.map(g=>{
            const { manualSaved, investmentsSum, loansSum, insuranceSum, actualValue, pct } = getGoalData(g);
            const isActive = activeGoal === g.id;
            return (
              <div key={g.id} onClick={()=>setActiveGoal(isActive ? null : g.id)}
                style={{ background:isActive?`${g.color}12`:COLORS.bgCard, border:`1.5px solid ${isActive?g.color:COLORS.border}`, borderRadius:16, padding:"16px", position:"relative", overflow:"hidden", cursor:"pointer", transition:"all 0.2s" }}>
                <div style={{ position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:`${g.color}10`,pointerEvents:"none" }}/>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:10,minWidth:0,flex:1 }}>
                    <div style={{ width:42,height:42,borderRadius:12,background:`${g.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>{g.icon}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:14,fontWeight:600,color:COLORS.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{g.name}</div>
                      {g.description && <div style={{ fontSize:11,color:COLORS.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:2 }}>{g.description}</div>}
                      <div style={{ fontSize:10,color:COLORS.textMuted,marginTop:2 }}>By {fmtDeadline(g.deadline)} · ₹{g.monthly.toLocaleString("en-IN")}/mo</div>
                    </div>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:6,flexShrink:0,marginLeft:8 }}>
                    <div style={{ fontSize:20,fontWeight:800,color:g.color,minWidth:40,textAlign:"right" }}>{pct}%</div>
                    <button onClick={e=>{e.stopPropagation();openEdit(g);}} style={{ background:`${COLORS.primary}22`,border:`1px solid ${COLORS.primary}44`,borderRadius:7,width:26,height:26,color:COLORS.primary,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center" }}>✏️</button>
                    <button onClick={e=>{e.stopPropagation();setDelId(g.id);}} style={{ background:`${COLORS.danger}18`,border:`1px solid ${COLORS.danger}33`,borderRadius:7,width:26,height:26,color:COLORS.danger,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center" }}>🗑</button>
                  </div>
                </div>
                <div style={{ background:"rgba(255,255,255,0.06)",borderRadius:6,height:8,marginBottom:8,overflow:"hidden" }}>
                  <div style={{ height:"100%",width:`${pct}%`,borderRadius:6,background:`linear-gradient(90deg,${g.color}cc,${g.color})`,transition:"width 1.2s",boxShadow:`0 0 8px ${g.color}55` }}/>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:11,color:COLORS.textMuted }}>
                  <span>Actual: <b style={{ color:COLORS.text }}>₹{actualValue.toLocaleString("en-IN")}</b></span>
                  <span>Target: <b style={{ color:COLORS.text }}>₹{g.target.toLocaleString("en-IN")}</b></span>
                  <span>Remaining: <b style={{ color:g.color }}>₹{Math.max(0, g.target - actualValue).toLocaleString("en-IN")}</b></span>
                </div>
                {(manualSaved>0||investmentsSum>0||loansSum>0||insuranceSum>0) && (
                  <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginTop:8,padding:"6px 10px",background:"rgba(255,255,255,0.03)",borderRadius:8,fontSize:10.5,color:COLORS.textMuted }}>
                    <span style={{ fontWeight:600,marginRight:4 }}>Linked:</span>
                    {manualSaved>0 && <span style={{ background:"rgba(255,255,255,0.06)",borderRadius:5,padding:"2px 7px" }}>💰 Manual ₹{manualSaved.toLocaleString("en-IN")}</span>}
                    {investmentsSum>0 && <span style={{ background:"rgba(108,99,255,0.12)",borderRadius:5,padding:"2px 7px",color:COLORS.primary }}>📈 Inv ₹{investmentsSum.toLocaleString("en-IN")}</span>}
                    {loansSum>0 && <span style={{ background:"rgba(239,68,68,0.1)",borderRadius:5,padding:"2px 7px",color:COLORS.danger }}>🏦 Loan ₹{loansSum.toLocaleString("en-IN")}</span>}
                    {insuranceSum>0 && <span style={{ background:"rgba(16,185,129,0.1)",borderRadius:5,padding:"2px 7px",color:COLORS.success }}>🛡️ Ins ₹{insuranceSum.toLocaleString("en-IN")}</span>}
                  </div>
                )}
                {g.tip && <div style={{ background:`${g.color}12`,border:`1px solid ${g.color}25`,borderRadius:8,padding:"7px 10px",fontSize:10.5,color:COLORS.textMuted,marginTop:8 }}><span style={{ color:g.color,marginRight:4 }}>✦</span>{g.tip}</div>}
                {isActive && <div style={{ marginTop:6,fontSize:10,color:g.color,textAlign:"right",fontWeight:600 }}>→ Viewing linked details</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Passbook Panel */}
      {ag && agData && (
        <div style={{ flex:"0 0 44%", background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:18, overflow:"hidden", position:"sticky", top:0, maxHeight:"88vh", display:"flex", flexDirection:"column" }}>
          {/* Header */}
          <div style={{ padding:"16px 18px 12px", background:`linear-gradient(135deg,${ag.color}22,${ag.color}08)`, borderBottom:`1px solid ${COLORS.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <div style={{ width:44,height:44,borderRadius:13,background:`${ag.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>{ag.icon}</div>
                <div>
                  <div style={{ fontSize:15,fontWeight:700,color:COLORS.text }}>{ag.name}</div>
                  {ag.description && <div style={{ fontSize:10.5,color:COLORS.textMuted,marginTop:2 }}>{ag.description}</div>}
                  <div style={{ fontSize:10,color:COLORS.textMuted,marginTop:2 }}>By {fmtDeadline(ag.deadline)}</div>
                </div>
              </div>
              <button onClick={()=>setActiveGoal(null)} style={{ background:"rgba(255,255,255,0.07)",border:"none",borderRadius:8,width:28,height:28,color:COLORS.textMuted,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>✕</button>
            </div>
            <div style={{ marginTop:12 }}>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:11,color:COLORS.textMuted,marginBottom:5 }}>
                <span>Goal Progress</span><span style={{ color:ag.color,fontWeight:700 }}>{agData.pct}% complete</span>
              </div>
              <div style={{ background:"rgba(255,255,255,0.06)",borderRadius:6,height:8,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${agData.pct}%`,borderRadius:6,background:`linear-gradient(90deg,${ag.color}99,${ag.color})`,transition:"width 1s",boxShadow:`0 0 6px ${ag.color}55` }}/>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:11,marginTop:6 }}>
                <span style={{ color:COLORS.textMuted }}>Actual <b style={{ color:COLORS.text }}>₹{agData.actualValue.toLocaleString("en-IN")}</b></span>
                <span style={{ color:COLORS.textMuted }}>Target <b style={{ color:COLORS.text }}>₹{ag.target.toLocaleString("en-IN")}</b></span>
                <span style={{ color:COLORS.textMuted }}>Left <b style={{ color:ag.color }}>₹{Math.max(0,ag.target-agData.actualValue).toLocaleString("en-IN")}</b></span>
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div style={{ flex:1, overflowY:"auto", padding:"14px 16px" }}>
            {/* Summary chips */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
              {[
                { label:"Investments", val:agData.investmentsSum, color:COLORS.primary, icon:"📈", count:agData.linkedInvestments.length },
                { label:"Loans Value", val:agData.loansSum, color:COLORS.danger, icon:"🏦", count:agData.linkedLoans.length },
                { label:"Insurance Value", val:agData.insuranceSum, color:"#10B981", icon:"🛡️", count:agData.linkedInsurance.length },
                { label:"Manual Saved", val:agData.manualSaved, color:"#F59E0B", icon:"💰", count:agData.manualSaved>0?1:0 },
              ].map(s=>(
                <div key={s.label} style={{ background:`${s.color}10`,border:`1px solid ${s.color}25`,borderRadius:10,padding:"10px 12px" }}>
                  <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:3 }}>{s.icon} {s.label}</div>
                  <div style={{ fontSize:14,fontWeight:700,color:s.color }}>₹{s.val.toLocaleString("en-IN")}</div>
                  <div style={{ fontSize:10,color:COLORS.textMuted }}>{s.count} {s.count===1?"item":"items"}</div>
                </div>
              ))}
            </div>

            {/* Investments */}
            {agData.linkedInvestments.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:700,color:COLORS.primary,marginBottom:8,letterSpacing:0.5,display:"flex",alignItems:"center",gap:6 }}>
                  📈 INVESTMENTS LINKED
                  <span style={{ background:`${COLORS.primary}20`,borderRadius:20,padding:"1px 8px",fontSize:10 }}>{agData.linkedInvestments.length}</span>
                </div>
                {agData.linkedInvestments.map((inv,i)=>{
                  const val = parseFloat(inv.current || inv.invested || inv.amount || 0);
                  const invested = parseFloat(inv.invested || inv.amount || 0);
                  const gain = val - invested;
                  const gainPct = invested > 0 ? ((gain/invested)*100).toFixed(1) : 0;
                  return (
                    <div key={inv.id||i} style={{ background:"rgba(108,99,255,0.07)",border:"1px solid rgba(108,99,255,0.18)",borderRadius:11,padding:"11px 13px",marginBottom:8 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                        <div style={{ minWidth:0,flex:1 }}>
                          <div style={{ fontSize:12,fontWeight:600,color:COLORS.text }}>{inv.icon||"📈"} {inv.name}</div>
                          <div style={{ fontSize:10,color:COLORS.textMuted,marginTop:2 }}>{inv.type}{inv.provider||inv.bank ? ` · ${inv.provider||inv.bank}` : ""}</div>
                        </div>
                        <div style={{ textAlign:"right",flexShrink:0,marginLeft:8 }}>
                          <div style={{ fontSize:13,fontWeight:700,color:COLORS.primary }}>₹{val.toLocaleString("en-IN")}</div>
                          {gain !== 0 && <div style={{ fontSize:10,color:gain>=0?"#10B981":COLORS.danger,marginTop:1 }}>{gain>=0?"▲":"▼"} {Math.abs(gainPct)}%</div>}
                        </div>
                      </div>
                      <div style={{ marginTop:8,display:"flex",flexWrap:"wrap",gap:8,fontSize:10,color:COLORS.textMuted,borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:8 }}>
                        <span>💸 Invested: <b style={{ color:COLORS.text }}>₹{invested.toLocaleString("en-IN")}</b></span>
                        {inv.cycle && <span>🔁 {inv.cycle}</span>}
                        {inv.startDate && <span>📅 {inv.startDate}</span>}
                        {gain !== 0 && <span style={{ color:gain>=0?"#10B981":COLORS.danger }}>P&L: ₹{gain.toLocaleString("en-IN")}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Loans */}
            {agData.linkedLoans.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:700,color:COLORS.danger,marginBottom:8,letterSpacing:0.5,display:"flex",alignItems:"center",gap:6 }}>
                  🏦 LOANS / EMI LINKED
                  <span style={{ background:`${COLORS.danger}20`,borderRadius:20,padding:"1px 8px",fontSize:10 }}>{agData.linkedLoans.length}</span>
                </div>
                {agData.linkedLoans.map((l,i)=>{
                  const valuation = parseFloat(l.assetValuation || 0);
                  const autoPaid = calcAutoPaid(l, 'loan');
                  const finalVal = valuation > 0 ? valuation : autoPaid;
                  const principal = parseFloat(l.principal||0);
                  const paidPct = principal > 0 ? Math.min(Math.round((autoPaid/principal)*100),100) : 0;
                  return (
                    <div key={l.id||i} style={{ background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:11,padding:"11px 13px",marginBottom:8 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                        <div style={{ minWidth:0,flex:1 }}>
                          <div style={{ fontSize:12,fontWeight:600,color:COLORS.text }}>{l.icon||"🏦"} {l.name}</div>
                          <div style={{ fontSize:10,color:COLORS.textMuted,marginTop:2 }}>{l.type}{l.bank ? ` · ${l.bank}` : ""}</div>
                        </div>
                        <div style={{ textAlign:"right",flexShrink:0,marginLeft:8 }}>
                          <div style={{ fontSize:13,fontWeight:700,color:COLORS.danger }}>₹{finalVal.toLocaleString("en-IN")}</div>
                          <div style={{ fontSize:10,color:COLORS.textMuted }}>{valuation > 0 ? "asset valuation" : `of ₹${principal.toLocaleString("en-IN")}`}</div>
                        </div>
                      </div>
                      {!valuation && (
                        <div style={{ marginTop:8,background:"rgba(255,255,255,0.04)",borderRadius:5,height:5,overflow:"hidden" }}>
                          <div style={{ height:"100%",width:`${paidPct}%`,background:COLORS.danger,borderRadius:5 }}/>
                        </div>
                      )}
                      <div style={{ marginTop:6,display:"flex",flexWrap:"wrap",gap:8,fontSize:10,color:COLORS.textMuted }}>
                        <span>{valuation > 0 ? "✅ Valuation priority" : "✅ Auto-calc from start date"}</span>
                        {l.interestRate && <span>📊 Rate: {l.interestRate}%</span>}
                        {l.emiAmount && <span>📆 EMI: ₹{parseFloat(l.emiAmount).toLocaleString("en-IN")}</span>}
                        {!valuation && <span style={{ color:COLORS.danger }}>{paidPct}% paid off</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Insurance */}
            {agData.linkedInsurance.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:700,color:"#10B981",marginBottom:8,letterSpacing:0.5,display:"flex",alignItems:"center",gap:6 }}>
                  🛡️ INSURANCE LINKED
                  <span style={{ background:"rgba(16,185,129,0.2)",borderRadius:20,padding:"1px 8px",fontSize:10 }}>{agData.linkedInsurance.length}</span>
                </div>
                {agData.linkedInsurance.map((ins,i)=>{
                  const valuation = parseFloat(ins.currentValuation || 0);
                  const autoPaid = calcAutoPaid(ins, 'insurance');
                  const finalVal = valuation > 0 ? valuation : autoPaid;
                  return (
                    <div key={ins.id||i} style={{ background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.18)",borderRadius:11,padding:"11px 13px",marginBottom:8 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                        <div style={{ minWidth:0,flex:1 }}>
                          <div style={{ fontSize:12,fontWeight:600,color:COLORS.text }}>{ins.icon||"🛡️"} {ins.name}</div>
                          <div style={{ fontSize:10,color:COLORS.textMuted,marginTop:2 }}>{ins.type}{ins.provider ? ` · ${ins.provider}` : ""}</div>
                        </div>
                        <div style={{ textAlign:"right",flexShrink:0,marginLeft:8 }}>
                          <div style={{ fontSize:13,fontWeight:700,color:"#10B981" }}>₹{finalVal.toLocaleString("en-IN")}</div>
                          <div style={{ fontSize:10,color:COLORS.textMuted }}>{valuation > 0 ? "current valuation" : "auto-calc paid"}</div>
                        </div>
                      </div>
                      <div style={{ marginTop:6,display:"flex",flexWrap:"wrap",gap:8,fontSize:10,color:COLORS.textMuted }}>
                        <span>🔁 ₹{parseFloat(ins.amount||0).toLocaleString("en-IN")}/{ins.cycle}</span>
                        {ins.coverage && <span>🏥 Cover: {ins.coverage}</span>}
                        {ins.maturityAmount && <span style={{ color:"#10B981" }}>🎯 Maturity: ₹{parseFloat(ins.maturityAmount).toLocaleString("en-IN")}</span>}
                        <span>{valuation > 0 ? "✅ Valuation priority" : "✅ Auto-calc"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {agData.linkedInvestments.length===0 && agData.linkedLoans.length===0 && agData.linkedInsurance.length===0 && agData.manualSaved===0 && (
              <div style={{ textAlign:"center",padding:"40px 16px",color:COLORS.textMuted }}>
                <div style={{ fontSize:36,marginBottom:12 }}>🔗</div>
                <div style={{ fontSize:14,fontWeight:600,color:COLORS.text,marginBottom:8 }}>No linked items yet</div>
                <div style={{ fontSize:12,lineHeight:1.6 }}>Go to <b style={{ color:COLORS.primary }}>Investments</b>, <b style={{ color:COLORS.danger }}>EMI & Loans</b>, or <b style={{ color:"#10B981" }}>Insurance</b> and select this goal from the "Link to Goal" dropdown.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
          <div style={{ background:"#0d1526",border:`1px solid rgba(108,99,255,0.25)`,borderRadius:"20px 20px 0 0",padding:"20px 18px 32px",width:"100%",maxWidth:480,maxHeight:"92vh",overflowY:"auto" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <div style={{ fontSize:15,fontWeight:700,color:COLORS.text }}>{editItem?"✏️ Edit Goal":"➕ Add Goal"}</div>
              <button onClick={()=>setShowForm(false)} style={{ background:"rgba(255,255,255,0.07)",border:"none",borderRadius:8,width:30,height:30,color:COLORS.textMuted,cursor:"pointer",fontSize:16 }}>✕</button>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <div><label style={{ fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:5 }}>GOAL NAME *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Dream Vacation" style={iStyle}/></div>
              <div><label style={{ fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:5 }}>GOAL DESCRIPTION / WISH</label><textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="e.g. Dream car features, trip destination details" style={{ ...iStyle, height:60, resize:"none" }}/></div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                <div><label style={{ fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:5 }}>TARGET (₹) *</label><input type="number" inputMode="numeric" value={form.target} onChange={e=>setForm(p=>({...p,target:e.target.value}))} placeholder="500000" style={iStyle}/></div>
                <div><label style={{ fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:5 }}>SAVED (₹)</label><input type="number" inputMode="numeric" value={form.saved} onChange={e=>setForm(p=>({...p,saved:e.target.value}))} placeholder="50000" style={iStyle}/></div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                <div><label style={{ fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:5 }}>MONTHLY SAVINGS (₹)</label><input type="number" inputMode="numeric" value={form.monthly} onChange={e=>setForm(p=>({...p,monthly:e.target.value}))} placeholder="10000" style={iStyle}/></div>
                <div><label style={{ fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:5 }}>TARGET DATE</label><input type="date" value={form.deadline} onChange={e=>setForm(p=>({...p,deadline:e.target.value}))} style={iStyle}/></div>
              </div>
              <div><label style={{ fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:5 }}>AI TIP / NOTE</label><input value={form.tip} onChange={e=>setForm(p=>({...p,tip:e.target.value}))} placeholder="Personal note about this goal..." style={iStyle}/></div>
              <div>
                <label style={{ fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:8 }}>ICON</label>
                <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>{ICONS.map(ic=><button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))} style={{ fontSize:22,padding:"6px 8px",borderRadius:9,border:`1px solid ${form.icon===ic?COLORS.primary:COLORS.border}`,background:form.icon===ic?`${COLORS.primary}22`:"transparent",cursor:"pointer" }}>{ic}</button>)}</div>
              </div>
              <div>
                <label style={{ fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:8 }}>COLOR</label>
                <div style={{ display:"flex",gap:8 }}>{GCOLORS.map(c=><button key={c} onClick={()=>setForm(p=>({...p,color:c}))} style={{ width:28,height:28,borderRadius:"50%",background:c,border:`3px solid ${form.color===c?"#fff":"transparent"}`,cursor:"pointer" }}/>)}</div>
              </div>
              <button onClick={handleSave} disabled={!form.name||!form.target} style={{ padding:"13px",borderRadius:12,border:"none",background:(form.name&&form.target)?`linear-gradient(135deg,${COLORS.primary},#8B5CF6)`:"rgba(255,255,255,0.08)",color:(form.name&&form.target)?"#fff":COLORS.textMuted,fontSize:14,fontWeight:700,cursor:(form.name&&form.target)?"pointer":"not-allowed" }}>{editItem?"Update Goal":"Save Goal"}</button>
            </div>
          </div>
        </div>
      )}
      {delId && <ConfirmDialog msg="Delete this goal?" onConfirm={()=>{setGoals(p=>p.filter(g=>g.id!==delId));setDelId(null);}} onCancel={()=>setDelId(null)} />}
    </div>
  );
}


// ─── EMI View ─────────────────────────────────────────────────────────────────

const LOANS_SEED = [];

const calculateAmortization = (loan) => {
  if (!loan || !loan.startDate || !loan.endDate || !loan.principal) return [];
  const [sy, sm, sd] = loan.startDate.split('-');
  const [ey, em, ed] = loan.endDate.split('-');
  const start = new Date(sy, sm-1, sd);
  const end = new Date(ey, em-1, ed);
  
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (months <= 0) months = 1;

  const schedule = [];
  let balance = parseFloat(loan.principal);
  let currentRate = parseFloat(loan.interestRate);
  
  // FIXED logic
  if (loan.type === "Fixed") {
    const totalInt = balance * (currentRate / 100) * (months / 12);
    let emi = (balance + totalInt) / months;
    let prinPerMonth = balance / months;
    let intPerMonth = totalInt / months;
    
    if (loan.emiAmount && parseFloat(loan.emiAmount) > 0) {
      emi = parseFloat(loan.emiAmount);
      prinPerMonth = emi - intPerMonth;
    }
    
    let dt = new Date(start);
    for (let i = 1; i <= months; i++) {
      if (balance <= 0) break;
      let ovPrin = prinPerMonth;
      let ovInt = intPerMonth;
      let ovEmi = prinPerMonth + intPerMonth;
      
      const dStr = dt.toISOString().split('T')[0];
      
      // SOA Overrides
      if (loan.soaOverrides) {
        const ov = loan.soaOverrides.find(o => o.month === i);
        if (ov) {
          if (ov.principal !== undefined) ovPrin = ov.principal;
          if (ov.interest !== undefined) ovInt = ov.interest;
          if (ov.emi !== undefined) ovEmi = ov.emi;
        }
      }
      // Actual Payments Override
      const isPaid = loan.payments && loan.payments.some(p => p.date === dStr || p.date.substring(0,7) === dStr.substring(0,7));
      if (isPaid) {
        const pData = loan.payments.find(p => p.date === dStr || p.date.substring(0,7) === dStr.substring(0,7));
        if (pData.principal !== undefined) ovPrin = parseFloat(pData.principal);
        if (pData.interest !== undefined) ovInt = parseFloat(pData.interest);
        if (pData.amount !== undefined) ovEmi = parseFloat(pData.amount);
      }
      
      if (balance < ovPrin) ovPrin = balance;
      
      schedule.push({ month: i, date: dStr, emi: ovEmi, principal: ovPrin, interest: ovInt, balance: Math.max(0, balance - ovPrin), rate: currentRate });
      balance -= ovPrin;
      dt.setMonth(dt.getMonth() + 1);
    }
    return schedule;
  }

  // COMPOUND / FLOATING logic
  const rh = (loan.rateHistory || []).map(r => {
    const [ry, rm, rd] = r.date.split('-');
    return { dateObj: new Date(ry, rm-1, rd), rate: parseFloat(r.rate) };
  }).sort((a,b) => a.dateObj - b.dateObj);

  let dt = new Date(start);
  let pmt = 0;
  
  const calcPMT = (P, rateAnnum, n) => {
    if (rateAnnum <= 0) return P / n;
    const r = rateAnnum / 12 / 100;
    return (P * r * Math.pow(1+r, n)) / (Math.pow(1+r, n) - 1);
  };
  
  if (loan.emiAmount && parseFloat(loan.emiAmount) > 0) {
    pmt = parseFloat(loan.emiAmount);
  } else {
    pmt = calcPMT(balance, currentRate, months);
  }

  for (let i = 1; i <= months; i++) {
    // Check floating rate changes
    if (loan.type === "Floating" && rh.length > 0) {
      const activeHist = rh.filter(r => r.dateObj <= dt).pop();
      if (activeHist && activeHist.rate !== currentRate) {
        currentRate = activeHist.rate;
        // Recalculate PMT with remaining balance and remaining months
        if (!loan.emiAmount || parseFloat(loan.emiAmount) <= 0) {
          pmt = calcPMT(balance, currentRate, months - i + 1);
        }
      }
    }

    const rMonth = currentRate / 12 / 100;
    let interest = balance * rMonth;
    let prin = pmt - interest;
    let currentPmt = pmt;
    
    // Last month precision correction or if balance is exhausted early
    if (i === months || balance < (pmt - interest)) { prin = balance; currentPmt = prin + interest; }
    
    const dStr = dt.toISOString().split('T')[0];
    
    // SOA Overrides
    if (loan.soaOverrides) {
      const ov = loan.soaOverrides.find(o => o.month === i);
      if (ov) {
        if (ov.principal !== undefined) prin = ov.principal;
        if (ov.interest !== undefined) interest = ov.interest;
        if (ov.emi !== undefined) currentPmt = ov.emi;
      }
    }
    // Actual Payments Override
    const isPaid = loan.payments && loan.payments.some(p => p.date === dStr || p.date.substring(0,7) === dStr.substring(0,7));
    if (isPaid) {
      const pData = loan.payments.find(p => p.date === dStr || p.date.substring(0,7) === dStr.substring(0,7));
      if (pData.principal !== undefined) prin = parseFloat(pData.principal);
      if (pData.interest !== undefined) interest = parseFloat(pData.interest);
      if (pData.amount !== undefined) currentPmt = parseFloat(pData.amount);
    }
    
    if (balance <= 0 && i !== 1) break;
    if (balance < prin) prin = balance;
    
    balance -= prin;
    if (balance < 0) balance = 0;

    schedule.push({ month: i, date: dStr, emi: currentPmt, principal: prin, interest: interest, balance, rate: currentRate });
    
    dt.setMonth(dt.getMonth() + 1);
  }
  return schedule;
};

const getDueEMIs = (loans) => {
  if (!loans) return [];
  const due = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  
  loans.forEach(loan => {
    if (loan.status === "Closed" || !loan.startDate) return;
    const schedule = calculateAmortization(loan);
    
    schedule.forEach(row => {
      const [ry, rm, rd] = row.date.split('-');
      const rDate = new Date(ry, rm-1, rd);
      if (rDate <= today) {
        const dStr = row.date.substring(0, 7); // match by YYYY-MM
        const isPaid = loan.payments && loan.payments.some(p => p.date.substring(0,7) === dStr);
        if (!isPaid) {
          due.push({ loanId: loan.id, name: loan.name, bank: loan.bank, amount: row.emi, principal: row.principal, interest: row.interest, dueDate: row.date, icon: loan.icon, bankId: loan.bankId });
        }
      }
    });
  });
  
  // Deduplicate just in case multiple months are overdue, we only want to show the earliest unpaid per loan, or all? Let's show all overdue.
  return due;
};

function EMIViewLive({ loans, setLoans, goals, banks, creditCards }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name:"", bank:"", bankId:"", type:"Compound (PMT)", principal:"", startDate:"", endDate:"", interestRate:"", rateHistory:[], emiAmount:"", remarks:"", linkedGoal:"", icon:"🏠", color:COLORS.primary });
  
    const [deleteConfirm, setDeleteConfirm] = useState(null);
  const handleSoaEdit = (loanId, month, field, valStr, currentPrin, currentInt, currentEmi) => {
    const val = parseFloat(valStr) || 0;
    setLoans(prev => prev.map(l => {
      if (l.id !== loanId) return l;
      const overrides = [...(l.soaOverrides || [])];
      let ov = overrides.find(o => o.month === month);
      if (!ov) {
        ov = { month, emi: currentEmi, principal: currentPrin, interest: currentInt };
        overrides.push(ov);
      } else {
        ov = { ...ov }; // clone
        const idx = overrides.findIndex(o => o.month === month);
        overrides[idx] = ov;
      }
      
      if (field === "emi") {
        ov.emi = valStr === "" ? "" : val;
        if (ov.interest === 0) {
          ov.principal = val;
        } else {
          ov.interest = Math.max(0, val - ov.principal);
        }
      } else if (field === "interest") {
        ov.interest = valStr === "" ? "" : val;
        ov.principal = ov.emi - val;
      } else if (field === "principal") {
        ov.principal = valStr === "" ? "" : val;
        ov.interest = ov.emi - val;
      }
      
      return { ...l, soaOverrides: overrides };
    }));
  };
 // stores loan to view schedule

  const [activeBreakup, setActiveBreakup] = useState(null);
  
  const todayDate = new Date();
  todayDate.setHours(0,0,0,0);

  const breakupData = { paid: [], today: [], overdue: [], nextMonth: [], future: [] };
  const metrics = { paid: 0, today: 0, overdue: 0, nextMonth: 0, future: 0 };

  (loans || []).forEach(l => {
    if (l.status === "Closed" || !l.startDate) return;
    const schedule = calculateAmortization(l);
    schedule.forEach((row) => {
      const dStr = row.date.substring(0, 7);
      const isPaid = l.payments && l.payments.some(p => p.date.substring(0,7) === dStr);
      
      const item = { loanName: l.name, bank: l.bank, icon: l.icon, color: l.color, amount: row.emi, principal: row.principal, interest: row.interest, date: row.date, monthIdx: row.month };

      if (isPaid) {
        metrics.paid += row.emi;
        breakupData.paid.push(item);
      } else {
        const [ry, rm, rd] = row.date.split('-');
        const rDate = new Date(ry, parseInt(rm)-1, parseInt(rd));
        
        if (rDate.getTime() === todayDate.getTime()) {
          metrics.today += row.emi;
          breakupData.today.push(item);
        } else if (rDate < todayDate) {
          metrics.overdue += row.emi;
          breakupData.overdue.push(item);
        } else {
          // Check if it is NEXT calendar month
          let nextM = todayDate.getMonth() + 1;
          let nextY = todayDate.getFullYear();
          if (nextM > 11) { nextM = 0; nextY++; }
          
          if (rDate.getFullYear() === nextY && rDate.getMonth() === nextM) {
            metrics.nextMonth += row.emi;
            breakupData.nextMonth.push(item);
          } else {
            metrics.future += row.emi;
            breakupData.future.push(item);
          }
        }
      }
    });
  });

  const grandTotal = metrics.paid + metrics.today + metrics.overdue + metrics.nextMonth + metrics.future;


  const handleSave = () => {
    if (!form.name || !form.principal || !form.startDate || !form.endDate || !form.emiAmount) return alert("Name, Principal, Installment Amount, Start and End Dates are required.");
    const item = { ...form, principal: parseFloat(form.principal), interestRate: parseFloat(form.interestRate||0) };
    if (editItem) {
      setLoans(p => p.map(i => i.id === editItem.id ? { ...i, ...item } : i));
    } else {
      setLoans(p => [...(p||[]), { ...item, id: "loan" + Date.now(), payments: [], trxNo: item.trxNo || getNextTrxNo("LON", p) }]);
    }
    setShowForm(false);
  };

  const addRateHist = () => {
    setForm(p => ({ ...p, rateHistory: [...p.rateHistory, { date: new Date().toISOString().split('T')[0], rate: "" }] }));
  };

  const updateRateHist = (idx, field, val) => {
    const rh = [...form.rateHistory];
    rh[idx][field] = val;
    setForm(p => ({ ...p, rateHistory: rh }));
  };
  
  const removeRateHist = (idx) => {
    setForm(p => ({ ...p, rateHistory: p.rateHistory.filter((_,i)=>i!==idx) }));
  };

  const formElement = (
<>
        <div style={{ display: "flex", gap: 24, marginBottom: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 40%", background: "#1a2236", padding: 16, borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 14 }}>{editItem ? "✏️ Edit Loan/EMI" : "➕ Add Loan/EMI"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, color: COLORS.textMuted }}>LOAN NAME *</label>
                <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Home Loan - HDFC" style={{ background:"#0d1526", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"9px 12px", color:COLORS.text, fontSize:13, outline:"none" }} />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <label style={{ fontSize:10, color:COLORS.textMuted }}>LOAN TYPE</label>
                  <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={{ background:"#0d1526", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"9px 12px", color:COLORS.text, fontSize:13, outline:"none" }}>
                    <option>Compound (PMT)</option>
                    <option>Fixed</option>
                    <option>Flat Rate</option>
                  </select>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <label style={{ fontSize:10, color:COLORS.textMuted }}>BANK / LENDER</label>
                  <input value={form.bank} onChange={e=>setForm(p=>({...p,bank:e.target.value}))} placeholder="e.g. HDFC Bank" style={{ background:"#0d1526", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"9px 12px", color:COLORS.text, fontSize:13, outline:"none" }} />
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <label style={{ fontSize:10, color:COLORS.textMuted }}>PRINCIPAL (₹) *</label>
                  <input type="number" value={form.principal} onChange={e=>setForm(p=>({...p,principal:e.target.value}))} placeholder="e.g. 2000000" style={{ background:"#0d1526", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"9px 12px", color:COLORS.text, fontSize:13, outline:"none" }} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <label style={{ fontSize:10, color:COLORS.textMuted }}>EMI / INSTALLMENT (₹) *</label>
                  <input type="number" value={form.emiAmount} onChange={e=>setForm(p=>({...p,emiAmount:e.target.value}))} placeholder="e.g. 18000" style={{ background:"#0d1526", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"9px 12px", color:COLORS.text, fontSize:13, outline:"none" }} />
                </div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:10, color:COLORS.textMuted }}>ASSET VALUATION (Optional for Goal Linking)</label>
                <input type="number" value={form.assetValuation||""} onChange={e=>setForm(p=>({...p,assetValuation:e.target.value}))} placeholder="e.g. 5000000 (Current value of the asset)" style={{ background:"#0d1526", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"9px 12px", color:COLORS.text, fontSize:13, outline:"none" }} />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <label style={{ fontSize:10, color:COLORS.textMuted }}>START DATE *</label>
                  <input type="date" value={form.startDate} onChange={e=>setForm(p=>({...p,startDate:e.target.value}))} style={{ background:"#0d1526", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"9px 12px", color:COLORS.text, fontSize:13, outline:"none" }} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <label style={{ fontSize:10, color:COLORS.textMuted }}>END DATE *</label>
                  <input type="date" value={form.endDate} onChange={e=>setForm(p=>({...p,endDate:e.target.value}))} style={{ background:"#0d1526", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"9px 12px", color:COLORS.text, fontSize:13, outline:"none" }} />
                </div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:10, color:COLORS.textMuted }}>INTEREST RATE (%)</label>
                <input type="number" step="0.01" value={form.interestRate} onChange={e=>setForm(p=>({...p,interestRate:e.target.value}))} placeholder="e.g. 8.5" style={{ background:"#0d1526", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"9px 12px", color:COLORS.text, fontSize:13, outline:"none" }} />
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:10, color:COLORS.textMuted }}>DEDUCTION BANK ACCOUNT</label>
                <select value={form.deductionBank||""} onChange={e=>setForm(p=>({...p, deductionBank:e.target.value}))} style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${COLORS.border}`, padding: "10px 14px", color: COLORS.text, fontSize: 13, borderRadius: 12, width: "100%", outline: "none" }}>
                  <option value="">� Select Account �</option>
                  <optgroup label="Bank Accounts">
                    {(banks||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </optgroup>
                  <optgroup label="Credit Cards">
                    {(creditCards||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                </select>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:10, color:COLORS.textMuted }}>LINK TO GOAL (optional)</label>
                <select value={form.linkedGoal||""} onChange={e=>setForm(p=>({...p,linkedGoal:e.target.value}))} style={{ background:"#0d1526", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"9px 12px", color:COLORS.text, fontSize:13, outline:"none" }}>
                  <option value="">— No Goal —</option>
                  {(goals||[]).map(g=><option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
                </select>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:10, color:COLORS.textMuted }}>REMARKS / NOTES</label>
                <input value={form.remarks||""} onChange={e=>setForm(p=>({...p,remarks:e.target.value}))} placeholder="Optional notes" style={{ background:"#0d1526", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"9px 12px", color:COLORS.text, fontSize:13, outline:"none" }} />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <label style={{ fontSize:10, color:COLORS.textMuted }}>ICON</label>
                  <input value={form.icon||"🏠"} onChange={e=>setForm(p=>({...p,icon:e.target.value}))} placeholder="🏠" style={{ background:"#0d1526", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"9px 12px", color:COLORS.text, fontSize:13, outline:"none" }} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <label style={{ fontSize:10, color:COLORS.textMuted }}>COLOR</label>
                  <input type="color" value={form.color||COLORS.primary} onChange={e=>setForm(p=>({...p,color:e.target.value}))} style={{ background:"#0d1526", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"4px 8px", height:40, width:"100%", cursor:"pointer" }} />
                </div>
              </div>

              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <button onClick={handleSave} style={{ flex:1, padding:"12px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${COLORS.primary},#8B5CF6)`, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                  {editItem ? "💾 Update" : "➕ Save Loan"}
                </button>
                <button onClick={()=>setShowForm(false)} style={{ padding:"12px 18px", borderRadius:10, border:`1px solid ${COLORS.border}`, background:"transparent", color:COLORS.textMuted, fontSize:13, cursor:"pointer" }}>
                  Cancel
                </button>
              </div>

            </div>
          </div>
          {(() => {
            if (!editItem) return <div style={{ flex: "1 1 55%" }}></div>;
            return (
              <div style={{ flex: "1 1 55%", position: "sticky", top: 16, background: "rgba(0,0,0,0.15)", padding: 20, borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🧾</span> Amortization Schedule
                </div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 16 }}>{editItem.name} ({editItem.type})</div>
                <div style={{ overflowY:"auto", maxHeight: 400, paddingRight: 4 }}>
                  <table style={{ width:"100%",borderCollapse:"collapse",fontSize:11,textAlign:"right" }}>
                    <thead>
                      <tr style={{ color:COLORS.textMuted,borderBottom:`1px solid ${COLORS.border}` }}>
                        <th style={{ textAlign:"left",paddingBottom:8 }}>Mo/Date</th>
                        <th style={{ paddingBottom:8 }}>EMI</th>
                        <th style={{ paddingBottom:8 }}>Principal</th>
                        <th style={{ paddingBottom:8 }}>Interest</th>
                        <th style={{ paddingBottom:8 }}>Rate</th>
                        <th style={{ paddingBottom:8 }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculateAmortization(editItem).map((row, i) => {
                        const isPaid = editItem.payments && i < editItem.payments.length;
                        const paymentData = isPaid ? editItem.payments[i] : null;
                        const expTx = paymentData && paymentData.expenseId ? (expenses || []).find(e => e.id === paymentData.expenseId) : null;
                        
                        let bankName = "";
                        if (expTx) {
                          const bId = expTx.bankId;
                          const b = bId ? [...(banks||[]), ...(creditCards||[])].find(x => x.id === bId) : null;
                          bankName = b ? b.name : (expTx.paymentMode || "Cash");
                        }
                        
                        return (
                        <tr key={i} style={{ borderBottom:`1px solid rgba(255,255,255,0.03)`, color: isPaid ? COLORS.success : COLORS.text }}>
                          <td style={{ textAlign:"left",padding:"10px 0" }}>
                            <div style={{ fontWeight:600 }}>{row.month}</div>
                            <div style={{ fontSize:9,color:COLORS.textMuted }}>{row.date} {isPaid ? "✓" : ""}</div>
                            {isPaid && paymentData.payDate && <div style={{ fontSize: 9, color: COLORS.success, marginTop: 2 }}>Paid on: {formatLocalDateString(paymentData.payDate)}</div>}
                            {isPaid && bankName && <div style={{ fontSize: 9, color: COLORS.textMuted }}>Via: {bankName}</div>}
                          </td>
                          <td style={{ padding:"10px 0" }}>{Math.round(row.emi).toLocaleString("en-IN")}</td>
                          <td style={{ padding:"10px 0", color: COLORS.primary }}>{Math.round(row.principal).toLocaleString("en-IN")}</td>
                          <td style={{ padding:"10px 0", color: COLORS.danger }}>{Math.round(row.interest).toLocaleString("en-IN")}</td>
                          <td style={{ padding:"10px 0", color: COLORS.textMuted }}>{row.rate}%</td>
                          <td style={{ padding:"10px 0", fontWeight:700 }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
                              ₹{Math.round(row.balance).toLocaleString("en-IN")}
                              {isPaid && expTx && (
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation();
                                    if (onEditExpense) onEditExpense(expTx, editItem);
                                  }}
                                  style={{ background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 13, padding: 0 }}
                                  title="Edit Transaction"
                                >
                                  ✎
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      </>

  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:18,fontWeight:700,color:COLORS.text }}>EMI & Loans</div>
          <div style={{ fontSize:12,color:COLORS.textMuted }}>Advanced Amortization Tracker</div>
        </div>
        <button onClick={() => { setEditItem(null); setForm({ name:"", bank:"", type:"Compound (PMT)", principal:"", startDate:new Date().toISOString().split('T')[0], endDate:"", interestRate:"", rateHistory:[], emiAmount:"", deductionBank:"", remarks:"", linkedGoal:"", icon:"🏠", color:COLORS.primary }); setShowForm(true); }} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add Loan</button>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(100px, 1fr))",gap:9,marginBottom:16 }}>
        {[
          { l:"Total Paid", v:`₹${metrics.paid.toLocaleString("en-IN", {maximumFractionDigits:0})}`, c:COLORS.primary, key: "paid" },
          { l:"Due Today",  v:`₹${metrics.today.toLocaleString("en-IN", {maximumFractionDigits:0})}`, c:COLORS.accent, key: "today" },
          { l:"Overdue",    v:`₹${metrics.overdue.toLocaleString("en-IN", {maximumFractionDigits:0})}`, c:COLORS.danger, key: "overdue" },
          { l:"Next Month", v:`₹${metrics.nextMonth.toLocaleString("en-IN", {maximumFractionDigits:0})}`, c:COLORS.secondary, key: "nextMonth" },
          { l:"Future Due", v:`₹${metrics.future.toLocaleString("en-IN", {maximumFractionDigits:0})}`, c:COLORS.text, key: "future" },
          { l:"Grand Total",v:`₹${grandTotal.toLocaleString("en-IN", {maximumFractionDigits:0})}`, c:"#fff", key: "all" },
        ].map(s=>(
          <div key={s.l} onClick={() => s.key !== 'all' && breakupData[s.key].length > 0 && setActiveBreakup({ title: s.l, data: breakupData[s.key] })} style={{ background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:11,padding:"10px 12px", cursor: s.key !== 'all' && breakupData[s.key]?.length > 0 ? "pointer" : "default", transition: "all 0.2s" }} onMouseOver={e => { if(s.key !== 'all' && breakupData[s.key]?.length > 0) e.currentTarget.style.background = COLORS.bgCardHover; }} onMouseOut={e => { e.currentTarget.style.background = COLORS.bgCard; }}>
            <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:3 }}>{s.l}</div>
            <div style={{ fontSize:14,fontWeight:700,color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {deleteConfirm && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.7)", zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, width: "90%", maxWidth: 400, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: deleteConfirm.step === 2 ? COLORS.danger : COLORS.text, marginBottom: 8 }}>
              {deleteConfirm.step === 1 ? "Delete Loan/EMI" : "⚠️ Final Warning"}
            </div>
            <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 24 }}>
              {deleteConfirm.step === 1 
                ? `Are you sure you want to delete ${deleteConfirm.loan.name}?` 
                : "This will permanently erase the loan and all its amortization history. Proceed?"}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => {
                if (deleteConfirm.step === 1) {
                  setDeleteConfirm({ ...deleteConfirm, step: 2 });
                } else {
                  setLoans(p => p.filter(x => x.id !== deleteConfirm.loan.id));
                  setDeleteConfirm(null);
                  setShowForm(false);
                }
              }} style={{ background: COLORS.danger, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>
                {deleteConfirm.step === 1 ? "Delete" : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

{showForm && !editItem && formElement}
      <div style={{ display:"flex",flexDirection:"column",gap:11 }}>
        {loans && loans.map(l => {
          const sch = calculateAmortization(l);
          const paidCount = l.payments ? l.payments.length : 0;
          const pct = sch.length > 0 ? Math.round((paidCount / sch.length) * 100) : 0;
          const currEmi = sch.length > 0 ? (sch[paidCount < sch.length ? paidCount : sch.length-1].emi) : 0;
          const currBal = sch.length > 0 ? (paidCount < sch.length ? sch[paidCount].balance : 0) : 0;

          return ( <Fragment key={l.id}>
            <div style={{ background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:14,padding:"14px 16px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{ width:38,height:38,borderRadius:10,background:`${l.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{l.icon}</div>
                  <div>
                    <div style={{ fontSize:13,fontWeight:600,color:COLORS.text }}>{l.name}</div>
                    <div style={{ fontSize:10.5,color:COLORS.textMuted }}>{l.bank} · {l.type}</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                  <div style={{ textAlign:"right",flexShrink:0 }}>
                    <div style={{ fontSize:16,fontWeight:700,color:l.color }}>₹{currEmi.toLocaleString("en-IN", {maximumFractionDigits:0})}<span style={{ fontSize:10,color:COLORS.textMuted }}>/mo</span></div>
                    <div style={{ fontSize:10.5,color:COLORS.textMuted }}>Bal: ₹{(currBal/100000).toFixed(2)}L</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                     <button onClick={() => { setEditItem(l); setForm({...l}); setShowForm(true); }} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "2px 6px", color: COLORS.textMuted, fontSize: 10, cursor: "pointer", width: "100%" }}>Schedule</button>
                     <button onClick={() => { setEditItem(l); setForm({...l}); setShowForm(true); }} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "2px 6px", color: COLORS.textMuted, fontSize: 10, cursor: "pointer", width: "100%" }}>Edit</button>
                     <button onClick={() => { 
                       setShowForm(false);
                       setEditItem(null);
                       setDeleteConfirm({ loan: l, step: 1 });
                     }} style={{ background: "rgba(255,50,50,0.1)", border: `1px solid rgba(255,50,50,0.2)`, borderRadius: 4, padding: "2px 6px", color: COLORS.danger, fontSize: 10, cursor: "pointer", width: "100%" }}>Delete</button>
                  </div>
                </div>
              </div>
              <div style={{ background:"rgba(255,255,255,0.06)",borderRadius:4,height:6,marginBottom:6 }}>
                <div style={{ height:"100%",width:`${pct}%`,borderRadius:4,background:`linear-gradient(90deg,${l.color},${l.color}88)`,transition:"width 1s",boxShadow:`0 0 6px ${l.color}55` }}/>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:10.5,color:COLORS.textMuted }}>
                <span>{paidCount}/{sch.length} EMIs paid ({pct}%)</span>
                <span style={{ color:COLORS.secondary }}>{sch.length - paidCount} left</span>
              </div>
            </div>
            {showForm && editItem?.id === l.id && formElement}
          </Fragment>
          );
        })}
      </div>

                </div>
  );
}
function SubscriptionsView({ subscriptions, setSubscriptions, categoryMaster, banks, creditCards, expenses }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name:"", icon:"🎬", amount:"", cycle:"Monthly", status:"Active", startDate:"", endDate:"", remarks:"", bank:"", bankId:"", color:COLORS.primary, category:"Entertainment" });
  const [restoreConfirm, setRestoreConfirm] = useState(null);

  const handleSkipSub = (subId, dueDate) => {
    setSubscriptions(prev => prev.map(s => {
      if (s.id !== subId) return s;
      const updatedPayments = [...(s.payments || []), { date: dueDate, amount: 0, skipped: true }];
      const updatedSub = { ...s, payments: updatedPayments };
      if (editItem && editItem.id === subId) {
        setEditItem(updatedSub);
      }
      return updatedSub;
    }));
  };

  const handleRemoveSkippedPayment = (subId, date) => {
    setRestoreConfirm({ subId, date });
  };

  const confirmRestoreSkipped = () => {
    if (!restoreConfirm) return;
    const { subId, date } = restoreConfirm;
    setSubscriptions(prev => prev.map(s => {
      if (s.id !== subId) return s;
      const updatedPayments = (s.payments || []).filter(p => !(p.skipped && p.date === date));
      const updatedSub = { ...s, payments: updatedPayments };
      if (editItem && editItem.id === subId) {
        setEditItem(updatedSub);
      }
      return updatedSub;
    }));
    setRestoreConfirm(null);
  };

  const monthlyTotal = subscriptions ? subscriptions.filter(s=>s.cycle==="Monthly" && s.status!=="Paused").reduce((a,s)=>a+s.amount,0) : 0;
  const annualCost   = subscriptions ? subscriptions.filter(s=>s.status!=="Paused").reduce((a,s)=>a+(s.cycle==="Monthly"?s.amount*12:s.amount),0) : 0;

  const handleSave = () => {
    if (!form.name || !form.amount || !form.startDate) {
      alert("Name, Amount, and Start Date are required.");
      return;
    }
    const item = { 
      ...form, 
      amount: parseFloat(form.amount), 
      endDate: form.endDate || "",
      payments: editItem ? editItem.payments : []
    };
    if (editItem) {
      setSubscriptions(p => p.map(s => s.id === editItem.id ? { ...s, ...item } : s));
    } else {
      setSubscriptions(p => [...(p||[]), { ...item, id: "sub" + Date.now(), payments: [], trxNo: item.trxNo || getNextTrxNo("SUB", p) }]);
    }
    setShowForm(false);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this subscription?")) {
      setSubscriptions(p => p.filter(s => s.id !== id));
      setShowForm(false);
    }
  };

  const fmtSubDue = (s) => {
    if (!s.startDate) return "";
    const today = new Date();
    today.setHours(0,0,0,0);
    const [sY, sM, sD] = s.startDate.split('-').map(Number);
    const start = new Date(sY, sM - 1, sD);
    let nextDate = new Date(start);
    let limit = 0;
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    
    while (limit < 1000) {
      if (s.endDate && nextDate > new Date(s.endDate)) return "Ended";
      
      const nextDateStr = toLocalYYYYMMDD(nextDate);
      const isPaid = s.payments && s.payments.some(p => p.date === nextDateStr);
      
      if (!isPaid) {
        const d = nextDate;
        if (nextDate <= today) return `Due: ${d.getDate()} ${months[d.getMonth()]}`;
        return `Next: ${d.getDate()} ${months[d.getMonth()]}`;
      }
      
      if (s.cycle === "Annual") nextDate.setFullYear(nextDate.getFullYear() + 1);
      else nextDate.setMonth(nextDate.getMonth() + 1);
      limit++;
    }
    return "";
  };

  const ledgerItem = editItem ? {
    ...editItem,
    ...form,
    payments: editItem.payments,
    amount: parseFloat(form.amount) || 0
  } : null;

  return (
    <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:18,fontWeight:700,color:COLORS.text }}>Subscription Tracker</div>
        <button onClick={() => { setEditItem(null); setForm({ name:"", icon:"🎬", amount:"", cycle:"Monthly", status:"Active", startDate: new Date().toISOString().split('T')[0], endDate:"", remarks:"", bank:"", color:COLORS.primary, category:"Entertainment" }); setShowForm(true); }} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add Sub</button>
      </div>

            {showForm && (
        <div style={{ display: "flex", gap: 24, marginBottom: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 60%", background: "#1a2236", padding: 16, borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Name</label>
              <input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="Name" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Icon (Emoji)</label>
              <input value={form.icon} onChange={e=>setForm({...form, icon: e.target.value})} placeholder="Icon" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Amount (₹)</label>
              <input type="number" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} placeholder="Amount" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Billing Cycle</label>
              <select value={form.cycle} onChange={e=>setForm({...form, cycle: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}>
                <option value="Monthly">Monthly</option>
                <option value="Annual">Annual</option>
              </select>
            </div>
            
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Transaction No.</label>
              <input value={editItem?.trxNo || "(Auto-generated)"} disabled style={{ background: "rgba(255,255,255,0.02)", border: `1px dashed ${COLORS.border}`, color: COLORS.primary, fontWeight:700, padding: "8px 12px", borderRadius: 8, cursor: "not-allowed" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Category</label>
              <select value={form.category} onChange={e=>setForm({...form, category: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}>
                {categoryMaster && categoryMaster.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Card Color</label>
              <input type="color" value={form.color} onChange={e=>setForm({...form, color: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, padding: "4px", borderRadius: 8, height: 38, width: "100%" }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Start Date</label>
              <input type="date" value={form.startDate} onChange={e=>setForm({...form, startDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>End Date (Leave blank for Infinite)</label>
              <input type="date" value={form.endDate} onChange={e=>setForm({...form, endDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Remarks / User ID</label>
              <input value={form.remarks} onChange={e=>setForm({...form, remarks: e.target.value})} placeholder="Purpose, connected ID, etc." style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Connected Bank / Card</label>
              
              <select value={form.bankId||""} onChange={e=>setForm({...form, bankId: e.target.value})} style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${COLORS.border}`, padding: "10px 14px", color: COLORS.text, fontSize: 13, borderRadius: 12, width: "100%", outline: "none" }}>
                  <option value="">� Select Account �</option>
                  <optgroup label="Bank Accounts">
                    {(banks||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </optgroup>
                  <optgroup label="Credit Cards">
                    {(creditCards||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                </select>

            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
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
          </div>
          </div>
          
          {editItem && (
            <div style={{ flex: "1 1 35%", position: "sticky", top: 16, background: "rgba(0,0,0,0.15)", padding: 20, borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🧾</span> Payment Ledger
              </div>
              {(!ledgerItem.payments || ledgerItem.payments.length === 0) && getDueSubscriptions([ledgerItem]).length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 8, opacity: 0.6 }}>
                  <div style={{ fontSize: 32 }}>📭</div>
                  <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>No payments yet</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, textAlign: "center", padding: "0 20px" }}>Payments and upcoming dues will appear here once tracked.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
                {getDueSubscriptions([ledgerItem]).map((d, idx) => {
                  const bId = d.bankId;
                  const b = bId ? [...(banks||[]), ...(creditCards||[])].find(x => x.id === bId) : null;
                  const bankName = b ? b.name : "—";
                  const statusInfo = getDueStatusAndStyle(d.dueDate);
                  return (
                    <div key={"due-"+idx} style={{ background: statusInfo.bg, borderLeft: statusInfo.border, padding: "12px 16px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 18, background: statusInfo.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{statusInfo.icon}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: statusInfo.color, letterSpacing: 0.5 }}>{statusInfo.label}</div>
                          <div style={{ fontSize: 11, color: COLORS.textMuted }}>{formatLocalDateString(d.dueDate)} • {bankName}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: statusInfo.color }}>₹{parseFloat(d.amount).toLocaleString("en-IN")}</div>
                        <button
                          onClick={() => handleSkipSub(d.subId, d.dueDate)}
                          style={{
                            background: `${statusInfo.color}18`,
                            color: statusInfo.color,
                            border: `1px solid ${statusInfo.color}35`,
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = `${statusInfo.color}35`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = `${statusInfo.color}18`;
                          }}
                        >
                          🚫 Not Used
                        </button>
                      </div>
                    </div>
                  );
                })}
                {ledgerItem.payments && [...ledgerItem.payments].reverse().map((p, idx) => {
                  if (p.skipped) {
                    return (
                      <div key={"skipped-"+idx} style={{ background: "rgba(255,255,255,0.02)", border: `1px dashed ${COLORS.border}`, padding: "12px 16px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.85 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 18, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🚫</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMuted }}>Not Used</div>
                            <div style={{ fontSize: 11, color: COLORS.textMuted }}>{formatLocalDateString(p.date)}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveSkippedPayment(editItem.id, p.date)}
                          style={{
                            background: "rgba(16, 185, 129, 0.15)",
                            color: "#10b981",
                            border: `1px solid rgba(16, 185, 129, 0.25)`,
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(16, 185, 129, 0.25)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(16, 185, 129, 0.15)";
                          }}
                        >
                          Restore
                        </button>
                      </div>
                    );
                  }

                  const exp = (expenses || []).find(e => e.id === p.expenseId);
                  const bId = exp ? exp.bankId : null;
                  const b = bId ? [...(banks||[]), ...(creditCards||[])].find(x => x.id === bId) : null;
                  const bankName = b ? b.name : (exp ? (exp.paymentMode || "Cash") : "—");
                  const trxNo = exp ? exp.trxNo : "—";
                  return (
                    <div key={"paid-"+idx} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}`, padding: "12px 16px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 18, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✅</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>Paid</div>
                            <div style={{ fontSize: 9, background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: 12, color: COLORS.textMuted, fontWeight: 600 }}>{trxNo}</div>
                          </div>
                          <div style={{ fontSize: 11, color: COLORS.textMuted }}>{formatLocalDateString(p.date)} • {bankName}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>₹{parseFloat(p.amount).toLocaleString("en-IN")}</div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          )}

        </div>
      )}

      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,minmax(80px,1fr))",gap:9,marginBottom:14 }}>
        <div style={{ background:"#1a2236",padding:"12px 16px",borderRadius:12,border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:4 }}>Monthly Cost</div>
          <div style={{ fontSize:16,fontWeight:700,color:COLORS.danger }}>₹{monthlyTotal.toLocaleString("en-IN")}</div>
        </div>
        <div style={{ background:"#1a2236",padding:"12px 16px",borderRadius:12,border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:4 }}>Annual Total</div>
          <div style={{ fontSize:16,fontWeight:700,color:"#F59E0B" }}>₹{(annualCost/1000).toFixed(1)}K</div>
        </div>
        <div style={{ background:"#1a2236",padding:"12px 16px",borderRadius:12,border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:4 }}>Active Subs</div>
          <div style={{ fontSize:16,fontWeight:700,color:"#3B82F6" }}>{subscriptions ? subscriptions.filter(s=>s.status!=="Paused").length : 0}</div>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12 }}>
        {subscriptions && subscriptions.map((s,i) => (
          <div key={i} onClick={() => { setEditItem(s); setForm(s); setShowForm(true); }} style={{ background:"#1a2236",borderRadius:12,border:`1px solid ${COLORS.border}`,position:"relative",overflow:"hidden",cursor:"pointer", opacity: s.status==="Paused"?0.6:1 }}>
            <div style={{ position:"absolute",left:0,top:0,bottom:0,width:4,background:s.color }} />
            <div style={{ padding:12,paddingLeft:16 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                <div style={{ fontSize:20 }}>{s.icon}</div>
                <div style={{ fontSize:9,background:s.status==="Paused"?"#f59e0b33":"rgba(255,255,255,0.1)",padding:"2px 8px",borderRadius:12,color:s.status==="Paused"?"#f59e0b":COLORS.textMuted }}>{s.status==="Paused" ? "Paused" : s.cycle}</div>
              </div>
              <div style={{ fontSize:13,fontWeight:600,color:COLORS.text,marginBottom:2 }}>{s.name}</div>
              <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:8 }}>{s.category}</div>
              <div style={{ fontSize:16,fontWeight:700,color:s.color,marginBottom:2 }}>₹{s.amount.toLocaleString("en-IN")}</div>
              <div style={{ fontSize:10,color:COLORS.textMuted }}>{fmtSubDue(s)}</div>
            </div>
          </div>
        ))}
      </div>

      {restoreConfirm && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.72)", zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <div style={{ background: "#111827", border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: "24px 20px", maxWidth: 320, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 26, textAlign: "center", marginBottom: 10 }}>🔄</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, textAlign: "center", marginBottom: 6 }}>Restore Cycle?</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, textAlign: "center", marginBottom: 20 }}>
              Restore this 'Not Used' cycle back to the due/upcoming list?
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button 
                onClick={() => setRestoreConfirm(null)} 
                style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.textMuted, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmRestoreSkipped} 
                style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "#10b981", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ─── Health Score View ────────────────────────────────────────────────────────
function HealthScoreView() {
  const score = 74;
  const metrics = [
    { label:"Savings Ratio",      value:42.9, benchmark:30,  status:"excellent", desc:"You save 42.9% of income. Excellent! Benchmark is 30%." },
    { label:"Debt-to-Income",     value:30.8, benchmark:36,  status:"good",      desc:"EMI is 30.8% of income. Below the 36% safe limit." },
    { label:"Investment Ratio",   value:28.3, benchmark:20,  status:"excellent", desc:"28.3% invested monthly. Well above the 20% benchmark." },
    { label:"Emergency Fund",     value:80,   benchmark:100, status:"fair",      desc:"4 months covered. Target is 6 months (₹4.1L needed)." },
    { label:"Net Worth Growth",   value:8.2,  benchmark:12,  status:"fair",      desc:"8.2% YoY growth. Aim for 12%+ via equity SIPs." },
    { label:"Insurance Coverage", value:60,   benchmark:100, status:"poor",      desc:"Term cover ₹50L. Recommended: 15–20x annual income." },
  ];
  const statusColor = { excellent:COLORS.secondary, good:COLORS.primary, fair:COLORS.accent, poor:COLORS.danger };
  const tips = [
    { icon:"💡", tip:"Increase term life cover to ₹1.5Cr for better protection.", type:"Action" },
    { icon:"📈", tip:"Add ₹5K/month SIP to reach 12% net worth growth target.",   type:"Invest" },
    { icon:"🏦", tip:"Move ₹80K to FD/liquid fund to complete emergency corpus.",  type:"Safety" },
    { icon:"💳", tip:"Close personal loan early — 14.5% rate is eating savings.",  type:"Debt"   },
  ];
  return (
    <div>
      <div style={{ fontSize:18,fontWeight:700,color:COLORS.text,marginBottom:16 }}>Financial Health Score</div>
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        {/* Score ring */}
        <div style={{ background:COLORS.bgCard,borderRadius:20,padding:"24px 20px",border:`2px solid rgba(108,99,255,0.2)`,display:"flex",flexDirection:"column",alignItems:"center" }}>
          <svg width={140} height={140} viewBox="0 0 160 160">
            <circle cx={80} cy={80} r={65} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14"/>
            <circle cx={80} cy={80} r={65} fill="none" stroke="url(#sg2)" strokeWidth="14"
              strokeDasharray={`${(score/100)*(2*Math.PI*65)} ${2*Math.PI*65}`}
              strokeDashoffset={2*Math.PI*65*0.25} strokeLinecap="round"/>
            <defs><linearGradient id="sg2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={COLORS.primary}/><stop offset="100%" stopColor={COLORS.secondary}/>
            </linearGradient></defs>
            <text x={80} y={74} textAnchor="middle" fill="#F1F5F9" fontSize="32" fontWeight="800">{score}</text>
            <text x={80} y={94} textAnchor="middle" fill={COLORS.textMuted} fontSize="13">/100</text>
          </svg>
          <div style={{ fontSize:18,fontWeight:700,color:COLORS.text,marginTop:8 }}>Good Standing</div>
          <div style={{ fontSize:11,color:COLORS.textMuted,textAlign:"center",marginTop:4 }}>Better than 68% of users in your income bracket</div>
        </div>
        {/* Metrics */}
        <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
          {metrics.map(m=>(
            <div key={m.label} style={{ background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:12,padding:"11px 14px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                <span style={{ fontSize:12,color:COLORS.text,fontWeight:500 }}>{m.label}</span>
                <span style={{ fontSize:10.5,padding:"1px 8px",borderRadius:20,background:`${statusColor[m.status]}22`,color:statusColor[m.status] }}>{m.status}</span>
              </div>
              <div style={{ background:"rgba(255,255,255,0.06)",borderRadius:4,height:5,marginBottom:5 }}>
                <div style={{ height:"100%",width:`${Math.min(m.value/m.benchmark*70,100)}%`,background:statusColor[m.status],borderRadius:4,transition:"width 1s" }}/>
              </div>
              <div style={{ fontSize:10,color:COLORS.textMuted }}>{m.desc}</div>
            </div>
          ))}
        </div>
        {/* AI Tips */}
        <div style={{ background:COLORS.bgCard,border:`1px solid rgba(108,99,255,0.2)`,borderRadius:14,padding:"14px 16px" }}>
          <div style={{ fontSize:13,fontWeight:600,color:COLORS.text,marginBottom:10 }}>✦ Personalized Action Items</div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {tips.map(t=>(
              <div key={t.tip} style={{ display:"flex",gap:12,alignItems:"flex-start",padding:"9px 11px",background:"rgba(255,255,255,0.03)",borderRadius:10 }}>
                <span style={{ fontSize:18,flexShrink:0 }}>{t.icon}</span>
                <div>
                  <div style={{ fontSize:10,color:COLORS.primary,fontWeight:600,marginBottom:2 }}>{t.type}</div>
                  <div style={{ fontSize:12,color:COLORS.textMuted,lineHeight:1.5 }}>{t.tip}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Retirement View ──────────────────────────────────────────────────────────
function RetirementView() {
  const [monthlyExpense, setMonthlyExpense] = useState(68500);
  const [currentAge,    setCurrentAge]     = useState(32);
  const [retireAge,     setRetireAge]      = useState(60);
  const [inflation,     setInflation]      = useState(6);
  const [returnRate,    setReturnRate]     = useState(12);
  const [currentCorpus, setCurrentCorpus] = useState(340000);
  const [monthlySIP,    setMonthlySIP]    = useState(35000);

  const years       = retireAge - currentAge;
  const inflatedExp = monthlyExpense * Math.pow(1+inflation/100, years);
  const corpus      = inflatedExp * 12 * 25;
  const futureCorpus= currentCorpus * Math.pow(1+returnRate/100, years);
  const mRate       = returnRate/100/12;
  const months      = years * 12;
  const sipFV       = monthlySIP * ((Math.pow(1+mRate,months)-1)/mRate) * (1+mRate);
  const totalFV     = futureCorpus + sipFV;
  const onTrack     = totalFV >= corpus;
  const gap         = Math.max(corpus - totalFV, 0);
  const reqSIP      = gap > 0 ? (gap * mRate)/(Math.pow(1+mRate,months)-1) : 0;

  const iStyle = { background:"#1a2236",border:`1px solid ${COLORS.border}`,borderRadius:9,padding:"8px 12px",color:COLORS.text,fontSize:13,width:"100%",outline:"none",boxSizing:"border-box",WebkitAppearance:"none",appearance:"none",caretColor:"#6C63FF" };

  const milestones = [
    { age:35, label:"First ₹10L corpus",   done:true  },
    { age:40, label:"₹50L net worth",      done:false },
    { age:45, label:"₹1Cr portfolio",      done:false },
    { age:50, label:"Kids education done", done:false },
    { age:55, label:"Home loan closed",    done:false },
    { age:60, label:"Retire 🎉",           done:false },
  ];

  const fields = [
    { label:"Monthly Expenses (₹)", val:monthlyExpense, set:setMonthlyExpense },
    { label:"Current Age",           val:currentAge,    set:setCurrentAge     },
    { label:"Retirement Age",        val:retireAge,     set:setRetireAge      },
    { label:"Inflation Rate (%)",    val:inflation,     set:setInflation      },
    { label:"Expected Return (%)",   val:returnRate,    set:setReturnRate     },
    { label:"Current Corpus (₹)",    val:currentCorpus, set:setCurrentCorpus  },
    { label:"Monthly SIP (₹)",       val:monthlySIP,    set:setMonthlySIP     },
  ];

  return (
    <div>
      <div style={{ fontSize:18,fontWeight:700,color:COLORS.text,marginBottom:4 }}>Retirement Corpus Planner</div>
      <div style={{ fontSize:12,color:COLORS.textMuted,marginBottom:16 }}>Plan your retirement with SIP projections</div>
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        {/* Inputs */}
        <div style={{ background:COLORS.bgCard,borderRadius:16,padding:"16px",border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:13,fontWeight:600,color:COLORS.text,marginBottom:12 }}>Your Details</div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,minmax(80px,1fr))",gap:10 }}>
            {fields.map(f=>(
              <div key={f.label}>
                <label style={{ fontSize:10,color:COLORS.textMuted,display:"block",marginBottom:4 }}>{f.label}</label>
                <input type="number" inputMode="numeric" value={f.val} onChange={e=>f.set(+e.target.value)} style={iStyle}/>
              </div>
            ))}
          </div>
        </div>
        {/* Status */}
        <div style={{ background:onTrack?"rgba(0,200,150,0.08)":"rgba(255,91,91,0.08)",border:`1px solid ${onTrack?COLORS.secondary:COLORS.danger}44`,borderRadius:14,padding:"16px" }}>
          <div style={{ fontSize:11,color:COLORS.textMuted }}>STATUS</div>
          <div style={{ fontSize:20,fontWeight:800,color:onTrack?COLORS.secondary:COLORS.danger,marginTop:4 }}>{onTrack?"✅ On Track!":"⚠️ Needs Attention"}</div>
          <div style={{ fontSize:11,color:COLORS.textMuted,marginTop:4 }}>{onTrack?`Surplus: ₹${((totalFV-corpus)/10000000).toFixed(2)}Cr`:`Shortfall: ₹${(gap/10000000).toFixed(2)}Cr`}</div>
        </div>
        {/* Results grid */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,minmax(80px,1fr))",gap:10 }}>
          {[
            { label:"Years to Retire",       val:`${years} yrs`,                                          color:COLORS.primary   },
            { label:"Target Corpus",          val:`₹${(corpus/10000000).toFixed(2)}Cr`,                   color:COLORS.primary,  big:true },
            { label:"Projected Corpus",       val:`₹${(totalFV/10000000).toFixed(2)}Cr`,                  color:COLORS.secondary,big:true },
            { label:"Monthly Expense @60",    val:`₹${Math.round(inflatedExp).toLocaleString("en-IN")}`,  color:COLORS.accent    },
            { label:"Req. SIP (if gap)",      val:reqSIP>0?`₹${Math.round(reqSIP).toLocaleString("en-IN")}`:"None 🎉", color:reqSIP>0?COLORS.danger:COLORS.secondary },
            { label:"Retirement Age",         val:`Age ${retireAge}`,                                     color:COLORS.textMuted },
          ].map(r=>(
            <div key={r.label} style={{ background:COLORS.bgCard,borderRadius:12,padding:"12px 14px",border:`1px solid ${r.big?r.color+"44":COLORS.border}` }}>
              <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:4 }}>{r.label}</div>
              <div style={{ fontSize:r.big?16:13,fontWeight:r.big?700:600,color:r.color }}>{r.val}</div>
            </div>
          ))}
        </div>
        {/* Milestones */}
        <div style={{ background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:14,padding:"14px 16px" }}>
          <div style={{ fontSize:12,fontWeight:600,color:COLORS.text,marginBottom:10 }}>🗺️ Retirement Milestones</div>
          <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
            {milestones.map(m=>(
              <div key={m.age} style={{ display:"flex",gap:10,alignItems:"center" }}>
                <div style={{ width:28,height:28,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,background:m.done?`${COLORS.secondary}25`:"rgba(255,255,255,0.05)",color:m.done?COLORS.secondary:COLORS.textMuted,border:`1.5px solid ${m.done?COLORS.secondary:"rgba(255,255,255,0.1)"}` }}>{m.done?"✓":m.age}</div>
                <span style={{ fontSize:12,color:m.done?COLORS.text:COLORS.textMuted }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FreedomCalcView() {
  const [income, setIncome] = useState(120000);
  const [expense, setExpense] = useState(68500);
  const [corpus, setCorpus] = useState(1240000);
  const [returnRate, setReturnRate] = useState(10);
  const [inflationRate, setInflationRate] = useState(6);

  const monthlySavings = income - expense;
  const savingsRate = ((monthlySavings / income) * 100).toFixed(1);
  const realReturn = returnRate - inflationRate;
  const annualExpense = expense * 12;
  const ffCorpus = (annualExpense * 25); // 4% SWR
  const yearsToFF = realReturn > 0
    ? Math.log((ffCorpus - corpus * (realReturn / 100)) / (ffCorpus - corpus * (realReturn / 100) - monthlySavings * 12)) / Math.log(1 + realReturn / 100)
    : (ffCorpus - corpus) / (monthlySavings * 12);
  const ffYear = new Date().getFullYear() + Math.ceil(yearsToFF);
  const fiNumber = ffCorpus;
  const progress = Math.min((corpus / fiNumber) * 100, 100).toFixed(1);

  const stages = [
    { label: "Solvency", desc: "No debt, positive net worth", done: true },
    { label: "Stability", desc: "3–6 months emergency fund", done: true },
    { label: "Agency", desc: "Can survive 1 year without income", done: false },
    { label: "Security", desc: "Investments cover basic needs", done: false },
    { label: "Independence", desc: "Investments cover all expenses", done: false },
    { label: "Abundance", desc: "Wealth well beyond needs", done: false },
  ];

  const inputStyle = { background: "rgba(255,255,255,0.06)", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 12px", color: COLORS.text, fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box" };
  const labelStyle = { fontSize: 11, color: COLORS.textMuted, marginBottom: 4, display: "block" };

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>🏁 Financial Freedom Calculator</div>
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 20 }}>Find your FI Number and retirement date — based on the 4% Safe Withdrawal Rule</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
        {/* Inputs */}
        <div style={{ background: COLORS.bgCard, borderRadius: 16, padding: "20px", border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>Your Numbers</div>
          {[
            { label: "Monthly Income (₹)", val: income, set: setIncome },
            { label: "Monthly Expenses (₹)", val: expense, set: setExpense },
            { label: "Current Corpus (₹)", val: corpus, set: setCorpus },
            { label: "Expected Investment Return (%)", val: returnRate, set: setReturnRate },
            { label: "Inflation Rate (%)", val: inflationRate, set: setInflationRate },
          ].map(f => (
            <div key={f.label}>
              <label style={labelStyle}>{f.label}</label>
              <input type="number" value={f.val} onChange={e => f.set(+e.target.value)} style={inputStyle} />
            </div>
          ))}
          <div style={{ background: `${COLORS.secondary}15`, border: `1px solid ${COLORS.secondary}30`, borderRadius: 10, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>Monthly Savings</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.secondary }}>₹{monthlySavings.toLocaleString("en-IN")} <span style={{ fontSize: 12, fontWeight: 400 }}>({savingsRate}% rate)</span></div>
          </div>
        </div>

        {/* Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* FI Number */}
          <div style={{ background: `linear-gradient(135deg, rgba(108,99,255,0.15), rgba(0,200,150,0.08))`, border: `1px solid rgba(108,99,255,0.25)`, borderRadius: 18, padding: "22px 24px" }}>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>YOUR FI NUMBER (25× annual expenses)</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.text, letterSpacing: "-1px" }}>
              ₹{(fiNumber / 10000000).toFixed(2)} <span style={{ fontSize: 16, fontWeight: 500, color: COLORS.textMuted }}>Crore</span>
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>You need this corpus to retire and live off returns forever</div>
          </div>

          {/* Progress to FI */}
          <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>Progress to Financial Independence</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary }}>{progress}%</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 6, height: 12, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${progress}%`, borderRadius: 6, background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})`, transition: "width 1.2s ease", boxShadow: `0 0 10px ${COLORS.primary}55` }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: COLORS.textMuted }}>
              <span>Current: ₹{(corpus/100000).toFixed(1)}L</span>
              <span>Target: ₹{(fiNumber/100000).toFixed(0)}L</span>
            </div>
          </div>

          {/* Years to FI */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Years to Financial Freedom</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.accent }}>{Math.ceil(yearsToFF)} yrs</div>
            </div>
            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Freedom Year</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.secondary }}>{ffYear}</div>
            </div>
          </div>

          {/* FI Stages */}
          <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, marginBottom: 12 }}>Your FI Journey Stages</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {stages.map((s, i) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: s.done ? `${COLORS.secondary}25` : "rgba(255,255,255,0.05)", color: s.done ? COLORS.secondary : COLORS.textMuted, border: `1.5px solid ${s.done ? COLORS.secondary : "rgba(255,255,255,0.1)"}` }}>{s.done ? "✓" : i + 1}</div>
                  <div>
                    <span style={{ fontSize: 12, color: s.done ? COLORS.text : COLORS.textMuted, fontWeight: s.done ? 600 : 400 }}>{s.label}</span>
                    <span style={{ fontSize: 10.5, color: COLORS.textMuted, marginLeft: 6 }}>· {s.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reports View ─────────────────────────────────────────────────────────────
function ReportsView() {
  const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const data = [
    { month: "Jul", income: 95000, expense: 72000, savings: 23000 },
    { month: "Aug", income: 105000, expense: 68000, savings: 37000 },
    { month: "Sep", income: 110000, expense: 71000, savings: 39000 },
    { month: "Oct", income: 115000, expense: 69000, savings: 46000 },
    { month: "Nov", income: 118000, expense: 66000, savings: 52000 },
    { month: "Dec", income: 120000, expense: 68500, savings: 51500 },
  ];
  const totalIncome = data.reduce((a,d)=>a+d.income,0);
  const totalExpense = data.reduce((a,d)=>a+d.expense,0);
  const totalSavings = data.reduce((a,d)=>a+d.savings,0);

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>Reports & Analytics</div>
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 18 }}>6-month financial summary · Jul–Dec 2024</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(80px,1fr))", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Total Income", val: `₹${(totalIncome/100000).toFixed(2)}L`, color: COLORS.secondary },
          { label: "Total Expense", val: `₹${(totalExpense/100000).toFixed(2)}L`, color: COLORS.danger },
          { label: "Total Savings", val: `₹${(totalSavings/100000).toFixed(2)}L`, color: COLORS.primary },
        ].map(s => (
          <div key={s.label} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", padding: "10px 18px", borderBottom: `1px solid ${COLORS.border}` }}>
          {["Month", "Income", "Expense", "Savings", "Rate"].map(h => (
            <div key={h} style={{ fontSize: 10.5, color: COLORS.textMuted, fontWeight: 600 }}>{h.toUpperCase()}</div>
          ))}
        </div>
        {data.map((d, i) => (
          <div key={d.month} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", padding: "13px 18px", borderBottom: i < data.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none" }}>
            <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>{d.month} '24</div>
            <div style={{ fontSize: 12, color: COLORS.secondary }}>₹{d.income.toLocaleString("en-IN")}</div>
            <div style={{ fontSize: 12, color: COLORS.danger }}>₹{d.expense.toLocaleString("en-IN")}</div>
            <div style={{ fontSize: 12, color: COLORS.primary }}>₹{d.savings.toLocaleString("en-IN")}</div>
            <div style={{ fontSize: 12, color: COLORS.accent }}>{((d.savings/d.income)*100).toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── All monthly data (single source of truth) ────────────────────────────────
const ALL_MONTHLY_DATA = [
  { year: 2024, month: 1,  label: "Jan '24", income: 90000,  expense: 65000, savings: 25000 },
  { year: 2024, month: 2,  label: "Feb '24", income: 90000,  expense: 62000, savings: 28000 },
  { year: 2024, month: 3,  label: "Mar '24", income: 95000,  expense: 70000, savings: 25000 },
  { year: 2024, month: 4,  label: "Apr '24", income: 95000,  expense: 67000, savings: 28000 },
  { year: 2024, month: 5,  label: "May '24", income: 100000, expense: 71000, savings: 29000 },
  { year: 2024, month: 6,  label: "Jun '24", income: 100000, expense: 69000, savings: 31000 },
  { year: 2024, month: 7,  label: "Jul '24", income: 95000,  expense: 72000, savings: 23000 },
  { year: 2024, month: 8,  label: "Aug '24", income: 105000, expense: 68000, savings: 37000 },
  { year: 2024, month: 9,  label: "Sep '24", income: 110000, expense: 71000, savings: 39000 },
  { year: 2024, month: 10, label: "Oct '24", income: 115000, expense: 69000, savings: 46000 },
  { year: 2024, month: 11, label: "Nov '24", income: 118000, expense: 66000, savings: 52000 },
  { year: 2024, month: 12, label: "Dec '24", income: 120000, expense: 68500, savings: 51500 },
  { year: 2025, month: 1,  label: "Jan '25", income: 122000, expense: 70000, savings: 52000 },
  { year: 2025, month: 2,  label: "Feb '25", income: 122000, expense: 67000, savings: 55000 },
  { year: 2025, month: 3,  label: "Mar '25", income: 125000, expense: 72000, savings: 53000 },
  { year: 2025, month: 4,  label: "Apr '25", income: 125000, expense: 68000, savings: 57000 },
  { year: 2025, month: 5,  label: "May '25", income: 128000, expense: 71000, savings: 57000 },
  { year: 2025, month: 6,  label: "Jun '25", income: 120000, expense: 69500, savings: 50500 },
];

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Utility: filter rows by a dateFilter object
function applyDateFilter(rows, df) {
  if (df.mode === "month") {
    return rows.filter(r => r.year === df.year && r.month === df.month);
  }
  if (df.mode === "year") {
    return rows.filter(r => r.year === df.year);
  }
  if (df.mode === "range") {
    const from = df.fromYear * 100 + df.fromMonth;
    const to   = df.toYear   * 100 + df.toMonth;
    return rows.filter(r => {
      const key = r.year * 100 + r.month;
      return key >= from && key <= to;
    });
  }
  return rows;
}

function sumRows(rows) {
  return rows.reduce((acc, r) => ({
    income:  acc.income  + r.income,
    expense: acc.expense + r.expense,
    savings: acc.savings + r.savings,
  }), { income: 0, expense: 0, savings: 0 });
}

function filterLabel(df) {
  if (df.mode === "month") return `${MONTH_NAMES[df.month-1]} ${df.year}`;
  if (df.mode === "year")  return `FY ${df.year}`;
  if (df.mode === "range") return `${MONTH_NAMES[df.fromMonth-1]} ${df.fromYear} → ${MONTH_NAMES[df.toMonth-1]} ${df.toYear}`;
  return "";
}

// ─── Global Filter Bar ────────────────────────────────────────────────────────
function FilterBar({ filter, setFilter }) {
  const [expanded,   setExpanded]   = useState(false);
  const [showRange,  setShowRange]  = useState(false);
  const [rangeFrom,  setRangeFrom]  = useState({ month:1, year:new Date().getFullYear() });
  const [rangeTo,    setRangeTo]    = useState({ month:new Date().getMonth()+1, year:new Date().getFullYear() });
  const now = new Date();
  const curMonth = now.getMonth()+1, curYear = now.getFullYear();
  const lm = curMonth===1?12:curMonth-1, ly = curMonth===1?curYear-1:curYear;
  const years = Array.from({length:4},(_,i)=>curYear-1+i);

  const selS = { background:"#1a2236", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"7px 8px", color:COLORS.text, fontSize:12, outline:"none", cursor:"pointer", WebkitAppearance:"none", appearance:"none", flex:1 };
  const pill = (active, onClick, label) => (
    <button onClick={onClick} style={{ padding:"5px 11px", borderRadius:20, fontSize:11, cursor:"pointer", border:`1px solid ${active?COLORS.primary:COLORS.border}`, background:active?`${COLORS.primary}25`:"transparent", color:active?COLORS.primary:COLORS.textMuted, fontWeight:active?700:400, whiteSpace:"nowrap", transition:"all 0.15s", flexShrink:0 }}>{label}</button>
  );

  const isDefault = filter.mode==="month" && filter.month===curMonth && filter.year===curYear;

  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${expanded?COLORS.primary+"55":COLORS.border}`, borderRadius:14, marginBottom:12, width:"100%", boxSizing:"border-box", overflow:"hidden", transition:"border-color 0.2s" }}>

      {/* ── Always-visible collapsed bar ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", cursor:"pointer" }} onClick={()=>{ setExpanded(e=>!e); if(expanded) setShowRange(false); }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
          <span style={{ fontSize:14, flexShrink:0 }}>📅</span>
          {/* When collapsed: show quick pills inline */}
          {!expanded && (
            <div style={{ display:"flex", gap:5, flexWrap:"nowrap", overflow:"hidden" }}>
              {[
                { label:"This Month", active:filter.mode==="month"&&filter.month===curMonth&&filter.year===curYear, onClick:()=>setFilter({mode:"month",month:curMonth,year:curYear}) },
                { label:"Last Month", active:filter.mode==="month"&&filter.month===lm&&filter.year===ly, onClick:()=>setFilter({mode:"month",month:lm,year:ly}) },
                { label:"Q1",active:filter.mode==="range"&&filter.fromMonth===1&&filter.toMonth===3&&filter.fromYear===curYear, onClick:()=>setFilter({mode:"range",fromMonth:1,fromYear:curYear,toMonth:3,toYear:curYear}) },
                { label:"Q2",active:filter.mode==="range"&&filter.fromMonth===4&&filter.toMonth===6&&filter.fromYear===curYear, onClick:()=>setFilter({mode:"range",fromMonth:4,fromYear:curYear,toMonth:6,toYear:curYear}) },
                { label:"Q3",active:filter.mode==="range"&&filter.fromMonth===7&&filter.toMonth===9&&filter.fromYear===curYear, onClick:()=>setFilter({mode:"range",fromMonth:7,fromYear:curYear,toMonth:9,toYear:curYear}) },
                { label:"Q4",active:filter.mode==="range"&&filter.fromMonth===10&&filter.toMonth===12&&filter.fromYear===curYear, onClick:()=>setFilter({mode:"range",fromMonth:10,fromYear:curYear,toMonth:12,toYear:curYear}) },
              ].map(p=>(
                <button key={p.label} onClick={e=>{ e.stopPropagation(); p.onClick(); }} style={{ padding:"4px 10px", borderRadius:20, fontSize:10.5, cursor:"pointer", border:`1px solid ${p.active?COLORS.primary:COLORS.border}`, background:p.active?`${COLORS.primary}25`:"transparent", color:p.active?COLORS.primary:COLORS.textMuted, fontWeight:p.active?700:400, whiteSpace:"nowrap", flexShrink:0 }}>{p.label}</button>
              ))}
            </div>
          )}
          {expanded && <span style={{ fontSize:12, color:COLORS.primary, fontWeight:600 }}>Date Filter</span>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0, marginLeft:8 }}>
          {/* Active filter badge — always visible */}
          <span style={{ fontSize:10.5, fontWeight:700, color:COLORS.accent, background:`${COLORS.accent}18`, padding:"3px 9px", borderRadius:20, border:`1px solid ${COLORS.accent}33`, whiteSpace:"nowrap" }}>{filterLabel(filter)}</span>
          {!isDefault && (
            <button onClick={e=>{ e.stopPropagation(); setFilter({mode:"month",month:curMonth,year:curYear}); }} style={{ fontSize:10, color:COLORS.textMuted, background:"rgba(255,255,255,0.06)", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"3px 7px", cursor:"pointer", whiteSpace:"nowrap" }}>Reset</button>
          )}
          {/* Expand / Collapse toggle */}
          <div style={{ width:26, height:26, borderRadius:8, background:expanded?`${COLORS.primary}22`:"rgba(255,255,255,0.06)", border:`1px solid ${expanded?COLORS.primary+"55":COLORS.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}>
            <span style={{ fontSize:12, color:expanded?COLORS.primary:COLORS.textMuted, display:"block", transform:expanded?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.25s" }}>▾</span>
          </div>
        </div>
      </div>

      {/* ── Expandable panel ── */}
      {expanded && (
        <div style={{ padding:"0 12px 14px", borderTop:`1px solid ${COLORS.border}` }}>

          {/* Quick pills row */}
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", alignItems:"center", paddingTop:12, marginBottom:12 }}>
            {pill(filter.mode==="month"&&filter.month===curMonth&&filter.year===curYear, ()=>{setFilter({mode:"month",month:curMonth,year:curYear});setShowRange(false);}, "This Month")}
            {pill(filter.mode==="month"&&filter.month===lm&&filter.year===ly, ()=>{setFilter({mode:"month",month:lm,year:ly});setShowRange(false);}, "Last Month")}
            {[{l:"Q1",m:[1,3]},{l:"Q2",m:[4,6]},{l:"Q3",m:[7,9]},{l:"Q4",m:[10,12]}].map(q=>{
              const isA=filter.mode==="range"&&filter.fromMonth===q.m[0]&&filter.toMonth===q.m[1]&&filter.fromYear===curYear&&filter.toYear===curYear;
              return pill(isA,()=>{setFilter({mode:"range",fromMonth:q.m[0],fromYear:curYear,toMonth:q.m[1],toYear:curYear});setShowRange(false);},q.l);
            })}
            {pill(filter.mode==="year"&&filter.year===curYear, ()=>{setFilter({mode:"year",year:curYear});setShowRange(false);}, `${curYear}`)}
            {pill(filter.mode==="year"&&filter.year===curYear-1, ()=>{setFilter({mode:"year",year:curYear-1});setShowRange(false);}, `${curYear-1}`)}
            <button onClick={()=>setShowRange(s=>!s)} style={{ padding:"5px 11px", borderRadius:20, fontSize:11, cursor:"pointer", border:`1px solid ${showRange||filter.mode==="range"?COLORS.accent:COLORS.border}`, background:showRange||filter.mode==="range"?`${COLORS.accent}20`:"transparent", color:showRange||filter.mode==="range"?COLORS.accent:COLORS.textMuted, whiteSpace:"nowrap" }}>⚙ Range</button>
          </div>

          {/* Month grid 6×2 */}
          <div style={{ fontSize:10, color:COLORS.textMuted, marginBottom:6 }}>Select Month</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:4, marginBottom:8 }}>
            {MONTH_NAMES.map((m,i)=>{
              const mo=i+1, isA=filter.mode==="month"&&filter.month===mo;
              return <button key={m} onClick={()=>{setFilter({mode:"month",month:mo,year:filter.year||curYear});setShowRange(false);}} style={{ padding:"5px 2px", borderRadius:12, fontSize:10.5, cursor:"pointer", border:`1px solid ${isA?COLORS.secondary:COLORS.border}`, background:isA?`${COLORS.secondary}22`:"transparent", color:isA?COLORS.secondary:COLORS.textMuted, fontWeight:isA?700:400 }}>{m}</button>;
            })}
          </div>

          {/* Year row */}
          <div style={{ display:"flex", gap:5, marginBottom:showRange?12:0 }}>
            {years.map(y=>{
              const isA=(filter.mode==="month"||filter.mode==="year")&&filter.year===y;
              return <button key={y} onClick={()=>setFilter(f=>({...f,mode:"month",year:y}))} style={{ flex:1, padding:"6px 4px", borderRadius:10, fontSize:11, cursor:"pointer", border:`1px solid ${isA?COLORS.primary:COLORS.border}`, background:isA?`${COLORS.primary}22`:"transparent", color:isA?COLORS.primary:COLORS.textMuted, fontWeight:isA?700:400 }}>{y}</button>;
            })}
          </div>

          {/* Custom range panel */}
          {showRange && (
            <div style={{ padding:"11px 12px", background:"rgba(255,183,71,0.06)", border:`1px solid rgba(255,183,71,0.2)`, borderRadius:10 }}>
              <div style={{ fontSize:11, color:COLORS.accent, fontWeight:600, marginBottom:10 }}>📆 Custom Range</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <div style={{ fontSize:10, color:COLORS.textMuted, marginBottom:5 }}>FROM</div>
                  <div style={{ display:"flex", gap:5 }}>
                    <select value={rangeFrom.month} onChange={e=>setRangeFrom(f=>({...f,month:parseInt(e.target.value)}))} style={selS}>{MONTH_NAMES.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select>
                    <select value={rangeFrom.year}  onChange={e=>setRangeFrom(f=>({...f,year:parseInt(e.target.value)}))}  style={selS}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:10, color:COLORS.textMuted, marginBottom:5 }}>TO</div>
                  <div style={{ display:"flex", gap:5 }}>
                    <select value={rangeTo.month} onChange={e=>setRangeTo(f=>({...f,month:parseInt(e.target.value)}))} style={selS}>{MONTH_NAMES.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select>
                    <select value={rangeTo.year}  onChange={e=>setRangeTo(f=>({...f,year:parseInt(e.target.value)}))}  style={selS}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
                  </div>
                </div>
              </div>
              <button onClick={()=>{setFilter({mode:"range",fromMonth:rangeFrom.month,fromYear:rangeFrom.year,toMonth:rangeTo.month,toYear:rangeTo.year});setShowRange(false);setExpanded(false);}} style={{ marginTop:10, width:"100%", padding:"9px", borderRadius:9, border:"none", background:`linear-gradient(135deg,${COLORS.accent},#f59e0b)`, color:"#000", fontSize:12.5, fontWeight:700, cursor:"pointer" }}>Apply & Close</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Filtered Dashboard View ──────────────────────────────────────────────────
function DashboardViewFiltered({ filter }) {
  const filtered = applyDateFilter(ALL_MONTHLY_DATA, filter);
  const totals   = sumRows(filtered);
  const savingsRate = totals.income > 0 ? ((totals.savings / totals.income) * 100).toFixed(1) : 0;
  const months   = filtered.map(r => MONTH_NAMES[r.month - 1]);
  const incArr   = filtered.map(r => r.income);
  const expArr   = filtered.map(r => r.expense);

  // Compare to previous equivalent period
  const prevFilter = filter.mode === "month"
    ? { mode:"month", month: filter.month===1?12:filter.month-1, year: filter.month===1?filter.year-1:filter.year }
    : filter.mode === "year" ? { mode:"year", year: filter.year-1 }
    : { mode:"range", fromMonth:filter.fromMonth, fromYear:filter.fromYear-1, toMonth:filter.toMonth, toYear:filter.toYear-1 };
  const prevTotals = sumRows(applyDateFilter(ALL_MONTHLY_DATA, prevFilter));
  const incomeTrend  = prevTotals.income  > 0 ? +((totals.income  - prevTotals.income)  / prevTotals.income  * 100).toFixed(1) : 0;
  const expenseTrend = prevTotals.expense > 0 ? +((totals.expense - prevTotals.expense) / prevTotals.expense * 100).toFixed(1) : 0;
  const savingsTrend = prevTotals.savings > 0 ? +((totals.savings - prevTotals.savings) / prevTotals.savings * 100).toFixed(1) : 0;

  const invData = [
    { name: "Mutual Funds", value: 140000, color: COLORS.primary },
    { name: "Stocks",       value: 80000,  color: COLORS.accent },
    { name: "FD",           value: 60000,  color: COLORS.secondary },
    { name: "Gold",         value: 40000,  color: "#F59E0B" },
    { name: "PPF",          value: 20000,  color: "#8B5CF6" },
  ];
  const goals = [
    { label: "House 2029",     pct: 12, color: COLORS.primary },
    { label: "Car 2025",       pct: 65, color: COLORS.secondary },
    { label: "Retirement",     pct: 22, color: COLORS.accent },
    { label: "Emergency Fund", pct: 80, color: "#8B5CF6" },
  ];

  const noData = filtered.length === 0;

  if (noData) return (
    <div style={{ textAlign:"center", padding:"60px 20px", color:COLORS.textMuted }}>
      <div style={{ fontSize:36, marginBottom:12 }}>📭</div>
      <div style={{ fontSize:15, fontWeight:600, color:COLORS.text }}>No data for this period</div>
      <div style={{ fontSize:12, marginTop:6 }}>Try selecting a different date range</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* KPI Row — driven by filter */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 12 }}>
        <KPICard label="Total Income"   value={totals.income}   trend={incomeTrend}  trendLabel="vs prev period" color={COLORS.secondary} sparkData={incArr.length>1?incArr:[totals.income,totals.income]}   icon="↑" />
        <KPICard label="Total Expense"  value={totals.expense}  trend={expenseTrend} trendLabel="vs prev period" color={COLORS.danger}    sparkData={expArr.length>1?expArr:[totals.expense,totals.expense]} icon="↓" />
        <KPICard label="Net Savings"    value={totals.savings}  trend={savingsTrend} trendLabel="vs prev period" color={COLORS.accent}    sparkData={filtered.map(r=>r.savings)}                            icon="★" />
        <KPICard label="Savings Rate"   value={parseFloat(savingsRate)} prefix="" suffix="%" trend={0} trendLabel="" color={COLORS.primary} sparkData={filtered.map(r=>r.income>0?(r.savings/r.income*100):0)} icon="⊕" />
        <KPICard label="Investments"    value={340000}          trend={5.4}          trendLabel="portfolio gain" color="#8B5CF6"          sparkData={[260000,280000,295000,310000,325000,340000]}            icon="◎" />
        <KPICard label="Net Worth"      value={1240000}         trend={8.2}          trendLabel="vs last year"  color={COLORS.primary}   sparkData={[900000,980000,1050000,1100000,1180000,1240000]}        icon="◈" />
      </div>

      {/* Charts Row */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ gridColumn: "unset", background: COLORS.bgCard, borderRadius: 16, padding: "16px 18px", border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>Income vs Expense</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>{filterLabel(filter)}</div>
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 10.5 }}>
              <span style={{ color: COLORS.secondary }}>● Income</span>
              <span style={{ color: COLORS.danger }}>● Expense</span>
            </div>
          </div>
          {months.length >= 2
            ? <BarChart months={months} income={incArr} expense={expArr} />
            : (
              <div style={{ padding: "16px 0" }}>
                {[
                  { label:"Income",  val:totals.income,  color:COLORS.secondary },
                  { label:"Expense", val:totals.expense, color:COLORS.danger },
                  { label:"Savings", val:totals.savings, color:COLORS.accent },
                ].map(r => (
                  <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${COLORS.border}` }}>
                    <span style={{ fontSize:13, color:COLORS.textMuted }}>{r.label}</span>
                    <span style={{ fontSize:14, fontWeight:700, color:r.color }}>₹{r.val.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            )
          }
        </div>
        <div style={{ background: COLORS.bgCard, borderRadius: 16, padding: "16px 18px", border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>Investments</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 10 }}>Allocation</div>
          <div style={{ display: "flex", justifyContent: "center" }}><DonutChart data={invData} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
            {invData.map(d => (
              <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: d.color }} />
                  <span style={{ fontSize: 10, color: COLORS.textMuted }}>{d.name}</span>
                </div>
                <span style={{ fontSize: 10, color: COLORS.text }}>₹{(d.value/1000).toFixed(0)}K</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Goals + AI */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
        <div style={{ background: COLORS.bgCard, borderRadius: 16, padding: "16px 18px", border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 12 }}>Goal Progress</div>
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            {goals.map(g => <CircularProgress key={g.label} pct={g.pct} color={g.color} label={g.label} />)}
          </div>
        </div>
        <div style={{ background: COLORS.bgCard, borderRadius: 16, padding: "16px 18px", border: `1px solid rgba(108,99,255,0.2)`, boxShadow: `0 0 28px rgba(108,99,255,0.07)` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span>✦</span> AI Financial Advisor
            <span style={{ marginLeft:"auto", fontSize:9, background:`${COLORS.primary}33`, color:COLORS.primary, padding:"2px 8px", borderRadius:20, border:`1px solid ${COLORS.primary}44` }}>LIVE</span>
          </div>
          <AIChatPanel />
        </div>
      </div>
    </div>
  );
}

// ─── Filtered Income View ─────────────────────────────────────────────────────
// ─── Live Data Store (localStorage-backed) ───────────────────────────────────
const SEED_INCOME = [];

const SEED_CREDIT_CARDS = [];

const SEED_EXPENSES = [];

function useLocalStorage(key, seed) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return { key, val: stored ? JSON.parse(stored) : seed };
    } catch { return { key, val: seed }; }
  });

  const keyRef = useRef(key);
  keyRef.current = key;

  let currentVal = state.val;
  if (state.key !== key) {
    try {
      const stored = localStorage.getItem(key);
      currentVal = stored ? JSON.parse(stored) : seed;
    } catch { currentVal = seed; }
    setState({ key, val: currentVal });
  }

  const set = (v) => {
    setState(prev => {
      const next = typeof v === "function" ? v(prev.val) : v;
      try { localStorage.setItem(keyRef.current, JSON.stringify(next)); } catch {}
      return { key: keyRef.current, val: next };
    });
  };

  return [currentVal, set];
}

// ─── Income Add/Edit Modal ────────────────────────────────────────────────────
function IncomeModal({ onClose, onSave, editing, banks, creditCards, workspaces, activeWorkspaceId }) {
  const SOURCES = ["Salary","Freelancing","Rental","Business","Dividend","Interest","Bonus","Gift","Other"];
  const ICONS   = { Salary:"💼", Freelancing:"💻", Rental:"🏠", Business:"🏢", Dividend:"📈", Interest:"🏦", Bonus:"🎁", Gift:"🎀", Other:"💰" };
  const SCOLORS = { Salary:COLORS.primary, Freelancing:COLORS.secondary, Rental:COLORS.accent, Business:"#06B6D4", Dividend:"#8B5CF6", Interest:"#F59E0B", Bonus:"#10B981", Gift:"#EC4899", Other:COLORS.textMuted };
  const [form, setForm] = useState(editing || { date: new Date().toISOString().split("T")[0], source:"Salary", amount:"", note:"", receivedFromWorkspaceId:"" });
  const iStyle = { background:"#1a2236", border:`1px solid ${COLORS.border}`, borderRadius:9, padding:"9px 12px", color:COLORS.text, fontSize:13, width:"100%", outline:"none", boxSizing:"border-box", caretColor:"#6C63FF" };
  const valid = form.source && form.amount > 0 && form.date;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:100, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:"#0d1526", border:`1px solid rgba(0,200,150,0.25)`, borderRadius:"20px 20px 0 0", padding:"20px 18px 32px", width:"100%", maxWidth:500, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div style={{ fontSize:15, fontWeight:700, color:COLORS.text }}>{editing ? "✏️ Edit Income" : "➕ Add Income"}</div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.07)", border:"none", borderRadius:8, width:30, height:30, color:COLORS.textMuted, cursor:"pointer", fontSize:16 }}>✕</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
          <div>
            <label style={{ fontSize:11, color:COLORS.textMuted, display:"block", marginBottom:5 }}>SOURCE *</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {SOURCES.map(s => (
                <button key={s} onClick={() => setForm(p=>({...p, source:s}))} style={{ padding:"6px 13px", borderRadius:20, fontSize:11.5, cursor:"pointer", border:`1px solid ${form.source===s?COLORS.secondary:COLORS.border}`, background:form.source===s?`${COLORS.secondary}20`:"transparent", color:form.source===s?COLORS.secondary:COLORS.textMuted, fontWeight:form.source===s?700:400 }}>{ICONS[s]} {s}</button>
              ))}
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={{ fontSize:11, color:COLORS.textMuted, display:"block", marginBottom:5 }}>DATE *</label>
              <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={iStyle} />
            </div>
            <div>
              <label style={{ fontSize:11, color:COLORS.textMuted, display:"block", marginBottom:5 }}>AMOUNT (₹) *</label>
              <input type="number" inputMode="numeric" placeholder="0" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} style={iStyle} />
            </div>
          </div>
          
          <div>
            <label style={{ fontSize:11, color:COLORS.textMuted, display:"block", marginBottom:5 }}>BANK ACCOUNT</label>
            <select value={form.bankId||""} onChange={e=>setForm(p=>({...p,bankId:e.target.value}))} style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${COLORS.border}`, padding: "10px 14px", color: COLORS.text, fontSize: 13, borderRadius: 12, width: "100%", outline: "none" }}>
                  <option value="">� Select Account �</option>
                  <optgroup label="Bank Accounts">
                    {(banks||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </optgroup>
                  <optgroup label="Credit Cards">
                    {(creditCards||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                </select>
          </div>
          <div>
            <label style={{ fontSize:11, color:COLORS.textMuted, display:"block", marginBottom:5 }}>NOTE / DESCRIPTION</label>
            <input type="text" placeholder="e.g. Infosys June salary, freelance project..." value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} style={iStyle} />
          </div>
          
          {workspaces && workspaces.length > 1 && (
            <div style={{ background: form.receivedFromWorkspaceId ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${form.receivedFromWorkspaceId ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.05)"}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, color: form.receivedFromWorkspaceId ? "#10b981" : COLORS.text, fontWeight: 600 }}>Received from another workspace?</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>Records a payment transferred from another user</div>
                </div>
                <div 
                  onClick={() => setForm(p => ({ ...p, receivedFromWorkspaceId: p.receivedFromWorkspaceId ? "" : (workspaces.find(w => w.id !== activeWorkspaceId)?.id || "") }))}
                  style={{ width: 44, height: 24, borderRadius: 12, background: form.receivedFromWorkspaceId ? "#10b981" : "rgba(255,255,255,0.1)", position: "relative", cursor: "pointer", transition: "all 0.2s" }}
                >
                  <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 2, left: form.receivedFromWorkspaceId ? 22 : 2, transition: "all 0.2s" }} />
                </div>
              </div>
              
              {form.receivedFromWorkspaceId && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed rgba(16,185,129,0.2)` }}>
                  <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>SELECT SENDER WORKSPACE</label>
                  <select 
                    value={form.receivedFromWorkspaceId} 
                    onChange={e => setForm(p => ({ ...p, receivedFromWorkspaceId: e.target.value }))}
                    style={{ background: "rgba(0,0,0,0.3)", border: `1px solid rgba(16,185,129,0.2)`, padding: "10px 14px", color: COLORS.text, fontSize: 13, borderRadius: 10, width: "100%", outline: "none" }}
                  >
                    {workspaces.filter(w => w.id !== activeWorkspaceId).map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <button onClick={() => { 
            if(valid){ 
              const finalData = { ...form, amount:parseFloat(form.amount), icon:ICONS[form.source]||"💰", color:SCOLORS[form.source]||COLORS.textMuted };
              if (finalData.receivedFromWorkspaceId) {
                finalData.receivedFromWorkspaceName = workspaces.find(w => w.id === finalData.receivedFromWorkspaceId)?.name || "";
              }
              onSave(finalData); 
              onClose(); 
            }
          }} disabled={!valid} style={{ padding:"13px", borderRadius:12, border:"none", background:valid?`linear-gradient(135deg,${COLORS.secondary},#059669)`:"rgba(255,255,255,0.08)", color:valid?"#fff":COLORS.textMuted, fontSize:14, fontWeight:700, cursor:valid?"pointer":"not-allowed", marginTop:4 }}>
            {editing ? "Update Income" : "Save Income"}
          </button>
        </div>
      </div>
    </div>
  );
}

const getDueInvestmentPayouts = (invList) => {
  if (!invList) return [];
  const due = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  
  invList.forEach(inv => {
    if (inv.status === "Paused" || inv.status === "Closed" || !inv.hasPayout) return;
    const cycle = inv.payoutCycle || "Monthly";

    if (cycle === "Custom Schedule") {
      (inv.customPayouts || []).forEach(cp => {
        if (!cp.date || !cp.amount) return;
        const [sY, sM, sD] = cp.date.split('-');
        const cpDate = new Date(sY, sM - 1, sD);
        if (cpDate <= today) {
          const alreadyPaid = inv.incomePayments && inv.incomePayments.some(p => p.date === cp.date);
          if (!alreadyPaid) {
            due.push({ invId: inv.id, name: inv.name, provider: inv.provider||"", amount: parseFloat(cp.amount), dueDate: cp.date, cycle: "Custom", icon: inv.icon, color: inv.color, type: inv.type, item: inv, bankId: inv.bankId });
          }
        }
      });
      return;
    }

    if (!inv.payoutStartDate || !inv.payoutAmount) return;
    const [sY, sM, sD] = inv.payoutStartDate.split('-');
    const start = new Date(sY, sM - 1, sD);
    
    let nextDate = new Date(start);
    let limit = 0;
    
    while (nextDate <= today && limit < 1000) {
      const dStr = nextDate.toISOString().split('T')[0];
      const alreadyPaid = inv.incomePayments && inv.incomePayments.some(p => p.date === dStr);
      
      if (!alreadyPaid) {
        due.push({ invId: inv.id, name: inv.name, provider: inv.provider||"", amount: parseFloat(inv.payoutAmount), dueDate: dStr, cycle: cycle, icon: inv.icon, color: inv.color, type: inv.type, item: inv, bankId: inv.bankId });
      }
      
      if (cycle === "Monthly") nextDate.setMonth(nextDate.getMonth() + 1);
      else if (cycle === "Quarterly") nextDate.setMonth(nextDate.getMonth() + 3);
      else if (cycle === "Half-Yearly") nextDate.setMonth(nextDate.getMonth() + 6);
      else if (cycle === "Annually") nextDate.setFullYear(nextDate.getFullYear() + 1);
      
      limit++;
    }
  });
  
  return due.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
};

// ─── Live Income View ─────────────────────────────────────────────────────────
function IncomeViewLive({ incomes, setIncomes, initialEditTx, clearInitialEditTx, onCloseEditModal, filter, banks, creditCards, setDeletedTransactions, investments, setInvestments, insurance, setInsurance, workspaces = [], activeWorkspaceId = "" }) {
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    if (initialEditTx) {
      setEditing(initialEditTx);
      setShowModal(true);
      if (clearInitialEditTx) clearInitialEditTx();
    }
  }, [initialEditTx, clearInitialEditTx]);

  const duePayouts = getDueInvestmentPayouts(investments);
  const dueInsPayouts = getDueInsurancePayouts(insurance);

  const filtered = incomes.filter(inc => {
    const d = new Date(inc.date);
    const m = d.getMonth()+1, y = d.getFullYear();
    if (filter.mode==="month") return m===filter.month && y===filter.year;
    if (filter.mode==="year")  return y===filter.year;
    if (filter.mode==="range") { const k=y*100+m; return k>=filter.fromYear*100+filter.fromMonth && k<=filter.toYear*100+filter.toMonth; }
    return true;
  }).sort((a,b)=>new Date(b.date)-new Date(a.date));

  const total = filtered.reduce((s,i)=>s+parseFloat(i.amount||0),0);

  const bySource = filtered.reduce((acc,i)=>{ acc[i.source]=(acc[i.source]||0)+i.amount; return acc; },{});
  const topSource = Object.entries(bySource).sort((a,b)=>b[1]-a[1]);

  const groupedIncomesArray = [];
  filtered.forEach(inc => {
    let group = groupedIncomesArray.find(g => g.date === inc.date);
    if (!group) {
      group = { date: inc.date, amount: 0, items: [] };
      groupedIncomesArray.push(group);
    }
    group.amount += parseFloat(inc.amount || 0);
    group.items.push(inc);
  });

  const handleSave = (data) => {
    const finalId = (editing && editing.id) ? editing.id : data.id || "i" + Date.now();
    
    if (editing && editing.id) {
      setIncomes(p => p.map(i => i.id===editing.id ? {...data, id:finalId} : i));
    } else {
      setIncomes(p => [{...data, id:finalId, trxNo: getNextTrxNo("INC", p)}, ...p]);
      
      // Inject Expense into Sender Workspace if applicable
      if (data.receivedFromWorkspaceId) {
        try {
          const otherWsKey = `finpilot_expenses_${data.receivedFromWorkspaceId}`;
          const otherExpenses = JSON.parse(localStorage.getItem(otherWsKey) || "[]");
          const myWsName = workspaces.find(w => w.id === activeWorkspaceId)?.name || "Another Workspace";
          otherExpenses.push({
            id: "e" + Date.now() + "_injected",
            trxNo: "TRX-" + Date.now().toString().slice(-6),
            date: data.date,
            amount: parseFloat(data.amount),
            merchant: `Transfer to ${myWsName}`,
            category: "Transfer",
            paidForWorkspaceId: activeWorkspaceId,
            paidForWorkspaceName: myWsName,
            injectedBy: activeWorkspaceId,
            note: data.note || "Money sent to another workspace"
          });
          localStorage.setItem(otherWsKey, JSON.stringify(otherExpenses));
          window.dispatchEvent(new Event('storage'));
        } catch (e) {
          console.error("Failed to inject expense into sender workspace", e);
        }
      }
    }

    if (editing && editing.linkedMaturity) {
      const { type, itemId } = editing.linkedMaturity;
      if (type === "investment" && setInvestments) {
        setInvestments(prev => prev.map(inv => inv.id === itemId ? { ...inv, maturityReceived: true, status: "Closed" } : inv));
      } else if (type === "insurance" && setInsurance) {
        setInsurance(prev => prev.map(ins => ins.id === itemId ? { ...ins, maturityReceived: true, status: "Closed" } : ins));
      }
    }
    if (editing && editing.linkedPayout) {
      const { type, itemId, date } = editing.linkedPayout;
      if (type === "investment" && setInvestments) {
        setInvestments(prev => prev.map(inv => inv.id === itemId ? { ...inv, incomePayments: [...(inv.incomePayments||[]), { date, amount: parseFloat(data.amount), incomeId: finalId }] } : inv));
      } else if (type === "insurance" && setInsurance) {
        setInsurance(prev => prev.map(ins => ins.id === itemId ? { ...ins, incomePayments: [...(ins.incomePayments||[]), { date, amount: parseFloat(data.amount), incomeId: finalId }] } : ins));
      }
    }
    setEditing(null);
  };

  const handleDelete = (id) => {
    const target = incomes.find(i => i.id === id);
    if (!target) {
      setConfirmDel(null);
      return;
    }

    if (setDeletedTransactions) {
      setDeletedTransactions(prev => [...(prev || []), { id: "del" + Date.now(), type: "income", item: target, deletedAt: new Date().toISOString() }]);
    }

    if (target.linkedPayout) {
      const { type, itemId, date } = target.linkedPayout;
      if (type === "investment" && setInvestments) {
        setInvestments(prev => prev.map(inv => {
          if (inv.id === itemId && inv.incomePayments) {
            return { ...inv, incomePayments: inv.incomePayments.filter(p => p.incomeId !== id && p.date !== date) };
          }
          return inv;
        }));
      } else if (type === "insurance" && setInsurance) {
        setInsurance(prev => prev.map(ins => {
          if (ins.id === itemId && ins.incomePayments) {
            return { ...ins, incomePayments: ins.incomePayments.filter(p => p.incomeId !== id && p.date !== date) };
          }
          return ins;
        }));
      }
    }

    if (target.linkedMaturity) {
      const { type, itemId } = target.linkedMaturity;
      if (type === "investment" && setInvestments) {
        setInvestments(prev => prev.map(inv => inv.id === itemId ? { ...inv, maturityReceived: false, status: "Active" } : inv));
      } else if (type === "insurance" && setInsurance) {
        setInsurance(prev => prev.map(ins => ins.id === itemId ? { ...ins, maturityReceived: false, status: "Active" } : ins));
      }
    }

    setIncomes(p=>p.filter(i=>i.id!==id));
    setConfirmDel(null);
  };

  const MS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtDate = d => { const dt=new Date(d); return `${dt.getDate()} ${MS[dt.getMonth()]} ${dt.getFullYear()}`; };

  // Maturity extraction & status determination logic
  const maturingItems = [];
  const today = new Date();
  today.setHours(0,0,0,0);

  if (investments) {
    investments.forEach(inv => {
      if (inv.maturityAmount && parseFloat(inv.maturityAmount) > 0 && inv.endDate && !inv.maturityReceived) {
        const [y, m, d] = inv.endDate.split('-').map(Number);
        const matDate = new Date(y, m - 1, d);
        
        let status = null;
        let isMatch = false;

        if (filter.mode === "month") {
          if (y < filter.year || (y === filter.year && m < filter.month)) {
            status = "Overdue";
            isMatch = true;
          } else if (y === filter.year && m === filter.month) {
            status = "Due";
            isMatch = true;
          }
        } else if (filter.mode === "year") {
          if (y < filter.year) {
            status = "Overdue";
            isMatch = true;
          } else if (y === filter.year) {
            status = "Due";
            isMatch = true;
          }
        } else if (filter.mode === "range") {
          const itemVal = y * 100 + m;
          const fromVal = filter.fromYear * 100 + filter.fromMonth;
          const toVal = filter.toYear * 100 + filter.toMonth;
          if (itemVal < fromVal) {
            status = "Overdue";
            isMatch = true;
          } else if (itemVal >= fromVal && itemVal <= toVal) {
            status = "Due";
            isMatch = true;
          }
        } else {
          status = matDate < today ? "Overdue" : "Due";
          isMatch = true;
        }

        if (isMatch) {
          maturingItems.push({
            id: inv.id,
            name: inv.name,
            provider: inv.provider || "Investment",
            type: "investment",
            detailType: inv.type,
            maturityDate: inv.endDate,
            maturityAmount: parseFloat(inv.maturityAmount),
            bankId: inv.bankId || "",
            icon: inv.icon || "📈",
            color: inv.color || COLORS.secondary,
            status: status
          });
        }
      }
    });
  }

  if (insurance) {
    insurance.forEach(ins => {
      if (ins.maturityAmount && parseFloat(ins.maturityAmount) > 0 && ins.maturityDate && !ins.maturityReceived) {
        const [y, m, d] = ins.maturityDate.split('-').map(Number);
        const matDate = new Date(y, m - 1, d);

        let status = null;
        let isMatch = false;

        if (filter.mode === "month") {
          if (y < filter.year || (y === filter.year && m < filter.month)) {
            status = "Overdue";
            isMatch = true;
          } else if (y === filter.year && m === filter.month) {
            status = "Due";
            isMatch = true;
          }
        } else if (filter.mode === "year") {
          if (y < filter.year) {
            status = "Overdue";
            isMatch = true;
          } else if (y === filter.year) {
            status = "Due";
            isMatch = true;
          }
        } else if (filter.mode === "range") {
          const itemVal = y * 100 + m;
          const fromVal = filter.fromYear * 100 + filter.fromMonth;
          const toVal = filter.toYear * 100 + filter.toMonth;
          if (itemVal < fromVal) {
            status = "Overdue";
            isMatch = true;
          } else if (itemVal >= fromVal && itemVal <= toVal) {
            status = "Due";
            isMatch = true;
          }
        } else {
          status = matDate < today ? "Overdue" : "Due";
          isMatch = true;
        }

        if (isMatch) {
          maturingItems.push({
            id: ins.id,
            name: ins.name,
            provider: ins.provider || "Insurance",
            type: "insurance",
            detailType: ins.type,
            maturityDate: ins.maturityDate,
            maturityAmount: parseFloat(ins.maturityAmount),
            bankId: ins.bankId || "",
            icon: ins.icon || "🛡️",
            color: ins.color || COLORS.primary,
            status: status
          });
        }
      }
    });
  }

  const handleReceiveInvPayoutConfirm = (item) => {
    setEditing({
      source: "Interest",
      amount: item.amount,
      date: item.dueDate || new Date().toISOString().split("T")[0],
      note: `Periodic payout from ${item.name} (${item.provider})`,
      bankId: item.bankId || "",
      linkedPayout: {
        type: "investment",
        itemId: item.invId,
        date: item.dueDate
      }
    });
    setShowModal(true);
  };

  const handleReceiveInsPayoutConfirm = (item) => {
    setEditing({
      source: "Other",
      amount: item.amount,
      date: item.dueDate || new Date().toISOString().split("T")[0],
      note: `Periodic benefit from ${item.name} (${item.provider})`,
      bankId: item.bankId || "",
      linkedPayout: {
        type: "insurance",
        itemId: item.insId,
        date: item.dueDate
      }
    });
    setShowModal(true);
  };

  const handleMarkMaturityReceived = (item) => {
    setEditing({
      source: "Interest",
      amount: item.maturityAmount,
      date: item.maturityDate || new Date().toISOString().split("T")[0],
      note: `Maturity proceeds from ${item.name} (${item.provider})`,
      bankId: item.bankId || "",
      linkedMaturity: {
        type: item.type,
        itemId: item.id
      }
    });
    setShowModal(true);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700, color:COLORS.text }}>Income Management</div>
          <div style={{ fontSize:12, color:COLORS.textMuted, marginTop:2 }}>{filterLabel(filter)} · <b style={{ color:COLORS.secondary }}>₹{total.toLocaleString("en-IN")}</b> · {filtered.length} entries</div>
        </div>
        <button onClick={()=>{ setEditing(null); setShowModal(true); }} style={{ background:`linear-gradient(135deg,${COLORS.secondary},#059669)`, border:"none", borderRadius:12, padding:"9px 16px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0 }}>➕ Add Income</button>
      </div>

      {/* Source Summary */}
      {topSource.length > 0 && (
        <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:"16px 18px", marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:600, color:COLORS.text, marginBottom:12 }}>Income by Source</div>
          {topSource.map(([src,amt])=>(
            <div key={src} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
              <div style={{ width:70, fontSize:11, color:COLORS.textMuted, flexShrink:0 }}>{src}</div>
              <div style={{ flex:1, background:"rgba(255,255,255,0.05)", borderRadius:4, height:7 }}>
                <div style={{ height:"100%", width:`${(amt/total)*100}%`, background:`linear-gradient(90deg,${COLORS.secondary},${COLORS.primary})`, borderRadius:4, transition:"width 1s" }} />
              </div>
              <div style={{ width:70, fontSize:11, color:COLORS.secondary, fontWeight:600, textAlign:"right" }}>₹{(amt/1000).toFixed(1)}K</div>
            </div>
          ))}
        </div>
      )}

      {/* Due Investment Payouts */}
      {duePayouts.length > 0 && (
        <div style={{ background: "#10b98120", border: `1px solid #10b981`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981", marginBottom: 12 }}>🏦 Due Investment Payouts ({duePayouts.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 10 }}>
            {duePayouts.map(inv => (
              <div key={inv.invId + "-" + inv.dueDate} style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{inv.icon} {inv.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{inv.cycle} Payout   Due: {fmtDate(inv.dueDate)}</div>
                  {inv.bankId && <div style={{ fontSize: 11, color: COLORS.secondary, marginTop: 4, fontWeight: 600 }}>🏦 {banks?.find(b => b.id === inv.bankId)?.name || "Unknown Bank"}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.secondary }}>+₹{parseFloat(inv.amount || 0).toLocaleString("en-IN")}</div>
                  <button onClick={() => handleReceiveInvPayoutConfirm(inv)} style={{ background: COLORS.secondary, color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Receive</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Due Insurance Payouts */}
      {dueInsPayouts.length > 0 && (
        <div style={{ background: "rgba(59, 130, 246, 0.15)", border: `1px solid rgba(59, 130, 246, 0.8)`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#3b82f6", marginBottom: 12 }}>💰 Due Insurance Benefits ({dueInsPayouts.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 10 }}>
            {dueInsPayouts.map(ins => (
              <div key={ins.insId + "-" + ins.dueDate} style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{ins.icon} {ins.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{ins.provider}   Due: {fmtDate(ins.dueDate)}</div>
                  {ins.bankId && <div style={{ fontSize: 11, color: COLORS.secondary, marginTop: 4, fontWeight: 600 }}>🏦 {banks?.find(b => b.id === ins.bankId)?.name || "Unknown Bank"}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#3b82f6" }}>+₹{parseFloat(ins.amount || 0).toLocaleString("en-IN")}</div>
                  <button onClick={() => handleReceiveInsPayoutConfirm(ins)} style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Receive</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Maturities Section */}
      {maturingItems.length > 0 && (
        <div style={{ background: "rgba(16, 185, 129, 0.05)", border: `1px solid rgba(16, 185, 129, 0.25)`, borderRadius: 16, padding: "16px 18px", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span>🏦 Due & Overdue Maturities ({maturingItems.length})</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {maturingItems.map(item => {
              const badgeBg = item.status === "Overdue" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)";
              const badgeColor = item.status === "Overdue" ? "#f87171" : "#fbbf24";
              
              return (
                <div key={item.type + "-" + item.id} style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${item.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, display: "flex", alignItems: "center", gap: 6 }}>
                        {item.name}
                        <span style={{ fontSize: 9.5, background: badgeBg, color: badgeColor, padding: "2px 8px", borderRadius: 12, fontWeight: 700, letterSpacing: 0.5 }}>{item.status}</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: COLORS.textMuted, overflow: "hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginTop: 2 }}>
                        {item.provider} • {item.detailType} • Maturity: {formatLocalDateString(item.maturityDate)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.secondary }}>₹{item.maturityAmount.toLocaleString("en-IN")}</div>
                    <button 
                      onClick={() => handleMarkMaturityReceived(item)} 
                      style={{ 
                        background: "linear-gradient(135deg, #10b981, #059669)", 
                        color: "#fff", 
                        border: "none", 
                        padding: "6px 14px", 
                        borderRadius: 8, 
                        fontSize: 11, 
                        fontWeight: 700, 
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(16, 185, 129, 0.2)"
                      }}
                    >
                      ✓ Receive
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"40px 20px", color:COLORS.textMuted }}>
          <div style={{ fontSize:32, marginBottom:10 }}>📭</div>
          <div style={{ fontSize:14, color:COLORS.text }}>No income entries for this period</div>
          <button onClick={()=>setShowModal(true)} style={{ marginTop:14, padding:"9px 20px", borderRadius:12, border:"none", background:`${COLORS.secondary}22`, color:COLORS.secondary, fontSize:13, cursor:"pointer" }}>➕ Add your first income</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {groupedIncomesArray.map((group, idx) => (
            <div key={"grp-"+idx} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 16, border: `1px solid rgba(255,255,255,0.05)` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 10, borderBottom: `1px dashed rgba(255,255,255,0.1)` }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{formatLocalDateString(group.date)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.secondary, background: `${COLORS.secondary}15`, padding: "4px 10px", borderRadius: 8 }}>+₹{group.amount.toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {group.items.map(inc => (
                  <div key={inc.id} style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${inc.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{inc.icon}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{inc.source}</div>
                        <div style={{ fontSize: 10.5, color: COLORS.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {inc.note || "—"} · <span style={{color: COLORS.primary, fontWeight: 700}}>{inc.trxNo}</span>
                          {(() => {
                            const inv = investments?.find(i => i.incomePayments?.some(p => p.incomeId === inc.id));
                            if (inv) return <span style={{ marginLeft: 6, padding: "2px 6px", borderRadius: 4, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: 9, fontWeight: 700 }}>🔗 Investment - {inv.name}</span>;
                            const ins = insurance?.find(i => i.incomePayments?.some(p => p.incomeId === inc.id));
                            if (ins) return <span style={{ marginLeft: 6, padding: "2px 6px", borderRadius: 4, background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", fontSize: 9, fontWeight: 700 }}>🔗 Insurance - {ins.name}</span>;
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.secondary }}>+₹{inc.amount.toLocaleString("en-IN")}</div>
                      <button onClick={() => { setEditing(inc); setShowModal(true); }} style={{ background: `${COLORS.primary}22`, border: `1px solid ${COLORS.primary}44`, borderRadius: 8, width: 26, height: 26, color: COLORS.primary, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✏️</button>
                      <button onClick={() => setConfirmDel(inc.id)} style={{ background: `${COLORS.danger}18`, border: `1px solid ${COLORS.danger}33`, borderRadius: 8, width: 26, height: 26, color: COLORS.danger, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <IncomeModal banks={banks} creditCards={creditCards} workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} onClose={()=>{ setShowModal(false); setEditing(null); if (onCloseEditModal) onCloseEditModal(); }} onSave={handleSave} editing={editing} />}

      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#111827", borderRadius:18, padding:"24px 22px", maxWidth:320, width:"100%", border:`1px solid ${COLORS.danger}33` }}>
            <div style={{ fontSize:24, textAlign:"center", marginBottom:12 }}>🗑️</div>
            <div style={{ fontSize:15, fontWeight:700, color:COLORS.text, textAlign:"center", marginBottom:8 }}>Delete Income Entry?</div>
            <div style={{ fontSize:12, color:COLORS.textMuted, textAlign:"center", marginBottom:20 }}>This cannot be undone.</div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setConfirmDel(null)} style={{ flex:1, padding:"10px", borderRadius:10, border:`1px solid ${COLORS.border}`, background:"transparent", color:COLORS.textMuted, cursor:"pointer", fontSize:13 }}>Cancel</button>
              <button onClick={()=>handleDelete(confirmDel)} style={{ flex:1, padding:"10px", borderRadius:10, border:"none", background:COLORS.danger, color:"#fff", cursor:"pointer", fontSize:13, fontWeight:700 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Live Expense View (with edit/delete added to existing) ───────────────────

// ─── Insurance View ────────────────────────────────────────────────────────────
function InsuranceView({ insurance, setInsurance, banks, creditCards, expenses, incomes, goals, onEditExpense, onEditIncome, initialEditItem, clearInitialEditItem }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [insFilter, setInsFilter] = useState("All");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({ name:"", provider:"", type:"Medical Insurance", icon:"🛡️", amount:"", coverage:"", cycle:"Annual", startDate:"", endDate:"", moreInfo:"", docLink:"", docName:"", docData:"", color:COLORS.primary, bankId:"", maturityDate:"", maturityAmount:"", status:"Active", linkedGoal:"" });

  useEffect(() => {
    if (initialEditItem) {
      setEditItem(initialEditItem);
      setForm({...initialEditItem});
      setShowForm(true);
      if (clearInitialEditItem) clearInitialEditItem();
    }
  }, [initialEditItem, clearInitialEditItem]);

  const ledgerItem = editItem ? {
    ...editItem,
    ...form,
    payments: editItem.payments,
    amount: parseFloat(form.amount) || 0
  } : null;

  const monthlyTotal = insurance ? insurance.filter(s => s.status !== "Paused" && s.status !== "Closed").reduce((a,s)=>{
    let m = s.amount;
    if(s.cycle==="Annual") m = m/12;
    if(s.cycle==="Quarterly") m = m/3;
    if(s.cycle==="Half-Yearly") m = m/6;
    return a+m;
  },0) : 0;
  const displayedInsurance = insFilter === "All" ? insurance : (insurance || []).filter(i => i.type === insFilter);

  const annualTotal = insurance ? insurance.filter(s => s.status !== "Paused" && s.status !== "Closed").reduce((a,s)=>{
    let y = s.amount;
    if(s.cycle==="Monthly") y = y*12;
    if(s.cycle==="Quarterly") y = y*4;
    if(s.cycle==="Half-Yearly") y = y*2;
    return a+y;
  },0) : 0;

  const handleSave = () => {
    if (!form.name || !form.amount || !form.startDate) {
      alert("Name, Amount, and Start Date are required.");
      return;
    }
    const item = { 
      ...form, 
      amount: parseFloat(form.amount), 
      maturityAmount: form.maturityAmount ? parseFloat(form.maturityAmount) : "",
      endDate: form.endDate || "",
      payments: editItem ? editItem.payments : []
    };
    if (editItem) {
      setInsurance(p => p.map(s => s.id === editItem.id ? { ...s, ...item } : s));
    } else {
      setInsurance(p => [...(p||[]), { ...item, id: "ins" + Date.now(), payments: [], trxNo: item.trxNo || getNextTrxNo("INS", p) }]);
    }
    setShowForm(false);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this insurance policy?")) {
      setInsurance(p => p.filter(s => s.id !== id));
      setShowForm(false);
    }
  };

  const fmtInsDue = (s) => {
    if (s.status === "Closed") return "Closed / Matured";
    if (!s.startDate) return "";
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = new Date(s.startDate);
    let nextDate = new Date(start);
    let limit = 0;
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    
    while (limit < 1000) {
      if (s.endDate && nextDate > new Date(s.endDate)) return "Ended";
      const nextDateStr = nextDate.toISOString().split('T')[0];
      const isPaid = s.payments && s.payments.some(p => p.date === nextDateStr);
      if (!isPaid) {
        if (nextDate <= today) return `Due: ${nextDate.getDate()} ${months[nextDate.getMonth()]}`;
        return `Next: ${nextDate.getDate()} ${months[nextDate.getMonth()]}`;
      }
      if (s.cycle === "Annual") nextDate.setFullYear(nextDate.getFullYear() + 1);
      else if (s.cycle === "Quarterly") nextDate.setMonth(nextDate.getMonth() + 3);
      else if (s.cycle === "Half-Yearly") nextDate.setMonth(nextDate.getMonth() + 6);
      else nextDate.setMonth(nextDate.getMonth() + 1);
      limit++;
    }
    return "";
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:18,fontWeight:700,color:COLORS.text }}>Insurance Tracker</div>
        <button onClick={() => { setEditItem(null); setForm({ name:"", provider:"", type:"Medical Insurance", icon:"🛡️", amount:"", coverage:"", cycle:"Annual", startDate: new Date().toISOString().split('T')[0], endDate:"", moreInfo:"", docLink:"", docName:"", docData:"", color:COLORS.primary, bankId:"", maturityDate:"", maturityAmount:"", status:"Active", hasPayout: false, payoutAmount: "", payoutCycle: "Monthly", payoutStartDate: new Date().toISOString().split('T')[0], customPayouts: [], linkedGoal:"" }); setShowForm(true); }} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add Policy</button>
      </div>

      {deleteConfirm && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.7)", zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, width: "90%", maxWidth: 400, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: deleteConfirm.step === 2 ? COLORS.danger : COLORS.text, marginBottom: 8 }}>
              {deleteConfirm.step === 1 ? "Delete Insurance Policy" : "⚠️ Final Warning"}
            </div>
            <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 24 }}>
              {deleteConfirm.step === 1 
                ? `Are you sure you want to delete ${deleteConfirm.item.name}?` 
                : "This will permanently erase the policy and all its records. Proceed?"}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => {
                if (deleteConfirm.step === 1) {
                  setDeleteConfirm({ ...deleteConfirm, step: 2 });
                } else {
                  setInsurance(p => p.filter(x => x.id !== deleteConfirm.item.id));
                  setDeleteConfirm(null);
                  setShowForm(false);
                }
              }} style={{ background: COLORS.danger, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>
                {deleteConfirm.step === 1 ? "Delete" : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ display: "flex", gap: 24, marginBottom: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 60%", background: "#1a2236", padding: 16, borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Policy Name</label>
              <input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="e.g. Optima Restore" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Provider</label>
              <input value={form.provider} onChange={e=>setForm({...form, provider: e.target.value})} placeholder="e.g. HDFC Ergo" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Insurance Type</label>
              <select value={form.type} onChange={e=>setForm({...form, type: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}>
                <option value="Medical Insurance">Medical Insurance</option>
                <option value="Life Insurance">Life Insurance</option>
                <option value="Motor Insurance">Motor Insurance</option>
                <option value="Term Insurance">Term Insurance</option>
                <option value="Home Insurance">Home Insurance</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Bank Account</label>
              <select value={form.bankId||""} onChange={e=>setForm({...form, bankId: e.target.value})} style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${COLORS.border}`, padding: "10px 14px", color: COLORS.text, fontSize: 13, borderRadius: 12, width: "100%", outline: "none" }}>
                  <option value="">� Select Account �</option>
                  <optgroup label="Bank Accounts">
                    {(banks||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </optgroup>
                  <optgroup label="Credit Cards">
                    {(creditCards||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                </select>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Coverage Value (Sum Insured)</label>
              <input value={form.coverage || ""} onChange={e=>setForm({...form, coverage: e.target.value})} placeholder="e.g. ₹10,00,000" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Installment / Premium Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} placeholder="Amount" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Current Valuation (Optional for Goal Linking)</label>
              <input type="number" value={form.currentValuation||""} onChange={e=>setForm({...form, currentValuation: e.target.value})} placeholder="e.g. 500000 (Current Fund Value)" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Payment Cycle</label>
              <select value={form.cycle} onChange={e=>setForm({...form, cycle: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Half-Yearly">Half-Yearly</option>
                <option value="Annual">Annual</option>
                <option value="One-Time">One-Time</option>
              </select>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Icon & Color</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={form.icon} onChange={e=>setForm({...form, icon: e.target.value})} placeholder="Icon" style={{ flex: 1, background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
                <input type="color" value={form.color} onChange={e=>setForm({...form, color: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, padding: "4px", borderRadius: 8, height: 38, width: 40 }} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Start Date</label>
              <input type="date" value={form.startDate} onChange={e=>setForm({...form, startDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>End Date (Leave blank if none)</label>
              <input type="date" value={form.endDate} onChange={e=>setForm({...form, endDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Maturity Date (Leave blank if none)</label>
              <input type="date" value={form.maturityDate || ""} onChange={e=>setForm({...form, maturityDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Maturity Amount (₹)</label>
              <input type="number" value={form.maturityAmount || ""} onChange={e=>setForm({...form, maturityAmount: e.target.value})} placeholder="e.g. 500000" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>More Information</label>
              <input value={form.moreInfo} onChange={e=>setForm({...form, moreInfo: e.target.value})} placeholder="Policy No, Details, etc." style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Link to Goal (optional)</label>
              <select value={form.linkedGoal||""} onChange={e=>setForm({...form, linkedGoal: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}>
                <option value="">— No Goal —</option>
                {(goals||[]).map(g => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
              </select>
            </div>
            
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16, padding: 12, background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.text, fontSize: 13, fontWeight: 600 }}>
              <span>Provides Periodic Returns / Income Payouts?</span>
              <select value={form.hasPayout ? "Yes" : "No"} onChange={e => setForm({...form, hasPayout: e.target.value === "Yes"})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "6px 12px", borderRadius: 6, marginLeft: "auto", outline: "none", cursor: "pointer", fontWeight: 600 }}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            {form.hasPayout && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(16, 185, 129, 0.2)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, color: COLORS.textMuted }}>Payout Schedule Type</label>
                  <select value={form.payoutCycle||"Monthly"} onChange={e=>setForm({...form, payoutCycle: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Annually">Annually</option>
                    <option value="Custom Schedule">Custom Schedule (Dynamic)</option>
                  </select>
                </div>
                
                {form.payoutCycle !== "Custom Schedule" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Payout Amount (₹) *</label><input type="number" value={form.payoutAmount||""} onChange={e=>setForm({...form, payoutAmount: e.target.value})} placeholder="Amount received" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>First Payout Date</label><input type="date" value={form.payoutStartDate||""} onChange={e=>setForm({...form, payoutStartDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 10, color: COLORS.textMuted }}>Custom Payout Dates & Amounts</label>
                    {(form.customPayouts || []).map((cp, idx) => (
                      <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="date" value={cp.date} onChange={e => {
                          const n = [...(form.customPayouts || [])];
                          n[idx].date = e.target.value;
                          setForm({...form, customPayouts: n});
                        }} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8, flex: 1 }} />
                        <input type="number" value={cp.amount} onChange={e => {
                          const n = [...(form.customPayouts || [])];
                          const newAmt = e.target.value;
                          n[idx].amount = newAmt;
                          for (let i = idx + 1; i < n.length; i++) { n[i].amount = newAmt; }
                          setForm({ ...form, customPayouts: n });
                        }} placeholder="Amount" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8, flex: 1 }} />
                        <button onClick={() => {
                          const n = [...(form.customPayouts || [])];
                          n.splice(idx, 1);
                          setForm({...form, customPayouts: n});
                        }} style={{ background: "transparent", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 16 }}>×</button>
                      </div>
                    ))}
                    <button onClick={() => {
                      const cps = form.customPayouts || [];
                      let nextDate = new Date().toISOString().split('T')[0];
                      let nextAmt = "";
                      if (cps.length > 0) {
                        const last = cps[cps.length - 1];
                        if (last.date) {
                          const d = new Date(last.date);
                          d.setFullYear(d.getFullYear() + 1);
                          nextDate = d.toISOString().split('T')[0];
                        }
                        nextAmt = last.amount;
                      }
                      setForm({...form, customPayouts: [...cps, { date: nextDate, amount: nextAmt }]});
                    }} style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "none", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>+ Add Next Payout</button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Upload Policy Document</label>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  if (file.size > 2.5 * 1024 * 1024) {
                    alert("File is too large! Please keep it under 2.5MB to save in browser memory.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setForm({...form, docName: file.name, docData: ev.target.result});
                  };
                  reader.readAsDataURL(file);
                }
              }} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "5px 12px", borderRadius: 8 }} />
              
              {form.docName && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
                  <div style={{fontSize:11, color:COLORS.primary}}>📎 {form.docName}</div>
                  {form.docData && (
                    <button onClick={() => {
                      const a = document.createElement('a');
                      a.href = form.docData;
                      a.download = form.docName;
                      a.click();
                    }} style={{ background: "transparent", color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontSize: 10 }}>Download</button>
                  )}
                </div>
              )}
            </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleSave} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ background: "transparent", color: COLORS.textMuted, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            
            {editItem && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
                <button onClick={() => setForm({...form, status: form.status === "Paused" ? "Active" : form.status === "Closed" ? "Active" : "Paused"})} style={{ background: form.status === "Active" || !form.status ? "#f59e0b" : "#10b981", color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>
                  {form.status === "Active" || !form.status ? "⏸ Pause" : "▶ Resume"}
                </button>
                <button onClick={() => setForm({...form, status: "Closed"})} style={{ background: COLORS.accent, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>
                  🔒 Close / Mature
                </button>
                <button onClick={() => setDeleteConfirm({ item: editItem, step: 1 })} style={{ background: COLORS.danger, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Delete</button>
              </div>
            )}
          </div>
          </div>
          
          {(() => {
            if (!ledgerItem) return <div style={{ flex: "1 1 35%" }}></div>;
            
            const getDue = () => {
              if (ledgerItem.status === "Paused" || ledgerItem.status === "Closed") return [];
              const cycle = ledgerItem.cycle || "Annual";
              const d = parseLocalYYYYMMDD(ledgerItem.startDate);
              if (!d || isNaN(d.getTime())) return [];
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              let dues = [];
              let cycleMonths = cycle === "Monthly" ? 1 : cycle === "Quarterly" ? 3 : cycle === "Half-Yearly" ? 6 : 12;
              const payments = ledgerItem.payments || [];
              let limit = 0;
              while (d <= now && limit < 1000) {
                const nextDateStr = toLocalYYYYMMDD(d);
                let paid = payments.some(p => p.date === nextDateStr);
                if (!paid) {
                  dues.push({ 
                    ...ledgerItem, 
                    dueDate: nextDateStr, 
                    amount: parseFloat(ledgerItem.amount)
                  });
                }
                d.setMonth(d.getMonth() + cycleMonths);
                limit++;
              }
              return dues;
            };
            const dues = getDue();
            const payments = ledgerItem.payments || [];
            const incomePayments = (incomes || []).filter(inc => inc.linkedPayout && inc.linkedPayout.type === 'insurance' && inc.linkedPayout.itemId === ledgerItem.id).map(inc => ({ date: inc.linkedPayout.date || inc.date, amount: inc.amount, incomeId: inc.id }));
            
            const historyItems = [
              ...payments.map(p => ({ ...p, type: 'paid', dateObj: new Date(p.date) })),
              ...incomePayments.map(p => ({ ...p, type: 'received', dateObj: new Date(p.date) }))
            ].sort((a, b) => b.dateObj - a.dateObj);
            
            const groupedHistory = {};
            historyItems.forEach(p => {
              const dStr = p.date;
              if (!groupedHistory[dStr]) groupedHistory[dStr] = { date: dStr, dateObj: p.dateObj, paid: 0, received: 0, items: [] };
              if (p.type === 'paid') {
                 groupedHistory[dStr].paid += (parseFloat(p.amount) || 0);
              } else {
                 groupedHistory[dStr].received += (parseFloat(p.amount) || 0);
              }
              groupedHistory[dStr].items.push(p);
            });
            const groupedHistoryArray = Object.values(groupedHistory).sort((a,b) => b.dateObj - a.dateObj);
            
            const totalPaidHistory = payments.reduce((sum, p) => sum + (parseFloat(p.amount)||0), 0);
            const totalReceivedHistory = incomePayments.reduce((sum, p) => sum + (parseFloat(p.amount)||0), 0);
            
            // Get payouts for this specific insurance
            const thisInsPayouts = getDueInsurancePayouts(ledgerItem ? [ledgerItem] : []);
            const today_rp = new Date(); today_rp.setHours(0,0,0,0);
            const overduePayable = dues.filter(d => { const [y,m,dd] = d.dueDate.split('-').map(Number); const dt = new Date(y,m-1,dd); dt.setHours(0,0,0,0); return dt < today_rp; });
            const dueThisMonthPayable = dues.filter(d => { const [y,m,dd] = d.dueDate.split('-').map(Number); const dt = new Date(y,m-1,dd); dt.setHours(0,0,0,0); return dt.getMonth() === today_rp.getMonth() && dt.getFullYear() === today_rp.getFullYear() && dt >= today_rp; });
            const overdueReceivable = thisInsPayouts.filter(d => { const [y,m,dd] = d.dueDate.split('-').map(Number); const dt = new Date(y,m-1,dd); dt.setHours(0,0,0,0); return dt < today_rp; });
            const dueThisMonthReceivable = thisInsPayouts.filter(d => { const [y,m,dd] = d.dueDate.split('-').map(Number); const dt = new Date(y,m-1,dd); dt.setHours(0,0,0,0); return dt.getMonth() === today_rp.getMonth() && dt.getFullYear() === today_rp.getFullYear() && dt >= today_rp; });
            const totalPayOD = overduePayable.reduce((s,d) => s + (parseFloat(d.amount)||0), 0);
            const totalPayDue = dueThisMonthPayable.reduce((s,d) => s + (parseFloat(d.amount)||0), 0);
            const totalRecvOD = overdueReceivable.reduce((s,d) => s + (parseFloat(d.amount)||0), 0);
            const totalRecvDue = dueThisMonthReceivable.reduce((s,d) => s + (parseFloat(d.amount)||0), 0);
            
            const filteredHistoryItems = historyItems.filter(p => {
              if (!ledgerSearch) return true;
              let desc = "";
              if (p.type === 'paid') {
                const exp = (expenses || []).find(e => e.id === p.expenseId);
                const bId = exp ? exp.bankId : null;
                const b = bId ? [...(banks||[]), ...(creditCards||[])].find(x => x.id === bId) : null;
                const bankName = b ? b.name : (exp ? (exp.paymentMode || "Cash") : "—");
                desc = `Paid Premium ${exp ? exp.trxNo || "" : ""} ${bankName}`.toLowerCase();
              } else {
                const inc = (incomes || []).find(i => i.id === p.incomeId);
                const bId = inc ? inc.bankId : null;
                const b = bId ? [...(banks||[]), ...(creditCards||[])].find(x => x.id === bId) : null;
                const bankName = b ? b.name : "";
                desc = `Received Benefit ${bankName}`.toLowerCase();
              }
              return desc.includes(ledgerSearch.toLowerCase()) || (p.amount && p.amount.toString().includes(ledgerSearch));
            });

            const downloadCSV = () => {
              const headers = ["Date", "Type", "Description", "Paid", "Received", "Net"];
              let csvContent = headers.join(",") + "\n";
              
              filteredHistoryItems.forEach(p => {
                let desc = "";
                let paidVal = "";
                let recvVal = "";
                let netVal = 0;
                let typeStr = "";
                if (p.type === 'paid') {
                  const exp = (expenses || []).find(e => e.id === p.expenseId);
                  const bId = exp ? exp.bankId : null;
                  const b = bId ? [...(banks||[]), ...(creditCards||[])].find(x => x.id === bId) : null;
                  const bankName = b ? b.name : (exp ? (exp.paymentMode || "Cash") : "—");
                  desc = `Paid Premium${bankName ? ' • ' + bankName : ''}`;
                  paidVal = p.amount;
                  netVal = -p.amount;
                  typeStr = "Premium";
                } else {
                  const inc = (incomes || []).find(i => i.id === p.incomeId);
                  const bId = inc ? inc.bankId : null;
                  const b = bId ? [...(banks||[]), ...(creditCards||[])].find(x => x.id === bId) : null;
                  const bankName = b ? b.name : "";
                  desc = `Received Benefit${bankName ? ' • ' + bankName : ''}`;
                  recvVal = p.amount;
                  netVal = p.amount;
                  typeStr = "Benefit";
                }
                if (desc.includes(",")) desc = `"${desc}"`;
                const date = formatLocalDateString(p.date).replace(/,/g, '');
                csvContent += `${date},${typeStr},${desc},${paidVal},${recvVal},${netVal}\n`;
              });
              
              const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.setAttribute("download", `Insurance_Ledger_${ledgerItem.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split("T")[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            };
            
            return (
              <div style={{ flex: "1 1 35%", position: "sticky", top: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                {/* ── Box 1: Payable – Premiums ── */}
                <div style={{ background: "linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(245, 158, 11, 0.04) 100%)", border: `1px solid rgba(239, 68, 68, 0.25)`, borderRadius: 14, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>💸</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>Payable – Premiums</div>
                      <div style={{ fontSize: 9, color: COLORS.textMuted }}>{dues.length} pending</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    {totalPayOD > 0 && <div style={{ flex: 1, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 8, padding: "6px 8px" }}>
                      <div style={{ fontSize: 8, color: "#ef4444", fontWeight: 700, letterSpacing: 0.5, marginBottom: 1 }}>🚨 OVERDUE</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#ef4444" }}>₹{totalPayOD.toLocaleString("en-IN")}</div>
                      <div style={{ fontSize: 8, color: COLORS.textMuted }}>{overduePayable.length} item{overduePayable.length !== 1 ? "s" : ""}</div>
                    </div>}
                    {totalPayDue > 0 && <div style={{ flex: 1, background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: 8, padding: "6px 8px" }}>
                      <div style={{ fontSize: 8, color: "#f59e0b", fontWeight: 700, letterSpacing: 0.5, marginBottom: 1 }}>⏳ DUE THIS MONTH</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>₹{totalPayDue.toLocaleString("en-IN")}</div>
                      <div style={{ fontSize: 8, color: COLORS.textMuted }}>{dueThisMonthPayable.length} item{dueThisMonthPayable.length !== 1 ? "s" : ""}</div>
                    </div>}
                    {totalPayOD === 0 && totalPayDue === 0 && <div style={{ flex: 1, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#10b981", fontWeight: 600 }}>✅ All Caught Up!</div>
                    </div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 140, overflowY: "auto" }}>
                    {dues.slice(0, 6).map((d, idx) => {
                      const si = getDueStatusAndStyle(d.dueDate);
                      return (
                        <div key={"pay-"+idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "rgba(0,0,0,0.15)", borderRadius: 6, borderLeft: `3px solid ${si.color}` }}>
                          <div style={{ fontSize: 10, color: COLORS.text }}>{formatLocalDateString(d.dueDate)} <span style={{ color: si.color, fontWeight: 700, fontSize: 9 }}>{si.label}</span></div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: si.color }}>₹{parseFloat(d.amount).toLocaleString("en-IN")}</div>
                        </div>
                      );
                    })}
                    {dues.length > 6 && <div style={{ fontSize: 9, color: COLORS.textMuted, textAlign: "center", padding: 2 }}>+{dues.length - 6} more...</div>}
                  </div>
                </div>

                {/* ── Box 2: Receivable – Benefits / Payouts ── */}
                <div style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(59, 130, 246, 0.04) 100%)", border: `1px solid rgba(16, 185, 129, 0.25)`, borderRadius: 14, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>💰</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>Receivable – Benefits</div>
                      <div style={{ fontSize: 9, color: COLORS.textMuted }}>{thisInsPayouts.length} pending</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    {totalRecvOD > 0 && <div style={{ flex: 1, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 8, padding: "6px 8px" }}>
                      <div style={{ fontSize: 8, color: "#10b981", fontWeight: 700, letterSpacing: 0.5, marginBottom: 1 }}>🚨 OVERDUE</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#10b981" }}>₹{totalRecvOD.toLocaleString("en-IN")}</div>
                      <div style={{ fontSize: 8, color: COLORS.textMuted }}>{overdueReceivable.length} item{overdueReceivable.length !== 1 ? "s" : ""}</div>
                    </div>}
                    {totalRecvDue > 0 && <div style={{ flex: 1, background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: 8, padding: "6px 8px" }}>
                      <div style={{ fontSize: 8, color: "#3b82f6", fontWeight: 700, letterSpacing: 0.5, marginBottom: 1 }}>⏳ DUE THIS MONTH</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#3b82f6" }}>₹{totalRecvDue.toLocaleString("en-IN")}</div>
                      <div style={{ fontSize: 8, color: COLORS.textMuted }}>{dueThisMonthReceivable.length} item{dueThisMonthReceivable.length !== 1 ? "s" : ""}</div>
                    </div>}
                    {totalRecvOD === 0 && totalRecvDue === 0 && <div style={{ flex: 1, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#10b981", fontWeight: 600 }}>✅ No Payouts Pending</div>
                    </div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 140, overflowY: "auto" }}>
                    {thisInsPayouts.slice(0, 6).map((d, idx) => {
                      const si = getDueStatusAndStyle(d.dueDate);
                      return (
                        <div key={"recv-"+idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "rgba(0,0,0,0.15)", borderRadius: 6, borderLeft: `3px solid ${si.color}` }}>
                          <div style={{ fontSize: 10, color: COLORS.text }}>{formatLocalDateString(d.dueDate)} <span style={{ color: si.color, fontWeight: 700, fontSize: 9 }}>{si.label}</span></div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: si.color }}>₹{parseFloat(d.amount).toLocaleString("en-IN")}</div>
                        </div>
                      );
                    })}
                    {thisInsPayouts.length > 6 && <div style={{ fontSize: 9, color: COLORS.textMuted, textAlign: "center", padding: 2 }}>+{thisInsPayouts.length - 6} more...</div>}
                  </div>
                </div>

                {/* ── Transaction Ledger ── */}
                <div style={{ background: "rgba(0,0,0,0.15)", padding: 16, borderRadius: 14, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>🧾</span> Transaction Ledger
                    </div>
                    <button onClick={downloadCSV} style={{ background: "transparent", color: COLORS.primary, border: `1px solid ${COLORS.primary}`, padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>⬇️</span> CSV
                    </button>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <input 
                      type="text" 
                      placeholder="Search transactions..." 
                      value={ledgerSearch} 
                      onChange={e => setLedgerSearch(e.target.value)}
                      style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8, fontSize: 12, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  
                  <div style={{ overflowX: "auto", border: `1px solid ${COLORS.border}`, borderRadius: 8, background: "rgba(0,0,0,0.2)", maxHeight: 300, overflowY: "auto" }}>
                    <table className="excel-table">
                      <thead>
                        <tr>
                          <th>Transaction Date</th>
                          <th style={{ textAlign: "right" }}>Paid amount</th>
                          <th style={{ textAlign: "right" }}>Received Amount</th>
                          <th style={{ textAlign: "right" }}>Net value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistoryItems.map((p, idx) => {
                          let desc = "";
                          let paidVal = "";
                          let recvVal = "";
                          let netVal = 0;
                          let netColor = COLORS.text;
                          
                          if (p.type === 'paid') {
                            const exp = (expenses || []).find(e => e.id === p.expenseId);
                            const trxNo = exp ? exp.trxNo : "";
                            const bId = exp ? exp.bankId : null;
                            const b = bId ? [...(banks||[]), ...(creditCards||[])].find(x => x.id === bId) : null;
                            const bankName = b ? b.name : (exp ? (exp.paymentMode || "Cash") : "—");
                            desc = `Paid Premium${trxNo ? ' (' + trxNo + ')' : ''}${bankName ? ' • ' + bankName : ''}`;
                            paidVal = `₹${parseFloat(p.amount).toLocaleString("en-IN")}`;
                            netVal = -parseFloat(p.amount);
                            netColor = "#ef4444";
                          } else {
                            const inc = (incomes || []).find(i => i.id === p.incomeId);
                            const bId = inc ? inc.bankId : null;
                            const b = bId ? [...(banks||[]), ...(creditCards||[])].find(x => x.id === bId) : null;
                            const bankName = b ? b.name : "";
                            desc = `Received Benefit${bankName ? ' • ' + bankName : ''}`;
                            recvVal = `₹${parseFloat(p.amount).toLocaleString("en-IN")}`;
                            netVal = parseFloat(p.amount);
                            netColor = "#10b981";
                          }
                          
                          const expTx = (expenses || []).find(e => e.id === p.expenseId);
                          const incTx = (incomes || []).find(i => i.id === p.incomeId);
                          
                          return (
                            <tr key={"hist-row-" + idx}>
                              <td>
                                <div style={{ fontWeight: 600 }}>{formatLocalDateString(p.date)}</div>
                                <div style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 2 }}>{desc}</div>
                              </td>
                              <td style={{ textAlign: "right", color: "#ef4444", fontWeight: p.type === 'paid' ? 600 : 400 }}>
                                {paidVal || "—"}
                              </td>
                              <td style={{ textAlign: "right", color: "#3b82f6", fontWeight: p.type === 'received' ? 600 : 400 }}>
                                {recvVal || "—"}
                              </td>
                              <td style={{ textAlign: "right", color: netColor, fontWeight: 700 }}>
                                {netVal < 0 ? "-" : "+"}₹{Math.abs(netVal).toLocaleString("en-IN")}
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation();
                                    if (p.type === 'paid' && expTx && onEditExpense) onEditExpense(expTx, editItem);
                                    else if (p.type === 'received' && incTx && onEditIncome) onEditIncome(incTx, editItem);
                                  }}
                                  style={{ background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 13 }}
                                  title="Edit Transaction"
                                >
                                  ✎
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredHistoryItems.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: COLORS.textMuted }}>No transactions found.</td>
                          </tr>
                        )}
                      </tbody>
                      {filteredHistoryItems.length > 0 && (
                        <tfoot>
                          <tr>
                            <td>Total</td>
                            <td style={{ textAlign: "right", color: "#ef4444" }}>
                              ₹{totalPaidHistory.toLocaleString("en-IN")}
                            </td>
                            <td style={{ textAlign: "right", color: "#3b82f6" }}>
                              ₹{totalReceivedHistory.toLocaleString("en-IN")}
                            </td>
                            <td style={{ textAlign: "right", color: (totalReceivedHistory - totalPaidHistory) >= 0 ? "#10b981" : "#ef4444" }}>
                              {(totalReceivedHistory - totalPaidHistory) < 0 ? "-" : "+"}₹{Math.abs(totalReceivedHistory - totalPaidHistory).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
            </div>
            );
          })()}

        </div>
      )}

      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,minmax(80px,1fr))",gap:9,marginBottom:14 }}>
        <div style={{ background:"#1a2236",padding:"12px 16px",borderRadius:12,border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:4 }}>Est. Monthly Outflow</div>
          <div style={{ fontSize:16,fontWeight:700,color:COLORS.danger }}>₹{Math.round(monthlyTotal).toLocaleString("en-IN")}</div>
        </div>
        <div style={{ background:"#1a2236",padding:"12px 16px",borderRadius:12,border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:4 }}>Total Annual Premium</div>
          <div style={{ fontSize:16,fontWeight:700,color:"#F59E0B" }}>₹{(annualTotal/1000).toFixed(1)}K</div>
        </div>
        <div style={{ background:"#1a2236",padding:"12px 16px",borderRadius:12,border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:4 }}>Active Policies</div>
          <div style={{ fontSize:16,fontWeight:700,color:"#3B82F6" }}>{insurance ? insurance.length : 0}</div>
        </div>
      </div>

      <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:8, marginBottom:16 }}>
        {["All","Medical Insurance","Life Insurance","Motor Insurance","Term Insurance","Home Insurance","Other"].map(c => (
          <div key={c} onClick={() => setInsFilter(c)} style={{ whiteSpace:"nowrap", padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", background: insFilter===c ? COLORS.primary : "#1e293b", color: insFilter===c ? "#fff" : COLORS.textMuted }}>{c}</div>
        ))}
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12 }}>
        {displayedInsurance && displayedInsurance.map((s,i) => (
          <div key={i} onClick={() => { setEditItem(s); setForm(s); setShowForm(true); }} style={{ background:"#1a2236",borderRadius:12,border:`1px solid ${COLORS.border}`,position:"relative",overflow:"hidden",cursor:"pointer", opacity: s.status==="Paused" || s.status==="Closed" ? 0.6 : 1 }}>
            <div style={{ position:"absolute",left:0,top:0,bottom:0,width:4,background:s.color }} />
            <div style={{ padding:12,paddingLeft:16 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                <div style={{ fontSize:20 }}>{s.icon}</div>
                <div style={{ fontSize:9,background: s.status==="Paused" ? "#f59e0b33" : s.status==="Closed" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.1)", padding:"2px 8px",borderRadius:12,color: s.status==="Paused" ? "#f59e0b" : s.status==="Closed" ? COLORS.textMuted : COLORS.textMuted }}>{s.status==="Paused" ? "Paused" : s.status==="Closed" ? "Closed" : s.cycle}</div>
              </div>
              <div style={{ fontSize:13,fontWeight:600,color:COLORS.text,marginBottom:2 }}>{s.name}</div>
              <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:8 }}>{s.type} • {s.provider}</div>
              <div style={{ fontSize:16,fontWeight:700,color:s.color,marginBottom:2 }}>₹{s.amount.toLocaleString("en-IN")}</div>
              <div style={{ fontSize:10,color:COLORS.textMuted }}>{fmtInsDue(s)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Credit Cards View ───────────────────────────────────────────────────────
function CreditCardsViewLive({ creditCards, setCreditCards, expenses, onEditExpense, initialPassbook, clearInitialPassbook }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeBreakup, setActiveBreakup] = useState(null);
  
  const [showPassbook, setShowPassbook] = useState(null);
  const [passbookFilter, setPassbookFilter] = useState("");

  useEffect(() => {
    if (initialPassbook) {
      setShowPassbook(initialPassbook);
      if (clearInitialPassbook) clearInitialPassbook();
    }
  }, [initialPassbook, clearInitialPassbook]);

  const [form, setForm] = useState({ name:"", network:"Visa", limit:"", billingDate:"15", dueDay:"5", openingBalance:"", asOnDate:new Date().toISOString().split("T")[0], color:COLORS.primary });

  const downloadCSV = () => {
    if (!showPassbook) return;
    const breakdown = getCardBreakdown(showPassbook, expenses);
    const sortedTx = [...breakdown.txsWithOpening].sort((a,b) => new Date(b.date) - new Date(a.date));
    
    const headers = ["Date", "Description", "Category", "Amount"];
    let csvContent = headers.join(",") + "\n";
    
    sortedTx.forEach(tx => {
      let desc = tx.storeName || tx.name || "Expense";
      if (desc.includes(",")) desc = `"${desc}"`;
      let cat = tx.cat || "—";
      let amount = tx.amount || 0;
      let date = tx.date.split("-").reverse().join("-");
      csvContent += `${date},${desc},${cat},${amount}\n`;
    });
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Statement_${showPassbook.name}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const totalLimit = creditCards ? creditCards.reduce((s, c) => s + parseFloat(c.limit||0), 0) : 0;
  
  const getCardBreakdown = (cc, expensesList) => {
    const txs = expensesList ? expensesList.filter(e => e.paymentMode === "Credit Card" && e.creditCardId === cc.id) : [];
    let txsWithOpening = [...txs];
    if (cc.openingBalance && cc.asOnDate) {
      txsWithOpening.push({ amount: parseFloat(cc.openingBalance), date: cc.asOnDate, name: "Opening Balance" });
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const billDay = parseInt(cc.billingDate) || 1;
    const dueDay = parseInt(cc.dueDay) || 5;

    let lastBillDate = new Date(today.getFullYear(), today.getMonth(), billDay);
    if (today.getDate() < billDay) lastBillDate.setMonth(lastBillDate.getMonth() - 1);
    
    let prevBillDate = new Date(lastBillDate);
    prevBillDate.setMonth(prevBillDate.getMonth() - 1);
    
    let dueDate = new Date(lastBillDate);
    if (dueDay <= billDay) dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(dueDay);
    dueDate.setHours(0,0,0,0);

    let currentAmt = 0; let dueAmt = 0; let overdueAmt = 0;
    
    txsWithOpening.forEach(t => {
      const txDate = new Date(t.date);
      txDate.setHours(0,0,0,0);
      const amt = parseFloat(t.amount || 0);
      
      if (txDate >= lastBillDate) {
        currentAmt += amt;
      } else if (txDate >= prevBillDate) {
        if (today > dueDate) overdueAmt += amt;
        else dueAmt += amt;
      } else {
        overdueAmt += amt;
      }
    });
    return { currentAmt, dueAmt, overdueAmt, totalUsed: currentAmt + dueAmt + overdueAmt, txsWithOpening };
  };

  // Calculate total used
  const totalUsed = (creditCards || []).reduce((s, cc) => s + getCardBreakdown(cc, expenses).totalUsed, 0);
  const totalAvail = totalLimit - totalUsed;
  
  // Calculate global breakdown
  const getBreakupData = (type) => {
    return (creditCards || []).map(cc => {
      const b = getCardBreakdown(cc, expenses);
      let amt = 0;
      if (type === "current") amt = b.currentAmt;
      else if (type === "due") amt = b.dueAmt;
      else if (type === "overdue") amt = b.overdueAmt;
      return { card: cc, amount: amt, date: cc.billingDate + "th" };
    }).filter(x => x.amount > 0);
  };

  let globalDue = 0;
  let globalOverdue = 0;
  let globalCurrent = 0;

  if (creditCards) {
    globalDue = getBreakupData("due").reduce((s, x) => s + x.amount, 0);
    globalOverdue = getBreakupData("overdue").reduce((s, x) => s + x.amount, 0);
    globalCurrent = getBreakupData("current").reduce((s, x) => s + x.amount, 0);
  }


  const handleSave = () => {
    if (!form.name || !form.limit) return alert("Name and Limit are required.");
    const item = { ...form, limit: parseFloat(form.limit) };
    if (editItem) {
      setCreditCards(p => p.map(i => i.id === editItem.id ? { ...i, ...item } : i));
    } else {
      setCreditCards(p => [...(p||[]), { ...item, id: "cc" + Date.now() }]);
    }
    setShowForm(false);
    setEditItem(null);
  };

  const formElement = (
    <div style={{ display: "flex", gap: 24, marginBottom: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 60%", background: "#1a2236", padding: 16, borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 10, color: COLORS.textMuted }}>Card Name</label>
          <input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="e.g. HDFC Regalia" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 10, color: COLORS.textMuted }}>Network</label>
          <select value={form.network} onChange={e=>setForm({...form, network: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}>
            <option value="Visa">Visa</option>
            <option value="Mastercard">Mastercard</option>
            <option value="Rupay">Rupay</option>
            <option value="Amex">Amex</option>
            <option value="Diners Club">Diners Club</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 10, color: COLORS.textMuted }}>Credit Limit (₹)</label>
          <input type="number" value={form.limit} onChange={e=>setForm({...form, limit: e.target.value})} placeholder="Limit" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 10, color: COLORS.textMuted }}>Billing Date</label>
          <input type="number" min="1" max="31" value={form.billingDate} onChange={e=>setForm({...form, billingDate: e.target.value})} placeholder="Day (1-31)" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 10, color: COLORS.textMuted }}>Due Day</label>
          <input type="number" min="1" max="31" value={form.dueDay} onChange={e=>setForm({...form, dueDay: e.target.value})} placeholder="Day (1-31)" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 10, color: COLORS.textMuted }}>Opening Balance (₹)</label>
          <input type="number" value={form.openingBalance} onChange={e=>setForm({...form, openingBalance: e.target.value})} placeholder="Unbilled/Overdue" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 10, color: COLORS.textMuted }}>As on Date</label>
          <input type="date" value={form.asOnDate} onChange={e=>setForm({...form, asOnDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 10, color: COLORS.textMuted }}>Card Color</label>
          <input type="color" value={form.color} onChange={e=>setForm({...form, color: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, padding: "4px", borderRadius: 8, height: 38, width: "100%" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={handleSave} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Save</button>
        <button onClick={() => { setShowForm(false); setEditItem(null); }} style={{ background: "transparent", color: COLORS.textMuted, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
        {editItem && (
          <button onClick={() => setDeleteConfirm({ item: editItem, step: 1 })} style={{ marginLeft: "auto", background: COLORS.danger, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Delete</button>
        )}
      </div>
      </div>
      
      {(() => {
            if (!editItem) return <div style={{ flex: "1 1 35%" }}></div>;
         const breakdown = getCardBreakdown(editItem, expenses);
         const allTx = [...breakdown.txsWithOpening].sort((a,b)=>new Date(b.date)-new Date(a.date));
         return (
            <div style={{ flex: "1 1 35%", position: "sticky", top: 16, background: "rgba(0,0,0,0.15)", padding: 20, borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🧾</span> Transaction Ledger
                </div>
                  
                if (allTx.length === 0) return <div style={{ flex: "1 1 35%" }}></div>;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
                    {allTx.map((p, idx) => {
                      const bankName = p.paymentMode || "Credit Card";
                      const trxNo = p.trxNo || "—";
                      return (
                        <div key={"tx-"+idx} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}`, padding: "12px 16px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 18, background: "rgba(255, 91, 91, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💳</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{p.name || "Expense"}</div>
                                <div style={{ fontSize: 9, background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: 12, color: COLORS.textMuted, fontWeight: 600 }}>{trxNo}</div>
                              </div>
                              <div style={{ fontSize: 11, color: COLORS.textMuted }}>{formatLocalDateString(p.date)} • {bankName}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>₹{parseFloat(p.amount).toLocaleString("en-IN")}</div>
                        </div>
                      );
                    })}
                  </div>

            </div>
         );
      })()}
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:18,fontWeight:700,color:COLORS.text }}>Credit Cards</div>
          <div style={{ fontSize:12,color:COLORS.textMuted }}>{creditCards?creditCards.length:0} active cards · Live tracking</div>
        </div>
        <button onClick={() => { setEditItem(null); setForm({ name:"", network:"Visa", limit:"", billingDate:"15", dueDay:"5", openingBalance:"", asOnDate:new Date().toISOString().split("T")[0], color:COLORS.primary }); setShowForm(true); }} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add Card</button>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(80px,1fr))",gap:9,marginBottom:14 }}>
        {[{l:"Total Limit",v:`₹${(totalLimit/100000).toFixed(2)}L`,c:COLORS.textMuted},{l:"Due (This Month)",v:`₹${globalDue.toLocaleString("en-IN")}`,c:COLORS.danger,k:"due"},{l:"Overdue",v:`₹${globalOverdue.toLocaleString("en-IN")}`,c:COLORS.danger,k:"overdue"},{l:"Current Txns",v:`₹${globalCurrent.toLocaleString("en-IN")}`,c:COLORS.secondary,k:"current"}].map(s=>(
          <div key={s.l} onClick={() => s.k ? setActiveBreakup(activeBreakup === s.k ? null : s.k) : null} style={{ background: activeBreakup === s.k ? COLORS.primary+"33" : COLORS.bgCard, border:`1px solid ${activeBreakup === s.k ? COLORS.primary : COLORS.border}`, borderRadius:11, padding:"10px 12px", cursor: s.k ? "pointer" : "default" }}>
            <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:3 }}>{s.l}</div>
            <div style={{ fontSize:14,fontWeight:700,color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>
      
      {activeBreakup && (
        <div style={{ background: "#1a2236", padding: 16, borderRadius: 12, marginBottom: 16, border: `1px solid ${COLORS.primary}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{activeBreakup === "due" ? "Due This Month" : activeBreakup === "overdue" ? "Overdue Amounts" : "Current Unbilled Transactions"}</div>
            <button onClick={() => setActiveBreakup(null)} style={{ background: "transparent", color: COLORS.textMuted, border: "none", cursor: "pointer", fontSize: 18 }}>×</button>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {getBreakupData(activeBreakup).map(item => (
              <div key={item.card.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}55` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{item.card.name}</div>
                  <div style={{ fontSize: 10, color: COLORS.textMuted }}>Bill Date: {item.date} • {item.card.network}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.danger }}>₹{item.amount.toLocaleString("en-IN")}</div>
              </div>
            ))}
            {getBreakupData(activeBreakup).length === 0 && <div style={{ fontSize: 12, color: COLORS.textMuted }}>No cards have {activeBreakup} balances.</div>}
          </div>
        </div>
      )}


      {showForm && !editItem && formElement}

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16 }}>
        {creditCards && creditCards.map((cc, i) => {
          const breakdown = getCardBreakdown(cc, expenses);
          const usedAmt = breakdown.totalUsed;
          const availAmt = (cc.limit||0) - usedAmt;
          const pct = Math.min(100, (usedAmt / (cc.limit||1))*100);
          
          const recentTx = [...breakdown.txsWithOpening].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0, 5);
          
          return (
          <Fragment key={i}>
            <div onClick={() => { setEditItem(cc); setForm(cc); setShowForm(true); }} style={{ background:"#1a2236",borderRadius:12,border:`1px solid ${COLORS.border}`,position:"relative",overflow:"hidden",cursor:"pointer" }}>
              <div style={{ position:"absolute",left:0,top:0,bottom:0,width:4,background:cc.color||COLORS.primary }} />
              <div style={{ padding:16,paddingLeft:20 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                  <div style={{ fontSize:16,fontWeight:700,color:COLORS.text }}>{cc.name}</div>
                  <div style={{ fontSize:10,background:"rgba(255,255,255,0.1)",padding:"2px 8px",borderRadius:12,color:COLORS.textMuted }}>{cc.network}</div>
                </div>
                
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:20,fontWeight:700,color:COLORS.danger,marginBottom:2 }}>₹{usedAmt.toLocaleString("en-IN")}</div>
                    <div style={{ fontSize:10,color:COLORS.textMuted }}>Used</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize:14,fontWeight:700,color:COLORS.secondary }}>₹{availAmt.toLocaleString("en-IN")}</div>
                    <div style={{ fontSize:10,color:COLORS.textMuted }}>Limit: ₹{(cc.limit||0).toLocaleString("en-IN")}</div>
                  </div>
                </div>
                
                <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, marginBottom: 12 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: pct > 80 ? COLORS.danger : (pct > 50 ? COLORS.accent : COLORS.primary), borderRadius: 3 }} />
                </div>
                
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:COLORS.textMuted }}>
                  <div>Billing Date: {cc.billingDate}th</div>
                  <div>{recentTx.length} Txns</div>
                </div>
                
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop: 12 }}>
                  <button onClick={(e) => { e.stopPropagation(); setShowPassbook(cc); }} style={{ flex:1, background:"rgba(255,255,255,0.05)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"8px", borderRadius:8, fontWeight:600, cursor:"pointer", fontSize:13 }}>📄 View Statement</button>
                </div>
              </div>
            </div>
            
            {showForm && editItem?.id === cc.id && (
              <div style={{ gridColumn: "1 / -1" }}>
                {formElement}
                
                <div style={{ marginTop: 16, background: "#1a2236", padding: 16, borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>Recent Transactions</div>
                  {recentTx.length === 0 ? (
                    <div style={{ fontSize: 12, color: COLORS.textMuted }}>No transactions found for this card.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {recentTx.map(t => (
                        <div key={t.id || ("tx-"+Math.random())} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}55` }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{t.storeName || t.name || "Expense"}</div>
                            <div style={{ fontSize: 10, color: COLORS.textMuted }}>{t.date} • {t.cat || "—"}</div>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.danger }}>₹{parseFloat(t.amount||0).toLocaleString("en-IN")}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Fragment>
        )})}
      </div>

      {deleteConfirm && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.7)", zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, width: "90%", maxWidth: 400, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: deleteConfirm.step === 2 ? COLORS.danger : COLORS.text, marginBottom: 8 }}>
              {deleteConfirm.step === 1 ? "Delete Credit Card" : "⚠️ Final Warning"}
            </div>
            <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 24 }}>
              {deleteConfirm.step === 1 
                ? `Are you sure you want to delete ${deleteConfirm.item.name}?` 
                : "This will permanently erase the card. Proceed?"}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => {
                if (deleteConfirm.step === 1) {
                  setDeleteConfirm({ ...deleteConfirm, step: 2 });
                } else {
                  setCreditCards(p => p.filter(x => x.id !== deleteConfirm.item.id));
                  setDeleteConfirm(null);
                  setShowForm(false);
                }
              }} style={{ background: COLORS.danger, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>
                {deleteConfirm.step === 1 ? "Delete" : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPassbook && (
        <div style={{ position:"fixed", top:0, right:0, bottom:0, zIndex:100, display:"flex", justifyContent:"flex-end", pointerEvents:"none" }}>
          <div style={{ pointerEvents:"auto", background:"#0F172A", width:750, height:"100vh", display:"flex", flexDirection:"column", borderLeft:`1px solid rgba(255,255,255,0.08)`, boxShadow:"-5px 0 25px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: 24, borderBottom: `1px solid rgba(255,255,255,0.08)`, display: "flex", justifyContent: "space-between", alignItems: "center", background:"rgba(255,255,255,0.03)" }}>
              <div>
                <div style={{ fontSize:18, fontWeight:700, color:"#F1F5F9" }}>Statement: {showPassbook.name}</div>
                <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
                  Total Used: <span style={{ color: COLORS.danger }}>
                    ₹{getCardBreakdown(showPassbook, expenses).totalUsed.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <input 
                  type="text" 
                  placeholder="Filter statement..." 
                  value={passbookFilter} 
                  onChange={(e) => setPassbookFilter(e.target.value)}
                  style={{ background: "rgba(0,0,0,0.2)", border: `1px solid rgba(255,255,255,0.1)`, color: COLORS.text, padding: "8px 12px", borderRadius: 8, fontSize: 13, width: 200, outline: "none" }}
                />
                <button onClick={downloadCSV} style={{ background: COLORS.primary, border: "none", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Download CSV
                </button>
                <button onClick={() => { setShowPassbook(null); setPassbookFilter(""); }} style={{ background:"transparent", border:"none", color:"#94A3B8", cursor:"pointer", fontSize:24 }}>×</button>
              </div>
            </div>
            
            <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
              {(() => {
                const breakdown = getCardBreakdown(showPassbook, expenses);
                const filteredTx = [...breakdown.txsWithOpening]
                  .filter(tx => {
                    if (!passbookFilter) return true;
                    const q = passbookFilter.toLowerCase();
                    const note = (tx.storeName || tx.name || "").toLowerCase();
                    const cat = (tx.cat || "").toLowerCase();
                    const amountStr = (tx.amount || 0).toString();
                    return note.includes(q) || cat.includes(q) || amountStr.includes(q) || tx.date.includes(q);
                  })
                  .sort((a,b) => new Date(b.date) - new Date(a.date));

                if (filteredTx.length === 0) {
                  return <div style={{ textAlign: "center", color: COLORS.textMuted, padding: 20 }}>No transactions found.</div>;
                }

                return (
                  <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px 100px 30px", gap: 12, padding: "12px 16px", background: "rgba(255,255,255,0.04)", borderBottom: `1px solid rgba(255,255,255,0.08)`, fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase" }}>
                      <div>Date</div>
                      <div>Description</div>
                      <div>Category</div>
                      <div style={{ textAlign: "right" }}>Amount</div>
                      <div></div>
                    </div>
                    {filteredTx.map((tx, i, arr) => {
                      const isLast = i === arr.length - 1;
                      const isOpening = tx.name === "Opening Balance" && !tx.id;
                      return (
                        <div key={tx.id || ("tx-"+i)} style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px 100px 30px", gap: 12, padding: "12px 16px", borderBottom: isLast ? "none" : `1px solid rgba(255,255,255,0.04)`, fontSize: 13, alignItems: "center", color: COLORS.text }}>
                          <div style={{ color: COLORS.textMuted, fontSize: 12 }}>{tx.date.split("-").reverse().join("-").substring(0, 5)}</div>
                          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={tx.storeName || tx.name || "-"}>{tx.storeName || tx.name || "-"}</div>
                          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: COLORS.secondary, fontSize: 12 }}>{tx.cat || "—"}</div>
                          <div style={{ textAlign: "right", color: COLORS.danger, fontWeight: 600 }}>₹{parseFloat(tx.amount || 0).toLocaleString("en-IN")}</div>
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            {!isOpening && (
                              <button 
                                onClick={() => { if (onEditExpense) onEditExpense(tx, showPassbook); }}
                                style={{ background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 14 }}
                                title="Edit Expense"
                              >
                                ✎
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExpenseViewLive({ expenses, setExpenses, initialEditTx, clearInitialEditTx, onCloseEditModal, filter, subscriptions, setSubscriptions, insurance, setInsurance, investments, setInvestments, loans, setLoans, creditCards, setCreditCards, banks, setDeletedTransactions , vendorMaster, setVendorMaster, categoryMaster, setCategoryMaster, companyMaster, setCompanyMaster, platformMaster, setPlatformMaster, uid, workspaces, activeWorkspaceId }) {
  const [catFilter, setCatFilter] = useState("All");
  const [showAdd,   setShowAdd]   = useState(false);
  const [payingEmi, setPayingEmi] = useState(null);
  const [emiForm, setEmiForm] = useState({ date: "", amount: "", principal: "", interest: "" });
  const [editing,   setEditing]   = useState(null);
  const [viewingReceipt, setViewingReceipt] = useState(null); // { url, type } for in-app viewer
  
  useEffect(() => {
    if (initialEditTx) {
      setEditing(initialEditTx);
      setShowAdd(true);
      if (clearInitialEditTx) clearInitialEditTx();
    }
  }, [initialEditTx, clearInitialEditTx]);

  
  const [payingSub, setPayingSub] = useState(null);
  const [deletingExp, setDeletingExp] = useState(null);
  const [payingInv, setPayingInv] = useState(null);
  const dueInv = investments ? getDueInvestments(investments) : [];
  const dueEmi = loans ? getDueEMIs(loans) : [];
  
  const handlePayInvConfirm = () => {
    if (!payingInv) return;
    const inv = payingInv.inv;
    
    // Log expense
    const expId = "e" + Date.now();
    setExpenses(p => [{ id: expId, trxNo: getNextTrxNo("EXP", p), title: inv.name + (inv.cycle==="One-Time"?" (Lumpsum)":" (Installment)"), amount: parseFloat(payingInv.amount), date: payingInv.date, category: "Investment", cat: "Investment", icon: inv.icon, color: inv.color, bankId: inv.bankId || "", paymentMode: inv.bankId ? "Net Banking" : "UPI", expenseId: inv.invId }, ...p]);
    
    // Log payment in investment
    setInvestments(p => p.map(s => {
      if (s.id === inv.invId) {
        return { ...s, payments: [...(s.payments||[]), { date: inv.dueDate, amount: parseFloat(payingInv.amount), expenseId: expId }] };
      }
      return s;
    }));
    
    setPayingInv(null);
  };

  const [payingIns, setPayingIns] = useState(null);
  const dueIns = insurance ? getDueInsurance(insurance) : [];
  const dueSubs = subscriptions ? getDueSubscriptions(subscriptions) : [];

  const handlePaySubConfirm = () => {
    if (!payingSub) return;
    const { sub, date, amount } = payingSub;
    const amt = parseFloat(amount);
    if (amt < 0) {
      alert("Values cannot be negative.");
      return;
    }
    const exp = {
      id: "e" + Date.now(),
      trxNo: getNextTrxNo("EXP", expenses),
      date: date,
      cat: sub.category || "Subscription",
      icon: sub.icon || "💳",
      color: sub.color || COLORS.primary,
      amount: amt,
      vendor: sub.name,
      notes: `Linked to: ${sub.trxNo || sub.name} (${sub.dueDate})`,
      bankId: sub.bankId || "", paymentMode: sub.bankId ? "Net Banking" : "UPI"
    };
    setExpenses(prev => [exp, ...prev]);
    setSubscriptions(prev => prev.map(s => {
      if (s.id !== sub.subId) return s;
      return { ...s, payments: [...(s.payments || []), { date: sub.dueDate, amount: amt, expenseId: exp.id }] };
    }));
    setPayingSub(null);
  };

    const handlePayInsConfirm = () => {
    if (!payingIns) return;
    const { ins, date, amount } = payingIns;
    const amt = parseFloat(amount);
    if (amt < 0) { alert("Values cannot be negative."); return; }
    const exp = {
      id: "e" + Date.now(),
      trxNo: getNextTrxNo("EXP", expenses),
      date: date,
      cat: ins.type || "Insurance",
      icon: ins.icon || "🛡️",
      color: ins.color || COLORS.primary,
      amount: amt,
      vendor: ins.provider || ins.name,
      notes: "Premium Payment: " + ins.name + " (" + ins.dueDate + ")",
      bankId: ins.bankId || "", paymentMode: ins.bankId ? "Net Banking" : "UPI"
    };
    setExpenses(prev => [exp, ...prev]);
    setInsurance(prev => prev.map(s => {
      if (s.id !== ins.insId) return s;
      return { ...s, payments: [...(s.payments || []), { date: ins.dueDate, amount: amt, expenseId: exp.id }] };
    }));
    setPayingIns(null);
  };

  const cats = ["All","Food","Fuel","Grocery","Entertainment","Medical","Shopping","Utilities","Education","Travel"];
  const MS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtDate = d => { const dt=new Date(d); return `${dt.getDate()} ${MS[dt.getMonth()]}`; };

  const periodFiltered = expenses ? expenses.filter(t => {
    const d = new Date(t.date); const m=d.getMonth()+1, y=d.getFullYear();
    if (filter.mode==="month") return m===filter.month && y===filter.year;
    if (filter.mode==="year")  return y===filter.year;
    if (filter.mode==="range") { const k=y*100+m; return k>=filter.fromYear*100+filter.fromMonth && k<=filter.toYear*100+filter.toMonth; }
    return true;
  }) : [];

  const filtered = (catFilter==="All" ? periodFiltered : periodFiltered.filter(t=>t.cat===catFilter)).sort((a,b)=>new Date(b.date)-new Date(a.date));

  const getMappedSection = (t) => {
    let match;
    if (t.expenseId) {
      if ((match = investments?.find(i => i.id === t.expenseId))) return `Investment - ${match.name}`;
      if ((match = subscriptions?.find(s => s.id === t.expenseId))) return `Subscription - ${match.name}`;
      if ((match = insurance?.find(i => i.id === t.expenseId))) return `Insurance - ${match.name}`;
      if ((match = loans?.find(l => l.id === t.expenseId))) return `EMI - ${match.name}`;
    }
    if ((match = subscriptions?.find(s => s.payments?.some(p => p.expenseId === t.id)))) return `Subscription - ${match.name}`;
    if ((match = insurance?.find(i => i.payments?.some(p => p.expenseId === t.id)))) return `Insurance - ${match.name}`;
    if ((match = investments?.find(i => i.payments?.some(p => p.expenseId === t.id)))) return `Investment - ${match.name}`;
    if ((match = loans?.find(l => l.payments?.some(p => p.expenseId === t.id)))) return `EMI - ${match.name}`;
    
    // Fallback for older items without expenseId
    if ((match = subscriptions?.find(s => s.payments?.some(p => !p.expenseId && (p.payDate === t.date || p.date === t.date) && parseFloat(p.amount) === parseFloat(t.amount))))) return `Subscription - ${match.name}`;
    if ((match = insurance?.find(i => i.payments?.some(p => !p.expenseId && (p.payDate === t.date || p.date === t.date) && parseFloat(p.amount) === parseFloat(t.amount))))) return `Insurance - ${match.name}`;
    if ((match = investments?.find(i => i.payments?.some(p => !p.expenseId && (p.payDate === t.date || p.date === t.date) && parseFloat(p.amount) === parseFloat(t.amount))))) return `Investment - ${match.name}`;
    if ((match = loans?.find(l => l.payments?.some(p => !p.expenseId && (p.payDate === t.date || p.date === t.date) && parseFloat(p.amount) === parseFloat(t.amount))))) return `EMI - ${match.name}`;
    
    return null;
  };

  return (
    <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16 }}>
        {dueInv.length > 0 && (
        <div style={{ background: "#10b98120", border: `1px solid #10b981`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981", marginBottom: 12 }}>🏦 Due Investments ({dueInv.length})</div>
          <div style={{ display: "grid", gap: 10 }}>
            {dueInv.map(inv => (
              <div key={inv.invId + "-" + inv.dueDate} style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{inv.icon} {inv.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{inv.type}   Due: {fmtDate(inv.dueDate)}</div>
                  {inv.bankId && <div style={{ fontSize: 11, color: COLORS.secondary, marginTop: 4, fontWeight: 600 }}>🏦 {banks?.find(b => b.id === inv.bankId)?.name || "Unknown Bank"}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#10b981" }}>₹{inv.amount.toLocaleString("en-IN")}</div>
                  {payingInv && payingInv.inv.invId === inv.invId && payingInv.inv.dueDate === inv.dueDate ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input type="date" value={payingInv.date} onChange={e => setPayingInv({...payingInv, date: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "4px 8px", borderRadius: 4 }} />
                        <input type="number" value={payingInv.amount} onChange={e => setPayingInv({...payingInv, amount: e.target.value})} style={{ width: 80, background: "#1a2236", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "4px 8px", borderRadius: 4 }} />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={handlePayInvConfirm} style={{ background: COLORS.primary, color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>Confirm</button>
                        <button onClick={() => setPayingInv(null)} style={{ background: "transparent", color: COLORS.textMuted, border: `1px solid ${COLORS.border}`, padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setPayingInv({ inv, date: inv.dueDate, amount: inv.amount })} style={{ background: "#10b981", color: "#fff", border: "none", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Pay Now</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dueIns.length > 0 && (
        <div style={{ background: COLORS.secondary + "20", border: `1px solid ${COLORS.secondary}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.secondary, marginBottom: 12 }}>🛡️ Due Insurance Premiums ({dueIns.length})</div>
          <div style={{ display: "grid", gap: 10 }}>
            {dueIns.map(ins => (
              <div key={ins.insId + "-" + ins.dueDate} style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{ins.icon} {ins.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>Cycle: {ins.cycle}   Due: {fmtDate(ins.dueDate)}</div>
                  {ins.bankId && <div style={{ fontSize: 11, color: COLORS.secondary, marginTop: 4, fontWeight: 600 }}>🏦 {banks?.find(b => b.id === ins.bankId)?.name || "Unknown Bank"}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.secondary }}>₹{ins.amount.toLocaleString("en-IN")}</div>
                  {payingIns && payingIns.ins.insId === ins.insId && payingIns.ins.dueDate === ins.dueDate ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input type="date" value={payingIns.date} onChange={e => setPayingIns({...payingIns, date: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "4px 8px", borderRadius: 4 }} />
                        <input type="number" value={payingIns.amount} onChange={e => setPayingIns({...payingIns, amount: e.target.value})} style={{ width: 80, background: "#1a2236", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "4px 8px", borderRadius: 4 }} />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={handlePayInsConfirm} style={{ background: COLORS.primary, color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>Confirm</button>
                        <button onClick={() => setPayingIns(null)} style={{ background: "transparent", color: COLORS.textMuted, border: `1px solid ${COLORS.border}`, padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setPayingIns({ ins, date: ins.dueDate, amount: ins.amount })} style={{ background: COLORS.secondary, color: "#fff", border: "none", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Pay Now</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      
        {dueEmi.length > 0 && (
          <div style={{ background: "rgba(255, 100, 100, 0.08)", border: `1px solid ${COLORS.danger}44`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.danger, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              🏠 Due EMIs ({dueEmi.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {dueEmi.map(emi => (
                <div key={emi.loanId + emi.dueDate} style={{ display: "flex", flexDirection: payingEmi === emi.loanId + emi.dueDate ? "column" : "row", justifyContent: "space-between", alignItems: payingEmi === emi.loanId + emi.dueDate ? "flex-start" : "center", background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{emi.name}</div>
                    <div style={{ fontSize: 10, color: COLORS.textMuted }}>{emi.bank} · Due: {emi.dueDate}</div>
                    {emi.bankId && <div style={{ fontSize: 11, color: COLORS.secondary, marginTop: 4, fontWeight: 600 }}>🏦 {banks?.find(b => b.id === emi.bankId)?.name || "Unknown Bank"}</div>}
                  </div>
                  {payingEmi === emi.loanId + emi.dueDate ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                        <div><div style={{fontSize:9,color:COLORS.textMuted,marginBottom:2}}>Payment Date</div><input type="date" value={emiForm.date} onChange={e=>setEmiForm({...emiForm, date:e.target.value})} style={{ background: "#0f172a", color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: "6px", borderRadius: 4, fontSize: 11, width:"100%" }} /></div>
                        <div><div style={{fontSize:9,color:COLORS.textMuted,marginBottom:2}}>Interest (₹)</div><input type="number" value={emiForm.interest} onChange={e=>{ const int = parseFloat(e.target.value)||0; const prin = parseFloat(emiForm.principal)||0; setEmiForm({...emiForm, interest:e.target.value, amount: prin + int}); }} style={{ background: "#0f172a", color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: "6px", borderRadius: 4, fontSize: 11, width:"100%" }} /></div>
                        <div><div style={{fontSize:9,color:COLORS.textMuted,marginBottom:2}}>Principal (₹)</div><input type="number" value={emiForm.principal} onChange={e=>{ const prin = parseFloat(e.target.value)||0; const int = parseFloat(emiForm.interest)||0; setEmiForm({...emiForm, principal:e.target.value, amount: prin + int}); }} style={{ background: "#0f172a", color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: "6px", borderRadius: 4, fontSize: 11, width:"100%" }} /></div>
                        <div><div style={{fontSize:9,color:COLORS.textMuted,marginBottom:2}}>Total EMI (₹)</div><input type="number" value={emiForm.amount} onChange={e=>{ const amt = parseFloat(e.target.value)||0; const int = parseFloat(emiForm.interest)||0; const prin = parseFloat(emiForm.principal)||0; if (int === 0) { setEmiForm({...emiForm, amount:e.target.value, principal: amt}); } else { setEmiForm({...emiForm, amount:e.target.value, interest: Math.max(0, amt - prin)}); } }} style={{ background: "#0f172a", color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: "6px", borderRadius: 4, fontSize: 11, width:"100%" }} /></div>
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => setPayingEmi(null)} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                        <button onClick={() => {
                           const a = parseFloat(emiForm.amount)||0;
                           const pr = parseFloat(emiForm.principal)||0;
                           const int = parseFloat(emiForm.interest)||0;
                           const nExp = { id: "e" + Date.now(), trxNo: getNextTrxNo("EXP", expenses), date: emiForm.date, storeName: emi.bank, productName: emi.name + " EMI", cat: "EMI", amount: a, icon: "🏠", color: COLORS.danger, paymentMode: "Net Banking", bankId: emi.bankId || "" };
                           setExpenses(p => [nExp, ...p]);
                           setLoans(p => p.map(l => l.id === emi.loanId ? { ...l, payments: [...(l.payments||[]), { date: emi.dueDate, payDate: emiForm.date, amount: a, principal: pr, interest: int, expenseId: nExp.id }] } : l));
                           setPayingEmi(null);
                        }} style={{ background: COLORS.primary, border: "none", color: "#fff", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Confirm</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.danger }}>₹{emi.amount.toLocaleString("en-IN", {maximumFractionDigits:0})}</div>
                      <button onClick={() => {
                        setPayingEmi(emi.loanId + emi.dueDate);
                        setEmiForm({ date: new Date().toISOString().split('T')[0], amount: Math.round(emi.amount), principal: Math.round(emi.principal||0), interest: Math.round(emi.interest||0) });
                      }} style={{ background: COLORS.danger, color: "#fff", padding: "6px 14px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Pay Now</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {dueSubs.length > 0 && (
        <div style={{ background: COLORS.danger + "20", border: `1px solid ${COLORS.danger}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.danger, marginBottom: 12 }}>⚠️ Due Subscriptions ({dueSubs.length})</div>
          <div style={{ display: "grid", gap: 10 }}>
            {dueSubs.map(sub => {
              const statusInfo = getDueStatusAndStyle(sub.dueDate);
              return (
                <div key={sub.subId + "-" + sub.dueDate} style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{sub.icon} {sub.name}</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                      <span>Cycle: {sub.cycle}</span>
                      <span>•</span>
                      <span>Due: {fmtDate(sub.dueDate)}</span>
                      <span style={{ 
                        padding: "1px 6px", 
                        borderRadius: 4, 
                        fontSize: 9, 
                        fontWeight: 700, 
                        color: statusInfo.color, 
                        background: `${statusInfo.color}15`, 
                        border: `1px solid ${statusInfo.color}25` 
                      }}>{statusInfo.label}</span>
                    </div>
                    {sub.bankId && <div style={{ fontSize: 11, color: COLORS.secondary, marginTop: 4, fontWeight: 600 }}>🏦 {banks?.find(b => b.id === sub.bankId)?.name || "Unknown Bank"}</div>}
                  </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.danger }}>₹{sub.amount.toLocaleString("en-IN")}</div>
                  {payingSub && payingSub.sub.subId === sub.subId && payingSub.sub.dueDate === sub.dueDate ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input type="date" value={payingSub.date} onChange={e => setPayingSub({...payingSub, date: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "4px 8px", borderRadius: 4 }} />
                        <input type="number" value={payingSub.amount} onChange={e => setPayingSub({...payingSub, amount: e.target.value})} style={{ width: 80, background: "#1a2236", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "4px 8px", borderRadius: 4 }} />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={handlePaySubConfirm} style={{ background: COLORS.primary, color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>Confirm</button>
                        <button onClick={() => setPayingSub(null)} style={{ background: "transparent", color: COLORS.textMuted, border: `1px solid ${COLORS.border}`, padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => {
                          if (window.confirm(`Mark ${sub.name} as Not Used for this cycle?`)) {
                            setSubscriptions(prev => prev.map(s => {
                              if (s.id !== sub.subId) return s;
                              return { ...s, payments: [...(s.payments || []), { date: sub.dueDate, amount: 0, skipped: true }] };
                            }));
                          }
                        }}
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          color: COLORS.textMuted,
                          border: `1px solid ${COLORS.border}`,
                          padding: "6px 12px",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: 12,
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                      >
                        Not Used
                      </button>
                      <button onClick={() => setPayingSub({ sub, date: sub.dueDate, amount: sub.amount })} style={{ background: COLORS.danger, color: "#fff", border: "none", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Pay Now</button>
                    </div>
                  )}
                </div>
              </div>
            )})}
          </div>
        </div>
      )}


      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:18,fontWeight:700,color:COLORS.text }}>Expense Log</div>
        <button onClick={() => { setEditing(null); setShowAdd(true); }} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add Expense</button>
      </div>
      
      <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:8, marginBottom:16 }}>
        {cats.map(c => (
          <div key={c} onClick={() => setCatFilter(c)} style={{ whiteSpace:"nowrap", padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", background: catFilter===c ? COLORS.primary : "#1e293b", color: catFilter===c ? "#fff" : COLORS.textMuted }}>{c}</div>
        ))}
      </div>
      
      <div style={{ display:"grid", gap:10 }}>
        {filtered.map(t => (
          <div key={t.id} onClick={() => { setEditing(t); setShowAdd(true); }} style={{ background:"#1a2236", borderRadius:12, padding:16, display:"flex", justifyContent:"space-between", alignItems:"center", border:`1px solid ${COLORS.border}`, cursor:"pointer" }}>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ width:40, height:40, borderRadius:20, background:t.color+"20", color:t.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{t.icon}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:COLORS.text }}>{t.vendor || t.storeName || t.title} {t.platformName && <span style={{ fontSize: 11, color: COLORS.secondary, fontWeight: 500, marginLeft: 6 }}>({t.platformName})</span>}</div>
                <div style={{ fontSize:12, color:COLORS.textMuted }}>
                  {t.cat || t.category} • {fmtDate(t.date)}
                  {t.bankId && banks && banks.find(b => b.id === t.bankId) ? " • " + banks.find(b => b.id === t.bankId).name : ""}
                  {t.creditCardId && creditCards && creditCards.find(c => c.id === t.creditCardId) ? " • " + creditCards.find(c => c.id === t.creditCardId).bank : ""}
                  {!t.bankId && !t.creditCardId && t.paymentMode ? " • " + t.paymentMode : ""}
                  {t.trxNo ? " • " : ""}
                  <span style={{color:COLORS.primary, fontWeight:700}}>{t.trxNo}</span>
                  {(() => {
                    const mapped = getMappedSection(t);
                    return mapped ? <span style={{ marginLeft: 8, padding: "2px 6px", borderRadius: 4, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: 9, fontWeight: 700 }}>🔗 {mapped}</span> : null;
                  })()}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize:16, fontWeight:700, color:COLORS.danger }}>-₹{parseFloat(t.amount||0).toLocaleString("en-IN")}</div>
              {t.receiptUrl && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setViewingReceipt({ url: t.receiptUrl, name: t.storeName || "Receipt" });
                  }}
                  title="View Receipt / Bill"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 32, height: 32, borderRadius: 8,
                    background: "rgba(108,99,255,0.18)",
                    border: "1px solid rgba(108,99,255,0.35)",
                    color: COLORS.primary, fontSize: 16, cursor: "pointer",
                    flexShrink: 0, transition: "all 0.18s"
                  }}
                >📄</button>
              )}
              {t.warrantyData?.cardUrl && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setViewingReceipt({ url: t.warrantyData.cardUrl, name: "Warranty Card" });
                  }}
                  title="View Warranty Card"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 32, height: 32, borderRadius: 8,
                    background: "rgba(139,92,246,0.18)",
                    border: "1px solid rgba(139,92,246,0.35)",
                    color: "#8b5cf6", fontSize: 16, cursor: "pointer",
                    flexShrink: 0, transition: "all 0.18s"
                  }}
                >🛡️</button>
              )}
              <button onClick={(e) => { e.stopPropagation(); setDeletingExp(t.id); }} style={{ background:"transparent", border:"none", cursor:"pointer", padding:0, fontSize:16, flexShrink:0 }} title="Delete Expense">🗑️</button>
            </div>
          </div>
        ))}
        {filtered.length===0 && <div style={{ textAlign:"center", padding:30, color:COLORS.textMuted }}>No expenses found.</div>}
      </div>

      {deletingExp && (
        <ConfirmDialog 
          msg="Are you sure you want to delete this expense? This action cannot be undone." 
          onConfirm={() => {
            const expToDelete = expenses.find(e => e.id === deletingExp);
            if (!expToDelete) { setDeletingExp(null); return; }
            
            const linkedPayments = [];
            
            const findAndRemovePayment = (s, moduleName) => {
               // First try by expenseId
               let removed = (s.payments||[]).find(p => p.expenseId === deletingExp);
               
               // Fallback for historical payments that didn't have expenseId
               if (!removed) {
                 removed = (s.payments||[]).find(p => !p.expenseId && (p.payDate === expToDelete.date || p.date === expToDelete.date) && parseFloat(p.amount) === parseFloat(expToDelete.amount));
               }
               
               if (removed) {
                 linkedPayments.push({ module: moduleName, itemId: s.id, payment: removed });
                 return { ...s, payments: (s.payments||[]).filter(p => p !== removed) };
               }
               return s;
            };
            
            if (setSubscriptions) setSubscriptions(prev => prev.map(s => findAndRemovePayment(s, "subscriptions")));
            if (setInsurance) setInsurance(prev => prev.map(s => findAndRemovePayment(s, "insurance")));
            if (setInvestments) setInvestments(prev => prev.map(s => findAndRemovePayment(s, "investments")));
            if (setLoans) setLoans(prev => prev.map(s => findAndRemovePayment(s, "loans")));
            if (setCreditCards) setCreditCards(prev => prev.map(s => findAndRemovePayment(s, "creditCards")));

            if (setDeletedTransactions) {
               setDeletedTransactions(p => [{ id: "del_"+Date.now(), type: "expense", item: expToDelete, deletedAt: new Date().toISOString(), linkedPayments }, ...p]);
            }
            
            setExpenses(p => p.filter(e => e.id !== deletingExp));
            setDeletingExp(null);
          }} 
          onCancel={() => setDeletingExp(null)} 
        />
      )}
      {showAdd && (
        <AddExpenseModal pastExpenses={expenses} banks={banks} creditCards={creditCards} vendorMaster={vendorMaster} setVendorMaster={setVendorMaster} categoryMaster={categoryMaster} setCategoryMaster={setCategoryMaster} companyMaster={companyMaster} setCompanyMaster={setCompanyMaster} platformMaster={platformMaster} setPlatformMaster={setPlatformMaster} uid={uid} workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} onClose={() => { setShowAdd(false); if (onCloseEditModal) onCloseEditModal(); }} onSave={(t) => {
          const itemWithCat = { ...t, cat: t.category || t.cat };
          const expId = editing ? editing.id : "e"+Date.now();
          const expItem = {...itemWithCat, id: expId, trxNo: editing?.trxNo || getNextTrxNo("EXP", expenses)};
          
          if (itemWithCat.paidByOther && itemWithCat.paidByWorkspaceId) {
             const targetKey = "fp_expenses_" + itemWithCat.paidByWorkspaceId;
             try {
                const targetStr = localStorage.getItem(targetKey);
                let targetExpenses = targetStr ? JSON.parse(targetStr) : [];
                const existingIdx = targetExpenses.findIndex(e => e.id === expId);
                const forWorkspace = workspaces?.find(w => w.id === activeWorkspaceId);
                const interWSTransaction = {
                   ...expItem,
                   bankId: "", 
                   creditCardId: "",
                   paidForWorkspaceId: activeWorkspaceId,
                   paidForWorkspaceName: forWorkspace ? forWorkspace.name : "Another Workspace"
                };
                if (existingIdx >= 0) targetExpenses[existingIdx] = interWSTransaction;
                else targetExpenses = [interWSTransaction, ...targetExpenses];
                localStorage.setItem(targetKey, JSON.stringify(targetExpenses));
                
                // Dispatch event so other tabs/instances update
                window.dispatchEvent(new Event("storage"));
             } catch(err) { console.error("Error saving cross-workspace transaction", err); }
          }

          if (editing) setExpenses(p => p.map(x => x.id===editing.id ? expItem : x));
          else setExpenses(p => [expItem, ...p]);
          setShowAdd(false);
          if (onCloseEditModal) onCloseEditModal();
        }} initialData={editing} />
      )}

      {/* In-app Document Viewer Modal */}
      {viewingReceipt && (
        <div 
          onClick={() => setViewingReceipt(null)}
          style={{ 
            position: "fixed", 
            inset: 0, 
            background: "rgba(10, 15, 30, 0.88)", 
            backdropFilter: "blur(12px)",
            zIndex: 110, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            padding: 16
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ 
              background: "#0d1526", 
              border: `1px solid rgba(108,99,255,0.25)`, 
              borderRadius: 16, 
              padding: 20, 
              width: "100%", 
              maxWidth: 640, 
              maxHeight: "90vh", 
              display: "flex", 
              flexDirection: "column",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)"
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLORS.text }}>📄 View Document</h4>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: COLORS.textMuted }}>{viewingReceipt.name}</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a 
                  href={viewingReceipt.url} 
                  download={`receipt_${Date.now()}.png`}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid rgba(255,255,255,0.1)`,
                    borderRadius: 8,
                    padding: "6px 12px",
                    color: COLORS.text,
                    fontSize: 12,
                    fontWeight: 500,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer"
                  }}
                >
                  📥 Download
                </a>
                <button 
                  onClick={() => setViewingReceipt(null)}
                  style={{ 
                    background: "rgba(255,255,255,0.06)", 
                    border: `1px solid rgba(255,255,255,0.1)`, 
                    borderRadius: 8, 
                    width: 32, 
                    height: 32, 
                    color: COLORS.text, 
                    cursor: "pointer", 
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div style={{ 
              flex: 1, 
              overflowY: "auto", 
              background: "#070c16", 
              borderRadius: 12, 
              border: "1px solid rgba(255,255,255,0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 320,
              padding: 10
            }}>
              {viewingReceipt.url.includes("data:application/pdf") || viewingReceipt.url.includes(".pdf") ? (
                <iframe 
                  src={viewingReceipt.url} 
                  title="Document PDF" 
                  style={{ width: "100%", height: "60vh", border: "none", borderRadius: 8 }}
                />
              ) : (
                <img 
                  src={viewingReceipt.url} 
                  alt="Receipt Document" 
                  style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: 8 }} 
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function ReportsViewLive({ incomes, expenses, filter }) {
  // Build monthly rows from live data
  const allMonths = {};
  [...incomes, ...expenses].forEach(item => {
    const d = new Date(item.date);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    if (!allMonths[key]) allMonths[key] = { key, year:d.getFullYear(), month:d.getMonth()+1, label:`${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`, income:0, expense:0 };
  });
  incomes.forEach(i => {
    const d=new Date(i.date); const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    if(allMonths[key]) allMonths[key].income+=parseFloat(i.amount||0);
  });
  expenses.forEach(e => {
    const d=new Date(e.date); const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    if(allMonths[key]) allMonths[key].expense+=parseFloat(e.amount||0);
  });
  const rows = Object.values(allMonths).map(r=>({...r,savings:r.income-r.expense})).sort((a,b)=>a.key.localeCompare(b.key));

  const filtered = rows.filter(r => {
    if (filter.mode==="month") return r.month===filter.month && r.year===filter.year;
    if (filter.mode==="year")  return r.year===filter.year;
    if (filter.mode==="range") { const k=r.year*100+r.month; return k>=filter.fromYear*100+filter.fromMonth&&k<=filter.toYear*100+filter.toMonth; }
    return true;
  });
  const totals = filtered.reduce((acc,r)=>({income:acc.income+r.income,expense:acc.expense+r.expense,savings:acc.savings+r.savings}),{income:0,expense:0,savings:0});

  return (
    <div>
      <div style={{ fontSize:18, fontWeight:700, color:COLORS.text, marginBottom:4 }}>Reports & Analytics</div>
      <div style={{ fontSize:12, color:COLORS.textMuted, marginBottom:14 }}>{filterLabel(filter)} · {filtered.length} month{filtered.length!==1?"s":""} · Live data</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(80px,1fr))", gap:10, marginBottom:14 }}>
        {[
          { label:"Total Income",  val:`₹${(totals.income/100000).toFixed(2)}L`,  color:COLORS.secondary },
          { label:"Total Expense", val:`₹${(totals.expense/100000).toFixed(2)}L`, color:COLORS.danger },
          { label:"Net Savings",   val:`₹${(totals.savings/100000).toFixed(2)}L`, color:totals.savings>=0?COLORS.primary:COLORS.danger },
        ].map(s=>(
          <div key={s.label} style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:"12px 14px" }}>
            <div style={{ fontSize:10, color:COLORS.textMuted, marginBottom:3 }}>{s.label}</div>
            <div style={{ fontSize:17, fontWeight:700, color:s.color }}>{s.val}</div>
          </div>
        ))}
      </div>
      {filtered.length===0 ? (
        <div style={{ textAlign:"center", padding:40, color:COLORS.textMuted }}>No data for selected period. Add income or expense entries.</div>
      ) : (
        <div style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:14, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 0.8fr", padding:"10px 14px", borderBottom:`1px solid ${COLORS.border}` }}>
            {["Month","Income","Expense","Savings","Rate"].map(h=>(
              <div key={h} style={{ fontSize:9.5, color:COLORS.textMuted, fontWeight:600 }}>{h.toUpperCase()}</div>
            ))}
          </div>
          {filtered.map((d,i)=>(
            <div key={d.key} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 0.8fr", padding:"10px 14px", borderBottom:i<filtered.length-1?`1px solid rgba(255,255,255,0.04)`:"none" }}>
              <div style={{ fontSize:12, color:COLORS.text, fontWeight:600 }}>{d.label}</div>
              <div style={{ fontSize:11, color:COLORS.secondary }}>₹{(d.income/1000).toFixed(1)}K</div>
              <div style={{ fontSize:11, color:COLORS.danger }}>₹{(d.expense/1000).toFixed(1)}K</div>
              <div style={{ fontSize:11, color:d.savings>=0?COLORS.primary:COLORS.danger }}>₹{(d.savings/1000).toFixed(1)}K</div>
              <div style={{ fontSize:11, color:COLORS.accent }}>{d.income>0?((d.savings/d.income)*100).toFixed(0):0}%</div>
            </div>
          ))}
          {filtered.length>1 && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 0.8fr", padding:"10px 14px", background:"rgba(108,99,255,0.1)", borderTop:`1px solid rgba(108,99,255,0.2)` }}>
              <div style={{ fontSize:11, color:COLORS.primary, fontWeight:700 }}>TOTAL</div>
              <div style={{ fontSize:11, color:COLORS.secondary, fontWeight:700 }}>₹{(totals.income/1000).toFixed(1)}K</div>
              <div style={{ fontSize:11, color:COLORS.danger, fontWeight:700 }}>₹{(totals.expense/1000).toFixed(1)}K</div>
              <div style={{ fontSize:11, color:totals.savings>=0?COLORS.primary:COLORS.danger, fontWeight:700 }}>₹{(totals.savings/1000).toFixed(1)}K</div>
              <div style={{ fontSize:11, color:COLORS.accent, fontWeight:700 }}>{totals.income>0?((totals.savings/totals.income)*100).toFixed(0):0}%</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Live Dashboard ───────────────────────────────────────────────────────────
function DashboardLive({ incomes, expenses, filter, creditCards, investments, loans, goals, banks }) {
  const periodInc = incomes.filter(i => {
    const d=new Date(i.date); const m=d.getMonth()+1,y=d.getFullYear();
    if(filter.mode==="month") return m===filter.month&&y===filter.year;
    if(filter.mode==="year")  return y===filter.year;
    if(filter.mode==="range"){const k=y*100+m;return k>=filter.fromYear*100+filter.fromMonth&&k<=filter.toYear*100+filter.toMonth;}
    return true;
  });
  const periodExp = expenses.filter(e => {
    const d=new Date(e.date); const m=d.getMonth()+1,y=d.getFullYear();
    if(filter.mode==="month") return m===filter.month&&y===filter.year;
    if(filter.mode==="year")  return y===filter.year;
    if(filter.mode==="range"){const k=y*100+m;return k>=filter.fromYear*100+filter.fromMonth&&k<=filter.toYear*100+filter.toMonth;}
    return true;
  });
  const totalIncome  = periodInc.reduce((s,i)=>s+parseFloat(i.amount||0),0);
  const totalExpense = periodExp.reduce((s,e)=>s+parseFloat(e.amount||0),0);
  const netSavings   = totalIncome - totalExpense;
  const savingsRate  = totalIncome > 0 ? ((netSavings/totalIncome)*100).toFixed(1) : 0;

  // Build last 6 months spark data
  const now = new Date();
  const spark = Array.from({length:6},(_,i)=>{ const d=new Date(now.getFullYear(),now.getMonth()-5+i,1); return {m:d.getMonth()+1,y:d.getFullYear()}; });
  const incSpark = spark.map(s=>incomes.filter(i=>{const d=new Date(i.date);return d.getMonth()+1===s.m&&d.getFullYear()===s.y;}).reduce((a,i)=>a+parseFloat(i.amount||0),0));
  const expSpark = spark.map(s=>expenses.filter(e=>{const d=new Date(e.date);return d.getMonth()+1===s.m&&d.getFullYear()===s.y;}).reduce((a,e)=>a+parseFloat(e.amount||0),0));
  const savSpark = incSpark.map((v,i)=>v-expSpark[i]);

  // Live investment totals from actual investments data
  const invList = investments || [];
  const totalInvested = invList.reduce((s,i)=>s+parseFloat(i.invested||i.amount||0),0);
  const totalInvCurrent = invList.reduce((s,i)=>s+parseFloat(i.current||i.invested||i.amount||0),0);
  // Group investments by type for donut chart
  const INV_TYPE_COLORS = { "Mutual Fund":COLORS.primary, "Stock":COLORS.accent, "Fixed Deposit":COLORS.secondary, "Gold":"#F59E0B", "PPF":"#8B5CF6", "NPS":"#06B6D4", "EPF":"#10B981", "Crypto":"#EF4444", "Real Estate":"#8B5CF6", "Other":"#64748B" };
  const invByType = {};
  invList.forEach(inv => {
    const t = inv.type || "Other";
    if (!invByType[t]) invByType[t] = { name: t, value: 0, color: INV_TYPE_COLORS[t] || "#64748B" };
    invByType[t].value += parseFloat(inv.current||inv.invested||inv.amount||0);
  });
  const invData = Object.values(invByType).filter(d=>d.value>0);
  const fallbackInvData = invData.length > 0 ? invData : [{name:"No investments yet",value:1,color:COLORS.textMuted}];

  // Live goals data
  const goalsList = (goals||[]).map(g=>({ label: g.name||g.label, pct: g.target>0?Math.round(((g.saved||g.current||0)/g.target)*100):0, color: g.color }));

  // Live bank balances total
  const banksList = banks || [];
  const totalBankBalance = banksList.reduce((sum, bank) => {
    const bankInc = (incomes||[]).filter(i => i.bankId === bank.id).reduce((s,i) => s + parseFloat(i.amount||0), 0);
    const bankExp = (expenses||[]).filter(e => e.bankId === bank.id).reduce((s,e) => s + parseFloat(e.amount||0), 0);
    return sum + parseFloat(bank.initialBalance||0) + bankInc - bankExp;
  }, 0);

  // Net worth = bank balances + investment current value + net savings (unlinked)
  const allTimeInc = (incomes||[]).reduce((s,i)=>s+parseFloat(i.amount||0),0);
  const allTimeExp = (expenses||[]).reduce((s,e)=>s+parseFloat(e.amount||0),0);
  const liveNetWorth = totalBankBalance + totalInvCurrent;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:11 }}>
        <KPICard label="Total Income"  value={totalIncome}  trend={0} trendLabel="" color={COLORS.secondary} sparkData={incSpark.length>1?incSpark:[0,totalIncome]} icon="↑" />
        <KPICard label="Total Expense" value={totalExpense} trend={0} trendLabel="" color={COLORS.danger}    sparkData={expSpark.length>1?expSpark:[0,totalExpense]} icon="↓" />
        <KPICard label="Net Savings"   value={netSavings}   trend={0} trendLabel="" color={netSavings>=0?COLORS.accent:COLORS.danger} sparkData={savSpark.length>1?savSpark:[0,netSavings]} icon="★" />
        <KPICard label="Savings Rate"  value={parseFloat(savingsRate)} prefix="" suffix="%" trend={0} trendLabel="" color={COLORS.primary} sparkData={[parseFloat(savingsRate)]} icon="⊕" />
        <KPICard label="Investments"   value={totalInvCurrent} trend={totalInvested>0?parseFloat(((totalInvCurrent-totalInvested)/totalInvested*100).toFixed(1)):0} trendLabel="gain" color="#8B5CF6" sparkData={totalInvCurrent>0?[totalInvested,totalInvCurrent]:[0]} icon="◎" />
        <KPICard label="Net Worth"     value={liveNetWorth} trend={0} trendLabel="YoY" color={COLORS.primary} sparkData={liveNetWorth>0?[liveNetWorth*0.75,liveNetWorth*0.85,liveNetWorth*0.92,liveNetWorth]:[0]} icon="◈" />
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ gridColumn:"unset", background:COLORS.bgCard, borderRadius:16, padding:"16px 18px", border:`1px solid ${COLORS.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <div><div style={{ fontSize:13, fontWeight:600, color:COLORS.text }}>Income vs Expense</div><div style={{ fontSize:11, color:COLORS.textMuted }}>Last 6 months · Live</div></div>
            <div style={{ display:"flex", gap:10, fontSize:10 }}><span style={{ color:COLORS.secondary }}>● Income</span><span style={{ color:COLORS.danger }}>● Expense</span></div>
          </div>
          {incSpark.some(v=>v>0)||expSpark.some(v=>v>0) ? <BarChart months={spark.map(s=>MONTH_NAMES[s.m-1])} income={incSpark} expense={expSpark} /> : <div style={{ padding:"20px 0", textAlign:"center", color:COLORS.textMuted, fontSize:12 }}>Add income & expense entries to see chart</div>}
        </div>
        <div style={{ background:COLORS.bgCard, borderRadius:16, padding:"16px 18px", border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:4 }}>Investments</div>
          {invData.length > 0 ? (
            <>
              <div style={{ display:"flex", justifyContent:"center" }}><DonutChart data={fallbackInvData} /></div>
              <div style={{ display:"flex", flexDirection:"column", gap:4, marginTop:6 }}>
                {invData.map(d=>(
                  <div key={d.name} style={{ display:"flex", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:7,height:7,borderRadius:"50%",background:d.color }}/><span style={{ fontSize:10, color:COLORS.textMuted }}>{d.name}</span></div>
                    <span style={{ fontSize:10, color:COLORS.text }}>₹{d.value>=100000?(d.value/100000).toFixed(2)+"L":(d.value/1000).toFixed(0)+"K"}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ padding:"20px 0", textAlign:"center", color:COLORS.textMuted, fontSize:12 }}>Add investments to see your portfolio breakdown</div>
          )}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:14 }}>
        <div style={{ background:COLORS.bgCard, borderRadius:16, padding:"16px 18px", border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:12 }}>Goal Progress</div>
          {goalsList.length > 0 ? (
            <div style={{ display:"flex", justifyContent:"space-around", flexWrap:"wrap", gap:8 }}>{goalsList.map(g=><CircularProgress key={g.label} pct={g.pct} color={g.color} label={g.label}/>)}</div>
          ) : (
            <div style={{ padding:"20px 0", textAlign:"center", color:COLORS.textMuted, fontSize:12 }}>Add goals to track your progress</div>
          )}
        </div>
        <div style={{ background:COLORS.bgCard, borderRadius:16, padding:"16px 18px", border:`1px solid rgba(108,99,255,0.2)` }}>
          <div style={{ fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
            <span>✦</span> AI Financial Advisor
            <span style={{ marginLeft:"auto", fontSize:9, background:`${COLORS.primary}33`, color:COLORS.primary, padding:"2px 8px", borderRadius:20 }}>LIVE</span>
          </div>
          <AIChatPanel />
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

const SUBS_SEED = [];
const FRIENDLY_LOANS_SEED = [];

const getDueStatusAndStyle = (dueDateStr) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  const [y, m, d] = dueDateStr.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  due.setHours(0,0,0,0);
  
  if (due < today) {
    return {
      label: "OVERDUE",
      color: "#ef4444",
      bg: "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)",
      border: "4px solid #ef4444",
      iconBg: "rgba(239, 68, 68, 0.2)",
      icon: "🚨"
    };
  }
  
  if (due.getMonth() === today.getMonth() && due.getFullYear() === today.getFullYear()) {
    return {
      label: "DUE",
      color: "#f59e0b",
      bg: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)",
      border: "4px solid #f59e0b",
      iconBg: "rgba(245, 158, 11, 0.2)",
      icon: "⏳"
    };
  }
  
  return {
    label: "UPCOMING",
    color: "#3b82f6",
    bg: "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)",
    border: "4px solid #3b82f6",
    iconBg: "rgba(59, 130, 246, 0.2)",
    icon: "📅"
  };
};

const getDueSubscriptions = (subscriptions) => {
  if (!subscriptions) return [];
  const due = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  
  subscriptions.forEach(sub => {
    if (sub.status === "Paused" || !sub.startDate) return;
    const [sY, sM, sD] = sub.startDate.split('-');
    const start = new Date(sY, sM - 1, sD);
    let nextDate = new Date(start);
    
    let limit = 0;
    while (nextDate <= today && limit < 1000) {
      if (sub.endDate && nextDate > new Date(sub.endDate)) break;
      
      const nextDateStr = toLocalYYYYMMDD(nextDate);
      const isPaid = sub.payments && sub.payments.some(p => p.date === nextDateStr);
      
      if (!isPaid) {
        due.push({
          subId: sub.id,
          name: sub.name,
          amount: sub.amount,
          dueDate: nextDateStr,
          cycle: sub.cycle,
          icon: sub.icon,
          color: sub.color,
          category: sub.category,
          bankId: sub.bankId
        });
      }
      
      if (sub.cycle === "Annual") {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      limit++;
    }
  });
  
  return due;
};


const INSURANCE_SEED = [];

const getDueInsurance = (insuranceList) => {
  if (!insuranceList) return [];
  const due = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  
  insuranceList.forEach(ins => {
    if (!ins.startDate || ins.status === "Closed" || ins.status === "Paused") return;
    const [sY, sM, sD] = ins.startDate.split('-');
    const start = new Date(sY, sM - 1, sD);
    
    if (ins.cycle === "One-Time") {
      if (ins.payments && ins.payments.length > 0) return;
      if (start <= today) {
        due.push({
          insId: ins.id,
          name: ins.name,
          provider: ins.provider,
          amount: ins.amount,
          dueDate: ins.startDate,
          cycle: ins.cycle,
          icon: ins.icon,
          color: ins.color,
          type: ins.type,
          bankId: ins.bankId
        });
      }
      return;
    }
    
    let nextDate = new Date(start);
    let limit = 0;
    while (nextDate <= today && limit < 1000) {
      if (ins.endDate && nextDate > new Date(ins.endDate)) break;
      
      const nextDateStr = toLocalYYYYMMDD(nextDate);
      const isPaid = ins.payments && ins.payments.some(p => p.date === nextDateStr);
      
      if (!isPaid) {
        due.push({
          insId: ins.id,
          name: ins.name,
          provider: ins.provider,
          amount: ins.amount,
          dueDate: nextDateStr,
          cycle: ins.cycle,
          icon: ins.icon,
          color: ins.color,
          type: ins.type,
          bankId: ins.bankId
        });
      }
      
      if (ins.cycle === "Annual") nextDate.setFullYear(nextDate.getFullYear() + 1);
      else if (ins.cycle === "Quarterly") nextDate.setMonth(nextDate.getMonth() + 3);
      else if (ins.cycle === "Half-Yearly") nextDate.setMonth(nextDate.getMonth() + 6);
      else nextDate.setMonth(nextDate.getMonth() + 1);
      limit++;
    }
  });
  
  return due;
};


function BanksViewLive({ banks, setBanks, expenses, setExpenses, incomes, setIncomes, workspaces, activeWorkspaceId, initialPassbook, clearInitialPassbook, onEditExpense, onEditIncome }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({ name:"", type:"Savings", initialBalance:"", accountNumber:"", color:COLORS.primary });
  const [showPassbook, setShowPassbook] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  useEffect(() => {
    if (initialPassbook) {
      setShowPassbook(initialPassbook);
      if (clearInitialPassbook) clearInitialPassbook();
    }
  }, [initialPassbook, clearInitialPassbook]);
  const [transferForm, setTransferForm] = useState({ fromBankId: "", toBankId: "", amount: "", date: new Date().toISOString().split('T')[0], note: "", isCrossWorkspace: false, toWorkspaceId: "" });

  const handleTransferSubmit = () => {
    if (!transferForm.fromBankId || !transferForm.toBankId || !transferForm.amount || !transferForm.date) {
      return alert("Please fill in all required fields.");
    }
    if (transferForm.fromBankId === transferForm.toBankId) {
      return alert("Source and destination accounts must be different.");
    }
    
    const amt = parseFloat(transferForm.amount);
    if (isNaN(amt) || amt <= 0) return alert("Enter a valid amount.");

    const fromBank = banks.find(b => b.id === transferForm.fromBankId);
    let toBank = { id: "", name: "another workspace" };
    if (!transferForm.isCrossWorkspace) {
      toBank = banks.find(b => b.id === transferForm.toBankId) || toBank;
    } else {
      toBank.name = workspaces?.find(w => w.id === transferForm.toWorkspaceId)?.name || "Another Workspace";
    }

    const commonId = "trf_" + Date.now();
    
    // Create Expense in From Bank
    const expItem = {
      id: commonId + "_exp",
      bankId: fromBank.id,
      amount: amt,
      date: transferForm.date,
      title: "Transfer to " + toBank.name,
      cat: "Transfer",
      category: "Transfer",
      icon: "🔄",
      color: COLORS.primary,
      paymentMode: "Net Banking"
    };
    if (transferForm.note) expItem.note = transferForm.note;

    // Create Income in To Bank
    const incItem = {
      id: commonId + "_inc",
      bankId: toBank.id,
      amount: amt,
      date: transferForm.date,
      source: "Other",
      note: "Transfer from " + fromBank.name + (transferForm.note ? ` (${transferForm.note})` : ""),
      icon: "🔄",
      color: COLORS.primary
    };

    setExpenses(p => [expItem, ...(p || [])]);
    
    if (transferForm.isCrossWorkspace && transferForm.toWorkspaceId) {
      try {
        const otherWsKey = `finpilot_incomes_${transferForm.toWorkspaceId}`;
        const otherIncomes = JSON.parse(localStorage.getItem(otherWsKey) || "[]");
        otherIncomes.push({
          id: commonId + "_injected",
          trxNo: "TRX-" + Date.now().toString().slice(-6),
          date: transferForm.date,
          amount: amt,
          source: "Other",
          note: `Transfer from ${workspaces?.find(w => w.id === activeWorkspaceId)?.name || "Another Workspace"}${transferForm.note ? ` (${transferForm.note})` : ""}`,
          icon: "🔄",
          color: COLORS.primary,
          receivedFromWorkspaceId: activeWorkspaceId,
          receivedFromWorkspaceName: workspaces?.find(w => w.id === activeWorkspaceId)?.name || "Another Workspace"
        });
        localStorage.setItem(otherWsKey, JSON.stringify(otherIncomes));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {
        console.error("Failed to inject income into receiver workspace", e);
      }
    } else {
      setIncomes(p => [incItem, ...(p || [])]);
    }
    
    setShowTransferModal(false);
    setTransferForm({ fromBankId: "", toBankId: "", amount: "", date: new Date().toISOString().split('T')[0], note: "", isCrossWorkspace: false, toWorkspaceId: "" });
  };

  const handleSave = () => {
    if (!form.name || form.initialBalance==="") return alert("Name and Initial Balance are required.");
    const item = { ...form, initialBalance: parseFloat(form.initialBalance) };
    if (editItem) {
      setBanks(p => p.map(i => i.id === editItem.id ? { ...i, ...item } : i));
    } else {
      setBanks(p => [...(p||[]), { ...item, id: "bank" + Date.now() }]);
    }
    setShowForm(false);
    setEditItem(null);
  };

  const getLiveBalance = (bankId, initial) => {
    const inc = incomes ? incomes.filter(i => i.bankId === bankId).reduce((s, i) => s + parseFloat(i.amount||0), 0) : 0;
    const exp = expenses ? expenses.filter(e => e.bankId === bankId).reduce((s, e) => s + parseFloat(e.amount||0), 0) : 0;
    return parseFloat(initial||0) + inc - exp;
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 60 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div style={{ fontSize:24, fontWeight:700, color:COLORS.text }}>Bank Accounts</div>
          <div style={{ fontSize:14, color:COLORS.textMuted, marginTop:4 }}>Manage your accounts & balances</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => setShowTransferModal(true)} style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 16px", borderRadius:12, fontWeight:600, cursor:"pointer" }}>🔄 Transfer Funds</button>
          <button onClick={() => { setForm({ name:"", type:"Savings", initialBalance:"", accountNumber:"", color:COLORS.primary }); setEditItem(null); setShowForm(true); }} style={{ background:COLORS.primary, color:"#fff", border:"none", padding:"10px 16px", borderRadius:12, fontWeight:600, cursor:"pointer" }}>+ Add Bank</button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:16 }}>
        {(banks || []).map(bank => {
          const liveBal = getLiveBalance(bank.id, bank.initialBalance);
          return (
            <div key={bank.id} style={{ background:COLORS.bgCard, borderRadius:16, border:`1px solid ${COLORS.border}`, overflow:"hidden", display:"flex", flexDirection:"column" }}>
              <div style={{ height:6, background:bank.color || COLORS.primary }} />
              <div style={{ padding:20, flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, color:COLORS.text }}>{bank.name}</div>
                    <div style={{ fontSize:12, color:COLORS.textMuted, marginTop:2 }}>{bank.type} {bank.accountNumber ? `· ${bank.accountNumber}` : ""}</div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => { setForm(bank); setEditItem(bank); setShowForm(true); }} style={{ background:"transparent", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:14 }}>✎</button>
                    <button onClick={() => setDeleteConfirm(bank)} style={{ background:"transparent", border:"none", color:"#FF5B5B", cursor:"pointer", fontSize:14 }}>×</button>
                  </div>
                </div>
                <div style={{ marginTop:24 }}>
                  <div style={{ fontSize:12, color:COLORS.textMuted, marginBottom:4 }}>Live Balance</div>
                  <div style={{ fontSize:28, fontWeight:700, color:COLORS.text }}>₹{liveBal.toLocaleString("en-IN")}</div>
                </div>
                <div style={{ marginTop:24, display:"flex" }}>
                   <button onClick={() => setShowPassbook(bank.id)} style={{ flex:1, background:"rgba(255,255,255,0.05)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"8px", borderRadius:8, fontWeight:600, cursor:"pointer", fontSize:13 }}>📖 View Passbook</button>
                </div>
              </div>
            </div>
          );
        })}
        {(!banks || banks.length === 0) && (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:40, background:COLORS.bgCard, borderRadius:16, border:`1px solid ${COLORS.border}`, color:COLORS.textMuted }}>
            No bank accounts added yet. Click "+ Add Bank" to get started.
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ display: "flex", gap: 24, background:COLORS.bgCard, width:"90%", maxWidth: 850, borderRadius:20, padding:24, border:`1px solid ${COLORS.border}`, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ flex: "1 1 60%" }}>
            <div style={{ fontSize:18, fontWeight:700, color:COLORS.text, marginBottom:20 }}>{editItem ? "Edit Bank" : "Add Bank"}</div>
            
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:13, color:COLORS.textMuted, marginBottom:6 }}>Bank Name *</div>
              <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="e.g. HDFC Bank" style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 14px", borderRadius:10 }} autoFocus />
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <div>
                <div style={{ fontSize:13, color:COLORS.textMuted, marginBottom:6 }}>Account Type</div>
                <select value={form.type} onChange={e=>setForm({...form, type: e.target.value})} style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 14px", borderRadius:10 }}>
                  <option value="Savings">Savings</option>
                  <option value="Current">Current</option>
                  <option value="Salary">Salary</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize:13, color:COLORS.textMuted, marginBottom:6 }}>A/c Number (Last 4)</div>
                <input value={form.accountNumber} onChange={e=>setForm({...form, accountNumber:e.target.value})} placeholder="e.g. 1234" maxLength={4} style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 14px", borderRadius:10 }} />
              </div>
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:13, color:COLORS.textMuted, marginBottom:6 }}>Initial Balance (₹) *</div>
              <input type="number" value={form.initialBalance} onChange={e=>setForm({...form, initialBalance:e.target.value})} placeholder="0" style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 14px", borderRadius:10 }} />
            </div>

            <div style={{ display:"flex", gap:12 }}>
              <button onClick={()=>setShowForm(false)} style={{ flex:1, padding:"12px", background:"rgba(255,255,255,0.05)", border:"none", borderRadius:10, color:COLORS.text, fontWeight:600, cursor:"pointer" }}>Cancel</button>
              <button onClick={handleSave} style={{ flex:1, padding:"12px", background:COLORS.primary, border:"none", borderRadius:10, color:"#fff", fontWeight:600, cursor:"pointer" }}>Save Bank</button>
            </div>
            </div>
            
            {(() => {
            if (!editItem) return <div style={{ flex: "1 1 35%" }}></div>;
               const bInc = (incomes||[]).filter(i => i.bankId === editItem.id).map(x => ({...x, isInc: true}));
               const bExp = (expenses||[]).filter(e => e.bankId === editItem.id).map(x => ({...x, isInc: false}));
               const allTx = [...bInc, ...bExp].sort((a,b)=>new Date(b.date)-new Date(a.date));
               return (
                  <div style={{ flex: "1 1 40%", position: "sticky", top: 0, background: "rgba(0,0,0,0.15)", padding: 20, borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>🧾</span> Bank Ledger
                    </div>
                      
                if (allTx.length === 0) return <div style={{ flex: "1 1 35%" }}></div>;
                return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
                        {allTx.map((p, idx) => {
                          const trxNo = p.trxNo || "—";
                          return (
                            <div key={"tx-"+idx} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}`, padding: "12px 16px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 18, background: p.isInc ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 91, 91, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{p.isInc ? "↓" : "↑"}</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{p.name || (p.isInc?"Income":"Expense")}</div>
                                    <div style={{ fontSize: 9, background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: 12, color: COLORS.textMuted, fontWeight: 600 }}>{trxNo}</div>
                                  </div>
                                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{formatLocalDateString(p.date)} • {p.isInc ? p.source : (p.category||p.paymentMode)}</div>
                                </div>
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: p.isInc ? COLORS.secondary : COLORS.text }}>{p.isInc?"+":""}₹{parseFloat(p.amount).toLocaleString("en-IN")}</div>
                            </div>
                          );
                        })}
                      </div>

                  </div>
               );
            })()}

          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:COLORS.bgCard, width:360, borderRadius:20, padding:24, border:`1px solid ${COLORS.border}` }}>
            <div style={{ fontSize:18, fontWeight:700, color:COLORS.text, marginBottom:8 }}>Delete Bank?</div>
            <div style={{ fontSize:14, color:COLORS.textMuted, marginBottom:24 }}>Are you sure you want to delete {deleteConfirm.name}?</div>
            <div style={{ display:"flex", gap:12 }}>
              <button onClick={()=>setDeleteConfirm(null)} style={{ flex:1, padding:"12px", background:"rgba(255,255,255,0.05)", border:"none", borderRadius:10, color:COLORS.text, fontWeight:600, cursor:"pointer" }}>Cancel</button>
              <button onClick={() => { setBanks(p => p.filter(i => i.id !== deleteConfirm.id)); setDeleteConfirm(null); }} style={{ flex:1, padding:"12px", background:"#FF5B5B", border:"none", borderRadius:10, color:"#fff", fontWeight:600, cursor:"pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showPassbook && (
         <PassbookModal bank={banks.find(b => b.id === showPassbook)} incomes={incomes} expenses={expenses} onClose={() => setShowPassbook(null)} onEditExpense={onEditExpense} onEditIncome={onEditIncome} />
      )}
      {showTransferModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#0d1526", width:"90%", maxWidth: 450, borderRadius:20, padding:24, border:`1px solid ${COLORS.border}`, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize:18, fontWeight:700, color:COLORS.text, marginBottom:20 }}>Transfer Funds</div>
            
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:13, color:COLORS.textMuted, marginBottom:6 }}>From Account *</div>
              <select value={transferForm.fromBankId} onChange={e=>setTransferForm({...transferForm, fromBankId:e.target.value})} style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 14px", borderRadius:10, outline:"none", boxSizing:"border-box" }}>
                <option value="">— Select Account —</option>
                {(banks||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            
            {workspaces && workspaces.length > 1 && (
              <div style={{ background: transferForm.isCrossWorkspace ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${transferForm.isCrossWorkspace ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.05)"}`, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, color: transferForm.isCrossWorkspace ? "#10b981" : COLORS.text, fontWeight: 600 }}>Transfer to another workspace?</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>Send money directly to another user</div>
                  </div>
                  <div 
                    onClick={() => setTransferForm(p => ({ ...p, isCrossWorkspace: !p.isCrossWorkspace, toBankId: "", toWorkspaceId: !p.isCrossWorkspace ? (workspaces.find(w => w.id !== activeWorkspaceId)?.id || "") : "" }))}
                    style={{ width: 44, height: 24, borderRadius: 12, background: transferForm.isCrossWorkspace ? "#10b981" : "rgba(255,255,255,0.1)", position: "relative", cursor: "pointer", transition: "all 0.2s" }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 2, left: transferForm.isCrossWorkspace ? 22 : 2, transition: "all 0.2s" }} />
                  </div>
                </div>
              </div>
            )}
            
            <div style={{ marginBottom:16 }}>
              {transferForm.isCrossWorkspace ? (
                <>
                  <div style={{ fontSize:13, color:COLORS.textMuted, marginBottom:6 }}>To Workspace *</div>
                  <select value={transferForm.toWorkspaceId} onChange={e=>setTransferForm({...transferForm, toWorkspaceId:e.target.value})} style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 14px", borderRadius:10, outline:"none", boxSizing:"border-box" }}>
                    {workspaces.filter(w => w.id !== activeWorkspaceId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </>
              ) : (
                <>
                  <div style={{ fontSize:13, color:COLORS.textMuted, marginBottom:6 }}>To Account *</div>
                  <select value={transferForm.toBankId} onChange={e=>setTransferForm({...transferForm, toBankId:e.target.value})} style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 14px", borderRadius:10, outline:"none", boxSizing:"border-box" }}>
                    <option value="">— Select Account —</option>
                    {(banks||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </>
              )}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <div>
                <div style={{ fontSize:13, color:COLORS.textMuted, marginBottom:6 }}>Amount (₹) *</div>
                <input type="number" inputMode="numeric" value={transferForm.amount} onChange={e=>setTransferForm({...transferForm, amount:e.target.value})} placeholder="0" style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 14px", borderRadius:10, outline:"none", boxSizing:"border-box" }} />
              </div>
              <div>
                <div style={{ fontSize:13, color:COLORS.textMuted, marginBottom:6 }}>Date *</div>
                <input type="date" value={transferForm.date} onChange={e=>setTransferForm({...transferForm, date:e.target.value})} style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 14px", borderRadius:10, outline:"none", boxSizing:"border-box" }} />
              </div>
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:13, color:COLORS.textMuted, marginBottom:6 }}>Notes (Optional)</div>
              <input type="text" value={transferForm.note} onChange={e=>setTransferForm({...transferForm, note:e.target.value})} placeholder="e.g. For house rent" style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 14px", borderRadius:10, outline:"none", boxSizing:"border-box" }} />
            </div>

            <div style={{ display:"flex", gap:12 }}>
              <button onClick={()=>setShowTransferModal(false)} style={{ flex:1, padding:"12px", background:"rgba(255,255,255,0.05)", border:"none", borderRadius:10, color:COLORS.text, fontWeight:600, cursor:"pointer" }}>Cancel</button>
              <button onClick={handleTransferSubmit} style={{ flex:1, padding:"12px", background:COLORS.primary, border:"none", borderRadius:10, color:"#fff", fontWeight:600, cursor:"pointer" }}>Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PassbookModal({ bank, incomes, expenses, onClose, onEditExpense, onEditIncome }) {
  const [drillDown, setDrillDown] = useState(null);

  const bInc = (incomes || []).filter(i => i.bankId === bank.id).map(i => ({
    id: i.id, date: i.date, type: "income", amount: parseFloat(i.amount || 0),
    title: i.source || i.title || "Income", desc: i.note || i.notes || i.description || "", raw: i
  }));
  const bExp = (expenses || []).filter(e => e.bankId === bank.id).map(e => ({
    id: e.id, date: e.date, type: "expense", amount: parseFloat(e.amount || 0),
    title: e.vendor || e.storeName || "Expense", desc: e.note || e.notes || e.description || "", raw: e
  }));

  let merged = [...bInc, ...bExp].sort((a, b) => new Date(a.date) - new Date(b.date));
  let currentBalance = parseFloat(bank.initialBalance || 0);
  merged = merged.map(txn => {
    if (txn.type === "income") currentBalance += txn.amount;
    else currentBalance -= txn.amount;
    return { ...txn, balance: currentBalance };
  });
  merged.reverse();

  const [passbookFilter, setPassbookFilter] = useState("");

  const downloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Description,Type,Amount,Balance\n";
    const reversed = [...merged].reverse();
    reversed.forEach(row => {
      const desc = row.desc ? ` - ${row.desc}` : "";
      const description = `"${row.title}${desc}"`;
      csvContent += `${row.date},${description},${row.type},${row.amount},${row.balance}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${bank.name}_Passbook.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ position:"fixed", top:0, right:0, bottom:0, zIndex:100, display:"flex", justifyContent:"flex-end", pointerEvents:"none" }}>
      <div style={{ pointerEvents:"auto", background:"#0F172A", width:750, height:"100vh", display:"flex", flexDirection:"column", borderLeft:`1px solid rgba(255,255,255,0.08)`, boxShadow:"-5px 0 25px rgba(0,0,0,0.5)" }}>
        {drillDown ? (
          <>
            <div style={{ padding:"24px", borderBottom:`1px solid rgba(255,255,255,0.08)`, display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(255,255,255,0.03)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <button onClick={() => setDrillDown(null)} style={{ background:"rgba(255,255,255,0.1)", border:"none", color:"#F1F5F9", cursor:"pointer", width:32, height:32, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
                <div style={{ fontSize:18, fontWeight:700, color:"#F1F5F9" }}>Transaction Details</div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button 
                  onClick={() => {
                    if (drillDown.type === "expense" && onEditExpense) onEditExpense(drillDown.raw, bank.id);
                    else if (drillDown.type === "income" && onEditIncome) onEditIncome(drillDown.raw, bank.id);
                  }}
                  style={{ background: "rgba(255,255,255,0.1)", border: "none", color: COLORS.text, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
                >
                  ✎ Edit
                </button>
                <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#94A3B8", cursor:"pointer", fontSize:24 }}>×</button>
              </div>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:24 }}>
               <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(255,255,255,0.03)", padding:20, borderRadius:12, border:"1px solid rgba(255,255,255,0.08)" }}>
                     <div style={{ fontSize:14, color:"#94A3B8" }}>Type</div>
                     <div style={{ padding:"4px 12px", borderRadius:20, fontSize:13, fontWeight:700, background:drillDown.type==="income"?"rgba(0,200,150,0.15)":"rgba(255,91,91,0.15)", color:drillDown.type==="income"?"#00C896":"#FF5B5B", textTransform:"capitalize" }}>{drillDown.type}</div>
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.03)", padding:20, borderRadius:12, border:"1px solid rgba(255,255,255,0.08)" }}>
                     <div style={{ fontSize:12, color:"#94A3B8", marginBottom:4, textTransform:"uppercase", fontWeight:600 }}>Amount</div>
                     <div style={{ fontSize:24, fontWeight:700, color:drillDown.type==="income"?"#00C896":"#FF5B5B" }}>{drillDown.type==="income"?"+":"-"}₹{drillDown.amount.toLocaleString("en-IN")}</div>
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.03)", padding:20, borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", display:"flex", flexDirection:"column", gap:16 }}>
                     {Object.entries(drillDown.raw).map(([k, v]) => {
                        if (k==="id" || k==="bankId" || k==="color" || k==="icon" || typeof v === 'object') return null;
                        return (
                           <div key={k}>
                              <div style={{ fontSize:12, color:"#94A3B8", marginBottom:4, textTransform:"uppercase", fontWeight:600 }}>{k.replace(/([A-Z])/g, ' $1')}</div>
                              <div style={{ fontSize:15, color:"#F1F5F9", wordBreak:"break-word" }}>{v ? v.toString() : "—"}</div>
                           </div>
                        )
                     })}
                  </div>
               </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid rgba(255,255,255,0.08)`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>{bank.name} Passbook</div>
                  <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>Initial Balance: ₹{(bank.initialBalance||0).toLocaleString("en-IN")}</div>
                </div>
                <div style={{ padding: "0 16px", borderLeft: `1px solid rgba(255,255,255,0.1)`, marginLeft: 16 }}>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5 }}>Current Balance</div>
                  <span style={{ fontSize: 18, fontWeight: 700, color: currentBalance >= 0 ? COLORS.success : COLORS.danger }}>
                    ₹{currentBalance.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <input 
                  type="text" 
                  placeholder="Filter passbook..." 
                  value={passbookFilter} 
                  onChange={(e) => setPassbookFilter(e.target.value)}
                  style={{ background: "rgba(0,0,0,0.2)", border: `1px solid rgba(255,255,255,0.1)`, color: COLORS.text, padding: "8px 12px", borderRadius: 8, fontSize: 13, width: 200, outline: "none" }}
                />
                <button onClick={downloadCSV} style={{ background: COLORS.primary, border: "none", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Download CSV
                </button>
                <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#94A3B8", cursor:"pointer", fontSize:24 }}>×</button>
              </div>
            </div>
            
            <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
              {merged.length === 0 ? (
                <div style={{ textAlign:"center", color:COLORS.textMuted, padding:20 }}>No transactions found for this bank account.</div>
              ) : (
                <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px 100px 30px", gap: 12, padding: "12px 16px", background: "rgba(255,255,255,0.04)", borderBottom: `1px solid rgba(255,255,255,0.08)`, fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase" }}>
                    <div>Date</div>
                    <div>Description</div>
                    <div style={{ textAlign: "right" }}>Amount</div>
                    <div style={{ textAlign: "right" }}>Balance</div>
                    <div></div>
                  </div>
                  {merged.filter(txn => {
                    if (!passbookFilter) return true;
                    const q = passbookFilter.toLowerCase();
                    const title = (txn.title || "").toLowerCase();
                    const desc = (txn.desc || "").toLowerCase();
                    const amountStr = txn.amount.toString();
                    return title.includes(q) || desc.includes(q) || amountStr.includes(q) || txn.date.includes(q);
                  }).map((txn, i, arr) => {
                    const isLast = i === arr.length - 1;
                    return (
                      <div key={txn.id + i} onClick={() => setDrillDown(txn)} style={{ cursor:"pointer", display:"grid", gridTemplateColumns:"80px 1fr 100px 100px 30px", gap:12, padding:"12px 16px", borderBottom: isLast ? "none" : `1px solid rgba(255,255,255,0.04)`, fontSize: 13, alignItems: "center", color: COLORS.text, transition:"background 0.2s" }} onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                        <div style={{ fontSize:11, color:"#94A3B8" }}>{formatLocalDateString(txn.date)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:"#F1F5F9", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{txn.title}</div>
                          {txn.desc && <div style={{ fontSize:10, color:"#94A3B8", marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{txn.desc}</div>}
                        </div>
                        <div style={{ fontSize:13, fontWeight:700, textAlign:"right", color: txn.type==="income"?"#00C896":"#FF5B5B" }}>
                          {txn.type==="income"?"+":"-"}₹{txn.amount.toLocaleString("en-IN")}
                        </div>
                        <div style={{ fontSize:13, fontWeight:700, textAlign:"right", color:"#F1F5F9" }}>
                          ₹{txn.balance.toLocaleString("en-IN")}
                        </div>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (txn.type === "expense" && onEditExpense) onEditExpense(txn.raw, bank.id);
                              else if (txn.type === "income" && onEditIncome) onEditIncome(txn.raw, bank.id);
                            }}
                            style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 14 }}
                            title="Edit Transaction"
                          >
                            ✎
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}




function RecycleBinView({ deletedTransactions, setDeletedTransactions, expenses, setExpenses, incomes, setIncomes, subscriptions, setSubscriptions, loans, setLoans, insurance, setInsurance, investments, setInvestments, creditCards, setCreditCards }) {
  const [filter, setFilter] = useState("All");

  const handleRestore = (record) => {
    if (!record || !record.item) return;

    if (record.type === "expense") {
      // 1. Re-add to expenses
      setExpenses(p => [record.item, ...p]);
      // 2. Re-link payments if they existed
      if (record.linkedPayments) {
        record.linkedPayments.forEach(link => {
          if (link.module === "subscriptions" && setSubscriptions) {
            setSubscriptions(prev => prev.map(s => s.id === link.itemId ? { ...s, payments: [...(s.payments||[]), link.payment] } : s));
          } else if (link.module === "loans" && setLoans) {
            setLoans(prev => prev.map(s => s.id === link.itemId ? { ...s, payments: [...(s.payments||[]), link.payment] } : s));
          } else if (link.module === "insurance" && setInsurance) {
            setInsurance(prev => prev.map(s => s.id === link.itemId ? { ...s, payments: [...(s.payments||[]), link.payment] } : s));
          } else if (link.module === "investments" && setInvestments) {
            setInvestments(prev => prev.map(s => s.id === link.itemId ? { ...s, payments: [...(s.payments||[]), link.payment] } : s));
          } else if (link.module === "creditCards" && setCreditCards) {
            setCreditCards(prev => prev.map(s => s.id === link.itemId ? { ...s, payments: [...(s.payments||[]), link.payment] } : s));
          }
        });
      }
    } else if (record.type === "income") {
      setIncomes(p => [record.item, ...p]);
    }
    
    // Remove from recycle bin
    setDeletedTransactions(p => p.filter(x => x.id !== record.id));
  };

  const handlePermanentDelete = (id) => {
    if (window.confirm("Are you sure you want to permanently delete this item? This cannot be undone.")) {
      setDeletedTransactions(p => p.filter(x => x.id !== id));
    }
  };

  const handleEmptyBin = () => {
    if (window.confirm("Are you sure you want to empty the Recycle Bin?")) {
      setDeletedTransactions([]);
    }
  };

  const displayed = deletedTransactions.filter(t => filter === "All" || t.type === filter);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:700, color:COLORS.text }}>Recycle Bin</div>
          <div style={{ fontSize:12, color:COLORS.textMuted }}>Restore deleted transactions</div>
        </div>
        <button onClick={handleEmptyBin} disabled={deletedTransactions.length===0} style={{ background: "rgba(255,50,50,0.1)", color: COLORS.danger, border: `1px solid rgba(255,50,50,0.2)`, padding: "8px 16px", borderRadius: 8, cursor: deletedTransactions.length===0 ? "not-allowed" : "pointer", fontWeight: 600, opacity: deletedTransactions.length===0 ? 0.5 : 1 }}>Empty Bin</button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {["All", "expense", "income"].map(f => (
          <div key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? COLORS.primary : "transparent", border: `1px solid ${filter === f ? COLORS.primary : COLORS.border}`, padding: "6px 16px", borderRadius: 20, fontSize: 12, cursor: "pointer", color: filter === f ? "#fff" : COLORS.textMuted, textTransform: "capitalize" }}>{f}</div>
        ))}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {displayed.length === 0 ? (
          <div style={{ textAlign:"center", padding:40, background:COLORS.bgCard, borderRadius:16, border:`1px solid ${COLORS.border}` }}>
            <div style={{ fontSize:40, marginBottom:16, opacity:0.5 }}>🗑️</div>
            <div style={{ color:COLORS.textMuted }}>Recycle Bin is empty</div>
          </div>
        ) : (
          displayed.map(record => (
            <div key={record.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:COLORS.bgCard, padding:16, borderRadius:12, border:`1px solid ${COLORS.border}` }}>
              <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                <div style={{ width:40, height:40, borderRadius:12, background: `${record.item.color||COLORS.primary}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{record.item.icon || (record.type==="expense"?"💸":"💰")}</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:COLORS.text }}>{record.item.title || record.item.productName || record.item.vendor || "Transaction"} <span style={{ fontSize:10, padding:"2px 6px", background:"rgba(255,255,255,0.1)", borderRadius:4, marginLeft:8, textTransform:"capitalize" }}>{record.type}</span></div>
                  <div style={{ fontSize:11, color:COLORS.textMuted, marginTop:4 }}>Deleted: {new Date(record.deletedAt).toLocaleString()}</div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ fontSize:16, fontWeight:700, color: record.type==="expense" ? COLORS.danger : COLORS.success, textAlign:"right" }}>
                  {record.type==="expense" ? "-" : "+"}₹{parseFloat(record.item.amount||0).toLocaleString("en-IN")}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => handleRestore(record)} style={{ background:"rgba(0,200,150,0.1)", color:COLORS.secondary, border:`1px solid rgba(0,200,150,0.2)`, padding:"6px 12px", borderRadius:6, fontSize:11, cursor:"pointer", fontWeight:600 }}>Restore</button>
                  <button onClick={() => handlePermanentDelete(record.id)} style={{ background:"transparent", color:COLORS.danger, border:`1px solid rgba(255,50,50,0.2)`, padding:"6px 12px", borderRadius:6, fontSize:11, cursor:"pointer" }}>Delete</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getNextTrxNo(prefix, list) {
  let max = 0;
  if (list && list.length > 0) {
    for (const item of list) {
      if (item.trxNo && item.trxNo.startsWith(prefix + "-")) {
        const numStr = item.trxNo.substring(prefix.length + 1);
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > max) {
          max = num;
        }
      }
    }
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

function AdminSettingsViewLive({ computedNav, customNav, setCustomNav, vendorMaster = [], setVendorMaster, categoryMaster = [], setCategoryMaster, companyMaster = [], setCompanyMaster, platformMaster = [], setPlatformMaster }) {
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [activeTab, setActiveTab] = useState("navigation");
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: "", category: "", platform: "" });
  const [editingVendorIdx, setEditingVendorIdx] = useState(null);
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", products: [] });
  const [editingCategoryIdx, setEditingCategoryIdx] = useState(null);

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyForm, setCompanyForm] = useState({ name: "", category: "", products: [] });
  const [editingCompanyIdx, setEditingCompanyIdx] = useState(null);

  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [platformForm, setPlatformForm] = useState({ name: "", brands: [] });
  const [editingPlatformIdx, setEditingPlatformIdx] = useState(null);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const q = collection(db, "users");
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(document => {
        list.push({ id: document.id, ...document.data() });
      });
      list.sort((a, b) => (b.lastUsed?.toMillis() || 0) - (a.lastUsed?.toMillis() || 0));
      setUsersList(list);
    } catch (err) {
      console.error("Error fetching users", err);
    }
    setLoadingUsers(false);
  };

  const handleToggleBlock = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? "unblock" : "block"} this user?`)) return;
    try {
      const uRef = doc(db, "users", userId);
      await updateDoc(uRef, { isBlocked: !currentStatus });
      setUsersList(usersList.map(u => u.id === userId ? { ...u, isBlocked: !currentStatus } : u));
    } catch(err) {
      alert("Failed to update user status: " + err.message);
    }
  };

  const handleDragStart = (e, id) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) return;

    const currentFullOrder = computedNav.map(item => {
      const existing = customNav.find(c => c.id === item.id);
      return existing ? existing : { ...item };
    });

    const draggedIndex = currentFullOrder.findIndex(c => c.id === draggedItemId);
    const targetIndex = currentFullOrder.findIndex(c => c.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newOrder = [...currentFullOrder];
    const [movedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, movedItem);
    
    setCustomNav(newOrder);
    setDraggedItemId(null);
  };

  const handleUpdate = (id, field, value) => {
    setCustomNav(computedNav.map(item => 
      item.id === id ? { ...item, [field]: value } : { ...item }
    ));
  };

  const handleAddDivider = () => {
    const dividerId = `divider-${Date.now()}`;
    setCustomNav([...computedNav, { id: dividerId, isDivider: true, label: "" }]);
  };

  const handleDeleteDivider = (id) => {
    setCustomNav(computedNav.filter(item => item.id !== id));
  };

  const handleReset = () => {
    if(window.confirm("Are you sure you want to reset all navigation settings to default?")) {
      setCustomNav([]);
    }
  }

  // Master Data Handlers
  const handleDeleteVendor = (idx) => {
    if(window.confirm("Delete this vendor?")) {
      const newV = [...vendorMaster];
      newV.splice(idx, 1);
      setVendorMaster(newV);
    }
  };
  const handleDeleteCategory = (idx) => {
    if(window.confirm("Delete this category completely?")) {
      const newC = [...categoryMaster];
      newC.splice(idx, 1);
      setCategoryMaster(newC);
    }
  };

  const handleAddVendor = () => {
    setEditingVendorIdx(null);
    setVendorForm({ name: "", category: "", platform: "" });
    setShowVendorModal(true);
  };

  const handleEditVendor = (idx) => {
    setEditingVendorIdx(idx);
    setVendorForm(vendorMaster[idx]);
    setShowVendorModal(true);
  };

  const handleSaveVendor = () => {
    if(!vendorForm.name) return;
    const isNewCategory = vendorForm.category && !categoryMaster.some(c => c.name.toLowerCase() === vendorForm.category.toLowerCase());
    const isNewPlatform = vendorForm.platform && !platformMaster.some(p => p.name.toLowerCase() === vendorForm.platform.toLowerCase());
    
    if(editingVendorIdx !== null) {
      const newV = [...vendorMaster];
      newV[editingVendorIdx] = vendorForm;
      setVendorMaster(newV);
    } else {
      if(vendorMaster.some(v => v.name.toLowerCase() === vendorForm.name.toLowerCase())) {
        alert("Vendor already exists!");
        return;
      }
      setVendorMaster([...vendorMaster, vendorForm]);
    }

    if (isNewCategory && setCategoryMaster) {
      setCategoryMaster([...categoryMaster, { name: vendorForm.category, products: [] }]);
    }
    if (isNewPlatform && setPlatformMaster) {
      setPlatformMaster([...platformMaster, { name: vendorForm.platform }]);
    }

    setShowVendorModal(false);
  };

  const handleAddCategory = () => {
    setEditingCategoryIdx(null);
    setCategoryForm({ name: "", products: [] });
    setShowCategoryModal(true);
  };

  const handleEditCategory = (idx) => {
    setEditingCategoryIdx(idx);
    setCategoryForm(categoryMaster[idx]);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = () => {
    if(!categoryForm.name) return;
    if(editingCategoryIdx !== null) {
      const newC = [...categoryMaster];
      newC[editingCategoryIdx] = categoryForm;
      setCategoryMaster(newC);
    } else {
      if(categoryMaster.some(c => c.name.toLowerCase() === categoryForm.name.toLowerCase())) {
        alert("Category already exists!");
        return;
      }
      setCategoryMaster([...categoryMaster, { name: categoryForm.name, products: categoryForm.products || [] }]);
    }
    setShowCategoryModal(false);
  };

  const handleDeleteCompany = (idx) => {
    if(window.confirm("Delete this company/brand?")) {
      const newC = [...companyMaster];
      newC.splice(idx, 1);
      setCompanyMaster(newC);
    }
  };
  const handleAddCompany = () => { setEditingCompanyIdx(null); setCompanyForm({ name: "", category: "", products: [] }); setShowCompanyModal(true); };
  const handleEditCompany = (idx) => { setEditingCompanyIdx(idx); setCompanyForm(companyMaster[idx]); setShowCompanyModal(true); };
  const handleSaveCompany = () => {
    if(!companyForm.name) return;
    if(editingCompanyIdx !== null) { const newC = [...companyMaster]; newC[editingCompanyIdx] = companyForm; setCompanyMaster(newC); }
    else {
      if(companyMaster.some(c => c.name.toLowerCase() === companyForm.name.toLowerCase())) { alert("Company already exists!"); return; }
      setCompanyMaster([...companyMaster, { name: companyForm.name, category: companyForm.category || "", products: companyForm.products || [] }]);
    }
    setShowCompanyModal(false);
  };

  const handleDeletePlatform = (idx) => {
    if(window.confirm("Delete this platform/location?")) {
      const newP = [...platformMaster];
      newP.splice(idx, 1);
      setPlatformMaster(newP);
    }
  };
  const handleAddPlatform = () => { setEditingPlatformIdx(null); setPlatformForm({ name: "", brands: [] }); setShowPlatformModal(true); };
  const handleEditPlatform = (idx) => { setEditingPlatformIdx(idx); setPlatformForm(platformMaster[idx]); setShowPlatformModal(true); };
  const handleSavePlatform = () => {
    if(!platformForm.name) return;
    if(editingPlatformIdx !== null) { const newP = [...platformMaster]; newP[editingPlatformIdx] = platformForm; setPlatformMaster(newP); }
    else {
      if(platformMaster.some(p => p.name.toLowerCase() === platformForm.name.toLowerCase())) { alert("Platform already exists!"); return; }
      setPlatformMaster([...platformMaster, { name: platformForm.name, brands: platformForm.brands || [] }]);
    }
    setShowPlatformModal(false);
  };


  return (
    <div style={{ background:COLORS.bgCard, borderRadius:20, padding:"24px", border:`1px solid rgba(255,255,255,0.05)`, maxWidth:1000, margin:"0 auto" }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 20, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 12 }}>
        <button 
          onClick={() => setActiveTab("navigation")} 
          style={{ background: "transparent", border: "none", color: activeTab === "navigation" ? COLORS.primary : COLORS.textMuted, fontSize: 16, fontWeight: 700, cursor: "pointer", borderBottom: activeTab === "navigation" ? `2px solid ${COLORS.primary}` : "2px solid transparent", paddingBottom: 4 }}
        >
          Navigation Settings
        </button>
        <button 
          onClick={() => setActiveTab("users")} 
          style={{ background: "transparent", border: "none", color: activeTab === "users" ? COLORS.primary : COLORS.textMuted, fontSize: 16, fontWeight: 700, cursor: "pointer", borderBottom: activeTab === "users" ? `2px solid ${COLORS.primary}` : "2px solid transparent", paddingBottom: 4 }}
        >
          Users & Access
        </button>
        <button 
          onClick={() => setActiveTab("masters")} 
          style={{ background: "transparent", border: "none", color: activeTab === "masters" ? COLORS.primary : COLORS.textMuted, fontSize: 16, fontWeight: 700, cursor: "pointer", borderBottom: activeTab === "masters" ? `2px solid ${COLORS.primary}` : "2px solid transparent", paddingBottom: 4 }}
        >
          Master Data
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "navigation" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:COLORS.text }}>Customize Sidebar Navigation</div>
            <div style={{ fontSize:12, color:COLORS.textMuted }}>Drag to reorder. Toggle visibility or rename labels. Add dividers to group items.</div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {computedNav.map((item, i) => (
              <div 
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item.id)}
                style={{ 
                  display: "flex", alignItems: "center", gap: 16, 
                  background: draggedItemId === item.id ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)", 
                  border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 16px",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ color: COLORS.textMuted, opacity: 0.5, cursor: "grab" }}>☰</div>
                
                {item.isDivider ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, width: 60 }}>DIVIDER</div>
                    <input 
                      type="text" 
                      value={item.label}
                      onChange={(e) => handleUpdate(item.id, "label", e.target.value)}
                      placeholder="(Optional text)"
                      style={{ flex: 1, background: "rgba(0,0,0,0.2)", border: "none", color: COLORS.textMuted, fontSize: 12, padding: "4px 8px", borderRadius: 4, outline: "none" }}
                    />
                  </div>
                ) : item.id !== "admin" ? (
                  <>
                    <div style={{ fontSize: 16, width: 24, textAlign: "center" }}>{item.icon}</div>
                    
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <input 
                        type="text" 
                        value={item.label}
                        onChange={(e) => handleUpdate(item.id, "label", e.target.value)}
                        placeholder={item.label}
                        style={{ background: "transparent", border: "none", color: COLORS.text, fontSize: 14, fontWeight: 600, padding: 0, outline: "none" }}
                      />
                      <div style={{ fontSize: 11, color: COLORS.textMuted }}>ID: {item.id}</div>
                    </div>
                    
                    <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                      <input 
                        type="checkbox" 
                        checked={item.hidden !== true}
                        onChange={(e) => handleUpdate(item.id, "hidden", !e.target.checked)}
                        style={{ display: "none" }}
                      />
                      <div style={{ 
                        width: 44, height: 24, borderRadius: 12, 
                        background: item.hidden !== true ? COLORS.primary : COLORS.border,
                        position: "relative", transition: "all 0.2s"
                      }}>
                        <div style={{ 
                          width: 20, height: 20, borderRadius: "50%", background: "#fff",
                          position: "absolute", top: 2, left: item.hidden !== true ? 22 : 2,
                          transition: "all 0.2s"
                        }} />
                      </div>
                    </label>
                  </>
                ) : (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 16, opacity: 0.5 }}>
                    <div style={{ fontSize: 16, width: 24, textAlign: "center" }}>{item.icon}</div>
                    <div style={{ flex: 1, color: COLORS.text, fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: COLORS.secondary }}>(Always Visible)</div>
                  </div>
                )}

                {item.isDivider && (
                  <button onClick={() => handleDeleteDivider(item.id)} style={{ background: "transparent", border: "none", color: COLORS.danger, cursor: "pointer", padding: "4px 8px" }}>Del</button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
            <button onClick={handleAddDivider} style={{ background: "rgba(255,255,255,0.05)", color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              + Add Divider
            </button>
            <button onClick={handleReset} style={{ background: "transparent", color: COLORS.danger, border: "none", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>
              Reset to Defaults
            </button>
          </div>
        </div>
      ) : activeTab === "users" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:COLORS.text }}>User Access Management</div>
            <div style={{ fontSize:12, color:COLORS.textMuted }}>View all authenticated users and revoke their access if needed.</div>
          </div>
          
          {loadingUsers ? (
            <div style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>Loading users...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}`, color: COLORS.textMuted }}>
                    <th style={{ padding: "12px 8px", fontWeight: 600 }}>User ID</th>
                    <th style={{ padding: "12px 8px", fontWeight: 600 }}>Email</th>
                    <th style={{ padding: "12px 8px", fontWeight: 600 }}>Last Active</th>
                    <th style={{ padding: "12px 8px", fontWeight: 600 }}>Status</th>
                    <th style={{ padding: "12px 8px", fontWeight: 600, textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.length > 0 ? usersList.map((u) => (
                    <tr key={u.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.02)` }}>
                      <td style={{ padding: "12px 8px", color: COLORS.textMuted, fontFamily: "monospace" }}>{u.id.substring(0, 8)}...</td>
                      <td style={{ padding: "12px 8px", color: COLORS.text }}>{u.email || "-"}</td>
                      <td style={{ padding: "12px 8px", color: COLORS.textMuted }}>{u.lastUsed ? new Date(u.lastUsed.toMillis()).toLocaleString() : "Never"}</td>
                      <td style={{ padding: "12px 8px" }}>
                        <span style={{ padding: "4px 8px", borderRadius: 4, background: u.isBlocked ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)", color: u.isBlocked ? "#EF4444" : "#10B981" }}>
                          {u.isBlocked ? "Blocked" : "Active"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "right" }}>
                        <button 
                          onClick={() => handleToggleBlock(u.id, !!u.isBlocked)}
                          style={{ background: u.isBlocked ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", color: u.isBlocked ? "#10B981" : "#EF4444", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
                        >
                          {u.isBlocked ? "Unblock" : "Block"}
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: 30, color: COLORS.textMuted }}>No users found in database.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:COLORS.text }}>Master Data Management</div>
            <div style={{ fontSize:12, color:COLORS.textMuted }}>Manage your global data catalogs so auto-fill works flawlessly across the app.</div>
          </div>
          
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize:14, color:COLORS.secondary, margin: 0 }}>Categories & Products</h3>
                <button onClick={handleAddCategory} style={{ background: "rgba(108, 99, 255, 0.1)", color: COLORS.primary, border: `1px solid rgba(108, 99, 255, 0.2)`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>+ Add Category</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {categoryMaster.map((c, i) => (
                  <div key={i} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                      <div style={{ fontWeight:700 }}>{c.name}</div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => handleEditCategory(i)} style={{ background:"transparent", border:"none", color:COLORS.primary, cursor:"pointer", padding:0, fontSize:14 }} title="Edit Category">Edit</button>
                        <button onClick={() => handleDeleteCategory(i)} style={{ background:"transparent", border:"none", color:COLORS.danger, cursor:"pointer", padding:0, fontSize:14 }} title="Delete Category">Del</button>
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:COLORS.textMuted, display:"flex", flexWrap:"wrap", gap:4 }}>
                      {(c.products || []).map((p, j) => (
                        <span key={j} style={{ background:"rgba(255,255,255,0.1)", padding:"2px 6px", borderRadius:4 }}>{p}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 300 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize:14, color:COLORS.primary, margin: 0 }}>Vendors / Sellers</h3>
                <button onClick={handleAddVendor} style={{ background: "rgba(108, 99, 255, 0.1)", color: COLORS.primary, border: `1px solid rgba(108, 99, 255, 0.2)`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>+ Add Vendor</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {vendorMaster.map((v, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:12 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13 }}>{v.name}</div>
                      <div style={{ fontSize:11, color:COLORS.textMuted }}>{v.category}{v.platform ? ` • ${v.platform}` : ""}</div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => handleEditVendor(i)} style={{ background:"transparent", border:"none", color:COLORS.primary, cursor:"pointer", padding:0, fontSize:14 }} title="Edit Vendor">Edit</button>
                      <button onClick={() => handleDeleteVendor(i)} style={{ background:"transparent", border:"none", color:COLORS.danger, cursor:"pointer", padding:0, fontSize:14 }} title="Delete Vendor">Del</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginTop: 12, borderTop: `1px solid ${COLORS.border}`, paddingTop: 24 }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize:14, color:COLORS.secondary, margin: 0 }}>Companies & Brands</h3>
                <button onClick={handleAddCompany} style={{ background: "rgba(108, 99, 255, 0.1)", color: COLORS.primary, border: `1px solid rgba(108, 99, 255, 0.2)`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>+ Add Brand</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {companyMaster.map((c, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{c.name}</div>
                      <div style={{ fontSize:11, color:COLORS.textMuted, marginBottom: 6 }}>{c.category || "Uncategorized"}</div>
                      <div style={{ fontSize:11, color:COLORS.textMuted, display:"flex", flexWrap:"wrap", gap:4 }}>
                        {(c.products || []).map((p, j) => (
                          <span key={j} style={{ background:"rgba(255,255,255,0.1)", padding:"2px 6px", borderRadius:4 }}>{p}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => handleEditCompany(i)} style={{ background:"transparent", border:"none", color:COLORS.primary, cursor:"pointer", padding:0, fontSize:14 }}>Edit</button>
                      <button onClick={() => handleDeleteCompany(i)} style={{ background:"transparent", border:"none", color:COLORS.danger, cursor:"pointer", padding:0, fontSize:14 }}>Del</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 300 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize:14, color:COLORS.primary, margin: 0 }}>Platforms & Malls</h3>
                <button onClick={handleAddPlatform} style={{ background: "rgba(108, 99, 255, 0.1)", color: COLORS.primary, border: `1px solid rgba(108, 99, 255, 0.2)`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>+ Add Platform</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {platformMaster.map((p, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{p.name}</div>
                      <div style={{ fontSize:11, color:COLORS.textMuted, display:"flex", flexWrap:"wrap", gap:4, marginTop: 4 }}>
                        {(p.brands || []).map((b, j) => (
                          <span key={j} style={{ background:"rgba(255,255,255,0.1)", padding:"2px 6px", borderRadius:4 }}>{b}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => handleEditPlatform(i)} style={{ background:"transparent", border:"none", color:COLORS.primary, cursor:"pointer", padding:0, fontSize:14 }}>Edit</button>
                      <button onClick={() => handleDeletePlatform(i)} style={{ background:"transparent", border:"none", color:COLORS.danger, cursor:"pointer", padding:0, fontSize:14 }}>Del</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showVendorModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0d1526", border: `1px solid rgba(108,99,255,0.25)`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 400 }}>
            <h3 style={{ margin: "0 0 16px 0", color: COLORS.text }}>{editingVendorIdx !== null ? "Edit Vendor" : "Add Vendor"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>VENDOR NAME</label>
                <input autoFocus value={vendorForm.name} onChange={e => setVendorForm({...vendorForm, name: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>DEFAULT CATEGORY</label>
                <input list="category-list-admin" value={vendorForm.category} onChange={e => setVendorForm({...vendorForm, category: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} />
                <datalist id="category-list-admin">
                  {categoryMaster.map((c, i) => <option key={i} value={c.name} />)}
                </datalist>
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>PLATFORM / LOCATION</label>
                <input list="platform-list-admin" value={vendorForm.platform || ""} onChange={e => setVendorForm({...vendorForm, platform: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} />
                <datalist id="platform-list-admin">
                  {platformMaster.map((p, i) => <option key={i} value={p.name} />)}
                </datalist>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowVendorModal(false)} style={{ background: "transparent", color: COLORS.textMuted, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSaveVendor} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}>Save Vendor</button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0d1526", border: `1px solid rgba(108,99,255,0.25)`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 400 }}>
            <h3 style={{ margin: "0 0 16px 0", color: COLORS.text }}>{editingCategoryIdx !== null ? "Edit Category" : "Add Category"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>CATEGORY NAME</label>
                <input autoFocus value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>PRODUCTS (COMMA SEPARATED)</label>
                <input value={(categoryForm.products || []).join(", ")} onChange={e => setCategoryForm({...categoryForm, products: e.target.value.split(",").map(p => p.trim()).filter(p => p)})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} placeholder="e.g. Lunch, Dinner, Snacks" />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: "transparent", color: COLORS.textMuted, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSaveCategory} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}>Save Category</button>
            </div>
          </div>
        </div>
      )}

      {showCompanyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0d1526", border: `1px solid rgba(108,99,255,0.25)`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 400 }}>
            <h3 style={{ margin: "0 0 16px 0", color: COLORS.text }}>{editingCompanyIdx !== null ? "Edit Brand" : "Add Brand"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>COMPANY / BRAND NAME</label>
                <input autoFocus value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>DEFAULT CATEGORY</label>
                <input list="company-category-admin" value={companyForm.category || ""} onChange={e => setCompanyForm({...companyForm, category: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} />
                <datalist id="company-category-admin">
                  {categoryMaster.map((cat, idx) => <option key={idx} value={cat.name} />)}
                </datalist>
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>PRODUCTS (COMMA SEPARATED)</label>
                <input value={(companyForm.products || []).join(", ")} onChange={e => setCompanyForm({...companyForm, products: e.target.value.split(",").map(p => p.trim()).filter(p => p)})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} placeholder="e.g. TV, Headphones" />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowCompanyModal(false)} style={{ background: "transparent", color: COLORS.textMuted, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSaveCompany} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}>Save Brand</button>
            </div>
          </div>
        </div>
      )}

      {showPlatformModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0d1526", border: `1px solid rgba(108,99,255,0.25)`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 400 }}>
            <h3 style={{ margin: "0 0 16px 0", color: COLORS.text }}>{editingPlatformIdx !== null ? "Edit Platform" : "Add Platform"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>PLATFORM / MALL NAME</label>
                <input autoFocus value={platformForm.name} onChange={e => setPlatformForm({...platformForm, name: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>SELECT BRANDS</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", maxHeight: 150, overflowY: "auto" }}>
                  {companyMaster.map(c => {
                    const isSelected = (platformForm.brands || []).includes(c.name);
                    return (
                      <button key={c.name} onClick={() => {
                        const newBrands = isSelected
                          ? (platformForm.brands || []).filter(b => b !== c.name)
                          : [...(platformForm.brands || []), c.name];
                        setPlatformForm({...platformForm, brands: newBrands});
                      }} style={{
                        padding: "5px 11px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                        border: `1px solid ${isSelected ? COLORS.primary : COLORS.border}`,
                        background: isSelected ? `${COLORS.primary}22` : "transparent",
                        color: isSelected ? COLORS.primary : COLORS.textMuted, transition: "all 0.15s"
                      }}>{c.name}</button>
                    );
                  })}
                  {companyMaster.length === 0 && <div style={{ fontSize: 11, color: COLORS.textMuted }}>No brands added yet. Add some in Companies & Brands.</div>}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowPlatformModal(false)} style={{ background: "transparent", color: COLORS.textMuted, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSavePlatform} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}>Save Platform</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function InterWorkspaceViewLive({ workspaces, activeWorkspaceId }) {
  const [crossTransactions, setCrossTransactions] = useState([]);
  
  useEffect(() => {
     let all = [];
     for (let ws of workspaces) {
        try {
           const str = localStorage.getItem("fp_expenses_" + ws.id);
           if (str) {
              const exp = JSON.parse(str);
              // Find expenses that have paidForWorkspaceId or paidByWorkspaceId
              const inter = exp.filter(e => e.paidForWorkspaceId).map(e => ({
                 ...e,
                 payerName: ws.name,
                 payerId: ws.id,
                 payeeName: e.paidForWorkspaceName || "Another Workspace"
              }));
              all = [...all, ...inter];
           }
        } catch(e) {}
     }
     // Sort by date descending
     all.sort((a,b) => new Date(b.date) - new Date(a.date));
     setCrossTransactions(all);
  }, [workspaces, activeWorkspaceId]);

  return (
     <div style={{ flex: 1, padding: 32, display: "flex", flexDirection: "column", gap: 24, overflowY: "auto" }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.text, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 32 }}>🔀</span> Inter-Workspace Transactions
        </div>
        <div style={{ fontSize: 15, color: COLORS.textMuted, marginTop: -16 }}>
          Transactions paid by one workspace on behalf of another.
        </div>
        
        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 20, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${COLORS.border}` }}>
                 <th style={{ padding: "16px 20px", color: COLORS.textMuted, fontSize: 13, fontWeight: 600 }}>Date</th>
                 <th style={{ padding: "16px 20px", color: COLORS.textMuted, fontSize: 13, fontWeight: 600 }}>Expense / Store</th>
                 <th style={{ padding: "16px 20px", color: COLORS.textMuted, fontSize: 13, fontWeight: 600 }}>Amount</th>
                 <th style={{ padding: "16px 20px", color: COLORS.textMuted, fontSize: 13, fontWeight: 600 }}>Paid By</th>
                 <th style={{ padding: "16px 20px", color: COLORS.textMuted, fontSize: 13, fontWeight: 600 }}>Paid For</th>
              </tr>
            </thead>
            <tbody>
              {crossTransactions.length === 0 ? (
                 <tr>
                   <td colSpan={5} style={{ padding: 40, textAlign: "center", color: COLORS.textMuted, fontSize: 15 }}>No inter-workspace transactions found.</td>
                 </tr>
              ) : crossTransactions.map(t => (
                 <tr key={t.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                   <td style={{ padding: "16px 20px", color: COLORS.text, fontSize: 14 }}>{new Date(t.date).toLocaleDateString()}</td>
                   <td style={{ padding: "16px 20px", color: COLORS.text, fontSize: 14 }}>
                      <div style={{ fontWeight: 600 }}>{t.storeName || t.productName}</div>
                      <div style={{ fontSize: 12, color: COLORS.textMuted }}>{t.category}</div>
                   </td>
                   <td style={{ padding: "16px 20px", color: COLORS.danger, fontSize: 15, fontWeight: 700 }}>₹{parseFloat(t.amount).toLocaleString("en-IN")}</td>
                   <td style={{ padding: "16px 20px" }}>
                      <div style={{ background: "rgba(108,99,255,0.15)", color: COLORS.primary, padding: "4px 10px", borderRadius: 12, display: "inline-block", fontSize: 13, fontWeight: 600 }}>{t.payerName}</div>
                   </td>
                   <td style={{ padding: "16px 20px" }}>
                      <div style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", padding: "4px 10px", borderRadius: 12, display: "inline-block", fontSize: 13, fontWeight: 600 }}>{t.payeeName}</div>
                   </td>
                 </tr>
              ))}
            </tbody>
          </table>
        </div>
     </div>
  );
}

// ─── Friendly Loans View ────────────────────────────────────────────────────────
function FriendlyLoansLive({ friendlyLoans, setFriendlyLoans, banks, setBanks, expenses, setExpenses, incomes, setIncomes }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const [showTransactionModal, setShowTransactionModal] = useState(null); // { person, type: 'GIVEN' | 'RECEIVED' }
  const [txForm, setTxForm] = useState({ amount: "", date: new Date().toISOString().split("T")[0], bankId: "", note: "" });

  const [showPassbook, setShowPassbook] = useState(null);
  const [passbookFilter, setPassbookFilter] = useState("");

  const downloadCSV = () => {
    if (!showPassbook || !showPassbook.transactions) return;
    
    const headers = ["Date", "Description", "Mode", "Bank", "Given", "Received"];
    const sortedTransactions = [...showPassbook.transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
    const rows = sortedTransactions.map(tx => {
      const bank = banks?.find(b => b.id === tx.bankId);
      const mode = bank ? "Transfer" : "Cash";
      const bankName = bank ? bank.name : "";
      
      // format date from YYYY-MM-DD to DD-MM-YYYY
      const dParts = tx.date.split("-");
      const displayDate = dParts.length === 3 ? `${dParts[2]}-${dParts[1]}-${dParts[0]}` : tx.date;
      
      return [
        displayDate,
        `"${(tx.note || "").replace(/"/g, '""')}"`,
        mode,
        `"${bankName.replace(/"/g, '""')}"`,
        tx.type === "GIVEN" ? tx.amount : "",
        tx.type === "RECEIVED" ? tx.amount : ""
      ].join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Passbook_${showPassbook.name}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddPerson = () => {
    if (!newName.trim()) return;
    setFriendlyLoans(p => [...(p||[]), {
      id: "friend_" + Date.now(),
      name: newName.trim(),
      transactions: []
    }]);
    setNewName("");
    setShowAddModal(false);
  };

  const handleDeletePerson = () => {
    setFriendlyLoans(p => p.filter(x => x.id !== deleteConfirm.id));
    setDeleteConfirm(null);
  };

  const handleTransaction = () => {
    if (!txForm.amount || !txForm.bankId) return;
    const isGiven = showTransactionModal.type === "GIVEN";
    
    if (showTransactionModal.editingTx) {
      const isCash = txForm.bankId === "cash";
      if (isGiven) {
        setExpenses(p => (p||[]).map(e => e.id === showTransactionModal.editingTx.expenseId ? { ...e, amount: txForm.amount, date: txForm.date, bankId: isCash ? "" : txForm.bankId, paymentMode: isCash ? "Cash" : "Bank/Card", note: txForm.note } : e));
      } else {
        setIncomes(p => (p||[]).map(e => e.id === showTransactionModal.editingTx.incomeId ? { ...e, amount: txForm.amount, date: txForm.date, bankId: isCash ? "" : txForm.bankId, paymentMode: isCash ? "Cash" : "Bank Transfer", note: txForm.note } : e));
      }

      const updatedTx = { ...showTransactionModal.editingTx, amount: txForm.amount, date: txForm.date, bankId: txForm.bankId, note: txForm.note };

      setFriendlyLoans(p => p.map(person => {
        if (person.id === showTransactionModal.person.id) {
          return { ...person, transactions: person.transactions.map(t => t.id === updatedTx.id ? updatedTx : t) };
        }
        return person;
      }));

      setShowPassbook(prev => prev && prev.id === showTransactionModal.person.id ? { ...prev, transactions: prev.transactions.map(t => t.id === updatedTx.id ? updatedTx : t) } : prev);
      
    } else {
        let linkedId = null;
      const isCash = txForm.bankId === "cash";
      if (isGiven) {
        const expId = "exp_" + Date.now();
        linkedId = expId;
        setExpenses(p => [...(p||[]), {
          id: expId,
          date: txForm.date,
          amount: txForm.amount,
          category: "Friendly Loan",
          subCategory: "Given to " + showTransactionModal.person.name,
          storeName: "Given to " + showTransactionModal.person.name,
          paymentMode: isCash ? "Cash" : "Bank/Card",
          bankId: isCash ? "" : txForm.bankId,
          note: txForm.note || "Friendly Loan"
        }]);
      } else {
        const incId = "inc_" + Date.now();
        linkedId = incId;
        setIncomes(p => [...(p||[]), {
          id: incId,
          date: txForm.date,
          amount: txForm.amount,
          source: "Received from " + showTransactionModal.person.name,
          category: "Friendly Loan",
          bankId: isCash ? "" : txForm.bankId,
          paymentMode: isCash ? "Cash" : "Bank Transfer",
          note: txForm.note || "Friendly Loan"
        }]);
      }

      const newTx = {
        id: "tx_" + Date.now(),
        date: txForm.date,
        amount: txForm.amount,
        type: showTransactionModal.type,
        bankId: txForm.bankId,
        note: txForm.note,
        ...(isGiven ? { expenseId: linkedId } : { incomeId: linkedId })
      };

      setFriendlyLoans(p => p.map(person => {
        if (person.id === showTransactionModal.person.id) {
          return { ...person, transactions: [...(person.transactions||[]), newTx] };
        }
        return person;
      }));
      
      setShowPassbook(prev => prev && prev.id === showTransactionModal.person.id ? { ...prev, transactions: [...(prev.transactions||[]), newTx] } : prev);
    }

    setShowTransactionModal(null);
    setTxForm({ amount: "", date: new Date().toISOString().split("T")[0], bankId: "", note: "" });
  };

  const getNetBalance = (transactions) => {
    if (!transactions) return 0;
    return transactions.reduce((acc, t) => {
      const amt = parseFloat(t.amount) || 0;
      if (t.type === "GIVEN") return acc + amt;
      if (t.type === "RECEIVED") return acc - amt;
      return acc;
    }, 0);
  };

  return (
    <div style={{ paddingBottom: 60 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700, color:COLORS.text }}>Friendly Loans</div>
          <div style={{ fontSize:13, color:COLORS.textMuted }}>Manage money given or received from friends & family</div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          style={{ background:COLORS.primary, color:"#fff", border:"none", padding:"8px 16px", borderRadius:8, fontWeight:600, cursor:"pointer" }}
        >
          + Add Person
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:20 }}>
        {(friendlyLoans || []).map(person => {
          const netBalance = getNetBalance(person.transactions);
          const isOwedToYou = netBalance > 0;
          const isOweThem = netBalance < 0;
          const isSettled = netBalance === 0;

          return (
            <div key={person.id} style={{ background:COLORS.bgCard, borderRadius:16, padding:20, border:`1px solid rgba(255,255,255,0.05)` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontSize:16, fontWeight:600 }}>{person.name}</div>
                <button 
                  onClick={() => setDeleteConfirm(person)}
                  style={{ background:"none", border:"none", color:COLORS.danger, cursor:"pointer", opacity:0.7, fontSize: 18 }}
                  title="Delete Person"
                >×</button>
              </div>

              <div style={{ fontSize:12, color:COLORS.textMuted, marginBottom:4 }}>Net Balance</div>
              <div style={{ 
                fontSize:24, fontWeight:700, 
                color: isOwedToYou ? COLORS.success : (isOweThem ? COLORS.danger : COLORS.text) 
              }}>
                {isOwedToYou ? "+" : (isOweThem ? "-" : "")} ₹{Math.abs(netBalance).toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize:12, color:COLORS.textMuted, marginTop:4, minHeight:18 }}>
                {isOwedToYou && "They owe you"}
                {isOweThem && "You owe them"}
                {isSettled && "Settled up"}
              </div>

              <div style={{ display:"flex", gap:10, marginTop:24 }}>
                <button 
                  onClick={() => setShowTransactionModal({ person, type: "GIVEN" })}
                  style={{ flex:1, padding:"8px", background:`${COLORS.danger}20`, color:COLORS.danger, border:`1px solid ${COLORS.danger}50`, borderRadius:8, fontWeight:600, cursor:"pointer" }}
                >Give</button>
                <button 
                  onClick={() => setShowTransactionModal({ person, type: "RECEIVED" })}
                  style={{ flex:1, padding:"8px", background:`${COLORS.success}20`, color:COLORS.success, border:`1px solid ${COLORS.success}50`, borderRadius:8, fontWeight:600, cursor:"pointer" }}
                >Receive</button>
              </div>
              
              <button 
                onClick={() => setShowPassbook(person)}
                style={{ width:"100%", marginTop:10, padding:"8px", background:"transparent", border:`1px solid rgba(255,255,255,0.2)`, color:COLORS.text, borderRadius:8, fontSize: 13, cursor:"pointer" }}
              >View Passbook</button>
            </div>
          );
        })}
        
        {(!friendlyLoans || friendlyLoans.length === 0) && (
          <div style={{ gridColumn:"1 / -1", textAlign:"center", padding:60, color:COLORS.textMuted, background:COLORS.bgCard, borderRadius:16, border:`1px dashed rgba(255,255,255,0.1)` }}>
            <div style={{ fontSize:40, marginBottom:16, opacity:0.5 }}>🤝</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text }}>No ledgers created yet</div>
            <div style={{ fontSize:13, marginTop:8 }}>Click "+ Add Person" to start tracking loans.</div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:COLORS.bgCard, width:"90%", maxWidth: 400, borderRadius:20, padding:24, border:`1px solid ${COLORS.border}`}}>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>Add Person</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom: 24 }}>
              <label style={{ fontSize:12, color:COLORS.textMuted }}>Person's Name</label>
              <input 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                placeholder="e.g. Rahul" 
                style={{ background:"#0f172a", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 12px", borderRadius:8, width:"100%", boxSizing:"border-box" }}
              />
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:12 }}>
              <button onClick={() => setShowAddModal(false)} style={{ background:"transparent", color:COLORS.text, border:`1px solid rgba(255,255,255,0.2)`, padding:"8px 16px", borderRadius:8, cursor:"pointer" }}>Cancel</button>
              <button onClick={handleAddPerson} style={{ background:COLORS.primary, color:"#fff", border:"none", padding:"8px 16px", borderRadius:8, fontWeight:600, cursor:"pointer" }}>Add Person</button>
            </div>
          </div>
        </div>
      )}

      {showTransactionModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:COLORS.bg, width:"90%", maxWidth: 450, borderRadius:20, padding:24, border:`1px solid ${COLORS.border}`}}>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>
              {showTransactionModal.editingTx 
                ? (showTransactionModal.type === "GIVEN" ? `Edit Given to ${showTransactionModal.person.name}` : `Edit Received from ${showTransactionModal.person.name}`)
                : (showTransactionModal.type === "GIVEN" ? `Give Money to ${showTransactionModal.person.name}` : `Receive Money from ${showTransactionModal.person.name}`)
              }
            </div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 20 }}>
              {showTransactionModal.editingTx
                ? "This will update the existing transaction and its linked expense/income."
                : (showTransactionModal.type === "GIVEN" 
                  ? "This will add a 'Given' record and create an Expense to reduce your bank balance." 
                  : "This will add a 'Received' record and create an Income to increase your bank balance.")
              }
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom: 24 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ fontSize:12, color:COLORS.textMuted }}>Amount (₹)</label>
                <input 
                  type="number"
                  value={txForm.amount} 
                  onChange={e => setTxForm({...txForm, amount: e.target.value})} 
                  placeholder="0.00" 
                  style={{ background:"#0f172a", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 12px", borderRadius:8, width:"100%", boxSizing:"border-box" }}
                />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ fontSize:12, color:COLORS.textMuted }}>Date</label>
                <input 
                  type="date"
                  value={txForm.date} 
                  onChange={e => setTxForm({...txForm, date: e.target.value})} 
                  style={{ background:"#0f172a", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 12px", borderRadius:8, width:"100%", boxSizing:"border-box" }}
                />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ fontSize:12, color:COLORS.textMuted }}>Select Bank or Mode</label>
                <select 
                  value={txForm.bankId}
                  onChange={e => setTxForm({...txForm, bankId: e.target.value})}
                  style={{ background:"#0f172a", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 12px", borderRadius:8, width:"100%", boxSizing:"border-box" }}
                >
                  <option value="">-- Choose Account / Mode --</option>
                  <option value="cash">Cash</option>
                  {(banks || []).map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.type})</option>
                  ))}
                </select>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ fontSize:12, color:COLORS.textMuted }}>Note (Optional)</label>
                <input 
                  value={txForm.note} 
                  onChange={e => setTxForm({...txForm, note: e.target.value})} 
                  placeholder="e.g. Dinner split" 
                  style={{ background:"#0f172a", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 12px", borderRadius:8, width:"100%", boxSizing:"border-box" }}
                />
              </div>
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", gap:12 }}>
              <button onClick={() => setShowTransactionModal(null)} style={{ background:"transparent", color:COLORS.text, border:`1px solid rgba(255,255,255,0.2)`, padding:"8px 16px", borderRadius:8, cursor:"pointer" }}>Cancel</button>
              <button 
                onClick={handleTransaction} 
                disabled={!txForm.amount || !txForm.bankId}
                style={{ 
                  background: (!txForm.amount || !txForm.bankId) ? "rgba(255,255,255,0.08)" : (showTransactionModal.type === "GIVEN" ? `linear-gradient(135deg, ${COLORS.danger}, #ef4444)` : `linear-gradient(135deg, ${COLORS.success}, #059669)`), 
                  color: (!txForm.amount || !txForm.bankId) ? COLORS.textMuted : "#ffffff", 
                  border:"none", padding:"10px 20px", borderRadius:8, fontWeight:700, fontSize:14,
                  cursor: (!txForm.amount || !txForm.bankId) ? "not-allowed" : "pointer"
                }}
              >
                {showTransactionModal.type === "GIVEN" ? "Give Money" : "Receive Money"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPassbook && (
        <div style={{ position:"fixed", top:0, right:0, bottom:0, zIndex:100, display:"flex", justifyContent:"flex-end", pointerEvents:"none" }}>
          <div style={{ pointerEvents:"auto", background:"#0F172A", width:750, height:"100vh", display:"flex", flexDirection:"column", borderLeft:`1px solid rgba(255,255,255,0.08)`, boxShadow:"-5px 0 25px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: 24, borderBottom: `1px solid rgba(255,255,255,0.08)`, display: "flex", justifyContent: "space-between", alignItems: "center", background:"rgba(255,255,255,0.03)" }}>
              <div>
                <div style={{ fontSize:18, fontWeight:700, color:"#F1F5F9" }}>Passbook: {showPassbook.name}</div>
                <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
                  Net Balance: <span style={{ color: getNetBalance(showPassbook.transactions) > 0 ? COLORS.success : (getNetBalance(showPassbook.transactions) < 0 ? COLORS.danger : COLORS.text) }}>
                    {getNetBalance(showPassbook.transactions) > 0 ? "+" : (getNetBalance(showPassbook.transactions) < 0 ? "-" : "")} ₹{Math.abs(getNetBalance(showPassbook.transactions)).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <input 
                  type="text" 
                  placeholder="Filter passbook..." 
                  value={passbookFilter} 
                  onChange={(e) => setPassbookFilter(e.target.value)}
                  style={{ background: "rgba(0,0,0,0.2)", border: `1px solid rgba(255,255,255,0.1)`, color: COLORS.text, padding: "8px 12px", borderRadius: 8, fontSize: 13, width: 200, outline: "none" }}
                />
                <button onClick={downloadCSV} style={{ background: COLORS.primary, border: "none", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Download CSV
                </button>
                <button onClick={() => { setShowPassbook(null); setPassbookFilter(""); }} style={{ background:"transparent", border:"none", color:"#94A3B8", cursor:"pointer", fontSize:24 }}>×</button>
              </div>
            </div>
            
            <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
              {(!showPassbook.transactions || showPassbook.transactions.length === 0) ? (
                <div style={{ textAlign: "center", color: COLORS.textMuted, padding: 20 }}>No transactions yet.</div>
              ) : (
                <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 70px 120px 85px 85px 30px", gap: 12, padding: "12px 16px", background: "rgba(255,255,255,0.04)", borderBottom: `1px solid rgba(255,255,255,0.08)`, fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase" }}>
                    <div>Date</div>
                    <div>Desc</div>
                    <div>Mode</div>
                    <div>Bank</div>
                    <div style={{ textAlign: "right" }}>Given</div>
                    <div style={{ textAlign: "right" }}>Recv'd</div>
                    <div></div>
                  </div>
                  {[...showPassbook.transactions]
                    .filter(tx => {
                      if (!passbookFilter) return true;
                      const q = passbookFilter.toLowerCase();
                      const bank = banks?.find(b => b.id === tx.bankId);
                      const bankName = bank ? bank.name.toLowerCase() : "";
                      const note = (tx.note || "").toLowerCase();
                      const amountStr = tx.amount.toString();
                      return note.includes(q) || bankName.includes(q) || amountStr.includes(q) || tx.date.includes(q);
                    })
                    .sort((a,b) => new Date(b.date) - new Date(a.date))
                    .map((tx, i, arr) => {
                    const isLast = i === arr.length - 1;
                    const bank = banks?.find(b => b.id === tx.bankId);
                    const mode = bank ? "Transfer" : "Cash";
                    const bankName = bank ? bank.name : "-";
                    return (
                      <div key={tx.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr 70px 120px 85px 85px 30px", gap: 12, padding: "12px 16px", borderBottom: isLast ? "none" : `1px solid rgba(255,255,255,0.04)`, fontSize: 13, alignItems: "center", color: COLORS.text }}>
                        <div style={{ color: COLORS.textMuted, fontSize: 12 }}>{tx.date.substring(5)}</div>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={tx.note || "-"}>{tx.note || "-"}</div>
                        <div style={{ fontSize: 12 }}>{mode}</div>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: COLORS.secondary, fontSize: 12 }} title={bankName}>{bankName}</div>
                        <div style={{ textAlign: "right", color: COLORS.danger, fontWeight: 600 }}>{tx.type === "GIVEN" ? `₹${parseFloat(tx.amount).toLocaleString("en-IN")}` : "-"}</div>
                        <div style={{ textAlign: "right", color: COLORS.success, fontWeight: 600 }}>{tx.type === "RECEIVED" ? `₹${parseFloat(tx.amount).toLocaleString("en-IN")}` : "-"}</div>
                        <button 
                          onClick={() => {
                            setTxForm({ amount: tx.amount, date: tx.date, bankId: tx.bankId, note: tx.note || "" });
                            setShowTransactionModal({ person: showPassbook, type: tx.type, editingTx: tx });
                          }}
                          style={{ background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          title="Edit transaction"
                        >
                          ✎
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:COLORS.bgCard, width:"90%", maxWidth: 400, borderRadius:20, padding:24, border:`1px solid ${COLORS.border}`}}>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>Delete {deleteConfirm.name}?</div>
            <div style={{ fontSize:14, color:COLORS.textMuted, marginBottom:24, lineHeight: 1.5 }}>
              Are you sure you want to delete <b>{deleteConfirm.name}</b>? 
              <br/><br/>
              <i>Note: This will not automatically delete the linked expenses/incomes in your main ledger. You can delete those manually if needed.</i>
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:12 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ background:"transparent", color:COLORS.text, border:`1px solid rgba(255,255,255,0.2)`, padding:"8px 16px", borderRadius:8, cursor:"pointer" }}>Cancel</button>
              <button onClick={handleDeletePerson} style={{ background:COLORS.danger, color:"#fff", border:"none", padding:"8px 16px", borderRadius:8, fontWeight:600, cursor:"pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



export default function FinPilotAI({ user }) {

  const [workspaces, setWorkspaces] = useLocalStorage("fp_workspaces", [
    { id: "default", name: "Default Workspace" }
  ]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useLocalStorage("fp_active_workspace_id", "default");
  
  // Custom Navigation State (Global)
  const [customNav, setCustomNav] = useLocalStorage("fp_custom_nav", []);
  
  // Compute final navigation structure
  const computedNav = (() => {
    if (customNav.length === 0) return [...DEFAULT_NAV];

    const finalNav = [];
    
    customNav.forEach(customItem => {
      if (customItem.isDivider) {
        finalNav.push({ ...customItem });
      } else {
        const defaultItem = DEFAULT_NAV.find(d => d.id === customItem.id);
        if (defaultItem) {
          finalNav.push({ ...defaultItem, ...customItem });
        }
      }
    });

    DEFAULT_NAV.forEach(defaultItem => {
      if (!customNav.find(c => c.id === defaultItem.id)) {
        finalNav.push({ ...defaultItem });
      }
    });

    return finalNav;
  })();

  const [banks, setBanks] = useLocalStorage("fp_banks_" + activeWorkspaceId, []);
  const [active,     setActive]     = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [incomeToEdit, setIncomeToEdit] = useState(null);
  const [returnToTabAfterEdit, setReturnToTabAfterEdit] = useState(null);
  const [returnToPassbookCC, setReturnToPassbookCC] = useState(null);
  const [returnToPassbookBank, setReturnToPassbookBank] = useState(null);
  const [returnToPassbookInsurance, setReturnToPassbookInsurance] = useState(null);

  const [incomes,     setIncomes]     = useLocalStorage("fp_incomes_" + activeWorkspaceId,     SEED_INCOME);
  const [creditCards, setCreditCards] = useLocalStorage("fp_creditcards_" + activeWorkspaceId, SEED_CREDIT_CARDS);
  const [expenses,    setExpenses]    = useLocalStorage("fp_expenses_" + activeWorkspaceId,    SEED_EXPENSES);
  const [budgets,     setBudgets]     = useLocalStorage("fp_budgets_" + activeWorkspaceId,     BUDGET_SEED);
  const [investments, setInvestments] = useLocalStorage("fp_investments_" + activeWorkspaceId, INV_SEED);
  const [loans, setLoans] = useLocalStorage("fp_loans_" + activeWorkspaceId, LOANS_SEED);
  const [goals,       setGoals]       = useLocalStorage("fp_goals_" + activeWorkspaceId,       GOALS_SEED);
  const [subscriptions, setSubscriptions] = useLocalStorage("fp_subscriptions_" + activeWorkspaceId, SUBS_SEED);
  const [vendorMaster, setVendorMaster] = useLocalStorage("fp_vendor_master", [
    { name: "Amazon", category: "Shopping" },
    { name: "Big Bazaar", category: "Grocery" },
    { name: "Indian Oil", category: "Fuel" },
    { name: "Apollo Pharmacy", category: "Medical" },
    { name: "Uber", category: "Travel" }
  ]);
  const [categoryMaster, setCategoryMaster] = useLocalStorage("fp_category_master", [
    { name: "Food", products: ["Lunch", "Dinner", "Snacks", "Breakfast"] },
    { name: "Grocery", products: ["Vegetables", "Fruits", "Household", "Milk", "Meat"] },
    { name: "Fuel", products: ["Petrol", "Diesel", "EV Charging"] },
    { name: "Medical", products: ["Medicines", "Doctor Fee", "Lab Tests"] },
    { name: "Shopping", products: ["Clothing", "Electronics", "Accessories"] },
    { name: "Travel", products: ["Flight", "Train", "Cab/Auto", "Bus"] },
    { name: "Entertainment", products: ["Movies", "Events", "Games", "Streaming"] },
    { name: "Education", products: ["School Fee", "Books", "Courses", "Stationery"] },
    { name: "Utilities", products: ["Electricity", "Water", "Gas", "Internet", "Phone"] },
    { name: "Other", products: ["Miscellaneous"] }
  ]);

  const [companyMaster, setCompanyMaster] = useLocalStorage("fp_company_master", []);
  const [platformMaster, setPlatformMaster] = useLocalStorage("fp_platform_master", []);


  const [insurance, setInsurance] = useLocalStorage("fp_insurance_" + activeWorkspaceId, INSURANCE_SEED);
  const [deletedTransactions, setDeletedTransactions] = useLocalStorage("fp_deleted_" + activeWorkspaceId, []);
  const [friendlyLoans, setFriendlyLoans] = useLocalStorage("fp_friendlyloans_" + activeWorkspaceId, FRIENDLY_LOANS_SEED);

  // Firebase Sync Logic
  const [isFirebaseLoaded, setIsFirebaseLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // null | "saving" | "saved" | "error"
  const [syncError, setSyncError] = useState(""); // actual error message

  // Deep-sanitize data before sending to Firestore.
  // Firestore REJECTS documents with: undefined values, functions, circular refs.
  const sanitizeForFirestore = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === "function") return null;
    if (val instanceof Date) return val.toISOString();
    if (Array.isArray(val)) {
      return val
        .map(sanitizeForFirestore)
        .filter(v => v !== null || v === 0 || v === false || v === ""); // keep falsy non-null
    }
    if (typeof val === "object") {
      const clean = {};
      for (const [k, v] of Object.entries(val)) {
        const cleaned = sanitizeForFirestore(v);
        // Only skip truly undefined — keep null, 0, false, ""
        if (cleaned !== undefined) clean[k] = cleaned === undefined ? null : cleaned;
      }
      return clean;
    }
    return val;
  };

  // Helper: merge two arrays by id — Firebase items update matching local ones,
  // but LOCAL-ONLY items (not yet in Firebase) are preserved.
  const mergeById = (localArr, fbArr) => {
    if (!fbArr || fbArr.length === 0) return localArr || [];
    if (!localArr || localArr.length === 0) return fbArr;
    const fbMap = {};
    fbArr.forEach(item => { if (item.id) fbMap[item.id] = item; });
    // Start with all Firebase items
    const merged = [...fbArr];
    // Add any local items that are NOT in Firebase (newly created, not yet synced)
    (localArr || []).forEach(item => {
      if (item.id && !fbMap[item.id]) merged.push(item);
    });
    return merged;
  };

  useEffect(() => {
    async function loadData() {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const getLocal = (key, seed = []) => {
            try {
              const s = localStorage.getItem(key);
              return s ? JSON.parse(s) : seed;
            } catch { return seed; }
          };

          if (data.workspaces && data.workspacesData) {
            setWorkspaces(data.workspaces);
            // Explicitly persist workspace list to localStorage so it survives fresh sessions
            localStorage.setItem("fp_workspaces", JSON.stringify(data.workspaces));
            let activeId = data.activeWorkspaceId || "default";
            if (!localStorage.getItem("fp_active_workspace_id")) {
              const defaultWs = data.workspaces.find(w => w.isDefault);
              if (defaultWs) activeId = defaultWs.id;
            }
            setActiveWorkspaceId(activeId);
            localStorage.setItem("fp_active_workspace_id", JSON.stringify(activeId));

            // Merge and update localStorage for each workspace
            data.workspaces.forEach(ws => {
              const wsId = ws.id;
              const wsData = data.workspacesData[wsId] || {};

              localStorage.setItem("fp_banks_" + wsId, JSON.stringify(mergeById(getLocal("fp_banks_" + wsId, []), wsData.banks || [])));
              localStorage.setItem("fp_incomes_" + wsId, JSON.stringify(mergeById(getLocal("fp_incomes_" + wsId, SEED_INCOME), wsData.incomes || SEED_INCOME)));
              localStorage.setItem("fp_creditcards_" + wsId, JSON.stringify(mergeById(getLocal("fp_creditcards_" + wsId, SEED_CREDIT_CARDS), wsData.creditCards || SEED_CREDIT_CARDS)));
              localStorage.setItem("fp_expenses_" + wsId, JSON.stringify(mergeById(getLocal("fp_expenses_" + wsId, SEED_EXPENSES), wsData.expenses || SEED_EXPENSES)));
              localStorage.setItem("fp_budgets_" + wsId, JSON.stringify(mergeById(getLocal("fp_budgets_" + wsId, BUDGET_SEED), wsData.budgets || BUDGET_SEED)));
              localStorage.setItem("fp_investments_" + wsId, JSON.stringify(mergeById(getLocal("fp_investments_" + wsId, INV_SEED), wsData.investments || INV_SEED)));
              localStorage.setItem("fp_loans_" + wsId, JSON.stringify(mergeById(getLocal("fp_loans_" + wsId, LOANS_SEED), wsData.loans || LOANS_SEED)));
              localStorage.setItem("fp_goals_" + wsId, JSON.stringify(mergeById(getLocal("fp_goals_" + wsId, GOALS_SEED), wsData.goals || GOALS_SEED)));
              localStorage.setItem("fp_subscriptions_" + wsId, JSON.stringify(mergeById(getLocal("fp_subscriptions_" + wsId, SUBS_SEED), wsData.subscriptions || SUBS_SEED)));
              localStorage.setItem("fp_insurance_" + wsId, JSON.stringify(mergeById(getLocal("fp_insurance_" + wsId, INSURANCE_SEED), wsData.insurance || INSURANCE_SEED)));
              localStorage.setItem("fp_deleted_" + wsId, JSON.stringify(data.workspacesData[wsId].deletedTransactions || []));
              localStorage.setItem("fp_friendlyloans_" + wsId, JSON.stringify(mergeById(getLocal("fp_friendlyloans_" + wsId, FRIENDLY_LOANS_SEED), wsData.friendlyLoans || FRIENDLY_LOANS_SEED)));
            });

            // Set state variables to the active workspace values
            setBanks(getLocal("fp_banks_" + activeId, []));
            setIncomes(getLocal("fp_incomes_" + activeId, SEED_INCOME));
            setCreditCards(getLocal("fp_creditcards_" + activeId, SEED_CREDIT_CARDS));
            setExpenses(getLocal("fp_expenses_" + activeId, SEED_EXPENSES));
            setBudgets(getLocal("fp_budgets_" + activeId, BUDGET_SEED));
            setInvestments(getLocal("fp_investments_" + activeId, INV_SEED));
            setLoans(getLocal("fp_loans_" + activeId, LOANS_SEED));
            setGoals(getLocal("fp_goals_" + activeId, GOALS_SEED));
            setSubscriptions(getLocal("fp_subscriptions_" + activeId, SUBS_SEED));
            setInsurance(getLocal("fp_insurance_" + activeId, INSURANCE_SEED));
            setDeletedTransactions(getLocal("fp_deleted_" + activeId, []));
            setFriendlyLoans(getLocal("fp_friendlyloans_" + activeId, FRIENDLY_LOANS_SEED));

            console.log("Firebase Firestore data loaded and merged successfully!");
          } else {
            // MIGRATION: Migrate old single-workspace structure to "default" workspace
            const defaultWs = [{ id: "default", name: "Default Workspace" }];
            setWorkspaces(defaultWs);
            setActiveWorkspaceId("default");

            const mergedBanks = mergeById(getLocal("fp_banks", []), data.banks || []);
            const mergedIncomes = mergeById(getLocal("fp_incomes", SEED_INCOME), data.incomes || SEED_INCOME);
            const mergedCreditCards = mergeById(getLocal("fp_creditcards", SEED_CREDIT_CARDS), data.creditCards || SEED_CREDIT_CARDS);
            const mergedExpenses = mergeById(getLocal("fp_expenses", SEED_EXPENSES), data.expenses || SEED_EXPENSES);
            const mergedBudgets = mergeById(getLocal("fp_budgets", BUDGET_SEED), data.budgets || BUDGET_SEED);
            const mergedInvestments = mergeById(getLocal("fp_investments", INV_SEED), data.investments || INV_SEED);
            const mergedLoans = mergeById(getLocal("fp_loans", LOANS_SEED), data.loans || LOANS_SEED);
            const mergedGoals = mergeById(getLocal("fp_goals", GOALS_SEED), data.goals || GOALS_SEED);
            const mergedSubscriptions = mergeById(getLocal("fp_subscriptions", SUBS_SEED), data.subscriptions || SUBS_SEED);
            const mergedInsurance = mergeById(getLocal("fp_insurance", INSURANCE_SEED), data.insurance || INSURANCE_SEED);
            const mergedDeleted = data.deletedTransactions || [];
            const mergedFriendlyLoans = mergeById(getLocal("fp_friendlyloans", FRIENDLY_LOANS_SEED), data.friendlyLoans || FRIENDLY_LOANS_SEED);

            localStorage.setItem("fp_banks_default", JSON.stringify(mergedBanks));
            localStorage.setItem("fp_incomes_default", JSON.stringify(mergedIncomes));
            localStorage.setItem("fp_creditcards_default", JSON.stringify(mergedCreditCards));
            localStorage.setItem("fp_expenses_default", JSON.stringify(mergedExpenses));
            localStorage.setItem("fp_budgets_default", JSON.stringify(mergedBudgets));
            localStorage.setItem("fp_investments_default", JSON.stringify(mergedInvestments));
            localStorage.setItem("fp_loans_default", JSON.stringify(mergedLoans));
            localStorage.setItem("fp_goals_default", JSON.stringify(mergedGoals));
            localStorage.setItem("fp_subscriptions_default", JSON.stringify(mergedSubscriptions));
            localStorage.setItem("fp_insurance_default", JSON.stringify(mergedInsurance));
            localStorage.setItem("fp_deleted_default", JSON.stringify(mergedDeleted));
            localStorage.setItem("fp_friendlyloans_default", JSON.stringify(mergedFriendlyLoans));

            setBanks(mergedBanks);
            setIncomes(mergedIncomes);
            setCreditCards(mergedCreditCards);
            setExpenses(mergedExpenses);
            setBudgets(mergedBudgets);
            setInvestments(mergedInvestments);
            setLoans(mergedLoans);
            setGoals(mergedGoals);
            setSubscriptions(mergedSubscriptions);
            setInsurance(mergedInsurance);
            setDeletedTransactions(mergedDeleted);
            setFriendlyLoans(mergedFriendlyLoans);

            console.log("Old Firestore single-workspace data migrated to Default Workspace!");
          }
        } else {
          // Document doesn't exist yet — initialize with Default Workspace using local data
          const defaultWs = [{ id: "default", name: "Default Workspace" }];
          setWorkspaces(defaultWs);
          setActiveWorkspaceId("default");

          const getLocal = (key, seed = []) => {
            try {
              const s = localStorage.getItem(key);
              return s ? JSON.parse(s) : seed;
            } catch { return seed; }
          };

          // Try to recover any pre-existing local-only single-workspace data
          const localBanks = getLocal("fp_banks", banks);
          const localIncomes = getLocal("fp_incomes", incomes);
          const localCreditCards = getLocal("fp_creditcards", creditCards);
          const localExpenses = getLocal("fp_expenses", expenses);
          const localBudgets = getLocal("fp_budgets", budgets);
          const localInvestments = getLocal("fp_investments", investments);
          const localLoans = getLocal("fp_loans", loans);
          const localGoals = getLocal("fp_goals", goals);
          const localSubscriptions = getLocal("fp_subscriptions", subscriptions);
          const localInsurance = getLocal("fp_insurance", insurance);
          const localDeleted = getLocal("fp_deleted", deletedTransactions);
          const localFriendlyLoans = getLocal("fp_friendlyloans", friendlyLoans);

          localStorage.setItem("fp_banks_default", JSON.stringify(localBanks));
          localStorage.setItem("fp_incomes_default", JSON.stringify(localIncomes));
          localStorage.setItem("fp_creditcards_default", JSON.stringify(localCreditCards));
          localStorage.setItem("fp_expenses_default", JSON.stringify(localExpenses));
          localStorage.setItem("fp_budgets_default", JSON.stringify(localBudgets));
          localStorage.setItem("fp_investments_default", JSON.stringify(localInvestments));
          localStorage.setItem("fp_loans_default", JSON.stringify(localLoans));
          localStorage.setItem("fp_goals_default", JSON.stringify(localGoals));
          localStorage.setItem("fp_subscriptions_default", JSON.stringify(localSubscriptions));
          localStorage.setItem("fp_insurance_default", JSON.stringify(localInsurance));
          localStorage.setItem("fp_deleted_default", JSON.stringify(localDeleted));
          localStorage.setItem("fp_friendlyloans_default", JSON.stringify(localFriendlyLoans));

          setBanks(localBanks);
          setIncomes(localIncomes);
          setCreditCards(localCreditCards);
          setExpenses(localExpenses);
          setBudgets(localBudgets);
          setInvestments(localInvestments);
          setLoans(localLoans);
          setGoals(localGoals);
          setSubscriptions(localSubscriptions);
          setInsurance(localInsurance);
          setDeletedTransactions(localDeleted);
          setFriendlyLoans(localFriendlyLoans);

          const payload = sanitizeForFirestore({
            workspaces: defaultWs,
            activeWorkspaceId: "default",
            workspacesData: {
              default: {
                banks: localBanks,
                incomes: localIncomes,
                creditCards: localCreditCards,
                expenses: localExpenses,
                budgets: localBudgets,
                investments: localInvestments,
                loans: localLoans,
                goals: localGoals,
                subscriptions: localSubscriptions,
                insurance: localInsurance,
                deletedTransactions: localDeleted
              }
            }
          });
          await setDoc(docRef, payload);
          console.log("Firebase Firestore initialized with Default Workspace!");
        }
      } catch (err) {
        console.error("Error loading data from Firebase Firestore:", err);
      } finally {
        setIsFirebaseLoaded(true);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!isFirebaseLoaded) return;
    async function saveData() {
      setSyncStatus("saving");
      setSyncError("");
      try {
        const docRef = doc(db, "users", user.uid);
        const getLocal = (key, seed = []) => {
          try {
            const s = localStorage.getItem(key);
            return s ? JSON.parse(s) : seed;
          } catch { return seed; }
        };

        // Construct workspacesData payload reading all workspaces from localStorage
        const workspacesData = {};
        workspaces.forEach(ws => {
          workspacesData[ws.id] = {
            banks: getLocal("fp_banks_" + ws.id, []),
            incomes: getLocal("fp_incomes_" + ws.id, SEED_INCOME),
            creditCards: getLocal("fp_creditcards_" + ws.id, SEED_CREDIT_CARDS),
            expenses: getLocal("fp_expenses_" + ws.id, SEED_EXPENSES),
            budgets: getLocal("fp_budgets_" + ws.id, BUDGET_SEED),
            investments: getLocal("fp_investments_" + ws.id, INV_SEED),
            loans: getLocal("fp_loans_" + ws.id, LOANS_SEED),
            goals: getLocal("fp_goals_" + ws.id, GOALS_SEED),
            subscriptions: getLocal("fp_subscriptions_" + ws.id, SUBS_SEED),
            insurance: getLocal("fp_insurance_" + ws.id, INSURANCE_SEED),
            deletedTransactions: getLocal("fp_deleted_" + ws.id, []),
            friendlyLoans: getLocal("fp_friendlyloans_" + ws.id, FRIENDLY_LOANS_SEED)
          };
        });

        const payload = sanitizeForFirestore({
          workspaces,
          activeWorkspaceId,
          workspacesData
        });

        const savePromise = setDoc(docRef, payload);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timed out — check network & Firestore rules")), 12000)
        );
        await Promise.race([savePromise, timeoutPromise]);
        setSyncStatus("saved");
        console.log("Firebase Firestore synced successfully!");
        setTimeout(() => setSyncStatus(null), 3000);
      } catch (err) {
        setSyncStatus("error");
        setSyncError(err.message || "Unknown error");
        console.error("Firebase sync failed:", err.message, err);
      }
    }
    const timer = setTimeout(saveData, 1000);
    return () => clearTimeout(timer);
  }, [
    isFirebaseLoaded,
    banks,
    incomes,
    creditCards,
    expenses,
    budgets,
    investments,
    loans,
    goals,
    subscriptions,
    insurance,
    deletedTransactions,
    workspaces,
    activeWorkspaceId,
    friendlyLoans
  ]);

  // ── Global date filter (default = current month) ──
  const now = new Date();
  const [filter, setFilter] = useState({ mode:"month", month:now.getMonth()+1, year:now.getFullYear() });

  const NO_FILTER_VIEWS = ["goals","emi","subscriptions","score","retirement","freedom","ai"];

  // Compute live financial score
  const allInc = incomes.reduce((s,i)=>s+parseFloat(i.amount||0),0);
  const allExp = expenses.reduce((s,e)=>s+parseFloat(e.amount||0),0);
  const avgMonthInc = allInc / Math.max(1, new Set(incomes.map(i=>i.date.slice(0,7))).size);
  const avgMonthExp = allExp / Math.max(1, new Set(expenses.map(e=>e.date.slice(0,7))).size);
  const liveScore = Math.min(100, Math.round(((avgMonthInc-avgMonthExp)/Math.max(1,avgMonthInc))*100*1.8 + 40));

  const renderContent = () => {
    switch (active) {
      case "dashboard":    return <DashboardLive incomes={incomes} expenses={expenses} filter={filter} creditCards={creditCards} investments={investments} loans={loans} goals={goals} banks={banks} />;
      case "income":       return <IncomeViewLive banks={banks} creditCards={creditCards} incomes={incomes} setIncomes={setIncomes} initialEditTx={incomeToEdit} clearInitialEditTx={() => setIncomeToEdit(null)} onCloseEditModal={() => { if (returnToTabAfterEdit) { setActive(returnToTabAfterEdit); setReturnToTabAfterEdit(null); } }} filter={filter} investments={investments} setInvestments={setInvestments} insurance={insurance} setInsurance={setInsurance} setDeletedTransactions={setDeletedTransactions} workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />;
      case "expense":      return <ExpenseViewLive banks={banks} expenses={expenses} setExpenses={setExpenses} initialEditTx={expenseToEdit} clearInitialEditTx={() => setExpenseToEdit(null)} onCloseEditModal={() => { if (returnToTabAfterEdit) { setActive(returnToTabAfterEdit); setReturnToTabAfterEdit(null); } }} filter={filter} subscriptions={subscriptions} setSubscriptions={setSubscriptions} insurance={insurance} setInsurance={setInsurance} investments={investments} setInvestments={setInvestments} loans={loans} setLoans={setLoans} creditCards={creditCards} setCreditCards={setCreditCards} setDeletedTransactions={setDeletedTransactions} vendorMaster={vendorMaster} setVendorMaster={setVendorMaster} categoryMaster={categoryMaster} setCategoryMaster={setCategoryMaster} companyMaster={companyMaster} setCompanyMaster={setCompanyMaster} platformMaster={platformMaster} setPlatformMaster={setPlatformMaster} uid={user?.uid} workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />;

      case "budget":       return <BudgetErrorBoundary><BudgetViewLive expenses={expenses} budgets={budgets} setBudgets={setBudgets} filter={filter} incomes={incomes} investments={investments} insurance={insurance} loans={loans} /></BudgetErrorBoundary>;
      case "friendlyloans":return <FriendlyLoansLive friendlyLoans={friendlyLoans} setFriendlyLoans={setFriendlyLoans} banks={banks} setBanks={setBanks} expenses={expenses} setExpenses={setExpenses} incomes={incomes} setIncomes={setIncomes} />;
      case "investments":  return <InvestmentsViewLive investments={investments} setInvestments={setInvestments} goals={goals} banks={banks} creditCards={creditCards} expenses={expenses} incomes={incomes} />;
      case "goals":        return <GoalsViewLive goals={goals} setGoals={setGoals} investments={investments} loans={loans} insurance={insurance} />;
      case "emi":          return <EMIViewLive loans={loans} setLoans={setLoans} goals={goals} banks={banks} creditCards={creditCards} />;
      case "creditcards":  return <CreditCardsViewLive creditCards={creditCards} setCreditCards={setCreditCards} expenses={expenses} initialPassbook={returnToPassbookCC} clearInitialPassbook={() => setReturnToPassbookCC(null)} onEditExpense={(tx, cc) => { setExpenseToEdit(tx); setReturnToTabAfterEdit("creditcards"); setReturnToPassbookCC(cc); setActive("expense"); }} />;
      case "subscriptions":return <SubscriptionsView subscriptions={subscriptions} setSubscriptions={setSubscriptions} categoryMaster={[]} banks={banks} creditCards={creditCards} expenses={expenses} />;
      case "insurance":    return <InsuranceView insurance={insurance} setInsurance={setInsurance} banks={banks} creditCards={creditCards} expenses={expenses} incomes={incomes} goals={goals} initialEditItem={returnToPassbookInsurance} clearInitialEditItem={() => setReturnToPassbookInsurance(null)} onEditExpense={(tx, ins) => { setExpenseToEdit(tx); setReturnToTabAfterEdit("insurance"); setReturnToPassbookInsurance(ins); setActive("expense"); }} onEditIncome={(tx, ins) => { setIncomeToEdit(tx); setReturnToTabAfterEdit("insurance"); setReturnToPassbookInsurance(ins); setActive("income"); }} />;
      case "banks":        return <BanksViewLive banks={banks} setBanks={setBanks} expenses={expenses} setExpenses={setExpenses} incomes={incomes} setIncomes={setIncomes} workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} initialPassbook={returnToPassbookBank} clearInitialPassbook={() => setReturnToPassbookBank(null)} onEditExpense={(tx, bankId) => { setExpenseToEdit(tx); setReturnToTabAfterEdit("banks"); setReturnToPassbookBank(bankId); setActive("expense"); }} onEditIncome={(tx, bankId) => { setIncomeToEdit(tx); setReturnToTabAfterEdit("banks"); setReturnToPassbookBank(bankId); setActive("income"); }} />;
      case "interworkspace":return <InterWorkspaceViewLive workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />;
      case "score":        return <HealthScoreView />;
      case "retirement":   return <RetirementView />;
      case "freedom":      return <FreedomCalcView />;
      case "reports":      return <ReportsViewLive incomes={incomes} expenses={expenses} filter={filter} />;
      case "recyclebin":   return <RecycleBinView deletedTransactions={deletedTransactions} setDeletedTransactions={setDeletedTransactions} expenses={expenses} setExpenses={setExpenses} incomes={incomes} setIncomes={setIncomes} subscriptions={subscriptions} setSubscriptions={setSubscriptions} loans={loans} setLoans={setLoans} insurance={insurance} setInsurance={setInsurance} investments={investments} setInvestments={setInvestments} creditCards={creditCards} setCreditCards={setCreditCards} />;
      case "admin":        return <AdminSettingsViewLive computedNav={computedNav} customNav={customNav} setCustomNav={setCustomNav} vendorMaster={vendorMaster} setVendorMaster={setVendorMaster} categoryMaster={categoryMaster} setCategoryMaster={setCategoryMaster} companyMaster={companyMaster} setCompanyMaster={setCompanyMaster} platformMaster={platformMaster} setPlatformMaster={setPlatformMaster} />;

      case "ai": return (
        <div style={{ background:COLORS.bgCard, borderRadius:20, padding:"24px", border:`1px solid rgba(108,99,255,0.25)`, maxWidth:700, margin:"0 auto" }}>
          <div style={{ fontSize:18, fontWeight:700, color:COLORS.text, marginBottom:4 }}>✦ AI Financial Advisor</div>
          <div style={{ fontSize:12, color:COLORS.textMuted, marginBottom:20 }}>Ask anything about your finances — powered by Claude AI</div>
          <AIChatPanel />
        </div>
      );
      default: return (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:300, gap:16 }}>
          <div style={{ fontSize:48, opacity:0.3 }}>{computedNav.find(n=>n.id===active)?.icon}</div>
          <div style={{ fontSize:18, fontWeight:600, color:COLORS.text }}>{computedNav.find(n=>n.id===active)?.label}</div>
          <div style={{ fontSize:13, color:COLORS.textMuted }}>Coming in next release</div>
        </div>
      );
    }
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:COLORS.bg, fontFamily:"'Inter',-apple-system,sans-serif", color:COLORS.text }}>
      <style>{`
        * { box-sizing: border-box; }
        input, textarea, select { caret-color:#6C63FF; -webkit-tap-highlight-color:transparent; -webkit-touch-callout:none; }
        .excel-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          color: #f1f5f9;
        }
        .excel-table th {
          background: rgba(16, 185, 129, 0.08);
          border-bottom: 2px solid rgba(16, 185, 129, 0.3);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          padding: 8px 10px;
          font-weight: 700;
          color: #f1f5f9;
          font-size: 11px;
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .excel-table th:last-child {
          border-right: none;
        }
        .excel-table td {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          padding: 6px 10px;
          vertical-align: middle;
          font-size: 11px;
        }
        .excel-table td:last-child {
          border-right: none;
        }
        .excel-table tr:hover {
          background-color: rgba(255, 255, 255, 0.04) !important;
        }
        .excel-table tfoot tr {
          background: rgba(255, 255, 255, 0.02);
          border-top: 2px solid rgba(255, 255, 255, 0.15);
          border-bottom: 3px double rgba(255, 255, 255, 0.2);
          font-weight: 700;
        }
        .excel-table tfoot td {
          border-bottom: none;
        }
        input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus,textarea:-webkit-autofill,select:-webkit-autofill {
          -webkit-box-shadow:0 0 0 1000px #1a2236 inset!important; box-shadow:0 0 0 1000px #1a2236 inset!important;
          -webkit-text-fill-color:#F1F5F9!important; caret-color:#6C63FF!important; border-radius:9px!important;
        }
        select option {
          background-color: #0d1526;
          color: #f1f5f9;
        }
        ::selection{background:rgba(108,99,255,0.35);color:#fff;} ::-moz-selection{background:rgba(108,99,255,0.35);color:#fff;}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;opacity:0;}
        input[type=number]{-moz-appearance:textfield;} input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.6);cursor:pointer;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px;}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div style={{ position:"fixed", inset:0, pointerEvents:"none", overflow:"hidden", zIndex:0 }}>
        <div style={{ position:"absolute", top:"-10%", right:"20%", width:400, height:400, borderRadius:"50%", background:`radial-gradient(circle,${COLORS.primary}15 0%,transparent 70%)` }}/>
        <div style={{ position:"absolute", bottom:"10%", left:"30%", width:300, height:300, borderRadius:"50%", background:`radial-gradient(circle,${COLORS.secondary}10 0%,transparent 70%)` }}/>
      </div>

      <div style={{ position:"relative", zIndex:1, display:"flex", width:"100%" }}>
        <Sidebar active={active} setActive={setActive} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} setActiveWorkspaceId={setActiveWorkspaceId} setWorkspaces={setWorkspaces} computedNav={computedNav} />
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
          <div style={{ padding:"11px 14px", borderBottom:`1px solid ${COLORS.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", backdropFilter:"blur(12px)", position:"sticky", top:0, zIndex:5, background:"rgba(15,23,42,0.92)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <button onClick={()=>setMobileOpen(true)} style={{ background:"rgba(255,255,255,0.07)", border:"none", borderRadius:9, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
                <span style={{ fontSize:17, color:COLORS.textMuted }}>≡</span>
              </button>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:COLORS.text }}>{computedNav.find(n=>n.id===active)?.label}</div>
                <div style={{ fontSize:10, color:COLORS.textMuted, display:"flex", alignItems:"center", gap:5 }}>
                  {filterLabel(filter)} · {user?.email || user?.phoneNumber || "User"}
                  <span style={{ background:`${COLORS.secondary}22`, color:COLORS.secondary, fontSize:9, padding:"1px 6px", borderRadius:10, border:`1px solid ${COLORS.secondary}33` }}>● LIVE</span>
                  {isFirebaseLoaded ? (
                    syncStatus === "saving" ? (
                      <span style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontSize: 9, padding: "1px 6px", borderRadius: 10, border: "1px solid rgba(245,158,11,0.3)", animation: "bounce 1s infinite", display:"inline-block" }}>⟳ SAVING...</span>
                    ) : syncStatus === "saved" ? (
                      <span style={{ background: "rgba(16,185,129,0.2)", color: "#10b981", fontSize: 9, padding: "1px 6px", borderRadius: 10, border: "1px solid rgba(16,185,129,0.4)", fontWeight:700 }}>✓ SAVED TO CLOUD</span>
                    ) : syncStatus === "error" ? (
                      <span title={syncError} style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 9, padding: "1px 6px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", cursor:"help" }}>✗ SYNC ERROR {syncError ? `(${syncError.substring(0,30)})` : ""}</span>
                    ) : (
                      <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: 9, padding: "1px 6px", borderRadius: 10, border: "1px solid rgba(16, 185, 129, 0.3)" }}>● CLOUD SYNCED</span>
                    )
                  ) : (
                    <span style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", fontSize: 9, padding: "1px 6px", borderRadius: 10, border: "1px solid rgba(245, 158, 11, 0.3)", display: "inline-block", animation: "bounce 1s infinite" }}>● CONNECTING...</span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ fontSize:11, color:COLORS.textMuted, background:"rgba(255,255,255,0.05)", padding:"5px 10px", borderRadius:20, border:`1px solid ${COLORS.border}`, whiteSpace:"nowrap" }}>
                Score: <span style={{ color:COLORS.secondary, fontWeight:700 }}>{Math.max(0,Math.min(100,liveScore))}</span>/100
              </div>
              <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg,${COLORS.primary},#8B5CF6)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>
                {user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <button onClick={() => { localStorage.clear(); signOut(auth); }} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", padding:"4px", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"50%" }} title="Sign Out">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
            </div>
          </div>

          <div style={{ flex:1, padding:"14px 13px", overflowY:"auto", animation:"fadeUp 0.3s ease" }}>
            {!NO_FILTER_VIEWS.includes(active) && <FilterBar filter={filter} setFilter={setFilter} />}
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

