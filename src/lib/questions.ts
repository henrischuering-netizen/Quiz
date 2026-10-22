import { getSupabase, isSupabaseConfigured } from "./supabase";
import { SAMPLE_DATA } from "./sampleQuestions";

export type Category = { id: string; name: string };
export type Question = {
  id: string;
  category_id: string;
  difficulty: number;
  question: string;
  answer: string;
};
export type QuestionPool = {
  categories: Category[];
  questions: Question[];
  source: "supabase" | "sample";
};

function samplePool(): QuestionPool {
  const categories: Category[] = [];
  const questions: Question[] = [];
  SAMPLE_DATA.forEach(({ category, questions: qs }, ci) => {
    const categoryId = `sample-${ci}`;
    categories.push({ id: categoryId, name: category });
    qs.forEach(([question, answer], qi) => {
      questions.push({
        id: `${categoryId}-${qi}`,
        category_id: categoryId,
        difficulty: qi + 1,
        question,
        answer,
      });
    });
  });
  return { categories, questions, source: "sample" };
}

/** Lädt alle Kategorien und Fragen; ohne Supabase-Konfiguration die Beispielfragen. */
export async function loadQuestionPool(): Promise<QuestionPool> {
  if (!isSupabaseConfigured()) return samplePool();
  const db = getSupabase();
  const [cats, qs] = await Promise.all([
    db.from("categories").select("id, name").order("name"),
    db.from("questions").select("id, category_id, difficulty, question, answer"),
  ]);
  if (cats.error) throw cats.error;
  if (qs.error) throw qs.error;
  return { categories: cats.data, questions: qs.data, source: "supabase" };
}

export async function createCategory(name: string): Promise<Category> {
  const { data, error } = await getSupabase()
    .from("categories")
    .insert({ name })
    .select("id, name")
    .single();
  if (error) throw error;
  return data;
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const { error } = await getSupabase().from("categories").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await getSupabase().from("categories").delete().eq("id", id);
  if (error) throw error;
}

export async function saveQuestion(q: Omit<Question, "id"> & { id?: string }): Promise<Question> {
  const db = getSupabase().from("questions");
  const { data, error } = q.id
    ? await db
        .update({ difficulty: q.difficulty, question: q.question, answer: q.answer })
        .eq("id", q.id)
        .select()
        .single()
    : await db.insert(q).select().single();
  if (error) throw error;
  return data;
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await getSupabase().from("questions").delete().eq("id", id);
  if (error) throw error;
}
