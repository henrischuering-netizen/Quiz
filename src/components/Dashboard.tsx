"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, type Friend, type Invite, type Mode, type MyGame } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import { errorMessage, inputClass, primaryButton, secondaryButton } from "./ui";

const MODE_LABEL: Record<Mode, string> = { text: "Textmodus", voice: "Sprachmodus" };
const STATUS_LABEL: Record<MyGame["status"], string> = {
  lobby: "Lobby",
  board: "läuft",
  question: "läuft",
  round_end: "Rundenpause",
  finished: "beendet",
};

function UsernameEditor({ onError, onSaved }: { onError: (e: string) => void; onSaved: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  if (!profile) return null;

  if (!editing) {
    return (
      <p className="text-sm text-white/60">
        Dein Benutzername: <b className="text-white">{profile.username}</b>{" "}
        <button
          type="button"
          className="underline hover:text-white"
          onClick={() => {
            setName(profile.username);
            setEditing(true);
          }}
        >
          ändern
        </button>
      </p>
    );
  }
  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api.setUsername(name.trim());
          await refreshProfile();
          setEditing(false);
          onSaved();
        } catch (err) {
          onError(errorMessage(err));
        }
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} aria-label="Neuer Benutzername" />
      <button type="submit" className={primaryButton}>
        OK
      </button>
    </form>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [games, setGames] = useState<MyGame[]>([]);
  const [mode, setMode] = useState<Mode>("text");
  const [code, setCode] = useState("");
  const [friendName, setFriendName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [f, i, g] = await Promise.all([api.friends(), api.myInvites(), api.myGames()]);
      setFriends(f);
      setInvites(i);
      setGames(g);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    const db = getSupabase();
    const channel = db
      .channel("dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "game_invites" }, () => reload())
      .subscribe(() => reload());
    return () => {
      db.removeChannel(channel);
    };
  }, [reload]);

  async function run(action: () => Promise<void>, success?: string) {
    setError(null);
    setNotice(null);
    try {
      await action();
      if (success) setNotice(success);
      await reload();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const accepted = friends.filter((f) => f.status === "friend");
  const incoming = friends.filter((f) => f.status === "incoming");
  const outgoing = friends.filter((f) => f.status === "outgoing");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-6">
        {(error || notice) && (
          <p className={`rounded-lg p-3 text-sm ${error ? "bg-red-950/60 text-red-300" : "bg-green-950/60 text-green-300"}`}>
            {error ?? notice}
          </p>
        )}

        {invites.length > 0 && (
          <section className="rounded-2xl border-2 border-gold/60 bg-panel p-5">
            <h2 className="mb-3 text-xl font-bold">Einladungen</h2>
            <ul className="flex flex-col gap-2">
              {invites.map((i) => (
                <li key={i.game_id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <b>{i.host_username}</b> lädt dich ein ({MODE_LABEL[i.mode]})
                  </span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      className={primaryButton}
                      onClick={() =>
                        run(async () => {
                          await api.respondInvite(i.game_id, true);
                          router.push(`/game/${i.game_id}`);
                        })
                      }
                    >
                      Beitreten
                    </button>
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() => run(() => api.respondInvite(i.game_id, false))}
                    >
                      Ablehnen
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-2xl bg-panel p-5">
          <h2 className="mb-3 text-xl font-bold">Neues Spiel hosten</h2>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            {(["text", "voice"] as const).map((m) => (
              <label
                key={m}
                className={`cursor-pointer rounded-xl border-2 p-4 ${mode === m ? "border-gold bg-gold/10" : "border-white/10"}`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => setMode(m)}
                  className="sr-only"
                />
                <div className="font-bold">{MODE_LABEL[m]}</div>
                <div className="text-sm text-white/60">
                  {m === "text"
                    ? "Wer dran ist, tippt seine Antwort. Du siehst sie und bewertest."
                    : "Kein Textfeld: Antworten werden im Sprachchat gesagt, du bewertest per Klick."}
                </div>
              </label>
            ))}
          </div>
          <button
            type="button"
            className={primaryButton}
            onClick={() =>
              run(async () => {
                const id = await api.createGame(mode);
                router.push(`/game/${id}`);
              })
            }
          >
            Lobby erstellen
          </button>
        </section>

        <section className="rounded-2xl bg-panel p-5">
          <h2 className="mb-3 text-xl font-bold">Mit Code beitreten</h2>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!code.trim()) return;
              run(async () => {
                const id = await api.joinByCode(code);
                router.push(`/game/${id}`);
              });
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="z. B. K7QX2M"
              maxLength={6}
              className={`${inputClass} font-mono tracking-widest`}
            />
            <button type="submit" className={primaryButton}>
              Beitreten
            </button>
          </form>
        </section>

        {games.length > 0 && (
          <section className="rounded-2xl bg-panel p-5">
            <h2 className="mb-3 text-xl font-bold">Deine laufenden Spiele</h2>
            <ul className="flex flex-col gap-2">
              {games.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/game/${g.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stage px-4 py-3 hover:bg-white/10"
                  >
                    <span>
                      {g.is_host ? "Du hostest" : `Host: ${g.host_username}`} · {MODE_LABEL[g.mode]}
                    </span>
                    <span className="text-sm text-white/60">
                      {STATUS_LABEL[g.status]} · <span className="font-mono">{g.code}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className="flex flex-col gap-4 rounded-2xl bg-panel p-5">
        <UsernameEditor onError={setError} onSaved={() => setNotice("Benutzername geändert.")} />
        <h2 className="text-xl font-bold">Freunde</h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = friendName.trim();
            if (!name) return;
            run(async () => {
              await api.sendFriendRequest(name);
              setFriendName("");
            }, `Anfrage an ${name} gesendet.`);
          }}
        >
          <input
            value={friendName}
            onChange={(e) => setFriendName(e.target.value)}
            placeholder="Benutzername"
            className={inputClass}
          />
          <button type="submit" className={primaryButton}>
            +
          </button>
        </form>

        {incoming.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gold">Anfragen an dich</h3>
            <ul className="flex flex-col gap-2">
              {incoming.map((f) => (
                <li key={f.friendship_id} className="flex items-center justify-between gap-2">
                  <span>{f.username}</span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      className="rounded-lg bg-green-500 px-3 py-1 text-sm font-bold text-stage"
                      onClick={() => run(() => api.respondFriendRequest(f.friendship_id, true))}
                    >
                      Annehmen
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-sm text-white/60 hover:bg-white/10"
                      onClick={() => run(() => api.respondFriendRequest(f.friendship_id, false))}
                      aria-label={`Anfrage von ${f.username} ablehnen`}
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-sm font-semibold text-white/60">Freundesliste ({accepted.length})</h3>
          {accepted.length === 0 && <p className="text-sm text-white/50">Noch keine Freunde. Füge jemanden per Benutzername hinzu.</p>}
          <ul className="flex flex-col gap-1">
            {accepted.map((f) => (
              <li key={f.friendship_id} className="group flex items-center justify-between rounded-lg px-2 py-1 hover:bg-white/5">
                <span>{f.username}</span>
                <button
                  type="button"
                  className="hidden text-xs text-white/50 hover:text-red-300 group-hover:block"
                  onClick={() => confirm(`${f.username} aus der Freundesliste entfernen?`) && run(() => api.removeFriend(f.user_id))}
                >
                  entfernen
                </button>
              </li>
            ))}
          </ul>
        </div>

        {outgoing.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white/60">Gesendete Anfragen</h3>
            <ul className="flex flex-col gap-1">
              {outgoing.map((f) => (
                <li key={f.friendship_id} className="flex items-center justify-between px-2 text-sm text-white/60">
                  <span>{f.username}</span>
                  <button type="button" className="text-xs hover:text-red-300" onClick={() => run(() => api.removeFriend(f.user_id))}>
                    zurückziehen
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
