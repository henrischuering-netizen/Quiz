import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 p-6 text-center">
      <div>
        <h1 className="text-5xl font-extrabold tracking-tight text-gold sm:text-7xl">Quiz Grid</h1>
        <p className="mt-4 text-lg text-white/70">
          Kategorien wählen, buzzern, Punkte sammeln. Ein PC, alle Spieler.
        </p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/play"
          className="rounded-xl bg-gold px-8 py-4 text-xl font-bold text-stage transition hover:brightness-110"
        >
          Neues Spiel
        </Link>
        <Link
          href="/admin"
          className="rounded-xl border border-white/20 px-8 py-4 text-xl font-semibold transition hover:bg-white/10"
        >
          Fragen verwalten
        </Link>
      </div>
    </main>
  );
}
