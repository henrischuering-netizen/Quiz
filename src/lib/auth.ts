import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export async function getSession(): Promise<Session | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session;
}

export function onSessionChange(callback: (session: Session | null) => void): () => void {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(
      error.message === "Invalid login credentials" ? "E-Mail oder Passwort ist falsch." : error.message,
    );
  }
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut();
}

/** Prüft, ob der eingeloggte Nutzer in public.admins steht. */
export async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
