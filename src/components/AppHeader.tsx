"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { signOut } from "@/lib/auth";

export default function AppHeader({ children }: { children?: React.ReactNode }) {
  const { profile } = useAuth();
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/" className="text-2xl font-extrabold text-gold">
        Quiz Grid
      </Link>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {children}
        {profile && (
          <>
            <span className="font-semibold text-white/70">{profile.username}</span>
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-lg border border-white/20 px-3 py-1.5 hover:bg-white/10"
            >
              Abmelden
            </button>
          </>
        )}
      </div>
    </header>
  );
}
