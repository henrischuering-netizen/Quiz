import { rpc } from "./api";
import { getSupabase } from "./supabase";

export type Category = { id: string; name: string };
export type Question = {
  id: string;
  category_id: string;
  difficulty: number;
  question: string;
  answer: string;
};

/** Lädt alle Kategorien und Fragen samt Antworten (nur für Admins, siehe admin_list_questions). */
export async function loadAdminData(): Promise<{ categories: Category[]; questions: Question[] }> {
  const [cats, questions] = await Promise.all([
    getSupabase().from("categories").select("id, name").order("name"),
    rpc<Question[]>("admin_list_questions"),
  ]);
  if (cats.error) throw cats.error;
  return { categories: cats.data, questions };
}

// Ohne Rechte meldet Supabase bei update/delete keinen Fehler, sondern ändert einfach nichts.
// Deshalb zählen wir die betroffenen Zeilen. (questions.answer ist nicht lesbar, daher kein .select() danach.)
const NOT_ALLOWED = "Keine Berechtigung. Ist dein Account als Admin eingetragen?";

function check(error: unknown, count: number | null) {
  if (error) throw error;
  if (!count) throw new Error(NOT_ALLOWED);
}

export async function createCategory(name: string): Promise<Category> {
  const { data, error } = await getSupabase().from("categories").insert({ name }).select("id, name").single();
  if (error) throw error;
  return data;
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const { error, count } = await getSupabase().from("categories").update({ name }, { count: "exact" }).eq("id", id);
  check(error, count);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error, count } = await getSupabase().from("categories").delete({ count: "exact" }).eq("id", id);
  check(error, count);
}

export async function saveQuestion(q: Omit<Question, "id"> & { id?: string }): Promise<Question> {
  const db = getSupabase().from("questions");
  if (q.id) {
    const { error, count } = await db
      .update({ difficulty: q.difficulty, question: q.question, answer: q.answer }, { count: "exact" })
      .eq("id", q.id);
    check(error, count);
    return { ...q, id: q.id };
  }
  const created = { ...q, id: crypto.randomUUID() };
  const { error, count } = await db.insert(created, { count: "exact" });
  check(error, count);
  return created;
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error, count } = await getSupabase().from("questions").delete({ count: "exact" }).eq("id", id);
  check(error, count);
}
