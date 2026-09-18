import React, { useState, useEffect } from 'react';
import { initializeApp, deleteApp, getApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, increment, deleteDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../firebase';
import { syncUserLevelTodos, syncAllUsersLevelTodos, fetchLevelTodos, saveLevelTodosConfig, updateAllExistingGoalsWhatsNextToTaktikanalyse, LEVEL_TITLES, sanitizeWhatsNextText } from '../utils/levelTodos';
import { getGoalEvaluationStatus, calculateThreeWeeksFromNow } from '../utils/goalUtils';
import { LEVEL_QUIZZES } from '../utils/levelQuizzes';
import { UserProfile, Exercise, Workout, VideoScene, Competition, Goal, WorkoutLog, ChatMessage } from '../types';
import { Settings, UserPlus, FileText, Dumbbell, Video, Swords, BookOpen, Target, Trash2, Check, Plus, Save, Edit2, AlertCircle, ChevronDown, ChevronUp, Trophy, Calendar, TrendingUp, Activity, History, Award, Lock, Brain, Shield, MessageSquare, Send, ChevronLeft, ListTodo, RefreshCw, X, CheckSquare, Sparkles, CalendarPlus, Clock, KeyRound, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const LEVELS_STRUCTURE = [
  {
    level: 0,
    title: 'Level 0: Bestenliste & Videoanalyse',
    modules: [
      { id: 'leaderboard', label: 'Bestenliste' },
      { id: 'video_scenes', label: 'Videoanalyse: "Analyse von Spielszenen"' },
      { id: 'video_veo', label: 'Videoanalyse: "Veo Links"' },
      { id: 'video_bigsave', label: 'Videoanalyse: "Big Save Award"' },
    ]
  },
  {
    level: 1,
    title: 'Level 1: Einstieg & Grundlagen',
    modules: [
      { id: 'workouts', label: 'Reiter "Kraftsport"' },
      { id: 'goals', label: 'Reiter "Individuelle Ziele"' },
      { id: 'content_kraftsport', label: 'Inhalte: "Kraftsport"' },
      { id: 'content_nutrition', label: 'Inhalte: "Ernährung"' },
      { id: 'content_warmup', label: 'Inhalte: "Spiel WarmUp"' },
      { id: 'content_regelkunde', label: 'Inhalte: "Regelkunde"' },
    ]
  },
  {
    level: 2,
    title: 'Level 2: Flankensituationen',
    modules: [
      { id: 'content_tw_taktik_flanken', label: 'Inhalte: "Torwarttaktik Flankensituationen"' },
      { id: 'training_whatsnext_flanken', label: 'Training: "Taktikanalyse Flankensituationen"' },
    ]
  },
  {
    level: 3,
    title: 'Level 3: Neuroathletik & Kognition',
    modules: [
      { id: 'content_neuro', label: 'Inhalte: "Neuroathletiktraining"' },
      { id: 'training_neuro', label: 'Training: "Neuroathletiktraining"' },
      { id: 'training_kognition', label: 'Training: "Kognitionsspiele"' },
      { id: 'training_competitions', label: 'Training: "Trainingswettkämpfe"' },
    ]
  },
  {
    level: 4,
    title: 'Level 4: Standards',
    modules: [
      { id: 'content_standards', label: 'Inhalte: "Standard"' },
      { id: 'training_elfmeter_sim', label: 'Training: "Elfmeter"' },
      { id: 'training_freestoss_sim', label: 'Training: "Freistöße"' },
    ]
  },
  {
    level: 5,
    title: 'Level 5: Torwartspezifisches Athletiktraining',
    modules: [
      { id: 'content_tw_at', label: 'Inhalte: "Torwartspezifisches Athletiktraining"' },
      { id: 'training_tw_at', label: 'Training: "Torwartspezifisches Athletiktraining"' },
      { id: 'training_seilspringen', label: 'Training: "Seilspring-Challenges"' },
    ]
  },
  {
    level: 6,
    title: 'Level 6: 1vs1 & Nahdistanz',
    modules: [
      { id: 'content_tw_taktik_1vs1_nahdistanz', label: 'Inhalte: "Torwart-Taktik 1vs1 & Nahdistanzsituationen"' },
      { id: 'training_whatsnext_1vs1_nahdistanz', label: 'Training: "Taktikanalyse 1vs1 & Nahdistanzsituationen"' },
    ]
  },
  {
    level: 7,
    title: 'Level 7: Koordinationsleiter & Kognition',
    modules: [
      { id: 'content_kognition', label: 'Inhalte: "Training mit der Koordinationsleiter"' },
      { id: 'training_challenge', label: 'Training: "Koordinationsleiter-Challenge"' },
      { id: 'training_kognition_ball', label: 'Training: "Kognitionstraining mit Ball"' },
    ]
  },
  {
    level: 8,
    title: 'Level 8: Querpasssituationen',
    modules: [
      { id: 'content_tw_taktik_querpass', label: 'Inhalte: "Torwart-Taktik Querpasssituationen"' },
      { id: 'training_whatsnext_querpass', label: 'Training: "Taktikanalyse Querpasssituationen"' },
    ]
  },
  {
    level: 9,
    title: 'Level 9: Coaching',
    modules: [
      { id: 'content_coaching', label: 'Inhalte: "Coaching"' },
      { id: 'training_coaching', label: 'Training: "Coaching Spielszenen"' },
    ]
  },
  {
    level: 10,
    title: 'Level 10: Ferndistanzsituationen',
    modules: [
      { id: 'content_tw_taktik_ferndistanz', label: 'Inhalte: "Torwart-Taktik Ferndistanzsituationen"' },
      { id: 'training_whatsnext_ferndistanz', label: 'Training: "Taktikanalyse Ferndistanzsituationen"' },
    ]
  },
  {
    level: 11,
    title: 'Level 11: Offensivtaktiken & Offensivtechniken',
    modules: [
      { id: 'content_anbieteverhalten', label: 'Inhalte: "Offensivtaktiken"' },
      { id: 'training_offensiv', label: 'Training: "Offensivtechniken"' },
    ]
  },
  {
    level: 12,
    title: 'Level 12: Verteidigen hinter der Abwehrkette',
    modules: [
      { id: 'content_tw_taktik_abwehrkette', label: 'Inhalte: "Torwart-Taktik Verteidigen hinter der Abwehrkette"' },
      { id: 'training_whatsnext_abwehrkette', label: 'Training: "Taktikanalyse Verteidigen hinter der Abwehrkette"' },
    ]
  },
  {
    level: 13,
    title: 'Level 13: Mentaltraining',
    modules: [
      { id: 'content_mental', label: 'Inhalte: "Mentaltraining"' },
      { id: 'training_mental', label: 'Training: "Mentales Training"' },
    ]
  }
];

interface CoachingZoneProps {
  currentUserProfile?: UserProfile;
}

export default function CoachingZone({ currentUserProfile }: CoachingZoneProps) {
  const [activeSubSection, setActiveSubSection] = useState<'messages' | 'login' | 'profiles' | 'physique' | 'kraft' | 'video' | 'wett' | 'inhalte' | 'ziele'>(
    currentUserProfile?.role === 'kraftsport' ? 'physique' : 'messages'
  );
  const [physiqueUserUid, setPhysiqueUserUid] = useState('');
  const [showArchivedProfiles, setShowArchivedProfiles] = useState(false);

  // Admin Support-Chat State Variables
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminReplyError, setAdminReplyError] = useState('');
  const [adminReplySending, setAdminReplySending] = useState(false);

  // Real-time listener for all user support messages (only for admin)
  useEffect(() => {
    if (currentUserProfile?.role !== 'admin') return;

    const q = collection(db, 'chat_messages');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          userId: data.userId || '',
          userName: data.userName || '',
          topic: data.topic || '',
          message: data.message || '',
          timestamp: data.timestamp || 0,
          senderRole: data.senderRole || 'User'
        });
      });
      setChatMessages(msgs);
    }, (err) => {
      console.error('Error listening to support messages in Coaching Zone:', err);
    });

    return () => unsubscribe();
  }, [currentUserProfile]);

  useEffect(() => {
    if (currentUserProfile?.role === 'kraftsport') {
      setPhysiqueUserUid(currentUserProfile.uid);
    }
  }, [currentUserProfile]);
  
  // Data lists
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [scenes, setScenes] = useState<VideoScene[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [workoutLogToDelete, setWorkoutLogToDelete] = useState<WorkoutLog | null>(null);

  // Compute active chat threads sorted by latest message timestamp descending
  const activeThreads = React.useMemo(() => {
    // Group all support messages by userId
    const messagesByUser: Record<string, ChatMessage[]> = {};
    chatMessages.forEach(msg => {
      if (!messagesByUser[msg.userId]) {
        messagesByUser[msg.userId] = [];
      }
      messagesByUser[msg.userId].push(msg);
    });

    return Object.entries(messagesByUser).map(([userId, msgs]) => {
      const userProfile = users.find(u => u.uid === userId);
      // Sort messages in ascending order (oldest first)
      const sortedMsgs = [...msgs].sort((a, b) => a.timestamp - b.timestamp);
      const latestMsg = sortedMsgs[sortedMsgs.length - 1];

      return {
        userId,
        userProfile,
        messages: sortedMsgs,
        latestMessage: latestMsg,
        topic: latestMsg?.topic || sortedMsgs[0]?.topic || 'Allgemeines Anliegen',
        userName: userProfile?.name || userProfile?.username || sortedMsgs[0]?.userName || 'Unbekannt'
      };
    })
    // Filter out threads of archived users or those who aren't found
    .filter(t => t.userProfile && !t.userProfile.archived)
    // Sort threads by the timestamp of their latest message (newest first)
    .sort((a, b) => (b.latestMessage?.timestamp || 0) - (a.latestMessage?.timestamp || 0));
  }, [chatMessages, users]);

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminReplyError('');

    if (!adminReplyText.trim()) {
      setAdminReplyError('Bitte gib eine Antwort ein.');
      return;
    }
    if (!selectedChatUserId) {
      setAdminReplyError('Kein Benutzer ausgewählt.');
      return;
    }

    setAdminReplySending(true);
    try {
      const activeThread = activeThreads.find(t => t.userId === selectedChatUserId);
      await addDoc(collection(db, 'chat_messages'), {
        userId: selectedChatUserId,
        userName: currentUserProfile?.name || currentUserProfile?.username || 'Coach Admin',
        topic: activeThread?.topic || 'Antwort',
        message: adminReplyText.trim(),
        timestamp: Date.now(),
        senderRole: 'Admin'
      });
      setAdminReplyText('');
    } catch (err: any) {
      console.error('Error sending admin reply:', err);
      setAdminReplyError('Fehler beim Senden der Antwort. Bitte versuche es erneut.');
    } finally {
      setAdminReplySending(false);
    }
  };

  // Calculate 1-Rep Max (Brzycki-Formula)
  const calculate1RepMax = (weight: number, reps: number) => {
    if (reps <= 1) return weight;
    return Math.round(weight / (1.0278 - (0.0278 * reps)));
  };

  // Get selected user's bodyweight
  const getSelectedUserBodyweight = (user: UserProfile) => {
    if (user.weightHistory && user.weightHistory.length > 0) {
      return user.weightHistory[user.weightHistory.length - 1].value;
    }
    return 80; // default fallback weight
  };

  // Get calculated display weight based on property config
  const getSelectedUserDisplayWeight = (exercise: Exercise, enteredWeight: number, user: UserProfile) => {
    const uWeight = getSelectedUserBodyweight(user);
    if (exercise.bodyweightMoved) {
      return enteredWeight + uWeight;
    } else if (exercise.bodyweightPartiallyMoved) {
      return Math.max(0, uWeight - enteredWeight);
    }
    return enteredWeight;
  };

  // Helper to parse log date string to timestamp for correct sorting
  const parseLogDate = (d?: string) => {
    if (!d) return 0;
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
      return new Date(d).getTime();
    }
    if (/^\d{2}\.\d{2}\.\d{4}/.test(d)) {
      const parts = d.split('.');
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
    }
    const t = new Date(d).getTime();
    return isNaN(t) ? 0 : t;
  };

  // Generate 1-RM History chart data for an exercise and user
  const getChartDataForExerciseAndUser = (exerciseId: string, user: UserProfile) => {
    const results: { date: string; max1RM: number }[] = [];
    
    // Filter and sort oldest first for chronological chart (left = oldest, right = newest)
    const userLogs = [...workoutLogs]
      .filter(log => log.userId === user.uid)
      .sort((a, b) => parseLogDate(a.date) - parseLogDate(b.date));

    userLogs.forEach(log => {
      const we = log.exercises?.find(e => e.exerciseId === exerciseId);
      if (!we) return;

      const exercise = exercises.find(e => e.id === exerciseId);

      // Compute max 1RM achieved in this log for this exercise
      let max1RM = 0;
      we.sets.forEach(set => {
        if (set.type === 'regular' || !set.type) {
          const finalWeight = exercise ? getSelectedUserDisplayWeight(exercise, set.weight, user) : set.weight;
          const set1RM = calculate1RepMax(finalWeight, set.reps);
          if (set1RM > max1RM) {
            max1RM = set1RM;
          }
        }
      });

      if (max1RM > 0) {
        let formattedDate = log.date;
        if (/^\d{4}-\d{2}-\d{2}/.test(log.date)) {
          formattedDate = log.date.split('-').reverse().slice(0, 2).join('.'); // Format DD.MM
        }
        results.push({
          date: formattedDate,
          max1RM
        });
      }
    });

    return results;
  };

  const [loading, setLoading] = useState(false);

  // Sub-data fetcher
  const loadAllData = async () => {
    setLoading(true);
    try {
      await syncAllUsersLevelTodos();

      const lTodos = await fetchLevelTodos();
      setLevelTodos(lTodos);

      const usersSnap = await getDocs(collection(db, 'users'));
      const uList: UserProfile[] = [];
      usersSnap.forEach(doc => { uList.push({ uid: doc.id, ...doc.data() } as UserProfile); });
      setUsers(uList);

      const exSnap = await getDocs(collection(db, 'exercises'));
      const exList: Exercise[] = [];
      exSnap.forEach(doc => { exList.push({ id: doc.id, ...doc.data() } as Exercise); });
      setExercises(exList);

      const wSnap = await getDocs(collection(db, 'workouts'));
      const wList: Workout[] = [];
      wSnap.forEach(doc => { wList.push({ id: doc.id, ...doc.data() } as Workout); });
      setWorkouts(wList);

      const sSnap = await getDocs(collection(db, 'video_scenes'));
      const sList: VideoScene[] = [];
      sSnap.forEach(doc => { sList.push({ id: doc.id, ...doc.data() } as VideoScene); });
      setScenes(sList);

      const catSnap = await getDocs(collection(db, 'video_categories'));
      const cList: { id: string; name: string }[] = [];
      catSnap.forEach(doc => { cList.push({ id: doc.id, name: doc.data().name }); });
      setCategories(cList);

      const compSnap = await getDocs(collection(db, 'competitions'));
      const compList: Competition[] = [];
      compSnap.forEach(doc => { compList.push({ id: doc.id, ...doc.data() } as Competition); });
      setCompetitions(compList);

      const goalsSnap = await getDocs(collection(db, 'goals'));
      const gList: Goal[] = [];
      goalsSnap.forEach(doc => { gList.push({ id: doc.id, ...doc.data() } as Goal); });
      setAllGoals(gList);

      const logsSnap = await getDocs(collection(db, 'workout_logs'));
      const logsList: WorkoutLog[] = [];
      logsSnap.forEach(doc => { logsList.push({ id: doc.id, ...doc.data() } as WorkoutLog); });
      setWorkoutLogs(logsList);

      const rulesSnap = await getDoc(doc(db, 'config', 'analysisRules'));
      if (rulesSnap.exists()) {
        setGlobalAnalysisRules(rulesSnap.data().text || '');
      }

    } catch (err) {
      console.error('Error loading admin zone data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [activeSubSection]);

  // ==========================================
  // SUB-SECTION 1: LOGIN & USER CREATION
  // ==========================================
  const [customLoginText, setCustomLoginText] = useState('');
  const [customTrainerNote, setCustomTrainerNote] = useState('');
  
  // User creation fields
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'kraftsport' | 'keeper_verein' | 'keeper_extern'>('keeper_verein');
  const [newClub, setNewClub] = useState('Eigener Verein');
  const [newPosition, setNewPosition] = useState('Keeper');
  const [userCreationMessage, setUserCreationMessage] = useState('');

  // Password reset fields
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  useEffect(() => {
    // Load config values
    const loadConfig = async () => {
      const logSnap = await getDoc(doc(db, 'config', 'login'));
      if (logSnap.exists()) setCustomLoginText(logSnap.data().text || '');

      const noteSnap = await getDoc(doc(db, 'config', 'trainerNote'));
      if (noteSnap.exists()) setCustomTrainerNote(noteSnap.data().text || '');
    };
    loadConfig();
  }, []);

  const handleSaveLoginText = async () => {
    try {
      await setDoc(doc(db, 'config', 'login'), { text: customLoginText });
      alert('Logintext erfolgreich aktualisiert!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTrainerNote = async () => {
    try {
      await setDoc(doc(db, 'config', 'trainerNote'), { text: customTrainerNote });
      alert('Trainer-Notiz erfolgreich aktualisiert!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserCreationMessage('Erstelle Nutzer...');

    const email = `${newUsername.toLowerCase().trim()}@keepercoaching.local`;

    try {
      // Initialize secondary firebase application instance to register a user on behalf of admin
      let secondaryApp;
      if (getApps().some(app => app.name === 'SecondaryApp')) {
        secondaryApp = getApp('SecondaryApp');
      } else {
        secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
      }

      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, newPassword);
      const uid = userCredential.user.uid;

      // Save user profile in firestore database
      const userProfile = {
        uid,
        username: newUsername.toLowerCase().trim(),
        role: newRole,
        name: newName,
        club: newClub,
        position: newPosition,
        location: '',
        school: '',
        otherInfo: 'Neu registrierter Account',
        points: 0,
        pointsByCategory: {},
        weightHistory: [],
        heightHistory: []
      };

      await setDoc(doc(db, 'users', uid), userProfile);

      // Clean up secondary auth
      await secondaryAuth.signOut();
      await deleteApp(secondaryApp);

      setUserCreationMessage(`Erfolgreich! Benutzer "${newName}" wurde angelegt.`);
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      loadAllData();
    } catch (err: any) {
      console.error(err);
      setUserCreationMessage(`Fehler beim Erstellen: ${err.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMsg('Sende Passwort-Zurücksetzen-E-Mail...');
    try {
      await sendPasswordResetEmail(getAuth(), resetEmail);
      setResetMsg('E-Mail zum Zurücksetzen erfolgreich verschickt!');
      setResetEmail('');
    } catch (err: any) {
      setResetMsg(`Fehler: ${err.message}`);
    }
  };

  // ==========================================
  // SUB-SECTION 2: PROFILES EDITOR
  // ==========================================
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserClub, setEditUserClub] = useState('');
  const [editUserPosition, setEditUserPosition] = useState('');
  const [editUserLocation, setEditUserLocation] = useState('');
  const [editUserSchool, setEditUserSchool] = useState('');
  const [editUserOther, setEditUserOther] = useState('');
  const [editUserPoints, setEditUserPoints] = useState(0);
  const [editUserRole, setEditUserRole] = useState<'admin' | 'kraftsport' | 'keeper_verein' | 'keeper_extern'>('keeper_verein');
  const [editUserArchived, setEditUserArchived] = useState(false);
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserResetMsg, setEditUserResetMsg] = useState('');
  const [directPassword, setDirectPassword] = useState('');
  const [directPasswordLoading, setDirectPasswordLoading] = useState(false);
  const [directPasswordMsg, setDirectPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [tempPermissions, setTempPermissions] = useState<Record<string, boolean>>({});

  // Growth development history trackers
  const [addWeight, setAddWeight] = useState('');
  const [addHeight, setAddHeight] = useState('');
  const [expandedAdminLogId, setExpandedAdminLogId] = useState<string | null>(null);
  const [selectedChartExerciseId, setSelectedChartExerciseId] = useState<string | null>(null);

  const selectUserForEdit = (user: UserProfile) => {
    setSelectedUser(user);
    setEditUserName(user.name || '');
    setEditUserClub(user.club || '');
    setEditUserPosition(user.position || '');
    setEditUserLocation(user.location || '');
    setEditUserSchool(user.school || '');
    setEditUserOther(user.otherInfo || '');
    setEditUserPoints(user.points || 0);
    setEditUserRole((user.role as any) || 'keeper_verein');
    setEditUserArchived(user.archived || false);
    setEditUserEmail(user.email || '');
    setEditUserResetMsg('');
    setDirectPassword('');
    setDirectPasswordMsg(null);
    setExpandedAdminLogId(null);
    setSelectedChartExerciseId(null);
  };

  const handleAdminResetPassword = async () => {
    if (!selectedUser) return;
    setEditUserResetMsg('Sende Passwort-Zurücksetzen-E-Mail...');
    
    // Check if user has an email registered
    const email = editUserEmail.trim() || selectedUser.email?.trim();
    if (!email || email.endsWith('@keepercoaching.local')) {
      setEditUserResetMsg('Fehler: Es ist keine gültige E-Mail-Adresse für diesen Benutzer hinterlegt. Bitte trage zuerst eine gültige E-Mail-Adresse ein und speichere das Profil.');
      return;
    }

    try {
      // Send reset email to the user's specific email address
      await sendPasswordResetEmail(getAuth(), email);
      setEditUserResetMsg(`Erfolgreich! Passwort-Zurücksetzen-E-Mail wurde an "${email}" gesendet.`);
    } catch (err: any) {
      setEditUserResetMsg(`Fehler: ${err.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleAdminSetDirectPassword = async () => {
    if (!selectedUser) return;
    const pwd = directPassword.trim();
    if (!pwd || pwd.length < 6) {
      setDirectPasswordMsg({ type: 'error', text: 'Das neue Passwort muss mindestens 6 Zeichen lang sein.' });
      return;
    }

    setDirectPasswordLoading(true);
    setDirectPasswordMsg(null);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin-set-user-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({ uid: selectedUser.uid, newPassword: pwd })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Setzen des Passworts.');
      }

      setDirectPasswordMsg({
        type: 'success',
        text: `Erfolg! Das Passwort für "${selectedUser.name || selectedUser.username}" wurde direkt in Firebase Authentication geändert.`
      });
      setDirectPassword('');
    } catch (err: any) {
      console.error('Error setting direct password:', err);
      setDirectPasswordMsg({
        type: 'error',
        text: `Fehler: ${err.message || 'Passwort konnte nicht geändert werden.'}`
      });
    } finally {
      setDirectPasswordLoading(false);
    }
  };

  const handleSaveUserProfile = async () => {
    if (!selectedUser) return;
    try {
      const newEmail = editUserEmail.trim();
      const oldEmail = (selectedUser.email || '').trim();

      // Update in Firestore
      const userRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userRef, {
        name: editUserName,
        club: editUserClub,
        position: editUserPosition,
        location: editUserLocation,
        school: editUserSchool,
        otherInfo: editUserOther,
        points: Number(editUserPoints),
        role: editUserRole,
        archived: editUserArchived,
        email: newEmail
      });

      // Synchronize with Firebase Auth if changed
      let authSynced = false;
      if (newEmail && newEmail !== oldEmail) {
        try {
          const idToken = await auth.currentUser?.getIdToken();
          const syncRes = await fetch('/api/update-user-email', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
            },
            body: JSON.stringify({ uid: selectedUser.uid, email: newEmail })
          });
          if (!syncRes.ok) {
            const errData = await syncRes.json();
            throw new Error(errData.error || 'Authentifizierungssynchronisierung fehlgeschlagen.');
          }
          authSynced = true;
        } catch (authErr: any) {
          console.error('Failed to sync email to Firebase Auth:', authErr);
          alert(`Hinweis: Profil wurde in Firestore gespeichert, aber E-Mail konnte nicht im Login-System aktualisiert werden: ${authErr.message}\n\n(Tipp: Prüfe, ob service-account.json im Projektordner liegt).`);
        }
      }

      if (authSynced) {
        alert('Benutzerprofil und Login-E-Mail (Firebase Authentication) erfolgreich aktualisiert!');
      } else {
        alert('Benutzerprofil erfolgreich gespeichert!');
      }
      setSelectedUser(null);
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Fehler beim Speichern des Profils.');
    }
  };

  const handleAddWeightHeight = async () => {
    if (!selectedUser) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const userRef = doc(db, 'users', selectedUser.uid);

    const updates: any = {};
    if (addWeight) {
      const wHistory = selectedUser.weightHistory || [];
      updates.weightHistory = [...wHistory, { date: todayStr, value: parseFloat(addWeight) }];
    }
    if (addHeight) {
      const hHistory = selectedUser.heightHistory || [];
      updates.heightHistory = [...hHistory, { date: todayStr, value: parseFloat(addHeight) }];
    }

    try {
      await updateDoc(userRef, updates);
      alert('Körperwerte erfolgreich hinzugefügt!');
      setAddWeight('');
      setAddHeight('');
      setSelectedUser(null);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPhysique = async (userId: string) => {
    const targetUser = users.find(u => u.uid === userId);
    if (!targetUser) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const userRef = doc(db, 'users', targetUser.uid);

    const updates: any = {};
    if (addWeight) {
      const wHistory = targetUser.weightHistory || [];
      updates.weightHistory = [...wHistory, { date: todayStr, value: parseFloat(addWeight) }];
    }
    if (addHeight) {
      const hHistory = targetUser.heightHistory || [];
      updates.heightHistory = [...hHistory, { date: todayStr, value: parseFloat(addHeight) }];
    }

    try {
      await updateDoc(userRef, updates);
      alert('Körperwerte erfolgreich hinzugefügt!');
      setAddWeight('');
      setAddHeight('');
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Fehler beim Speichern der Körperwerte.');
    }
  };

  const handleDeleteWeightEntry = async (userId: string, index: number) => {
    const targetUser = users.find(u => u.uid === userId);
    if (!targetUser) return;
    if (!confirm('Möchtest du diesen Gewichtseintrag wirklich löschen?')) return;

    const wHistory = [...(targetUser.weightHistory || [])];
    wHistory.splice(index, 1);

    try {
      await updateDoc(doc(db, 'users', targetUser.uid), { weightHistory: wHistory });
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteHeightEntry = async (userId: string, index: number) => {
    const targetUser = users.find(u => u.uid === userId);
    if (!targetUser) return;
    if (!confirm('Möchtest du diesen Größeneintrag wirklich löschen?')) return;

    const hHistory = [...(targetUser.heightHistory || [])];
    hHistory.splice(index, 1);

    try {
      await updateDoc(doc(db, 'users', targetUser.uid), { heightHistory: hHistory });
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // SUB-SECTION 3: KRAFTSPORT (EXERCISES & WORKOUTS)
  // ==========================================
  // Exercise DB manager
  const [activeExerciseTab, setActiveExerciseTab] = useState<'PUSH' | 'PULL' | 'LEG' | 'CORE' | 'USER_EXERCISES'>('PUSH');
  const [showAddEx, setShowAddEx] = useState(false);
  const [exName, setExName] = useState('');
  const [exMuscle, setExMuscle] = useState<'PUSH' | 'PULL' | 'Leg' | 'Core'>('PUSH');
  const [exTrainerNote, setExTrainerNote] = useState('');
  const [exCadence, setExCadence] = useState('');
  const [exVideo, setExVideo] = useState('');
  const [exBodyweight, setExBodyweight] = useState(false);
  const [exBodyweightPartial, setExBodyweightPartial] = useState(false);
  const [exUnilateral, setExUnilateral] = useState(false);

  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);

  const resetExerciseForm = () => {
    setExName('');
    setExMuscle('PUSH');
    setExTrainerNote('');
    setExCadence('');
    setExVideo('');
    setExBodyweight(false);
    setExBodyweightPartial(false);
    setExUnilateral(false);
    setEditingExerciseId(null);
    setShowAddEx(false);
  };

  const handleEditExerciseClick = (ex: Exercise) => {
    setEditingExerciseId(ex.id);
    setExName(ex.name);
    setExMuscle((ex.muscleGroup as any) || 'PUSH');
    setExTrainerNote(ex.trainerNote || '');
    setExCadence(ex.cadence || '');
    setExVideo(ex.videoLink || '');
    setExBodyweight(ex.bodyweightMoved || false);
    setExBodyweightPartial(ex.bodyweightPartiallyMoved || false);
    setExUnilateral(ex.unilateral || false);
    setShowAddEx(true);
  };

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let isAdminCreatedVal = currentUserProfile?.role === 'admin';
      let createdByVal = currentUserProfile?.uid || '';

      if (editingExerciseId) {
        const existing = exercises.find(ex => ex.id === editingExerciseId);
        if (existing) {
          isAdminCreatedVal = existing.isAdminCreated !== false;
          createdByVal = existing.createdBy || '';
        }
      }

      const exerciseData = {
        name: exName,
        muscleGroup: exMuscle,
        trainerNote: exTrainerNote,
        cadence: exCadence,
        videoLink: exVideo,
        bodyweightMoved: exBodyweight,
        bodyweightPartiallyMoved: exBodyweightPartial,
        unilateral: exUnilateral,
        isAdminCreated: isAdminCreatedVal,
        createdBy: createdByVal
      };

      if (editingExerciseId) {
        await setDoc(doc(db, 'exercises', editingExerciseId), exerciseData, { merge: true });
      } else {
        await addDoc(collection(db, 'exercises'), exerciseData);
      }

      resetExerciseForm();
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExercise = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'exercises', id));
      loadAllData();
      setExerciseToDelete(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdoptExercise = async (id: string) => {
    try {
      await updateDoc(doc(db, 'exercises', id), {
        isAdminCreated: true
      });
      loadAllData();
      alert('Die Übung wurde erfolgreich in die globale Datenbank übernommen!');
    } catch (err) {
      console.error('Error adopting exercise:', err);
      alert('Fehler beim Übernehmen der Übung.');
    }
  };

  // Workouts builder
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [planName, setPlanName] = useState('');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planAssignedUsers, setPlanAssignedUsers] = useState<string[]>([]);
  const [planCategory, setPlanCategory] = useState<'eigene' | 'spieler' | 'kraftsport' | 'andere'>('eigene');
  const [activeWorkoutCategoryTab, setActiveWorkoutCategoryTab] = useState<'eigene' | 'spieler' | 'kraftsport' | 'andere'>('eigene');
  // Building exercises in the plan
  const [planExercises, setPlanExercises] = useState<{ exerciseId: string; sets: { type: 'warmup' | 'regular'; reps: number; minReps?: number; targetReps?: number }[] }[]>([]);
  const [planExCategoryTab, setPlanExCategoryTab] = useState<'PUSH' | 'PULL' | 'LEG' | 'CORE' | 'USER'>('PUSH');

  const handleAddPlanEx = (exId: string) => {
    setPlanExercises(prev => [
      ...prev,
      {
        exerciseId: exId,
        sets: [
          { type: 'warmup', reps: 10 },
          { type: 'regular', reps: 8, minReps: 6, targetReps: 8 }
        ]
      }
    ]);
  };

  const handleSaveWorkoutPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName || planExercises.length === 0) {
      alert('Bitte Namen eingeben und mindestens eine Übung hinzufügen!');
      return;
    }

    try {
      const isCurrentAdmin = currentUserProfile?.role === 'admin';
      const finalCategory = isCurrentAdmin ? planCategory : 'andere';

      const dataToSave = {
        name: planName,
        assignedUsers: planAssignedUsers,
        exercises: planExercises,
        category: finalCategory
      };

      if (editingPlanId) {
        await setDoc(doc(db, 'workouts', editingPlanId), dataToSave);
        alert('Trainingsplan erfolgreich aktualisiert!');
        setEditingPlanId(null);
      } else {
        await addDoc(collection(db, 'workouts'), dataToSave);
        alert('Trainingsplan erfolgreich gespeichert!');
      }

      setPlanName('');
      setPlanAssignedUsers([]);
      setPlanExercises([]);
      setPlanCategory('eigene');
      setShowAddPlan(false);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWorkoutPlan = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'workouts', id));
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // SUB-SECTION 4: VIDEOANALYSE
  // ==========================================
  const [newCategoryName, setNewCategoryName] = useState('');
  const [activeAnalysisVideo, setActiveAnalysisVideo] = useState('');
  const [globalAnalysisRules, setGlobalAnalysisRules] = useState('');
  const [activeAnalysisRules, setActiveAnalysisRules] = useState('');
  const [activeAnalysisTrainer, setActiveAnalysisTrainer] = useState('');
  const [activeAnalysisRecommendation, setActiveAnalysisRecommendation] = useState('');
  const [analysisUserFilter, setAnalysisUserFilter] = useState('');
  const [analysisCategorySelected, setAnalysisCategorySelected] = useState('');

  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [inlineEditingSceneId, setInlineEditingSceneId] = useState<string | null>(null);
  const [inlineSceneData, setInlineSceneData] = useState<any | null>(null);
  const [sceneToDelete, setSceneToDelete] = useState<VideoScene | null>(null);

  const handleSaveSceneInline = async (sceneId: string) => {
    if (!inlineSceneData) return;
    try {
      await setDoc(doc(db, 'video_scenes', sceneId), inlineSceneData);
      alert('Spielszene erfolgreich aktualisiert!');
      setInlineEditingSceneId(null);
      setInlineSceneData(null);
      loadAllData();
    } catch (err) {
      console.error('Error saving scene inline:', err);
      alert('Fehler beim Speichern der Szene.');
    }
  };

  const [penaltyLevel, setPenaltyLevel] = useState<string>('Level 1');
  const [analysisAssignedUsers, setAnalysisAssignedUsers] = useState<string[]>([]);
  const [mcAssignedUsers, setMcAssignedUsers] = useState<string[]>([]);
  const [penaltyAssignedUsers, setPenaltyAssignedUsers] = useState<string[]>([]);
  const [veoAssignedUsers, setVeoAssignedUsers] = useState<string[]>([]);
  const [bsAssignedUsers, setBsAssignedUsers] = useState<string[]>([]);
  const [activeScenesTab, setActiveScenesTab] = useState<'analysis' | 'whatsnext' | 'coaching' | 'freestoss' | 'elfmeter' | 'veo' | 'bigsave'>('analysis');
  const [activeCompTab, setActiveCompTab] = useState<'all' | 'training' | 'challenge' | 'quiz'>('all');

  // Reusable helper for rendering user checklist
  const renderUserCheckboxes = (
    selectedUids: string[],
    setSelectedUids: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    return (
      <div className="space-y-1.5 border border-slate-800 bg-slate-900/40 p-2.5 rounded-lg text-xs">
        <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Zugriff einschränken (Optional: Wenn leer, sehen es alle Spieler)</span>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-0.5">
          {users.map(u => (
            <label key={u.uid} className="flex items-center gap-1 px-2 py-0.5 bg-slate-950 border border-slate-850 rounded text-[9px] text-slate-300 font-medium cursor-pointer hover:border-slate-750">
              <input
                type="checkbox"
                checked={selectedUids.includes(u.uid)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (checked) {
                    setSelectedUids(prev => [...prev, u.uid]);
                  } else {
                    setSelectedUids(prev => prev.filter(uid => uid !== u.uid));
                  }
                }}
                className="w-3 h-3 text-amber-500 rounded border-slate-800 bg-slate-900 cursor-pointer"
              />
              <span>{u.name} {u.role === 'admin' ? '(Admin)' : ''}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName) return;
    try {
      await addDoc(collection(db, 'video_categories'), { name: newCategoryName });
      setNewCategoryName('');
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Soll diese Kategorie und all ihre Spielszenen gelöscht werden?')) {
      try {
        await deleteDoc(doc(db, 'video_categories', id));
        loadAllData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSaveGlobalAnalysisRules = async () => {
    try {
      await setDoc(doc(db, 'config', 'analysisRules'), {
        text: globalAnalysisRules
      });
      alert('Allgemeine Analyse-Regeln erfolgreich gespeichert!');
    } catch (err) {
      console.error('Error saving global analysis rules:', err);
    }
  };

  const handleAddAnalysisScene = async () => {
    if (!activeAnalysisVideo || !analysisCategorySelected) return;
    try {
      const dataToSave = {
        type: 'analysis',
        categoryId: analysisCategorySelected,
        videoLink: activeAnalysisVideo,
        analysisRules: activeAnalysisRules,
        followUpText: activeAnalysisTrainer,
        trainingRecommendation: activeAnalysisRecommendation,
        assignedUsers: analysisAssignedUsers
      };

      if (editingSceneId) {
        await setDoc(doc(db, 'video_scenes', editingSceneId), dataToSave);
        alert('Spielszene erfolgreich aktualisiert!');
        setEditingSceneId(null);
      } else {
        await addDoc(collection(db, 'video_scenes'), dataToSave);
        alert('Spielszene erfolgreich angelegt!');
      }

      setActiveAnalysisVideo('');
      setActiveAnalysisRules('');
      setActiveAnalysisTrainer('');
      setActiveAnalysisRecommendation('');
      setAnalysisAssignedUsers([]);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Whats-Next (B), Coaching (C), Freistoss (D) scenes creator
  const [sceneType, setSceneType] = useState<'whatsnext' | 'coaching' | 'freestoss'>('whatsnext');
  const [sceneSubCategory, setSceneSubCategory] = useState<string>('flanken');
  const [sceneVideo, setSceneVideo] = useState('');
  const [sceneQuestion, setSceneQuestion] = useState('');
  const [sceneAnswers, setSceneAnswers] = useState<string[]>(['', '', '', '', '', '']); // 6 answers
  const [sceneCorrect, setSceneCorrect] = useState('');
  const [sceneFollowUpText, setSceneFollowUpText] = useState('');

  const handleAddMCScene = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sceneVideo) return;

    // Filter empty options
    const filteredAnswers = sceneAnswers.filter(a => a.trim() !== '');

    try {
      const dataToSave: any = {
        type: sceneType,
        videoLink: sceneVideo,
        question: sceneQuestion,
        answers: filteredAnswers,
        correctAnswer: sceneCorrect,
        followUpText: sceneFollowUpText,
        assignedUsers: mcAssignedUsers
      };

      if (sceneType === 'whatsnext') {
        dataToSave.subCategory = sceneSubCategory;
      }

      if (editingSceneId) {
        await setDoc(doc(db, 'video_scenes', editingSceneId), dataToSave);
        alert('MC-Szene erfolgreich aktualisiert!');
        setEditingSceneId(null);
      } else {
        await addDoc(collection(db, 'video_scenes'), dataToSave);
        alert('MC-Szene erfolgreich angelegt!');
      }

      setSceneVideo('');
      setSceneQuestion('');
      setSceneAnswers(['', '', '', '', '', '']);
      setSceneCorrect('');
      setSceneFollowUpText('');
      setMcAssignedUsers([]);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // E) Elfmeter creator
  const [penaltyType, setPenaltyType] = useState<'elfmeter_lernen' | 'elfmeter_uebung'>('elfmeter_lernen');
  const [penaltyVideo, setPenaltyVideo] = useState('');
  const [penaltyCorrect, setPenaltyCorrect] = useState('Links');
  const [penaltyFollowUp, setPenaltyFollowUp] = useState('');

  const handleAddPenaltyScene = async () => {
    if (!penaltyVideo) return;
    try {
      const dataToSave = {
        type: penaltyType,
        videoLink: penaltyVideo,
        correctAnswer: penaltyCorrect, // e.g. "Links", "Rechts", or direction explanation
        followUpText: penaltyFollowUp,
        level: penaltyLevel,
        assignedUsers: penaltyAssignedUsers
      };

      if (editingSceneId) {
        await setDoc(doc(db, 'video_scenes', editingSceneId), dataToSave);
        alert('Elfmeterszene erfolgreich aktualisiert!');
        setEditingSceneId(null);
      } else {
        await addDoc(collection(db, 'video_scenes'), dataToSave);
        alert('Elfmeterszene erfolgreich angelegt!');
      }

      setPenaltyVideo('');
      setPenaltyFollowUp('');
      setPenaltyLevel('Level 1');
      setPenaltyAssignedUsers([]);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // F) Veo Links & G) Big Save creators
  const [veoTeam, setVeoTeam] = useState<'U16' | 'U17' | 'U19'>('U19');
  const [veoDate, setVeoDate] = useState('');
  const [veoLink, setVeoLink] = useState('');
  const [veoTitle, setVeoTitle] = useState('');

  const handleAddVeoLink = async () => {
    if (!veoLink) return;
    try {
      const dataToSave = {
        type: 'veo',
        team: veoTeam,
        date: veoDate,
        videoLink: veoLink,
        question: veoTitle,
        assignedUsers: veoAssignedUsers
      };

      if (editingSceneId) {
        await setDoc(doc(db, 'video_scenes', editingSceneId), dataToSave);
        alert('Veo Link erfolgreich aktualisiert!');
        setEditingSceneId(null);
      } else {
        await addDoc(collection(db, 'video_scenes'), dataToSave);
        alert('Veo Link erfolgreich hinzugefügt!');
      }

      setVeoLink('');
      setVeoTitle('');
      setVeoAssignedUsers([]);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const [bsSeason, setBsSeason] = useState('2026/2027');
  const [bsPart, setBsPart] = useState('1');
  const [bsNominations, setBsNominations] = useState('');
  const [bsWinner, setBsWinner] = useState('');
  const [bsLink, setBsLink] = useState('');

  const handleAddBigSaveAward = async () => {
    if (!bsLink) return;
    try {
      const dataToSave = {
        type: 'bigsave',
        season: bsSeason,
        part: bsPart,
        nominations: bsNominations,
        winner: bsWinner,
        videoLink: bsLink,
        assignedUsers: bsAssignedUsers
      };

      if (editingSceneId) {
        await setDoc(doc(db, 'video_scenes', editingSceneId), dataToSave);
        alert('Big Save Award erfolgreich aktualisiert!');
        setEditingSceneId(null);
      } else {
        await addDoc(collection(db, 'video_scenes'), dataToSave);
        alert('Big Save Award erfolgreich eingetragen!');
      }

      setBsNominations('');
      setBsWinner('');
      setBsLink('');
      setBsAssignedUsers([]);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteScene = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'video_scenes', id));
      loadAllData();
      setSceneToDelete(null);
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // SUB-SECTION 5: WETTKÄMPFE (COMPETITIONS)
  // ==========================================
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [compToDelete, setCompToDelete] = useState<any | null>(null);

  const clearCompEdit = () => {
    setEditingCompId(null);
    setTwDate('');
    setTwWinnerUid('');
    setTwSecondUid('');
    setChallPeriod('');
    setChallLink('');
    setChallCreator('');
    setChallSuccessful([]);
    setChallDescription('');
    setRopePeriod('');
    setRopeLink('');
    setRopeCreator('');
    setRopeSuccessful([]);
    setRopeDescription('');
    setQuizQuestion('');
    setQuizAnswers(['', '', '', '']);
    setQuizCorrectIdx(0);
    setQuizExplanation('');
    setQuizLevel(1);
  };

  const handleEditCompClick = (c: any) => {
    setEditingCompId(c.id);
    if (c.type === 'training') {
      setTwDate(c.date || '');
      const wUser = users.find(u => u.name === c.winner);
      const sUser = users.find(u => u.name === c.second);
      setTwWinnerUid(wUser ? wUser.uid : '');
      setTwSecondUid(sUser ? sUser.uid : '');
    } else if (c.type === 'challenge') {
      setChallPeriod(c.period || '');
      setChallLink(c.videoLink || '');
      setChallCreator(c.creator || '');
      setChallSuccessful(c.successfulUsers || []);
      setChallDescription(c.description || '');
    } else if (c.type === 'seilspringen') {
      setRopePeriod(c.period || '');
      setRopeLink(c.videoLink || '');
      setRopeCreator(c.creator || '');
      setRopeSuccessful(c.successfulUsers || []);
      setRopeDescription(c.description || '');
    } else if (c.type === 'quiz') {
      setQuizQuestion(c.question || '');
      setQuizAnswers(c.answers || ['', '', '', '']);
      setQuizCorrectIdx(c.correctAnswer || 0);
      setQuizExplanation(c.explanation || '');
      setQuizLevel(c.level || 1);
    }
  };

  // Trainingswettkampf creation (points awarded immediately!)
  const [twDate, setTwDate] = useState('');
  const [twWinnerUid, setTwWinnerUid] = useState('');
  const [twSecondUid, setTwSecondUid] = useState('');

  const handleAddTrainingswettkampf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twDate || !twWinnerUid) {
      alert('Bitte fülle alle Trainingswettkampf-Felder aus!');
      return;
    }

    const winnerUser = users.find(u => u.uid === twWinnerUid);

    if (!winnerUser) return;

    try {
      if (editingCompId) {
        await updateDoc(doc(db, 'competitions', editingCompId), {
          date: twDate,
          winner: winnerUser.name,
          second: ''
        });
        alert('Trainingswettkampf erfolgreich aktualisiert!');
        clearCompEdit();
      } else {
        // 1. Save Competition log
        await addDoc(collection(db, 'competitions'), {
          type: 'training',
          date: twDate,
          winner: winnerUser.name,
          second: ''
        });

        // 2. Award 1 point to winner
        const wRef = doc(db, 'users', twWinnerUid);
        await updateDoc(wRef, {
          points: increment(1),
          [`pointsByCategory.Wettkämpfe`]: increment(1)
        });
        await addDoc(collection(db, 'point_logs'), {
          userId: twWinnerUid,
          points: 1,
          category: 'Wettkämpfe',
          action: 'Trainingswettkampf gewonnen',
          date: twDate
        });

        alert('Wettkampfergebnisse gespeichert und Punkte gutgeschrieben!');
        setTwDate('');
        setTwWinnerUid('');
        setTwSecondUid('');
      }
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Challenge builder
  const [challPeriod, setChallPeriod] = useState('');
  const [challLink, setChallLink] = useState('');
  const [challCreator, setChallCreator] = useState('');
  const [challSuccessful, setChallSuccessful] = useState<string[]>([]);
  const [challDescription, setChallDescription] = useState('');

  const handleAddChallenge = async () => {
    if (!challPeriod || !challCreator) return;
    try {
      if (editingCompId) {
        await updateDoc(doc(db, 'competitions', editingCompId), {
          period: challPeriod,
          videoLink: challLink,
          creator: challCreator,
          successfulUsers: challSuccessful,
          description: challDescription
        });
        alert('Challenge erfolgreich aktualisiert!');
        clearCompEdit();
      } else {
        // 1. Save Challenge Competition
        const challRef = await addDoc(collection(db, 'competitions'), {
          type: 'challenge',
          period: challPeriod,
          videoLink: challLink,
          creator: challCreator,
          successfulUsers: challSuccessful,
          description: challDescription
        });

        // 2. Award 2 points to creator profile if they exist in users list
        const creatorProfile = users.find(u => u.name === challCreator);
        const todayStr = new Date().toISOString().split('T')[0];

        if (creatorProfile) {
          await updateDoc(doc(db, 'users', creatorProfile.uid), {
            points: increment(2),
            [`pointsByCategory.Wettkämpfe`]: increment(2)
          });
          await addDoc(collection(db, 'point_logs'), {
            userId: creatorProfile.uid,
            points: 2,
            category: 'Wettkämpfe',
            action: `Koordinationsleiter-Challenge erstellt`,
            date: todayStr
          });
        }

        // 3. Award 1 point to each successful user
        for (const uid of challSuccessful) {
          await updateDoc(doc(db, 'users', uid), {
            points: increment(1),
            [`pointsByCategory.Wettkämpfe`]: increment(1)
          });
          await addDoc(collection(db, 'point_logs'), {
            userId: uid,
            points: 1,
            category: 'Wettkämpfe',
            action: `Koordinationsleiter-Challenge erfolgreich absolviert`,
            date: todayStr
          });
        }

        alert('Challenge erfolgreich erstellt und Punkte verteilt!');
        setChallPeriod('');
        setChallLink('');
        setChallCreator('');
        setChallSuccessful([]);
        setChallDescription('');
      }
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Seilspringen Challenge builder
  const [ropePeriod, setRopePeriod] = useState('');
  const [ropeLink, setRopeLink] = useState('');
  const [ropeCreator, setRopeCreator] = useState('');
  const [ropeSuccessful, setRopeSuccessful] = useState<string[]>([]);
  const [ropeDescription, setRopeDescription] = useState('');

  const handleAddRopeChallenge = async () => {
    if (!ropePeriod || !ropeCreator) return;
    try {
      if (editingCompId) {
        await updateDoc(doc(db, 'competitions', editingCompId), {
          period: ropePeriod,
          videoLink: ropeLink,
          creator: ropeCreator,
          successfulUsers: ropeSuccessful,
          description: ropeDescription
        });
        alert('Seilspringen Challenge erfolgreich aktualisiert!');
        clearCompEdit();
      } else {
        // 1. Save Seilspringen Competition
        const ropeRef = await addDoc(collection(db, 'competitions'), {
          type: 'seilspringen',
          period: ropePeriod,
          videoLink: ropeLink,
          creator: ropeCreator,
          successfulUsers: ropeSuccessful,
          description: ropeDescription
        });

        // 2. Award 2 points to creator profile if they exist in users list
        const creatorProfile = users.find(u => u.name === ropeCreator);
        const todayStr = new Date().toISOString().split('T')[0];

        if (creatorProfile) {
          await updateDoc(doc(db, 'users', creatorProfile.uid), {
            points: increment(2),
            [`pointsByCategory.Wettkämpfe`]: increment(2)
          });
          await addDoc(collection(db, 'point_logs'), {
            userId: creatorProfile.uid,
            points: 2,
            category: 'Wettkämpfe',
            action: `Seilspringen Challenge erstellt`,
            date: todayStr
          });
        }

        // 3. Award 1 point to each successful user
        for (const uid of ropeSuccessful) {
          await updateDoc(doc(db, 'users', uid), {
            points: increment(1),
            [`pointsByCategory.Wettkämpfe`]: increment(1)
          });
          await addDoc(collection(db, 'point_logs'), {
            userId: uid,
            points: 1,
            category: 'Wettkämpfe',
            action: `Seilspringen Challenge erfolgreich absolviert`,
            date: todayStr
          });
        }

        alert('Seilspringen Challenge erfolgreich erstellt und Punkte verteilt!');
        setRopePeriod('');
        setRopeLink('');
        setRopeCreator('');
        setRopeSuccessful([]);
        setRopeDescription('');
      }
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // State, Fetch & Save for special locked Training Area Contents (Offensivtechniken, Neurozentriertes Training auf dem Platz, Neuroathletiktraining)
  const [trainingLinks, setTrainingLinks] = useState<{ [id: string]: Array<{ title: string; url: string }> }>({
    offensiv_training: [{ title: '', url: '' }],
    gleichgewicht_training: [{ title: '', url: '' }],
    neuro_training: [{ title: '', url: '' }],
    torwart_athletik_training: [{ title: '', url: '' }],
    torwart_athletik_antritt: [{ title: '', url: '' }],
    torwart_athletik_schnelle_beine: [{ title: '', url: '' }],
    torwart_athletik_explosivitaet: [{ title: '', url: '' }],
    torwart_athletik_beweglichkeit: [{ title: '', url: '' }],
    torwart_athletik_gleichgewicht: [{ title: '', url: '' }],
    kognition_ball_training: [{ title: '', url: '' }],
    mental_tr_selbstvertrauen: [{ title: '', url: '' }],
    mental_tr_fokus: [{ title: '', url: '' }],
    mental_tr_externe_faktoren: [{ title: '', url: '' }],
    mental_tr_fehler: [{ title: '', url: '' }]
  });

  const [kognitionBallHints, setKognitionBallHints] = useState<string[]>(['']);

  useEffect(() => {
    if (activeSubSection !== 'wett') return;
    const fetchTrainingLinks = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'config', 'contents'));
        const trainingCategories = [
          'offensiv_training',
          'gleichgewicht_training',
          'neuro_training',
          'torwart_athletik_training',
          'torwart_athletik_antritt',
          'torwart_athletik_schnelle_beine',
          'torwart_athletik_explosivitaet',
          'torwart_athletik_beweglichkeit',
          'torwart_athletik_gleichgewicht',
          'kognition_ball_training',
          'mental_tr_selbstvertrauen',
          'mental_tr_fokus',
          'mental_tr_externe_faktoren',
          'mental_tr_fehler'
        ];
        const formatted: { [id: string]: Array<{ title: string; url: string }> } = {};
        
        if (docSnap.exists()) {
          const data = docSnap.data() || {};
          trainingCategories.forEach(id => {
            const val = data[id];
            if (Array.isArray(val)) {
              formatted[id] = val.map((item: any) => ({
                title: item?.title || '',
                url: item?.url || ''
              }));
            } else {
              formatted[id] = [{ title: '', url: '' }];
            }
          });
          setTrainingLinks(formatted);

          const hints = data.kognition_ball_hints;
          if (Array.isArray(hints)) {
            setKognitionBallHints(hints.length > 0 ? hints : ['']);
          } else {
            setKognitionBallHints(['']);
          }
        } else {
          trainingCategories.forEach(id => {
            formatted[id] = [{ title: '', url: '' }];
          });
          setTrainingLinks(formatted);
          setKognitionBallHints(['']);
        }
      } catch (err) {
        console.error('Error fetching training links:', err);
      }
    };
    fetchTrainingLinks();
  }, [activeSubSection]);

  const handleSaveTrainingLinks = async () => {
    try {
      const docRef = doc(db, 'config', 'contents');
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};
      
      await setDoc(docRef, {
        ...existingData,
        ...trainingLinks,
        kognition_ball_hints: kognitionBallHints
      });
      alert('Trainings-Inhalte erfolgreich gespeichert!');
    } catch (err) {
      console.error('Error saving training links:', err);
      alert('Fehler beim Speichern der Trainings-Inhalte.');
    }
  };

  // Wissens-Quiz creator
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<string[]>(['', '', '', '']); // 4 MC options
  const [quizCorrectIdx, setQuizCorrectIdx] = useState(0);
  const [quizExplanation, setQuizExplanation] = useState('');
  const [quizLevel, setQuizLevel] = useState<number>(1);
  const [quizLevelFilter, setQuizLevelFilter] = useState<number | 'all'>('all');

  const handleAddQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizQuestion) return;
    try {
      const quizPayload = {
        type: 'quiz',
        question: quizQuestion,
        answers: quizAnswers,
        correctAnswer: quizCorrectIdx,
        explanation: quizExplanation,
        level: Number(quizLevel) || 1
      };

      if (editingCompId) {
        await setDoc(doc(db, 'competitions', editingCompId), quizPayload, { merge: true });
        alert('Quizfrage erfolgreich aktualisiert!');
        clearCompEdit();
      } else {
        await addDoc(collection(db, 'competitions'), quizPayload);
        alert('Quizfrage erfolgreich hinzugefügt!');
        clearCompEdit();
      }
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Fehler beim Speichern der Quizfrage.');
    }
  };

  const handleDeleteComp = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'competitions', id));
      setCompToDelete(null);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAdminWorkoutLog = async (log: WorkoutLog) => {
    try {
      // 1. Delete document from workout_logs collection
      await deleteDoc(doc(db, 'workout_logs', log.id));

      // 2. Deduct 1 point from user profile
      const targetUser = users.find(u => u.uid === log.userId);
      if (targetUser) {
        const currentPts = targetUser.points || 0;
        const currentKraftPts = targetUser.pointsByCategory?.Kraftsport || 0;
        const newPts = Math.max(0, currentPts - 1);
        const newKraftPts = Math.max(0, currentKraftPts - 1);

        const userRef = doc(db, 'users', log.userId);
        await updateDoc(userRef, {
          points: newPts,
          'pointsByCategory.Kraftsport': newKraftPts
        });

        // 3. Log point deduction in point_logs
        const todayStr = new Date().toISOString().split('T')[0];
        await addDoc(collection(db, 'point_logs'), {
          userId: log.userId,
          points: -1,
          category: 'Kraftsport',
          action: `Trainingseinheit gelöscht (-1 Pkt): ${log.workoutName}`,
          date: todayStr
        });

        // Update selectedUser if currently open
        if (selectedUser && selectedUser.uid === log.userId) {
          setSelectedUser({
            ...selectedUser,
            points: newPts,
            pointsByCategory: {
              ...(selectedUser.pointsByCategory || {}),
              Kraftsport: newKraftPts
            }
          });
        }
      }

      setWorkoutLogs(prev => prev.filter(l => l.id !== log.id));
      setWorkoutLogToDelete(null);
      if (typeof loadAllData === 'function') {
        await loadAllData();
      }
    } catch (err) {
      console.error('Error deleting workout log:', err);
      alert('Fehler beim Löschen der Trainingseinheit.');
    }
  };

  // ==========================================
  // SUB-SECTION 6: INHALTE (TUTORIALS VIDEO REFS)
  // ==========================================
  const [tutLinks, setTutLinks] = useState<{ [id: string]: Array<{ title: string; url: string }> }>({});

  useEffect(() => {
    const fetchLinks = async () => {
      const docSnap = await getDoc(doc(db, 'config', 'contents'));
      const categoriesList = [
        'kraftsport', 'kraftsport_tracking', 'mental', 'mental_fehler', 'kognition', 'neuro', 'tw_at', 'tw_at_antritt', 'tw_at_schnelle_beine', 'tw_at_explosivitaet', 'tw_at_beweglichkeit', 'tw_at_gleichgewicht', 'tw_at_technik', 'nutrition', 'coaching', 'warmup', 'freistoß', 'eckball', 'elfmeter', 'motivation', 'big_saves', 'regelkunde', 'anbieteverhalten', 'anbieteverhalten_mitspielen', 'anbieteverhalten_umschaltverhalten', 'koordinationsleiter_challenge', 'tw_taktik', 'tw_taktik_flanken', 'tw_taktik_querpass', 'tw_taktik_1vs1_nahdistanz', 'tw_taktik_1vs1', 'tw_taktik_nahdistanz', 'tw_taktik_ferndistanz', 'tw_taktik_abwehrkette'
      ];
      if (docSnap.exists()) {
        const data = docSnap.data() || {};
        const formatted: { [id: string]: Array<{ title: string; url: string }> } = {};
        categoriesList.forEach(id => {
          const val = data[id];
          if (Array.isArray(val)) {
            formatted[id] = val.map((item: any) => ({
              title: item?.title || '',
              url: item?.url || ''
            }));
          } else if (typeof val === 'string' && val.trim() !== '') {
            formatted[id] = [{ title: '', url: val }];
          } else {
            formatted[id] = [{ title: '', url: '' }];
          }
        });
        setTutLinks(formatted);
      } else {
        const empty: { [id: string]: Array<{ title: string; url: string }> } = {};
        categoriesList.forEach(id => {
          empty[id] = [{ title: '', url: '' }];
        });
        setTutLinks(empty);
      }
    };
    fetchLinks();
  }, [activeSubSection]);

  const handleSaveTutorialLinks = async () => {
    try {
      const docRef = doc(db, 'config', 'contents');
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};
      
      await setDoc(docRef, {
        ...existingData,
        ...tutLinks
      });
      alert('Tutorial-Videolinks erfolgreich gespeichert!');
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // SUB-SECTION 7: INDIVIDUELLE ZIELE (ASSESSOR)
  // ==========================================
  const [assessorUserUid, setAssessorUserUid] = useState('');
  const [goalAssessments, setGoalAssessments] = useState<{ [goalId: string]: string }>({});
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  const [selectedUserBigSaves, setSelectedUserBigSaves] = useState<Array<{ title: string; url: string }>>([{ title: '', url: '' }]);

  useEffect(() => {
    if (assessorUserUid) {
      const selectedUser = users.find(u => u.uid === assessorUserUid) as any;
      const vids = selectedUser?.bigSaveVideos;
      if (Array.isArray(vids)) {
        setSelectedUserBigSaves(vids.map((item: any) => ({
          title: item?.title || '',
          url: item?.url || ''
        })));
      } else if (typeof vids === 'string' && vids.trim() !== '') {
        setSelectedUserBigSaves([{ title: '', url: vids }]);
      } else {
        setSelectedUserBigSaves([{ title: '', url: '' }]);
      }
    } else {
      setSelectedUserBigSaves([{ title: '', url: '' }]);
    }
  }, [assessorUserUid, users]);

  const handleSaveUserBigSaves = async () => {
    if (!assessorUserUid) return;
    try {
      await updateDoc(doc(db, 'users', assessorUserUid), {
        bigSaveVideos: selectedUserBigSaves
      });
      alert('Big Save Videos für diesen Keeper erfolgreich gespeichert!');
      loadAllData();
    } catch (err) {
      console.error('Error saving user big saves:', err);
      alert('Fehler beim Speichern der Big Save Videos.');
    }
  };

  // Level To-Dos Management State
  const [levelTodos, setLevelTodos] = useState<{ [level: number]: string[] }>({});
  const [levelTodosLoading, setLevelTodosLoading] = useState(false);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | 'all'>('all');
  const [newTodoLevel, setNewTodoLevel] = useState<number>(1);
  const [newTodoText, setNewTodoText] = useState('');
  const [editingTodo, setEditingTodo] = useState<{ level: number; index: number; text: string } | null>(null);
  const [todoToDelete, setTodoToDelete] = useState<{ level: number; index: number; text: string } | null>(null);
  const [isSyncingAllTodos, setIsSyncingAllTodos] = useState(false);
  const [isCleaningWhatsNext, setIsCleaningWhatsNext] = useState(false);
  const [levelTodoFeedback, setLevelTodoFeedback] = useState<string | null>(null);

  const loadLevelTodosData = async () => {
    setLevelTodosLoading(true);
    try {
      const data = await fetchLevelTodos();
      setLevelTodos(data);
    } catch (err) {
      console.error('Error loading level todos in CoachingZone:', err);
    } finally {
      setLevelTodosLoading(false);
    }
  };

  const handleCreateLevelTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    const cleanText = sanitizeWhatsNextText(newTodoText.trim());
    try {
      const updatedTodos = { ...levelTodos };
      const currentList = updatedTodos[newTodoLevel] ? [...updatedTodos[newTodoLevel]] : [];
      if (currentList.includes(cleanText)) {
        alert('Dieses To-Do existiert bereits in Level ' + newTodoLevel);
        return;
      }
      currentList.push(cleanText);
      updatedTodos[newTodoLevel] = currentList;

      await saveLevelTodosConfig(updatedTodos);
      setLevelTodos(updatedTodos);
      setNewTodoText('');

      // Auto-sync for all users
      await syncAllUsersLevelTodos();
      await loadAllData();

      setLevelTodoFeedback(`Neues To-Do zu Level ${newTodoLevel} hinzugefügt und für alle berechtigten Keeper aktiviert!`);
      setTimeout(() => setLevelTodoFeedback(null), 5000);
    } catch (err) {
      console.error('Error creating level todo:', err);
      alert('Fehler beim Anlegen des Level-To-Dos.');
    }
  };

  const handleSaveEditLevelTodo = async () => {
    if (!editingTodo || !editingTodo.text.trim()) return;
    const cleanNewText = sanitizeWhatsNextText(editingTodo.text.trim());
    const { level, index } = editingTodo;
    const oldText = levelTodos[level]?.[index];
    if (!oldText) return;

    try {
      const updatedTodos = { ...levelTodos };
      const currentList = [...(updatedTodos[level] || [])];
      currentList[index] = cleanNewText;
      updatedTodos[level] = currentList;

      await saveLevelTodosConfig(updatedTodos);
      setLevelTodos(updatedTodos);

      // Update existing goals with the old text in Firestore
      const goalsSnap = await getDocs(collection(db, 'goals'));
      for (const gDoc of goalsSnap.docs) {
        const gData = gDoc.data();
        if (gData.category === 'todo' && (gData.description === oldText || gData.description === sanitizeWhatsNextText(oldText))) {
          await updateDoc(doc(db, 'goals', gDoc.id), { description: cleanNewText });
        }
      }

      await syncAllUsersLevelTodos();
      await loadAllData();
      setEditingTodo(null);
      setLevelTodoFeedback(`To-Do für Level ${level} erfolgreich aktualisiert und für alle Keeper angepasst!`);
      setTimeout(() => setLevelTodoFeedback(null), 5000);
    } catch (err) {
      console.error('Error updating level todo:', err);
      alert('Fehler beim Aktualisieren des Level-To-Dos.');
    }
  };

  const handleConfirmDeleteLevelTodo = async () => {
    if (!todoToDelete) return;
    const { level, index, text } = todoToDelete;
    try {
      const updatedTodos = { ...levelTodos };
      const currentList = (updatedTodos[level] || []).filter((_, idx) => idx !== index);
      updatedTodos[level] = currentList;

      await saveLevelTodosConfig(updatedTodos);
      setLevelTodos(updatedTodos);

      // Delete existing goals for this todo
      const goalsSnap = await getDocs(collection(db, 'goals'));
      for (const gDoc of goalsSnap.docs) {
        const gData = gDoc.data();
        if (gData.category === 'todo' && (gData.description === text || gData.description === sanitizeWhatsNextText(text))) {
          await deleteDoc(doc(db, 'goals', gDoc.id));
        }
      }

      await syncAllUsersLevelTodos();
      await loadAllData();
      setTodoToDelete(null);
      setLevelTodoFeedback(`To-Do aus Level ${level} gelöscht und bei allen Keepern entfernt.`);
      setTimeout(() => setLevelTodoFeedback(null), 5000);
    } catch (err) {
      console.error('Error deleting level todo:', err);
      alert('Fehler beim Löschen des Level-To-Dos.');
    }
  };

  const handleSyncAllKeepers = async () => {
    setIsSyncingAllTodos(true);
    try {
      await syncAllUsersLevelTodos();
      await loadAllData();
      await loadLevelTodosData();
      setLevelTodoFeedback('Alle Level-To-Dos wurden erfolgreich für alle Keeper synchronisiert und aktualisiert!');
      setTimeout(() => setLevelTodoFeedback(null), 5000);
    } catch (err) {
      console.error('Error syncing all keepers:', err);
      alert('Fehler bei der Synchronisation.');
    } finally {
      setIsSyncingAllTodos(false);
    }
  };

  const handleCleanWhatsNext = async () => {
    setIsCleaningWhatsNext(true);
    try {
      const res = await updateAllExistingGoalsWhatsNextToTaktikanalyse();
      await syncAllUsersLevelTodos();
      await loadAllData();
      await loadLevelTodosData();
      setLevelTodoFeedback(`Bereinigung abgeschlossen: ${res.updatedCount} To-Dos/Einträge von "Whats-Next" zu "Taktikanalyse" konvertiert!`);
      setTimeout(() => setLevelTodoFeedback(null), 6000);
    } catch (err) {
      console.error('Error cleaning Whats-Next text:', err);
      alert('Fehler bei der Bereinigung.');
    } finally {
      setIsCleaningWhatsNext(false);
    }
  };

  const [adminGoalType, setAdminGoalType] = useState<'Technik' | 'Taktik' | 'Entscheidung'>('Technik');
  const [adminGoalDesc, setAdminGoalDesc] = useState('');
  const [adminGoalCategory, setAdminGoalCategory] = useState<'ziel' | 'todo'>('ziel');
  const [extendingGoalId, setExtendingGoalId] = useState<string | null>(null);
  const [goalFeedbackMsg, setGoalFeedbackMsg] = useState<{ id: string; text: string } | null>(null);

  const handleCreateAdminGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessorUserUid || !adminGoalDesc.trim()) return;

    const { dateStr, evaluableFrom } = calculateThreeWeeksFromNow();
    const newGoal = {
      userId: assessorUserUid,
      type: adminGoalCategory === 'todo' ? 'Technik' : adminGoalType,
      description: adminGoalDesc,
      completed: false,
      date: dateStr,
      ...(adminGoalCategory === 'ziel' ? { evaluableFrom: evaluableFrom } : {}),
      actions: { team: false, tw: false, play: false, extra: false },
      createdBy: 'trainer',
      category: adminGoalCategory
    };

    try {
      await addDoc(collection(db, 'goals'), newGoal);
      setAdminGoalDesc('');
      loadAllData();
      alert(adminGoalCategory === 'todo' ? 'To Do erfolgreich für den Spieler angelegt!' : 'Trainerziel erfolgreich für den Spieler angelegt (Selbstbewertung in 3 Wochen)!');
    } catch (err) {
      console.error('Error adding admin goal:', err);
    }
  };

  const handleExtendGoal = async (goal: Goal) => {
    setExtendingGoalId(goal.id);
    try {
      const { dateStr, evaluableFrom } = calculateThreeWeeksFromNow();
      const nextCount = (goal.renewalCount || 0) + 1;

      await updateDoc(doc(db, 'goals', goal.id), {
        renewedAt: dateStr,
        evaluableFrom: evaluableFrom,
        completed: false, // re-opens the goal for self-evaluation in 3 weeks
        evaluation: null, // resets rating for the new 3-week cycle
        renewalCount: nextCount
      });

      const [ey, em, ed] = evaluableFrom.split('-');
      const unlockFormatted = `${ed}.${em}.${ey}`;

      setGoalFeedbackMsg({
        id: goal.id,
        text: `Ziel um 3 Wochen verlängert! Der Nutzer kann dieses Ziel ab dem ${unlockFormatted} erneut selbst bewerten.`
      });

      setTimeout(() => {
        setGoalFeedbackMsg(prev => prev?.id === goal.id ? null : prev);
      }, 6000);

      loadAllData();
    } catch (err) {
      console.error('Error extending goal:', err);
      alert('Fehler beim Verlängern des Ziels.');
    } finally {
      setExtendingGoalId(null);
    }
  };

  const handleToggleTodoCompletedByTrainer = async (goal: Goal) => {
    const nextCompleted = !goal.completed;
    try {
      await updateDoc(doc(db, 'goals', goal.id), {
        completed: nextCompleted,
        evaluationDate: nextCompleted ? new Date().toISOString().split('T')[0] : null
      });

      // Reward/deduct point for the target user (goal.userId)
      const pointsDiff = nextCompleted ? 1 : -1;
      const todayStr = new Date().toISOString().split('T')[0];

      const userRef = doc(db, 'users', goal.userId);
      await updateDoc(userRef, {
        points: increment(pointsDiff),
        [`pointsByCategory.Ziele`]: increment(pointsDiff)
      });

      // Log point log for the target user
      await addDoc(collection(db, 'point_logs'), {
        userId: goal.userId,
        points: pointsDiff,
        category: 'Ziele',
        action: nextCompleted ? `To Do von Trainer abgeschlossen: ${goal.description}` : `To Do von Trainer wieder geöffnet: ${goal.description}`,
        date: todayStr
      });

      loadAllData();
    } catch (err) {
      console.error('Error toggling todo completion by trainer:', err);
    }
  };

  const handleSaveGoalAssessment = async (goalId: string) => {
    const text = goalAssessments[goalId] || '';
    try {
      await updateDoc(doc(db, 'goals', goalId), { assessment: text });
      alert('Trainer-Einschätzung erfolgreich gespeichert!');
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'goals', id));
      loadAllData();
      setGoalToDelete(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 font-sans flex flex-col md:flex-row gap-6">
      {/* Admin Sidebar navigation */}
      <aside className="w-full md:w-56 bg-slate-900 border border-slate-800 p-3 rounded-2xl shrink-0 space-y-1">
        <div className="px-3 py-2 mb-2 text-xs font-bold text-slate-500 font-mono uppercase border-b border-slate-800">
          {currentUserProfile?.role === 'kraftsport' ? 'Coaching Zone (Kraftsport)' : 'Coaching Zone (Admin)'}
        </div>

        {[
          { id: 'messages', label: '0. Usernachrichten', icon: MessageSquare, roles: ['admin'] },
          { id: 'login', label: '1. Login & User-Setup', icon: Settings, roles: ['admin'] },
          { id: 'profiles', label: '2. Keeper-Profile', icon: FileText, roles: ['admin'] },
          { id: 'physique', label: '3. Körpermaße & Tracking', icon: Activity, roles: ['admin', 'kraftsport'] },
          { id: 'kraft', label: '4. Krafttraining-DB', icon: Dumbbell, roles: ['admin', 'kraftsport'] },
          { id: 'video', label: '5. Videoanalyse-DB', icon: Video, roles: ['admin'] },
          { id: 'wett', label: '6. Training', icon: Swords, roles: ['admin'] },
          { id: 'inhalte', label: '7. Inhalte', icon: BookOpen, roles: ['admin'] },
          { id: 'ziele', label: '8. Individuelle Ziele', icon: Target, roles: ['admin'] },
        ]
        .filter(item => item.roles.includes(currentUserProfile?.role || 'admin'))
        .map((item) => {
          const Icon = item.icon;
          const isActive = activeSubSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSubSection(item.id as any)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </aside>

      {/* Admin Central panel viewport */}
      <main className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 min-w-0 space-y-6">
        {loading && (
          <div className="text-xs text-amber-500 font-mono text-center">
            Synchronisiere mit Firebase...
          </div>
        )}

        {/* 0. USERNACHRICHTEN (ADMIN CHAT PORTAL) */}
        {activeSubSection === 'messages' && (
          <div className="space-y-6" id="coaching-zone-messages-section">
            <h2 className="text-base font-bold text-white uppercase font-mono border-b border-slate-800 pb-2 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              <span>0. Usernachrichten</span>
            </h2>

            {selectedChatUserId ? (() => {
              const activeThread = activeThreads.find(t => t.userId === selectedChatUserId);
              if (!activeThread) {
                return (
                  <div className="text-center p-6 bg-slate-950 rounded-2xl border border-slate-850">
                    <p className="text-xs text-slate-400">Dieser Chatverlauf existiert nicht oder gehört einem archivierten Nutzer.</p>
                    <button
                      onClick={() => setSelectedChatUserId(null)}
                      className="mt-4 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white hover:bg-slate-850 cursor-pointer"
                    >
                      Zurück zur Übersicht
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  {/* Thread Header details */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-950 p-4 rounded-xl border border-slate-850 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedChatUserId(null)}
                          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 mr-2"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Zurück</span>
                        </button>
                        <h3 className="text-sm font-bold text-white uppercase font-mono">{activeThread.userName}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Letztes Thema: <span className="text-amber-500 font-semibold">{activeThread.topic}</span>
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                      {activeThread.messages.length} Nachricht(en) in diesem Chat
                    </span>
                  </div>

                  {/* Chat Timeline scrolling messages area */}
                  <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 h-[350px] overflow-y-auto space-y-4 no-scrollbar">
                    {activeThread.messages.map((msg) => {
                      const isCoach = msg.senderRole === 'Admin';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col max-w-[85%] ${
                            isCoach ? 'ml-auto items-end' : 'mr-auto items-start'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono font-bold text-zinc-500">
                            {isCoach ? (
                              <span className="text-amber-500">Coach (Du)</span>
                            ) : (
                              <span className="text-brand-neon">{msg.userName}</span>
                            )}
                            <span>•</span>
                            <span>{new Date(msg.timestamp).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                          <div
                            className={`p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                              isCoach
                                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-tr-none'
                                : 'bg-slate-950 border border-slate-850 text-white rounded-tl-none'
                            }`}
                          >
                            <div className="mb-1 text-[9px] font-mono font-bold uppercase text-zinc-500">
                              Thema: {msg.topic}
                            </div>
                            <p className="whitespace-pre-line text-white font-sans">{msg.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply Form */}
                  <form onSubmit={handleSendAdminReply} className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-1.5">
                      <span className="text-xs font-mono font-bold text-slate-400 uppercase">Antwort verfassen</span>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">An: {activeThread.userName}</span>
                    </div>

                    <textarea
                      value={adminReplyText}
                      onChange={(e) => setAdminReplyText(e.target.value)}
                      placeholder="Schreibe hier deine Antwort an den Keeper..."
                      rows={4}
                      required
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/60 text-white rounded-xl px-3 py-2.5 text-xs outline-none transition-all resize-none leading-relaxed font-sans"
                    />

                    {adminReplyError && (
                      <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-3 rounded-xl">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{adminReplyError}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-zinc-600">
                        🚫 Keine Anhänge / Datei-Uploads möglich
                      </span>
                      <button
                        type="submit"
                        disabled={adminReplySending}
                        className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/10 disabled:opacity-50 cursor-pointer"
                      >
                        {adminReplySending ? 'Sendet...' : 'Antwort senden'}
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                </div>
              );
            })() : (
              /* Threads List Grid */
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-850">
                  <span className="text-xs font-mono text-slate-400 uppercase">Aktive Chat-Verläufe ({activeThreads.length})</span>
                  <span className="text-[10px] font-mono text-zinc-500">Klicke auf einen Thread, um die Details anzusehen und zu antworten</span>
                </div>

                {activeThreads.length === 0 ? (
                  <div className="text-center p-12 bg-slate-950 rounded-2xl border border-slate-850 space-y-3">
                    <MessageSquare className="w-10 h-10 text-slate-700 mx-auto animate-pulse" />
                    <p className="text-xs font-semibold text-slate-400 font-mono uppercase">Keine aktiven Nachrichten</p>
                    <p className="text-[10px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                      Sobald Keeper Fragen oder Feedback im Support-Chat absenden, erscheinen diese hier chronologisch geordnet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {activeThreads.map((thread) => {
                      const isLastMessageCoach = thread.latestMessage?.senderRole === 'Admin';
                      return (
                        <div
                          key={thread.userId}
                          onClick={() => setSelectedChatUserId(thread.userId)}
                          className="group bg-slate-950 hover:bg-slate-950/80 border border-slate-850 hover:border-amber-500/30 p-4 rounded-xl transition-all flex justify-between items-center cursor-pointer"
                        >
                          <div className="space-y-1.5 min-w-0 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white font-mono uppercase">{thread.userName}</span>
                              {thread.userProfile?.club && (
                                <span className="text-[9px] font-mono text-zinc-500 bg-slate-900 border border-slate-850 px-1.5 py-0.2 rounded">
                                  {thread.userProfile.club}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                              <span className="text-slate-400">Thema:</span>
                              <span className="text-zinc-300 font-semibold">{thread.topic}</span>
                            </div>
                            <p className="text-xs text-slate-400 truncate max-w-lg font-sans">
                              {isLastMessageCoach ? (
                                <span className="text-amber-500/80 font-bold mr-1">Coach:</span>
                              ) : (
                                <span className="text-zinc-400 font-bold mr-1">Spieler:</span>
                              )}
                              {thread.latestMessage?.message}
                            </p>
                          </div>

                          <div className="text-right shrink-0 space-y-1.5">
                            <span className="block text-[10px] font-mono text-zinc-500">
                              {thread.latestMessage ? new Date(thread.latestMessage.timestamp).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : ''}
                            </span>
                            {!isLastMessageCoach && (
                              <span className="inline-block bg-brand-neon text-brand-bg font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full animate-pulse">
                                Offen
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 1. LOGIN & USER SETUP */}
        {activeSubSection === 'login' && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-white uppercase font-mono border-b border-slate-800 pb-2">
              1. Login & User-Setup
            </h2>

            {/* Custom Login Text setting */}
            <div className="space-y-2 max-w-lg bg-slate-950 p-4 rounded-xl border border-slate-850">
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider">
                Custom Login-Text ändern (Anmeldeseite)
              </label>
              <input
                type="text"
                value={customLoginText}
                onChange={(e) => setCustomLoginText(e.target.value)}
                placeholder="Willkommen beim Portal..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <button
                onClick={handleSaveLoginText}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
              >
                Login-Text speichern
              </button>
            </div>

            {/* Create new user Profile with Secondary App */}
            <form onSubmit={handleCreateUser} className="space-y-4 max-w-lg bg-slate-950 p-5 rounded-2xl border border-slate-850">
              <h3 className="text-xs font-bold text-white font-mono uppercase flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-amber-500" />
                Neuen Keeper / User anlegen
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Benutzername</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="z.B. keeper2"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Einmalkennwort (6+ Zeichen)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Voller Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Z.B. Max Mustermann"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Rolle (Berechtigung)</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-white"
                  >
                    <option value="keeper_verein">Keeper (Eigener Verein)</option>
                    <option value="keeper_extern">Keeper (Extern)</option>
                    <option value="kraftsport">Nur Kraftsport (Eingeschränkt)</option>
                    <option value="admin">Admin (Vollzugriff)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Verein</label>
                  <input
                    type="text"
                    value={newClub}
                    onChange={(e) => setNewClub(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Position</label>
                  <input
                    type="text"
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow cursor-pointer font-sans"
              >
                <Plus className="w-4 h-4 font-black" />
                <span>Benutzer in Firebase registrieren</span>
              </button>

              {userCreationMessage && (
                <p className="text-[10px] font-mono text-amber-500 mt-2 bg-slate-900/40 p-2 border border-slate-850 rounded">
                  {userCreationMessage}
                </p>
              )}
            </form>
          </div>
        )}

        {/* 2. PROFILES */}
        {activeSubSection === 'profiles' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-base font-bold text-white uppercase font-mono">
                2. Keeper-Profile
              </h2>
              <button
                onClick={() => setShowArchivedProfiles(!showArchivedProfiles)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{showArchivedProfiles ? 'Archivierte ausblenden' : 'Archivierte anzeigen'}</span>
              </button>
            </div>

            {/* List all profiles including admin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {users
                .filter(u => showArchivedProfiles ? true : !u.archived)
                .map((u) => (
                  <button
                    key={u.uid}
                    onClick={() => selectUserForEdit(u)}
                    className={`p-4 bg-slate-950 border rounded-xl hover:border-amber-500/40 text-left transition-all flex items-center justify-between ${
                      u.archived ? 'border-red-900/40 opacity-60 bg-red-950/5' : 'border-slate-850'
                    }`}
                  >
                    <div>
                      <span className="block font-bold text-white text-sm">
                        {u.name}
                        {u.archived && (
                          <span className="ml-2 text-[10px] uppercase font-mono font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                            Archiviert / Inaktiv
                          </span>
                        )}
                      </span>
                      <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                        @{u.username} • {u.club} • {u.position} • <span className="text-amber-500/80 font-bold">{u.role}</span>
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold bg-amber-500/15 text-amber-500 px-2.5 py-1 rounded-md">
                      {u.points} Pkt.
                    </span>
                  </button>
                ))}
            </div>

            {/* Edit modal inline form */}
            {selectedUser && (
              <div className="bg-slate-950 border border-amber-500/30 p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-850 pb-2.5">
                  <span className="text-xs font-bold text-white font-mono uppercase">PROFILBEARBEITUNG: {selectedUser.name}</span>
                  <button onClick={() => setSelectedUser(null)} className="text-xs text-slate-400 hover:text-white font-mono">
                    [ Schließen ]
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1">Benutzername (Login)</label>
                    <input type="text" value={selectedUser.username} readOnly disabled className="w-full bg-slate-900/40 border border-slate-800/60 rounded px-2.5 py-1.5 text-slate-400 font-mono cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1">Voller Name</label>
                    <input type="text" value={editUserName} onChange={(e) => setEditUserName(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1">Verein</label>
                    <input type="text" value={editUserClub} onChange={(e) => setEditUserClub(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1">Position</label>
                    <input type="text" value={editUserPosition} onChange={(e) => setEditUserPosition(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1">Wohnort</label>
                    <input type="text" value={editUserLocation} onChange={(e) => setEditUserLocation(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1">Schule</label>
                    <input type="text" value={editUserSchool} onChange={(e) => setEditUserSchool(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1">Sonstiges / Infos</label>
                    <input type="text" value={editUserOther} onChange={(e) => setEditUserOther(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-brand-neon font-mono mb-1 font-bold">E-Mail-Adresse (zwingend für Reset)</label>
                    <input type="email" value={editUserEmail} onChange={(e) => setEditUserEmail(e.target.value)} placeholder="name@beispiel.de" className="w-full bg-slate-900 border border-brand-neon/20 focus:border-brand-neon rounded px-2.5 py-1.5 text-white font-mono" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  {/* Role Selection */}
                  <div className="text-xs">
                    <label className="block text-[9px] text-slate-500 font-mono mb-1">Rolle / Berechtigung</label>
                    <select
                      value={editUserRole}
                      onChange={(e) => setEditUserRole(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-bold"
                    >
                      <option value="keeper_verein">Keeper (Verein)</option>
                      <option value="keeper_extern">Keeper (Extern)</option>
                      <option value="kraftsport">Kraftsport</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  {/* Archiving Toggle */}
                  <div className="text-xs flex flex-col justify-end">
                    <label className="block text-[9px] text-slate-500 font-mono mb-1">Konto-Status (Archivieren)</label>
                    <label className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 cursor-pointer hover:border-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={editUserArchived}
                        onChange={(e) => setEditUserArchived(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                      />
                      <span className="text-xs text-white font-bold font-mono">
                        {editUserArchived ? '🚨 ARCHIVIERT / INAKTIV' : '✅ AKTIV / FREIGESCHALTET'}
                      </span>
                    </label>
                  </div>

                  {/* Score modifier directly in Leaderboard */}
                  <div className="text-xs">
                    <label className="block text-[9px] text-slate-500 font-mono mb-1 font-bold text-amber-500">Punkte in Bestenliste anpassen</label>
                    <input type="number" value={editUserPoints} onChange={(e) => setEditUserPoints(parseInt(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono font-bold" />
                  </div>
                </div>

                {/* Password reset and admin message */}
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-[11px] font-bold text-white font-mono">Passwort zurücksetzen</h4>
                      <p className="text-[9px] text-slate-400 font-sans max-w-sm">
                        Sendet dem Benutzer eine offizielle Firebase Auth E-Mail zum Zurücksetzen des Passworts.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAdminResetPassword}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-mono font-bold rounded-lg text-[10px] transition-all cursor-pointer"
                    >
                      Reset-E-Mail senden
                    </button>
                  </div>
                  {editUserResetMsg && (
                    <p className="text-[10px] font-mono text-amber-500 bg-slate-950 p-1.5 rounded border border-slate-850">
                      {editUserResetMsg}
                    </p>
                  )}
                </div>

                {/* Direct Admin Password Override */}
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-brand-neon" />
                        <h4 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider">
                          Passwort direkt festlegen (Admin)
                        </h4>
                      </div>
                      <p className="text-[9px] text-slate-400 font-sans max-w-sm mt-0.5">
                        Überschreibt das Passwort sofort in Firebase Authentication – kein E-Mail-Reset erforderlich.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={directPassword}
                      onChange={(e) => setDirectPassword(e.target.value)}
                      placeholder="Neues Passwort (mind. 6 Zeichen)"
                      disabled={directPasswordLoading}
                      className="flex-1 bg-slate-950 border border-slate-750 focus:border-brand-neon rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAdminSetDirectPassword}
                      disabled={directPasswordLoading || !directPassword.trim()}
                      className="px-3 py-1.5 bg-brand-neon hover:bg-brand-neon-hover disabled:bg-slate-800 disabled:text-slate-650 text-slate-950 font-mono font-bold rounded-lg text-[10px] transition-all cursor-pointer whitespace-nowrap"
                    >
                      {directPasswordLoading ? 'Wird gesetzt...' : 'Passwort setzen'}
                    </button>
                  </div>

                  {directPasswordMsg && (
                    <div
                      className={`p-2 rounded-lg text-[10px] font-mono flex items-start gap-1.5 ${
                        directPasswordMsg.type === 'success'
                          ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                          : 'bg-red-950/40 border border-red-500/30 text-red-300'
                      }`}
                    >
                      {directPasswordMsg.type === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <span>{directPasswordMsg.text}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-850/60 flex justify-between items-center flex-wrap gap-2">
                  <button
                    onClick={handleSaveUserProfile}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Profil speichern</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTempPermissions(selectedUser.modulePermissions || {});
                      setShowPermissionModal(true);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Modulfreigabe</span>
                  </button>
                </div>

                {/* Trainings-Logbuch & 1-Rep Max Entwicklung */}
                {(() => {
                  const userLogs = workoutLogs
                    .filter(log => log.userId === selectedUser.uid)
                    .sort((a, b) => parseLogDate(b.date) - parseLogDate(a.date));
                  const completedExerciseIds = Array.from(new Set(
                    userLogs.flatMap(log => log.exercises?.map(e => e.exerciseId) || [])
                  ));

                  return (
                    <div className="pt-6 border-t border-slate-850 space-y-6">
                      <div className="border-b border-slate-850 pb-2 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wide flex items-center gap-1.5">
                          <History className="w-4 h-4 text-amber-500" />
                          <span>Trainings-Logbuch des Nutzers</span>
                        </h4>
                        <span className="text-[10px] bg-slate-900 border border-slate-800 text-zinc-400 font-mono font-bold px-2.5 py-0.5 rounded-lg">
                          {userLogs.length} Trainingseinheiten
                        </span>
                      </div>

                      {userLogs.length === 0 ? (
                        <p className="text-xs text-slate-500 font-mono text-center py-4 bg-slate-900/40 rounded-xl border border-slate-850/60">
                          Bisher wurden keine Kraftsport-Trainingseinheiten für diesen Nutzer aufgezeichnet.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                          {userLogs.map((log) => {
                            const isExpanded = expandedAdminLogId === log.id;
                            const hasPBStar = log.exercises?.some(e => e.sets?.some(s => s.isBest));
                            return (
                              <div key={log.id} className="border border-slate-850 rounded-xl overflow-hidden bg-slate-900/30">
                                <div className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-900/50 transition-colors">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedAdminLogId(isExpanded ? null : log.id)}
                                    className="flex-1 text-left min-w-0 cursor-pointer flex items-center justify-between pr-3"
                                  >
                                    <div className="min-w-0">
                                      <span className="block text-[10px] font-mono text-slate-500">
                                        {log.date.split('-').reverse().join('.')} • {log.duration || 0} Min.
                                      </span>
                                      <span className="block text-xs font-bold text-white truncate mt-0.5">
                                        {log.workoutName}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2.5 shrink-0">
                                      {hasPBStar && (
                                        <span className="p-1 rounded-md bg-yellow-500/10 text-yellow-500" title="Neuer Bestwert!">
                                          <Trophy className="w-3.5 h-3.5 fill-yellow-500" />
                                        </span>
                                      )}
                                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                                        {log.totalVolume?.toLocaleString() || 0} kg Vol.
                                      </span>
                                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    title="Einheit löschen (1 Punkt abziehen)"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setWorkoutLogToDelete(log);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer shrink-0 ml-1 border border-transparent hover:border-red-500/20"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Collapsible log detail view */}
                                {isExpanded && (
                                  <div className="px-4 pb-4 pt-2 border-t border-slate-900 bg-slate-950/40 text-slate-300 text-xs space-y-3">
                                    {log.exercises?.map((e, eIdx) => (
                                      <div key={eIdx} className="border-b border-slate-900 pb-2 last:border-b-0 last:pb-0">
                                        <span className="block font-bold text-slate-200 mb-1">{e.name}</span>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                          {e.sets?.map((s, sIdx) => (
                                            <div key={sIdx} className="bg-slate-900/80 p-2 rounded-lg border border-slate-850/60 flex items-center justify-between text-[11px]">
                                              <div>
                                                <span className="block text-[9px] text-slate-500 font-mono uppercase">
                                                  Satz {sIdx + 1} {s.type === 'warmup' && '(WU)'}
                                                </span>
                                                <span className="font-mono font-bold text-white">
                                                  {s.weight} kg x {s.reps}
                                                </span>
                                              </div>
                                              {s.isBest && (
                                                <span className="text-[9px] bg-yellow-500/10 text-yellow-500 font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-yellow-500/20">
                                                  <Trophy className="w-2.5 h-2.5 fill-yellow-500 shrink-0" />
                                                  <span>1RM</span>
                                                </span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 1-Rep Max Charts */}
                      <div className="space-y-4 pt-2">
                        <div className="border-b border-slate-850 pb-2">
                          <h4 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wide flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-amber-500" />
                            <span>1-Rep Max Entwicklung (Grafiken)</span>
                          </h4>
                        </div>

                        {completedExerciseIds.length === 0 ? (
                          <p className="text-xs text-slate-500 font-mono text-center py-4 bg-slate-900/40 rounded-xl border border-slate-850/60">
                            Keine 1-Rep Max Daten verfügbar (keine regular Sätze in den Trainingseinheiten gefunden).
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {/* Buttons for each completed exercise */}
                            <div>
                              <p className="text-[10px] text-slate-500 font-mono uppercase mb-2">Übung auswählen:</p>
                              <div className="flex flex-wrap gap-2">
                                {completedExerciseIds.map((exId) => {
                                  const exercise = exercises.find(e => e.id === exId);
                                  const isSelected = selectedChartExerciseId === exId;
                                  return (
                                    <button
                                      key={exId as string}
                                      type="button"
                                      onClick={() => setSelectedChartExerciseId(isSelected ? null : (exId as string))}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer border ${
                                        isSelected
                                          ? 'bg-amber-500 text-slate-950 border-amber-500 font-black shadow-lg shadow-amber-500/10'
                                          : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800'
                                      }`}
                                    >
                                      {exercise?.name || 'Unbekannte Übung'}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Show chart if an exercise is selected */}
                            {selectedChartExerciseId ? (() => {
                              const exercise = exercises.find(e => e.id === selectedChartExerciseId);
                              const chartData = getChartDataForExerciseAndUser(selectedChartExerciseId, selectedUser);

                              if (chartData.length === 0) {
                                return (
                                  <p className="text-xs text-slate-500 font-mono text-center py-4 bg-slate-900/40 rounded-xl border border-slate-850/60">
                                    Keine 1-Rep Max Daten für diese Übung vorhanden.
                                  </p>
                                );
                              }

                              return (
                                <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                  <span className="block text-xs font-bold text-white font-mono uppercase truncate tracking-wide border-b border-slate-850 pb-1.5">
                                    {exercise?.name || 'Unbekannte Übung'}
                                  </span>
                                  <div className="h-64 w-full bg-slate-950 p-2 border border-slate-900 rounded-xl">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                        <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                                        <Tooltip
                                          content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                              const data = payload[0].payload;
                                              return (
                                                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl font-mono text-[11px] space-y-1">
                                                  <p className="text-slate-400 font-bold">{data.date}</p>
                                                  <p className="text-amber-500 font-bold">1-Rep Max: {data.max1RM} kg</p>
                                                </div>
                                              );
                                            }
                                            return null;
                                          }}
                                        />
                                        <Line type="monotone" dataKey="max1RM" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                              );
                            })() : (
                              <div className="text-center py-8 bg-slate-900/20 border border-dashed border-slate-850 rounded-xl">
                                <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
                                <p className="text-xs text-slate-400 font-sans">
                                  Klicke auf eine der obigen Übungen, um die 1-Rep Max Entwicklungsgrafik anzuzeigen.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* 3. KÖRPERMASSE & TRACKING */}
        {activeSubSection === 'physique' && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-white uppercase font-mono border-b border-slate-800 pb-2 flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-500 animate-pulse" />
              <span>3. Körpermaße & Tracking</span>
            </h2>

            {/* Selector for Keeper */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1.5">Keeper auswählen</label>
                 <select
                  value={physiqueUserUid}
                  onChange={(e) => setPhysiqueUserUid(e.target.value)}
                  disabled={currentUserProfile?.role === 'kraftsport'}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500 min-w-[240px] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <option value="">-- Wähle einen Keeper --</option>
                  {users
                    .filter((u) => {
                      if (currentUserProfile?.role === 'kraftsport') {
                        return u.uid === currentUserProfile.uid;
                      }
                      return u.uid === currentUserProfile?.uid || (u.role !== 'admin' && !u.archived);
                    })
                    .map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.name} (@{u.username}) {u.uid === currentUserProfile?.uid ? '(Mein Profil)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              {physiqueUserUid && (() => {
                const targetUser = users.find(u => u.uid === physiqueUserUid);
                if (!targetUser) return null;
                const currentWeight = targetUser.weightHistory && targetUser.weightHistory.length > 0
                  ? `${targetUser.weightHistory[targetUser.weightHistory.length - 1].value} kg`
                  : 'N/A';
                const currentHeight = targetUser.heightHistory && targetUser.heightHistory.length > 0
                  ? `${targetUser.heightHistory[targetUser.heightHistory.length - 1].value} cm`
                  : 'N/A';

                return (
                  <div className="flex gap-4">
                    <div className="bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-800">
                      <span className="block text-[9px] text-slate-500 font-mono uppercase">Letztes Gewicht</span>
                      <span className="text-sm font-black font-mono text-white">{currentWeight}</span>
                    </div>
                    <div className="bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-800">
                      <span className="block text-[9px] text-slate-500 font-mono uppercase">Letzte Größe</span>
                      <span className="text-sm font-black font-mono text-white">{currentHeight}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {physiqueUserUid ? (() => {
              const targetUser = users.find(u => u.uid === physiqueUserUid);
              if (!targetUser) return null;

              // Prepare combined data for charts
              const weightDates = targetUser.weightHistory || [];
              const heightDates = targetUser.heightHistory || [];
              
              // Sort weight and height entries by date
              const sortedWeights = [...weightDates].sort((a, b) => a.date.localeCompare(b.date));
              const sortedHeights = [...heightDates].sort((a, b) => a.date.localeCompare(b.date));

              // Find unique dates and merge
              const allDates = Array.from(new Set([
                ...weightDates.map(w => w.date),
                ...heightDates.map(h => h.date)
              ])).sort();

              const chartData = allDates.map(date => {
                const wEntry = weightDates.find(w => w.date === date);
                const hEntry = heightDates.find(h => h.date === date);
                return {
                  date: date.split('-').reverse().join('.'),
                  weight: wEntry ? wEntry.value : undefined,
                  height: hEntry ? hEntry.value : undefined
                };
              });

              return (
                <div className="space-y-6">
                  {/* Grid of Add Form & Chart */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Input card */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                      <h3 className="text-xs font-bold text-white uppercase font-mono border-b border-slate-800 pb-2">
                        Messwerte hinzufügen
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[9px] text-slate-400 font-mono mb-1">Körpergewicht (kg)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={addWeight}
                            onChange={(e) => setAddWeight(e.target.value)}
                            placeholder="Z.B. 82.5"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-700 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 font-mono mb-1">Körpergröße (cm)</label>
                          <input
                            type="number"
                            value={addHeight}
                            onChange={(e) => setAddHeight(e.target.value)}
                            placeholder="Z.B. 185"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-700 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <button
                          onClick={() => handleAddPhysique(targetUser.uid)}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs cursor-pointer font-mono uppercase tracking-wider transition-all"
                        >
                          Werte speichern
                        </button>
                      </div>
                    </div>

                    {/* Chart card */}
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                      <h3 className="text-xs font-bold text-white uppercase font-mono border-b border-slate-800 pb-2">
                        Entwicklungsgrafik (Gewicht & Größe)
                      </h3>
                      {chartData.length === 0 ? (
                        <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
                          <Activity className="w-8 h-8 opacity-20 mb-1" />
                          <span>Keine Verlaufsdaten vorhanden.</span>
                        </div>
                      ) : (
                        <div className="h-44 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis dataKey="date" stroke="#64748b" fontSize={9} />
                              <YAxis yAxisId="left" domain={['auto', 'auto']} stroke="#fbbf24" fontSize={9} />
                              <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} stroke="#38bdf8" fontSize={9} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                                labelStyle={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '10px' }}
                                itemStyle={{ fontSize: '11px' }}
                              />
                              <Line yAxisId="left" type="monotone" dataKey="weight" stroke="#fbbf24" strokeWidth={2} name="Gewicht (kg)" dot={{ r: 4 }} connectNulls />
                              <Line yAxisId="right" type="monotone" dataKey="height" stroke="#38bdf8" strokeWidth={2} name="Größe (cm)" dot={{ r: 4 }} connectNulls />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Weight & Height histories in two columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Weight History column */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                      <h3 className="text-xs font-bold text-slate-300 font-mono uppercase border-b border-slate-800 pb-2 flex items-center justify-between">
                        <span>Gewicht-Historie</span>
                        <span className="text-[10px] text-slate-500 font-mono">{sortedWeights.length} Einträge</span>
                      </h3>
                      {sortedWeights.length === 0 ? (
                        <p className="text-xs text-slate-500 font-mono text-center py-6">Keine Gewichtseinträge.</p>
                      ) : (
                        <div className="bg-slate-950 rounded-xl border border-slate-850 overflow-hidden max-h-60 overflow-y-auto">
                          <table className="w-full text-left text-xs font-mono">
                            <thead>
                              <tr className="bg-slate-900 border-b border-slate-800 text-slate-500 text-[10px]">
                                <th className="p-2.5">Datum</th>
                                <th className="p-2.5 text-right">Gewicht</th>
                                <th className="p-2.5 text-center w-12">Aktion</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedWeights.slice().reverse().map((entry, idx) => {
                                // Find actual index in targetUser.weightHistory to delete correctly
                                const origIdx = targetUser.weightHistory.findIndex(w => w.date === entry.date && w.value === entry.value);
                                return (
                                  <tr key={idx} className="border-b border-slate-900 last:border-0 hover:bg-slate-900/40">
                                    <td className="p-2.5 text-slate-300">{entry.date.split('-').reverse().join('.')}</td>
                                    <td className="p-2.5 text-right font-bold text-white">{entry.value} kg</td>
                                    <td className="p-2.5 text-center">
                                      <button
                                        onClick={() => handleDeleteWeightEntry(targetUser.uid, origIdx)}
                                        className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-all cursor-pointer"
                                        title="Löschen"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Height History column */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                      <h3 className="text-xs font-bold text-slate-300 font-mono uppercase border-b border-slate-800 pb-2 flex items-center justify-between">
                        <span>Größe-Historie</span>
                        <span className="text-[10px] text-slate-500 font-mono">{sortedHeights.length} Einträge</span>
                      </h3>
                      {sortedHeights.length === 0 ? (
                        <p className="text-xs text-slate-500 font-mono text-center py-6">Keine Größeneinträge.</p>
                      ) : (
                        <div className="bg-slate-950 rounded-xl border border-slate-850 overflow-hidden max-h-60 overflow-y-auto">
                          <table className="w-full text-left text-xs font-mono">
                            <thead>
                              <tr className="bg-slate-900 border-b border-slate-800 text-slate-500 text-[10px]">
                                <th className="p-2.5">Datum</th>
                                <th className="p-2.5 text-right">Größe</th>
                                <th className="p-2.5 text-center w-12">Aktion</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedHeights.slice().reverse().map((entry, idx) => {
                                // Find actual index in targetUser.heightHistory to delete correctly
                                const origIdx = targetUser.heightHistory.findIndex(h => h.date === entry.date && h.value === entry.value);
                                return (
                                  <tr key={idx} className="border-b border-slate-900 last:border-0 hover:bg-slate-900/40">
                                    <td className="p-2.5 text-slate-300">{entry.date.split('-').reverse().join('.')}</td>
                                    <td className="p-2.5 text-right font-bold text-white">{entry.value} cm</td>
                                    <td className="p-2.5 text-center">
                                      <button
                                        onClick={() => handleDeleteHeightEntry(targetUser.uid, origIdx)}
                                        className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-all cursor-pointer"
                                        title="Löschen"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-400 max-w-md mx-auto">
                <Activity className="w-12 h-12 text-slate-700 mx-auto mb-3 animate-pulse" />
                <h4 className="text-sm font-bold text-white font-mono uppercase mb-1">Kein Keeper ausgewählt</h4>
                <p className="text-xs font-sans leading-relaxed text-slate-500">
                  Wähle oben im Dropdown-Menü einen Keeper aus, um dessen historische Körpermaße (Gewicht und Größe) anzuzeigen, neue Messwerte zu erfassen oder Einträge zu löschen.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 4. KRAFTSPORT (WORKOUTS & EXERCISES BUILDER) */}
        {activeSubSection === 'kraft' && (
          <div className="space-y-8">
            {/* Kraftsport Lobby Settings: Trainer-Notiz & Tracken-Videolink */}
            <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-amber-500 font-mono uppercase flex items-center gap-1.5 border-b border-slate-900 pb-2.5">
                <Dumbbell className="w-4 h-4 text-amber-500" />
                <span>Kraftsport Lobby Einstellungen</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Custom Trainer-Notiz */}
                <div className="space-y-2.5 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider font-bold">
                    Trainer-Notiz (Kraftsport Lobby)
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Diese Notiz wird allen Nutzern oben in der Kraftsport-Übersicht angezeigt.
                  </p>
                  <input
                    type="text"
                    value={customTrainerNote}
                    onChange={(e) => setCustomTrainerNote(e.target.value)}
                    placeholder="Fokus auf Grundübungen..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTrainerNote}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    Trainer-Notiz speichern
                  </button>
                </div>

                {/* Videolink "So geht das Tracken der Krafteinheit" */}
                <div className="space-y-2.5 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider font-bold">
                    Videolink: „So geht das Tracken der Krafteinheit“
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Dieser Link wird als Button neben der Trainer-Notiz im Kraftsport-Bereich angezeigt.
                  </p>
                  <input
                    type="text"
                    value={(tutLinks['kraftsport_tracking'] && tutLinks['kraftsport_tracking'][0]?.url) || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTutLinks(prev => {
                        const updated = [...(prev['kraftsport_tracking'] || [{ title: 'So geht das Tracken der Krafteinheit', url: '' }])];
                        updated[0] = { title: 'So geht das Tracken der Krafteinheit', url: val };
                        return { ...prev, kraftsport_tracking: updated };
                      });
                    }}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const docRef = doc(db, 'config', 'contents');
                        const docSnap = await getDoc(docRef);
                        const existingData = docSnap.exists() ? docSnap.data() : {};
                        const trackingList = tutLinks['kraftsport_tracking'] || [{ title: 'So geht das Tracken der Krafteinheit', url: '' }];
                        await setDoc(docRef, {
                          ...existingData,
                          kraftsport_tracking: trackingList
                        });
                        alert('Videolink für Krafttraining-Tracking erfolgreich gespeichert!');
                      } catch (err) {
                        console.error(err);
                        alert('Fehler beim Speichern des Videolinks.');
                      }
                    }}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    Videolink speichern
                  </button>
                </div>
              </div>
            </div>

            {/* Exercises Manager tab */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-1">
                  <Dumbbell className="w-4 h-4" /> Übungsdatenbank
                </h3>
                <button
                  onClick={() => {
                    if (showAddEx) {
                      resetExerciseForm();
                    } else {
                      setShowAddEx(true);
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs cursor-pointer animate-pulse-subtle"
                >
                  {showAddEx ? (editingExerciseId ? 'Bearbeitung abbrechen' : 'Schließen') : '+ Übung anlegen'}
                </button>
              </div>

              {showAddEx && (
                <form onSubmit={handleAddExercise} className="bg-slate-950 border border-slate-850 p-5 rounded-xl space-y-4 text-xs relative animate-in fade-in duration-200">
                  <h4 className="text-xs font-bold text-amber-500 uppercase font-mono border-b border-slate-900 pb-1.5">
                    {editingExerciseId ? 'Übung bearbeiten' : 'Neue Übung anlegen'}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Name der Übung</label>
                      <input type="text" value={exName} onChange={(e) => setExName(e.target.value)} placeholder="Z.B. Kniebeugen" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-bold" required />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Muskelgruppe</label>
                      <select value={exMuscle} onChange={(e) => setExMuscle(e.target.value as any)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-white">
                        <option value="PUSH">PUSH</option>
                        <option value="PULL">PULL</option>
                        <option value="Leg">Leg</option>
                        <option value="Core">Core</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Trainer-Hinweis / Notiz</label>
                      <input type="text" value={exTrainerNote} onChange={(e) => setExTrainerNote(e.target.value)} placeholder="Z.B. Langsame Ausführung..." className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Kadenz Vorgabe</label>
                      <input type="text" value={exCadence} onChange={(e) => setExCadence(e.target.value)} placeholder="Z.B. 3-0-1-0" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">YouTube Video Link</label>
                    <input type="text" value={exVideo} onChange={(e) => setExVideo(e.target.value)} placeholder="https://youtube.com/..." className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white" />
                  </div>

                  {/* Weight modifiers & unilateral checklist */}
                  <div className="flex flex-wrap gap-4 pt-1 bg-slate-900/40 p-3 rounded-lg border border-slate-850">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="add-bw" checked={exBodyweight} onChange={(e) => setExBodyweight(e.target.checked)} className="w-4 h-4 rounded border-slate-800 text-amber-500" />
                      <label htmlFor="add-bw" className="font-bold text-slate-300">Körpergewicht wird komplett mit bewegt</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="add-bwp" checked={exBodyweightPartial} onChange={(e) => setExBodyweightPartial(e.target.checked)} className="w-4 h-4 rounded border-slate-800 text-amber-500" />
                      <label htmlFor="add-bwp" className="font-bold text-slate-300">Körpergewicht wird teilweise mit bewegt</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="add-uni" checked={exUnilateral} onChange={(e) => setExUnilateral(e.target.checked)} className="w-4 h-4 rounded border-slate-800 text-amber-500" />
                      <label htmlFor="add-uni" className="font-bold text-slate-300">Unilaterale Übung (L/R getrennt tracken)</label>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button type="submit" className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl cursor-pointer transition-colors">
                      {editingExerciseId ? 'Änderungen speichern' : 'Übung speichern'}
                    </button>
                    {editingExerciseId && (
                      <button
                        type="button"
                        onClick={resetExerciseForm}
                        className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-zinc-300 font-bold rounded-xl cursor-pointer transition-colors"
                      >
                        Abbrechen
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* Exercise Database Tabs */}
              <div className="flex flex-wrap gap-1 border-b border-slate-800 pb-2">
                {(['PUSH', 'PULL', 'LEG', 'CORE'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveExerciseTab(tab)}
                    className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg cursor-pointer transition-colors ${
                      activeExerciseTab === tab
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                {currentUserProfile?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setActiveExerciseTab('USER_EXERCISES')}
                    className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 ${
                      activeExerciseTab === 'USER_EXERCISES'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-amber-500/20'
                    }`}
                  >
                    <span>Nutzerübungen</span>
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] px-1.5 py-0.5 rounded-full font-sans">
                      {exercises.filter(ex => ex.isAdminCreated === false).length}
                    </span>
                  </button>
                )}
              </div>

              {/* Exercises Database display list with editing and deletion */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {(() => {
                  const isCurrentAdmin = currentUserProfile?.role === 'admin';
                  const filtered = exercises.filter(ex => {
                    if (activeExerciseTab === 'USER_EXERCISES') {
                      return ex.isAdminCreated === false;
                    } else {
                      // Muscle group matching (case-insensitive)
                      const groupMatches = ex.muscleGroup?.toUpperCase() === activeExerciseTab;
                      if (!groupMatches) return false;

                      if (isCurrentAdmin) {
                        // Admin sees all admin-created exercises in the main categories
                        return ex.isAdminCreated !== false;
                      } else {
                        // Non-admin sees admin-created exercises OR their own exercises
                        const isAdminEx = ex.isAdminCreated !== false;
                        const isOwnEx = ex.createdBy === currentUserProfile?.uid;
                        return isAdminEx || isOwnEx;
                      }
                    }
                  }).sort((a, b) => a.name.localeCompare(b.name));

                  if (filtered.length === 0) {
                    return (
                      <div className="col-span-full py-6 text-center text-slate-500 font-mono text-xs">
                        Keine Übungen in dieser Kategorie vorhanden.
                      </div>
                    );
                  }

                  return filtered.map(ex => {
                    const isSystemEx = ex.isAdminCreated !== false;
                    const canEditOrDelete = isCurrentAdmin || (!isSystemEx && ex.createdBy === currentUserProfile?.uid);

                    return (
                      <div key={ex.id} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between gap-2 hover:border-slate-700 transition-colors animate-in fade-in duration-150">
                        <div className="min-w-0">
                          <span className="block font-bold text-white text-xs truncate">{ex.name}</span>
                          <span className="block text-[8px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <span>{ex.muscleGroup} {ex.unilateral && '• UNILATERAL'}</span>
                            {isSystemEx ? (
                              <span className="bg-slate-900 text-slate-400 border border-slate-800 text-[7px] px-1 rounded-sm">System</span>
                            ) : (
                              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[7px] px-1 rounded-sm">Nutzer</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {activeExerciseTab === 'USER_EXERCISES' && isCurrentAdmin && (
                            <button
                              onClick={() => handleAdoptExercise(ex.id)}
                              className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-lg text-[9px] font-mono cursor-pointer transition-colors"
                              title="Übung übernehmen"
                            >
                              Übernehmen
                            </button>
                          )}
                          {canEditOrDelete ? (
                            <>
                              <button
                                onClick={() => handleEditExerciseClick(ex)}
                                className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                                title="Übung bearbeiten"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setExerciseToDelete(ex)}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                                title="Übung löschen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <div className="p-1.5 text-slate-600 flex items-center" title="Systemübung (Schreibgeschützt)">
                              <Lock className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Workout Plans manager tab */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-1">
                  <FileText className="w-4 h-4" /> {editingPlanId ? 'Trainingsplan bearbeiten' : 'Trainingspläne erstellen'}
                </h3>
                <button
                  onClick={() => {
                    if (showAddPlan) {
                      setEditingPlanId(null);
                      setPlanName('');
                      setPlanAssignedUsers([]);
                      setPlanExercises([]);
                    }
                    setShowAddPlan(!showAddPlan);
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
                >
                  {showAddPlan ? 'Schließen' : '+ Trainingsplan erstellen'}
                </button>
              </div>

              {showAddPlan && (
                <form onSubmit={handleSaveWorkoutPlan} className="bg-slate-950 border border-slate-850 p-5 rounded-xl space-y-4 text-xs">
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Name des Trainingsplans</label>
                    <input type="text" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Z.B. Hypertrophie Plan A" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-bold" required />
                  </div>

                  {/* Kategorie Dropdown (nur für Admin sichtbar/änderbar) */}
                  {currentUserProfile?.role === 'admin' ? (
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Kategorie zuordnen</label>
                      <select
                        value={planCategory}
                        onChange={(e) => setPlanCategory(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-white font-bold"
                      >
                        <option value="eigene">Eigene Pläne</option>
                        <option value="spieler">Spieler Pläne</option>
                        <option value="kraftsport">nur Kraftsport Pläne</option>
                        <option value="andere">Pläne anderer Nutzer</option>
                      </select>
                    </div>
                  ) : (
                    <div className="bg-slate-900/40 p-2 rounded-lg border border-slate-850/60 text-slate-400 text-[10px] flex items-center justify-between">
                      <span>Kategorie: <strong>Pläne anderer Nutzer</strong></span>
                      <span className="text-[8px] bg-slate-950 text-slate-500 border border-slate-850 px-1.5 py-0.5 rounded font-mono">System</span>
                    </div>
                  )}

                  {/* Mapped Users checklists */}
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1.5">Nutzern zuordnen (Checkboxes)</label>
                    <div className="flex flex-wrap gap-2 bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                      {users
                        .filter(u => {
                          if (currentUserProfile?.role === 'kraftsport') {
                            return u.uid === currentUserProfile.uid;
                          }
                          return true;
                        })
                        .map(u => (
                          <div key={u.uid} className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-850">
                            <input
                              type="checkbox"
                              id={`assign-${u.uid}`}
                              checked={planAssignedUsers.includes(u.uid)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                if (checked) setPlanAssignedUsers(prev => [...prev, u.uid]);
                                else setPlanAssignedUsers(prev => prev.filter(id => id !== u.uid));
                              }}
                              className="w-4 h-4 rounded border-slate-850 text-amber-500"
                            />
                            <label htmlFor={`assign-${u.uid}`} className="text-[11px] font-medium text-slate-300">{u.name}</label>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Add Exercises to plan row builder */}
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1.5 font-bold">Übungen im Plan konfigurieren</label>
                    
                    {/* Catalog selector tabs */}
                    <div className="flex flex-wrap gap-1 border border-slate-850 mb-3 bg-slate-950 p-1.5 rounded-xl">
                      {[
                        { id: 'PUSH', label: 'PUSH' },
                        { id: 'PULL', label: 'PULL' },
                        { id: 'LEG', label: 'LEG' },
                        { id: 'CORE', label: 'Core' },
                        { id: 'USER', label: 'Nutzerübungen' }
                      ].map(tab => {
                        const isCurrentAdmin = currentUserProfile?.role === 'admin';
                        const visibleExercises = exercises.filter(ex => {
                          const isSystemEx = ex.isAdminCreated !== false;
                          if (isSystemEx) return true;
                          if (isCurrentAdmin) return true;
                          return ex.createdBy === currentUserProfile?.uid;
                        });

                        const count = visibleExercises.filter(ex => {
                          if (tab.id === 'USER') return ex.isAdminCreated === false;
                          return ex.isAdminCreated !== false && ex.muscleGroup?.toUpperCase() === tab.id;
                        }).length;

                        return (
                          <button
                            type="button"
                            key={tab.id}
                            onClick={() => setPlanExCategoryTab(tab.id as any)}
                            className={`flex-1 min-w-[75px] py-1.5 px-2 text-[10px] font-bold font-mono uppercase rounded-lg transition-all cursor-pointer text-center ${
                              planExCategoryTab === tab.id
                                ? 'bg-amber-500 text-slate-950 shadow font-black'
                                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                            }`}
                          >
                            <span>{tab.label}</span>
                            <span className={`text-[8px] ml-1 opacity-80 ${planExCategoryTab === tab.id ? 'text-slate-900' : 'text-slate-500'}`}>
                              ({count})
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Tab Exercises Catalog list */}
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 mb-3 min-h-[60px]">
                      {(() => {
                        const isCurrentAdmin = currentUserProfile?.role === 'admin';
                        const visibleExercises = exercises.filter(ex => {
                          const isSystemEx = ex.isAdminCreated !== false;
                          if (isSystemEx) return true;
                          if (isCurrentAdmin) return true;
                          return ex.createdBy === currentUserProfile?.uid;
                        });

                        const activeCategory = [
                          { id: 'PUSH', filter: (ex: Exercise) => ex.isAdminCreated !== false && ex.muscleGroup?.toUpperCase() === 'PUSH' },
                          { id: 'PULL', filter: (ex: Exercise) => ex.isAdminCreated !== false && ex.muscleGroup?.toUpperCase() === 'PULL' },
                          { id: 'LEG', filter: (ex: Exercise) => ex.isAdminCreated !== false && ex.muscleGroup?.toUpperCase() === 'LEG' },
                          { id: 'CORE', filter: (ex: Exercise) => ex.isAdminCreated !== false && ex.muscleGroup?.toUpperCase() === 'CORE' },
                          { id: 'USER', filter: (ex: Exercise) => ex.isAdminCreated === false }
                        ].find(c => c.id === planExCategoryTab);

                        if (!activeCategory) return null;
                        const catExs = visibleExercises.filter(activeCategory.filter).sort((a, b) => a.name.localeCompare(b.name));

                        if (catExs.length === 0) {
                          return (
                            <p className="text-xs text-slate-500 font-mono italic text-center py-2">
                              Keine Übungen in dieser Kategorie vorhanden.
                            </p>
                          );
                        }

                        return (
                          <div className="flex flex-wrap gap-1.5">
                            {catExs.map(ex => (
                              <button
                                type="button"
                                key={ex.id}
                                onClick={() => handleAddPlanEx(ex.id)}
                                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-850 hover:border-amber-500/40 text-[10px] text-slate-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Plus className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>{ex.name}</span>
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Target exercises lists configuration with sets predefining */}
                    <div className="space-y-3">
                      {planExercises.map((we, weIdx) => {
                        const exNameStr = exercises.find(e => e.id === we.exerciseId)?.name || 'Unbekannt';
                        return (
                          <div key={weIdx} className="bg-slate-900 p-3.5 rounded-lg border border-slate-850 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-white">{weIdx + 1}. {exNameStr}</span>
                                
                                {/* Order sorter arrows */}
                                <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded border border-slate-850 shrink-0">
                                  <button
                                    type="button"
                                    disabled={weIdx === 0}
                                    onClick={() => {
                                      setPlanExercises(prev => {
                                        const copy = [...prev];
                                        const temp = copy[weIdx];
                                        copy[weIdx] = copy[weIdx - 1];
                                        copy[weIdx - 1] = temp;
                                        return copy;
                                      });
                                    }}
                                    className={`p-1 rounded cursor-pointer transition-colors ${
                                      weIdx === 0 ? 'text-slate-700' : 'text-amber-500 hover:bg-slate-900'
                                    }`}
                                    title="Nach oben verschieben"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={weIdx === planExercises.length - 1}
                                    onClick={() => {
                                      setPlanExercises(prev => {
                                        const copy = [...prev];
                                        const temp = copy[weIdx];
                                        copy[weIdx] = copy[weIdx + 1];
                                        copy[weIdx + 1] = temp;
                                        return copy;
                                      });
                                    }}
                                    className={`p-1 rounded cursor-pointer transition-colors ${
                                      weIdx === planExercises.length - 1 ? 'text-slate-700' : 'text-amber-500 hover:bg-slate-900'
                                    }`}
                                    title="Nach unten verschieben"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setPlanExercises(prev => prev.filter((_, idx) => idx !== weIdx));
                                }}
                                className="text-red-400 hover:text-red-300 font-mono text-[10px] cursor-pointer"
                              >
                                [ Entfernen ]
                              </button>
                            </div>

                            {/* Sets listing & editor */}
                            <div className="space-y-1.5 pl-3 border-l-2 border-slate-800">
                              <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mb-1">
                                Sätze vorgeben:
                              </div>
                              {we.sets.map((set, setIdx) => (
                                <div key={setIdx} className="flex items-center gap-2 text-[11px] flex-wrap">
                                  <span className="text-slate-500 font-mono text-[9px] w-12">Satz {setIdx + 1}</span>
                                  
                                  {/* Set Type toggle dropdown */}
                                  <select
                                    value={set.type}
                                    onChange={(e) => {
                                      const typeVal = e.target.value as 'warmup' | 'regular';
                                      const copy = [...planExercises];
                                      copy[weIdx].sets[setIdx].type = typeVal;
                                      setPlanExercises(copy);
                                    }}
                                    className="bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-white text-[10px]"
                                  >
                                    <option value="warmup">WarmUp</option>
                                    <option value="regular">Arbeitssatz</option>
                                  </select>

                                  {/* Reps selector */}
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-500 text-[10px]">Wdh:</span>
                                    <input
                                      type="number"
                                      value={set.reps}
                                      onChange={(e) => {
                                        const repsVal = parseInt(e.target.value) || 0;
                                        const copy = [...planExercises];
                                        copy[weIdx].sets[setIdx].reps = repsVal;
                                        setPlanExercises(copy);
                                      }}
                                      className="w-10 bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-white text-center text-[10px] font-mono"
                                    />
                                  </div>

                                  {/* Min/Target reps for regular sets */}
                                  {set.type === 'regular' && (
                                    <>
                                      <div className="flex items-center gap-1">
                                        <span className="text-slate-500 text-[10px]">Min:</span>
                                        <input
                                          type="number"
                                          value={set.minReps || 6}
                                          onChange={(e) => {
                                            const minRepsVal = parseInt(e.target.value) || 0;
                                            const copy = [...planExercises];
                                            copy[weIdx].sets[setIdx].minReps = minRepsVal;
                                            setPlanExercises(copy);
                                          }}
                                          className="w-10 bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-white text-center text-[10px] font-mono"
                                        />
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-slate-500 text-[10px]">Max:</span>
                                        <input
                                          type="number"
                                          value={set.targetReps || 8}
                                          onChange={(e) => {
                                            const targetRepsVal = parseInt(e.target.value) || 0;
                                            const copy = [...planExercises];
                                            copy[weIdx].sets[setIdx].targetReps = targetRepsVal;
                                            setPlanExercises(copy);
                                          }}
                                          className="w-10 bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-white text-center text-[10px] font-mono"
                                        />
                                      </div>
                                    </>
                                  )}

                                  {/* Remove set button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const copy = [...planExercises];
                                      copy[weIdx].sets = copy[weIdx].sets.filter((_, sIdx) => sIdx !== setIdx);
                                      setPlanExercises(copy);
                                    }}
                                    className="text-red-500 hover:text-red-400 font-bold ml-auto px-1.5 cursor-pointer text-[11px]"
                                    title="Satz löschen"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}

                              {/* Buttons to add warmup or regular sets */}
                              <div className="flex gap-2 pt-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const copy = [...planExercises];
                                    copy[weIdx].sets.push({ type: 'warmup', reps: 10 });
                                    setPlanExercises(copy);
                                  }}
                                  className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 text-[9px] rounded font-mono"
                                >
                                  + WarmUp-Satz
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const copy = [...planExercises];
                                    copy[weIdx].sets.push({ type: 'regular', reps: 8, minReps: 6, targetReps: 8 });
                                    setPlanExercises(copy);
                                  }}
                                  className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 text-[9px] rounded font-mono"
                                >
                                  + Arbeitssatz
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl cursor-pointer">
                      {editingPlanId ? 'Änderungen speichern' : 'Trainingsplan speichern'}
                    </button>
                    {editingPlanId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlanId(null);
                          setPlanName('');
                          setPlanAssignedUsers([]);
                          setPlanExercises([]);
                          setShowAddPlan(false);
                        }}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl cursor-pointer"
                      >
                        Abbrechen
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* Workout plans category tab navigation */}
              <div className="flex flex-wrap gap-1 border-b border-slate-800 pb-2">
                {[
                  { id: 'eigene', label: 'Eigene Pläne' },
                  { id: 'spieler', label: 'Spieler Pläne' },
                  { id: 'kraftsport', label: 'nur Kraftsport Pläne' },
                  { id: 'andere', label: 'Pläne anderer Nutzer' }
                ].map(tab => {
                  const count = workouts.filter(w => {
                    if (currentUserProfile?.role === 'kraftsport') {
                      if (!w.assignedUsers?.includes(currentUserProfile.uid)) return false;
                    }
                    const planCat = w.category || 'andere';
                    return planCat === tab.id;
                  }).length;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveWorkoutCategoryTab(tab.id as any)}
                      className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 ${
                        activeWorkoutCategoryTab === tab.id
                          ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[8px] font-sans px-1.5 py-0.5 rounded-full font-bold border ${
                        activeWorkoutCategoryTab === tab.id
                          ? 'bg-slate-950/20 text-slate-950 border-slate-950/20'
                          : 'bg-slate-950 text-slate-500 border-slate-850'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Workout plans deletion list */}
              <div className="space-y-2">
                {(() => {
                  const sortedAndFiltered = workouts
                    .filter(w => {
                      if (currentUserProfile?.role === 'kraftsport') {
                        return w.assignedUsers?.includes(currentUserProfile.uid);
                      }
                      return true;
                    })
                    .filter(w => {
                      const planCat = w.category || 'andere';
                      return planCat === activeWorkoutCategoryTab;
                    })
                    .sort((a, b) => a.name.localeCompare(b.name));

                  if (sortedAndFiltered.length === 0) {
                    return (
                      <div className="py-6 text-center text-slate-500 font-mono text-xs">
                        Keine Trainingspläne in dieser Kategorie vorhanden.
                      </div>
                    );
                  }

                  return sortedAndFiltered.map(w => (
                    <div key={w.id} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <span className="block font-bold text-white text-xs">{w.name}</span>
                        <span className="block text-[8px] text-slate-500 font-mono uppercase mt-0.5">
                          Zugeordnet: {w.assignedUsers?.length || 0} Spieler • {w.exercises?.length || 0} Übungen
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingPlanId(w.id);
                            setPlanName(w.name);
                            setPlanAssignedUsers(w.assignedUsers || []);
                            setPlanExercises(w.exercises || []);
                            setPlanCategory(w.category || 'andere');
                            setShowAddPlan(true);
                            alert('Trainingsplan geladen! Bitte bearbeite den Plan oben.');
                          }}
                          className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                          title="Trainingsplan bearbeiten"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteWorkoutPlan(w.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                          title="Trainingsplan löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* 4. VIDEOANALYSE MANAGER */}
        {activeSubSection === 'video' && (
          <div className="space-y-8">
            {/* Categories tab */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white uppercase font-mono border-b border-slate-800 pb-1.5">
                A) Spielszenen Kategorien
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Kategoriename z.B. 1vs1 Paraden"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white max-w-xs flex-1"
                />
                <button
                  onClick={handleCreateCategory}
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Kategorie erstellen
                </button>
              </div>

              {/* Categories lists and deletion */}
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <div key={cat.id} className="bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-white flex items-center gap-2">
                    <span>{cat.name}</span>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-500 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Globale Analyse-Regeln */}
            <div className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-850 text-xs">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                <h3 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-500" /> Globale Analyse-Regeln (Spielerrichtlinie)
                </h3>
                <span className="text-[10px] text-amber-500 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full uppercase font-bold">Global</span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                Diese Richtlinie gilt global für alle Spielszenen und wird den Spielern im Bereich Videoanalyse direkt bei jeder einzelnen Spielszene im Reiter "Analyse von Spielszenen" angezeigt.
              </p>
              <div>
                <textarea
                  value={globalAnalysisRules}
                  onChange={(e) => setGlobalAnalysisRules(e.target.value)}
                  placeholder="Z.B. Achte genau auf das Timing beim Absprung, die Beinarbeit, die Handstellung..."
                  className="w-full h-24 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveGlobalAnalysisRules}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/10 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Analyse-Regeln speichern</span>
                </button>
              </div>
            </div>

            {/* Analysis scenes creation form */}
            <div className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-850">
              <h3 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-amber-500" /> {editingSceneId ? 'Spielszene bearbeiten (A)' : 'Spielszene hinzufügen (A)'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[9px] text-slate-500 font-mono mb-1">Kategorie zuordnen</label>
                  <select
                    value={analysisCategorySelected}
                    onChange={(e) => setAnalysisCategorySelected(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-white"
                  >
                    <option value="">Wähle eine Kategorie...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 font-mono mb-1">YouTube Video Link</label>
                  <input
                    type="text"
                    value={activeAnalysisVideo}
                    onChange={(e) => setActiveAnalysisVideo(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-[9px] text-slate-500 font-mono mb-1">Trainer-Musteranalyse (Sichtbar nach Spielerabgabe)</label>
                <textarea
                  value={activeAnalysisTrainer}
                  onChange={(e) => setActiveAnalysisTrainer(e.target.value)}
                  placeholder="Aus Torwartsicht optimal gelöst..."
                  className="w-full h-16 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="text-xs">
                <label className="block text-[9px] text-slate-500 font-mono mb-1">Trainingsempfehlungen</label>
                <textarea
                  value={activeAnalysisRecommendation}
                  onChange={(e) => setActiveAnalysisRecommendation(e.target.value)}
                  placeholder="Z.B. Übungen zur Beinarbeit, Koordinationsparcours..."
                  className="w-full h-16 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                />
              </div>

              {renderUserCheckboxes(analysisAssignedUsers, setAnalysisAssignedUsers)}

              <div className="flex gap-2">
                <button
                  onClick={handleAddAnalysisScene}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
                >
                  {editingSceneId ? 'Änderungen speichern' : 'Szene speichern'}
                </button>
                {editingSceneId && (
                  <button
                    onClick={() => {
                      setEditingSceneId(null);
                      setActiveAnalysisVideo('');
                      setActiveAnalysisRules('');
                      setActiveAnalysisTrainer('');
                      setActiveAnalysisRecommendation('');
                      setAnalysisAssignedUsers([]);
                    }}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Abbrechen
                  </button>
                )}
              </div>
            </div>

            {/* F) Veo & G) Big Save Creators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Veo Form */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 space-y-3 text-xs">
                <h4 className="font-bold text-white font-mono">{editingSceneId ? 'Veo Link bearbeiten (F)' : 'Veo Link anlegen (F)'}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] text-slate-500">Team</label>
                    <select value={veoTeam} onChange={(e) => setVeoTeam(e.target.value as any)} className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-white">
                      <option value="U16">U16</option>
                      <option value="U17">U17</option>
                      <option value="U19">U19</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] text-slate-500">Datum</label>
                    <input type="date" value={veoDate} onChange={(e) => setVeoDate(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-[8px] text-slate-500">Titel / Partie</label>
                  <input type="text" value={veoTitle} onChange={(e) => setVeoTitle(e.target.value)} placeholder="Z.B. Bayern vs BVB" className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-white" />
                </div>
                <div>
                  <label className="block text-[8px] text-slate-500">Veo Spiellink URL</label>
                  <input type="text" value={veoLink} onChange={(e) => setVeoLink(e.target.value)} placeholder="https://app.veo.co/..." className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-white" />
                </div>
                {renderUserCheckboxes(veoAssignedUsers, setVeoAssignedUsers)}
                <div className="flex gap-2">
                  <button onClick={handleAddVeoLink} className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl cursor-pointer">
                    {editingSceneId ? 'Speichern' : 'Veo Link speichern'}
                  </button>
                  {editingSceneId && (
                    <button
                      onClick={() => {
                        setEditingSceneId(null);
                        setVeoLink('');
                        setVeoTitle('');
                        setVeoAssignedUsers([]);
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Abbruch
                    </button>
                  )}
                </div>
              </div>

              {/* Big Save Form */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 space-y-3 text-xs">
                <h4 className="font-bold text-white font-mono">{editingSceneId ? 'Big Save Award bearbeiten (G)' : 'Big Save Award anlegen (G)'}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] text-slate-500">Saison</label>
                    <input type="text" value={bsSeason} onChange={(e) => setBsSeason(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-white" />
                  </div>
                  <div>
                    <label className="block text-[8px] text-slate-500">Teil / Part</label>
                    <input type="text" value={bsPart} onChange={(e) => setBsPart(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-[8px] text-slate-500">Gewinner Torwart</label>
                  <input type="text" value={bsWinner} onChange={(e) => setBsWinner(e.target.value)} placeholder="Z.B. Oliver Kahn" className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-white" />
                </div>
                <div>
                  <label className="block text-[8px] text-slate-500">Nominierungen (Zeilenumbruch möglich)</label>
                  <textarea value={bsNominations} onChange={(e) => setBsNominations(e.target.value)} placeholder="1. Neuer, 2. ter Stegen..." className="w-full h-12 bg-slate-900 border border-slate-800 rounded p-1 text-white" />
                </div>
                <div>
                  <label className="block text-[8px] text-slate-500">YouTube Link</label>
                  <input type="text" value={bsLink} onChange={(e) => setBsLink(e.target.value)} placeholder="https://youtube.com/..." className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-white" />
                </div>
                {renderUserCheckboxes(bsAssignedUsers, setBsAssignedUsers)}
                <div className="flex gap-2">
                  <button onClick={handleAddBigSaveAward} className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl cursor-pointer">
                    {editingSceneId ? 'Speichern' : 'Big Save Award speichern'}
                  </button>
                  {editingSceneId && (
                    <button
                      onClick={() => {
                        setEditingSceneId(null);
                        setBsSeason('2026/2027');
                        setBsPart('1');
                        setBsNominations('');
                        setBsWinner('');
                        setBsLink('');
                        setBsAssignedUsers([]);
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Abbruch
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List all active scenes grouped by category tabs with full details */}
            <div className="space-y-4 pt-4 border-t border-slate-850">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-amber-500" /> Alle aktiven Video-Szenen
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">{scenes.length} Szenen gesamt</span>
              </div>

              {/* Tab navigation for scene categories */}
              <div className="flex flex-wrap gap-1.5 border-b border-slate-850 pb-2">
                {[
                  { id: 'analysis', label: 'Analyse' },
                  { id: 'veo', label: 'Veo' },
                  { id: 'bigsave', label: 'Big Save Award' }
                ].map((tab) => {
                  const isActive = activeScenesTab === tab.id;
                  const count = scenes.filter(s => {
                    if (tab.id === 'analysis') return s.type === 'analysis';
                    if (tab.id === 'veo') return s.type === 'veo';
                    if (tab.id === 'bigsave') return s.type === 'bigsave';
                    return false;
                  }).length;

                  return (
                    <button
                       key={tab.id}
                       type="button"
                       onClick={() => setActiveScenesTab(tab.id as any)}
                       className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer border ${
                        isActive
                           ? 'bg-amber-500 text-slate-950 border-amber-500 font-black shadow-lg shadow-amber-500/10'
                           : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border-slate-800'
                       }`}
                    >
                      {tab.label} <span className={`text-[10px] ml-1 font-mono ${isActive ? 'text-slate-900 font-bold bg-white/30 px-1.5 py-0.2 rounded-full' : 'text-slate-500'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* User filter select for Analysis tab */}
              {activeScenesTab === 'analysis' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-850 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-300 block font-mono uppercase text-[9px] tracking-wider">Filter nach Spieler/Nutzer</span>
                    <span className="text-[10px] text-slate-500 font-sans block">Zeigt nur Szenen an, die für diesen Nutzer freigegeben oder für alle Spieler sichtbar sind.</span>
                  </div>
                  <select
                    value={analysisUserFilter}
                    onChange={(e) => setAnalysisUserFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium text-xs min-w-[220px] focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">-- Alle Spieler / Alle Videos --</option>
                    {users.map(u => (
                      <option key={u.uid} value={u.uid}>
                        {u.name} {u.role === 'admin' ? '(Coach)' : `(Spieler - ${u.points || 0} Pkt)`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Scene detail cards for the selected tab */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto bg-slate-950 p-4 rounded-2xl border border-slate-850">
                {(() => {
                  const filteredScenes = scenes.filter(s => {
                    if (activeScenesTab === 'analysis') {
                      if (s.type !== 'analysis') return false;
                      if (analysisUserFilter) {
                        return !s.assignedUsers || s.assignedUsers.length === 0 || s.assignedUsers.includes(analysisUserFilter);
                      }
                      return true;
                    }
                    if (activeScenesTab === 'whatsnext') return s.type === 'whatsnext';
                    if (activeScenesTab === 'coaching') return s.type === 'coaching';
                    if (activeScenesTab === 'freestoss') return s.type === 'freestoss';
                    if (activeScenesTab === 'elfmeter') return s.type === 'elfmeter_lernen' || s.type === 'elfmeter_uebung';
                    if (activeScenesTab === 'veo') return s.type === 'veo';
                    if (activeScenesTab === 'bigsave') return s.type === 'bigsave';
                    return false;
                  });

                  if (filteredScenes.length === 0) {
                    return (
                      <p className="text-xs text-slate-500 text-center py-8 font-sans">
                        {analysisUserFilter 
                          ? 'Keine Videoszenen für den ausgewählten Spieler freigegeben.' 
                          : 'Keine aktiven Videoszenen in dieser Kategorie vorhanden.'}
                      </p>
                    );
                  }

                  const getAssignedNames = (uids?: string[]) => {
                    if (!uids || uids.length === 0) return 'Alle Spieler';
                    return uids.map(uid => users.find(u => u.uid === uid)?.name || uid).join(', ');
                  };

                  return filteredScenes.map((s) => {
                    const isInlineEditing = inlineEditingSceneId === s.id;

                    if (isInlineEditing && inlineSceneData) {
                      return (
                        <div key={s.id} className="p-4 bg-slate-900 border border-amber-500/50 rounded-xl space-y-4 text-xs animate-in fade-in duration-200">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="inline-block text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-amber-500 text-slate-950 rounded">
                              {s.type.toUpperCase()} bearbeiten
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSaveSceneInline(s.id)}
                                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded text-xs transition-colors cursor-pointer"
                              >
                                Speichern
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setInlineEditingSceneId(null);
                                  setInlineSceneData(null);
                                }}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition-colors cursor-pointer"
                              >
                                Abbrechen
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="col-span-1 sm:col-span-2 space-y-1">
                              <label className="block text-[9px] text-slate-500 font-mono uppercase">Video Link</label>
                              <input
                                type="text"
                                value={inlineSceneData.videoLink || ''}
                                onChange={(e) => setInlineSceneData({ ...inlineSceneData, videoLink: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-xs font-mono"
                              />
                            </div>

                            {/* Type Specific Fields */}
                            {s.type === 'analysis' && (
                              <>
                                <div className="space-y-1">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Kategorie</label>
                                  <select
                                    value={inlineSceneData.categoryId || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, categoryId: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-xs"
                                  >
                                    <option value="">-- Keine Kategorie --</option>
                                    {categories.map(c => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-1 col-span-1 sm:col-span-2">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Spezifische Hinweise zur Szene</label>
                                  <textarea
                                    value={inlineSceneData.analysisRules || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, analysisRules: e.target.value })}
                                    className="w-full h-16 bg-slate-950 border border-slate-850 rounded p-2 text-white text-xs"
                                  />
                                </div>
                                <div className="space-y-1 col-span-1 sm:col-span-2">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Trainer-Musteranalyse</label>
                                  <textarea
                                    value={inlineSceneData.followUpText || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, followUpText: e.target.value })}
                                    className="w-full h-16 bg-slate-950 border border-slate-850 rounded p-2 text-white text-xs"
                                  />
                                </div>
                                <div className="space-y-1 col-span-1 sm:col-span-2">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Trainingsempfehlungen</label>
                                  <textarea
                                    value={inlineSceneData.trainingRecommendation || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, trainingRecommendation: e.target.value })}
                                    className="w-full h-16 bg-slate-950 border border-slate-850 rounded p-2 text-white text-xs"
                                  />
                                </div>
                              </>
                            )}

                            {(s.type === 'whatsnext' || s.type === 'coaching' || s.type === 'freestoss') && (
                              <>
                                <div className="col-span-1 sm:col-span-2 space-y-1">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Frage</label>
                                  <input
                                    type="text"
                                    value={inlineSceneData.question || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, question: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-xs"
                                  />
                                </div>
                                <div className="col-span-1 sm:col-span-2 space-y-2">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Antwortmöglichkeiten (bis zu 6)</label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {[0, 1, 2, 3, 4, 5].map((idx) => {
                                      const answers = [...(inlineSceneData.answers || ['', '', '', '', '', ''])];
                                      while (answers.length < 6) answers.push('');
                                      return (
                                        <div key={idx} className="flex items-center gap-1.5">
                                          <span className="text-[10px] text-slate-500 font-mono">#{idx + 1}</span>
                                          <input
                                            type="text"
                                            value={answers[idx] || ''}
                                            onChange={(e) => {
                                              const updated = [...answers];
                                              updated[idx] = e.target.value;
                                              setInlineSceneData({ ...inlineSceneData, answers: updated });
                                            }}
                                            placeholder={`Antwort ${idx + 1}`}
                                            className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-xs"
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="col-span-1 sm:col-span-2 space-y-1">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Korrekte Antwort (muss exakt mit einer der Optionen übereinstimmen)</label>
                                  <input
                                    type="text"
                                    value={inlineSceneData.correctAnswer || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, correctAnswer: e.target.value })}
                                    placeholder="Z.B. Oben Links"
                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-xs"
                                  />
                                </div>
                                <div className="col-span-1 sm:col-span-2 space-y-1">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Auflösung & Feedback</label>
                                  <textarea
                                    value={inlineSceneData.followUpText || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, followUpText: e.target.value })}
                                    className="w-full h-16 bg-slate-950 border border-slate-850 rounded p-2 text-white text-xs"
                                  />
                                </div>
                              </>
                            )}

                            {(s.type === 'elfmeter_lernen' || s.type === 'elfmeter_uebung') && (
                              <>
                                <div className="space-y-1">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Typ</label>
                                  <select
                                    value={inlineSceneData.type || 'elfmeter_lernen'}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, type: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-xs"
                                  >
                                    <option value="elfmeter_lernen">Elfmeter Lernen</option>
                                    <option value="elfmeter_uebung">Elfmeter Übung</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Schwierigkeit / Level</label>
                                  <select
                                    value={inlineSceneData.level || 'Level 1'}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, level: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-xs"
                                  >
                                    <option value="Level 1">Level 1</option>
                                    <option value="Level 2">Level 2</option>
                                    <option value="Level 3">Level 3</option>
                                    <option value="Level 4">Level 4</option>
                                    <option value="Level 5">Level 5</option>
                                    <option value="Level 6">Level 6</option>
                                  </select>
                                </div>
                                <div className="space-y-1 col-span-1 sm:col-span-2">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Korrekte Ecke / Antwort</label>
                                  <input
                                    type="text"
                                    value={inlineSceneData.correctAnswer || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, correctAnswer: e.target.value })}
                                    placeholder="Z.B. Oben Links"
                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-xs"
                                  />
                                </div>
                                <div className="space-y-1 col-span-1 sm:col-span-2">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Feedback / Tipp</label>
                                  <textarea
                                    value={inlineSceneData.followUpText || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, followUpText: e.target.value })}
                                    className="w-full h-16 bg-slate-950 border border-slate-850 rounded p-2 text-white text-xs"
                                  />
                                </div>
                              </>
                            )}

                            {s.type === 'veo' && (
                              <>
                                <div className="space-y-1">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Jahrgang/Team</label>
                                  <select
                                    value={inlineSceneData.team || 'U19'}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, team: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-xs"
                                  >
                                    <option value="U16">U16</option>
                                    <option value="U17">U17</option>
                                    <option value="U19">U19</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Datum</label>
                                  <input
                                    type="date"
                                    value={inlineSceneData.date || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, date: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-xs font-mono"
                                  />
                                </div>
                                <div className="col-span-1 sm:col-span-2 space-y-1">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Titel / Beschreibung</label>
                                  <input
                                    type="text"
                                    value={inlineSceneData.question || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, question: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-xs"
                                  />
                                </div>
                              </>
                            )}

                            {s.type === 'bigsave' && (
                              <>
                                <div className="space-y-1">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Saison</label>
                                  <input
                                    type="text"
                                    value={inlineSceneData.season || '2026/2027'}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, season: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Teil</label>
                                  <input
                                    type="text"
                                    value={inlineSceneData.part || '1'}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, part: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-xs"
                                  />
                                </div>
                                <div className="col-span-1 sm:col-span-2 space-y-1">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Gewinner</label>
                                  <input
                                    type="text"
                                    value={inlineSceneData.winner || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, winner: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-xs"
                                  />
                                </div>
                                <div className="col-span-1 sm:col-span-2 space-y-1">
                                  <label className="block text-[9px] text-slate-500 font-mono uppercase">Nominierte Torhüter</label>
                                  <textarea
                                    value={inlineSceneData.nominations || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, nominations: e.target.value })}
                                    className="w-full h-16 bg-slate-950 border border-slate-850 rounded p-2 text-white text-xs"
                                  />
                                </div>
                              </>
                            )}

                            {/* Reusable Assigned Users inside inline editor */}
                            <div className="space-y-1.5 border border-slate-800 bg-slate-900/40 p-2.5 rounded-lg text-xs col-span-1 sm:col-span-2">
                              <span className="block text-[8px] text-slate-500 font-mono uppercase font-black">Zugriff einschränken (Optional: Wenn leer, sehen es alle Spieler)</span>
                              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-0.5">
                                {users.map(u => (
                                  <label key={u.uid} className="flex items-center gap-1 px-2 py-0.5 bg-slate-950 border border-slate-850 rounded text-[9px] text-slate-300 font-medium cursor-pointer hover:border-slate-750">
                                    <input
                                      type="checkbox"
                                      checked={(inlineSceneData.assignedUsers || []).includes(u.uid)}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        const current = inlineSceneData.assignedUsers || [];
                                        const nextUsers = checked 
                                          ? [...current, u.uid]
                                          : current.filter((uid: string) => uid !== u.uid);
                                        setInlineSceneData({
                                          ...inlineSceneData,
                                          assignedUsers: nextUsers
                                        });
                                      }}
                                      className="w-3 h-3 text-amber-500 rounded border-slate-800 bg-slate-900 cursor-pointer"
                                    />
                                    <span>{u.name} {u.role === 'admin' ? '(Admin)' : ''}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                            <button
                              type="button"
                              onClick={() => {
                                setInlineEditingSceneId(null);
                                setInlineSceneData(null);
                              }}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                              Abbrechen
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveSceneInline(s.id)}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                              Änderungen speichern
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={s.id} className="p-4 bg-slate-900 border border-slate-850 rounded-xl space-y-3 text-xs relative hover:border-slate-700 transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 truncate max-w-[80%]">
                            <span className="inline-block text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                              {s.type.toUpperCase()}
                            </span>
                            <a
                              href={s.videoLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block font-mono text-amber-500 hover:underline truncate mt-1 text-xs"
                            >
                              {s.videoLink}
                            </a>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setInlineEditingSceneId(s.id);
                                setInlineSceneData({ ...s });
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Szene inline bearbeiten"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSceneToDelete(s)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Szene löschen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Detail fields based on the type */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-slate-850 text-[11px] leading-relaxed">
                          <div className="space-y-1 text-slate-400">
                            <span className="block font-mono text-[9px] uppercase text-slate-500">Sichtbar für (Zugewiesen)</span>
                            <p className="text-white font-medium">{getAssignedNames(s.assignedUsers)}</p>
                          </div>

                          {s.type === 'analysis' && (
                            <>
                              <div className="space-y-1 text-slate-400">
                                <span className="block font-mono text-[9px] uppercase text-slate-500">Kategorie</span>
                                <p className="text-white font-medium">
                                  {categories.find(c => c.id === s.categoryId)?.name || s.categoryId || 'Keine Kategorie'}
                                </p>
                              </div>
                              {s.analysisRules && (
                                <div className="space-y-1 text-slate-400 col-span-1 sm:col-span-2">
                                  <span className="block font-mono text-[9px] uppercase text-slate-500">Spezifische Hinweise</span>
                                  <p className="text-white font-sans whitespace-pre-wrap bg-slate-950 p-2 rounded border border-slate-850/60">{s.analysisRules}</p>
                                </div>
                              )}
                              {s.followUpText && (
                                <div className="space-y-1 text-slate-400 col-span-1 sm:col-span-2">
                                  <span className="block font-mono text-[9px] uppercase text-slate-500">Trainer-Musteranalyse</span>
                                  <p className="text-white font-sans whitespace-pre-wrap bg-slate-950 p-2 rounded border border-slate-850/60">{s.followUpText}</p>
                                </div>
                              )}
                              {s.trainingRecommendation && (
                                <div className="space-y-1 text-slate-400 col-span-1 sm:col-span-2">
                                  <span className="block font-mono text-[9px] uppercase text-slate-500">Trainingsempfehlungen</span>
                                  <p className="text-white font-sans whitespace-pre-wrap bg-slate-950 p-2 rounded border border-slate-850/60">{s.trainingRecommendation}</p>
                                </div>
                              )}
                            </>
                          )}

                          {(s.type === 'whatsnext' || s.type === 'coaching' || s.type === 'freestoss') && (
                            <>
                              <div className="space-y-1 text-slate-400 col-span-1 sm:col-span-2">
                                <span className="block font-mono text-[9px] uppercase text-slate-500">Frage</span>
                                <p className="text-white font-medium">{s.question || 'Keine Frage definiert'}</p>
                              </div>
                              <div className="space-y-1 text-slate-400 col-span-1 sm:col-span-2">
                                <span className="block font-mono text-[9px] uppercase text-slate-500">Antwortmöglichkeiten</span>
                                <div className="flex flex-wrap gap-1.5 mt-0.5">
                                  {s.answers && s.answers.length > 0 ? (
                                    s.answers.map((ans: string, idx: number) => (
                                      <span key={idx} className={`px-2 py-0.5 rounded text-[10px] font-mono border ${ans === s.correctAnswer ? 'bg-emerald-950 border-emerald-500/40 text-emerald-400' : 'bg-slate-950 border-slate-850 text-slate-400'}`}>
                                        {ans} {ans === s.correctAnswer && '✓'}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-500">Keine Antworten vorhanden</span>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-1 text-slate-400 col-span-1 sm:col-span-2">
                                <span className="block font-mono text-[9px] uppercase text-slate-500">Auflösung & Feedback</span>
                                <p className="text-white font-sans whitespace-pre-wrap bg-slate-950 p-2 rounded border border-slate-850/60">{s.followUpText || 'Kein Feedback definiert'}</p>
                              </div>
                            </>
                          )}

                          {(s.type === 'elfmeter_lernen' || s.type === 'elfmeter_uebung') && (
                            <>
                              <div className="space-y-1 text-slate-400">
                                <span className="block font-mono text-[9px] uppercase text-slate-500">Schwierigkeit</span>
                                <p className="text-white font-medium">{s.level || 'Level 1'}</p>
                              </div>
                              <div className="space-y-1 text-slate-400">
                                <span className="block font-mono text-[9px] uppercase text-slate-500">Korrekte Ecke</span>
                                <p className="text-emerald-400 font-bold">{s.correctAnswer}</p>
                              </div>
                              <div className="space-y-1 text-slate-400 col-span-1 sm:col-span-2">
                                <span className="block font-mono text-[9px] uppercase text-slate-500">Feedback / Tipp</span>
                                <p className="text-white font-sans whitespace-pre-wrap bg-slate-950 p-2 rounded border border-slate-850/60">{s.followUpText || 'Kein Feedback'}</p>
                              </div>
                            </>
                          )}

                          {s.type === 'veo' && (
                            <>
                              <div className="space-y-1 text-slate-400">
                                <span className="block font-mono text-[9px] uppercase text-slate-500">Jahrgang/Team</span>
                                <p className="text-white font-medium">{s.team || 'U19'}</p>
                              </div>
                              <div className="space-y-1 text-slate-400">
                                <span className="block font-mono text-[9px] uppercase text-slate-500">Datum</span>
                                <p className="text-white font-mono">{s.date || 'Nicht angegeben'}</p>
                              </div>
                              <div className="space-y-1 text-slate-400 col-span-1 sm:col-span-2">
                                <span className="block font-mono text-[9px] uppercase text-slate-500">Titel / Beschreibung</span>
                                <p className="text-white font-medium">{s.question || 'Kein Titel angegeben'}</p>
                              </div>
                            </>
                          )}

                          {s.type === 'bigsave' && (
                            <>
                              <div className="space-y-1 text-slate-400">
                                <span className="block font-mono text-[9px] uppercase text-slate-500">Saison / Teil</span>
                                <p className="text-white font-medium">{s.season || '2026/2027'} (Teil {s.part || '1'})</p>
                              </div>
                              <div className="space-y-1 text-slate-400">
                                <span className="block font-mono text-[9px] uppercase text-slate-500">Gewinner</span>
                                <p className="text-amber-500 font-bold">{s.winner || 'Noch offen'}</p>
                              </div>
                              <div className="space-y-1 text-slate-400 col-span-1 sm:col-span-2">
                                <span className="block font-mono text-[9px] uppercase text-slate-500">Nominierte Torhüter</span>
                                <p className="text-white whitespace-pre-wrap bg-slate-950 p-2 rounded border border-slate-850/60">{s.nominations || 'Keine Nominierungen'}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {/* 5. WETTKÄMPFE MANAGER */}
        {activeSubSection === 'wett' && (() => {
          const editingComp = competitions.find(c => c.id === editingCompId);
          const isEditingTraining = editingComp?.type === 'training';
          const isEditingChallenge = editingComp?.type === 'challenge';
          const isEditingRope = editingComp?.type === 'seilspringen';
          return (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-white uppercase font-mono border-b border-slate-800 pb-2">
                Training
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left Column - Creators/Forms */}
                <div className="space-y-6">
                  {/* Trainingswettkampf form (awarding points on save!) */}
                  <form onSubmit={handleAddTrainingswettkampf} className={`bg-slate-950 border p-5 rounded-2xl space-y-4 text-xs transition-all ${isEditingTraining ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-slate-850'}`}>
                    <h3 className="text-xs font-bold text-white font-mono uppercase flex items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        {isEditingTraining ? 'Trainingswettkampf bearbeiten' : 'Trainingswettkampf eintragen (Punkte-Gutschrift!)'}
                      </span>
                      {isEditingTraining && (
                        <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono">Bearbeitungsmodus</span>
                      )}
                    </h3>

                  <p className="text-[10px] text-slate-500">
                    Sieger erhält automatisch **1 Punkt** in der Bestenliste. Ein zweiter Platz wird nicht vergeben.
                  </p>

                  <div>
                    <label className="block text-[8px] text-slate-500 mb-1">Datum des Wettkampfs</label>
                    <input type="date" value={twDate} onChange={(e) => setTwDate(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white font-mono" required />
                  </div>

                  <div>
                    <label className="block text-[8px] text-slate-500 mb-1">Sieger / 1. Platz</label>
                    <select value={twWinnerUid} onChange={(e) => setTwWinnerUid(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white" required>
                      <option value="">Wähle Sieger...</option>
                      {users.map(u => (
                        <option key={u.uid} value={u.uid}>{u.name} {u.role === 'admin' ? '(Admin)' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl cursor-pointer">
                      {isEditingTraining ? 'Änderungen speichern' : 'Wettbewerb speichern & Punkte buchen'}
                    </button>
                    {isEditingTraining && (
                      <button type="button" onClick={clearCompEdit} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl cursor-pointer">
                        Abbrechen
                      </button>
                    )}
                  </div>
                </form>

                {/* Challenge builder */}
                <div className={`bg-slate-950 border p-5 rounded-2xl space-y-4 text-xs transition-all ${isEditingChallenge ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-slate-850'}`}>
                  <h3 className="text-xs font-bold text-white font-mono uppercase flex items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-amber-500" />
                      {isEditingChallenge ? 'Koordinationsleiter-Challenge bearbeiten' : 'Koordinationsleiter-Challenge erstellen'}
                    </span>
                    {isEditingChallenge && (
                      <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono">Bearbeitungsmodus</span>
                    )}
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8px] text-slate-500 mb-1">Level (z.B. Level 1)</label>
                      <input type="text" value={challPeriod} onChange={(e) => setChallPeriod(e.target.value)} placeholder="Z.B. Level 1" className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white" />
                    </div>
                    <div>
                      <label className="block text-[8px] text-slate-500 mb-1">Ersteller (Dropdown)</label>
                      <select value={challCreator} onChange={(e) => setChallCreator(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white">
                        <option value="">Wähle Ersteller...</option>
                        {users.map(u => (
                          <option key={u.uid} value={u.name}>{u.name} {u.role === 'admin' ? '(Admin)' : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] text-slate-500 mb-1">Challenge-Video Link</label>
                    <input type="text" value={challLink} onChange={(e) => setChallLink(e.target.value)} placeholder="https://youtube.com/..." className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white" />
                  </div>

                  <div>
                    <label className="block text-[8px] text-slate-500 mb-1">Beschreibung / Trainingsanleitung</label>
                    <textarea value={challDescription} onChange={(e) => setChallDescription(e.target.value)} placeholder="Beschreibe die Koordinationsleiter-Challenge für die Keeper..." rows={3} className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white resize-none" />
                  </div>

                  {/* Checklist successful users */}
                  <div>
                    <label className="block text-[8px] text-slate-500 mb-1">Erfolgreiche Absolventen (Checkboxes)</label>
                    <div className="flex flex-wrap gap-2 bg-slate-900 p-2.5 rounded border border-slate-800">
                      {users.filter(u => u.role !== 'admin' && !u.archived).map(u => (
                        <div key={u.uid} className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-950 border rounded text-[10px]">
                          <input
                            type="checkbox"
                            id={`chall-${u.uid}`}
                            checked={challSuccessful.includes(u.uid)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              if (checked) setChallSuccessful(prev => [...prev, u.uid]);
                              else setChallSuccessful(prev => prev.filter(id => id !== u.uid));
                            }}
                            className="w-3.5 h-3.5 rounded text-amber-500"
                          />
                          <label htmlFor={`chall-${u.uid}`} className="text-slate-300">{u.name}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={handleAddChallenge} className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl cursor-pointer">
                      {isEditingChallenge ? 'Änderungen speichern' : 'Challenge eintragen & Punkte gutschreiben'}
                    </button>
                    {isEditingChallenge && (
                      <button onClick={clearCompEdit} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl cursor-pointer">
                        Abbrechen
                      </button>
                    )}
                  </div>

                  {/* Koordinationsleiter-Tutorial-Videos verwalten */}
                  <div className="border-t border-slate-800/80 pt-4 mt-4 space-y-3">
                    <h4 className="text-[10px] text-amber-400 font-mono font-bold uppercase flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" />
                      <span>Erklärungen der einzelnen Aufgaben in der Leiter</span>
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Diese Videos werden den Keepern angezeigt, wenn sie in der Challenge auf "Bewegungen unklar? Hier lang!" klicken.
                    </p>
                    <div className="space-y-2">
                      {(tutLinks['koordinationsleiter_challenge'] || [{ title: '', url: '' }]).map((vid, vidIdx) => (
                        <div key={vidIdx} className="flex gap-2 items-center bg-slate-900/40 p-2.5 rounded-xl border border-slate-900">
                          <div className="flex-1 space-y-1.5">
                            <div>
                              <label className="block text-[8px] text-slate-500 mb-0.5">Überschrift</label>
                              <input
                                type="text"
                                value={vid.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTutLinks(prev => {
                                    const updatedList = [...(prev['koordinationsleiter_challenge'] || [{ title: '', url: '' }])];
                                    updatedList[vidIdx] = { ...updatedList[vidIdx], title: val };
                                    return { ...prev, koordinationsleiter_challenge: updatedList };
                                  });
                                }}
                                placeholder="z.B. Seitlicher Einbeinsprung"
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] text-slate-500 mb-0.5">YouTube Link / Video-URL</label>
                              <input
                                type="text"
                                value={vid.url}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTutLinks(prev => {
                                    const updatedList = [...(prev['koordinationsleiter_challenge'] || [{ title: '', url: '' }])];
                                    updatedList[vidIdx] = { ...updatedList[vidIdx], url: val };
                                    return { ...prev, koordinationsleiter_challenge: updatedList };
                                  });
                                }}
                                placeholder="https://youtube.com/watch?v=..."
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5 pt-3 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setTutLinks(prev => {
                                  const updatedList = [...(prev['koordinationsleiter_challenge'] || [{ title: '', url: '' }])];
                                  updatedList.splice(vidIdx + 1, 0, { title: '', url: '' });
                                  return { ...prev, koordinationsleiter_challenge: updatedList };
                                });
                              }}
                              className="p-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg cursor-pointer transition-colors"
                              title="Weiteres Video hinzufügen"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            {(tutLinks['koordinationsleiter_challenge'] || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTutLinks(prev => {
                                    const updatedList = (prev['koordinationsleiter_challenge'] || []).filter((_, idx) => idx !== vidIdx);
                                    return { ...prev, koordinationsleiter_challenge: updatedList };
                                  });
                                }}
                                className="p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg cursor-pointer transition-colors"
                                title="Video entfernen"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const docRef = doc(db, 'config', 'contents');
                          const docSnap = await getDoc(docRef);
                          const existingData = docSnap.exists() ? docSnap.data() : {};
                          
                          await setDoc(docRef, {
                            ...existingData,
                            koordinationsleiter_challenge: tutLinks['koordinationsleiter_challenge'] || []
                          });
                          alert('Koordinationsleiter-Videolinks erfolgreich gespeichert!');
                        } catch (err) {
                          console.error(err);
                          alert('Fehler beim Speichern der Links.');
                        }
                      }}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Koordinationsleiter-Videos speichern</span>
                    </button>
                  </div>
                </div>

                {/* Seilspringen Challenge builder */}
                <div className={`bg-slate-950 border p-5 rounded-2xl space-y-4 text-xs transition-all ${isEditingRope ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-slate-850'}`}>
                  <h3 className="text-xs font-bold text-white font-mono uppercase flex items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-amber-500" />
                      {isEditingRope ? 'Seilspringen Challenge bearbeiten' : 'Seilspringen Challenge erstellen'}
                    </span>
                    {isEditingRope && (
                      <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono">Bearbeitungsmodus</span>
                    )}
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8px] text-slate-500 mb-1">Level (z.B. Level 1)</label>
                      <input type="text" value={ropePeriod} onChange={(e) => setRopePeriod(e.target.value)} placeholder="Z.B. Level 1" className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white" />
                    </div>
                    <div>
                      <label className="block text-[8px] text-slate-500 mb-1">Ersteller (Dropdown)</label>
                      <select value={ropeCreator} onChange={(e) => setRopeCreator(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white">
                        <option value="">Wähle Ersteller...</option>
                        {users.map(u => (
                          <option key={u.uid} value={u.name}>{u.name} {u.role === 'admin' ? '(Admin)' : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] text-slate-500 mb-1">Seilspringen-Video Link</label>
                    <input type="text" value={ropeLink} onChange={(e) => setRopeLink(e.target.value)} placeholder="https://youtube.com/..." className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white" />
                  </div>

                  <div>
                    <label className="block text-[8px] text-slate-500 mb-1">Beschreibung / Trainingsanleitung</label>
                    <textarea value={ropeDescription} onChange={(e) => setRopeDescription(e.target.value)} placeholder="Beschreibe die Seilspringen-Challenge für die Keeper..." rows={3} className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white resize-none" />
                  </div>

                  {/* Checklist successful users */}
                  <div>
                    <label className="block text-[8px] text-slate-500 mb-1">Erfolgreiche Absolventen (Checkboxes)</label>
                    <div className="flex flex-wrap gap-2 bg-slate-900 p-2.5 rounded border border-slate-800">
                      {users.filter(u => u.role !== 'admin' && !u.archived).map(u => (
                        <div key={u.uid} className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-950 border rounded text-[10px]">
                          <input
                            type="checkbox"
                            id={`rope-${u.uid}`}
                            checked={ropeSuccessful.includes(u.uid)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              if (checked) setRopeSuccessful(prev => [...prev, u.uid]);
                              else setRopeSuccessful(prev => prev.filter(id => id !== u.uid));
                            }}
                            className="w-3.5 h-3.5 rounded text-amber-500"
                          />
                          <label htmlFor={`rope-${u.uid}`} className="text-slate-300">{u.name}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={handleAddRopeChallenge} className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl cursor-pointer">
                      {isEditingRope ? 'Änderungen speichern' : 'Seilspringen eintragen & Punkte gutschreiben'}
                    </button>
                    {isEditingRope && (
                      <button onClick={clearCompEdit} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl cursor-pointer">
                        Abbrechen
                      </button>
                    )}
                  </div>
                </div>

                {/* Trainingsinhalte-Manager (Offensivtechniken, Neurozentriertes Training auf dem Platz, Neuroathletiktraining) */}
                <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl space-y-4 text-xs">
                  <h3 className="text-xs font-bold text-white font-mono uppercase flex items-center gap-1.5 border-b border-slate-850 pb-2">
                    <BookOpen className="w-4 h-4 text-amber-500" />
                    <span>Trainingsinhalte verwalten</span>
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Hier kannst du Lehr- und Trainingsvideos für die sonst gesperrten Trainingsbereiche anlegen. Sobald mindestens ein Video hinterlegt ist, wird der jeweilige Bereich für die Spieler freigeschaltet!
                  </p>
                  {[
                    { id: 'offensiv_training', label: 'Offensivtechniken' },
                    { id: 'torwart_athletik_antritt', label: 'Torwartspezifisches AT - Antritt' },
                    { id: 'torwart_athletik_schnelle_beine', label: 'Torwartspezifisches AT - Schnelle Beine' },
                    { id: 'torwart_athletik_explosivitaet', label: 'Torwartspezifisches AT - Explosivität' },
                    { id: 'torwart_athletik_beweglichkeit', label: 'Torwartspezifisches AT - Beweglichkeit' },
                    { id: 'torwart_athletik_gleichgewicht', label: 'Torwartspezifisches AT - Gleichgewicht' },
                    { id: 'mental_tr_selbstvertrauen', label: 'Training: Mentales Training - Selbstvertrauen' },
                    { id: 'mental_tr_fokus', label: 'Training: Mentales Training - Fokus' },
                    { id: 'mental_tr_externe_faktoren', label: 'Training: Mentales Training - Externe Faktoren' },
                    { id: 'mental_tr_fehler', label: 'Training: Mentales Training - Fehler' },
                  ].map((tut) => {
                    const videos = trainingLinks[tut.id] || [{ title: '', url: '' }];
                    return (
                      <div key={tut.id} className="space-y-2 border-b border-slate-900/60 pb-4 last:border-b-0 last:pb-0">
                        <label className="block text-[10px] text-amber-400 font-mono font-bold uppercase">{tut.label}</label>
                        <div className="space-y-2">
                          {videos.map((vid, vidIdx) => (
                            <div key={vidIdx} className="flex gap-2 items-center bg-slate-900/40 p-2.5 rounded-xl border border-slate-900">
                              <div className="flex-1 space-y-1.5">
                                <div>
                                  <label className="block text-[8px] text-slate-500 mb-0.5">Überschrift</label>
                                  <input
                                    type="text"
                                    value={vid.title}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTrainingLinks(prev => {
                                        const updatedList = [...(prev[tut.id] || [{ title: '', url: '' }])];
                                        updatedList[vidIdx] = { ...updatedList[vidIdx], title: val };
                                        return { ...prev, [tut.id]: updatedList };
                                      });
                                    }}
                                    placeholder="z.B. Technikeinführung"
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] text-slate-500 mb-0.5">YouTube Link / Video-URL</label>
                                  <input
                                    type="text"
                                    value={vid.url}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTrainingLinks(prev => {
                                        const updatedList = [...(prev[tut.id] || [{ title: '', url: '' }])];
                                        updatedList[vidIdx] = { ...updatedList[vidIdx], url: val };
                                        return { ...prev, [tut.id]: updatedList };
                                      });
                                    }}
                                    placeholder="https://youtube.com/watch?v=..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white font-mono"
                                  />
                                </div>
                              </div>
                              <div className="flex flex-col gap-1.5 pt-3 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTrainingLinks(prev => {
                                      const updatedList = [...(prev[tut.id] || [{ title: '', url: '' }])];
                                      updatedList.splice(vidIdx + 1, 0, { title: '', url: '' });
                                      return { ...prev, [tut.id]: updatedList };
                                    });
                                  }}
                                  className="p-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg cursor-pointer transition-colors"
                                  title="Weiteres Video hinzufügen"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                {videos.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTrainingLinks(prev => {
                                        const updatedList = (prev[tut.id] || []).filter((_, idx) => idx !== vidIdx);
                                        return { ...prev, [tut.id]: updatedList };
                                      });
                                    }}
                                    className="p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg cursor-pointer transition-colors"
                                    title="Video entfernen"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <button
                    onClick={handleSaveTrainingLinks}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow"
                  >
                    <Save className="w-4 h-4 font-black" />
                    <span>Trainings-Inhalte in DB speichern</span>
                  </button>
                </div>

                {/* Kognitionstraining mit Ball verwalten */}
                <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl space-y-5 text-xs">
                  <h3 className="text-xs font-bold text-white font-mono uppercase flex items-center gap-1.5 border-b border-slate-850 pb-2">
                    <Brain className="w-4 h-4 text-pink-500" />
                    <span>Kognitionstraining mit Ball verwalten</span>
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Hier kannst du Trainingsvideos für den kognitiven Part zum Mitlaufen lassen sowie Trainingshinweise (als Liste untereinander) anlegen.
                  </p>

                  {/* TAB 1: Trainingshinweise */}
                  <div className="space-y-3">
                    <label className="block text-[10px] text-amber-400 font-mono font-bold uppercase">
                      A) Trainingshinweise (Liste untereinander)
                    </label>
                    <div className="space-y-2">
                      {kognitionBallHints.map((hint, hintIdx) => (
                        <div key={hintIdx} className="flex gap-2 items-center bg-slate-900/40 p-2 rounded-xl border border-slate-900">
                          <input
                            type="text"
                            value={hint}
                            onChange={(e) => {
                              const val = e.target.value;
                              setKognitionBallHints(prev => {
                                const updated = [...prev];
                                updated[hintIdx] = val;
                                return updated;
                              });
                            }}
                            placeholder={`Übungshinweis #${hintIdx + 1}`}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                          />
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setKognitionBallHints(prev => {
                                  const updated = [...prev];
                                  updated.splice(hintIdx + 1, 0, '');
                                  return updated;
                                });
                              }}
                              className="p-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg cursor-pointer transition-colors"
                              title="Weitere Zeile hinzufügen"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            {kognitionBallHints.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setKognitionBallHints(prev => prev.filter((_, idx) => idx !== hintIdx));
                                }}
                                className="p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg cursor-pointer transition-colors"
                                title="Zeile entfernen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TAB 2: Trainingsvideos */}
                  <div className="space-y-3 pt-2 border-t border-slate-900/80">
                    <label className="block text-[10px] text-amber-400 font-mono font-bold uppercase">
                      B) Trainingsvideos (zum Mitlaufen lassen)
                    </label>
                    <div className="space-y-3">
                      {(trainingLinks['kognition_ball_training'] || [{ title: '', url: '' }]).map((vid, vidIdx) => (
                        <div key={vidIdx} className="bg-slate-900/40 p-3 rounded-xl border border-slate-900 space-y-2 relative">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[8px] text-slate-500 mb-0.5">Überschrift / Titel</label>
                              <input
                                type="text"
                                value={vid.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTrainingLinks(prev => {
                                    const updatedList = [...(prev['kognition_ball_training'] || [{ title: '', url: '' }])];
                                    updatedList[vidIdx] = { ...updatedList[vidIdx], title: val };
                                    return { ...prev, kognition_ball_training: updatedList };
                                  });
                                }}
                                placeholder="z.B. Kognitive Übung mit 2 Bällen"
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] text-slate-500 mb-0.5">YouTube Link / Video-URL</label>
                              <input
                                type="text"
                                value={vid.url}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTrainingLinks(prev => {
                                    const updatedList = [...(prev['kognition_ball_training'] || [{ title: '', url: '' }])];
                                    updatedList[vidIdx] = { ...updatedList[vidIdx], url: val };
                                    return { ...prev, kognition_ball_training: updatedList };
                                  });
                                }}
                                placeholder="https://youtube.com/watch?v=..."
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                              />
                            </div>
                          </div>
                          <div className="absolute right-2 top-1.5 flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setTrainingLinks(prev => {
                                  const updatedList = [...(prev['kognition_ball_training'] || [{ title: '', url: '' }])];
                                  updatedList.splice(vidIdx + 1, 0, { title: '', url: '' });
                                  return { ...prev, kognition_ball_training: updatedList };
                                });
                              }}
                              className="p-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md cursor-pointer transition-colors"
                              title="Weiteres Video hinzufügen"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            {(trainingLinks['kognition_ball_training'] || [{ title: '', url: '' }]).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTrainingLinks(prev => {
                                    const updatedList = (prev['kognition_ball_training'] || []).filter((_, idx) => idx !== vidIdx);
                                    return { ...prev, kognition_ball_training: updatedList };
                                  });
                                }}
                                className="p-1 bg-red-500/80 hover:bg-red-600 text-white rounded-md cursor-pointer transition-colors"
                                title="Video entfernen"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSaveTrainingLinks}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow transition-colors"
                  >
                    <Save className="w-4 h-4 font-black" />
                    <span>Kognitionstraining mit Ball Daten speichern</span>
                  </button>
                </div>

                {/* Elfmeter-Szenen anlegen (E) */}
                <div className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-850 text-xs">
                  <h3 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-amber-500" /> {editingSceneId ? 'Elfmeter-Szenen bearbeiten (E)' : 'Elfmeter-Szenen anlegen (E)'}
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono mb-1">Sub-Kategorie</label>
                      <select
                        value={penaltyType}
                        onChange={(e) => setPenaltyType(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-white"
                      >
                        <option value="elfmeter_lernen">Lernen (Links/Rechts erraten)</option>
                        <option value="elfmeter_uebung">Übung (Anschauen & Abhaken)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono mb-1">YouTube Link</label>
                      <input type="text" value={penaltyVideo} onChange={(e) => setPenaltyVideo(e.target.value)} placeholder="https://youtube.com/..." className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono mb-1">Richtung (Auswahl: Links, Mitte, Rechts)</label>
                      <select
                        value={penaltyCorrect || 'Links'}
                        onChange={(e) => setPenaltyCorrect(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono"
                      >
                        <option value="Links">Links</option>
                        <option value="Mitte">Mitte</option>
                        <option value="Rechts">Rechts</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono mb-1">Level (Dropdown)</label>
                      <select
                        value={penaltyLevel}
                        onChange={(e) => setPenaltyLevel(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white"
                      >
                        <option value="Level 1">Level 1</option>
                        <option value="Level 2">Level 2</option>
                        <option value="Level 3">Level 3</option>
                        <option value="Level 4">Level 4</option>
                        <option value="Level 5">Level 5</option>
                        <option value="Level 6">Level 6</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono mb-1">Folgeaktion / Beschreibung</label>
                      <input type="text" value={penaltyFollowUp} onChange={(e) => setPenaltyFollowUp(e.target.value)} placeholder="Keeper pariert hervorragend..." className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white" />
                    </div>
                  </div>

                  {renderUserCheckboxes(penaltyAssignedUsers, setPenaltyAssignedUsers)}

                  <div className="flex gap-2">
                    <button onClick={handleAddPenaltyScene} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl cursor-pointer">
                      {editingSceneId ? 'Änderungen speichern' : 'Elfmeter speichern'}
                    </button>
                    {editingSceneId && (
                      <button
                        onClick={() => {
                          setEditingSceneId(null);
                          setPenaltyVideo('');
                          setPenaltyFollowUp('');
                          setPenaltyLevel('Level 1');
                          setPenaltyAssignedUsers([]);
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl cursor-pointer"
                      >
                        Abbrechen
                      </button>
                    )}
                  </div>
                </div>

                {/* Taktikanalyse & Coaching Szenen anlegen */}
                <form onSubmit={handleAddMCScene} className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-850 text-xs">
                  <h3 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-amber-500" /> {editingSceneId ? 'Taktikanalyse / Coaching bearbeiten' : 'Taktikanalyse / Coaching anlegen'}
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono mb-1">Bereich / Szenentyp</label>
                      <select
                        value={sceneType}
                        onChange={(e) => setSceneType(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-white"
                      >
                        <option value="whatsnext">B) Taktikanalyse</option>
                        <option value="coaching">C) Coaching</option>
                      </select>
                    </div>
                    {sceneType === 'whatsnext' ? (
                      <div>
                        <label className="block text-[9px] text-amber-400 font-mono mb-1 uppercase font-bold">Kategorie (Taktikanalyse)</label>
                        <select
                          value={sceneSubCategory}
                          onChange={(e) => setSceneSubCategory(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-white font-mono text-xs"
                        >
                          <option value="flanken">Flankensituationen</option>
                          <option value="querpass">Querpasssituationen</option>
                          <option value="1vs1_nahdistanz">1vs1 Situationen &amp; Nahdistanzsituationen</option>
                          <option value="ferndistanz">Ferndistanzsituationen</option>
                          <option value="abwehrkette">Verteidigen hinter der Abwehrkette</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[9px] text-slate-500 font-mono mb-1">YouTube Link</label>
                        <input type="text" value={sceneVideo} onChange={(e) => setSceneVideo(e.target.value)} placeholder="https://youtube.com/..." className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white" required />
                      </div>
                    )}
                  </div>

                  {sceneType === 'whatsnext' && (
                    <div>
                      <label className="block text-[9px] text-slate-500 font-mono mb-1">YouTube Link</label>
                      <input type="text" value={sceneVideo} onChange={(e) => setSceneVideo(e.target.value)} placeholder="https://youtube.com/..." className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white" required />
                    </div>
                  )}

                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1">Spezifische Frage (optional, Standard wird sonst genutzt)</label>
                    <input type="text" value={sceneQuestion} onChange={(e) => setSceneQuestion(e.target.value)} placeholder="Z.B. Wohin orientierst du dich?" className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white" />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[9px] text-slate-500 font-mono uppercase font-bold">Multiple Choice Antworten (bis zu 6)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {sceneAnswers.map((ans, idx) => (
                        <input
                          key={idx}
                          type="text"
                          value={ans}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSceneAnswers(prev => {
                              const next = [...prev];
                              next[idx] = val;
                              return next;
                            });
                          }}
                          placeholder={`Antwortmöglichkeit ${idx + 1}`}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white"
                        />
                      ))}
                    </div>

                    <div className="max-w-xs pt-1">
                      <label className="block text-[9px] text-slate-500 font-mono mb-1 font-bold text-amber-500">EXAKT korrekte Antwort angeben</label>
                      <input type="text" value={sceneCorrect} onChange={(e) => setSceneCorrect(e.target.value)} placeholder="Einen dieser Texte exakt kopieren..." className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white" required />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono mb-1">Folgeaktion Text / Erklärung (Sichtbar nach Beantwortung)</label>
                    <textarea value={sceneFollowUpText} onChange={(e) => setSceneFollowUpText(e.target.value)} className="w-full h-16 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white" placeholder="Erklärung warum dies die richtige Lösung ist..." required />
                  </div>

                  {renderUserCheckboxes(mcAssignedUsers, setMcAssignedUsers)}

                  <div className="flex gap-2">
                    <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl cursor-pointer">
                      {editingSceneId ? 'Änderungen speichern' : 'Szene anlegen'}
                    </button>
                    {editingSceneId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSceneId(null);
                          setSceneVideo('');
                          setSceneQuestion('');
                          setSceneAnswers(['', '', '', '', '', '']);
                          setSceneCorrect('');
                          setSceneFollowUpText('');
                          setMcAssignedUsers([]);
                        }}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl cursor-pointer"
                      >
                        Abbrechen
                      </button>
                    )}
                  </div>
                </form>

                {/* Inactive areas badge warning */}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center gap-2 text-amber-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-bold">Kognitionsspiele, Reaction Grid</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Gemäß Anforderungen für diesen Meilenstein: "nicht programmiert".</p>
                  </div>
                </div>
              </div>

              {/* Right Column - Lists */}
              <div className="space-y-6">
                {/* List all contests for deletion categorized by tabs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 font-mono uppercase">Vorhandene Wettkämpfe</h3>
                    <span className="text-[10px] text-slate-500 font-mono">{competitions.length} Wettkämpfe</span>
                  </div>

                  {/* Tab Navigation */}
                  <div className="flex flex-wrap gap-1 border-b border-slate-850 pb-2">
                    {[
                      { id: 'all', label: 'Alle' },
                      { id: 'training', label: 'Trainingswettkampf' },
                      { id: 'challenge', label: 'Challenge' },
                      { id: 'seilspringen', label: 'Seilspringen' },
                      { id: 'quiz', label: 'Quiz' }
                    ].map((tab) => {
                      const isActive = activeCompTab === tab.id;
                      const count = tab.id === 'all' 
                        ? competitions.length 
                        : competitions.filter(c => c.type === tab.id).length;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveCompTab(tab.id as any)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-900 hover:bg-slate-850 text-slate-400'
                          }`}
                        >
                          {tab.label} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* Competition cards filtered by the active tab */}
                  <div className="space-y-2 max-h-64 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-850">
                    {(() => {
                      const filteredComps = competitions.filter(c => {
                        if (activeCompTab === 'all') return true;
                        return c.type === activeCompTab;
                      });

                      const getLevelNum = (val: string | undefined) => {
                        if (!val) return Infinity;
                        const match = val.match(/\d+/);
                        return match ? parseInt(match[0], 10) : Infinity;
                      };

                      const sortedComps = [...filteredComps].sort((a, b) => {
                        if (a.type !== b.type) {
                          return a.type.localeCompare(b.type);
                        }
                        if (a.type === 'challenge' || a.type === 'seilspringen') {
                          const levelA = getLevelNum(a.period);
                          const levelB = getLevelNum(b.period);
                          return levelA - levelB;
                        }
                        return 0;
                      });

                      if (sortedComps.length === 0) {
                        return (
                          <p className="text-[11px] text-slate-500 text-center py-4 font-sans">
                            Keine Einträge in dieser Kategorie vorhanden.
                          </p>
                        );
                      }

                      return sortedComps.map(c => (
                        <div key={c.id} className="p-3 bg-slate-900 border border-slate-850/60 rounded-lg flex flex-col gap-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-850/40 pb-1.5">
                            <span className="text-[9px] font-mono font-bold uppercase text-amber-500">
                              {c.type === 'training' && '🏆 Trainingswettkampf'}
                              {c.type === 'challenge' && '🛹 Challenge'}
                              {c.type === 'seilspringen' && '🪢 Seilspringen'}
                              {c.type === 'quiz' && '❓ Quiz'}
                            </span>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleEditCompClick(c)} 
                                className={`p-1 rounded transition-colors cursor-pointer ${editingCompId === c.id ? 'text-amber-400 bg-slate-800' : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800'}`}
                                title="Eintrag bearbeiten"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => setCompToDelete(c)} 
                                className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Eintrag löschen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {c.type === 'training' && (
                            <div className="text-[11px] text-slate-300 space-y-0.5">
                              <p>Datum: <span className="text-white font-mono">{c.date}</span></p>
                              <p>Sieger: <span className="text-emerald-400 font-bold">{c.winner}</span> (1 Pkt)</p>
                              {c.second && (
                                <p>2. Platz: <span className="text-amber-500 font-bold">{c.second}</span></p>
                              )}
                            </div>
                          )}

                          {(c.type === 'challenge' || c.type === 'seilspringen') && (
                            <div className="text-[11px] text-slate-300 space-y-0.5">
                              <p>Level: <span className="text-white font-medium">{c.period}</span></p>
                              <p>Erstellt von: <span className="text-white">{c.creator}</span></p>
                              {c.videoLink && (
                                <p className="truncate">
                                  Video: <a href={c.videoLink} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline font-mono text-[10px]">{c.videoLink}</a>
                                </p>
                              )}
                              <p>Erfolgreiche Spieler: <span className="text-slate-400">{(c.successfulUsers || []).length} Spieler</span></p>
                              {c.description && (
                                <p className="text-zinc-500 mt-1 italic text-[10px] whitespace-pre-wrap">
                                  Beschreibung: <span className="text-zinc-300 font-sans not-italic">{c.description}</span>
                                </p>
                              )}
                            </div>
                          )}

                          {c.type === 'quiz' && (
                            <div className="text-[11px] text-slate-300 space-y-1">
                              <p className="font-medium text-white">{c.question}</p>
                              <div className="grid grid-cols-2 gap-1 mt-1 text-[10px] font-mono">
                                {(c.answers || []).map((ans: string, index: number) => (
                                  <span key={index} className={`px-1.5 py-0.5 rounded border ${index === c.correctAnswer ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' : 'bg-slate-950 border-slate-850 text-slate-500'}`}>
                                    {ans} {index === c.correctAnswer && '✓'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Aktive Elfmeter-Szenen list (moved here!) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-amber-500" /> Aktive Elfmeter-Szenen
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {scenes.filter(s => s.type === 'elfmeter_lernen' || s.type === 'elfmeter_uebung').length} Szenen
                    </span>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-850">
                    {(() => {
                      const elfmeterScenes = scenes.filter(s => s.type === 'elfmeter_lernen' || s.type === 'elfmeter_uebung');

                      if (elfmeterScenes.length === 0) {
                        return (
                          <p className="text-xs text-slate-500 text-center py-8 font-sans">
                            Keine aktiven Elfmeter-Szenen vorhanden.
                          </p>
                        );
                      }

                      const getAssignedNames = (uids?: string[]) => {
                        if (!uids || uids.length === 0) return 'Alle Spieler';
                        return uids.map(uid => users.find(u => u.uid === uid)?.name || uid).join(', ');
                      };

                      return elfmeterScenes.map((s) => {
                        const isInlineEditing = inlineEditingSceneId === s.id;

                        if (isInlineEditing && inlineSceneData) {
                          return (
                            <div key={s.id} className="p-3 bg-slate-900 border border-amber-500/50 rounded-xl space-y-3 text-xs">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                <span className="inline-block text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-amber-500 text-slate-950 rounded">
                                  ELFMETER bearbeiten
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveSceneInline(s.id)}
                                    className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded text-[10px] cursor-pointer"
                                  >
                                    Speichern
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInlineEditingSceneId(null);
                                      setInlineSceneData(null);
                                    }}
                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] cursor-pointer"
                                  >
                                    Abbrechen
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2.5">
                                <div className="space-y-1">
                                  <label className="block text-[8px] text-slate-500 font-mono uppercase">Video Link</label>
                                  <input
                                    type="text"
                                    value={inlineSceneData.videoLink || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, videoLink: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-[11px] font-mono"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="block text-[8px] text-slate-500 font-mono uppercase">Typ</label>
                                    <select
                                      value={inlineSceneData.type || 'elfmeter_lernen'}
                                      onChange={(e) => setInlineSceneData({ ...inlineSceneData, type: e.target.value })}
                                      className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-[11px]"
                                    >
                                      <option value="elfmeter_lernen">Elfmeter Lernen</option>
                                      <option value="elfmeter_uebung">Elfmeter Übung</option>
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-[8px] text-slate-500 font-mono uppercase">Level</label>
                                    <select
                                      value={inlineSceneData.level || 'Level 1'}
                                      onChange={(e) => setInlineSceneData({ ...inlineSceneData, level: e.target.value })}
                                      className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-[11px]"
                                    >
                                      <option value="Level 1">Level 1</option>
                                      <option value="Level 2">Level 2</option>
                                      <option value="Level 3">Level 3</option>
                                      <option value="Level 4">Level 4</option>
                                      <option value="Level 5">Level 5</option>
                                      <option value="Level 6">Level 6</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-[8px] text-slate-500 font-mono uppercase">Korrekte Ecke / Richtung</label>
                                  {inlineSceneData.type === 'elfmeter_lernen' ? (
                                    <select
                                      value={inlineSceneData.correctAnswer || 'Links'}
                                      onChange={(e) => setInlineSceneData({ ...inlineSceneData, correctAnswer: e.target.value })}
                                      className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-[11px]"
                                    >
                                      <option value="Links">Links</option>
                                      <option value="Mitte">Mitte</option>
                                      <option value="Rechts">Rechts</option>
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      value={inlineSceneData.correctAnswer || ''}
                                      onChange={(e) => setInlineSceneData({ ...inlineSceneData, correctAnswer: e.target.value })}
                                      className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-[11px]"
                                    />
                                  )}
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-[8px] text-slate-500 font-mono uppercase">Feedback / Tipp</label>
                                  <textarea
                                    value={inlineSceneData.followUpText || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, followUpText: e.target.value })}
                                    className="w-full h-12 bg-slate-950 border border-slate-850 rounded p-2 text-white text-[11px]"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={s.id} className="p-3 bg-slate-900 border border-slate-850/60 rounded-xl space-y-2 text-xs relative hover:border-slate-700 transition-all">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-0.5 truncate max-w-[80%]">
                                <span className="inline-block text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 bg-slate-850 text-slate-400 rounded">
                                  {s.type === 'elfmeter_lernen' ? 'Lernen' : 'Übung'} - {s.level || 'Level 1'}
                                </span>
                                <a
                                  href={s.videoLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block font-mono text-amber-500 hover:underline truncate mt-1 text-[11px]"
                                >
                                  {s.videoLink}
                                </a>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInlineEditingSceneId(s.id);
                                    setInlineSceneData({ ...s });
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-500 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                  title="Szene inline bearbeiten"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSceneToDelete(s)}
                                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                  title="Szene löschen"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-slate-850 text-[10px] text-slate-400">
                              <div>
                                <span className="font-mono text-[8px] uppercase text-slate-500 mr-1.5">Sichtbar für:</span>
                                <span className="text-white font-medium">{getAssignedNames(s.assignedUsers)}</span>
                              </div>
                              <div>
                                <span className="font-mono text-[8px] uppercase text-slate-500 mr-1.5">Ecke/Antwort:</span>
                                <span className="text-white font-medium">{s.correctAnswer}</span>
                              </div>
                              {s.followUpText && (
                                <div>
                                  <span className="font-mono text-[8px] uppercase text-slate-500 mr-1.5">Feedback/Tipp:</span>
                                  <span className="text-slate-300 font-medium">{s.followUpText}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Aktive Taktikanalyse & Coaching-Szenen list */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-amber-500" /> Aktive Taktikanalyse & Coaching-Szenen
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {scenes.filter(s => s.type === 'whatsnext' || s.type === 'coaching').length} Szenen
                    </span>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-slate-850">
                    {(() => {
                      const mcScenes = scenes.filter(s => s.type === 'whatsnext' || s.type === 'coaching');

                      if (mcScenes.length === 0) {
                        return (
                          <p className="text-xs text-slate-500 text-center py-8 font-sans">
                            Keine aktiven Taktikanalyse- oder Coaching-Szenen vorhanden.
                          </p>
                        );
                      }

                      const getAssignedNames = (uids?: string[]) => {
                        if (!uids || uids.length === 0) return 'Alle Spieler';
                        return uids.map(uid => users.find(u => u.uid === uid)?.name || uid).join(', ');
                      };

                      return mcScenes.map((s) => {
                        const isInlineEditing = inlineEditingSceneId === s.id;

                        if (isInlineEditing && inlineSceneData) {
                          return (
                            <div key={s.id} className="p-3 bg-slate-900 border border-amber-500/50 rounded-xl space-y-3 text-xs">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                <span className="inline-block text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-amber-500 text-slate-950 rounded">
                                  {s.type === 'whatsnext' ? 'Taktikanalyse' : 'Coaching'} bearbeiten
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveSceneInline(s.id)}
                                    className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded text-[10px] cursor-pointer"
                                  >
                                    Speichern
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInlineEditingSceneId(null);
                                      setInlineSceneData(null);
                                    }}
                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] cursor-pointer"
                                  >
                                    Abbrechen
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2.5">
                                {s.type === 'whatsnext' && (
                                  <div className="space-y-1">
                                    <label className="block text-[8px] text-amber-400 font-mono uppercase font-bold">Kategorie (Taktikanalyse)</label>
                                    <select
                                      value={inlineSceneData.subCategory || 'flanken'}
                                      onChange={(e) => setInlineSceneData({ ...inlineSceneData, subCategory: e.target.value })}
                                      className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-[11px] font-mono"
                                    >
                                      <option value="flanken">Flankensituationen</option>
                                      <option value="querpass">Querpasssituationen</option>
                                      <option value="1vs1_nahdistanz">1vs1 Situationen &amp; Nahdistanzsituationen</option>
                                      <option value="ferndistanz">Ferndistanzsituationen</option>
                                      <option value="abwehrkette">Verteidigen hinter der Abwehrkette</option>
                                    </select>
                                  </div>
                                )}

                                <div className="space-y-1">
                                  <label className="block text-[8px] text-slate-500 font-mono uppercase">Video Link</label>
                                  <input
                                    type="text"
                                    value={inlineSceneData.videoLink || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, videoLink: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-[11px] font-mono"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-[8px] text-slate-500 font-mono uppercase">Frage</label>
                                  <input
                                    type="text"
                                    value={inlineSceneData.question || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, question: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-[11px]"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-[8px] text-slate-500 font-mono uppercase">Antworten (Komma-getrennt)</label>
                                  <input
                                    type="text"
                                    value={(inlineSceneData.answers || []).join(', ')}
                                    onChange={(e) => {
                                      const parts = e.target.value.split(',').map(x => x.trim());
                                      setInlineSceneData({ ...inlineSceneData, answers: parts });
                                    }}
                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-[11px]"
                                    placeholder="Antwort 1, Antwort 2, Antwort 3..."
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-[8px] text-slate-500 font-mono uppercase">Korrekte Antwort</label>
                                  <input
                                    type="text"
                                    value={inlineSceneData.correctAnswer || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, correctAnswer: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-white text-[11px]"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-[8px] text-slate-500 font-mono uppercase">Feedback / Tipp</label>
                                  <textarea
                                    value={inlineSceneData.followUpText || ''}
                                    onChange={(e) => setInlineSceneData({ ...inlineSceneData, followUpText: e.target.value })}
                                    className="w-full h-12 bg-slate-950 border border-slate-850 rounded p-2 text-white text-[11px]"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const getWhatsNextCatLabel = (cat?: string) => {
                          switch (cat) {
                            case 'querpass': return 'Querpass';
                            case '1vs1_nahdistanz': return '1vs1 & Nahdistanz';
                            case 'ferndistanz': return 'Ferndistanz';
                            case 'abwehrkette': return 'Hinter Abwehrkette';
                            case 'flanken':
                            default: return 'Flanken';
                          }
                        };

                        return (
                          <div key={s.id} className="p-3 bg-slate-900 border border-slate-850/60 rounded-xl space-y-2 text-xs relative hover:border-slate-700 transition-all">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-0.5 truncate max-w-[80%]">
                                <span className="inline-block text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 bg-slate-850 text-slate-400 rounded">
                                  {s.type === 'whatsnext' ? `Taktikanalyse (${getWhatsNextCatLabel(s.subCategory)})` : 'Coaching'}
                                </span>
                                <a
                                  href={s.videoLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block font-mono text-amber-500 hover:underline truncate mt-1 text-[11px]"
                                >
                                  {s.videoLink}
                                </a>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInlineEditingSceneId(s.id);
                                    setInlineSceneData({ ...s });
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-500 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                  title="Szene inline bearbeiten"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSceneToDelete(s)}
                                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                  title="Szene löschen"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-slate-850 text-[10px] text-slate-400">
                              <div>
                                <span className="font-mono text-[8px] uppercase text-slate-500 mr-1.5">Sichtbar für:</span>
                                <span className="text-white font-medium">{getAssignedNames(s.assignedUsers)}</span>
                              </div>
                              {s.question && (
                                <div>
                                  <span className="font-mono text-[8px] uppercase text-slate-500 mr-1.5">Frage:</span>
                                  <span className="text-white font-medium">{s.question}</span>
                                </div>
                              )}
                              {s.answers && s.answers.length > 0 && (
                                <div>
                                  <span className="font-mono text-[8px] uppercase text-slate-500 mr-1.5">Optionen:</span>
                                  <span className="text-slate-300">{(s.answers || []).join(' | ')}</span>
                                </div>
                              )}
                              <div>
                                <span className="font-mono text-[8px] uppercase text-slate-500 mr-1.5">Korrekte Antwort:</span>
                                <span className="text-emerald-400 font-medium">{s.correctAnswer}</span>
                              </div>
                              {s.followUpText && (
                                <div>
                                  <span className="font-mono text-[8px] uppercase text-slate-500 mr-1.5">Feedback/Tipp:</span>
                                  <span className="text-slate-300 font-medium">{s.followUpText}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {/* 6. INHALTE MANAGER */}
        {activeSubSection === 'inhalte' && (() => {
          const isEditingQuiz = editingCompId !== null && (competitions.find(c => c.id === editingCompId)?.type === 'quiz' || LEVEL_QUIZZES.some(q => q.id === editingCompId));

          const allQuizQuestions = (() => {
            const map = new Map<string, any>();
            // 1. Static level quizzes
            LEVEL_QUIZZES.forEach(q => {
              map.set(q.id, {
                id: q.id,
                type: 'quiz',
                question: q.question,
                answers: q.answers,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation || '',
                level: q.level || 1,
                isDefault: true
              });
            });
            // 2. Firestore quizzes
            competitions.filter(c => c.type === 'quiz').forEach(c => {
              if (map.has(c.id)) {
                map.set(c.id, { ...map.get(c.id), ...c, isDefault: false });
              } else {
                map.set(c.id, { ...c, level: c.level || 1, isDefault: false });
              }
            });

            let list = Array.from(map.values());
            if (quizLevelFilter !== 'all') {
              list = list.filter(q => q.level === quizLevelFilter);
            }
            return list.sort((a, b) => (a.level || 0) - (b.level || 0));
          })();

          return (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-white uppercase font-mono border-b border-slate-800 pb-2">
                Inhalte & Wissens-Quiz verwalten
              </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Left Column: Tutorial Links */}
              <div className="space-y-4 text-xs bg-slate-950 p-5 rounded-2xl border border-slate-850">
                <h3 className="text-xs font-bold text-white font-mono uppercase border-b border-slate-850 pb-2 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-amber-500" />
                  <span>Tutorial & Video Links</span>
                </h3>
                {[
                  { id: 'kraftsport', label: '0) Kraftsport' },
                  { id: 'mental', label: 'A1) Mentaltraining - Mentale Hacks' },
                  { id: 'mental_fehler', label: 'A2) Mentaltraining - Umgang mit Fehlern' },
                  { id: 'kognition', label: 'B) Training mit der Koordinationsleiter' },
                  { id: 'neuro', label: 'C) Neuroathletiktraining' },
                  { id: 'tw_at', label: 'D) Torwartspezifisches Athletiktraining' },
                  { id: 'nutrition', label: 'E) Ernährung' },
                  { id: 'coaching', label: 'F) Coaching' },
                  { id: 'warmup', label: 'G) Empfehlungen für das Spiel WarmUp' },
                  { id: 'freistoß', label: 'H1) Standards - Freistöße' },
                  { id: 'eckball', label: 'H2) Standards - Eckbälle' },
                  { id: 'elfmeter', label: 'H3) Standards - Elfmeter' },
                  { id: 'regelkunde', label: 'I) Regelkunde' },
                  { id: 'anbieteverhalten_mitspielen', label: 'J1) Offensivtaktiken - Mitspielen' },
                  { id: 'anbieteverhalten_umschaltverhalten', label: 'J2) Offensivtaktiken - Umschaltverhalten' },
                  { id: 'tw_taktik_flanken', label: 'K1) Torwart-Taktik - Flankensituationen' },
                  { id: 'tw_taktik_querpass', label: 'K2) Torwart-Taktik - Querpasssituationen' },
                  { id: 'tw_taktik_1vs1_nahdistanz', label: 'K3) Torwart-Taktik - 1vs1 & Nahdistanzsituationen' },
                  { id: 'tw_taktik_ferndistanz', label: 'K4) Torwart-Taktik - Ferndistanzsituationen' },
                  { id: 'tw_taktik_abwehrkette', label: 'K5) Torwart-Taktik - Verteidigen hinter der Abwehrkette' },
                ].map((tut) => {
                  let videos = tutLinks[tut.id];
                  if ((!videos || videos.length === 0) && tut.id === 'tw_at') {
                    videos = [
                      ...(tutLinks['tw_at'] || []),
                      ...(tutLinks['tw_at_antritt'] || []),
                      ...(tutLinks['tw_at_schnelle_beine'] || []),
                      ...(tutLinks['tw_at_explosivitaet'] || []),
                      ...(tutLinks['tw_at_beweglichkeit'] || []),
                      ...(tutLinks['tw_at_gleichgewicht'] || []),
                      ...(tutLinks['tw_at_technik'] || [])
                    ];
                  }
                  if ((!videos || videos.length === 0) && tut.id === 'tw_taktik_1vs1_nahdistanz') {
                    videos = [
                      ...(tutLinks['tw_taktik_1vs1_nahdistanz'] || []),
                      ...(tutLinks['tw_taktik_1vs1'] || []),
                      ...(tutLinks['tw_taktik_nahdistanz'] || [])
                    ];
                  }
                  if (!videos || videos.length === 0) {
                    videos = [{ title: '', url: '' }];
                  }
                  return (
                    <div key={tut.id} className="space-y-2 border-b border-slate-900/60 pb-4 last:border-b-0 last:pb-0">
                      <label className="block text-[10px] text-amber-400 font-mono font-bold uppercase">{tut.label}</label>
                      <div className="space-y-2">
                        {videos.map((vid, vidIdx) => (
                          <div key={vidIdx} className="flex gap-2 items-center bg-slate-900/40 p-2.5 rounded-xl border border-slate-900">
                            <div className="flex-1 space-y-1.5">
                              <div>
                                <label className="block text-[8px] text-slate-500 mb-0.5">Überschrift</label>
                                <input
                                  type="text"
                                  value={vid.title}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTutLinks(prev => {
                                      const updatedList = [...(prev[tut.id] || [{ title: '', url: '' }])];
                                      updatedList[vidIdx] = { ...updatedList[vidIdx], title: val };
                                      return { ...prev, [tut.id]: updatedList };
                                    });
                                  }}
                                  placeholder="z.B. Einführung"
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] text-slate-500 mb-0.5">YouTube Link / Video-URL</label>
                                <input
                                  type="text"
                                  value={vid.url}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTutLinks(prev => {
                                      const updatedList = [...(prev[tut.id] || [{ title: '', url: '' }])];
                                      updatedList[vidIdx] = { ...updatedList[vidIdx], url: val };
                                      return { ...prev, [tut.id]: updatedList };
                                    });
                                  }}
                                  placeholder="https://youtube.com/watch?v=..."
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white font-mono"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5 pt-3 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setTutLinks(prev => {
                                    const updatedList = [...(prev[tut.id] || [{ title: '', url: '' }])];
                                    updatedList.splice(vidIdx + 1, 0, { title: '', url: '' });
                                    return { ...prev, [tut.id]: updatedList };
                                  });
                                }}
                                className="p-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg cursor-pointer transition-colors"
                                title="Weiteres Video hinzufügen"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              {videos.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTutLinks(prev => {
                                      const updatedList = (prev[tut.id] || []).filter((_, idx) => idx !== vidIdx);
                                      return { ...prev, [tut.id]: updatedList };
                                    });
                                  }}
                                  className="p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg cursor-pointer transition-colors"
                                  title="Video entfernen"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2">
                  <button
                    onClick={handleSaveTutorialLinks}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow"
                  >
                    <Save className="w-4 h-4 font-black" />
                    <span>Tutorial-Links in DB speichern</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Wissens-Quiz Creator and Deletion */}
              <div className="space-y-6">
                {/* Wissens-Quiz Creator Form */}
                <form onSubmit={handleAddQuiz} className={`bg-slate-950 border p-5 rounded-2xl space-y-4 text-xs transition-all ${isEditingQuiz ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-slate-850'}`}>
                  <h3 className="text-xs font-bold text-white font-mono uppercase flex items-center justify-between gap-1.5 border-b border-slate-850 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-emerald-400" />
                      {isEditingQuiz ? 'Wissens-Quiz Frage bearbeiten' : 'Wissens-Quiz Frage anlegen'}
                    </span>
                    {isEditingQuiz && (
                      <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono">Bearbeitungsmodus</span>
                    )}
                  </h3>

                  <div>
                    <label className="block text-[8px] text-slate-500 mb-1 font-mono uppercase font-bold">Frage / Statement</label>
                    <input type="text" value={quizQuestion} onChange={(e) => setQuizQuestion(e.target.value)} placeholder="Z.B. Wann darf der Keeper den Ball mit den Händen aufnehmen?" className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white font-bold" required />
                  </div>

                  <div>
                    <label className="block text-[8px] text-slate-500 mb-1 font-mono uppercase font-bold">Level-Zuordnung</label>
                    <select
                      value={quizLevel}
                      onChange={(e) => setQuizLevel(parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white font-mono text-xs cursor-pointer"
                    >
                      {Array.from({ length: 13 }, (_, i) => i + 1).map(lvl => (
                        <option key={lvl} value={lvl}>Level {lvl}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[8px] text-slate-500 font-mono uppercase font-bold">4 Antworten</label>
                    {quizAnswers.map((ans, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={ans}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuizAnswers(prev => {
                            const next = [...prev];
                            next[idx] = val;
                            return next;
                          });
                        }}
                        placeholder={`Option ${idx + 1}`}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-white"
                        required
                      />
                    ))}
                  </div>

                  <div>
                    <label className="block text-[8px] text-slate-500 mb-1 font-mono uppercase font-bold">Korrekte Option Index</label>
                    <select value={quizCorrectIdx} onChange={(e) => setQuizCorrectIdx(parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white font-mono cursor-pointer">
                      <option value={0}>Option 1 ist korrekt</option>
                      <option value={1}>Option 2 ist korrekt</option>
                      <option value={2}>Option 3 ist korrekt</option>
                      <option value={3}>Option 4 ist korrekt</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[8px] text-slate-500 mb-1 font-mono uppercase font-bold">Erklärung / Feedback (optional)</label>
                    <textarea
                      value={quizExplanation}
                      onChange={(e) => setQuizExplanation(e.target.value)}
                      placeholder="Erklärung, warum die Antwort richtig ist..."
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white text-xs"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl cursor-pointer">
                      {isEditingQuiz ? 'Änderungen speichern' : 'Quizfrage speichern'}
                    </button>
                    {isEditingQuiz && (
                      <button type="button" onClick={clearCompEdit} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl cursor-pointer">
                        Abbrechen
                      </button>
                    )}
                  </div>
                </form>

                {/* Vorhandene Quizfragen list */}
                <div className="space-y-3 bg-slate-950 p-5 rounded-2xl border border-slate-850">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-400 font-mono uppercase">Vorhandene Quizfragen</h3>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold">
                        {allQuizQuestions.length} Fragen
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-mono">Filter:</span>
                      <select
                        value={quizLevelFilter}
                        onChange={(e) => setQuizLevelFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                        className="bg-slate-900 text-slate-300 border border-slate-800 text-[10px] rounded px-2 py-1 font-mono cursor-pointer"
                      >
                        <option value="all">Alle Level (1 - 13)</option>
                        {Array.from({ length: 13 }, (_, i) => i + 1).map(lvl => (
                          <option key={lvl} value={lvl}>Level {lvl}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {allQuizQuestions.length === 0 ? (
                      <p className="text-[10px] text-slate-500 text-center py-4">
                        Keine Quizfragen für dieses Filter-Kriterium vorhanden.
                      </p>
                    ) : (
                      allQuizQuestions.map(q => (
                        <div key={q.id} className="p-3 bg-slate-900 border border-slate-850/60 rounded-lg flex flex-col gap-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-850/40 pb-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-mono font-bold uppercase text-emerald-400 flex items-center gap-1">
                                ❓ Quiz
                              </span>
                              <span className="text-[9px] font-mono font-bold bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">
                                Level {q.level || 1}
                              </span>
                              {q.isDefault && (
                                <span className="text-[8px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                                  Standard
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleEditCompClick(q)} 
                                className={`p-1 rounded transition-colors cursor-pointer ${editingCompId === q.id ? 'text-amber-400 bg-slate-800' : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800'}`}
                                title="Frage bearbeiten (Level / Text)"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => setCompToDelete({ id: q.id, type: 'quiz', question: q.question })} 
                                className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Frage löschen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-300 space-y-1">
                            <p className="font-medium text-white">{q.question}</p>
                            <div className="grid grid-cols-2 gap-1 mt-1 text-[10px] font-mono">
                              {(q.answers || []).map((ans: string, index: number) => (
                                <span key={index} className={`px-1.5 py-0.5 rounded border ${index === q.correctAnswer ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 font-bold' : 'bg-slate-950 border-slate-850 text-slate-500'}`}>
                                  {ans} {index === q.correctAnswer && '✓'}
                                </span>
                              ))}
                            </div>
                            {q.explanation && (
                              <p className="text-[10px] text-slate-400 italic mt-1 bg-slate-950/50 p-1.5 rounded border border-slate-850/50">
                                💡 {q.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {/* 7. INDIVIDUELLE ZIELE ASSESSOR */}
        {activeSubSection === 'ziele' && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-white uppercase font-mono border-b border-slate-800 pb-2">
              7. Individuelle Ziele bewerten & festlegen (Assessor)
            </h2>

            {/* Motivation Videos Manager (Global) */}
            <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-amber-500 font-mono uppercase flex items-center gap-1.5 border-b border-slate-900 pb-2.5">
                <Video className="w-4 h-4" />
                <span>"Warum?" Bereich konfigurieren (Globale Motivation Videos)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Hier kannst du Videos hinzufügen, die allen Keepern im "Warum?" Bereich der individuellen Ziele zur Motivation angezeigt werden. (Big Save Videos können weiter unten individuell pro Keeper eingestellt werden).
              </p>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 pt-2">
                {(tutLinks['motivation'] || [{ title: '', url: '' }]).map((vid, vidIdx) => (
                  <div key={vidIdx} className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 relative group flex gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[8px] text-slate-500 mb-0.5">Überschrift / Titel</label>
                          <input
                            type="text"
                            value={vid.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTutLinks(prev => {
                                const updatedList = [...(prev['motivation'] || [{ title: '', url: '' }])];
                                updatedList[vidIdx] = { ...updatedList[vidIdx], title: val };
                                return { ...prev, motivation: updatedList };
                              });
                            }}
                            placeholder="z.B. Mentale Stärke im Tor"
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-slate-500 mb-0.5">YouTube Link / Video-URL</label>
                          <input
                            type="text"
                            value={vid.url}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTutLinks(prev => {
                                const updatedList = [...(prev['motivation'] || [{ title: '', url: '' }])];
                                updatedList[vidIdx] = { ...updatedList[vidIdx], url: val };
                                return { ...prev, motivation: updatedList };
                              });
                            }}
                            placeholder="https://youtube.com/watch?v=..."
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 pt-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setTutLinks(prev => {
                            const updatedList = [...(prev['motivation'] || [{ title: '', url: '' }])];
                            updatedList.splice(vidIdx + 1, 0, { title: '', url: '' });
                            return { ...prev, motivation: updatedList };
                          });
                        }}
                        className="p-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded cursor-pointer transition-colors flex items-center justify-center w-6 h-6"
                        title="Weiteres Video hinzufügen"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      {(tutLinks['motivation'] || [{ title: '', url: '' }]).length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setTutLinks(prev => {
                              const updatedList = (prev['motivation'] || []).filter((_, idx) => idx !== vidIdx);
                              return { ...prev, motivation: updatedList };
                            });
                          }}
                          className="p-1 bg-red-500/80 hover:bg-red-600 text-white rounded cursor-pointer transition-colors flex items-center justify-center w-6 h-6"
                          title="Video entfernen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-900">
                <button
                  type="button"
                  onClick={handleSaveTutorialLinks}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                >
                  <Save className="w-4 h-4 font-black" />
                  <span>Globale Motivation Videos speichern</span>
                </button>
              </div>
            </div>

            {/* Level To-Dos Manager (Global for Levels 1 - 13) */}
            <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-5 space-y-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-amber-500 font-mono uppercase flex items-center gap-2">
                    <ListTodo className="w-4 h-4" />
                    <span>Allgemeine Level-To-Dos verwalten (Level 1 – 13)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Diese To-Dos werden automatisch für alle Keeper freigeschaltet, sobald das jeweilige Level freigegeben wird. Du kannst vorhandene To-Dos bearbeiten, löschen, neue To-Dos erstellen und zu Levels zuordnen.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCleanWhatsNext}
                    disabled={isCleaningWhatsNext}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    title="Wandelt alle veralteten 'Whats-Next' Einträge in bestehenden To-Dos zu 'Taktikanalyse' um"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isCleaningWhatsNext ? 'animate-spin' : ''}`} />
                    <span>Whats-Next bereinigen</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSyncAllKeepers}
                    disabled={isSyncingAllTodos}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow"
                    title="Synchronisiert alle To-Dos aller Level für alle Keeper gemäß deren Modulfreigaben"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAllTodos ? 'animate-spin' : ''}`} />
                    <span>{isSyncingAllTodos ? 'Synchronisiere...' : 'Für alle Keeper syncen'}</span>
                  </button>
                </div>
              </div>

              {levelTodoFeedback && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{levelTodoFeedback}</span>
                </div>
              )}

              {/* Form: Add new Level To-Do */}
              <form onSubmit={handleCreateLevelTodo} className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white font-mono uppercase">
                  <Plus className="w-3.5 h-3.5 text-amber-500" />
                  <span>Neues Level-To-Do hinzufügen</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-1">
                    <label className="block text-[8px] text-slate-500 font-mono uppercase mb-1">Ziel-Level</label>
                    <select
                      value={newTodoLevel}
                      onChange={(e) => setNewTodoLevel(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none"
                    >
                      {Array.from({ length: 13 }, (_, i) => i + 1).map((lvl) => (
                        <option key={lvl} value={lvl}>
                          Level {lvl}: {LEVEL_TITLES[lvl]?.replace(`Level ${lvl}: `, '') || ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[8px] text-slate-500 font-mono uppercase mb-1">Beschreibung des To-Dos</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTodoText}
                        onChange={(e) => setNewTodoText(e.target.value)}
                        placeholder="z.B. Analysiere mindestens 3 Taktikanalyse-Szenen..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none"
                        required
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs font-mono uppercase shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer shadow"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Hinzufügen</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Level Filter Bar */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-500 font-mono uppercase">Filter nach Level</span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    Gesamt: {Object.values(levelTodos).reduce((sum: number, list) => sum + ((list as string[])?.length || 0), 0)} To-Dos
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedLevelFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                      selectedLevelFilter === 'all'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Alle Level
                  </button>
                  {Array.from({ length: 13 }, (_, i) => i + 1).map((lvl) => {
                    const count = levelTodos[lvl]?.length || 0;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSelectedLevelFilter(lvl)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                          selectedLevelFilter === lvl
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Lvl {lvl}</span>
                        <span className={`text-[8px] px-1 py-0.2 rounded-full ${selectedLevelFilter === lvl ? 'bg-slate-950 text-amber-400 font-black' : 'bg-slate-800 text-slate-400'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* List of Level To-Dos */}
              <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                {Array.from({ length: 13 }, (_, i) => i + 1)
                  .filter((lvl) => selectedLevelFilter === 'all' || selectedLevelFilter === lvl)
                  .map((lvl) => {
                    const todosForLevel = levelTodos[lvl] || [];
                    return (
                      <div key={lvl} className="bg-slate-900/40 rounded-xl border border-slate-850 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded font-mono font-bold text-[10px]">
                              Level {lvl}
                            </span>
                            <span className="text-xs font-bold text-white">
                              {LEVEL_TITLES[lvl] || `Level ${lvl}`}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">
                            {todosForLevel.length} {todosForLevel.length === 1 ? 'To-Do' : 'To-Dos'}
                          </span>
                        </div>

                        {todosForLevel.length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic py-2 text-center font-mono">
                            Keine To-Dos für Level {lvl} hinterlegt.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {todosForLevel.map((todoText, todoIdx) => {
                              const isEditing = editingTodo?.level === lvl && editingTodo?.index === todoIdx;
                              return (
                                <div
                                  key={todoIdx}
                                  className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex items-start gap-3 group hover:border-slate-700 transition-colors"
                                >
                                  <span className="text-[10px] font-mono text-slate-500 font-bold mt-0.5 shrink-0">
                                    #{todoIdx + 1}
                                  </span>

                                  <div className="flex-1">
                                    {isEditing ? (
                                      <div className="space-y-2">
                                        <textarea
                                          value={editingTodo.text}
                                          onChange={(e) => setEditingTodo({ ...editingTodo, text: e.target.value })}
                                          rows={2}
                                          className="w-full bg-slate-900 border border-amber-500/50 rounded-lg p-2 text-xs text-white focus:outline-none"
                                        />
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={handleSaveEditLevelTodo}
                                            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded text-[10px] font-mono uppercase flex items-center gap-1 cursor-pointer"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Speichern</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingTodo(null)}
                                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono uppercase flex items-center gap-1 cursor-pointer"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                            <span>Abbrechen</span>
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-200 leading-relaxed">
                                        {todoText}
                                      </p>
                                    )}
                                  </div>

                                  {!isEditing && (
                                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                      <button
                                        type="button"
                                        onClick={() => setEditingTodo({ level: lvl, index: todoIdx, text: todoText })}
                                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-900 rounded transition-colors cursor-pointer"
                                        title="To-Do bearbeiten"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setTodoToDelete({ level: lvl, index: todoIdx, text: todoText })}
                                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded transition-colors cursor-pointer"
                                        title="To-Do löschen"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Select User Dropdown */}
            <div className="max-w-xs text-xs">
              <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Wähle einen Keeper aus</label>
              <select
                value={assessorUserUid}
                onChange={(e) => setAssessorUserUid(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="">Wähle Keeper...</option>
                {users.filter(u => !u.archived).map(u => (
                  <option key={u.uid} value={u.uid}>{u.name} {u.role === 'admin' ? '(Admin)' : ''}</option>
                ))}
              </select>
            </div>

            {/* If keeper is selected, show Goal creation form & goals columns */}
            {assessorUserUid && (
              <div className="space-y-6">
                {/* Individual Big Save Videos Config */}
                <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-amber-500 font-mono uppercase flex items-center gap-1.5 border-b border-slate-900 pb-2.5">
                    <Video className="w-4 h-4" />
                    <span>"Big Save" Videos für {users.find(u => u.uid === assessorUserUid)?.name || 'diesen Keeper'} konfigurieren</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Diese Videos werden dem Keeper individuell im "Warum?"-Reiter unter "Big Saves" angezeigt, um ihn zu inspirieren.
                  </p>

                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 pt-2">
                    {selectedUserBigSaves.map((vid, vidIdx) => (
                      <div key={vidIdx} className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 relative group flex gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[8px] text-slate-500 mb-0.5">Überschrift / Titel</label>
                              <input
                                type="text"
                                value={vid.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSelectedUserBigSaves(prev => {
                                    const updatedList = [...prev];
                                    updatedList[vidIdx] = { ...updatedList[vidIdx], title: val };
                                    return updatedList;
                                  });
                                }}
                                placeholder="z.B. Highlight Save vs. Bayern"
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] text-slate-500 mb-0.5">YouTube Link / Video-URL</label>
                              <input
                                type="text"
                                value={vid.url}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSelectedUserBigSaves(prev => {
                                    const updatedList = [...prev];
                                    updatedList[vidIdx] = { ...updatedList[vidIdx], url: val };
                                    return updatedList;
                                  });
                                }}
                                placeholder="https://youtube.com/watch?v=..."
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 pt-3 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserBigSaves(prev => {
                                const updatedList = [...prev];
                                updatedList.splice(vidIdx + 1, 0, { title: '', url: '' });
                                return updatedList;
                              });
                            }}
                            className="p-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded cursor-pointer transition-colors flex items-center justify-center w-6 h-6"
                            title="Weiteres Video hinzufügen"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          {selectedUserBigSaves.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserBigSaves(prev => prev.filter((_, idx) => idx !== vidIdx));
                              }}
                              className="p-1 bg-red-500/80 hover:bg-red-600 text-white rounded cursor-pointer transition-colors flex items-center justify-center w-6 h-6"
                              title="Video entfernen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-900">
                    <button
                      type="button"
                      onClick={handleSaveUserBigSaves}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                    >
                      <Save className="w-4 h-4 font-black" />
                      <span>Big Save Videos für {users.find(u => u.uid === assessorUserUid)?.name || 'Keeper'} speichern</span>
                    </button>
                  </div>
                </div>

                {/* Admin Goal Creation Form */}
                <form onSubmit={handleCreateAdminGoal} className="bg-slate-950 border border-amber-500/20 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-amber-500 font-mono uppercase flex items-center gap-1.5 border-b border-slate-900 pb-2.5">
                    <Target className="w-4 h-4" />
                    <span>Neuen Eintrag für diesen Keeper festlegen</span>
                  </h3>

                  <div className="space-y-3">
                    <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                      Art des Eintrags
                    </label>
                    <div className="flex gap-2 p-1 bg-slate-900 rounded-xl border border-slate-850 max-w-xs">
                      <button
                        type="button"
                        onClick={() => setAdminGoalCategory('ziel')}
                        className={`flex-1 py-1.5 text-[10px] font-bold font-mono uppercase rounded-lg transition-all cursor-pointer ${
                          adminGoalCategory === 'ziel'
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Entwicklungsziel
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminGoalCategory('todo')}
                        className={`flex-1 py-1.5 text-[10px] font-bold font-mono uppercase rounded-lg transition-all cursor-pointer ${
                          adminGoalCategory === 'todo'
                            ? 'bg-amber-500 text-slate-950 shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        To Do
                      </button>
                    </div>
                  </div>

                  {adminGoalCategory === 'todo' ? (
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                        Beschreibung des To Dos
                      </label>
                      <input
                        type="text"
                        value={adminGoalDesc}
                        onChange={(e) => setAdminGoalDesc(e.target.value)}
                        placeholder="Z.B. Theoriefragen beantworten oder Video-Analyse ansehen..."
                        className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none"
                        required
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                          Art des Ziels
                        </label>
                        <select
                          value={adminGoalType}
                          onChange={(e) => setAdminGoalType(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                        >
                          <option value="Technik">Technik</option>
                          <option value="Taktik">Taktik</option>
                          <option value="Entscheidung">Entscheidung</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                          Präzise Beschreibung des Ziels
                        </label>
                        <input
                          type="text"
                          value={adminGoalDesc}
                          onChange={(e) => setAdminGoalDesc(e.target.value)}
                          placeholder="Z.B. Stellungsspiel bei Eckbällen optimieren..."
                          className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{adminGoalCategory === 'todo' ? 'To Do speichern' : 'Trainerziel speichern'}</span>
                    </button>
                  </div>
                </form>

                {/* Two-Column Goals Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Column 1: To Dos */}
                  <div className="space-y-4">
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center shadow">
                      <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">To Dos</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Tägliche oder wöchentliche Aufgaben des Keepers</p>
                    </div>

                    {allGoals.filter(g => g.userId === assessorUserUid && g.category === 'todo').length === 0 ? (
                      <p className="text-xs text-slate-500 font-mono italic text-center py-4">Keine To Dos vorhanden.</p>
                    ) : (
                      allGoals
                        .filter(g => g.userId === assessorUserUid && g.category === 'todo')
                        .map((todo) => (
                          <div key={todo.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3 text-xs">
                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={todo.completed}
                                  onChange={() => handleToggleTodoCompletedByTrainer(todo)}
                                  className="w-4 h-4 rounded border-slate-800 text-amber-500 focus:ring-amber-500 cursor-pointer shrink-0"
                                />
                                <span className={todo.completed ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>
                                  {todo.completed ? '[ERLEDIGT]' : '[OFFEN]'}
                                </span>
                                <span>ERSTELLT: {todo.date.split('-').reverse().join('.')}</span>
                              </div>
                              <button
                                onClick={() => setGoalToDelete(todo)}
                                className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-900 transition-colors cursor-pointer flex items-center gap-1 font-sans font-bold"
                                title="To Do löschen"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-red-400" />
                                <span>Löschen</span>
                              </button>
                            </div>

                            <p className={`font-bold text-sm ${todo.completed ? 'text-slate-500 line-through' : 'text-white'}`}>
                              "{todo.description}"
                            </p>

                            <div className="flex items-center gap-2 text-[10px] font-mono">
                              <span className="text-slate-500">Erstellt von:</span>
                              <span className={`px-2 py-0.5 rounded font-mono font-bold uppercase ${
                                todo.createdBy === 'trainer' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-850 text-slate-400'
                              }`}>
                                {todo.createdBy === 'trainer' ? 'Trainer' : 'Keeper'}
                              </span>
                            </div>

                            {/* Trainer Feedback/Einschätzung form */}
                            <div className="space-y-1.5 pt-2 border-t border-slate-900">
                              <label className="block text-[8px] text-slate-500 font-mono uppercase">Trainer-Einschätzung formulieren</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={goalAssessments[todo.id] ?? todo.assessment ?? ''}
                                  onChange={(e) => {
                                    const txt = e.target.value;
                                    setGoalAssessments(prev => ({ ...prev, [todo.id]: txt }));
                                  }}
                                  placeholder="Deine Beurteilung zum Lernfortschritt..."
                                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white flex-1"
                                />
                                <button
                                  onClick={() => handleSaveGoalAssessment(todo.id)}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg cursor-pointer"
                                >
                                  Sichern
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>

                  {/* Column 2: Entwicklungsziele */}
                  <div className="space-y-4">
                    <div className="bg-slate-950 border border-amber-500/20 p-3 rounded-2xl text-center shadow border-t-amber-500/40">
                      <h4 className="text-xs font-bold text-amber-500 uppercase font-mono tracking-wider">Individuelle Entwicklungsziele</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Torwartspezifische längerfristige Meilensteine</p>
                    </div>

                    {allGoals.filter(g => g.userId === assessorUserUid && (!g.category || g.category === 'ziel')).length === 0 ? (
                      <p className="text-xs text-slate-500 font-mono italic text-center py-4">Keine Entwicklungsziele vorhanden.</p>
                    ) : (
                      allGoals
                        .filter(g => g.userId === assessorUserUid && (!g.category || g.category === 'ziel'))
                        .map((goal) => {
                          const evalStatus = getGoalEvaluationStatus(goal);
                          return (
                            <div key={goal.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3 text-xs">
                              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 flex-wrap gap-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-amber-500 font-bold uppercase">TYP: {goal.type}</span>
                                  <span>ERSTELLT: {goal.date.split('-').reverse().join('.')}</span>
                                  {goal.renewedAt && (
                                    <span className="text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold">
                                      VERLÄNGERT: {goal.renewedAt.split('-').reverse().join('.')} ({goal.renewalCount || 1}x)
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => setGoalToDelete(goal)}
                                  className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-900 transition-colors cursor-pointer flex items-center gap-1 font-sans font-bold"
                                  title="Ziel löschen"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-red-400" />
                                  <span>Löschen</span>
                                </button>
                              </div>

                              <p className="font-bold text-white text-sm">"{goal.description}"</p>

                              <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] font-mono">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500">Erstellt von:</span>
                                  <span className={`px-2 py-0.5 rounded font-mono font-bold uppercase ${
                                    goal.createdBy === 'trainer' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-850 text-slate-400'
                                  }`}>
                                    {goal.createdBy === 'trainer' ? 'Trainer' : 'Keeper'}
                                  </span>
                                </div>

                                <div>
                                  {goal.completed ? (
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                                      Abgeschlossen & Bewertet
                                    </span>
                                  ) : !evalStatus.isEvaluable ? (
                                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold uppercase flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      <span>In Trainingsphase (noch {evalStatus.daysRemaining} {evalStatus.daysRemaining === 1 ? 'Tag' : 'Tage'})</span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                                      Bereit zur Selbstbewertung
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-[11px] text-slate-400 italic bg-slate-900/50 p-2.5 rounded-lg border border-slate-850/60 space-y-1">
                                <span className="block text-[9px] text-slate-500 font-mono uppercase font-bold not-italic">Selbstbewertung des Keepers:</span>
                                {goal.completed || goal.evaluation !== undefined ? (
                                  <>
                                    <div>
                                      Selbstbewertung Skala (-2 bis +2): <span className="text-amber-500 font-bold not-italic">{goal.evaluation ?? 'Keine'}</span>
                                    </div>
                                    <div>
                                      Genug Aktionen im Team: <span className="font-bold text-slate-300 not-italic">{goal.actions?.team ? 'Ja' : 'Nein'}</span>,
                                      TW: <span className="font-bold text-slate-300 not-italic">{goal.actions?.tw ? 'Ja' : 'Nein'}</span>,
                                      Spiele: <span className="font-bold text-slate-300 not-italic">{goal.actions?.play ? 'Ja' : 'Nein'}</span>,
                                      Zusatz: <span className="font-bold text-slate-300 not-italic">{goal.actions?.extra ? 'Ja' : 'Nein'}</span>
                                    </div>
                                    {goal.evaluationDate && (
                                      <div className="text-[9px] text-slate-500 font-mono not-italic">
                                        Bewertet am: {goal.evaluationDate.split('-').reverse().join('.')}
                                      </div>
                                    )}
                                  </>
                                ) : !evalStatus.isEvaluable ? (
                                  <div className="text-amber-400/90 not-italic text-[10px] font-mono flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                    <span>Gesperrt: 3-wöchige Trainingsphase läuft noch bis zum {evalStatus.unlockDateStr} (in {evalStatus.daysRemaining} Tagen).</span>
                                  </div>
                                ) : (
                                  <div className="text-emerald-400/90 not-italic text-[10px] font-mono">
                                    Freigeschaltet: Der Keeper kann dieses Ziel ab sofort selbst bewerten.
                                  </div>
                                )}
                              </div>

                              {/* Trainer Extension Button (+3 Weeks) */}
                              <div className="pt-2 border-t border-slate-900 flex items-center justify-between flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleExtendGoal(goal)}
                                  disabled={extendingGoalId === goal.id}
                                  className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 hover:border-amber-500 font-bold rounded-lg text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                                  title="Ziel um 3 Wochen verlängern, sodass der Nutzer dieses Ziel in 3 Wochen erneut selbst bewerten kann"
                                >
                                  <CalendarPlus className="w-3.5 h-3.5" />
                                  <span>{extendingGoalId === goal.id ? 'Wird verlängert...' : 'Ziel verlängern (+3 Wochen)'}</span>
                                </button>

                                <span className="text-[10px] text-slate-500 font-mono">
                                  {evalStatus.isEvaluable 
                                    ? 'Selbstbewertung aktuell offen' 
                                    : `Bewertung möglich ab: ${evalStatus.unlockDateStr}`}
                                </span>
                              </div>

                              {goalFeedbackMsg?.id === goal.id && (
                                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-mono flex items-center gap-2">
                                  <Check className="w-4 h-4 shrink-0" />
                                  <span>{goalFeedbackMsg.text}</span>
                                </div>
                              )}

                              {/* Trainer Feedback/Einschätzung form */}
                              <div className="space-y-1.5 pt-2 border-t border-slate-900">
                                <label className="block text-[8px] text-slate-500 font-mono uppercase">Trainer-Einschätzung formulieren</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={goalAssessments[goal.id] ?? goal.assessment ?? ''}
                                    onChange={(e) => {
                                      const txt = e.target.value;
                                      setGoalAssessments(prev => ({ ...prev, [goal.id]: txt }));
                                    }}
                                    placeholder="Deine Beurteilung zum Lernfortschritt..."
                                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white flex-1"
                                  />
                                  <button
                                    onClick={() => handleSaveGoalAssessment(goal.id)}
                                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg cursor-pointer"
                                  >
                                    Sichern
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Safe State-Based Deletion Confirmation Modal */}
      {exerciseToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-brand-panel border border-brand-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-left">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider font-display">Übung löschen?</h3>
            <p className="text-sm text-zinc-300">
              Möchtest du die Übung <strong className="text-amber-500">"{exerciseToDelete.name}"</strong> wirklich aus der Datenbank löschen? Dies kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setExerciseToDelete(null)}
                className="px-4 py-2 bg-brand-border hover:bg-brand-border-light text-zinc-300 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDeleteExercise(exerciseToDelete.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe State-Based Goal Deletion Confirmation Modal */}
      {goalToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-brand-panel border border-brand-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-left">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider font-display">Ziel löschen?</h3>
            <p className="text-sm text-zinc-300">
              Möchtest du das individuelle Ziel <strong className="text-amber-500">"{goalToDelete.description}"</strong> wirklich aus der Datenbank löschen? Dies kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setGoalToDelete(null)}
                className="px-4 py-2 bg-brand-border hover:bg-brand-border-light text-zinc-300 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDeleteGoal(goalToDelete.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe State-Based Level To-Do Deletion Confirmation Modal */}
      {todoToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-brand-panel border border-brand-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-left">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider font-display">Level-To-Do löschen?</h3>
            <p className="text-sm text-zinc-300">
              Möchtest du das To-Do <strong className="text-amber-500">"{todoToDelete.text}"</strong> aus <strong className="text-white">Level {todoToDelete.level}</strong> wirklich löschen?
            </p>
            <p className="text-xs text-slate-400">
              Dieses To-Do wird aus der allgemeinen Vorlage gelöscht und bei allen Keepern automatisch aus der To-Do-Liste entfernt.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setTodoToDelete(null)}
                className="px-4 py-2 bg-brand-border hover:bg-brand-border-light text-zinc-300 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirmDeleteLevelTodo}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Endgültig löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe State-Based Video Scene Deletion Confirmation Modal */}
      {sceneToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-brand-panel border border-brand-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-left">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider font-display">Szene löschen?</h3>
            <p className="text-sm text-zinc-300">
              Möchtest du diese Video-Szene wirklich aus der Datenbank löschen? Dies kann nicht rückgängig gemacht werden.
            </p>
            {sceneToDelete.videoLink && (
              <p className="text-xs text-slate-400 font-mono truncate bg-slate-950 p-2.5 rounded border border-slate-850">
                {sceneToDelete.videoLink}
              </p>
            )}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSceneToDelete(null)}
                className="px-4 py-2 bg-brand-border hover:bg-brand-border-light text-zinc-300 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDeleteScene(sceneToDelete.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe State-Based Competition Deletion Confirmation Modal */}
      {compToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-brand-panel border border-brand-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-left">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider font-display">Wettkampf löschen?</h3>
            <p className="text-sm text-zinc-300">
              Möchtest du diesen Wettkampfeintrag wirklich aus der Datenbank löschen? Dies kann nicht rückgängig gemacht werden.
            </p>
            <div className="text-xs text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-850 space-y-1">
              <p className="font-mono text-[9px] uppercase text-slate-500">Typ: {compToDelete.type === 'training' ? 'Trainingswettkampf' : compToDelete.type === 'challenge' ? 'Challenge' : compToDelete.type === 'seilspringen' ? 'Seilspringen' : 'Quiz'}</p>
              {compToDelete.type === 'training' && (
                <>
                  <p>Sieger: <strong className="text-emerald-400">{compToDelete.winner}</strong></p>
                  {compToDelete.second && <p>Zweiter: <strong className="text-amber-500">{compToDelete.second}</strong></p>}
                </>
              )}
              {compToDelete.type === 'challenge' && (
                <>
                  <p>Level: <strong className="text-white">{compToDelete.period}</strong></p>
                  <p>Erstellt von: <strong className="text-white">{compToDelete.creator}</strong></p>
                </>
              )}
              {compToDelete.type === 'seilspringen' && (
                <>
                  <p>Level: <strong className="text-white">{compToDelete.period}</strong></p>
                  <p>Erstellt von: <strong className="text-white">{compToDelete.creator}</strong></p>
                </>
              )}
              {compToDelete.type === 'quiz' && (
                <>
                  <p>Frage: <strong className="text-white">{compToDelete.question}</strong></p>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCompToDelete(null)}
                className="px-4 py-2 bg-brand-border hover:bg-brand-border-light text-zinc-300 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDeleteComp(compToDelete.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe State-Based Workout Log Deletion Confirmation Modal */}
      {workoutLogToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-brand-panel border border-brand-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-left">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider font-display flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              <span>Trainingseinheit löschen?</span>
            </h3>
            <p className="text-sm text-zinc-300">
              Möchtest du die Trainingseinheit <strong className="text-amber-500">"{workoutLogToDelete.workoutName}"</strong> ({workoutLogToDelete.date.split('-').reverse().join('.')}) von <strong className="text-white">{users.find(u => u.uid === workoutLogToDelete.userId)?.name || 'dem Nutzer'}</strong> wirklich löschen?
            </p>
            <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-xs text-red-300 font-mono space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>Punkteabzug:</span>
              </p>
              <p className="text-[11px] text-red-200/80">
                Durch das Löschen wird dem Nutzer 1 Punkt in der Bestenliste (Kategorie Kraftsport) abgezogen.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setWorkoutLogToDelete(null)}
                className="px-4 py-2 bg-brand-border hover:bg-brand-border-light text-zinc-300 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAdminWorkoutLog(workoutLogToDelete)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Löschen & Punkt abziehen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Großflächiges Modal zur Rechteverwaltung */}
      {showPermissionModal && selectedUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-3xl">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-500" />
                  <span>Modulfreigabe verwalten</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Berechtigungen für {selectedUser.name} (@{selectedUser.username})
                </p>
              </div>
              <button
                onClick={() => setShowPermissionModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs bg-slate-950 hover:bg-slate-800 border border-slate-850 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                [ Schließen ]
              </button>
            </div>

            {/* Levels Content List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-left">
              {LEVELS_STRUCTURE.map((lvl) => {
                // Check if all submodules for this level are active
                const isAllChecked = lvl.modules.length > 0 && lvl.modules.every(m => tempPermissions[m.id]);

                const handleToggleAll = (checked: boolean) => {
                  const updated = { ...tempPermissions };
                  lvl.modules.forEach(m => {
                    updated[m.id] = checked;
                  });
                  setTempPermissions(updated);
                };

                return (
                  <div key={lvl.level} className="bg-slate-950 border border-slate-850/60 p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                          Level {lvl.level}
                        </span>
                        <span className="text-sm font-bold text-slate-200">{lvl.title}</span>
                      </div>
                      {lvl.modules.length > 0 ? (
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isAllChecked}
                            onChange={(e) => handleToggleAll(e.target.checked)}
                            className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-800 focus:ring-amber-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-300">Gesamt freischalten</span>
                        </label>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500 uppercase">Keine Module</span>
                      )}
                    </div>

                    {lvl.modules.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {lvl.modules.map((m) => (
                          <label
                            key={m.id}
                            className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                              tempPermissions[m.id]
                                ? 'bg-amber-500/10 border-amber-500/30 text-white'
                                : 'bg-slate-900/50 border-slate-800/60 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={!!tempPermissions[m.id]}
                              onChange={(e) => {
                                setTempPermissions(prev => ({
                                  ...prev,
                                  [m.id]: e.target.checked
                                }));
                              }}
                              className="w-4 h-4 mt-0.5 rounded text-amber-500 bg-slate-900 border-slate-800 focus:ring-amber-500 cursor-pointer"
                            />
                            <span className="text-xs font-semibold leading-snug">{m.label}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 font-mono italic">Aktuell noch leer anzulegen für zukünftige Inhalte.</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-950 rounded-b-3xl flex justify-between items-center">
              <button
                onClick={() => setShowPermissionModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={async () => {
                  try {
                    const userRef = doc(db, 'users', selectedUser.uid);
                    await updateDoc(userRef, { modulePermissions: tempPermissions });

                    // Auto-release/unlock level-based To-Dos
                    await syncUserLevelTodos(selectedUser.uid, tempPermissions);

                    // update local state
                    setUsers(prev => prev.map(u => u.uid === selectedUser.uid ? { ...u, modulePermissions: tempPermissions } : u));
                    setSelectedUser(prev => prev ? { ...prev, modulePermissions: tempPermissions } : null);

                    if (typeof loadAllData === 'function') {
                      await loadAllData();
                    }

                    alert('Berechtigungen erfolgreich gespeichert!');
                    setShowPermissionModal(false);
                  } catch (err: any) {
                    alert('Fehler beim Speichern: ' + err.message);
                  }
                }}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Änderungen speichern</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
