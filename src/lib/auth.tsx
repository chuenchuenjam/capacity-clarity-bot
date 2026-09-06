import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "editor" | "viewer";

type AuthState = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const bootstrap = async (s: Session | null) => {
      if (!s?.user) {
        setRole(null);
        return;
      }
      const { data, error } = await supabase.rpc("bootstrap_current_user", {
        _email: s.user.email ?? "",
        _full_name: ((s.user.user_metadata?.["full_name"] as string | undefined) ?? ""),
      } as any);
      if (!active) return;
      if (error) {
        console.error("bootstrap failed", error);
        setRole("viewer");
        return;
      }
      setRole((data as AppRole) ?? "viewer");
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
      setTimeout(() => void bootstrap(s), 0);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
      void bootstrap(data.session);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      role,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
        setRole(null);
      },
    }),
    [session, role, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function canEdit(role: AppRole | null) {
  return role === "admin" || role === "editor";
}
