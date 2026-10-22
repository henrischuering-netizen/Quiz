import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

export async function getSession(): Promise<Session | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session;
}

export function onSessionChange(callback: (session: Session | null) => void): () => void {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

function translate(message: string): string {
  if (message === "Invalid login credentials") return "E-Mail oder Passwort ist falsch.";
  if (message === "Email not confirmed") return "Bitte bestätige zuerst deine E-Mail-Adresse.";
  if (message === "User already registered") return "Für diese E-Mail gibt es schon einen Account.";
  if (message.includes("Password should be")) return "Das Passwort muss mindestens 6 Zeichen haben.";
  if (message.includes("Signups not allowed")) return "Registrierungen sind gerade deaktiviert.";
  return message;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw new Error(translate(error.message));
}

/** Gibt true zurück, wenn man direkt eingeloggt ist, false, wenn erst die E-Mail bestätigt werden muss. */
export async function signUp(email: string, password: string, username: string): Promise<boolean> {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: { data: { username }, emailRedirectTo: window.location.origin },
  });
  if (error) throw new Error(translate(error.message));
  return Boolean(data.session);
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
