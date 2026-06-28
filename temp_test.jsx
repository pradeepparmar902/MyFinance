const React = require('react');
const { useState, useEffect } = React;
const COLORS = { text: '#fff' };
const getNextTrxNo = () => '123';


const COLORS = {
  primary: "#6C63FF",
  secondary: "#00C896",
  accent: "#FFB547",
  danger: "#FF5B5B",
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
const NAV = [
  { id: "dashboard", icon: "⬡", label: "Dashboard" },
  { id: "income", icon: "↑", label: "Income" },
  { id: "expense", icon: "↓", label: "Expenses" },
  { id: "budget", icon: "◈", label: "Budget" },
  { id: "goals", icon: "◎", label: "Goals" },
  { id: "emi", icon: "⊕", label: "EMI & Loan" },
  { id: "investments", icon: "🏦", label: "Banking & Inv." },
  { id: "creditcards", icon: "💳", label: "Credit Cards" },

  { id: "subscriptions", icon: "⊞", label: "Subscriptions" },
  { id: "insurance", icon: "🛡️", label: "Insurance" },
  { id: "banks", icon: "🏦", label: "Bank Accounts" },
  { id: "score", icon: "★", label: "Health Score" },
  { id: "ai", icon: "✦", label: "AI Advisor" },
  { id: "retirement", icon: "⏱", label: "Retire Planner" },
  { id: "freedom", icon: "🏁", label: "FI Calculator" },
  { id: "reports", icon: "📊", label: "Reports" },
];

function Sidebar({ active, setActive, mobileOpen, setMobileOpen }) {
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

      {/* Nav items */}
      <div style={{ flex: 1, padding: "4px 10px", overflowY: "auto" }}>
        {NAV.map(item => (
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
function WarrantyModal({ onClose, onSave, productName }) {
  const now = new Date();
  const [wData, setWData] = useState({
    period: "", unit: "months", type: "Warranty",
    purchaseDay: String(now.getDate()), purchaseMonth: String(now.getMonth() + 1), purchaseYear: String(now.getFullYear()),
    expiryDay: "", expiryMonth: "", expiryYear: "",
    cardFile: null, cardPreview: null, notes: "", reminder: true
  });

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
    const reader = new FileReader();
    reader.onload = ev => setWData(p => ({ ...p, cardFile: file, cardPreview: ev.target.result }));
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
              <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
                <img src={wData.cardPreview} alt="warranty" style={{ width: "100%", maxHeight: 150, objectFit: "cover", display: "block" }} />
                <button onClick={() => setWData(p => ({ ...p, cardFile: null, cardPreview: null }))} style={{
                  position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.7)", border: "none",
                  borderRadius: "50%", width: 28, height: 28, color: "#fff", cursor: "pointer", fontSize: 14,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>✕</button>
                <div style={{ padding: "6px 10px", fontSize: 11, color: COLORS.textMuted, background: "rgba(0,0,0,0.5)" }}>
                  ✓ {wData.cardFile?.name}
                </div>
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

          {/* Save */}
          <button onClick={() => {
            onSave({ ...wData, expiryDate: toISO(wData.expiryDay, wData.expiryMonth, wData.expiryYear), purchaseDate: toISO(wData.purchaseDay, wData.purchaseMonth, wData.purchaseYear) });
            onClose();
          }} style={{
            width: "100%", padding: "13px", borderRadius: 13, border: "none",
            background: `linear-gradient(135deg, ${COLORS.primary}, #8B5CF6)`,
            color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 2,
            boxShadow: `0 4px 16px rgba(108,99,255,0.35)`
          }}>
            {expiryFormatted ? `Save · Expires ${expiryFormatted}` : "Save Warranty Details"}
          </button>

        </div>
      </div>
    </div>
  );
}

// ─── Add Expense Modal ─────────────────────────────────────────────────────────
function AddExpenseModal({ onClose, onSave, initialData, creditCards, banks }) {
  const [step, setStep] = useState(1); // 1=details, 2=warranty
  const [showWarranty, setShowWarranty] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [form, setForm] = useState(() => {
    if (initialData) {
      return {
        ...initialData,
        storeName: initialData.storeName || initialData.vendor || initialData.title || "",
        category: initialData.category || initialData.cat || "Shopping",
        productName: initialData.productName || "",
        description: initialData.description || initialData.notes || "",
        paymentMode: initialData.paymentMode || "Net Banking",
        bankId: initialData.bankId || ""
      };
    }
    return {
      storeName: "", date: new Date().toISOString().split("T")[0], category: "Shopping",
      amount: "", productName: "", description: "", paymentMode: "UPI", hasWarranty: false, warrantyData: null,
      bankId: ""
    };
  });

  const iStyle = { background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box", WebkitAppearance: "none", appearance: "none", caretColor: "#6C63FF" };
  const cats = ["Food", "Grocery", "Fuel", "Medical", "Shopping", "Travel", "Entertainment", "Education", "Utilities", "Electronics", "Other"];
  const payModes = ["UPI", "Cash", "Credit Card", "Debit Card", "Net Banking", "EMI"];

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setReceiptPreview(ev.target.result); setReceiptFile(file); };
    reader.readAsDataURL(file);
  };

    const handleSave = () => {
    if (!form.storeName || !form.amount) return;
    const finalCardId = form.paymentMode === 'Credit Card' && !form.creditCardId && creditCards && creditCards.length > 0 ? creditCards[0].id : form.creditCardId;
    onSave({ ...form, amount: parseFloat(form.amount) || 0, creditCardId: finalCardId, receipt: receiptFile });
    onClose();
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div style={{ background: "#0d1526", border: `1px solid rgba(108,99,255,0.25)`, borderRadius: "20px 20px 0 0", padding: "20px 18px 28px", width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>➕ Add Expense</div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 8, width: 30, height: 30, color: COLORS.textMuted, cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Receipt Upload */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>UPLOAD BILL / RECEIPT (optional)</label>
              {receiptPreview ? (
                <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
                  <img src={receiptPreview} alt="receipt" style={{ width: "100%", maxHeight: 130, objectFit: "cover", display: "block" }} />
                  <button onClick={() => { setReceiptPreview(null); setReceiptFile(null); }} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 26, height: 26, color: "#fff", cursor: "pointer", fontSize: 13 }}>✕</button>
                  <div style={{ padding: "5px 10px", fontSize: 10.5, color: COLORS.textMuted, background: "rgba(0,0,0,0.5)" }}>{receiptFile?.name}</div>
                </div>
              ) : (
                <label style={{ display: "flex", alignItems: "center", gap: 12, border: `2px dashed rgba(108,99,255,0.25)`, borderRadius: 10, padding: "13px 14px", cursor: "pointer", background: "rgba(108,99,255,0.04)" }}>
                  <span style={{ fontSize: 22 }}>🧾</span>
                  <div>
                    <div style={{ fontSize: 12, color: COLORS.primary, fontWeight: 500 }}>Upload bill, receipt or invoice</div>
                    <div style={{ fontSize: 10.5, color: COLORS.textMuted }}>JPG, PNG, PDF · Max 10MB</div>
                  </div>
                  <input type="file" accept="image/*,application/pdf" onChange={handleReceiptUpload} style={{ display: "none" }} />
                </label>
              )}
            </div>

            {/* Store / Buyer Name */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>STORE / SELLER NAME *</label>
              <input placeholder="e.g. Amazon, Big Bazaar, Pharmacy..." value={form.storeName} onChange={e => setForm(p => ({ ...p, storeName: e.target.value }))} style={iStyle} />
            </div>

            {/* Product Name */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>PRODUCT / ITEM NAME</label>
              <input placeholder="e.g. Samsung TV, Grocery items, Petrol..." value={form.productName} onChange={e => setForm(p => ({ ...p, productName: e.target.value }))} style={iStyle} />
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
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>CATEGORY</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {cats.map(c => (
                  <button key={c} onClick={() => setForm(p => ({ ...p, category: c }))} style={{
                    padding: "5px 11px", borderRadius: 20, fontSize: 11, cursor: "pointer",
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

                        
            {["UPI", "Debit Card", "Net Banking"].includes(form.paymentMode) && (
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: 'block', marginBottom: 5 }}>SELECT BANK ACCOUNT</label>
                <select value={form.bankId||""} onChange={e=>setForm(p=>({...p,bankId:e.target.value}))} style={iStyle}>
                   <option value="">No Bank selected</option>
                   {banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            
            {form.paymentMode === 'Credit Card' && (
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: 'block', marginBottom: 5 }}>SELECT CREDIT CARD *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {creditCards.map(c => (
                    <button key={c.id} onClick={() => setForm(p => ({ ...p, creditCardId: c.id }))} style={{
                      padding: '5px 11px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                      border: `1px solid ${form.creditCardId === c.id ? COLORS.secondary : COLORS.border}`,
                      background: form.creditCardId === c.id ? `${COLORS.secondary}20` : 'transparent',
                      color: form.creditCardId === c.id ? COLORS.secondary : COLORS.textMuted, transition: 'all 0.15s'
                    }}>{c.name}</button>
                  ))}
                </div>
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
          onClose={() => setShowWarranty(false)}
          onSave={(wData) => setForm(p => ({ ...p, warrantyData: wData }))}
        />
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
          <div style={{ fontSize:12, color:COLORS.textMuted }}>Jun 2025 · Total: <b style={{ color:COLORS.danger }}>₹{grandTotal.toLocaleString("en-IN")}</b> · {transactions.length} transactions</div>
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
      

      {showAdd && <AddExpenseModal banks={banks} creditCards={creditCards} onClose={() => setShowAdd(false)} onSave={handleAddExpense} />}

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

// ─── Live Budget View ─────────────────────────────────────────────────────────
const BUDGET_SEED = [
  { id:"b1", name:"Food & Dining",  budget:15000, icon:"🍽️", color:COLORS.danger    },
  { id:"b2", name:"Grocery",        budget:10000, icon:"🛒", color:COLORS.secondary },
  { id:"b3", name:"Fuel & Commute", budget:8000,  icon:"⛽", color:COLORS.accent    },
  { id:"b4", name:"Entertainment",  budget:4000,  icon:"🎬", color:"#8B5CF6"        },
  { id:"b5", name:"Shopping",       budget:6000,  icon:"🛍️", color:COLORS.accent   },
  { id:"b6", name:"Medical",        budget:3000,  icon:"💊", color:COLORS.primary   },
  { id:"b7", name:"Utilities",      budget:5000,  icon:"💡", color:"#F59E0B"        },
  { id:"b8", name:"Education",      budget:5000,  icon:"📚", color:COLORS.primary   },
  { id:"b9", name:"Travel",         budget:8000,  icon:"✈️", color:"#06B6D4"        },
];
function BudgetViewLive({ expenses, budgets, setBudgets, filter }) {
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [delId,    setDelId]      = useState(null);
  const [form,     setForm]       = useState({ name:"", budget:"", icon:"💰", color:COLORS.primary });

  const iStyle = { background:"#1a2236", border:`1px solid ${COLORS.border}`, borderRadius:9, padding:"9px 12px", color:COLORS.text, fontSize:13, width:"100%", outline:"none", boxSizing:"border-box", caretColor:"#6C63FF" };
  const ICONS = ["🍽️","🛒","⛽","🎬","🛍️","💊","💡","📚","✈️","🏠","💻","🎵","💰","🎁","🏋️"];

  // Compute actuals from live expenses filtered by period
  const periodExp = expenses.filter(e => {
    const d=new Date(e.date),m=d.getMonth()+1,y=d.getFullYear();
    if(filter.mode==="month") return m===filter.month&&y===filter.year;
    if(filter.mode==="year")  return y===filter.year;
    if(filter.mode==="range"){const k=y*100+m;return k>=filter.fromYear*100+filter.fromMonth&&k<=filter.toYear*100+filter.toMonth;}
    return true;
  });

  // Map expense cats to budget names (rough match)
  const catMap = { "Food":["Food & Dining"],"Grocery":["Grocery"],"Fuel":["Fuel & Commute"],"Entertainment":["Entertainment"],"Shopping":["Shopping"],"Medical":["Medical"],"Utilities":["Utilities"],"Education":["Education"],"Travel":["Travel"] };
  const getActual = (bName) => periodExp.filter(e => Object.entries(catMap).some(([cat,names])=>names.includes(bName)&&e.cat===cat)).reduce((s,e)=>s+parseFloat(e.amount||0),0);

  const enriched = budgets.map(b=>({ ...b, actual:getActual(b.name) }));
  const totalBudget = enriched.reduce((s,b)=>s+b.budget,0);
  const totalActual = enriched.reduce((s,b)=>s+b.actual,0);

  const openAdd = () => { setEditItem(null); setForm({name:"",budget:"",icon:"🍽️",color:COLORS.primary}); setShowForm(true); };
  const openEdit = (b) => { setEditItem(b); setForm({name:b.name,budget:b.budget,icon:b.icon,color:b.color}); setShowForm(true); };
  const handleSave = () => {
    if(!form.name||!form.budget) return;
    const item = {...form,budget:parseFloat(form.budget)};
    if(editItem) setBudgets(p=>p.map(b=>b.id===editItem.id?{...b,...item}:b));
    else setBudgets(p=>[...p,{...item,id:"b"+Date.now()}]);
    setShowForm(false);
  };

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
        <div>
          <div style={{ fontSize:18,fontWeight:700,color:COLORS.text }}>Budget Planner</div>
          <div style={{ fontSize:12,color:COLORS.textMuted }}>{filterLabel(filter)} — actual from live expenses</div>
        </div>
        <button onClick={openAdd} style={{ background:`linear-gradient(135deg,${COLORS.primary},#8B5CF6)`,border:"none",borderRadius:12,padding:"9px 14px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0 }}>➕ Add</button>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,minmax(80px,1fr))",gap:9,marginBottom:14 }}>
        {[{l:"Budget",v:`₹${(totalBudget/1000).toFixed(0)}K`,c:COLORS.primary},{l:"Spent",v:`₹${(totalActual/1000).toFixed(1)}K`,c:totalActual>totalBudget?COLORS.danger:COLORS.secondary},{l:"Remaining",v:`₹${((totalBudget-totalActual)/1000).toFixed(1)}K`,c:COLORS.accent}].map(s=>(
          <div key={s.l} style={{ background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:11,padding:"10px 12px" }}>
            <div style={{ fontSize:10,color:COLORS.textMuted,marginBottom:3 }}>{s.l}</div>
            <div style={{ fontSize:15,fontWeight:700,color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
        {enriched.map(c=>{
          const pct=Math.min(c.budget>0?(c.actual/c.budget)*100:0,100);
          const over=c.actual>c.budget;
          return (
            <div key={c.id} style={{ background:COLORS.bgCard,border:`1px solid ${over?"rgba(255,91,91,0.25)":COLORS.border}`,borderRadius:12,padding:"12px 14px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,minWidth:0 }}>
                  <span style={{ fontSize:16,flexShrink:0 }}>{c.icon}</span>
                  <span style={{ fontSize:13,color:COLORS.text,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.name}</span>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:6,flexShrink:0,marginLeft:8 }}>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11,color:over?COLORS.danger:COLORS.secondary,fontWeight:600 }}>₹{c.actual.toLocaleString("en-IN")} / ₹{c.budget.toLocaleString("en-IN")}</div>
                    <div style={{ fontSize:10,color:over?COLORS.danger:COLORS.textMuted }}>{over?`▲ ₹${(c.actual-c.budget).toLocaleString("en-IN")} over`:`₹${(c.budget-c.actual).toLocaleString("en-IN")} left`}</div>
                  </div>
                  <button onClick={()=>openEdit(c)} style={{ background:`${COLORS.primary}22`,border:`1px solid ${COLORS.primary}44`,borderRadius:7,width:26,height:26,color:COLORS.primary,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>✏️</button>
                  <button onClick={()=>setDelId(c.id)} style={{ background:`${COLORS.danger}18`,border:`1px solid ${COLORS.danger}33`,borderRadius:7,width:26,height:26,color:COLORS.danger,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>🗑</button>
                </div>
              </div>
              <div style={{ background:"rgba(255,255,255,0.06)",borderRadius:4,height:6,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${pct}%`,borderRadius:4,background:over?`linear-gradient(90deg,${COLORS.danger},#FF8A8A)`:`linear-gradient(90deg,${COLORS.secondary},${COLORS.primary})`,transition:"width 1s" }}/>
              </div>
              <div style={{ fontSize:10,color:COLORS.textMuted,marginTop:4 }}>{pct.toFixed(0)}% used</div>
            </div>
          );
        })}
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
              <div><label style={{ fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:5 }}>CATEGORY NAME *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Dining Out" style={iStyle}/></div>
              <div><label style={{ fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:5 }}>MONTHLY BUDGET (₹) *</label><input type="number" inputMode="numeric" value={form.budget} onChange={e=>setForm(p=>({...p,budget:e.target.value}))} placeholder="5000" style={iStyle}/></div>
              <div>
                <label style={{ fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:8 }}>ICON</label>
                <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>{ICONS.map(ic=><button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))} style={{ fontSize:22,padding:"6px 8px",borderRadius:9,border:`1px solid ${form.icon===ic?COLORS.primary:COLORS.border}`,background:form.icon===ic?`${COLORS.primary}22`:"transparent",cursor:"pointer" }}>{ic}</button>)}</div>
              </div>
              <button onClick={handleSave} disabled={!form.name||!form.budget} style={{ padding:"13px",borderRadius:12,border:"none",background:(form.name&&form.budget)?`linear-gradient(135deg,${COLORS.primary},#8B5CF6)`:"rgba(255,255,255,0.08)",color:(form.name&&form.budget)?"#fff":COLORS.textMuted,fontSize:14,fontWeight:700,cursor:(form.name&&form.budget)?"pointer":"not-allowed" }}>{editItem?"Update":"Save Category"}</button>
            </div>
          </div>
        </div>
      )}
      {delId && <ConfirmDialog msg="Remove this budget category?" onConfirm={()=>{setBudgets(p=>p.filter(b=>b.id!==delId));setDelId(null);}} onCancel={()=>setDelId(null)} />}
    </div>
  );
}

// ─── Live Investments View ────────────────────────────────────────────────────
const INV_SEED = [
  { id:"inv1", name:"HDFC Mid Cap Opp Fund", type:"Mutual Fund", invested:60000,  current:78400,  units:142.3, color:COLORS.primary,   icon:"📈" },
  { id:"inv2", name:"Axis Bluechip Fund",    type:"Mutual Fund", invested:48000,  current:61700,  units:98.6,  color:"#8B5CF6",        icon:"📈" },
  { id:"inv3", name:"Reliance Industries",   type:"Stock",       invested:30000,  current:34800,  units:12,    color:COLORS.accent,    icon:"🏢" },
  { id:"inv4", name:"Infosys Ltd.",          type:"Stock",       invested:25000,  current:28200,  units:18,    color:COLORS.secondary, icon:"🏢" },
  { id:"inv5", name:"HDFC Bank FD",          type:"Fixed Deposit",invested:60000, current:63400,  units:1,     color:"#F59E0B",        icon:"🏦" },
  { id:"inv6", name:"SGB Gold Bonds",        type:"Gold",        invested:40000,  current:47200,  units:8,     color:"#D97706",        icon:"🪙" },
  { id:"inv7", name:"PPF Account",           type:"PPF",         invested:20000,  current:21400,  units:1,     color:"#06B6D4",        icon:"💰" },
];
const INV_TYPES = ["Mutual Fund","Stock","Fixed Deposit","Gold","PPF","NPS","EPF","Crypto","Real Estate","Other"];


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
      const nextDateStr = nextDate.toISOString().split('T')[0];
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

function InvestmentsViewLive({ investments, setInvestments, goals, banks, creditCards, expenses }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [invFilter, setInvFilter] = useState("All");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const [form, setForm] = useState({ name:"", provider:"", type:"Mutual Fund SIP", icon:"📈", amount:"", current:"", interestRate:"", maturityAmount:"", startDate: new Date().toISOString().split('T')[0], endDate:"", remarks:"", linkedGoal:"", docName:"", docData:"", status:"Active", color:COLORS.secondary });

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
      setInvestments(p => [...(p||[]), { ...item, id: "inv" + Date.now(), payments: [], trxNo: item.trxNo || getNextTrxNo("INV", p) }]);
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
        <button onClick={() => { setEditItem(null); setForm({ name:"", provider:"", type:"Mutual Fund SIP", cycle:"Monthly", icon:"📈", amount:"", current:"", interestRate:"", maturityAmount:"", startDate: new Date().toISOString().split('T')[0], endDate:"", remarks:"", linkedGoal:"", docName:"", docData:"", status:"Active", color:COLORS.secondary }); setShowForm(true); }} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add Investment</button>
      </div>

      {showForm && !editItem && (
<div style={{ background: "#1a2236", padding: 16, borderRadius: 12, marginBottom: 16, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Investment Name</label><input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="e.g. HDFC RD" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Bank / Provider</label><input value={form.provider} onChange={e=>setForm({...form, provider: e.target.value})} placeholder="e.g. HDFC Bank" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Type</label><select value={form.type} onChange={e=>setForm({...form, type: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="Recurring Deposit">Recurring Deposit (RD)</option><option value="Fixed Deposit">Fixed Deposit (FD)</option><option value="Mutual Fund SIP">Mutual Fund SIP</option><option value="Mutual Fund">Mutual Fund (Lumpsum)</option><option value="Stock">Stock/Equity</option><option value="Gold">Gold</option><option value="PPF">PPF</option><option value="Other">Other</option></select></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Amount / Principal (₹)</label><input type="number" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} placeholder="Principal or Monthly" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Current Value (₹)</label><input type="number" value={form.current} onChange={e=>setForm({...form, current: e.target.value})} placeholder="Current Value" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Start Date</label><input type="date" value={form.startDate||""} onChange={e=>setForm({...form, startDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>End Date</label><input type="date" value={form.endDate||""} onChange={e=>setForm({...form, endDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Interest Rate (%)</label><input type="number" value={form.interestRate||""} onChange={e=>setForm({...form, interestRate: e.target.value})} placeholder="e.g. 7.1" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Maturity Amount (₹)</label><input type="number" value={form.maturityAmount||""} onChange={e=>setForm({...form, maturityAmount: e.target.value})} placeholder="e.g. 150000" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Cycle</label><select value={form.cycle||"Monthly"} onChange={e=>setForm({...form, cycle: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option><option value="Half-Yearly">Half-Yearly</option><option value="Annually">Annually</option><option value="One-Time">One-Time</option></select></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Installment / Payable Amount (₹) *</label><input type="number" value={form.emiAmount||""} onChange={e=>setForm({...form, emiAmount: e.target.value})} placeholder="Amount to pay/invest" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Deduction Bank Account</label>
              <select value={form.bankId||""} onChange={e=>setForm({...form, bankId:e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, padding: "8px 12px", color: COLORS.text, fontSize: 13, borderRadius: 8, width: "100%", outline: "none" }}>
                <option value="">Select Account</option>
                <optgroup label="Bank Accounts">
                  {(banks||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </optgroup>
                <optgroup label="Credit Cards">
                  {(creditCards||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              </select>
            </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>More Information / Purpose</label><input value={form.remarks||""} onChange={e=>setForm({...form, remarks: e.target.value})} placeholder="Purpose of investment" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Linked Goal</label><select value={form.linkedGoal||""} onChange={e=>setForm({...form, linkedGoal: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="">None</option>{goals && goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
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
                  <div style={{ fontSize:16,fontWeight:700,color:inv.color||COLORS.primary,marginBottom:2 }}>₹{(inv.amount||inv.invested||0).toLocaleString("en-IN")}<span style={{fontSize:10,fontWeight:400,color:COLORS.textMuted}}>{isLump ? "" : "/mo"}</span></div>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Amount / Principal (₹)</label><input type="number" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} placeholder="Principal or Monthly" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Current Value (₹)</label><input type="number" value={form.current} onChange={e=>setForm({...form, current: e.target.value})} placeholder="Current Value" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Start Date</label><input type="date" value={form.startDate||""} onChange={e=>setForm({...form, startDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>End Date</label><input type="date" value={form.endDate||""} onChange={e=>setForm({...form, endDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Interest Rate (%)</label><input type="number" value={form.interestRate||""} onChange={e=>setForm({...form, interestRate: e.target.value})} placeholder="e.g. 7.1" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Maturity Amount (₹)</label><input type="number" value={form.maturityAmount||""} onChange={e=>setForm({...form, maturityAmount: e.target.value})} placeholder="e.g. 150000" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Cycle</label><select value={form.cycle||"Monthly"} onChange={e=>setForm({...form, cycle: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option><option value="Half-Yearly">Half-Yearly</option><option value="Annually">Annually</option><option value="One-Time">One-Time</option></select></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Installment / Payable Amount (₹) *</label><input type="number" value={form.emiAmount||""} onChange={e=>setForm({...form, emiAmount: e.target.value})} placeholder="Amount to pay/invest" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Deduction Bank Account</label>
              <select value={form.bankId||""} onChange={e=>setForm({...form, bankId:e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, padding: "8px 12px", color: COLORS.text, fontSize: 13, borderRadius: 8, width: "100%", outline: "none" }}>
                <option value="">Select Account</option>
                <optgroup label="Bank Accounts">
                  {(banks||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </optgroup>
                <optgroup label="Credit Cards">
                  {(creditCards||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              </select>
            </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>More Information / Purpose</label><input value={form.remarks||""} onChange={e=>setForm({...form, remarks: e.target.value})} placeholder="Purpose of investment" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Linked Goal</label><select value={form.linkedGoal||""} onChange={e=>setForm({...form, linkedGoal: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="">None</option>{goals && goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
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
        
          {editItem && (() => {
            const getDue = () => {
              if (editItem.cycle === "One-Time") return [];
              const d = new Date(editItem.startDate);
              const now = new Date();
              let dues = [];
              let cycleMonths = editItem.cycle === "Monthly" ? 1 : editItem.cycle === "Quarterly" ? 3 : editItem.cycle === "Half-Yearly" ? 6 : 12;
              const payments = (expenses||[]).filter(e => e.expenseId === editItem.id);
              while (d <= now) {
                let paid = payments.some(p => {
                  let pd = new Date(p.date);
                  return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
                });
                if (!paid) dues.push({ ...editItem, dueDate: d.toISOString(), amount: editItem.emiAmount || editItem.amount });
                d.setMonth(d.getMonth() + cycleMonths);
              }
              return dues;
            };
            const dues = getDue();
            const payments = (expenses||[]).filter(e => e.expenseId === editItem.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
            return (
              <div style={{ flex: "1 1 35%", position: "sticky", top: 16, background: "rgba(0,0,0,0.15)", padding: 20, borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🧾</span> Investment Ledger
                </div>
                
                {payments.length === 0 && dues.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 8, opacity: 0.6 }}>
                    <div style={{ fontSize: 32 }}>📭</div>
                    <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>No investments yet</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, textAlign: "center", padding: "0 20px" }}>Contributions and upcoming SIPs will appear here once tracked.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
                    {dues.map((d, idx) => {
                      const bId = d.bankId;
                      const b = bId ? [...(banks||[]), ...(creditCards||[])].find(x => x.id === bId) : null;
                      const bankName = b ? b.name : "—";
                      return (
                        <div key={"due-"+idx} style={{ background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)", borderLeft: "4px solid #f59e0b", padding: "12px 16px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 18, background: "rgba(245, 158, 11, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⏳</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", letterSpacing: 0.5 }}>UPCOMING SIP</div>
                              <div style={{ fontSize: 11, color: COLORS.textMuted }}>{new Date(d.dueDate).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})} • {bankName}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>₹{parseFloat(d.amount).toLocaleString("en-IN")}</div>
                        </div>
                      );
                    })}
                    {payments.map((p, idx) => {
                      const bId = p.bankId;
                      const b = bId ? [...(banks||[]), ...(creditCards||[])].find(x => x.id === bId) : null;
                      const bankName = b ? b.name : (p.paymentMode || "Cash");
                      const trxNo = p.trxNo || "—";
                      return (
                        <div key={"paid-"+idx} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}`, padding: "12px 16px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 18, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✅</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>Invested</div>
                                <div style={{ fontSize: 9, background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: 12, color: COLORS.textMuted, fontWeight: 600 }}>{trxNo}</div>
                              </div>
                              <div style={{ fontSize: 11, color: COLORS.textMuted }}>{new Date(p.date).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})} • {bankName}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>₹{parseFloat(p.amount).toLocaleString("en-IN")}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
const GOALS_SEED = [
  { id:"g1", name:"Dream Home",      icon:"🏠", target:8000000,  saved:960000,  deadline:"2029-12-01", monthly:45000, color:COLORS.primary,   tip:"Increase SIP by ₹5K/month to reach goal 8 months early." },
  { id:"g2", name:"New Car",         icon:"🚗", target:1200000,  saved:780000,  deadline:"2025-06-01", monthly:35000, color:COLORS.secondary, tip:"On track! Keep up the ₹35K/month pace." },
  { id:"g3", name:"Europe Trip",     icon:"✈️", target:300000,   saved:85000,   deadline:"2025-10-01", monthly:18000, color:COLORS.accent,    tip:"Need ₹18K/month for 12 months to hit target." },
  { id:"g4", name:"Child Education", icon:"🎓", target:2500000,  saved:220000,  deadline:"2034-01-01", monthly:12000, color:"#8B5CF6",        tip:"Start a dedicated education SIP for better compounding." },
  { id:"g5", name:"Emergency Fund",  icon:"🛡️", target:400000,  saved:320000,  deadline:"2025-03-01", monthly:20000, color:"#06B6D4",        tip:"Almost there! ₹80K more to complete 6-month fund." },
  { id:"g6", name:"Retirement",      icon:"🌴", target:50000000, saved:11000000,deadline:"2052-01-01", monthly:35000, color:"#F59E0B",        tip:"Increase equity allocation to accelerate corpus growth." },
];
function GoalsViewLive({ goals, setGoals }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [delId,    setDelId]    = useState(null);
  const emptyForm = { name:"",icon:"🎯",target:"",saved:"",monthly:"",deadline:"",tip:"",color:COLORS.primary };
  const [form, setForm] = useState(emptyForm);
  const MONTH_NAMES_S = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const iStyle = { background:"#1a2236",border:`1px solid ${COLORS.border}`,borderRadius:9,padding:"9px 12px",color:COLORS.text,fontSize:13,width:"100%",outline:"none",boxSizing:"border-box",caretColor:"#6C63FF" };
  const ICONS = ["🏠","🚗","✈️","🎓","🛡️","🌴","💍","📱","💻","🏋️","🎯","💎","🏖️","🎪","🎸"];
  const GCOLORS = [COLORS.primary,COLORS.secondary,COLORS.accent,"#8B5CF6","#06B6D4","#F59E0B","#10B981","#EC4899"];

  const openAdd  = () => { setEditItem(null); setForm({...emptyForm,color:COLORS.primary}); setShowForm(true); };
  const openEdit = (g) => { setEditItem(g); setForm({...g,target:g.target,saved:g.saved,monthly:g.monthly}); setShowForm(true); };
  const handleSave = () => {
    if(!form.name||!form.target) return;
    const item = {...form,target:parseFloat(form.target),saved:parseFloat(form.saved||0),monthly:parseFloat(form.monthly||0)};
    if(editItem) setGoals(p=>p.map(g=>g.id===editItem.id?{...g,...item}:g));
    else setGoals(p=>[...p,{...item,id:"g"+Date.now()}]);
    setShowForm(false);
  };

  const fmtDeadline = d => { if(!d) return "—"; const dt=new Date(d); return `${MONTH_NAMES_S[dt.getMonth()]} ${dt.getFullYear()}`; };

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <div>
          <div style={{ fontSize:18,fontWeight:700,color:COLORS.text }}>Goal Planner</div>
          <div style={{ fontSize:12,color:COLORS.textMuted }}>{goals.length} active goals</div>
        </div>
        <button onClick={openAdd} style={{ background:`linear-gradient(135deg,${COLORS.primary},#8B5CF6)`,border:"none",borderRadius:12,padding:"9px 14px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0 }}>➕ Add Goal</button>
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
        {goals.map(g=>{
          const pct=g.target>0?Math.min(Math.round((g.saved/g.target)*100),100):0;
          return (
            <div key={g.id} style={{ background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:16,padding:"16px 16px",position:"relative",overflow:"hidden" }}>
              <div style={{ position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:`${g.color}10`,pointerEvents:"none" }}/>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,minWidth:0,flex:1 }}>
                  <div style={{ width:42,height:42,borderRadius:12,background:`${g.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>{g.icon}</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:14,fontWeight:600,color:COLORS.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{g.name}</div>
                    <div style={{ fontSize:10.5,color:COLORS.textMuted }}>By {fmtDeadline(g.deadline)} · ₹{g.monthly.toLocaleString("en-IN")}/mo</div>
                  </div>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:6,flexShrink:0,marginLeft:8 }}>
                  <div style={{ fontSize:20,fontWeight:800,color:g.color,minWidth:40,textAlign:"right" }}>{pct}%</div>
                  <button onClick={()=>openEdit(g)} style={{ background:`${COLORS.primary}22`,border:`1px solid ${COLORS.primary}44`,borderRadius:7,width:26,height:26,color:COLORS.primary,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center" }}>✏️</button>
                  <button onClick={()=>setDelId(g.id)} style={{ background:`${COLORS.danger}18`,border:`1px solid ${COLORS.danger}33`,borderRadius:7,width:26,height:26,color:COLORS.danger,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center" }}>🗑</button>
                </div>
              </div>
              <div style={{ background:"rgba(255,255,255,0.06)",borderRadius:6,height:8,marginBottom:8,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${pct}%`,borderRadius:6,background:`linear-gradient(90deg,${g.color}cc,${g.color})`,transition:"width 1.2s",boxShadow:`0 0 8px ${g.color}55` }}/>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:11,color:COLORS.textMuted,marginBottom:g.tip?8:0 }}>
                <span>Saved: <b style={{ color:COLORS.text }}>₹{(g.saved/100000).toFixed(1)}L</b></span>
                <span>Target: <b style={{ color:COLORS.text }}>₹{(g.target/100000).toFixed(0)}L</b></span>
                <span>Remaining: <b style={{ color:g.color }}>₹{((g.target-g.saved)/100000).toFixed(1)}L</b></span>
              </div>
              {g.tip && <div style={{ background:`${g.color}12`,border:`1px solid ${g.color}25`,borderRadius:8,padding:"7px 10px",fontSize:10.5,color:COLORS.textMuted }}><span style={{ color:g.color,marginRight:4 }}>✦</span>{g.tip}</div>}
            </div>
          );
        })}
      </div>

            {showForm && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
          <div style={{ background:"#0d1526",border:`1px solid rgba(108,99,255,0.25)`,borderRadius:"20px 20px 0 0",padding:"20px 18px 32px",width:"100%",maxWidth:480,maxHeight:"92vh",overflowY:"auto" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <div style={{ fontSize:15,fontWeight:700,color:COLORS.text }}>{editItem?"✏️ Edit Goal":"➕ Add Goal"}</div>
              <button onClick={()=>setShowForm(false)} style={{ background:"rgba(255,255,255,0.07)",border:"none",borderRadius:8,width:30,height:30,color:COLORS.textMuted,cursor:"pointer",fontSize:16 }}>✕</button>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <div><label style={{ fontSize:11,color:COLORS.textMuted,display:"block",marginBottom:5 }}>GOAL NAME *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Dream Vacation" style={iStyle}/></div>
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

const LOANS_SEED = [
  { id: "loan1", name: "Home Loan", bank: "HDFC Bank", type: "Compound (PMT)", principal: 3850000, startDate: "2024-01-15", endDate: "2044-01-15", interestRate: 8.5, rateHistory: [], payments: [], remarks: "Dream home", linkedGoal: "", icon: "🏠", color: COLORS.primary },
  { id: "loan2", name: "Car Loan", bank: "ICICI Bank", type: "Fixed", principal: 600000, startDate: "2024-05-10", endDate: "2029-05-10", interestRate: 9.2, rateHistory: [], payments: [], remarks: "Honda City", linkedGoal: "", icon: "🚗", color: COLORS.secondary },
  { id: "loan3", name: "Floating Home Loan", bank: "SBI", type: "Floating", principal: 5000000, startDate: "2023-01-01", endDate: "2043-01-01", interestRate: 8.0, rateHistory: [{ date: "2025-01-01", rate: 8.5 }], payments: [], remarks: "Villa project", linkedGoal: "", icon: "🏘️", color: COLORS.accent }
];

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
  
  const [viewSchedule, setViewSchedule] = useState(null);
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

      <div style={{ display:"flex",flexDirection:"column",gap:11 }}>
        {loans && loans.map(l => {
          const sch = calculateAmortization(l);
          const paidCount = l.payments ? l.payments.length : 0;
          const pct = sch.length > 0 ? Math.round((paidCount / sch.length) * 100) : 0;
          const currEmi = sch.length > 0 ? (sch[paidCount < sch.length ? paidCount : sch.length-1].emi) : 0;
          const currBal = sch.length > 0 ? (paidCount < sch.length ? sch[paidCount].balance : 0) : 0;

          return (
            <div key={l.id} style={{ background:COLORS.bgCard,border:`1px solid ${COLORS.border}`,borderRadius:14,padding:"14px 16px" }}>
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
                     <button onClick={() => setViewSchedule(l)} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "2px 6px", color: COLORS.textMuted, fontSize: 10, cursor: "pointer", width: "100%" }}>Schedule</button>
                     <button onClick={() => { setEditItem(l); setForm({...l}); setShowForm(true); }} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "2px 6px", color: COLORS.textMuted, fontSize: 10, cursor: "pointer", width: "100%" }}>Edit</button>
                     <button onClick={() => { 
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
          );
        })}
      </div>

      {viewSchedule && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:110,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div style={{ background:"#0f172a",border:`1px solid ${COLORS.border}`,borderRadius:16,width:"100%",maxWidth:600,maxHeight:"90vh",display:"flex",flexDirection:"column" }}>
            <div style={{ padding:16,borderBottom:`1px solid ${COLORS.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <div style={{ fontSize:15,fontWeight:700,color:COLORS.text }}>Amortization Schedule</div>
                <div style={{ fontSize:11,color:COLORS.textMuted }}>{viewSchedule.name} ({viewSchedule.type})</div>
              </div>
              <button onClick={()=>setViewSchedule(null)} style={{ background:"transparent",border:"none",color:COLORS.textMuted,cursor:"pointer",fontSize:20 }}>✕</button>
            </div>
            <div style={{ overflowY:"auto",padding:16 }}>
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
                  {calculateAmortization(loans.find(l=>l.id===viewSchedule.id)||viewSchedule).map((row, i) => {
                    const activeLoan = loans.find(l=>l.id===viewSchedule.id)||viewSchedule;
                    const isPaid = activeLoan.payments && i < activeLoan.payments.length;
                    return (
                    <tr key={i} style={{ borderBottom:`1px solid rgba(255,255,255,0.03)`, color: isPaid ? COLORS.success : COLORS.text }}>
                      <td style={{ textAlign:"left",padding:"8px 0" }}>{row.month}<div style={{fontSize:9,color:COLORS.textMuted}}>{row.date} {isPaid?"✓":""}</div></td>
                      <td>
                        <input type="number" key={`emi-${row.month}-${Math.round(row.emi)}`} defaultValue={Math.round(row.emi)} onBlur={e => handleSoaEdit(activeLoan.id, row.month, "emi", e.target.value, row.principal, row.interest, row.emi)} style={{ background:"transparent", border:"1px solid transparent", borderBottom:`1px solid ${COLORS.border}`, color:isPaid?COLORS.success:COLORS.text, width:"60px", fontSize:13, padding:"2px 4px", outline:"none" }} onFocus={e => e.target.style.border=`1px solid ${COLORS.primary}`} />
                      </td>
                      <td>
                        <input type="number" key={`prin-${row.month}-${Math.round(row.principal)}`} defaultValue={Math.round(row.principal)} onBlur={e => handleSoaEdit(activeLoan.id, row.month, "principal", e.target.value, row.principal, row.interest, row.emi)} style={{ background:"transparent", border:"1px solid transparent", borderBottom:`1px solid ${COLORS.border}`, color:isPaid?COLORS.success:COLORS.primary, width:"60px", fontSize:13, padding:"2px 4px", outline:"none" }} onFocus={e => e.target.style.border=`1px solid ${COLORS.primary}`} />
                      </td>
                      <td>
                        <input type="number" key={`int-${row.month}-${Math.round(row.interest)}`} defaultValue={Math.round(row.interest)} onBlur={e => handleSoaEdit(activeLoan.id, row.month, "interest", e.target.value, row.principal, row.interest, row.emi)} style={{ background:"transparent", border:"1px solid transparent", borderBottom:`1px solid ${COLORS.border}`, color:isPaid?COLORS.success:COLORS.danger, width:"60px", fontSize:13, padding:"2px 4px", outline:"none" }} onFocus={e => e.target.style.border=`1px solid ${COLORS.primary}`} />
                      </td>
                      <td style={{ color: COLORS.textMuted }}>{row.rate}%</td>
                      <td style={{ fontWeight:700 }}>₹{row.balance.toLocaleString("en-IN", {maximumFractionDigits:0})}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

                  {deleteConfirm && (
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

      {showForm && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
          <div style={{ background:"#0d1526",border:`1px solid rgba(108,99,255,0.25)`,borderRadius:"20px 20px 0 0",padding:"20px 18px 32px",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <div style={{ fontSize:15,fontWeight:700,color:COLORS.text }}>{editItem?"✏️ Edit Loan":"➕ Add Loan"}</div>
              <button onClick={()=>setShowForm(false)} style={{ background:"rgba(255,255,255,0.07)",border:"none",borderRadius:8,width:30,height:30,color:COLORS.textMuted,cursor:"pointer",fontSize:16 }}>✕</button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Loan Name</label><input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="e.g. Home Loan" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Bank / Provider</label>
              <select value={form.bankId||""} onChange={e=>setForm({...form, bankId:e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, padding: "9px 12px", color: COLORS.text, fontSize: 13, borderRadius: 9, width: "100%", outline: "none" }}>
                <option value="">Select Bank Account</option>
                {(banks||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Type</label><select value={form.type} onChange={e=>setForm({...form, type: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="Compound (PMT)">Compound (PMT Schedule)</option><option value="Fixed">Fixed Interest</option><option value="Floating">Floating Interest</option></select></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Principal Amount (₹)</label><input type="number" value={form.principal} onChange={e=>setForm({...form, principal: e.target.value})} placeholder="e.g. 5000000" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Start Date</label><input type="date" value={form.startDate} onChange={e=>setForm({...form, startDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>End Date</label><input type="date" value={form.endDate} onChange={e=>setForm({...form, endDate: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Base Interest Rate (%)</label><input type="number" value={form.interestRate} onChange={e=>setForm({...form, interestRate: e.target.value})} placeholder="e.g. 8.5" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Cycle</label><select value={form.cycle||"Monthly"} onChange={e=>setForm({...form, cycle: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option><option value="Half-Yearly">Half-Yearly</option><option value="Annually">Annually</option><option value="One-Time">One-Time</option></select></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Installment / Payable Amount (₹) *</label><input type="number" value={form.emiAmount||""} onChange={e=>setForm({...form, emiAmount: e.target.value})} placeholder="Amount to pay/invest" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>Deduction Bank Account</label>
              <select value={form.bankId||""} onChange={e=>setForm({...form, bankId:e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, padding: "8px 12px", color: COLORS.text, fontSize: 13, borderRadius: 8, width: "100%", outline: "none" }}>
                <option value="">Select Account</option>
                <optgroup label="Bank Accounts">
                  {(banks||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </optgroup>
                <optgroup label="Credit Cards">
                  {(creditCards||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              </select>
            </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>More Information / Purpose</label><input value={form.remarks||""} onChange={e=>setForm({...form, remarks: e.target.value})} placeholder="Purpose" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: 10, color: COLORS.textMuted }}>Linked Goal</label><select value={form.linkedGoal||""} onChange={e=>setForm({...form, linkedGoal: e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }}><option value="">None</option>{goals && goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
            </div>

            {form.type === "Floating" && (
              <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>Floating Rate History</div>
                  <button onClick={addRateHist} style={{ background: COLORS.primary, border: "none", color: "#fff", padding: "4px 8px", borderRadius: 4, fontSize: 10, cursor: "pointer" }}>+ Add Rate Change</button>
                </div>
                {form.rateHistory.map((rh, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <input type="date" value={rh.date} onChange={e=>updateRateHist(i, "date", e.target.value)} style={{ flex: 1, background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "6px", borderRadius: 4, fontSize: 10 }} />
                    <input type="number" value={rh.rate} onChange={e=>updateRateHist(i, "rate", e.target.value)} placeholder="New Rate %" style={{ flex: 1, background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "6px", borderRadius: 4, fontSize: 10 }} />
                    <button onClick={()=>removeRateHist(i)} style={{ background: "transparent", color: COLORS.danger, border: "none", cursor: "pointer" }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleSave} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save Loan</button>
          </div>
        </div>
      )}
    </div>
  );
}
// ─── Subscriptions View ───────────────────────────────────────────────────────
function SubscriptionsView({ subscriptions, setSubscriptions, categoryMaster, banks, creditCards, expenses }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name:"", icon:"🎬", amount:"", cycle:"Monthly", status:"Active", startDate:"", endDate:"", remarks:"", bank:"", bankId:"", color:COLORS.primary, category:"Entertainment" });

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
      endDate: form.endDate || "" 
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
    const start = new Date(s.startDate);
    let nextDate = new Date(start);
    let limit = 0;
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    
    while (limit < 1000) {
      if (s.endDate && nextDate > new Date(s.endDate)) return "Ended";
      
      const nextDateStr = nextDate.toISOString().split('T')[0];
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
              
              <select value={form.bankId||""} onChange={e=>setForm({...form, bankId:e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, padding: "9px 12px", color: COLORS.text, fontSize: 13, borderRadius: 9, width: "100%", outline: "none" }}>
                <option value="">Select Bank Account</option>
                {(banks||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
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
              {(!editItem.payments || editItem.payments.length === 0) && getDueSubscriptions([editItem]).length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 8, opacity: 0.6 }}>
                  <div style={{ fontSize: 32 }}>📭</div>
                  <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>No payments yet</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, textAlign: "center", padding: "0 20px" }}>Payments and upcoming dues will appear here once tracked.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {getDueSubscriptions([editItem]).map((d, idx) => {
                  const bId = d.bankId;
                  const b = bId ? [...(banks||[]), ...(creditCards||[])].find(x => x.id === bId) : null;
                  const bankName = b ? b.name : "—";
                  return (
                    <div key={"due-"+idx} style={{ background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)", borderLeft: "4px solid #f59e0b", padding: "12px 16px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 18, background: "rgba(245, 158, 11, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⏳</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", letterSpacing: 0.5 }}>UPCOMING DUE</div>
                          <div style={{ fontSize: 11, color: COLORS.textMuted }}>{new Date(d.dueDate).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})} • {bankName}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>₹{parseFloat(d.amount).toLocaleString("en-IN")}</div>
                    </div>
                  );
                })}
                {editItem.payments && [...editItem.payments].reverse().map((p, idx) => {
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
                          <div style={{ fontSize: 11, color: COLORS.textMuted }}>{new Date(p.date).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})} • {bankName}</div>
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
const SEED_INCOME = [
  { id:"i1",  date:"2025-06-01", source:"Salary",      amount:95000, note:"Infosys Ltd. — June salary",      icon:"💼", color:COLORS.primary   },
  { id:"i2",  date:"2025-06-05", source:"Freelancing", amount:18000, note:"React dashboard project",          icon:"💻", color:COLORS.secondary },
  { id:"i3",  date:"2025-06-07", source:"Rental",      amount:5000,  note:"Flat in Andheri — June rent",      icon:"🏠", color:COLORS.accent    },
  { id:"i4",  date:"2025-06-10", source:"Dividend",    amount:1200,  note:"Infosys Q1 dividend",              icon:"📈", color:"#8B5CF6"        },
  { id:"i5",  date:"2025-06-12", source:"Interest",    amount:800,   note:"HDFC FD interest payout",          icon:"🏦", color:"#F59E0B"        },
  { id:"i6",  date:"2025-05-01", source:"Salary",      amount:93000, note:"Infosys Ltd. — May salary",        icon:"💼", color:COLORS.primary   },
  { id:"i7",  date:"2025-05-08", source:"Freelancing", amount:12000, note:"Logo design project",              icon:"💻", color:COLORS.secondary },
  { id:"i8",  date:"2025-05-12", source:"Rental",      amount:5000,  note:"Flat in Andheri — May rent",       icon:"🏠", color:COLORS.accent    },
  { id:"i9",  date:"2025-04-01", source:"Salary",      amount:93000, note:"Infosys Ltd. — April salary",      icon:"💼", color:COLORS.primary   },
  { id:"i10", date:"2025-04-15", source:"Other",       amount:3500,  note:"Bonus incentive Q4",               icon:"🎁", color:"#06B6D4"        },
];

const SEED_CREDIT_CARDS = [
  { id:"cc1", name:"HDFC Regalia", network:"Visa", limit: 500000, billingDate: "15", color: "#6C63FF" },
  { id:"cc2", name:"SBI Cashback", network:"Visa", limit: 250000, billingDate: "12", color: "#00C896" },
  { id:"cc3", name:"ICICI Amazon Pay", network:"Visa", limit: 100000, billingDate: "20", color: "#FFB547" },
];

const SEED_EXPENSES = [
  { id:"e1",  date:"2025-06-12", storeName:"Swiggy",              productName:"Butter Chicken + Naan",    cat:"Food",          amount:480,   icon:"🍽️", color:COLORS.danger,    paymentMode:"UPI",         hasWarranty:false },
  { id:"e2",  date:"2025-06-12", storeName:"BPCL Fuel Station",   productName:"Petrol 25L",               cat:"Fuel",          amount:2500,  icon:"⛽", color:COLORS.accent,    paymentMode:"UPI",         hasWarranty:false },
  { id:"e3",  date:"2025-06-11", storeName:"Reliance Fresh",      productName:"Monthly Groceries",        cat:"Grocery",       amount:4200,  icon:"🛒", color:COLORS.secondary, paymentMode:"Credit Card", creditCardId:"cc1", hasWarranty:false },
  { id:"e4",  date:"2025-06-10", storeName:"PVR Cinemas",         productName:"Kalki 2898-AD (2 seats)",  cat:"Entertainment", amount:840,   icon:"🎬", color:"#8B5CF6",        paymentMode:"UPI",         hasWarranty:false },
  { id:"e5",  date:"2025-06-10", storeName:"Apollo Pharmacy",     productName:"BP Medicines + Vitamins",  cat:"Medical",       amount:1240,  icon:"💊", color:COLORS.primary,   paymentMode:"Cash",        hasWarranty:false },
  { id:"e6",  date:"2025-06-09", storeName:"Amazon India",        productName:"Samsung Galaxy Buds2",     cat:"Shopping",      amount:5999,  icon:"📦", color:COLORS.accent,    paymentMode:"Credit Card", creditCardId:"cc2", hasWarranty:true,
    warrantyData:{ type:"Warranty", period:"12", unit:"months", expiryDate:"2026-06-09", expiryDay:"9", expiryMonth:"6", expiryYear:"2026", purchaseDate:"2025-06-09" }},
  { id:"e7",  date:"2025-06-09", storeName:"Zomato",              productName:"Pizza + Garlic Bread",     cat:"Food",          amount:620,   icon:"🍽️", color:COLORS.danger,    paymentMode:"UPI",         hasWarranty:false },
  { id:"e8",  date:"2025-06-08", storeName:"MSEDCL",              productName:"Electricity Bill",         cat:"Utilities",     amount:1820,  icon:"💡", color:"#F59E0B",        paymentMode:"Net Banking", hasWarranty:false },
  { id:"e9",  date:"2025-06-08", storeName:"Mahatma Jyoti Academy",productName:"Daughter's Tuition",     cat:"Education",     amount:3500,  icon:"📚", color:COLORS.primary,   paymentMode:"NEFT",        hasWarranty:false },
  { id:"e10", date:"2025-06-07", storeName:"IndiGo Airlines",     productName:"Mumbai → Bengaluru",       cat:"Travel",        amount:5600,  icon:"✈️", color:"#06B6D4",        paymentMode:"Debit Card",  hasWarranty:false },
  { id:"e11", date:"2025-06-06", storeName:"D-Mart",              productName:"Household Items",          cat:"Grocery",       amount:2100,  icon:"🛒", color:COLORS.secondary, paymentMode:"Cash",        hasWarranty:false },
  { id:"e12", date:"2025-06-05", storeName:"Croma",               productName:"Philips Air Fryer",        cat:"Shopping",      amount:8500,  icon:"🛍️", color:COLORS.accent,   paymentMode:"EMI",         hasWarranty:true,
    warrantyData:{ type:"Guarantee", period:"24", unit:"months", expiryDate:"2027-06-05", expiryDay:"5", expiryMonth:"6", expiryYear:"2027", purchaseDate:"2025-06-05" }},
  { id:"e13", date:"2025-06-04", storeName:"Myntra",              productName:"3x T-shirts + Jeans",      cat:"Shopping",      amount:2499,  icon:"👕", color:COLORS.accent,    paymentMode:"Credit Card", creditCardId:"cc1", hasWarranty:false },
  { id:"e14", date:"2025-06-03", storeName:"Cafe Coffee Day",     productName:"Coffee + Sandwiches",      cat:"Food",          amount:380,   icon:"☕", color:COLORS.danger,    paymentMode:"UPI",         hasWarranty:false },
  { id:"e15", date:"2025-06-03", storeName:"Jio Fiber",           productName:"1 Gbps Plan Jun 2025",     cat:"Utilities",     amount:1199,  icon:"📡", color:"#F59E0B",        paymentMode:"Auto-debit",  hasWarranty:false },
  { id:"e16", date:"2025-05-31", storeName:"BookMyShow",          productName:"Ed Sheeran Live Ticket",   cat:"Entertainment", amount:3200,  icon:"🎵", color:"#8B5CF6",        paymentMode:"Credit Card", creditCardId:"cc1", hasWarranty:false },
  { id:"e17", date:"2025-05-30", storeName:"Makemytrip",          productName:"Goa Hotel 3N/4D",          cat:"Travel",        amount:12500, icon:"🏨", color:"#06B6D4",        paymentMode:"EMI",         hasWarranty:false },
  { id:"e18", date:"2025-05-28", storeName:"HDFC Life",           productName:"Term Insurance Premium",   cat:"Utilities",     amount:6800,  icon:"🛡️", color:"#F59E0B",       paymentMode:"Net Banking", hasWarranty:false },
  { id:"e19", date:"2025-05-15", storeName:"BigBasket",           productName:"Fruits & Vegetables",      cat:"Grocery",       amount:890,   icon:"🥦", color:COLORS.secondary, paymentMode:"UPI",         hasWarranty:false },
  { id:"e20", date:"2025-05-10", storeName:"Decathlon",           productName:"Running Shoes Nike",       cat:"Shopping",      amount:3999,  icon:"👟", color:COLORS.accent,    paymentMode:"Debit Card",  hasWarranty:true,
    warrantyData:{ type:"Warranty", period:"6", unit:"months", expiryDate:"2025-12-10", expiryDay:"10", expiryMonth:"12", expiryYear:"2025", purchaseDate:"2025-05-10" }},
  { id:"e21", date:"2025-04-20", storeName:"Manipal Hospital",    productName:"Annual Health Checkup",    cat:"Medical",       amount:2800,  icon:"🏥", color:COLORS.primary,   paymentMode:"Credit Card", creditCardId:"cc1", hasWarranty:false },
  { id:"e22", date:"2025-04-12", storeName:"IOCL Petrol Pump",    productName:"Diesel 40L",               cat:"Fuel",          amount:3680,  icon:"⛽", color:COLORS.accent,    paymentMode:"UPI",         hasWarranty:false },
  { id:"e23", date:"2025-04-05", storeName:"Unacademy",           productName:"UPSC Prep 6M Plan",        cat:"Education",     amount:4999,  icon:"📖", color:COLORS.primary,   paymentMode:"Credit Card", creditCardId:"cc1", hasWarranty:false },
  { id:"e24", date:"2025-03-22", storeName:"Mahanagar Gas",       productName:"PNG Bill Mar 2025",        cat:"Utilities",     amount:740,   icon:"🔥", color:"#F59E0B",        paymentMode:"Net Banking", hasWarranty:false },
  { id:"e25", date:"2025-03-10", storeName:"Swiggy Instamart",    productName:"Snacks + Beverages",       cat:"Grocery",       amount:560,   icon:"🛒", color:COLORS.secondary, paymentMode:"UPI",         hasWarranty:false },
];

function useLocalStorage(key, seed) {
  const [val, setVal] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : seed;
    } catch { return seed; }
  });
  const set = (v) => {
    const next = typeof v === "function" ? v(val) : v;
    setVal(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  };
  return [val, set];
}

// ─── Income Add/Edit Modal ────────────────────────────────────────────────────
function IncomeModal({ onClose, onSave, editing, banks }) {
  const SOURCES = ["Salary","Freelancing","Rental","Business","Dividend","Interest","Bonus","Gift","Other"];
  const ICONS   = { Salary:"💼", Freelancing:"💻", Rental:"🏠", Business:"🏢", Dividend:"📈", Interest:"🏦", Bonus:"🎁", Gift:"🎀", Other:"💰" };
  const SCOLORS = { Salary:COLORS.primary, Freelancing:COLORS.secondary, Rental:COLORS.accent, Business:"#06B6D4", Dividend:"#8B5CF6", Interest:"#F59E0B", Bonus:"#10B981", Gift:"#EC4899", Other:COLORS.textMuted };
  const [form, setForm] = useState(editing || { date: new Date().toISOString().split("T")[0], source:"Salary", amount:"", note:"" });
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
            <select value={form.bankId||""} onChange={e=>setForm(p=>({...p,bankId:e.target.value}))} style={iStyle}>
               <option value="">No Bank selected</option>
               {(banks||[]).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, color:COLORS.textMuted, display:"block", marginBottom:5 }}>NOTE / DESCRIPTION</label>
            <input type="text" placeholder="e.g. Infosys June salary, freelance project..." value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} style={iStyle} />
          </div>
          <button onClick={() => { if(valid){ onSave({ ...form, amount:parseFloat(form.amount), icon:ICONS[form.source]||"💰", color:SCOLORS[form.source]||COLORS.textMuted }); onClose(); }}} disabled={!valid} style={{ padding:"13px", borderRadius:12, border:"none", background:valid?`linear-gradient(135deg,${COLORS.secondary},#059669)`:"rgba(255,255,255,0.08)", color:valid?"#fff":COLORS.textMuted, fontSize:14, fontWeight:700, cursor:valid?"pointer":"not-allowed", marginTop:4 }}>
            {editing ? "Update Income" : "Save Income"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Live Income View ─────────────────────────────────────────────────────────
function IncomeViewLive({ incomes, setIncomes, filter, banks }) {
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

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

  const handleSave = (data) => {
    if (editing) {
      setIncomes(p => p.map(i => i.id===editing.id ? {...data, id:editing.id} : i));
    } else {
      setIncomes(p => [{...data, id:"i"+Date.now()}, ...p]);
    }
    setEditing(null);
  };

  const handleDelete = (id) => { setIncomes(p=>p.filter(i=>i.id!==id)); setConfirmDel(null); };

  const MS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtDate = d => { const dt=new Date(d); return `${dt.getDate()} ${MS[dt.getMonth()]} ${dt.getFullYear()}`; };

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

      {filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"40px 20px", color:COLORS.textMuted }}>
          <div style={{ fontSize:32, marginBottom:10 }}>📭</div>
          <div style={{ fontSize:14, color:COLORS.text }}>No income entries for this period</div>
          <button onClick={()=>setShowModal(true)} style={{ marginTop:14, padding:"9px 20px", borderRadius:12, border:"none", background:`${COLORS.secondary}22`, color:COLORS.secondary, fontSize:13, cursor:"pointer" }}>➕ Add your first income</button>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filtered.map(inc => (
            <div key={inc.id} style={{ background:COLORS.bgCard, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:"12px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:`${inc.color}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{inc.icon}</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:COLORS.text }}>{inc.source}</div>
                    <div style={{ fontSize:10.5, color:COLORS.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{inc.note || "—"} · {fmtDate(inc.date)} · <span style={{color:COLORS.primary, fontWeight:700}}>{inc.trxNo}</span></div>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0, marginLeft:8 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:COLORS.secondary }}>+₹{inc.amount.toLocaleString("en-IN")}</div>
                  <button onClick={()=>{ setEditing(inc); setShowModal(true); }} style={{ background:`${COLORS.primary}22`, border:`1px solid ${COLORS.primary}44`, borderRadius:8, width:28, height:28, color:COLORS.primary, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>✏️</button>
                  <button onClick={()=>setConfirmDel(inc.id)} style={{ background:`${COLORS.danger}18`, border:`1px solid ${COLORS.danger}33`, borderRadius:8, width:28, height:28, color:COLORS.danger, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <IncomeModal banks={banks} onClose={()=>{ setShowModal(false); setEditing(null); }} onSave={handleSave} editing={editing} />}

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
function InsuranceView({ insurance, setInsurance, banks, creditCards, expenses }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [insFilter, setInsFilter] = useState("All");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({ name:"", provider:"", type:"Medical Insurance", icon:"🛡️", amount:"", coverage:"", cycle:"Annual", startDate:"", endDate:"", moreInfo:"", docLink:"", docName:"", docData:"", color:COLORS.primary, bankId:"" });

  const monthlyTotal = insurance ? insurance.reduce((a,s)=>{
    let m = s.amount;
    if(s.cycle==="Annual") m = m/12;
    if(s.cycle==="Quarterly") m = m/3;
    if(s.cycle==="Half-Yearly") m = m/6;
    return a+m;
  },0) : 0;
    const displayedInsurance = insFilter === "All" ? insurance : (insurance || []).filter(i => i.type === insFilter);

  const annualTotal = insurance ? insurance.reduce((a,s)=>{
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
      endDate: form.endDate || "" 
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
        <button onClick={() => { setEditItem(null); setForm({ name:"", provider:"", type:"Medical Insurance", icon:"🛡️", amount:"", coverage:"", cycle:"Annual", startDate: new Date().toISOString().split('T')[0], endDate:"", moreInfo:"", docLink:"", docName:"", docData:"", color:COLORS.primary }); setShowForm(true); }} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add Policy</button>
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
              <select value={form.bankId||""} onChange={e=>setForm({...form, bankId:e.target.value})} style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, padding: "8px 12px", color: COLORS.text, fontSize: 13, borderRadius: 8, width: "100%", outline: "none" }}>
                <option value="">Select Account</option>
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
              <label style={{ fontSize: 10, color: COLORS.textMuted }}>More Information</label>
              <input value={form.moreInfo} onChange={e=>setForm({...form, moreInfo: e.target.value})} placeholder="Policy No, Details, etc." style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
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
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleSave} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ background: "transparent", color: COLORS.textMuted, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            
            {editItem && (
              <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
                <button onClick={() => setForm({...form, status: form.status === "Paused" ? "Active" : "Paused"})} style={{ background: form.status === "Paused" ? "#10b981" : "#f59e0b", color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>
                  {form.status === "Paused" ? "▶ Resume" : "⏸ Pause"}
                </button>
                <button onClick={() => setDeleteConfirm({ item: editItem, step: 1 })} style={{ background: COLORS.danger, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Delete</button>
              </div>
            )}
          </div>
          </div>
          
          {editItem && (() => {
            const dues = getDueSubscriptions([editItem]);
            const payments = editItem.payments || [];
            return (
              <div style={{ flex: "1 1 35%", position: "sticky", top: 16, background: "rgba(0,0,0,0.15)", padding: 20, borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🧾</span> Payment Ledger
                </div>
                
                {payments.length === 0 && dues.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 8, opacity: 0.6 }}>
                    <div style={{ fontSize: 32 }}>📭</div>
                    <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>No payments yet</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, textAlign: "center", padding: "0 20px" }}>Policy premiums and upcoming dues will appear here.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
                    {dues.map((d, idx) => {
                      const bId = d.bankId;
                      const b = bId ? [...(banks||[]), ...(creditCards||[])].find(x => x.id === bId) : null;
                      const bankName = b ? b.name : "—";
                      return (
                        <div key={"due-"+idx} style={{ background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)", borderLeft: "4px solid #f59e0b", padding: "12px 16px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 18, background: "rgba(245, 158, 11, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⏳</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", letterSpacing: 0.5 }}>UPCOMING DUE</div>
                              <div style={{ fontSize: 11, color: COLORS.textMuted }}>{new Date(d.dueDate).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})} • {bankName}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>₹{parseFloat(d.amount).toLocaleString("en-IN")}</div>
                        </div>
                      );
                    })}
                    {[...payments].reverse().map((p, idx) => {
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
                              <div style={{ fontSize: 11, color: COLORS.textMuted }}>{new Date(p.date).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})} • {bankName}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>₹{parseFloat(p.amount).toLocaleString("en-IN")}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
          <div key={i} onClick={() => { setEditItem(s); setForm(s); setShowForm(true); }} style={{ background:"#1a2236",borderRadius:12,border:`1px solid ${COLORS.border}`,position:"relative",overflow:"hidden",cursor:"pointer", opacity: s.status==="Paused"?0.6:1 }}>
            <div style={{ position:"absolute",left:0,top:0,bottom:0,width:4,background:s.color }} />
            <div style={{ padding:12,paddingLeft:16 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                <div style={{ fontSize:20 }}>{s.icon}</div>
                <div style={{ fontSize:9,background:s.status==="Paused"?"#f59e0b33":"rgba(255,255,255,0.1)",padding:"2px 8px",borderRadius:12,color:s.status==="Paused"?"#f59e0b":COLORS.textMuted }}>{s.status==="Paused" ? "Paused" : s.cycle}</div>
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
function CreditCardsViewLive({ creditCards, setCreditCards, expenses }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeBreakup, setActiveBreakup] = useState(null);
  
  const [form, setForm] = useState({ name:"", network:"Visa", limit:"", billingDate:"15", color:COLORS.primary });

  const totalLimit = creditCards ? creditCards.reduce((s, c) => s + parseFloat(c.limit||0), 0) : 0;
  
  // Calculate total used
  const totalUsed = expenses ? expenses.filter(e => e.paymentMode === "Credit Card" && e.creditCardId).reduce((s, e) => s + parseFloat(e.amount||0), 0) : 0;
  const totalAvail = totalLimit - totalUsed;
  // Calculate global breakdown
  let globalDue = 0;
  let globalOverdue = 0;
  let globalCurrent = 0;
  
  const getBreakupData = (type) => {
    return (creditCards || []).map(cc => {
      const allTx = expenses ? expenses.filter(e => e.paymentMode === "Credit Card" && e.creditCardId === cc.id) : [];
      const today = new Date();
      const billDay = parseInt(cc.billingDate) || 1;
      let currentBillDate = new Date(today.getFullYear(), today.getMonth(), billDay);
      if (today.getDate() < billDay) currentBillDate.setMonth(currentBillDate.getMonth() - 1);
      let prevBillDate = new Date(currentBillDate);
      prevBillDate.setMonth(prevBillDate.getMonth() - 1);
      
      let amt = 0;
      allTx.forEach(t => {
        const txDate = new Date(t.date);
        if (type === "current" && txDate >= currentBillDate) amt += parseFloat(t.amount||0);
        else if (type === "due" && txDate >= prevBillDate && txDate < currentBillDate) amt += parseFloat(t.amount||0);
        else if (type === "overdue" && txDate < prevBillDate) amt += parseFloat(t.amount||0);
      });
      return { card: cc, amount: amt, date: cc.billingDate + "th" };
    }).filter(x => x.amount > 0);
  };

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
          <input type="number" min="1" max="31" value={form.billingDate} onChange={e=>setForm({...form, billingDate: e.target.value})} placeholder="Day of month (1-31)" style={{ background: "#0f172a", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", borderRadius: 8 }} />
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
      
      {editItem && (() => {
         const allTx = (expenses||[]).filter(e => e.paymentMode === "Credit Card" && e.bankId === editItem.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
         return (
            <div style={{ flex: "1 1 35%", position: "sticky", top: 16, background: "rgba(0,0,0,0.15)", padding: 20, borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🧾</span> Transaction Ledger
                </div>
                {allTx.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 8, opacity: 0.6 }}>
                    <div style={{ fontSize: 32 }}>📭</div>
                    <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>No transactions yet</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, textAlign: "center", padding: "0 20px" }}>Expenses made on this card will appear here.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                              <div style={{ fontSize: 11, color: COLORS.textMuted }}>{new Date(p.date).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})} • {bankName}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>₹{parseFloat(p.amount).toLocaleString("en-IN")}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
        <button onClick={() => { setEditItem(null); setForm({ name:"", network:"Visa", limit:"", billingDate:"15", color:COLORS.primary }); setShowForm(true); }} style={{ background: COLORS.primary, color: "#fff", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add Card</button>
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
          const usedAmt = expenses ? expenses.filter(e => e.paymentMode === "Credit Card" && e.creditCardId === cc.id).reduce((s, e) => s + parseFloat(e.amount||0), 0) : 0;
          const availAmt = (cc.limit||0) - usedAmt;
          const pct = Math.min(100, (usedAmt / (cc.limit||1))*100);
          
          const allTx = expenses ? expenses.filter(e => e.paymentMode === "Credit Card" && e.creditCardId === cc.id) : [];
          const recentTx = allTx.slice(0, 5);
          
          // Calculate billing cycles
          const today = new Date();
          const billDay = parseInt(cc.billingDate) || 1;
          
          let currentBillDate = new Date(today.getFullYear(), today.getMonth(), billDay);
          if (today.getDate() < billDay) {
            currentBillDate.setMonth(currentBillDate.getMonth() - 1);
          }
          
          let prevBillDate = new Date(currentBillDate);
          prevBillDate.setMonth(prevBillDate.getMonth() - 1);
          
          let currentAmt = 0;
          let dueAmt = 0;
          let overdueAmt = 0;
          
          allTx.forEach(t => {
            const txDate = new Date(t.date);
            if (txDate >= currentBillDate) currentAmt += parseFloat(t.amount||0);
            else if (txDate >= prevBillDate) dueAmt += parseFloat(t.amount||0);
            else overdueAmt += parseFloat(t.amount||0);
          });


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
                        <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}55` }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{t.storeName}</div>
                            <div style={{ fontSize: 10, color: COLORS.textMuted }}>{t.date} • {t.cat}</div>
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
    </div>
  );
}

function ExpenseViewLive({ expenses, setExpenses, filter, subscriptions, setSubscriptions, insurance, setInsurance, investments, setInvestments, loans, setLoans, creditCards, banks }) {
  const [catFilter, setCatFilter] = useState("All");
  const [showAdd,   setShowAdd]   = useState(false);
  const [payingEmi, setPayingEmi] = useState(null);
  const [emiForm, setEmiForm] = useState({ date: "", amount: "", principal: "", interest: "" });
  const [editing,   setEditing]   = useState(null);
  
  const [payingSub, setPayingSub] = useState(null);
  const [deletingExp, setDeletingExp] = useState(null);
  const [payingInv, setPayingInv] = useState(null);
  const dueInv = investments ? getDueInvestments(investments) : [];
  const dueEmi = loans ? getDueEMIs(loans) : [];
  
  const handlePayInvConfirm = () => {
    if (!payingInv) return;
    const inv = payingInv.inv;
    
    // Log expense
    setExpenses(p => [{ id: "e" + Date.now(), title: inv.name + (inv.cycle==="One-Time"?" (Lumpsum)":" (Installment)"), amount: parseFloat(payingInv.amount), date: payingInv.date, category: "Investment", icon: inv.icon, color: inv.color, bankId: inv.bankId || "", paymentMode: inv.bankId ? "Net Banking" : "UPI" }, ...p]);
    
    // Log payment in investment
    setInvestments(p => p.map(s => {
      if (s.id === inv.invId) {
        return { ...s, payments: [...(s.payments||[]), { date: payingInv.date, amount: parseFloat(payingInv.amount) }] };
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
                           const nExp = { id: "e" + Date.now(), date: emiForm.date, storeName: emi.bank, productName: emi.name + " EMI", cat: "EMI", amount: a, icon: "🏠", color: COLORS.danger, paymentMode: "Net Banking", bankId: emi.bankId || "" };
                           setExpenses(p => [nExp, ...p]);
                           setLoans(p => p.map(l => l.id === emi.loanId ? { ...l, payments: [...(l.payments||[]), { date: emi.dueDate, payDate: emiForm.date, amount: a, principal: pr, interest: int }] } : l));
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
            {dueSubs.map(sub => (
              <div key={sub.subId + "-" + sub.dueDate} style={{ background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{sub.icon} {sub.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>Cycle: {sub.cycle}   Due: {fmtDate(sub.dueDate)}</div>
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
                    <button onClick={() => setPayingSub({ sub, date: sub.dueDate, amount: sub.amount })} style={{ background: COLORS.danger, color: "#fff", border: "none", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Pay Now</button>
                  )}
                </div>
              </div>
            ))}
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
                <div style={{ fontSize:14, fontWeight:600, color:COLORS.text }}>{t.vendor || t.storeName || t.title}</div>
                <div style={{ fontSize:12, color:COLORS.textMuted }}>
                  {t.cat || t.category} • {fmtDate(t.date)}
                  {t.bankId && banks && banks.find(b => b.id === t.bankId) ? " • " + banks.find(b => b.id === t.bankId).name : ""}
                  {t.creditCardId && creditCards && creditCards.find(c => c.id === t.creditCardId) ? " • " + creditCards.find(c => c.id === t.creditCardId).bank : ""}
                  {!t.bankId && !t.creditCardId && t.paymentMode ? " • " + t.paymentMode : ""}
                  {t.trxNo ? " • " : ""}
                  <span style={{color:COLORS.primary, fontWeight:700}}>{t.trxNo}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize:16, fontWeight:700, color:COLORS.danger }}>-₹{parseFloat(t.amount||0).toLocaleString("en-IN")}</div>
              <button onClick={(e) => { e.stopPropagation(); setDeletingExp(t.id); }} style={{ background:"transparent", border:"none", cursor:"pointer", padding:0, fontSize:16 }} title="Delete Expense">🗑️</button>
            </div>
          </div>
        ))}
        {filtered.length===0 && <div style={{ textAlign:"center", padding:30, color:COLORS.textMuted }}>No expenses found.</div>}
      </div>

      {deletingExp && (
        <ConfirmDialog 
          msg="Are you sure you want to delete this expense? This action cannot be undone." 
          onConfirm={() => {
            setExpenses(p => p.filter(e => e.id !== deletingExp));
            setDeletingExp(null);
          }} 
          onCancel={() => setDeletingExp(null)} 
        />
      )}
      {showAdd && (
        <AddExpenseModal banks={banks} creditCards={creditCards} onClose={() => setShowAdd(false)} onSave={(t) => {
          if (editing) setExpenses(p => p.map(x => x.id===editing.id ? {...x,...t} : x));
          else setExpenses(p => [{...t, id:"e"+Date.now()}, ...p]);
          setShowAdd(false);
        }} initialData={editing} />
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
function DashboardLive({ incomes, expenses, filter, creditCards }) {
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

  const invData=[{name:"Mutual Funds",value:140000,color:COLORS.primary},{name:"Stocks",value:80000,color:COLORS.accent},{name:"FD",value:60000,color:COLORS.secondary},{name:"Gold",value:40000,color:"#F59E0B"},{name:"PPF",value:20000,color:"#8B5CF6"}];
  const goals=[{label:"House 2029",pct:12,color:COLORS.primary},{label:"Car 2025",pct:65,color:COLORS.secondary},{label:"Retirement",pct:22,color:COLORS.accent},{label:"Emerg. Fund",pct:80,color:"#8B5CF6"}];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:11 }}>
        <KPICard label="Total Income"  value={totalIncome}  trend={0} trendLabel="" color={COLORS.secondary} sparkData={incSpark.length>1?incSpark:[0,totalIncome]} icon="↑" />
        <KPICard label="Total Expense" value={totalExpense} trend={0} trendLabel="" color={COLORS.danger}    sparkData={expSpark.length>1?expSpark:[0,totalExpense]} icon="↓" />
        <KPICard label="Net Savings"   value={netSavings}   trend={0} trendLabel="" color={netSavings>=0?COLORS.accent:COLORS.danger} sparkData={savSpark.length>1?savSpark:[0,netSavings]} icon="★" />
        <KPICard label="Savings Rate"  value={parseFloat(savingsRate)} prefix="" suffix="%" trend={0} trendLabel="" color={COLORS.primary} sparkData={[parseFloat(savingsRate)]} icon="⊕" />
        <KPICard label="Investments"   value={340000} trend={5.4} trendLabel="gain" color="#8B5CF6" sparkData={[260000,295000,310000,325000,340000,340000]} icon="◎" />
        <KPICard label="Net Worth"     value={1240000} trend={8.2} trendLabel="YoY" color={COLORS.primary} sparkData={[900000,980000,1050000,1100000,1180000,1240000]} icon="◈" />
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
          <div style={{ display:"flex", justifyContent:"center" }}><DonutChart data={invData} /></div>
          <div style={{ display:"flex", flexDirection:"column", gap:4, marginTop:6 }}>
            {invData.map(d=>(
              <div key={d.name} style={{ display:"flex", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:7,height:7,borderRadius:"50%",background:d.color }}/><span style={{ fontSize:10, color:COLORS.textMuted }}>{d.name}</span></div>
                <span style={{ fontSize:10, color:COLORS.text }}>₹{(d.value/1000).toFixed(0)}K</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:14 }}>
        <div style={{ background:COLORS.bgCard, borderRadius:16, padding:"16px 18px", border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:12 }}>Goal Progress</div>
          <div style={{ display:"flex", justifyContent:"space-around" }}>{goals.map(g=><CircularProgress key={g.label} pct={g.pct} color={g.color} label={g.label}/>)}</div>
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

const SUBS_SEED = [
  { id:"s1", name:"Netflix",        icon:"🎬", amount:649,  cycle:"Monthly", startDate: "2024-05-18", endDate: "", remarks: "Family account", color:"#E50914", category:"Entertainment", payments: [] },
  { id:"s2", name:"Amazon Prime",   icon:"📦", amount:1499, cycle:"Annual",  startDate: "2024-02-15", endDate: "", remarks: "Shopping + Video", color:"#FF9900", category:"Shopping",      payments: [] },
  { id:"s3", name:"Spotify",        icon:"🎵", amount:119,  cycle:"Monthly", startDate: "2024-05-22", endDate: "", remarks: "Duo plan", color:"#1DB954", category:"Music",         payments: [] },
  { id:"s4", name:"ChatGPT Plus",   icon:"🤖", amount:1674, cycle:"Monthly", startDate: "2024-05-15", endDate: "", remarks: "AI tools", color:"#10A37F", category:"Productivity",  payments: [] },
  { id:"s5", name:"Hotstar",        icon:"⭐", amount:299,  cycle:"Monthly", startDate: "2024-05-28", endDate: "", remarks: "Sports package", color:"#1C2CC1", category:"Entertainment", payments: [] },
  { id:"s6", name:"Google One",     icon:"☁️", amount:130,  cycle:"Monthly", startDate: "2024-05-20", endDate: "", remarks: "200GB storage", color:"#4285F4", category:"Storage",       payments: [] },
  { id:"s7", name:"Jio Saavn",      icon:"🎶", amount:99,   cycle:"Monthly", startDate: "2024-05-25", endDate: "", remarks: "Music streaming", color:"#E8173C", category:"Music",         payments: [] },
  { id:"s8", name:"Microsoft 365",  icon:"💼", amount:5899, cycle:"Annual",  startDate: "2023-12-05", endDate: "", remarks: "Office apps", color:"#0078D4", category:"Productivity",  payments: [] },
  { id:"s9", name:"Swiggy One",     icon:"🍔", amount:1199, cycle:"Annual",  startDate: "2023-08-10", endDate: "", remarks: "Free delivery", color:"#FC8019", category:"Food",          payments: [] },
  { id:"s10", name:"Zoom Pro",       icon:"📹", amount:1300, cycle:"Monthly", startDate: "2024-05-30", endDate: "", remarks: "Meetings", color:"#2D8CFF", category:"Productivity",  payments: [] },
  { id:"s11", name:"iCloud 200GB",   icon:"🍎", amount:75,   cycle:"Monthly", startDate: "2024-05-10", endDate: "", remarks: "Phone backup", color:"#999999", category:"Storage",       payments: [] },
  { id:"s12", name:"Udemy Business", icon:"📚", amount:1250, cycle:"Monthly", startDate: "2024-05-12", endDate: "", remarks: "Courses", color:"#A435F0", category:"Education",     payments: [] },
];

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
      
      const nextDateStr = nextDate.toISOString().split('T')[0];
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


const INSURANCE_SEED = [
  { id:"ins1", name:"HDFC Ergo Optima", provider:"HDFC Ergo", type:"Medical Insurance", amount:24000, cycle:"Annual", startDate:"2024-03-10", endDate:"", moreInfo:"Family Floater 10L", docLink:"", icon:"🏥", color:"#10B981", payments:[] },
  { id:"ins2", name:"LIC Jeevan Anand", provider:"LIC", type:"Life Insurance", amount:32000, cycle:"Annual", startDate:"2020-08-15", endDate:"", moreInfo:"Endowment plan", docLink:"", icon:"👨‍👩‍👧‍👦", color:"#F59E0B", payments:[] },
  { id:"ins3", name:"Bajaj Allianz Car", provider:"Bajaj Allianz", type:"Motor Insurance", amount:12500, cycle:"Annual", startDate:"2024-06-05", endDate:"", moreInfo:"Comprehensive Zero Dep", docLink:"", icon:"🚗", color:"#3B82F6", payments:[] },
];

const getDueInsurance = (insuranceList) => {
  if (!insuranceList) return [];
  const due = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  
  insuranceList.forEach(ins => {
    if (!ins.startDate) return;
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
      
      const nextDateStr = nextDate.toISOString().split('T')[0];
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


function BanksViewLive({ banks, setBanks, expenses, incomes }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({ name:"", type:"Savings", initialBalance:"", accountNumber:"", color:COLORS.primary });
  const [showPassbook, setShowPassbook] = useState(null);

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
        <button onClick={() => { setForm({ name:"", type:"Savings", initialBalance:"", accountNumber:"", color:COLORS.primary }); setEditItem(null); setShowForm(true); }} style={{ background:COLORS.primary, color:"#fff", border:"none", padding:"10px 16px", borderRadius:12, fontWeight:600, cursor:"pointer" }}>+ Add Bank</button>
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
                <select value={form.type} onChange={e=>setForm({...form, type:e.target.value})} style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, color:COLORS.text, padding:"10px 14px", borderRadius:10 }}>
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
            
            {editItem && (() => {
               const bInc = (incomes||[]).filter(i => i.bankId === editItem.id).map(x => ({...x, isInc: true}));
               const bExp = (expenses||[]).filter(e => e.bankId === editItem.id).map(x => ({...x, isInc: false}));
               const allTx = [...bInc, ...bExp].sort((a,b)=>new Date(b.date)-new Date(a.date));
               return (
                  <div style={{ flex: "1 1 40%", position: "sticky", top: 0, background: "rgba(0,0,0,0.15)", padding: 20, borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>🧾</span> Bank Ledger
                    </div>
                    {allTx.length === 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 8, opacity: 0.6 }}>
                        <div style={{ fontSize: 32 }}>📭</div>
                        <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>No transactions yet</div>
                        <div style={{ fontSize: 11, color: COLORS.textMuted, textAlign: "center", padding: "0 20px" }}>Incomes and Expenses for this bank will appear here.</div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{new Date(p.date).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})} • {p.isInc ? p.source : (p.category||p.paymentMode)}</div>
                                </div>
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: p.isInc ? COLORS.secondary : COLORS.text }}>{p.isInc?"+":""}₹{parseFloat(p.amount).toLocaleString("en-IN")}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
         <PassbookModal bank={banks.find(b => b.id === showPassbook)} incomes={incomes} expenses={expenses} onClose={() => setShowPassbook(null)} />
      )}
    </div>
  );
}

function PassbookModal({ bank, incomes, expenses, onClose }) {
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

  return (
    <div style={{ position:"fixed", top:0, right:0, bottom:0, zIndex:100, display:"flex", justifyContent:"flex-end", pointerEvents:"none" }}>
      <div style={{ pointerEvents:"auto", background:"#0F172A", width:500, height:"100vh", display:"flex", flexDirection:"column", borderLeft:`1px solid rgba(255,255,255,0.08)`, boxShadow:"-5px 0 25px rgba(0,0,0,0.5)" }}>
        {drillDown ? (
          <>
            <div style={{ padding:"24px", borderBottom:`1px solid rgba(255,255,255,0.08)`, display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(255,255,255,0.03)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <button onClick={() => setDrillDown(null)} style={{ background:"rgba(255,255,255,0.1)", border:"none", color:"#F1F5F9", cursor:"pointer", width:32, height:32, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
                <div style={{ fontSize:18, fontWeight:700, color:"#F1F5F9" }}>Transaction Details</div>
              </div>
              <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#94A3B8", cursor:"pointer", fontSize:24 }}>×</button>
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
            <div style={{ padding:"24px", borderBottom:`1px solid rgba(255,255,255,0.08)`, display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(255,255,255,0.03)" }}>
              <div>
                <div style={{ fontSize:18, fontWeight:700, color:"#F1F5F9" }}>📖 {bank.name} Passbook</div>
                <div style={{ fontSize:12, color:"#94A3B8", marginTop:4 }}>Initial Balance: ₹{(bank.initialBalance||0).toLocaleString("en-IN")}</div>
              </div>
              <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#94A3B8", cursor:"pointer", fontSize:24 }}>×</button>
            </div>
            
            <div style={{ flex:1, overflowY:"auto", padding:16 }}>
              {merged.length === 0 ? (
                <div style={{ textAlign:"center", padding:40, color:"#94A3B8" }}>No transactions found for this bank account.</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {merged.map((txn, i) => (
                    <div key={txn.id + i} onClick={() => setDrillDown(txn)} style={{ cursor:"pointer", display:"grid", gridTemplateColumns:"65px 1fr 75px 85px", gap:8, background:"rgba(255,255,255,0.03)", padding:"12px 14px", borderRadius:12, alignItems:"center", border:`1px solid rgba(255,255,255,0.06)`, transition:"background 0.2s" }} onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"} onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}>
                      <div style={{ fontSize:11, color:"#94A3B8" }}>{new Date(txn.date).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})}</div>
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
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ padding:"16px 24px", borderTop:`1px solid rgba(255,255,255,0.08)`, background:"rgba(0,0,0,0.2)", display:"flex", justifyContent:"flex-end" }}>
               <div style={{ fontSize:16, fontWeight:700, color:"#F1F5F9" }}>Current Balance: <span style={{ color:"#00C896" }}>₹{currentBalance.toLocaleString("en-IN")}</span></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}



export function getNextTrxNo(prefix, list) {
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

function FinPilotAI() {

  const [banks, setBanks] = useLocalStorage("fp_banks", []);
  const [active,     setActive]     = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  const [incomes,     setIncomes]     = useLocalStorage("fp_incomes",     SEED_INCOME);
  const [creditCards, setCreditCards] = useLocalStorage("fp_creditcards", SEED_CREDIT_CARDS);
  const [expenses,    setExpenses]    = useLocalStorage("fp_expenses",    SEED_EXPENSES);
  const [budgets,     setBudgets]     = useLocalStorage("fp_budgets",     BUDGET_SEED);
  const [investments, setInvestments] = useLocalStorage("fp_investments", INV_SEED);
  const [loans, setLoans] = useLocalStorage("fp_loans", LOANS_SEED);
  const [goals,       setGoals]       = useLocalStorage("fp_goals",       GOALS_SEED);
  const [subscriptions, setSubscriptions] = useLocalStorage("fp_subscriptions", SUBS_SEED);
  const [insurance, setInsurance] = useLocalStorage("fp_insurance", INSURANCE_SEED);

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
      case "dashboard":    return <DashboardLive incomes={incomes} expenses={expenses} filter={filter} creditCards={creditCards} />;
      case "income":       return <IncomeViewLive banks={banks} incomes={incomes} setIncomes={setIncomes} filter={filter} />;
      case "expense":      return <ExpenseViewLive banks={banks} expenses={expenses} setExpenses={setExpenses} filter={filter} subscriptions={subscriptions} setSubscriptions={setSubscriptions} insurance={insurance} setInsurance={setInsurance} investments={investments} setInvestments={setInvestments} loans={loans} setLoans={setLoans} creditCards={creditCards} />;
      case "budget":       return <BudgetViewLive expenses={expenses} budgets={budgets} setBudgets={setBudgets} filter={filter} />;
      case "investments":  return <InvestmentsViewLive investments={investments} setInvestments={setInvestments} goals={goals} banks={banks} creditCards={creditCards} />;
      case "goals":        return <GoalsViewLive goals={goals} setGoals={setGoals} />;
      case "emi":          return <EMIViewLive loans={loans} setLoans={setLoans} goals={goals} banks={banks} creditCards={creditCards} />;
            case "creditcards":  return <CreditCardsViewLive creditCards={creditCards} setCreditCards={setCreditCards} expenses={expenses} />;
      case "subscriptions":return <SubscriptionsView subscriptions={subscriptions} setSubscriptions={setSubscriptions} categoryMaster={[]} banks={banks} creditCards={creditCards} expenses={expenses} />;
      case "insurance":    return <InsuranceView insurance={insurance} setInsurance={setInsurance} banks={banks} creditCards={creditCards} />;
      case "banks":        return <BanksViewLive banks={banks} setBanks={setBanks} expenses={expenses} incomes={incomes} />;
      case "score":        return <HealthScoreView />;
      case "retirement":   return <RetirementView />;
      case "freedom":      return <FreedomCalcView />;
      case "reports":      return <ReportsViewLive incomes={incomes} expenses={expenses} filter={filter} />;
      case "ai": return (
        <div style={{ background:COLORS.bgCard, borderRadius:20, padding:"24px", border:`1px solid rgba(108,99,255,0.25)`, maxWidth:700, margin:"0 auto" }}>
          <div style={{ fontSize:18, fontWeight:700, color:COLORS.text, marginBottom:4 }}>✦ AI Financial Advisor</div>
          <div style={{ fontSize:12, color:COLORS.textMuted, marginBottom:20 }}>Ask anything about your finances — powered by Claude AI</div>
          <AIChatPanel />
        </div>
      );
      default: return (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:300, gap:16 }}>
          <div style={{ fontSize:48, opacity:0.3 }}>{NAV.find(n=>n.id===active)?.icon}</div>
          <div style={{ fontSize:18, fontWeight:600, color:COLORS.text }}>{NAV.find(n=>n.id===active)?.label}</div>
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
        input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus,textarea:-webkit-autofill,select:-webkit-autofill {
          -webkit-box-shadow:0 0 0 1000px #1a2236 inset!important; box-shadow:0 0 0 1000px #1a2236 inset!important;
          -webkit-text-fill-color:#F1F5F9!important; caret-color:#6C63FF!important; border-radius:9px!important;
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
        <Sidebar active={active} setActive={setActive} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
          <div style={{ padding:"11px 14px", borderBottom:`1px solid ${COLORS.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", backdropFilter:"blur(12px)", position:"sticky", top:0, zIndex:5, background:"rgba(15,23,42,0.92)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <button onClick={()=>setMobileOpen(true)} style={{ background:"rgba(255,255,255,0.07)", border:"none", borderRadius:9, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
                <span style={{ fontSize:17, color:COLORS.textMuted }}>≡</span>
              </button>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:COLORS.text }}>{NAV.find(n=>n.id===active)?.label}</div>
                <div style={{ fontSize:10, color:COLORS.textMuted, display:"flex", alignItems:"center", gap:5 }}>
                  {filterLabel(filter)} · Pradeep
                  <span style={{ background:`${COLORS.secondary}22`, color:COLORS.secondary, fontSize:9, padding:"1px 6px", borderRadius:10, border:`1px solid ${COLORS.secondary}33` }}>● LIVE</span>
                </div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ fontSize:11, color:COLORS.textMuted, background:"rgba(255,255,255,0.05)", padding:"5px 10px", borderRadius:20, border:`1px solid ${COLORS.border}`, whiteSpace:"nowrap" }}>
                Score: <span style={{ color:COLORS.secondary, fontWeight:700 }}>{Math.max(0,Math.min(100,liveScore))}</span>/100
              </div>
              <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg,${COLORS.primary},#8B5CF6)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>P</div>
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

module.exports = { InsuranceView };
