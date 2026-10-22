-- Automatisch erzeugt mit `npm run seed:sql`

with c as (
  insert into public.categories (name) values ('Geografie') returning id
)
insert into public.questions (category_id, difficulty, question, answer)
select c.id, v.difficulty, v.question, v.answer from c, (values
  (1, 'Wie heißt die Hauptstadt von Frankreich?', 'Paris'),
  (2, 'Welcher ist der längste Fluss Deutschlands (innerhalb Deutschlands)?', 'Der Rhein'),
  (3, 'In welchem Land liegt die Atacama-Wüste?', 'Chile'),
  (4, 'Wie heißt die Hauptstadt von Kasachstan?', 'Astana')
) as v (difficulty, question, answer);

with c as (
  insert into public.categories (name) values ('Geschichte') returning id
)
insert into public.questions (category_id, difficulty, question, answer)
select c.id, v.difficulty, v.question, v.answer from c, (values
  (1, 'In welchem Jahr fiel die Berliner Mauer?', '1989'),
  (2, 'Wer war der erste Bundeskanzler der Bundesrepublik Deutschland?', 'Konrad Adenauer'),
  (3, 'In welchem Jahr begann die Französische Revolution?', '1789'),
  (4, 'Wie hieß der letzte Kaiser des Weströmischen Reiches?', 'Romulus Augustulus')
) as v (difficulty, question, answer);

with c as (
  insert into public.categories (name) values ('Wissenschaft') returning id
)
insert into public.questions (category_id, difficulty, question, answer)
select c.id, v.difficulty, v.question, v.answer from c, (values
  (1, 'Welches chemische Symbol hat Wasser?', 'H₂O'),
  (2, 'Welcher Planet ist der Sonne am nächsten?', 'Merkur'),
  (3, 'Wie viele Knochen hat ein erwachsener Mensch ungefähr?', '206'),
  (4, 'Welches Element hat die Ordnungszahl 79?', 'Gold (Au)')
) as v (difficulty, question, answer);

with c as (
  insert into public.categories (name) values ('Sport') returning id
)
insert into public.questions (category_id, difficulty, question, answer)
select c.id, v.difficulty, v.question, v.answer from c, (values
  (1, 'Wie viele Spieler hat eine Fußballmannschaft auf dem Feld?', '11'),
  (2, 'In welcher Stadt fanden die Olympischen Sommerspiele 2016 statt?', 'Rio de Janeiro'),
  (3, 'Wie viele Punkte ist ein Touchdown im American Football wert?', '6'),
  (4, 'Wer hält den Weltrekord über 100 m der Männer?', 'Usain Bolt (9,58 s)')
) as v (difficulty, question, answer);

with c as (
  insert into public.categories (name) values ('Film & Serien') returning id
)
insert into public.questions (category_id, difficulty, question, answer)
select c.id, v.difficulty, v.question, v.answer from c, (values
  (1, 'Wie heißt der Zauberschüler mit der blitzförmigen Narbe?', 'Harry Potter'),
  (2, 'Welcher Film gewann 1998 den Oscar als bester Film und handelt von einem Schiffsunglück?', 'Titanic'),
  (3, 'Wie heißt der Chemielehrer in „Breaking Bad“?', 'Walter White'),
  (4, 'Wer führte Regie bei „Pulp Fiction“?', 'Quentin Tarantino')
) as v (difficulty, question, answer);

with c as (
  insert into public.categories (name) values ('Musik') returning id
)
insert into public.questions (category_id, difficulty, question, answer)
select c.id, v.difficulty, v.question, v.answer from c, (values
  (1, 'Wie viele Saiten hat eine normale Gitarre?', '6'),
  (2, 'Aus welchem Land stammt die Band ABBA?', 'Schweden'),
  (3, 'Wer komponierte „Die Zauberflöte“?', 'Wolfgang Amadeus Mozart'),
  (4, 'Wie hieß das Debütalbum der Beatles?', 'Please Please Me')
) as v (difficulty, question, answer);

with c as (
  insert into public.categories (name) values ('Tiere') returning id
)
insert into public.questions (category_id, difficulty, question, answer)
select c.id, v.difficulty, v.question, v.answer from c, (values
  (1, 'Welches ist das größte Landtier der Welt?', 'Der Afrikanische Elefant'),
  (2, 'Wie viele Beine hat eine Spinne?', '8'),
  (3, 'Welches Säugetier kann aktiv fliegen?', 'Die Fledermaus'),
  (4, 'Wie viele Herzen hat ein Oktopus?', '3')
) as v (difficulty, question, answer);

with c as (
  insert into public.categories (name) values ('Essen & Trinken') returning id
)
insert into public.questions (category_id, difficulty, question, answer)
select c.id, v.difficulty, v.question, v.answer from c, (values
  (1, 'Aus welchem Land stammt die Pizza?', 'Italien'),
  (2, 'Welche Frucht ist die Hauptzutat von Guacamole?', 'Avocado'),
  (3, 'Aus welcher Pflanze wird Tequila hergestellt?', 'Blaue Agave'),
  (4, 'Welches Gewürz ist das teuerste der Welt (nach Gewicht)?', 'Safran')
) as v (difficulty, question, answer);

with c as (
  insert into public.categories (name) values ('Technik') returning id
)
insert into public.questions (category_id, difficulty, question, answer)
select c.id, v.difficulty, v.question, v.answer from c, (values
  (1, 'Wofür steht die Abkürzung „WWW“?', 'World Wide Web'),
  (2, 'Welches Unternehmen stellt das iPhone her?', 'Apple'),
  (3, 'Wie viele Bits hat ein Byte?', '8'),
  (4, 'In welchem Jahr wurde die erste E-Mail verschickt?', '1971')
) as v (difficulty, question, answer);

with c as (
  insert into public.categories (name) values ('Literatur') returning id
)
insert into public.questions (category_id, difficulty, question, answer)
select c.id, v.difficulty, v.question, v.answer from c, (values
  (1, 'Wer schrieb „Faust“?', 'Johann Wolfgang von Goethe'),
  (2, 'Wer schrieb „Der kleine Prinz“?', 'Antoine de Saint-Exupéry'),
  (3, 'Wer schrieb den Roman „1984“?', 'George Orwell'),
  (4, 'In welcher Stadt spielt „Die Blechtrommel“ hauptsächlich?', 'Danzig')
) as v (difficulty, question, answer);
