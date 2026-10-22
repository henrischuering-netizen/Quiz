// Erzeugt supabase/seed.sql aus src/lib/sampleQuestions.ts.
// Aufruf: npm run seed:sql
import { writeFileSync } from "node:fs";
import { SAMPLE_DATA } from "../src/lib/sampleQuestions.ts";

const q = (s: string) => `'${s.replaceAll("'", "''")}'`;

const lines = ["-- Automatisch erzeugt mit `npm run seed:sql`", ""];
for (const { category, questions } of SAMPLE_DATA) {
  lines.push("with c as (");
  lines.push(`  insert into public.categories (name) values (${q(category)}) returning id`);
  lines.push(")");
  lines.push("insert into public.questions (category_id, difficulty, question, answer)");
  lines.push("select c.id, v.difficulty, v.question, v.answer from c, (values");
  lines.push(
    questions
      .map(([question, answer], i) => `  (${i + 1}, ${q(question)}, ${q(answer)})`)
      .join(",\n"),
  );
  lines.push(") as v (difficulty, question, answer);");
  lines.push("");
}

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), lines.join("\n"));
console.log("supabase/seed.sql geschrieben");
