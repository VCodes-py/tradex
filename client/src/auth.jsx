import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(Boolean(getToken()));

  const signOut = useCallback(() => { setToken(null); setUser(null); }, []);

  useEffect(() => {
    if (!getToken()) return;
    api.me().then((r) => setUser(r.user)).catch(signOut).finally(() => setBooting(false));
  }, [signOut]);

  useEffect(() => {
    window.addEventListener('tradex:unauthorized', signOut);
    return () => window.removeEventListener('tradex:unauthorized', signOut);
  }, [signOut]);

  const value = useMemo(() => ({
    user, booting, signOut,
    async signIn(mode, form) {
      const r = await (mode === 'register' ? api.register(form) : api.login(form));
      setToken(r.token);
      setUser(r.user);
    },
    async setBaseCurrency(baseCurrency) {
      const r = await api.updateMe({ baseCurrency });
      setUser(r.user);
    },
  }), [user, booting, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
