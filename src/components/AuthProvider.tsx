"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSession, onSessionChange } from "@/lib/auth";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

type Profile = { id: string; username: string };

type AuthContextValue = {
  /** undefined, solange noch geladen wird */
  session: Session | null | undefined;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: undefined,
  profile: null,
  refreshProfile: async () => {},
});

async function fetchProfile(id: string): Promise<Profile | null> {
  const { data } = await getSupabase().from("profiles").select("id, username").eq("id", id).maybeSingle();
  return data;
}

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(
    isSupabaseConfigured() ? undefined : null,
  );
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    getSession().then(setSession);
    return onSessionChange(setSession);
  }, []);

  const userId = session?.user.id;
  const refreshProfile = useCallback(async () => {
    setProfile(userId ? await fetchProfile(userId) : null);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchProfile(userId).then((p) => !cancelled && setProfile(p));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <AuthContext.Provider value={{ session, profile: userId ? profile : null, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
