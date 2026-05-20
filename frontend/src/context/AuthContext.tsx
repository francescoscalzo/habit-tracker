import { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

const MOCK_SESSION = {
  access_token: 'dev',
  user: { id: 'dev-user', email: 'dev@local.test' },
} as unknown as Session;

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(DEV_MODE ? MOCK_SESSION : null);
  const [loading, setLoading] = useState(!DEV_MODE);

  useEffect(() => {
    if (DEV_MODE) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function logout() {
    if (DEV_MODE) {
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
