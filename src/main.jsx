import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import FinPilotAI from './FinPilotAI.jsx'
import Auth from './Auth.jsx'
import { auth, db } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let snapshotUnsubscribe = null;
    
    // Force login on new tab/instance (prevents direct bookmark access from skipping login)
    if (!sessionStorage.getItem('fp_tab_active')) {
      localStorage.clear();
      signOut(auth);
      sessionStorage.setItem('fp_tab_active', 'true');
    }

    const lastActive = localStorage.getItem('fp_last_active');
    const now = Date.now();
    
    // If inactive for more than 30 mins, force logout to clear stale local data
    if (lastActive && (now - parseInt(lastActive, 10) > 30 * 60 * 1000)) {
      localStorage.clear();
      signOut(auth);
    }
    
    localStorage.setItem('fp_last_active', Date.now().toString());

    const handleActivity = () => {
      localStorage.setItem('fp_last_active', Date.now().toString());
    };

    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);

    const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const snap = await getDoc(userRef);
          
          if (snap.exists() && snap.data().isBlocked) {
            alert("Your account has been blocked by the administrator.");
            await signOut(auth);
            setUser(null);
            setLoading(false);
            return;
          }

          // Session ID logic to prevent concurrent logins
          let localSessionId = localStorage.getItem('fp_session_id');
          if (!localSessionId) {
            localSessionId = Math.random().toString(36).substr(2, 9);
            localStorage.setItem('fp_session_id', localSessionId);
          }

          if (snap.exists()) {
            const data = snap.data();
            if (data.currentSessionId && data.currentSessionId !== localSessionId) {
              const choice = window.confirm("You are already logged in on another device.\n\nClick OK to log out the other device and continue here.\nClick Cancel to exit from this device.");
              if (!choice) {
                localStorage.clear();
                signOut(auth);
                setUser(null);
                setLoading(false);
                return;
              }
            }
          }

          // Update user details
          await setDoc(userRef, {
            email: currentUser.email || "",
            phone: currentUser.phoneNumber || "",
            lastUsed: serverTimestamp(),
            currentSessionId: localSessionId
          }, { merge: true });
          
          // Listen for concurrent logins
          if (snapshotUnsubscribe) snapshotUnsubscribe();
          snapshotUnsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.currentSessionId && data.currentSessionId !== localSessionId) {
                // Immediately hide the app content before the blocking alert
                document.body.innerHTML = "<div style='height: 100vh; display: flex; align-items: center; justify-content: center; background: #0B1120; color: #F8FAFC; font-family: sans-serif;'><h2>Session Expired</h2></div>";
                localStorage.clear();
                signOut(auth);
                setTimeout(() => {
                  alert("You have been logged out because your account was accessed from another device.");
                  window.location.reload();
                }, 100);
              }
            }
          });

          setUser(currentUser);
        } catch (err) {
          console.error("Auth sync error:", err);
          setUser(currentUser); // Fallback
        }
      } else {
        if (snapshotUnsubscribe) { snapshotUnsubscribe(); snapshotUnsubscribe = null; }
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      authUnsubscribe();
      if (snapshotUnsubscribe) snapshotUnsubscribe();
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0B1120", color: "#F8FAFC" }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  return user ? <FinPilotAI user={user} /> : <Auth />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
