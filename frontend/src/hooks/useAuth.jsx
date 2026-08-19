import { createContext, useContext, useEffect, useState } from 'react';
import { loginUser, loginWithGoogle, getMe, tokenKey } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(tokenKey);
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then(({ data }) => setUser(data))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await loginUser({ email, password });
    localStorage.setItem(tokenKey, data.access_token);
    setUser(data.user);
    return data;
  };

  const googleLogin = async (idToken) => {
    const { data } = await loginWithGoogle(idToken);
    localStorage.setItem(tokenKey, data.access_token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem(tokenKey);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);