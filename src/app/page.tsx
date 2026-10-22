"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/components/AuthProvider";
import Dashboard from "@/components/Dashboard";
import RequireAuth from "@/components/RequireAuth";
import { isAdmin } from "@/lib/auth";

export default function Home() {
  const { session } = useAuth();
  const [admin, setAdmin] = useState(false);
  const userId = session?.user.id;

  useEffect(() => {
    if (userId) isAdmin(userId).then(setAdmin).catch(() => setAdmin(false));
  }, [userId]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <AppHeader>
        {admin && userId && (
          <Link href="/admin" className="text-white/70 underline hover:text-white">
            Fragen verwalten
          </Link>
        )}
      </AppHeader>
      <RequireAuth>
        <Dashboard />
      </RequireAuth>
    </main>
  );
}
