import { createContext, useState, useEffect, useMemo } from 'react';
import axios from '../axios.js';

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ isAuthenticated: false, user: null });
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const response = await axios.get("/auth/me");
        setAuth(response.data);  // { isAuthenticated: true, user: {...} }
      } catch (error) {
        setAuth({ isAuthenticated: false, user: null });
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  const value = useMemo(() => ({ auth, setAuth, authLoading }), [auth, authLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}