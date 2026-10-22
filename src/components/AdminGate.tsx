"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import RequireAuth from "./RequireAuth";
import { isAdmin } from "@/lib/auth";

/** Zeigt den Inhalt nur Admins. Der eigentliche Schutz sind die RLS-Policies in Supabase. */
function AdminCheck({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    isAdmin(userId)
      .then((ok) => !cancelled && setAdmin(ok))
      .catch(() => !cancelled && setAdmin(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (admin === null) return <p className="text-white/60">Prüfe Berechtigung…</p>;
  if (!admin) {
    return (
      <div className="rounded-2xl bg-panel p-6 text-white/80">
        <h2 className="mb-2 text-xl font-bold text-white">Kein Admin-Zugriff</h2>
        <p>Dieser Account ist nicht als Admin eingetragen. Im Supabase SQL Editor ausführen:</p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-stage p-3 text-sm">
          {`insert into public.admins (user_id) values ('${userId}');`}
        </pre>
      </div>
    );
  }
  return <>{children}</>;
}

export default function AdminGate({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AdminCheck>{children}</AdminCheck>
    </RequireAuth>
  );
}
