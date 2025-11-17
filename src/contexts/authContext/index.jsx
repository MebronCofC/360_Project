import React, { useContext, useState, useEffect } from "react";
import { auth } from "../../firebase/firebase";
import { upsertUserProfileInDB } from "../../firebase/firestore";
import { initMessagingForUser } from "../../firebase/messaging";
// import { GoogleAuthProvider } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

const AuthContext = React.createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [isEmailUser, setIsEmailUser] = useState(false);
  // Fixed: remove unused setter/state completely to silence ESLint
  const isGoogleUser = false;
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, initializeUser);
    return unsubscribe;
  }, []);

  function initializeUser(user) {
    if (user) {
      setCurrentUser({ ...user });

      // check if provider is email and password login
      const isEmail = user.providerData.some(
        (provider) => provider.providerId === "password"
      );
      setIsEmailUser(isEmail);

  // Google provider detection removed (state unused) – add back if enabling Google auth.

      setUserLoggedIn(true);
      // Ensure a user profile document exists/updates in Firestore for joins
      try {
        upsertUserProfileInDB(user);
      } catch (e) {
        console.warn("Failed to upsert user profile", e);
      }
      // Initialize push notifications and store device token
      try {
        initMessagingForUser(user.uid);
      } catch (e) {
        console.warn('Failed to init messaging for user', e);
      }
      // admin detection (normalize emails to avoid case/whitespace mismatches)
      const adminEmails = [
        'mebneon@gmail.com',
        'johnsonns@g.cofc.edu',
      ].map(e => e.trim().toLowerCase());
      const userEmail = (user.email || '').trim().toLowerCase();
      const isAdminUser = userEmail && adminEmails.includes(userEmail);
      setIsAdmin(!!isAdminUser);
    } else {
      setCurrentUser(null);
      setUserLoggedIn(false);
      setIsAdmin(false);
    }
    setLoading(false);
  }

  const value = {
    userLoggedIn,
    isEmailUser,
    isGoogleUser,
    isAdmin,
    currentUser,
    setCurrentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
