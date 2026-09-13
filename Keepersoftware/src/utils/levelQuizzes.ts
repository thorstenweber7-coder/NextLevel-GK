import { UserProfile } from '../types';
import { LEVELS_STRUCTURE_MINIMAL } from './levelTodos';

export interface LevelQuiz {
  id: string;
  level: number;
  question: string;
  answers: string[];
  correctAnswer: number;
  explanation: string;
  type: 'quiz';
}

export const LEVEL_QUIZZES: LevelQuiz[] = [
  // Level 1
  {
    id: 'quiz_lvl_1_1',
    level: 1,
    type: 'quiz',
    question: 'Welcher Wiederholungsbereich (Rep Range) ist primär darauf ausgelegt, deine maximale Nerv-Muskel-Ansteuerung und reine Maximalkraft aufzubauen?',
    answers: [
      'A) 12 bis 15 Wiederholungen mit leichtem Gewicht',
      'B) 3 bis 6 Wiederholungen mit hohem Gewicht (ca. 85-90% 1RM)',
      'C) 20 bis 25 Wiederholungen bis zum absoluten Ausbrennen',
      'D) Der Wiederholungsbereich ist egal, solange du dich danach müde fühlst'
    ],
    correctAnswer: 1,
    explanation: 'Um maximale Kraft aufzubauen, musst du dein zentrales Nervensystem (ZNS) fordern, möglichst viele Muskelfasern gleichzeitig zu rekrutieren. Das gelingt am effektivsten im Bereich von 3 bis 6 Wiederholungen mit hohem Gewicht. Höhere Wiederholungszahlen zielen eher auf Muskelhypertrophie (Aufbau) oder Kraftausdauer ab.'
  },
  {
    id: 'quiz_lvl_1_2',
    level: 1,
    type: 'quiz',
    question: 'Du willst als Nachwuchstorhüter Muskeln aufbauen und deine Regeneration optimieren. Was ist die wissenschaftlich fundierte Empfehlung für deine tägliche Proteinzufuhr?',
    answers: [
      'A) So viel wie möglich (über 4,0 g pro kg Körpergewicht), da mehr Eiweiß immer mehr Muskeln bedeutet',
      'B) Ca. 0,8 g pro kg Körpergewicht – das reicht auch für Leistungssportler völlig aus',
      'C) Ca. 2 g pro kg Körpergewicht, verteilt auf mehrere Mahlzeiten am Tag',
      'D) Proteine sind unwichtig; entscheidend für den Muskelaufbau sind ausschließlich Kohlenhydrate vor dem Training'
    ],
    correctAnswer: 2,
    explanation: 'Für den effektiven Muskelaufbau und die Gewebereparatur nach intensiven Einheiten benötigt ein Sportler etwa 1,6 bis 2,2 Gramm Protein pro Kilogramm Körpergewicht. Mehr bringt keinen zusätzlichen Nutzen, und zu wenig verlangsamt deine Regeneration spürbar.'
  },
  {
    id: 'quiz_lvl_1_3',
    level: 1,
    type: 'quiz',
    question: 'Warum ist es meist keine gute Idee, das Aufwärmprogramm (Warm-up) eines gestandenen Profitorhüters Eins-zu-Eins zu kopieren?',
    answers: [
      'A) Weil Profis sich grundsätzlich falsch aufwärmen, da sie nur Show machen wollen',
      'B) Weil Warm-ups individuell sind und stark von den Präferenzen einzelner Keeper abhängen.',
      'C) Weil Profi-Aufwärmprogramme gesetzlich urheberrechtlich geschützt sind',
      'D) Weil das Aufwärmen im Nachwuchsbereich komplett weggelassen werden sollte, um Energie zu sparen'
    ],
    correctAnswer: 1,
    explanation: 'Ein Warm-up dient nicht nur der allgemeinen Temperaturerhöhung, sondern bereitet deinen Körper gezielt auf die bevorstehende Belastung vor. Profis haben andere körperliche Voraussetzungen, Vorverletzungen und muskuläre Dysbalancen als ein Nachwuchs-Keeper. Dazu kommt, dass es das übergeordnete Gefühl ist, dass der Torwart sich absolut sicher fühlt, weshalb die Übungen sehr individuell sein können.'
  },

  // Level 2
  {
    id: 'quiz_lvl_2_1',
    level: 2,
    type: 'quiz',
    question: 'Welche Position nimmst du ein, wenn der Ball in die Flankenzone gespielt wird?',
    answers: [
      'A) Direkt am kurzen Pfosten (Pfosten-Kontakt), ca. 3m vor dem Tor.',
      'B) Mittig zwischen den Pfosten, umso näher der Ball zur Torauslinie desto höher stehen.',
      'C) Im vorderen Drittel des Tores (Richtung Ball), direkt auf der Torlinie.',
      'D) Zwei Schritte hinter dem langen Pfosten, ca. 4m von der Torauslinie entfernt.'
    ],
    correctAnswer: 1,
    explanation: 'Mittige und mutige Positionierungen sind in dieser Zone entscheidend, denn durch die mittige Positionierung kommst du in alle Richtungen, durch eine mutige Höhe kommst du an Flanken ran, die an den Fünfer geschlagen werden..'
  },
  {
    id: 'quiz_lvl_2_2',
    level: 2,
    type: 'quiz',
    question: 'Änderst du deine Position, wenn der Stürmer aus der Flankenzone der 16er Kante näherkommt?',
    answers: [
      'A) Ja, dann schiebe ich nach vorne (erstes Drittel).',
      'B) Ja, direkt an den Pfosten.',
      'C) Nein, ich bleibe mittig.',
      'D) Ja, ich schiebe weiter nach hinten.'
    ],
    correctAnswer: 0,
    explanation: 'Rund um die 16er Kante schieben wir nach vorne ins erste Drittel, um die torgefährlichere Zone abzudecken und die Distanz zu verkürzen, um beim eindringen in den 16er die Position erneut anzupassen!'
  },
  {
    id: 'quiz_lvl_2_3',
    level: 2,
    type: 'quiz',
    question: 'Du stehst 3m vor der Torlinie in einer mittigen Position. Eine Flanke segelt hoch in den Fünfmeterraum. Ein Stürmer läuft ein. Was ist deine oberste Priorität in dieser Zone?',
    answers: [
      'A) Auf die Linie gehen, um für den Kopfball vorbereitet zu sein, egal was kommt.',
      'B) Kommst du ran, attackiere den Ball am höchstmöglichen Punkt. Kommst du nicht ran, geh zurück auf die Linie.',
      'C) Den Stürmer wegblocken, damit er nicht köpfen kann.',
      'D) Den Ball erst nach dem Aufkommen sichern.'
    ],
    correctAnswer: 1,
    explanation: 'Nach der Kontrolle deines Impulses kannst du zum Ball, wenn du ran kommst oder eben nicht, wenn du nicht ran kommst.'
  },

  // Level 3
  {
    id: 'quiz_lvl_3_1',
    level: 3,
    type: 'quiz',
    question: 'Warum ist das Training der peripheren Wahrnehmung (das Sehen "aus dem Augenwinkel") für dich als Torwart wichtiger als der reine "Tunnelblick" auf den Ball?',
    answers: [
      'A) Damit man die Zuschauer auf der Tribüne besser im Blick hat.',
      'B) Um gleichzeitig den Ballführenden am Flügel und die einlaufenden Stürmer im Zentrum wahrzunehmen, ohne den Fokus vom Ball komplett zu verlieren.',
      'C) Peripheres Sehen hilft dabei, die Augenmuskulatur zu entspannen, damit man nach dem Spiel weniger müde ist.',
      'D) Man braucht es nur, um bei einem Rückpass den Schiedsrichter zu sehen.'
    ],
    correctAnswer: 1,
    explanation: 'In der Neuroathletik trainieren wir das visuelle System darauf, Informationen aus dem gesamten Sichtfeld zu verarbeiten. Wenn du nur den Ball fixierst ("Tunnelblick"), entgehen dir die Bewegungen der Gegenspieler in deinem Rücken. Ein gut trainiertes peripheres Sehvermögen erlaubt es dir, die Raumaufteilung schneller zu erfassen und Flanken effektiver abzufangen.'
  },
  {
    id: 'quiz_lvl_3_2',
    level: 3,
    type: 'quiz',
    question: 'Viele Profis nutzen im Training sogenannte "Strobe-Brillen" (Shutter-Brillen), die das Sichtfeld in kurzen Abständen unterbrechen. Welchen neuroathletischen Effekt wollen sie damit erzielen?',
    answers: [
      'A) Die Brille soll die Augen vor hellem Flutlicht schützen.',
      'B) Das Gehirn wird gezwungen, die "Lücken" in der visuellen Information durch Antizipation (Vorhersehung) der Flugbahn zu füllen.',
      'C) Es ist ein reines Konzentrationstraining, um zu lernen, trotz Ablenkung nicht zu blinzeln.',
      'D) Die Brille dient dazu, die Tiefenwahrnehmung komplett auszusschalten, um das Gehör zu trainieren.'
    ],
    correctAnswer: 1,
    explanation: 'Wenn das Bild "hackt", bekommt dein Gehirn weniger Daten. Es muss also lernen, aus wenigen Informationen die Flugbahn des Balls zu berechnen. Wenn du die Brille dann abnimmst, wirkt die normale Ballbewegung für dein Gehirn viel klarer und langsamer – deine Reaktionszeit verbessert sich massiv.'
  },
  {
    id: 'quiz_lvl_3_3',
    level: 3,
    type: 'quiz',
    question: 'Was ist das Ziel von Kognitionsspiele?',
    answers: [
      'A) Es soll prüfen, ob du in der Schule gut aufgepasst hast.',
      'B) Die Übung dient der Belastungssteuerung, um die Herzfrequenz zu senken.',
      'C) Es verbessert die Handlungsschnelligkeit, da das Gehirn massiv beansprucht wird.',
      'D) Es sorgt dafür, dass das Training mehr Spaß macht und weniger langweilig ist.'
    ],
    correctAnswer: 2,
    explanation: 'Durch Kognitionsspiele beanspruchst du verschiedene Bereich des Gehirns, die an der Informationswahrnehmung, -verarbeitung und Entscheidungsumsetzung beteiligt sind. Durch die Verbesserung der Gehirnleistungen, triffst du im Spiel in Sekundenbruchteilen die richtige taktische Entscheidung.'
  },

  // Level 4
  {
    id: 'quiz_lvl_4_1',
    level: 4,
    type: 'quiz',
    question: 'Freistoß aus ca. 22 Metern, zentrale Position. Warum ist es ein taktischer Fehler, eine "maximale Mauer" (z. B. 6-7 Spieler) zu stellen, um möglichst viel Torfläche abzudecken?',
    answers: [
      'A) Ab 5 Spielern in der Mauer muss der Schiedsrichter den Ball indirekt freigeben.',
      'B) Eine zu große Mauer nimmt dir komplett die Sicht auf den Ballstart und lässt zu viele Gegenspieler im Strafraum völlig unbewacht für Abstauber oder einlaufende Varianten.',
      'C) Die Mauer darf laut Regelwerk nie breiter sein als der Fünfmeterraum.',
      'D) Große Mauern springen seltener hoch, wodurch der Ball leichter unter der Mauer durchrutschen kann.'
    ],
    correctAnswer: 1,
    explanation: 'Dein wichtigstes Werkzeug ist die Sicht! Wenn du den Ball erst siehst, wenn er über die Mauer fliegt, ist es bei 22 Metern oft zu spät. Zudem fehlen dir bei einer 7-Mann-Mauer die Feldspieler im Sechzehner, um die restlichen Stürmer zu decken. 4 bis 5 Spieler reichen meist aus, um das kurze Eck zu schützen, während du den Rest "liest".'
  },
  {
    id: 'quiz_lvl_4_2',
    level: 4,
    type: 'quiz',
    question: 'Elfmeter-Duell: Du fixierst den Schützen. Welches körperliche Detail liefert dir kurz vor dem Schuss den verlässlichsten Hinweis darauf, in welche Ecke der Ball bei einem Elfmeter einschlagen wird?',
    answers: [
      'A) Die Blickrichtung des Schützen (er schaut immer dorthin, wo er hinschießt).',
      'B) Die Stellung des Standbeins und die Ausrichtung der Hüfte im Moment des Kicks.',
      'C) Die Höhe der Arme beim Anlaufen.',
      'D) Ob der Schütze mit der Innenseite oder dem Vollspann anläuft.'
    ],
    correctAnswer: 1,
    explanation: 'Profis täuschen mit den Augen, aber die Biomechanik lügt nur selten. Wenn du das liest, hast du den entscheidenden Vorteil beim Abdruck.'
  },
  {
    id: 'quiz_lvl_4_3',
    level: 4,
    type: 'quiz',
    question: 'Eckball von der rechten Seite (aus deiner Sicht). Ein Rechtsfuß tritt an (Ball dreht sich zum Tor hin). Wo ist deine optimale Positionierung?',
    answers: [
      'A) Direkt auf der Torlinie am kurzen Pfosten, um den direkten Einschlag zu verhindern.',
      'B) Etwa 2 bis 3 Meter vor der Torlinie in einer mittigen Position.',
      'C) An der Fünfmeterlinie, um maximal viel Raum attackieren zu können.',
      'D) Auf der Torlinie, da die Torgefahr hier zu groß wird.'
    ],
    correctAnswer: 1,
    explanation: 'Da der Ball sich zum Tor dreht, musst du proaktiv sein und dich etwas defensiver positionieren als sonst. Wenn du aber auf der Linie klebst, kommst du nie an den Ball, bevor ein Stürmer einköpft.'
  },

  // Level 5
  {
    id: 'quiz_lvl_5_1',
    level: 5,
    type: 'quiz',
    question: 'Du willst deine Explosivität beim Abdruck für Bälle in die oberen Ecken verbessern. Welches Trainingsprinzip ist für torwartspezifisches Schnellkraft- und Plyometrietraining entscheidend?',
    answers: [
      'A) Maximale Ermüdung: Mach so viele Sprünge am Stück, bis deine Beine komplett brennen.',
      'B) Maximale Qualität und lange Pausen: Kurze, hochintensive Serien (3–5 Wiederholungen) mit vollständiger Regeneration zwischen den Sätzen.',
      'C) Langsame Bewegungsausführung mit extrem hohen Gewichten auf den Schultern.',
      'D) Ausschließlich Ausdauertraining (z. B. 10-km-Läufe), um im Spiel nicht müde zu werden.'
    ],
    correctAnswer: 1,
    explanation: 'Explosivität wird über das zentrale Nervensystem und die schnell zuckenden Muskelfasern (FT-Fasern) gesteuert. Wenn du im ermüdeten Zustand trainierst, wirst du langsamer und schult dein Gehirn auf träge Bewegungsmuster um. Für echte Explosivität gilt: 100 % Intensität bei vollen Energiespeichern und ausreichend Pause zwischen den Sätzen!'
  },
  {
    id: 'quiz_lvl_5_2',
    level: 5,
    type: 'quiz',
    question: 'Bei Flanken oder tiefen Bällen entscheiden die ersten zwei Meter. Wie erzeugst du den schnellstmöglichen Antritt aus deiner Torwart-Grundstellung heraus?',
    answers: [
      'A) Du machst erst einen kleinen Zwischenschritt nach hinten, um Anlauf zu nehmen.',
      'B) Du bleibst auf den Ferse stehen und drückst dich aus dem flachen Fuß ab.',
      'C) Du senkst deinen Körperschwerpunkt leicht ab und drückst dich explosiv über den Vorfuß ab, ohne vorher aufzurichten.',
      'D) Du springst erst auf der Stelle hoch, um Dynamik zu bekommen.'
    ],
    correctAnswer: 2,
    explanation: 'Jede Ausholbewegung oder ein Ausfallschritt nach hinten ("Auftaktschritt") kostet wertvolle Zehntelsekunden. Ein tiefer Körperschwerpunkt auf dem Vorfuß ermöglicht es dir, die Bodenreaktionskraft sofort in eine Vorwärts- oder Seitwärtsbewegung umzusetzen.'
  },
  {
    id: 'quiz_lvl_5_3',
    level: 5,
    type: 'quiz',
    question: 'Welche Bedeutung hat die funktionelle Beweglichkeit (Mobilität) in der Hüfte für dein Torwartspiel bei flachen Bällen und in 1-gegen-1-Situationen?',
    answers: [
      'A) Keine – Hauptsache, die Oberschenkel sind stark genug.',
      'B) Eine hohe Hüftmobilität ermöglicht tiefere, stabilere Positionen (z. B. den Blocksitz) und schützt die Lendenwirbelsäule vor Verletzungen.',
      'C) Beweglichkeit ist nur für Feldspieler wichtig, da Torhüter meistens stehen oder liegen.',
      'D) Zu viel Beweglichkeit macht die Gelenke instabil, weshalb Torhüter die Hüfte möglichst steif halten sollten.'
    ],
    correctAnswer: 1,
    explanation: 'Wenn deine Hüfte blockiert ist, kannst du weder im 1-gegen-1 tief abtauchen noch bei flachen Bällen schnell den Fuß ausfahren. Eine mobile Hüfte erlaubt extreme Bewegungsausmaße ohne Kontrollverlust und sorgt dafür, dass die Knie und der untere Rücken nicht überlastet werden.'
  },

  // Level 6
  {
    id: 'quiz_lvl_6_1',
    level: 6,
    type: 'quiz',
    question: 'Ein gegnerischer Stürmer läuft alleine auf dein Tor zu. Es ist kein Abwehrspieler mehr in der Nähe, um Druck auszuüben. Wie verhältst du dich beim Rauslaufen taktisch richtig?',
    answers: [
      'A) Du rennst mit vollem Tempo blind auf den Stürmer zu, um ihm möglichst schnell zu stellen.',
      'B) Du wartest auf der Linie, bis der Stürmer im Fünfmeterraum ist, und gehst erst dann ins 1-gegen-1.',
      'C) Du lässt dich auf 6-7m vor der Linie fallen, wartest den Kontakt in den 16er ab und nutzt diesen Kontakt um vorzuschieben.',
      'D) Du bleibst auf der Strafraumgrenze stehen und drehst dich um, um deine Abwehr heranzurufen.'
    ],
    correctAnswer: 2,
    explanation: 'Wenn der Stürmer den Ball am Fuß hat, darfst du dich nicht mehr vorwärts bewegen – lass ihn kommen, sei geduldig und versuche durch gezielten Abschlussdruck einen Vorteil zu bekommen.'
  },
  {
    id: 'quiz_lvl_6_2',
    level: 6,
    type: 'quiz',
    question: 'Warum ist das absolute Feststehen ("Set-Position") im Moment des gegnerischen Schusses aus der Nahdistanz so entscheidend?',
    answers: [
      'A) Weil du in der Vorwärts- oder Seitwärtsbewegung eine viel längere Reaktionszeit hast und den Körper nicht stabil kontrollieren kannst.',
      'B) Weil der Schiedsrichter die Szene abpfeift, wenn sich der Torwart im Moment des Schusses bewegt.',
      'C) Weil es für die Zuschauer besser aussieht, wenn man wie eine Statue steht.',
      'D) Weil sich die zu verteidigende Torfläche vergrößert, wenn du dich bewegst.'
    ],
    correctAnswer: 0,
    explanation: 'In der Nahdistanz bleiben dir oft nur Sekundenbruchteile. Wenn deine Füße während des Schusses in der Luft sind oder du dich noch in eine Richtung bewegst, musst du erst deine Masse abbremsen, bevor du in die andere Richtung springen kannst. Wer fest steht, hat den Schwerpunkt zentral und kann in beide Seiten explosiv abdrücken.'
  },
  {
    id: 'quiz_lvl_6_3',
    level: 6,
    type: 'quiz',
    question: 'Der Stürmer dringt seitlich in den Sechzehner ein und legt sich den Ball etwas zu weit vor. Wie reagierst du in dieser spezifischen 1-gegen-1-Situation?',
    answers: [
      'A) Du bleibst starr auf der Torlinie stehen und wartest, ob der Ball ins Aus rollt.',
      'B) Du nutzt das Zeitfenster der unkontrollierten Ballabgabe, um dynamisch nach vorne zu schieben (Ballangriff oder Block).',
      'C) Du läufst rückwärts in dein Tor, um mehr Zeit zum Reagieren zu haben.',
      'D) Du versucht den Ball zu klären, in dem du raus stürmst und den Ball wegschlägst.'
    ],
    correctAnswer: 1,
    explanation: 'Sobald der Stürmer die direkte Kontrolle über den Ball verliert (z. B. durch einen zu weiten Touch), ist das dein Umschaltmoment! In diesem Zeitfenster kann er nicht schießen. Das ist die Chance, den Raum aggressiv zu schließen, den Ball wegzupflücken oder die Blockstellung einzunehmen.'
  },

  // Level 7
  {
    id: 'quiz_lvl_7_1',
    level: 7,
    type: 'quiz',
    question: 'Du führst ein komplexes Schrittmuster auf der Koordinationsleiter aus und musst gleichzeitig verschiedenfarbige Bälle fangen und deren Farbe laut rufen. Was ist der entscheidende trainingstaktische Vorteil dieser „Dual-Task“-Übung für dein Spiel?',
    answers: [
      'A) Es verbessert primär die Maximalkraft in den Waden durch die ständige Gewichtsverlagerung.',
      'B) Es schult die Entkoppelung von Blickfeld und Fußarbeit, damit du trotz Gegnerdrucks am Boden den Kopf für das Spielgeschehen oben behältst.',
      'C) Die Übung dient dazu, die Herzfrequenz künstlich zu senken, um in Drucksituationen weniger zu schwitzen.',
      'D) Es geht darum, die Technik des Ballfangens zu vernachlässigen, um sich voll auf die Schrittfolge zu konzentrieren.'
    ],
    correctAnswer: 1,
    explanation: 'Im Spiel musst du dich blind im Raum bewegen können, während dein Fokus zu 100 % auf dem Ball und dem Gegner liegt. Wenn du lernen musst, kognitive Aufgaben (Farben rufen/Fangen) zu lösen, während deine Füße arbeiten, automatisierst du die Motorik. Nur so bleibt dein Kopf frei für die taktische Entscheidung.'
  },
  {
    id: 'quiz_lvl_7_2',
    level: 7,
    type: 'quiz',
    question: 'Dein Trainer stellt fest, dass du bei einer neuen, schwierigen Leiter-Übung sofort aus dem Rhythmus kommst und stolperst, sobald er dir einen Ball zuwirft. Was ist die neuro-didaktische Ursache für diesen Fehler?',
    answers: [
      'A) Dein Gleichgewichtssinn ist gestört, weil du zu viel auf dem Vorfuß stehst.',
      'B) Du bist nicht motiviert genug und lässt dich zu leicht ablenken.',
      'C) Das Schrittmuster ist noch nicht im Kleinhirn „automatisiert“; die zusätzliche kognitive Aufgabe führt zu einem „Datenstau“ (Cognitive Overload) im Gehirn.',
      'D) Deine Oberschenkelmuskulatur ist übersäuert, was die Signalübertragung ans Gehirn blockiert.'
    ],
    correctAnswer: 2,
    explanation: 'Solange eine Bewegung nicht perfekt automatisiert ist, braucht sie bewusste Rechenleistung im Großhirn. Kommt eine zweite Aufgabe (Ballfang) dazu, ist das Gehirn überfordert. Erst wenn das Muster „blind“ sitzt, werden Kapazitäten für die Wahrnehmung des Spiels frei. Die Bewegung ist also solange ein Koordinationstraining, solange du sie noch nicht perfekt beherrtscht.'
  },
  {
    id: 'quiz_lvl_7_3',
    level: 7,
    type: 'quiz',
    question: 'Während du eine Dual-Task-Übung im Torwarttraining absolvierst, achtet dein Trainer extrem auf deine Technik. Warum?',
    answers: [
      'A) Die Technik sollte gut beibehalten werden, damit das Training zielführend ist, denn es geht ja darum, eine gute Technik trotz Drucks zu haben.',
      'B) Die Technik muss während der Dual Task Aufgabe nochmal neu gelernt werden.',
      'C) Weil Technik an dieser Stelle ein unwichtiges Detail ist, mit dem der Trainer ablenken möchte.',
      'D) Um den Fokus mehr auf die Technik und weniger auf die kognitive Aufgabe zu verlagern.'
    ],
    correctAnswer: 0,
    explanation: 'Umso besser die Technik ist, desto besser kann man diese auch unter Druck einsetzen. Aber: Die Übungen sind dann effektiv, wenn die kognitive Aufgabe zu Schwierigkeiten führt. Läuft alles ohne Probleme, sollte man schnell die nächste Aufgabe machen.'
  },

  // Level 8
  {
    id: 'quiz_lvl_8_1',
    level: 8,
    type: 'quiz',
    question: 'Der Ball wird flach in die Querpasszone (seitlich nahe der Torauslinie) gespielt. Warum wechselst du in dieser Situation von der offenen in die geschlossene Stellung?',
    answers: [
      'A) Um den Schiedsrichter zu signalisieren, dass der Ball gleich im Aus ist.',
      'B) In der geschlossenen Stellung kannst du aktiv das Second Goal verteidgen, also den Raum nahe der Fünfmeterraumlinie..',
      'C) Damit du dich nach einem gegnerischen Torschuss schneller auf den Boden fallen lassen kannst.',
      'D) Um dem Stürmer den Rücken zuzudrehen und ihn dadurch zu verunsichern.'
    ],
    correctAnswer: 1,
    explanation: 'In der Querpasszone sinkt die direkte Torgefahr, weil die zu verteidigende Fläche des Tores sehr klein ist. Hierdurch bietet sich die Möglichkeit, auch den Raum zu verteidigen, also das Second Goal.'
  },
  {
    id: 'quiz_lvl_8_2',
    level: 8,
    type: 'quiz',
    question: 'Je näher der Ball in der Querpasszone an der Torauslinie ist, desto mutiger (höher/weiter vor dem kurzen Pfosten) darfst du dich positionieren. Warum ist diese Taktik richtig und kein unnötiges Risiko?',
    answers: [
      'A) Weil die Torgefahr für einen direkten Schuss immer kleiner wird.',
      'B) Weil du aus dieser Position den Ball direkt ins gegnerische Tor schießen kannst.',
      'C) Weil spekulieren auf das Second Goal hier die beste Lösung ist.',
      'D) Weil der Pfosten das Tor ja dann auch schützt.'
    ],
    correctAnswer: 0,
    explanation: 'Das ist reine Geometrie und Winkelverkleinerung! Aus spitzem Winkel nahe der Torauslinie ist ein direkter Treffer fast unmöglich. Die eigentliche Hauptgefahr ist der Rückpass/Querpass ins Zentrum.'
  },
  {
    id: 'quiz_lvl_8_3',
    level: 8,
    type: 'quiz',
    question: 'In der Querpasszone wirst du verleitet, frühzeitig in die Mitte zu hechten, weil du den Querpass erahnst. Warum ist Spekulieren in dieser Zone streng verboten?',
    answers: [
      'A) Weil Spekulieren vom Schiedsrichter mit einer Gelben Karte geahndet wird.',
      'B) Weil du bei der geschlossenen Stellung ohnehin nicht mehr springen kannst.',
      'C) Weil ein erfahrener Stürmer deine Gewichtsverlagerung erkennt und den Ball einfach frech in die kurze Ecke schiebt.',
      'D) Weil man nur bei Elfmetern spekulieren darf, aber niemals im laufenden Spiel.'
    ],
    correctAnswer: 2,
    explanation: 'Spekulieren heißt, dass du dein Gewicht vor dem Schuss/Pass bereits auf den langen Fuß verlagerst. Wenn der Stürmer das sieht oder einfach spontan auf die kurze Ecke schießt, bist du auf dem falschen Fuß erwischt und völlig chancenlos.'
  },

  // Level 9
  {
    id: 'quiz_lvl_9_1',
    level: 9,
    type: 'quiz',
    question: 'Warum ist es für die Abstimmung in der Defensive entscheidend, dass du und deine Mannschaft eine kurze, einheitliche Kommandosprache (z. B. "LEO", "DOPPELN", "DRUCK") nutzt?',
    answers: [
      'A) Weil der Schiedsrichter nur Wörter erlaubt, die im offiziellen DFB-Regelwerk stehen.',
      'B) Weil lange Erklärungen ("Pass auf den Mann links hinter dir auf!") im Spielstress zu lange dauern und das Gehirn deiner Mitspieler kurze Schlüsselwörter sofort in Handlungen umsetzt.',
      'C) Damit der gegnerische Trainer deine Taktik nicht versteht.',
      'D) Einheitliche Kommandos sind unwichtig; Hauptsache ist, dass du möglichst laut schreist.'
    ],
    correctAnswer: 1,
    explanation: 'Auf dem Platz entscheiden Bruchteile von Sekunden. Unter Hochbelastung kann dein Mitspieler keine verschachtelten Sätze verarbeiten. Kurze, einprägsame und vorab klar definierte Schlüsselwörter ("Klatsch", "Dreh", "Leo") lösen sofort eine automatisierte Bewegung aus, ohne dass der Feldspieler erst nachdenken muss.'
  },
  {
    id: 'quiz_lvl_9_2',
    level: 9,
    type: 'quiz',
    question: 'Dein Stürmer verliert im Aufbauspiel den Ball. Wie verhältst du dich als führungsstarker Torwart in dieser Situation?',
    answers: [
      'A) Du brüllst ihn lautstark an und beschwerst dich über den Ballverlust, damit er konzentrierter bleibt.',
      'B) Du sagst gar nichts, da der Stürmer weit weg von deinem Tor ist und Torhüter nur die Abwehr coachen sollten.',
      'C) Du kannst positiv unterstützen, weißt aber, dass der Spieler das aus der Distanz ohnehin nur schwer wahrnimmt.',
      'D) Du forderst ihn auf, ausgewechselt zu werden, weil Ballverluste nicht akzeptabel sind.'
    ],
    correctAnswer: 2,
    explanation: 'Coaching bedeutet nicht nur Korrektur, sondern Energie-Steuerung! Wenn du gute Aktionen – besonders Einsatzwille und Ballrückeroberungen – sofort positiv verstärkst, pushst du das Selbstbewusstsein deiner Mitspieler, sofern sie das hören. Ein Torwart, der nur meckert, zieht die Mannschaft runter; ein Torwart, der anfeuert und lobt, führt das Team. Aber: Als Torwart sollte man Wissen, wann man seine Mitspieler erreicht und wann man nur brüllt für das eigene Ego.'
  },
  {
    id: 'quiz_lvl_9_3',
    level: 9,
    type: 'quiz',
    question: 'Wie sieht die optimale Informationsdichte beim Coaching aus, wenn der Gegner einen Angriff über das Zentrum aufbaut?',
    answers: [
      'A) Ununterbrochenes Dauer-Coaching, damit jeder Feldspieler in jeder Sekunde weiß, wo er stehen muss.',
      'B) Gezielte, vorausschauende Anweisungen an die direkten Gegenspieler-Übergeber ("David, Linke Schulter!") kurz vor dem Anspiel.',
      'C) Völlige Stille, damit du dich ausschließlich auf deinen eigenen Stand und deine Parade konzentrieren kannst.',
      'D) Du coachst nur, wenn der Ball bereits auf dein Tor fliegt, um den Schützen abzulenken.'
    ],
    correctAnswer: 1,
    explanation: 'Dauerhaftes "Dauerfeuer" führt bei deinen Mitspielern zu Reizüberflutung – sie schalten deine Stimme irgendwann unbewusst ab ("Durchzugseffekt"). Effektives Coaching ist unterstützend und vorausschauend: Du gibst exakte, kurze Kommandos mit Namen genau im richtigen Moment, um Passwege zuzustellen oder Vororientierung zu geben.'
  },

  // Level 10
  {
    id: 'quiz_lvl_10_1',
    level: 10,
    type: 'quiz',
    question: 'Ein Stürmer legt sich den Ball in etwa 20 Metern Entfernung am Verteidiger vorbei und setzt ungehindert zum Fernschuss an. Welche Bewegung ist in diesem Moment taktisch richtig, um deine Chancen auf eine Parade zu maximieren?',
    answers: [
      'A) Ein aggressiver Sprint nach vorne, um den Winkel so weit wie möglich zu verkleinern.',
      'B) Ein schneller, kontrollierter Schritt nach hinten, um die Aktionszeit zu verlängern.',
      'C) Ein Sprung zur Seite, um sich schon in eine Ecke zu werfen, bevor der Ball geschlagen wird.',
      'D) Auf der Stelle stehen bleiben und die Arme nach oben strecken, ohne die Beine zu bewegen.'
    ],
    correctAnswer: 1,
    explanation: 'Aus der Fernschussdistanz ist der Winkel ohnehin schon relativ spitz oder das Tor gut abgedeckt. Wenn du nach vorne läufst, verringerst du deine Reaktionszeit extrem und wirst anfällig für Heber oder Bälle über dich hinweg. Indem du leicht nach hinten weichst, kaufst du dir wertvolle Millisekunden für deine Aktion.'
  },
  {
    id: 'quiz_lvl_10_2',
    level: 10,
    type: 'quiz',
    question: 'Was ist die Hauptfunktion des sogenannten Split-Steps?',
    answers: [
      'A) Präzisionsdruck wird erhöht, da wir Zeit für die Aktion gewinnen',
      'B) Die Reaktionszeit wird bedeutend größer',
      'C) Er soll den Stürmer optisch irritieren, damit er den Ball am Tor vorbeischießt.',
      'D) Der Step dient nur dazu, das Tor für den Angreifer zu vergrößern'
    ],
    correctAnswer: 0,
    explanation: 'Wir erhöhen unsere Zeit für eine ganze Aktion, wodurch der Präzisionsdruck der Angreifer erhöht wird.'
  },
  {
    id: 'quiz_lvl_10_3',
    level: 10,
    type: 'quiz',
    question: 'Bei verdeckten Fernschüssen (der Schütze schießt durch die Beine eines Verteidigers) ist die Sicht eingeschränkt. Wie passt du deine Grundstellung und dein Verhalten an?',
    answers: [
      'A) Du gehst tief in den Körperschwerpunkt, bleibst extrem fokussiert auf den Ballabgabepunkt und vermeidest spekulative Aktionen.',
      'B) Du springst zur Seite heraus, um am Verteidiger vorbeizuschauen, egal wo der Ball hingeschossen wird.',
      'C) Du rufst dem Verteidiger zu, er soll zur Seite springen, damit du freie Sicht hast.',
      'D) Du bleibst auf den Fersen stehen und wartest, bis der Ball den Verteidiger passiert hat.'
    ],
    correctAnswer: 0,
    explanation: 'Bei verdeckten Schüssen siehst du den Ball erst spät. Umso wichtiger ist eine tiefe, agile Grundstellung mit tieferem Schwerpunkt. Wenn du versuchst, seitlich hinter dem Verteidiger hervorzulinsen, verlagerst du dein Gewicht falsch und wirst auf dem falschen Fuß erwischt. Bleib zentral, behalte die Lücke im Blick und verlasse dich auf deine Reaktionsfähigkeit nach dem Split-Step!'
  },

  // Level 11
  {
    id: 'quiz_lvl_11_1',
    level: 11,
    type: 'quiz',
    question: 'Beim tiefen Spielaufbau deiner Mannschaft bietet sich der Torwart als Anspielstation für die Innenverteidiger an. Warum ist es taktisch nicht klug, sich extrem nah an der eigenen Torauslinie anzubieten?',
    answers: [
      'A) Weil der Schiedsrichter Rückpässe nahe der Torauslinie als Abseits pfeifen kann.',
      'B) Wir bekommen vermutlich mehr Zeit, reduzieren gleichzeitig aber die Spielfortsetzungsgeschwindigkeit.',
      'C) Weil der Ball im Sechzehner nicht mit dem Fuß gespielt werden darf.',
      'D) Weil du von dort aus den Ball nicht mehr über die Mittellinie schlagen kannst.'
    ],
    correctAnswer: 1,
    explanation: 'Wer zu tief klebt, nimmt sich selbst die Dynamik bei der Spielfortsetzung! Finde eine Position, bei der du ausreichend Zeit für deine erste Aktion hast, aber auch eine schnelle Spielfortsetzung gewährleisten kannst.'
  },
  {
    id: 'quiz_lvl_11_2',
    level: 11,
    type: 'quiz',
    question: 'Welches Hauptziel verfolgst du mit der Technik des Seitvolleys (Abschlag aus der Hand seitlich aus der Hüfte gedreht) im Vergleich zum klassischen hohen Frontal-Abschlag?',
    answers: [
      'A) Der Seitvolley sorgt für eine flachere, extrem präzise und schnelle Flugbahn des Balls, wodurch Umschaltsituationen und Konter viel schneller eingeleitet werden können.',
      'B) Der Seitvolley fliegt doppelt so hoch in die Luft, damit die Feldspieler mehr Zeit haben, sich neu zu ordnen.',
      'C) Der Seitvolley wird genutzt, weil er weniger Kraft in den Beinen erfordert als ein normaler Stoßtritt.',
      'D) Er dient ausschließlich dazu, den gegnerischen Torwart durch eine artistische Bewegung zu beeindrucken.'
    ],
    correctAnswer: 0,
    explanation: 'Der Seitvolley ist das Präzisionsgewehr des Torwarts! Durch die seitliche Körperdrehung triffst du den Ball im Treffpunkt flacher und mit immenser Rotation. Der Ball fliegt scharf, schneidet den Wind besser und kommt für deinen mitlaufenden Stürmer oder Flügelspieler maßgeschneidert in den Lauf, ohne dass der Ball ewig in der Luft steht.'
  },
  {
    id: 'quiz_lvl_11_3',
    level: 11,
    type: 'quiz',
    question: 'Ein Innenverteidiger wird unter Druck gesetzt und spielt den Ball flach zu dir zurück. Wann nutzt du den neutralen Kontakt?',
    answers: [
      'A) Immer, da dieser alle Optionen ermöglicht.',
      'B) Wenn der Druck da ist, aber du mehrere ballnahe Anspielstationen hast. Damit kannst du direkt einen Mitspieler in allen Richtungen anspielen.',
      'C) Ein neutraler Kontakt ist nur gut, wenn gar kein Gegnerdruck da ist.',
      'D) Ich nehme den Ball immer zur Seite mit'
    ],
    correctAnswer: 1,
    explanation: 'Der neutrale Kontakt kann ein gutes Werkzeug für Kurzpassspiel sein.'
  },

  // Level 12
  {
    id: 'quiz_lvl_12_1',
    level: 12,
    type: 'quiz',
    question: 'Deine Mannschaft verliert in der gegnerischen Hälfte den Ball. Du stehst als mitspielender Torwart gut 20 Meter vor deinem Tor. Warum ist es taktisch falsch, beim Ballverlust sofort im Höchsttempo in den eigenen Fünfmeterraum zurückzurennen?',
    answers: [
      'A) Weil der Schiedsrichter ein Verlassen der Zone vor dem Strafraum als Unsportlichkeit wertet.',
      'B) Weil dein Körperschwerpunkt durch das Rückwärtslaufen komplett nach hinten verlagert wird und du bei einem schnellen tiefen Pass des Gegners nicht mehr nach vorne attackieren kannst.',
      'C) Weil du aus dem Fünfmeterraum heraus den Ball nicht mehr über die Mittellinie schlagen darfst.',
      'D) Weil du dich im Rückwärtslaufen schneller am Knöchel verletzen kannst.'
    ],
    correctAnswer: 1,
    explanation: 'Das ist eine reine Frage der Dynamik! Wenn du panisch nach hinten rennst, bewegt sich deine ganze Masse in Richtung eigenes Tor. Spielt der Gegner sofort den tödlichen Pass in die Schnittstelle, müsstest du deine Bewegung abstoppen, umkehren und nach vorne beschleunigen – das kostet dich wertvolle Sekunden. Bleibst du aufmerksam stehen, wartest du erste Aktion ab und machst danach ggf. kontrollierte, kleine Sicherungsschritte, kannst du sofort explosiv nach vorne sprinten, wenn ein tiefer Ball gespielt werden sollte!'
  },
  {
    id: 'quiz_lvl_12_2',
    level: 12,
    type: 'quiz',
    question: 'Du stehst hoch hinter deiner Kette und der Gegner erobert den Ball. Worauf wartest du in den ersten 1–2 Sekunden nach dem Umschaltmoment exakt, bevor du eine endgültige Entscheidung triffst?',
    answers: [
      'A) Du wartest darauf, dass dein Trainer dir von der Seitenlinie aus ein Signal gibt.',
      'B) Du wartest den ersten Kontakt des Balleroberers ab: Druck am Ball, Blickrichtung und Ballführung (spielt er tief oder muss er abdrehen?).',
      'C) Du wartest, bis der Ball ins Aus rollt, um durchzuatmen.',
      'D) Du wartest darauf, dass der Schiedsrichter auf Abseits entscheidet.'
    ],
    correctAnswer: 1,
    explanation: 'In den ersten Sekunden nach dem Ballverlust entscheidet sich alles am Gegnerkontakt: Hat der Gegenspieler sofort freien Blick und Raum für den Steilpass? Oder wird er von deinen Mitspielern direkt attackiert und muss abdrehen? Wenn du diesen Moment geduldig abwartest und die Lage liest, weißt du exakt, ob du nach vorne schieben und abfangen musst oder ob du Raum nach hinten absichern musst.'
  },
  {
    id: 'quiz_lvl_12_3',
    level: 12,
    type: 'quiz',
    question: 'Der Gegner spielt aus dem Mittelfeld einen scharfen Pass über deine aufgerückte Abwehrkette. Der Ball rollt etwa 22 Meter vor deinem Tor. Wie gehst du als mitspielender Keeper in diese Klärungsaktion außerhalb des Sechzehners?',
    answers: [
      'A) Du rennst mit den Händen voran zum Ball, um ihn knapp außerhalb des Sechzehners abzufangen.',
      'B) Du bleibst auf der Torlinie stehen und hoffst, dass dein Innenverteidiger den Stürmer noch einholt.',
      'C) Du schiebst entschlossen mit dem Fuß nach vorne, triffst eine klare Entscheidung ("Ball vor dem Stürmer klären") und versuchst eine bestmögliche Spielfortsetzung.',
      'D) Du grätschst den Stürmer um, bevor er an den Ball kommt.'
    ],
    correctAnswer: 2,
    explanation: 'Außerhalb des Sechzehners bist du ein ganz normaler Feldspieler – Handspiel bedeutet Rot! Wenn du dich entscheidest rauszugehen, muss diese Entscheidung 100 % klar und ohne Zögern sein. Vollstrecke die Klärungsaktion sauber mit dem Fuß und sichere den Ball im Idealfall zu einem freien Mitspieler oder schlage ihn im Zweifel konsequent ins Seitenaus.'
  },

  // Level 13
  {
    id: 'quiz_lvl_13_1',
    level: 13,
    type: 'quiz',
    question: 'Du kassierst in der 10. Minute durch einen unglücklichen Torwartfehler das 0:1. Wie kann dir vorher durchgeführtes Mentaltraining hier helfen?',
    answers: [
      'A) Du gehst gedanklich jede Phase der Szene durch, um noch auf dem Platz zu analysieren, was du technisch falsch gemacht hast.',
      'B) Du nutzt eine feste, physische Handlung (z. B. das Abwischen der Handschuhe, Klatschen an die Pfosten oder das Verrücken der Stutzen) als Signal für dein Gehirn: „Haken dran, nächste Aktion!“.',
      'C) Du beschwerst dich lautstark bei deinen Abwehrspielern, um die Verantwortung für das Gegentor von dir abzulenken.',
      'D) Du entschuldigst dich bei allen Mitspielern und versprichst, die nächsten 80 Minuten gar kein Risiko mehr einzugehen.'
    ],
    correctAnswer: 1,
    explanation: 'In der Psychologie nennt man das einen Anker oder ein Reset-Ritual. Wenn ein Fehler passiert, bringt ständiges Nachgrübeln ("Ruminieren") dich aus dem Moment. Eine kurze, bewusste physische Bewegung schließt die vergangene Szene metaphorisch ab. So signalisierst du deinem Nervensystem: Das war die Vergangenheit, jetzt zählt nur die nächste Parade! Hinweis: Dieses Werkzeug ist mächtig, funktioniert aber nur, wenn man es vorher unzählige Male trainiert hat.'
  },
  {
    id: 'quiz_lvl_13_2',
    level: 13,
    type: 'quiz',
    question: 'Kurz vor Spielstart nutzt du die Technik der Visualisierung. Wie kann dir das helfen?',
    answers: [
      'A) Du stellst dir ausschließlich vor, wie du nach dem Spiel von allen gefeiert wirst und den Pokal hochhältst, ohne an Spielszenen zu denken.',
      'B) Du stellst dir in Egoperspektive (aus deinen eigenen Augen) konkrete Spielsituationen vor: Wie du den Ball sicher fängst, lautstark steuerst und den Abdruck perfekt ausführst – inklusive aller Sinneseindrücke (Sound, Gefühl im Handschuh). Damit holst du dir noch mehr Sicherheit.',
      'C) Du visualisierst stundenlang nur deine Fehlversuche aus der Vergangenheit, um dich vor Ängsten zu schützen.',
      'D) Du stellst dir vor, dass der Gegner keinen einzigen Torschuss abgibt, damit du dich entspannen kannst.'
    ],
    correctAnswer: 1,
    explanation: 'Das Gehirn unterscheidet bei intensiv vorgestellten Bewegungen kaum zwischen Realität und Vorstellung! Durch detailliertes Visualisieren aus der First-Person-Perspektive (inklusive Bewegungsgefühl und Taktilität) aktivierst du dieselben Neuronenmuster wie auf dem Platz. Das baut Handlungssicherheit auf und senkt die Wettkampfangst oder Nervosität vor dem Anpfiff drastisch.'
  },
  {
    id: 'quiz_lvl_13_3',
    level: 13,
    type: 'quiz',
    question: 'Nach einer schlechten Halbzeit spürst du in der Kabine enorme Unruhe, Zweifel und Herzklopfen. Mit welcher einfachen atembezogenen Methode kannst du dein vegetatives Nervensystem innerhalb von 60 Sekunden beruhigen?',
    answers: [
      'A) Möglichst schnell und tief durch den Mund hecheln, um mehr Sauerstoff in die Lunge zu pumpen.',
      'B) Die Luft für 45 Sekunden komplett anhalten, bis der Kopf rot wird.',
      'C) Die "Box-Breathing"-Methode oder ein doppelt so altes Ausatmen wie Einatmen (z. B. 4 Sek. einatmen, 8 Sek. langsam ausatmen), um den Parasympathikus zu aktivieren.',
      'D) Laut herumschreien und gegen Taktiktafeln schlagen, um das Adrenalin abzubauen.'
    ],
    correctAnswer: 2,
    explanation: 'Deine Atmung ist die direkte Fernbedienung für dein Nervensystem. Wenn du länger und betont ruhig ausatmest als einatmest, aktivierst du den Parasympathikus (den "Ruhenerv"). Das senkt sofort deinen Puls, beruhigt zittrige Hände und stellt den klaren Tunnelblick für die zweite Halbzeit wieder her.'
  }
];

export function getUserLevelQuizzes(user: UserProfile | null): LevelQuiz[] {
  if (!user) return [];
  if (user.role === 'admin' || user.role === 'kraftsport') {
    return LEVEL_QUIZZES;
  }

  const modulePermissions = user.modulePermissions || {};
  const unlockedQuizzes: LevelQuiz[] = [];

  for (const lvl of LEVELS_STRUCTURE_MINIMAL) {
    if (lvl.level === 0) continue;
    const isLevelUnlocked = lvl.modules.length > 0 && lvl.modules.some(mId => !!modulePermissions[mId]);
    if (isLevelUnlocked) {
      const quizes = LEVEL_QUIZZES.filter(q => q.level === lvl.level);
      unlockedQuizzes.push(...quizes);
    }
  }

  return unlockedQuizzes;
}
