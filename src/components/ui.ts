// Gemeinsame Tailwind-Klassen
export const inputClass = "w-full rounded-lg bg-stage px-3 py-2 outline-none ring-gold focus:ring-2";
export const primaryButton =
  "rounded-lg bg-gold px-4 py-2 font-bold text-stage transition hover:brightness-110 disabled:opacity-40";
export const secondaryButton =
  "rounded-lg border border-white/20 px-4 py-2 font-semibold transition hover:bg-white/10 disabled:opacity-40";

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String(e.message) : String(e);
}
