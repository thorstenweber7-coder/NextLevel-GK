import { collection, getDocs, addDoc, query, where, doc, deleteDoc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const LEVEL_TITLES: { [level: number]: string } = {
  1: 'Level 1: Einstieg & Grundlagen',
  2: 'Level 2: Flankensituationen',
  3: 'Level 3: Neuroathletik & Kognition',
  4: 'Level 4: Standards',
  5: 'Level 5: Torwartspezifisches Athletiktraining',
  6: 'Level 6: 1vs1 & Nahdistanz',
  7: 'Level 7: Koordinationsleiter & Kognition',
  8: 'Level 8: Querpasssituationen',
  9: 'Level 9: Coaching',
  10: 'Level 10: Ferndistanzsituationen',
  11: 'Level 11: Offensivtaktiken & Offensivtechniken',
  12: 'Level 12: Verteidigen hinter der Abwehrkette',
  13: 'Level 13: Mentaltraining'
};

export const LEVEL_TODOS: { [level: number]: string[] } = {
  1: [
    "Schaue dir das Einführungsvideo „Warum Kraftsport für Keeper so wichtig ist“ an und mache dir Notizen.",
    "Schaue dir das Video „Wie integrieren wir Kraftsport in den Alltag“ an und mache dir Notizen.",
    "Sorge dafür, dass du alle Geräte zu Verfügung hast, die in deinem Kraft-Trainingsplan stehen.",
    "Schaue dir zu jeder Übung ein Technikvideo an, bevor du in die erste Trainingseinheit gehst.",
    "Schaue dir die fünf Videos zur Ernährung an und mache dir Notizen. Schreibe dir anschließend auf, was du davon regelmäßig umsetzen möchtest. Berechne zudem deinen täglichen Proteinbedarf (2g Protein pro KG Körpergewicht).",
    "Schreibe dir eine Liste mit eiweißhaltigen Lebensmitteln auf, die dir gut schmecken. Dokumentiere anschließend an 7 Tagen hintereinander deine Mahlzeiten. Innerhalb dieser Zeitspanne solltest du möglichst genau sein, um ein Gefühl für die Mahlzeiten und Portionsgrößen zu bekommen. Danach kannst du auch schätzen.",
    "Schaue dir das Video zu den WarmUp Empfehlungen an und notiere dir dein persönliches WarmUp möglichst konkret. Bespreche das anschließend mit deinem Torwarttrainer/Trainer."
  ],
  2: [
    "Schaue dir das Video zum Flankentraining an und notiere dir wesentliche Aspekte der Positionierung.",
    "Analysiere mindestens 3 Taktikanalyse-Szenen in Flankensituationen nach dem Prinzip bei der Videoanalyse.",
    "Führe eine zusätzliche Krafttrainingseinheit durch, bei der du dich ausschließlich um Übungen kümmerst, die du noch nicht so gut kannst. Versuche deine Technik zu verbessern mit leichtem Gewicht und ohne, dass du ans Muskelversagen gehst.",
    "Schreibe dir deinen persönlichen Ernährungsplan für den Vortag des Wettkampfes und den Tag des Wettkampfes selbst."
  ],
  3: [
    "Schaue das Erklärvideo „Warum Neuroathletiktraining?“ an und notiere dir konkret, welchen Nutzen diese Art des Trainings für dich als Keeper hat.",
    "Plane deine Neuroathletiktrainingseinheiten für die kommenden Wochen des Coachings. Nehme dazu dein Handy in die Hand und stelle dir einen Wecker/Erinnerungen für dein tägliches Training. Stelle folgende Termine ein: für Montag 7 Uhr (Traget Striking), Dienstag 7 Uhr (EyeFocus), Mittwoch 7 Uhr (Limit oft the Eyes), Donnerstag 7 Uhr (Peripherie), Freitag 7 Uhr (Reflex-Focus), Samstag 9 Uhr (Stability-Focus). Spiele die Spiele täglich für 3-5 min. Integriere eine dauerhafte Wiederholung, damit dein Handy dich täglich an dein Training erinnert.",
    "Suche dir 3 Kognitionsspiele aus, die dir Spaß machen, und spiele diese Spiele auf der Fahrt zur Schule, zum Training etc. Hinweis: Kontinuierliches Übung bringt den Erfolg, nicht einmaliges Üben.",
    "Suche dir zwei Flankensituationen in Profispielen heraus und analysiere diese Positionierung Breite und Höhe, Impulskontrolle, Aktion zum Ball oder auf die Linie, ggf. Umschaltsituation)."
  ],
  4: [
    "Schaue dir die Videos zu den Standards (Freistöße, Eckbälle, Elfmeter) an und notiere dir wichtige Informationen.",
    "Nutze den interaktiven Freistoßsimulator, um dir deine Strategie für die Nutzung einer Mauer und die Anzahl der Spieler rund um den Strafraum zu entwickeln. Schreibe dir deine Entscheidungen für die Spieleranzahl in der Mauer für jeden Bereich möglichst konkret auf.",
    "Absolviere das Antizipationstraining für Elfmeter, indem du die Szenen im Reiter Lernen absolvierst.",
    "Analysiere mindestens 3 Profiszenen von Freistößen und prüfe die Anzahl der Spieler in der Mauer und die Position des Torwarts. Analysiere im Anschluss mindestens 3 Profiszenen von Elfmetern und antizipiere die Ecke.",
    "Hast du schon die Wettkampfarena bei den Kognitionsspielen entdeckt? Fordere mindestens 3 Spieler in Spielen deiner Wahl heraus (Siege in den Duellen geben ebenfalls Punkte)."
  ],
  5: [
    "Schau dir das Video zum torwartspezifischen Athletiktraining an und mache dir Notizen.",
    "Finde durch Ausprobieren heraus, welche Bereiche bei dir noch großes Potential haben.",
    "Arbeite konsequent an deinen Schwachstellen, indem du diese z.B. 4 mal pro Woche für 10 min trainierst. Filme dich dabei und dokumentiere deine Fortschritte für dich selbst!",
    "Suche dir im Training gezielt Übungsmöglichkeiten, indem du Mitspieler nach dem Training zu einem Sondertraining deiner Wahl bittest (Elfmeter, Freistöße, Eckbälle)."
  ],
  6: [
    "Schaue dir das Video zur Torwarttaktik in 1vs1 & Nahdistanzsituationen an und mache dir Notizen.",
    "Analysiere mindestens 3 Taktikanalyse-Szenen in 1vs1 und Nahdistanzsituationen nach dem Prinzip bei der Videoanalyse.",
    "Lege dich aufs Bett, schließe die Augen und visualisiere dir mindestens 10 Szenen mit einer passenden Handlung und Parade zu 1vs1 oder Nahdistanzsituationen.",
    "Prüfe, ob du einen weiteren Bereich im Torwartspezifischen Athletiktraining findest, bei dem du noch Potential hast und versuchen diesen vor Trainingseinheiten deines Teams zu integrieren."
  ],
  7: [
    "Schaue dir das Video „Training mit der Koordinationsleiter“ an und mache dir Notizen zu den verschiedenen Dimensionen.",
    "Setze die Kognitionsübung mit Ball an der Wand oder mit Trainingspartner (z. B. Volleys fangen nach Farb-Signal) 3-mal in dieser Woche für 10 Minuten um.",
    "Suche dir mindestens drei Profiszenen zum Thema 1vs1 & Nahdistanzsituationen heraus und analysiere diese nach dem Prinzip der Videoanalyse."
  ],
  8: [
    "Schaue dir das Video zur Torwart-Taktik in Querpasssituationen an und notiere dir wichtige Aspekte.",
    "Analysiere mindestens 3 Taktikanalyse-Szenen in Querpasssituationen nach dem Prinzip bei der Videoanalyse.",
    "Lege dich aufs Bett, schließe die Augen und visualisiere dir mindestens 10 Szenen mit einer passenden Handlung und Parade zu Querpasssituationen.",
    "Suche dir eine neue Herausforderung beim Kognitionstraining mit dem Ball und führe diese mindestens dreimal aus."
  ],
  9: [
    "Schaue dir das Coachingtutorial an und mache dir Notizen. Drucke dir anschließend die Liste der Coachingwörter aus und beschreibe jeweils eine Situation, bei der du das coachen kannst (Aufschreiben!).",
    "Analysiere 3 Video-Sequenzen und notiere den exakten Moment und das Coaching, in dem der Keeper lautstark hätte coachen müssen.",
    "Visualisiere für alle Coachings Szenen, in denen du das jeweilige Coaching geben kannst. Lege dich dazu aufs Bett, schließe die Augen und gehe im Kopf eine Szene durch, in der du das entsprechende Kommando geben kannst. Mache das so mit allen deinen Coachingpunkten.",
    "Nehme dir für das nächste Training ein bis zwei Kommandos vor, dass du bis jetzt noch nicht oder nicht ausreichend gut gecoacht hast, und coache es mindestens 3-mal. Bewerte das im Anschluss des Trainings.",
    "Suche dir drei Profiszenen zu Querpasssituationen heraus und analysiere diese nach dem Prinzip der Videoanalyse."
  ],
  10: [
    "Schaue dir das Video zur Torwart-Taktik in Ferndistanzsituationen an und mache dir Notizen.",
    "Analysiere mindestens 3 Taktikanalyse-Szenen in Ferndistanzsituationen nach dem Prinzip bei der Videoanalyse.",
    "Lege dich aufs Bett, schließe die Augen und visualisiere dir mindestens 10 Szenen mit einer passenden Handlung und Parade zu Ferndistanzsituationen.",
    "Suche dir mindestens zwei weitere Coachingpunkte aus und coache diese im Mannschaftstraining. Prüfe deine Performance nach dem Training."
  ],
  11: [
    "Schaue dir das Video zu den Offensivtaktiken an und mache dir möglichst präzise Notizen.",
    "Übe dieses Verhalten an einer Taktiktafel (z.B. der App Taktikboard) und suche das Gespräch mit deinem Trainer. Hinweis: Die drei Prinzipien sind grundlegende Prinzipien für das Anbieteverhalten als Torwart. Wie auch andere Taktiken ist aber auch das stark vom Trainer abhängig, unter dem du spielst. Es kann deshalb sein, dass dieser zusätzliche Anforderungen an dich stellt.",
    "Schaue dir die Technik-Lektionen an. Übe jede Technik mindestens einmal (bedenke aber, dass du die Techniken erst wirksam einsetzen kannst, wenn du diese jeweils 100-mal geübt hast).",
    "Setze deine Offensivtaktiken konkret in Teamtrainingseinheiten um. Nutze dafür insbesondere auch deinen zweitstarken Fuß.",
    "Setze den Splitstep in mindestens einer Aktion um."
  ],
  12: [
    "Schaue dir das Video zur Torwart-Taktik beim Verteidigen hinter der Abwehrkette an und mache dir Notizen.",
    "Analysiere mindestens 3 Taktikanalyse-Szenen beim Verteidigen hinter der Abwehrkette nach dem Prinzip der Videoanalyse.",
    "Lege dich aufs Bett, schließe die Augen und visualisiere dir mindestens 10 Szenen mit einer passenden Handlung zum Verteidigen hinter der Abwehrkette.",
    "Versuche im Mannschaftstraining aktiv deine Positionierung anzupassen."
  ],
  13: [
    "Schaue dir das Video zum Mentaltraining an und mache dir Notizen.",
    "Schaue dir das Video zum Umgang mit Fehlern an und mache dir Notizen.",
    "Definiere deinen persönlichen physischen „RESET-Anker“ (z. B. Pfostenschlag, Handschuhe öffnen und wieder schließen), um ihn nach Fehlern im Training einzusetzen. Verbinde diesen Anker mit einer herausragenden Parade. Setze diesen Anker im Training, Spiel oder auf dem Sofa mindestens 10-mal ein (Umso mehr Übung, desto wirksamer der Anker in Spielen).",
    "Suche dir drei Profiszenen zum Verteidigen hinter der Abwehrkette heraus und analysiere diese nach dem Prinzip der Videoanalyse."
  ]
};

export const LEVELS_STRUCTURE_MINIMAL = [
  {
    level: 0,
    modules: ['leaderboard', 'video_scenes', 'video_veo', 'video_bigsave']
  },
  {
    level: 1,
    modules: ['workouts', 'goals', 'content_kraftsport', 'content_nutrition', 'content_warmup', 'content_regelkunde']
  },
  {
    level: 2,
    modules: ['content_tw_taktik_flanken', 'training_whatsnext_flanken']
  },
  {
    level: 3,
    modules: ['content_neuro', 'training_neuro', 'training_kognition', 'training_competitions']
  },
  {
    level: 4,
    modules: ['content_standards', 'training_elfmeter_sim', 'training_freestoss_sim']
  },
  {
    level: 5,
    modules: ['content_tw_at', 'training_tw_at', 'training_seilspringen']
  },
  {
    level: 6,
    modules: ['content_tw_taktik_1vs1_nahdistanz', 'training_whatsnext_1vs1_nahdistanz']
  },
  {
    level: 7,
    modules: ['content_kognition', 'training_challenge', 'training_kognition_ball']
  },
  {
    level: 8,
    modules: ['content_tw_taktik_querpass', 'training_whatsnext_querpass']
  },
  {
    level: 9,
    modules: ['content_coaching', 'training_coaching']
  },
  {
    level: 10,
    modules: ['content_tw_taktik_ferndistanz', 'training_whatsnext_ferndistanz']
  },
  {
    level: 11,
    modules: ['content_anbieteverhalten', 'training_offensiv']
  },
  {
    level: 12,
    modules: ['content_tw_taktik_abwehrkette', 'training_whatsnext_abwehrkette']
  },
  {
    level: 13,
    modules: ['content_mental', 'training_mental']
  }
];

/**
 * Normalizes any text by replacing "Whats-Next Spielszenen", "Whats-Next Szenen", "Whats-Next" with "Taktikanalyse"
 */
export function sanitizeWhatsNextText(text: string): string {
  if (!text) return '';
  return text
    .replace(/Whats-Next\s+Spielszenen/gi, 'Taktikanalyse')
    .replace(/Whats-Next\s+Szenen/gi, 'Taktikanalyse-Szenen')
    .replace(/Whats-Next/gi, 'Taktikanalyse');
}

/**
 * Fetches dynamic Level To-Dos from Firestore config, falling back to LEVEL_TODOS
 */
export async function fetchLevelTodos(): Promise<{ [level: number]: string[] }> {
  try {
    const configSnap = await getDoc(doc(db, 'config', 'level_todos'));
    if (configSnap.exists()) {
      const data = configSnap.data();
      const rawTodos = data?.todos || {};
      const result: { [level: number]: string[] } = {};

      for (let lvl = 1; lvl <= 13; lvl++) {
        if (Array.isArray(rawTodos[lvl])) {
          result[lvl] = rawTodos[lvl].map((t: string) => sanitizeWhatsNextText(t));
        } else if (LEVEL_TODOS[lvl]) {
          result[lvl] = [...LEVEL_TODOS[lvl]];
        } else {
          result[lvl] = [];
        }
      }
      return result;
    }
  } catch (err) {
    console.error('Error fetching level todos from Firestore:', err);
  }

  // Fallback
  const fallback: { [level: number]: string[] } = {};
  for (let lvl = 1; lvl <= 13; lvl++) {
    fallback[lvl] = LEVEL_TODOS[lvl] ? [...LEVEL_TODOS[lvl]] : [];
  }
  return fallback;
}

/**
 * Saves dynamic Level To-Dos configuration to Firestore
 */
export async function saveLevelTodosConfig(todos: { [level: number]: string[] }): Promise<void> {
  const cleanTodos: { [key: string]: string[] } = {};
  for (let lvl = 1; lvl <= 13; lvl++) {
    const list = todos[lvl] || [];
    cleanTodos[lvl.toString()] = list
      .map(t => sanitizeWhatsNextText(t.trim()))
      .filter(t => t.length > 0);
  }
  await setDoc(doc(db, 'config', 'level_todos'), {
    todos: cleanTodos,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

/**
 * Scans all goals in Firestore and converts any "Whats-Next" occurrences to "Taktikanalyse"
 */
export async function updateAllExistingGoalsWhatsNextToTaktikanalyse(): Promise<{ updatedCount: number }> {
  let updatedCount = 0;
  try {
    const goalsSnap = await getDocs(collection(db, 'goals'));
    for (const gDoc of goalsSnap.docs) {
      const gData = gDoc.data();
      const desc = gData.description || '';
      if (/Whats-Next/i.test(desc)) {
        const newDesc = sanitizeWhatsNextText(desc);
        if (newDesc !== desc) {
          await updateDoc(doc(db, 'goals', gDoc.id), { description: newDesc });
          updatedCount++;
        }
      }
    }
  } catch (err) {
    console.error('Error updating existing goals with Whats-Next:', err);
  }
  return { updatedCount };
}

/**
 * Checks which levels are unlocked for a user based on their modulePermissions.
 * Automatically inserts missing level To-Dos for unlocked levels,
 * and removes any level To-Dos that belong to locked levels.
 */
export async function syncUserLevelTodos(
  userId: string,
  modulePermissions: { [key: string]: boolean },
  providedLevelTodos?: { [level: number]: string[] }
) {
  if (!userId) return;
  const permissions = modulePermissions || {};

  try {
    const currentLevelTodos = providedLevelTodos || (await fetchLevelTodos());

    // 1. Fetch current goals of category 'todo' for this user
    const goalsRef = collection(db, 'goals');
    const q = query(goalsRef, where('userId', '==', userId), where('category', '==', 'todo'));
    const snap = await getDocs(q);

    const existingUserTodos: { id: string; description: string; completed?: boolean }[] = [];
    for (const d of snap.docs) {
      const data = d.data();
      if (data.description) {
        let desc = data.description.trim();
        // Auto-sanitize Whats-Next if present in user's existing doc
        if (/Whats-Next/i.test(desc)) {
          const sanitized = sanitizeWhatsNextText(desc);
          await updateDoc(doc(db, 'goals', d.id), { description: sanitized });
          desc = sanitized;
        }
        existingUserTodos.push({ id: d.id, description: desc, completed: data.completed });
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Build map of todo description -> level
    const todoToLevelMap = new Map<string, number>();
    Object.entries(currentLevelTodos).forEach(([lvlStr, todoList]) => {
      const lvlNum = parseInt(lvlStr, 10);
      todoList.forEach(todo => {
        todoToLevelMap.set(todo.trim(), lvlNum);
      });
    });

    // 2. Identify unlocked levels
    const unlockedLevels = new Set<number>();
    for (const lvl of LEVELS_STRUCTURE_MINIMAL) {
      if (lvl.level === 0) continue; // Level 0 has no level To-Dos
      const isLevelUnlocked = lvl.modules.length > 0 && lvl.modules.some(mId => !!permissions[mId]);
      if (isLevelUnlocked) {
        unlockedLevels.add(lvl.level);
      }
    }

    const existingDescSet = new Set(existingUserTodos.map(t => t.description));

    // 3. Add missing To-Dos for unlocked levels
    for (const lvlNum of unlockedLevels) {
      const todos = currentLevelTodos[lvlNum] || [];
      for (const rawTodoDesc of todos) {
        const todoDesc = sanitizeWhatsNextText(rawTodoDesc.trim());
        if (todoDesc && !existingDescSet.has(todoDesc)) {
          const newTodo = {
            userId: userId,
            type: 'Technik',
            description: todoDesc,
            completed: false,
            date: todayStr,
            actions: { team: false, tw: false, play: false, extra: false },
            createdBy: 'trainer',
            category: 'todo'
          };
          await addDoc(collection(db, 'goals'), newTodo);
          existingDescSet.add(todoDesc);
        }
      }
    }

    // 4. Remove To-Dos for levels that are NOT unlocked
    for (const todo of existingUserTodos) {
      const todoLevel = todoToLevelMap.get(todo.description);
      if (todoLevel !== undefined && !unlockedLevels.has(todoLevel)) {
        await deleteDoc(doc(db, 'goals', todo.id));
      }
    }
  } catch (error) {
    console.error('Error syncing user level todos:', error);
  }
}

/**
 * Syncs level To-Dos for ALL users in Firestore.
 */
export async function syncAllUsersLevelTodos() {
  try {
    const currentLevelTodos = await fetchLevelTodos();
    await updateAllExistingGoalsWhatsNextToTaktikanalyse();

    const usersSnap = await getDocs(collection(db, 'users'));
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const uid = userDoc.id;
      const modulePermissions = userData.modulePermissions || {};
      await syncUserLevelTodos(uid, modulePermissions, currentLevelTodos);
    }
  } catch (err) {
    console.error('Error syncing level To-Dos for all users:', err);
  }
}

