"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { errorMessage, inputClass, primaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { USERNAME_PATTERN, signUp } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkMail, setCheckMail] = useState(false);

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  async function submit() {
    const name = username.trim();
    if (!USERNAME_PATTERN.test(name)) {
      throw new Error("Benutzername: 3–20 Zeichen, nur Buchstaben, Ziffern und _.");
    }
    if (!(await api.usernameAvailable(name))) {
      throw new Error("Dieser Benutzername ist schon vergeben.");
    }
    const loggedIn = await signUp(email.trim(), password, name);
    if (!loggedIn) setCheckMail(true);
  }

  return (
    <main className="flex min-h-dvh flex-col gap-10 p-4 sm:p-6">
      <Link href="/" className="text-2xl font-extrabold text-gold">
        Quiz Grid
      </Link>
      {checkMail ? (
        <div className="mx-auto w-full max-w-sm rounded-2xl bg-panel p-6">
          <h1 className="mb-2 text-2xl font-extrabold">Fast geschafft</h1>
          <p className="text-white/80">
            Wir haben dir eine E-Mail an <b>{email}</b> geschickt. Klicke auf den Link darin, danach kannst du
            dich anmelden.
          </p>
        </div>
      ) : (
        <form
          className="mx-auto flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-panel p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await submit();
            } catch (err) {
              setError(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h1 className="text-2xl font-extrabold">Registrieren</h1>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Benutzername"
            autoComplete="nickname"
            required
            className={inputClass}
          />
          <p className="-mt-1 text-xs text-white/50">
            3–20 Zeichen, Buchstaben, Ziffern und _. Unter diesem Namen finden dich deine Freunde.
          </p>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-Mail"
            required
            className={inputClass}
          />
          <input
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort (mind. 6 Zeichen)"
            required
            className={inputClass}
          />
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? "Registrieren…" : "Registrieren"}
          </button>
          <p className="text-sm text-white/60">
            Schon einen Account?{" "}
            <Link href="/login" className="text-gold underline">
              Anmelden
            </Link>
          </p>
        </form>
      )}
    </main>
  );
}
