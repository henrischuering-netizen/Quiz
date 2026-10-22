// Beispielfragen: werden genutzt, wenn Supabase nicht konfiguriert ist,
// und dienen als Vorlage für supabase/seed.sql (npm run seed:sql).
// Pro Kategorie eine Frage je Schwierigkeit 1–4.
export const SAMPLE_DATA: { category: string; questions: [string, string][] }[] = [
  {
    category: "Geografie",
    questions: [
      ["Wie heißt die Hauptstadt von Frankreich?", "Paris"],
      ["Welcher ist der längste Fluss Deutschlands (innerhalb Deutschlands)?", "Der Rhein"],
      ["In welchem Land liegt die Atacama-Wüste?", "Chile"],
      ["Wie heißt die Hauptstadt von Kasachstan?", "Astana"],
    ],
  },
  {
    category: "Geschichte",
    questions: [
      ["In welchem Jahr fiel die Berliner Mauer?", "1989"],
      ["Wer war der erste Bundeskanzler der Bundesrepublik Deutschland?", "Konrad Adenauer"],
      ["In welchem Jahr begann die Französische Revolution?", "1789"],
      ["Wie hieß der letzte Kaiser des Weströmischen Reiches?", "Romulus Augustulus"],
    ],
  },
  {
    category: "Wissenschaft",
    questions: [
      ["Welches chemische Symbol hat Wasser?", "H₂O"],
      ["Welcher Planet ist der Sonne am nächsten?", "Merkur"],
      ["Wie viele Knochen hat ein erwachsener Mensch ungefähr?", "206"],
      ["Welches Element hat die Ordnungszahl 79?", "Gold (Au)"],
    ],
  },
  {
    category: "Sport",
    questions: [
      ["Wie viele Spieler hat eine Fußballmannschaft auf dem Feld?", "11"],
      ["In welcher Stadt fanden die Olympischen Sommerspiele 2016 statt?", "Rio de Janeiro"],
      ["Wie viele Punkte ist ein Touchdown im American Football wert?", "6"],
      ["Wer hält den Weltrekord über 100 m der Männer?", "Usain Bolt (9,58 s)"],
    ],
  },
  {
    category: "Film & Serien",
    questions: [
      ["Wie heißt der Zauberschüler mit der blitzförmigen Narbe?", "Harry Potter"],
      ["Welcher Film gewann 1998 den Oscar als bester Film und handelt von einem Schiffsunglück?", "Titanic"],
      ["Wie heißt der Chemielehrer in „Breaking Bad“?", "Walter White"],
      ["Wer führte Regie bei „Pulp Fiction“?", "Quentin Tarantino"],
    ],
  },
  {
    category: "Musik",
    questions: [
      ["Wie viele Saiten hat eine normale Gitarre?", "6"],
      ["Aus welchem Land stammt die Band ABBA?", "Schweden"],
      ["Wer komponierte „Die Zauberflöte“?", "Wolfgang Amadeus Mozart"],
      ["Wie hieß das Debütalbum der Beatles?", "Please Please Me"],
    ],
  },
  {
    category: "Tiere",
    questions: [
      ["Welches ist das größte Landtier der Welt?", "Der Afrikanische Elefant"],
      ["Wie viele Beine hat eine Spinne?", "8"],
      ["Welches Säugetier kann aktiv fliegen?", "Die Fledermaus"],
      ["Wie viele Herzen hat ein Oktopus?", "3"],
    ],
  },
  {
    category: "Essen & Trinken",
    questions: [
      ["Aus welchem Land stammt die Pizza?", "Italien"],
      ["Welche Frucht ist die Hauptzutat von Guacamole?", "Avocado"],
      ["Aus welcher Pflanze wird Tequila hergestellt?", "Blaue Agave"],
      ["Welches Gewürz ist das teuerste der Welt (nach Gewicht)?", "Safran"],
    ],
  },
  {
    category: "Technik",
    questions: [
      ["Wofür steht die Abkürzung „WWW“?", "World Wide Web"],
      ["Welches Unternehmen stellt das iPhone her?", "Apple"],
      ["Wie viele Bits hat ein Byte?", "8"],
      ["In welchem Jahr wurde die erste E-Mail verschickt?", "1971"],
    ],
  },
  {
    category: "Literatur",
    questions: [
      ["Wer schrieb „Faust“?", "Johann Wolfgang von Goethe"],
      ["Wer schrieb „Der kleine Prinz“?", "Antoine de Saint-Exupéry"],
      ["Wer schrieb den Roman „1984“?", "George Orwell"],
      ["In welcher Stadt spielt „Die Blechtrommel“ hauptsächlich?", "Danzig"],
    ],
  },
];
