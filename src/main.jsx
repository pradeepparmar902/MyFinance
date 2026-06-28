import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import FinPilotAI from './FinPilotAI.jsx'
import Auth from './Auth.jsx'
import { auth, db } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
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

          // Update user details
          await setDoc(userRef, {
            email: currentUser.email || "",
            phone: currentUser.phoneNumber || "",
            lastUsed: serverTimestamp()
          }, { merge: true });
          
          setUser(currentUser);
        } catch (err) {
          console.error("Auth sync error:", err);
          setUser(currentUser); // Fallback
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
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
