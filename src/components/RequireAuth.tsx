"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { isSupabaseConfigured } from "@/lib/supabase";

/** Zeigt den Inhalt nur Eingeloggten, sonst Weiterleitung zu /login. */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (session === null && isSupabaseConfigured()) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [session, pathname, router]);

  if (!isSupabaseConfigured()) {
    return (
      <p className="rounded-2xl bg-panel p-6 text-white/80">
        Supabase ist nicht konfiguriert. Lege eine <code>.env.local</code> nach Vorlage von{" "}
        <code>.env.example</code> an.
      </p>
    );
  }
  if (!session || !profile) return <p className="text-white/60">Lade…</p>;
  return <>{children}</>;
}
