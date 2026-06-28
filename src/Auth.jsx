import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPhoneNumber, 
  RecaptchaVerifier 
} from 'firebase/auth';

const COLORS = {
  bg: "#0B1120",
  card: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.08)",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  primary: "#3B82F6",
  secondary: "#8B5CF6",
  danger: "#EF4444"
};

export default function Auth() {
  const [method, setMethod] = useState("email"); // 'email' | 'phone'
  const [isLogin, setIsLogin] = useState(true); // true = sign in, false = sign up (for email)
  
  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    
    const cleanedCode = countryCode.trim();
    const cleanedNumber = phone.replace(/[\s-]/g, '');
    const fullPhone = cleanedCode + cleanedNumber;
    
    if (!cleanedCode.startsWith('+')) {
      return setError("Country code must start with '+' (e.g., +91).");
    }
    
    // For India (+91), ensure exactly 10 digits
    if (cleanedCode === '+91' && cleanedNumber.length !== 10) {
      return setError(`Indian mobile numbers must be exactly 10 digits. You entered ${cleanedNumber.length} digits.`);
    }

    setLoading(true);
    setError("");
    try {
      // Create reCAPTCHA only once, reuse if it already exists
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
        });
      }

      const confirmation = await signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
      // If there's an error (like too many requests or wrong format), 
      // we must reset the existing recaptcha so it can be used again.
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.render().then((widgetId) => {
          grecaptcha.reset(widgetId);
        }).catch(() => {
          // Fallback if reset fails
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return setError("Please enter the OTP.");
    setLoading(true);
    setError("");
    try {
      await confirmationResult.confirm(otp);
    } catch (err) {
      setError("Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(0,0,0,0.2)",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    color: COLORS.text,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box"
  };

  const buttonStyle = {
    width: "100%",
    padding: "12px",
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    opacity: loading ? 0.7 : 1,
    transition: "opacity 0.2s"
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.text, fontFamily: "Inter, sans-serif" }}>
      <div id="recaptcha-container"></div>
      
      <div style={{ width: "100%", maxWidth: 400, padding: 32, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 24, backdropFilter: "blur(20px)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, margin: "0 auto 16px", color: "#fff", boxShadow: `0 4px 20px ${COLORS.primary}40` }}>
            F
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>FinPilot AI</h1>
          <p style={{ margin: "8px 0 0", color: COLORS.textMuted, fontSize: 14 }}>Sign in to manage your finances</p>
        </div>

        {/* Method Toggle */}
        <div style={{ display: "flex", background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: 4, marginBottom: 24 }}>
          <button 
            onClick={() => { setMethod("email"); setConfirmationResult(null); setError(""); }}
            style={{ flex: 1, padding: "8px 0", background: method === "email" ? "rgba(255,255,255,0.1)" : "transparent", border: "none", borderRadius: 8, color: method === "email" ? COLORS.text : COLORS.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
            Email
          </button>
          <button 
            onClick={() => { setMethod("phone"); setError(""); }}
            style={{ flex: 1, padding: "8px 0", background: method === "phone" ? "rgba(255,255,255,0.1)" : "transparent", border: "none", borderRadius: 8, color: method === "phone" ? COLORS.text : COLORS.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
            Mobile OTP
          </button>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: `${COLORS.danger}22`, border: `1px solid ${COLORS.danger}44`, color: COLORS.danger, borderRadius: 8, fontSize: 13, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {method === "email" ? (
          <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>Email Address</label>
              <input type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>Password</label>
              <input type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} style={{ ...buttonStyle, marginTop: 8 }}>
              {loading ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
            </button>
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button type="button" onClick={() => setIsLogin(!isLogin)} style={{ background: "none", border: "none", color: COLORS.primary, fontSize: 13, cursor: "pointer", padding: 0 }}>
                {isLogin ? "Need an account? Sign Up" : "Already have an account? Sign In"}
              </button>
            </div>
          </form>
        ) : (
          <div>
            {!confirmationResult ? (
              <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>Mobile Number</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input type="text" value={countryCode} onChange={e => setCountryCode(e.target.value)} style={{ ...inputStyle, width: "80px", textAlign: "center", padding: "12px 8px" }} required />
                    <input type="tel" required placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                  </div>
                </div>
                <button type="submit" disabled={loading} style={{ ...buttonStyle, marginTop: 8 }}>
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>Enter OTP</label>
                  <input type="text" required placeholder="123456" value={otp} onChange={e => setOtp(e.target.value)} style={inputStyle} maxLength={6} />
                </div>
                <button type="submit" disabled={loading} style={{ ...buttonStyle, marginTop: 8 }}>
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </button>
                <div style={{ textAlign: "center", marginTop: 8 }}>
                  <button type="button" onClick={() => { setConfirmationResult(null); setOtp(""); }} style={{ background: "none", border: "none", color: COLORS.textMuted, fontSize: 13, cursor: "pointer", padding: 0 }}>
                    Change phone number
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
