import AdminEditor from "@/components/AdminEditor";
import AdminGate from "@/components/AdminGate";
import AppHeader from "@/components/AppHeader";

export default function AdminPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-4 sm:p-6">
      <AppHeader>
        <span className="font-semibold text-white/70">Fragen verwalten</span>
      </AppHeader>
      <AdminGate>
        <AdminEditor />
      </AdminGate>
    </main>
  );
}
