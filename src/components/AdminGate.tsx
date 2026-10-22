"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getSession, isAdmin, onSessionChange, signIn, signOut } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

const input = "w-full rounded-lg bg-stage px-3 py-2 outline-none ring-gold focus:ring-2";

type Access = "loading" | "admin" | "noAdmin";

/** Zeigt den Inhalt nur eingeloggten Admins. Der eigentliche Schutz sind die RLS-Policies in Supabase. */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [access, setAccess] = useState<Access>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!configured) return;
    getSession().then(setSession);
    return onSessionChange(setSession);
  }, [configured]);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    isAdmin(userId)
      .then((ok) => !cancelled && setAccess(ok ? "admin" : "noAdmin"))
      .catch(() => !cancelled && setAccess("noAdmin"));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Ohne Supabase zeigt der Editor selbst den Hinweis zur Einrichtung.
  if (!configured) return <>{children}</>;

  if (session === undefined) return <p className="text-white/60">Lade…</p>;

  if (!session) {
    return (
      <form
        className="mx-auto flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-panel p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await signIn(email.trim(), password);
            setPassword("");
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="text-xl font-bold">Admin-Login</h2>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-Mail"
          required
          className={input}
        />
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passwort"
          required
          className={input}
        />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-gold px-4 py-2 font-bold text-stage disabled:opacity-50"
        >
          {busy ? "Anmelden…" : "Anmelden"}
        </button>
      </form>
    );
  }

  const bar = (
    <div className="flex items-center justify-end gap-3 text-sm text-white/60">
      <span>{session.user.email}</span>
      <button
        type="button"
        onClick={() => {
          setAccess("loading");
          signOut();
        }}
        className="rounded-lg border border-white/20 px-3 py-1.5 text-white hover:bg-white/10"
      >
        Abmelden
      </button>
    </div>
  );

  if (access === "loading") return <p className="text-white/60">Prüfe Berechtigung…</p>;

  if (access === "noAdmin") {
    return (
      <>
        {bar}
        <div className="rounded-2xl bg-panel p-6 text-white/80">
          <h2 className="mb-2 text-xl font-bold text-white">Kein Admin-Zugriff</h2>
          <p>
            Dieser Account ist nicht als Admin eingetragen. Im Supabase SQL Editor ausführen:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-stage p-3 text-sm">
            {`insert into public.admins (user_id) values ('${session.user.id}');`}
          </pre>
        </div>
      </>
    );
  }

  return (
    <>
      {bar}
      {children}
    </>
  );
}
