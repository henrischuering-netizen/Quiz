"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { errorMessage, inputClass, primaryButton } from "@/components/ui";
import { signIn } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) router.replace(next.startsWith("/") ? next : "/");
  }, [session, next, router]);

  return (
    <form
      className="mx-auto flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-panel p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await signIn(email.trim(), password);
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1 className="text-2xl font-extrabold">Anmelden</h1>
      <input
        type="email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="E-Mail"
        required
        className={inputClass}
      />
      <input
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Passwort"
        required
        className={inputClass}
      />
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={busy} className={primaryButton}>
        {busy ? "Anmelden…" : "Anmelden"}
      </button>
      <p className="text-sm text-white/60">
        Noch kein Account?{" "}
        <Link href="/register" className="text-gold underline">
          Registrieren
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col gap-10 p-4 sm:p-6">
      <Link href="/" className="text-2xl font-extrabold text-gold">
        Quiz Grid
      </Link>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
