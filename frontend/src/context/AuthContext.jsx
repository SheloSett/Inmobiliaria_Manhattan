import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('manhattan_token');
    if (token) {
      api.get('/auth/me')
        .then(r => setAdmin(r.data))
        .catch(() => localStorage.removeItem('manhattan_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    localStorage.setItem('manhattan_token', r.data.token);
    setAdmin(r.data.admin);
    return r.data;
  };

  const logout = () => {
    localStorage.removeItem('manhattan_token');
    setAdmin(null);
  };

  // Refresca en memoria los datos del admin (ej: tras editar el perfil en Ajustes),
  // así el nombre que se muestra en el sidebar queda actualizado sin volver a loguear.
  const updateAdmin = (data) => setAdmin(prev => ({ ...prev, ...data }));

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, updateAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
