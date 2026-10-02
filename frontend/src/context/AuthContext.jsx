import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId, token) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const authToken = token || (await supabase.auth.getSession()).data.session?.access_token;
      
      // 1. Consultar a través del backend (acceso administrativo a la base de datos sin bloqueo de RLS)
      if (authToken) {
        try {
          const res = await fetch(`${apiUrl}/api/auth/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.profile) {
              setProfile(json.profile);
              setLoading(false);
              return;
            }
          }
        } catch (apiErr) {
          console.warn('Backend API no disponible para perfil, usando consulta directa:', apiErr);
        }
      }

      // 2. Consulta directa a Supabase (fallback)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
      } else {
        const currentUser = (await supabase.auth.getUser()).data.user;
        const isMaster = (currentUser?.email || '').toLowerCase() === 'festudio.desarrollos@gmail.com';
        setProfile({
          id: userId,
          email: currentUser?.email || '',
          is_superuser: isMaster
        });
      }
    } catch (err) {
      console.error('Error al resolver perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id, session.access_token);
      else setLoading(false);
    });

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.access_token);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);