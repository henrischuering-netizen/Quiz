import Link from "next/link";
import AdminEditor from "@/components/AdminEditor";
import AdminGate from "@/components/AdminGate";

export default function AdminPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-2xl font-extrabold text-gold">
          Quiz Grid
        </Link>
        <h1 className="text-lg font-semibold text-white/70">Fragen verwalten</h1>
      </header>
      <AdminGate>
        <AdminEditor />
      </AdminGate>
    </main>
  );
}
