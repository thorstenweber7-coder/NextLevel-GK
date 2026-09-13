import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, increment, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Workout, Exercise, WorkoutLog, WorkoutLogExercise, WorkoutLogSet } from '../types';
import { Play, Calendar, ClipboardList, Dumbbell, Clock, Plus, Trash2, Check, Star, ArrowLeft, Video, Save, ChevronDown, ChevronUp, Timer, Sparkles, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';


// Custom Inline SVG Icons representing strength training movements
const LatPulldownIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 4h18M12 2v2" strokeLinecap="round" />
    <path d="M6 4l2 6M18 4l-2 6" strokeDasharray="1.5" />
    <path d="M7 10h10" strokeWidth="2.5" stroke="currentColor" strokeLinecap="round" />
    <circle cx="12" cy="11.5" r="1.5" fill="currentColor" />
    <path d="M8 10l2 1.5M16 10l-2 1.5" strokeLinecap="round" />
    <path d="M12 13v3M10 16h4" strokeLinecap="round" strokeWidth="2" />
    <path d="M10 16l-2 2.5M14 16l2 2.5" strokeLinecap="round" />
    <path d="M6 19.5h12" strokeLinecap="round" />
  </svg>
);

const SquatsIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 8h18M3 6v4M21 6v4" strokeLinecap="round" strokeWidth="2" />
    <rect x="4" y="6" width="1.5" height="4" rx="0.5" fill="currentColor" />
    <rect x="18.5" y="6" width="1.5" height="4" rx="0.5" fill="currentColor" />
    <circle cx="12" cy="10" r="1.5" fill="currentColor" />
    <path d="M12 11.5l-1.5 3" strokeLinecap="round" strokeWidth="2" />
    <path d="M9 8l1.5 2.5M15 8l-1.5 2.5" strokeLinecap="round" />
    <path d="M10.5 14.5h3.5" strokeLinecap="round" strokeWidth="2" />
    <path d="M14 14.5v4.5" strokeLinecap="round" strokeWidth="2" />
    <path d="M13 19h2M8 20h8" strokeLinecap="round" />
  </svg>
);

const BenchPressIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 6h18M3 4v4M21 4v4" strokeLinecap="round" strokeWidth="2" />
    <rect x="4" y="4" width="1.5" height="4" rx="0.5" fill="currentColor" />
    <rect x="18.5" y="4" width="1.5" height="4" rx="0.5" fill="currentColor" />
    <path d="M4 14h16M6 14v6M18 14v6" strokeLinecap="round" strokeWidth="2" />
    <circle cx="8" cy="12.5" r="1.5" fill="currentColor" />
    <path d="M9.5 13h6" strokeLinecap="round" strokeWidth="2" />
    <path d="M12 13V7" strokeLinecap="round" strokeWidth="2" />
    <path d="M15.5 13l1.5 2v3.5" strokeLinecap="round" strokeWidth="1.5" />
  </svg>
);

const DeadliftIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 17h18" strokeLinecap="round" strokeWidth="2" />
    <rect x="4" y="15" width="2" height="4" rx="0.5" fill="currentColor" />
    <rect x="18" y="15" width="2" height="4" rx="0.5" fill="currentColor" />
    <circle cx="10" cy="9" r="1.5" fill="currentColor" />
    <path d="M10 10.5l4 2.5" strokeLinecap="round" strokeWidth="2" />
    <path d="M13.5 12l-1.5 5" strokeLinecap="round" strokeWidth="2" />
    <path d="M14 13l-1.5 4" strokeLinecap="round" strokeWidth="2" />
    <path d="M12.5 17v2.5" strokeLinecap="round" strokeWidth="2" />
    <path d="M6 20h12" strokeLinecap="round" />
  </svg>
);

const PullupsIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 5h18M4 5v15M20 5v15" strokeLinecap="round" />
    <circle cx="12" cy="6" r="1.5" fill="currentColor" />
    <path d="M12 7.5v5" strokeLinecap="round" strokeWidth="2" />
    <path d="M12 7.5L10 5M12 7.5L14 5" strokeLinecap="round" strokeWidth="2" />
    <path d="M12 12.5l-1 3.5M12 12.5l1 3.5" strokeLinecap="round" />
  </svg>
);

const BicepCurlsIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="10" cy="7" r="1.5" fill="currentColor" />
    <path d="M10 8.5v6" strokeLinecap="round" strokeWidth="2" />
    <path d="M10 9.5l2 2" strokeLinecap="round" strokeWidth="2" />
    <path d="M12 11.5l-1.5-2.5" strokeLinecap="round" strokeWidth="2" />
    <path d="M9 8h3" strokeLinecap="round" strokeWidth="3" />
    <circle cx="8.5" cy="8" r="1" fill="currentColor" />
    <circle cx="12.5" cy="8" r="1" fill="currentColor" />
    <path d="M9 14.5v5M11 14.5v5" strokeLinecap="round" />
  </svg>
);

const RowsIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M5 17h11" strokeLinecap="round" />
    <path d="M17 14v4M18 15.5l-3 1" strokeLinecap="round" />
    <circle cx="8" cy="9" r="1.5" fill="currentColor" />
    <path d="M8 10.5l-1.5 4.5" strokeLinecap="round" strokeWidth="2" />
    <path d="M6.5 12l3.5 1.5" strokeLinecap="round" strokeWidth="2" />
    <path d="M10 13.5l7.5 2" strokeDasharray="1.5" />
    <path d="M6.5 15l4-1.5 5.5 3.5" strokeLinecap="round" strokeWidth="1.5" />
  </svg>
);

const LateralRaisesIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="6.5" r="1.5" fill="currentColor" />
    <path d="M12 8v6" strokeLinecap="round" strokeWidth="2" />
    <path d="M6 9.5h12" strokeLinecap="round" strokeWidth="2" />
    <path d="M5.5 8v3" strokeLinecap="round" strokeWidth="3" />
    <circle cx="5.5" cy="7.5" r="1" fill="currentColor" />
    <circle cx="5.5" cy="11.5" r="1" fill="currentColor" />
    <path d="M18.5 8v3" strokeLinecap="round" strokeWidth="3" />
    <circle cx="18.5" cy="7.5" r="1" fill="currentColor" />
    <circle cx="18.5" cy="11.5" r="1" fill="currentColor" />
    <path d="M11 14v5.5M13 14v5.5" strokeLinecap="round" />
  </svg>
);

const OverheadPressIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 4h18" strokeLinecap="round" strokeWidth="2" />
    <rect x="4" y="2" width="1.5" height="4" rx="0.5" fill="currentColor" />
    <rect x="18.5" y="2" width="1.5" height="4" rx="0.5" fill="currentColor" />
    <circle cx="12" cy="9.5" r="1.5" fill="currentColor" />
    <path d="M10 4.5l1.5 3.5M14 4.5l-1.5 3.5" strokeLinecap="round" strokeWidth="2" />
    <path d="M12 11v5" strokeLinecap="round" strokeWidth="2" />
    <path d="M10.5 16v4.5M13.5 16v4.5" strokeLinecap="round" />
  </svg>
);

const PushupsIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 19h18" strokeLinecap="round" />
    <circle cx="18.5" cy="11" r="1.5" fill="currentColor" />
    <path d="M5.5 16l11.5-4" strokeLinecap="round" strokeWidth="2.5" />
    <path d="M15 13l-1.5 4.5M13.5 17.5H16" strokeLinecap="round" strokeWidth="1.5" />
    <path d="M5.5 16l-1 2" strokeLinecap="round" />
  </svg>
);

const PlankIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 19h18" strokeLinecap="round" />
    <circle cx="18.5" cy="14" r="1.5" fill="currentColor" />
    <path d="M6 16.5h11" strokeLinecap="round" strokeWidth="2.5" />
    <path d="M15.5 16.5v2.5" strokeLinecap="round" strokeWidth="2" />
    <path d="M6 16.5L5 19" strokeLinecap="round" />
  </svg>
);

const CalfRaisesIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 18h11M15 18l5-5" strokeLinecap="round" strokeWidth="2" />
    <path d="M8 18l1.5-8 2-1" strokeLinecap="round" strokeWidth="2" />
    <path d="M9.5 10c0.5-2 1.5-2 2 0" strokeLinecap="round" />
    <path d="M8 18l2 0.5" strokeLinecap="round" strokeWidth="2.5" />
  </svg>
);

const TricepIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3v5" strokeDasharray="1.5" />
    <circle cx="12" cy="3" r="1" fill="currentColor" />
    <circle cx="9.5" cy="9" r="1.5" fill="currentColor" />
    <path d="M9.5 10.5v6" strokeLinecap="round" strokeWidth="2" />
    <path d="M10 11.5l1 1.5" strokeLinecap="round" strokeWidth="2" />
    <path d="M11 13v3" strokeLinecap="round" strokeWidth="2" />
    <path d="M11 16H13" strokeLinecap="round" strokeWidth="3" />
    <path d="M8.5 16.5v4M10.5 16.5v4" strokeLinecap="round" />
  </svg>
);

const CrunchesIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 19h18" strokeLinecap="round" />
    <path d="M13 19l4-3 2.5 3" strokeLinecap="round" strokeWidth="2" />
    <path d="M10 19h3" strokeLinecap="round" strokeWidth="2.5" />
    <path d="M10 19L7.5 15.5" strokeLinecap="round" strokeWidth="2" />
    <circle cx="7" cy="13" r="1.5" fill="currentColor" />
    <path d="M6 14.5l1.5-1M8 14l-1-1.5" strokeLinecap="round" />
  </svg>
);

const LegPressIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M5 19L19 5" strokeLinecap="round" strokeWidth="1.5" />
    <path d="M14 10l3-3M12.5 11.5l3-3" strokeLinecap="round" strokeWidth="3" />
    <path d="M4 14l4 4h4" strokeLinecap="round" strokeWidth="2" />
    <circle cx="5" cy="12" r="1.5" fill="currentColor" />
    <path d="M8 18l3.5-3.5 3.5 1.5" strokeLinecap="round" strokeWidth="2" />
  </svg>
);

const DumbbellIcon = () => (
  <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6.5 6.5h11M6.5 17.5h11M3 10v4M21 10v4M6.5 6.5v11M17.5 6.5v11" strokeLinecap="round" />
    <path d="M10 12h4" strokeLinecap="round" />
    <rect x="2" y="8" width="3" height="8" rx="1" fill="currentColor" />
    <rect x="19" y="8" width="3" height="8" rx="1" fill="currentColor" />
  </svg>
);

// Map common exercise names to customized graphics
const getExerciseIcon = (exerciseName: string) => {
  const n = (exerciseName || '').toLowerCase();
  if (n.includes('latziehen') || n.includes('latzug') || n.includes('pulldown') || n.includes('lat ')) {
    return <LatPulldownIcon />;
  }
  if (n.includes('kniebeuge') || n.includes('squat') || n.includes('beuge')) {
    return <SquatsIcon />;
  }
  if (n.includes('bankdrücken') || n.includes('bench press') || n.includes('brustpresse') || n.includes('drücken')) {
    if (n.includes('schulter') || n.includes('shoulder') || n.includes('overhead') || n.includes('military')) {
      return <OverheadPressIcon />;
    }
    return <BenchPressIcon />;
  }
  if (n.includes('kreuzheben') || n.includes('deadlift')) {
    return <DeadliftIcon />;
  }
  if (n.includes('klimmzug') || n.includes('pullup') || n.includes('pull-up') || n.includes('chin-up') || n.includes('chinup')) {
    return <PullupsIcon />;
  }
  if (n.includes('curls') || n.includes('curl') || n.includes('bizeps') || n.includes('bicep')) {
    return <BicepCurlsIcon />;
  }
  if (n.includes('rudern') || n.includes('row') || n.includes('cable row')) {
    return <RowsIcon />;
  }
  if (n.includes('seitheben') || n.includes('lateral raise')) {
    return <LateralRaisesIcon />;
  }
  if (n.includes('schulterdrücken') || n.includes('military press') || n.includes('overhead press') || n.includes('frontdrücken')) {
    return <OverheadPressIcon />;
  }
  if (n.includes('liegestütz') || n.includes('pushup') || n.includes('push-up')) {
    return <PushupsIcon />;
  }
  if (n.includes('plank') || n.includes('unterarmstütz')) {
    return <PlankIcon />;
  }
  if (n.includes('waden') || n.includes('calf')) {
    return <CalfRaisesIcon />;
  }
  if (n.includes('trizeps') || n.includes('tricep') || n.includes('pushdown')) {
    return <TricepIcon />;
  }
  if (n.includes('crunch') || n.includes('bauch') || n.includes('situp') || n.includes('sit-up')) {
    return <CrunchesIcon />;
  }
  if (n.includes('beinpresse') || n.includes('leg press')) {
    return <LegPressIcon />;
  }
  return <DumbbellIcon />;
};

interface WorkoutsProps {
  userProfile: UserProfile;
  onUpdatePoints: (newPoints: number, newPointsByCategory: any) => void;
  onWorkoutActiveChange?: (active: boolean) => void;
}

export default function Workouts({ userProfile, onUpdatePoints, onWorkoutActiveChange }: WorkoutsProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exerciseDb, setExerciseDb] = useState<Exercise[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [personalBestRecords, setPersonalBestRecords] = useState<{ [exerciseId: string]: number }>({});
  const [logToDelete, setLogToDelete] = useState<WorkoutLog | null>(null);
  
  // Custom configurations
  const [trainerNote, setTrainerNote] = useState('Trainiere hart und bleib fokussiert!');
  
  // Calendar Navigation States
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  
  // States
  const [view, setView] = useState<'lobby' | 'active_session' | 'summary'>('lobby');
  const [showHistory, setShowHistory] = useState(false);
  
  // Date range for history log
  const [historyStart, setHistoryStart] = useState('');
  const [historyEnd, setHistoryEnd] = useState('');

  // Active workout states
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [durationTrackerActive, setDurationTrackerActive] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0); // in seconds
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number>(0);
  
  // Active session exercises state
  // tracks sets and inputs for each exercise in the active workout
  const [sessionData, setSessionData] = useState<{
    [exerciseId: string]: {
      notes: string;
      savedNotes: string;
      sets: {
        type: 'warmup' | 'regular';
        weight: number;
        reps: number;
        repsRight?: number; // for unilateral
        completed: boolean;
        completedLeft?: boolean; // for unilateral
        completedRight?: boolean; // for unilateral
        timerRunning: boolean;
        timerValue: number;
      }[];
      expanded: boolean;
    };
  }>({});

  const [completedExercises, setCompletedExercises] = useState<string[]>([]);

  // Active video popup
  const [videoPopupUrl, setVideoPopupUrl] = useState<string | null>(null);
  const [trackingVideoUrl, setTrackingVideoUrl] = useState<string>('');

  // Custom Workout Interruption Confirmation Modal state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  // Summary page values
  const [savedVolume, setSavedVolume] = useState(0);
  const [finishWorkoutError, setFinishWorkoutError] = useState<string | null>(null);

  // Sync active workout state with parent app
  useEffect(() => {
    if (onWorkoutActiveChange) {
      onWorkoutActiveChange(view === 'active_session');
    }
    return () => {
      if (onWorkoutActiveChange) {
        onWorkoutActiveChange(false);
      }
    };
  }, [view, onWorkoutActiveChange]);

  // Prevent mobile zoom during active workout session
  useEffect(() => {
    if (view === 'active_session') {
      const meta = document.querySelector('meta[name="viewport"]');
      const originalContent = meta ? meta.getAttribute('content') : null;
      if (meta) {
        meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }

      const preventZoom = (e: TouchEvent) => {
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      };

      let lastTouchEnd = 0;
      const preventDoubleTapZoom = (e: TouchEvent) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      };

      document.addEventListener('touchstart', preventZoom, { passive: false });
      document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });

      return () => {
        if (meta) {
          if (originalContent) {
            meta.setAttribute('content', originalContent);
          } else {
            meta.setAttribute('content', 'width=device-width, initial-scale=1.0');
          }
        }
        document.removeEventListener('touchstart', preventZoom);
        document.removeEventListener('touchend', preventDoubleTapZoom);
      };
    }
  }, [view]);

  // Load basic data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load active workout plans assigned to this user
        const workoutsSnap = await getDocs(collection(db, 'workouts'));
        const workoutsList: Workout[] = [];
        workoutsSnap.forEach((doc) => {
          const w = { id: doc.id, ...doc.data() } as Workout;
          if (w.assignedUsers?.includes(userProfile.uid)) {
            workoutsList.push(w);
          }
        });
        setWorkouts(workoutsList);

        // Load Exercise database
        const exercisesSnap = await getDocs(collection(db, 'exercises'));
        const exercisesList: Exercise[] = [];
        exercisesSnap.forEach((doc) => {
          exercisesList.push({ id: doc.id, ...doc.data() } as Exercise);
        });
        const filteredExercises = exercisesList.filter(ex => {
          const isAdminEx = ex.isAdminCreated !== false;
          const isOwnEx = ex.createdBy === userProfile.uid;
          return isAdminEx || isOwnEx;
        });
        setExerciseDb(filteredExercises);

        // Load trainer note
        const noteSnap = await getDoc(doc(db, 'config', 'trainerNote'));
        if (noteSnap.exists()) {
          setTrainerNote(noteSnap.data().text || 'Trainiere hart und bleib fokussiert!');
        }

        // Load kraftsport tracking video link
        const contentsSnap = await getDoc(doc(db, 'config', 'contents'));
        if (contentsSnap.exists()) {
          const cData = contentsSnap.data() || {};
          const kraftVal = cData.kraftsport_tracking || cData.kraftsport;
          if (Array.isArray(kraftVal) && kraftVal.length > 0) {
            setTrackingVideoUrl(kraftVal[0]?.url || '');
          } else if (typeof kraftVal === 'string') {
            setTrackingVideoUrl(kraftVal);
          }
        }

        // Load logs for this user (only own Kraftsport logs)
        const logsQuery = query(collection(db, 'workout_logs'), where('userId', '==', userProfile.uid));
        const logsSnap = await getDocs(logsQuery);
        const logsList: WorkoutLog[] = [];
        logsSnap.forEach((doc) => {
          const log = { id: doc.id, ...doc.data() } as WorkoutLog;
          if (log.userId === userProfile.uid) {
            logsList.push(log);
          }
        });
        // Sort logs newest first
        setWorkoutLogs(logsList.sort((a, b) => b.date.localeCompare(a.date)));

        // Load personal bests
        const pbSnap = await getDocs(collection(db, `users/${userProfile.uid}/personal_bests`));
        const pbMap: { [exerciseId: string]: number } = {};
        pbSnap.forEach((doc) => {
          pbMap[doc.id] = doc.data().value || 0;
        });
        setPersonalBestRecords(pbMap);

      } catch (err) {
        console.error('Error loading workouts page data:', err);
      }
    };

    loadData();
  }, [userProfile.uid]);

  // Duration Tracker Interval
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (durationTrackerActive) {
      timer = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [durationTrackerActive, startTime]);

  // Alert/Warning on Tab close/Navigation during active session
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (durationTrackerActive) {
        e.preventDefault();
        e.returnValue = 'Möchtest du das Training wirklich abbrechen? Deine Daten gehen verloren.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [durationTrackerActive]);

  // Format elapsed duration
  const formatDuration = (sec: number) => {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Rest Timer Interval for sets
  useEffect(() => {
    if (view !== 'active_session') return;
    const interval = setInterval(() => {
      setSessionData(prev => {
        let updated = false;
        const copy = { ...prev };
        Object.keys(copy).forEach(exerciseId => {
          const ex = copy[exerciseId];
          if (!ex || !ex.sets) return;
          
          let setsUpdated = false;
          const newSets = ex.sets.map(s => {
            let nextS = { ...s };
            let hasChanges = false;
            if (s.timerRunning) {
              nextS.timerValue = s.timerValue + 1;
              hasChanges = true;
            }
            if (s.timerRunningLeft) {
              nextS.timerValueLeft = (s.timerValueLeft || 0) + 1;
              hasChanges = true;
            }
            if (s.timerRunningRight) {
              nextS.timerValueRight = (s.timerValueRight || 0) + 1;
              hasChanges = true;
            }
            if (hasChanges) {
              setsUpdated = true;
              updated = true;
              return nextS;
            }
            return s;
          });
          
          if (setsUpdated) {
            copy[exerciseId] = {
              ...ex,
              sets: newSets
            };
          }
        });
        return updated ? copy : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [view]);

  // Launch Workout Session
  const handleStartWorkout = async (workout: Workout) => {
    setActiveWorkout(workout);
    setView('active_session');
    setStartTime(Date.now());
    setDuration(0);
    setDurationTrackerActive(true); // starts immediately when "Training starten" is clicked.
    setActiveExerciseIndex(0);
    setCompletedExercises([]);
    setFinishWorkoutError(null);

    // Prepare session data state for this workout
    const initialSession: typeof sessionData = {};
    
    for (const we of workout.exercises) {
      const exercise = exerciseDb.find(e => e.id === we.exerciseId);
      if (!exercise) continue;

      // Load user saved notes for this exercise if exists
      let savedNoteText = '';
      try {
        const noteSnap = await getDoc(doc(db, `users/${userProfile.uid}/exercise_notes`, we.exerciseId));
        if (noteSnap.exists()) {
          savedNoteText = noteSnap.data().note || '';
        }
      } catch (err) {
        console.error('Error fetching exercise note:', err);
      }

      // Search for the last time this user completed this exercise in their workout logs
      const lastLogForExercise = workoutLogs.find(log => 
        log.exercises?.some(ex => ex.exerciseId === we.exerciseId)
      );
      const matchingEx = lastLogForExercise 
        ? lastLogForExercise.exercises.find(ex => ex.exerciseId === we.exerciseId) 
        : null;

      const sets = we.sets.map((s, idx) => {
        let weight = s.type === 'warmup' ? 10 : 25; // default starting weight
        let reps = s.reps || s.targetReps || 8; // default starting reps
        
        if (matchingEx && matchingEx.sets) {
          // Find matching index set from previous workout, or matching type, or last set
          const prevSet = matchingEx.sets[idx] 
            || matchingEx.sets.find(ps => ps.type === s.type) 
            || matchingEx.sets[matchingEx.sets.length - 1];
          if (prevSet) {
            weight = prevSet.weight;
            if (typeof prevSet.reps === 'number') {
              reps = prevSet.reps;
            }
          }
        }

        return {
          type: s.type,
          weight,
          reps,
          repsRight: reps,
          completed: false,
          completedLeft: false,
          completedRight: false,
          timerRunning: false,
          timerValue: 0, // pause timer starts at 0 and tracks elapsed time
          timerRunningLeft: false,
          timerValueLeft: 0,
          timerRunningRight: false,
          timerValueRight: 0
        };
      });

      initialSession[we.exerciseId] = {
        notes: savedNoteText,
        savedNotes: savedNoteText,
        sets,
        expanded: false
      };
    }

    // Expand the first exercise by default
    if (workout.exercises.length > 0) {
      const firstId = workout.exercises[0].exerciseId;
      if (initialSession[firstId]) {
        initialSession[firstId].expanded = true;
      }
    }

    setSessionData(initialSession);
  };

  // Save exercise user notes
  const handleSaveNotes = async (exerciseId: string) => {
    const text = sessionData[exerciseId]?.notes || '';
    try {
      await setDoc(doc(db, `users/${userProfile.uid}/exercise_notes`, exerciseId), { note: text });
      setSessionData(prev => ({
        ...prev,
        [exerciseId]: {
          ...prev[exerciseId],
          savedNotes: text
        }
      }));
    } catch (err) {
      console.error('Error saving exercise notes:', err);
    }
  };

  // Complete a set
  const handleCompleteSet = (exerciseId: string, setIndex: number) => {
    // Start tracker on very first interaction/click
    if (!durationTrackerActive) {
      setDurationTrackerActive(true);
      setStartTime(Date.now());
    }

    setSessionData(prev => {
      const copy = { ...prev };

      // Turn off timers on ALL other exercises first
      Object.keys(copy).forEach(id => {
        if (id !== exerciseId && copy[id]) {
          copy[id] = {
            ...copy[id],
            sets: copy[id].sets.map(s => ({
              ...s,
              timerRunning: false,
              timerRunningLeft: false,
              timerRunningRight: false
            }))
          };
        }
      });

      if (!copy[exerciseId]) return prev;
      const ex = { ...copy[exerciseId] };

      // Reset any running timers on other sets of this exercise
      ex.sets = ex.sets.map((s, idx) => {
        if (idx === setIndex) {
          const nextCompleted = !s.completed;
          return {
            ...s,
            completed: nextCompleted,
            timerRunning: nextCompleted, // start timer if we just completed it
            timerValue: 0
          };
        } else {
          // turn off timers on other sets of this exercise
          return { ...s, timerRunning: false };
        }
      });

      copy[exerciseId] = ex;
      return copy;
    });
  };

  // Complete a unilateral set side (L or R)
  const handleCompleteUnilateralSetSide = (exerciseId: string, setIndex: number, side: 'L' | 'R') => {
    if (!durationTrackerActive) {
      setDurationTrackerActive(true);
      setStartTime(Date.now());
    }

    setSessionData(prev => {
      const copy = { ...prev };

      // Turn off timers on ALL other exercises first
      Object.keys(copy).forEach(id => {
        if (id !== exerciseId && copy[id]) {
          copy[id] = {
            ...copy[id],
            sets: copy[id].sets.map(s => ({
              ...s,
              timerRunning: false,
              timerRunningLeft: false,
              timerRunningRight: false
            }))
          };
        }
      });

      if (!copy[exerciseId]) return prev;
      const ex = { ...copy[exerciseId] };

      ex.sets = ex.sets.map((s, idx) => {
        if (idx === setIndex) {
          const nextL = side === 'L' ? !s.completedLeft : !!s.completedLeft;
          const nextR = side === 'R' ? !s.completedRight : !!s.completedRight;
          const nextCompleted = nextL && nextR;
          return {
            ...s,
            completedLeft: nextL,
            completedRight: nextR,
            completed: nextCompleted,
            // If the full set is completed, run the main set rest timer
            timerRunning: nextCompleted,
            timerValue: 0,
            // If L is completed but not R, run L's rest timer
            timerRunningLeft: nextL && !nextR,
            timerValueLeft: 0,
            // If R is completed but not L, run R's rest timer
            timerRunningRight: nextR && !nextL,
            timerValueRight: 0
          };
        } else {
          return { 
            ...s, 
            timerRunning: false,
            timerRunningLeft: false,
            timerRunningRight: false
          };
        }
      });

      copy[exerciseId] = ex;
      return copy;
    });
  };

  // Calculate 1-Rep Max (Brzycki-Formula)
  const calculate1RepMax = (weight: number, reps: number) => {
    if (reps <= 1) return weight;
    return Math.round(weight / (1.0278 - (0.0278 * reps)));
  };

  // Get active user's bodyweight
  const getUserBodyweight = () => {
    if (userProfile.weightHistory && userProfile.weightHistory.length > 0) {
      return userProfile.weightHistory[userProfile.weightHistory.length - 1].value;
    }
    return 80; // default fallback weight
  };

  // Get calculated display weight based on property config
  const getDisplayWeight = (exercise: Exercise, enteredWeight: number) => {
    const uWeight = getUserBodyweight();
    if (exercise.bodyweightMoved) {
      return enteredWeight + uWeight;
    } else if (exercise.bodyweightPartiallyMoved) {
      return Math.max(0, uWeight - enteredWeight);
    }
    return enteredWeight;
  };

  // Finish Workout
  const handleFinishWorkout = async () => {
    if (!activeWorkout) return;

    // Check if all sets in all exercises are completed
    let allSetsLogged = true;
    for (const we of activeWorkout.exercises) {
      const exercise = exerciseDb.find(e => e.id === we.exerciseId);
      if (!exercise) continue; // skip exercises not in database/not rendered

      const sData = sessionData[we.exerciseId];
      if (!sData || !sData.sets || sData.sets.length === 0) {
        continue; // If all sets were removed/deleted, that's fine! Skip checking this exercise.
      }
      const hasUncompleted = sData.sets.some((s: any) => !s.completed);
      if (hasUncompleted) {
        allSetsLogged = false;
        break;
      }
    }

    if (!allSetsLogged) {
      setFinishWorkoutError("Logge alle Sätze ein oder lösche diese!");
      alert("Logge alle Sätze ein oder lösche diese!");
      return;
    } else {
      setFinishWorkoutError(null);
    }

    setDurationTrackerActive(false);

    // Map logs, calculate total volume, detect personal bests
    const loggedExercises: WorkoutLogExercise[] = [];
    let totalVolume = 0;
    const newPersonalBests: { [exerciseId: string]: number } = { ...personalBestRecords };
    let hasNewPB = false;

    for (const we of activeWorkout.exercises) {
      const exercise = exerciseDb.find(e => e.id === we.exerciseId);
      if (!exercise) continue;

      const sData = sessionData[we.exerciseId];
      if (!sData || !sData.sets || sData.sets.length === 0) continue; // Skip exercise if it has no sets!

      // Map completed or remaining sets
      const loggedSets: WorkoutLogSet[] = [];

      sData.sets.forEach((set, sIdx) => {
        const finalWeight = getDisplayWeight(exercise, set.weight);
        const set1RM = calculate1RepMax(finalWeight, set.reps);

        // Track regular set volume
        if (set.type === 'regular') {
          totalVolume += finalWeight * set.reps;

          // Check if this is a personal best
          const currentBest = newPersonalBests[we.exerciseId] || 0;
          let isBest = false;
          if (set1RM > currentBest) {
            newPersonalBests[we.exerciseId] = set1RM;
            isBest = true;
            hasNewPB = true;
          }

          loggedSets.push({
            type: set.type,
            weight: set.weight, // original entered weight is stored
            reps: set.reps,
            isBest
          });
        } else {
          // Warmup set
          loggedSets.push({
            type: set.type,
            weight: set.weight,
            reps: set.reps
          });
        }
      });

      loggedExercises.push({
        exerciseId: we.exerciseId,
        name: exercise.name,
        sets: loggedSets
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Build final log object
    const finalLog: Omit<WorkoutLog, 'id'> = {
      userId: userProfile.uid,
      workoutId: activeWorkout.id,
      workoutName: activeWorkout.name,
      date: todayStr,
      duration: Math.max(1, Math.round(duration / 60)), // duration in minutes
      exercises: loggedExercises,
      totalVolume
    };

    try {
      // 1. Save Workout Log
      const logRef = await addDoc(collection(db, 'workout_logs'), finalLog);

      // 2. Save new personal bests back to user profile subcollection
      if (hasNewPB) {
        setPersonalBestRecords(newPersonalBests);
        for (const exId of Object.keys(newPersonalBests)) {
          if (newPersonalBests[exId] > (personalBestRecords[exId] || 0)) {
            await setDoc(doc(db, `users/${userProfile.uid}/personal_bests`, exId), { value: newPersonalBests[exId] });
          }
        }
      }

      // 3. Award 1 point in Bestenliste for Kraftsport
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        points: increment(1),
        [`pointsByCategory.Kraftsport`]: increment(1)
      });

      // 4. Log point transaction for period filtering
      await addDoc(collection(db, 'point_logs'), {
        userId: userProfile.uid,
        points: 1,
        category: 'Kraftsport',
        action: `Trainingsplan abgeschlossen: ${activeWorkout.name}`,
        date: todayStr
      });

      // Update state in app context
      const updatedPts = userProfile.points + 1;
      const updatedCats = {
        ...userProfile.pointsByCategory,
        Kraftsport: (userProfile.pointsByCategory?.Kraftsport || 0) + 1
      };
      onUpdatePoints(updatedPts, updatedCats);

      // 5. Append local history log
      const logWithId: WorkoutLog = { id: logRef.id, ...finalLog };
      setWorkoutLogs(prev => [logWithId, ...prev]);

      setSavedVolume(totalVolume);
      setView('summary');
    } catch (err) {
      console.error('Error saving workout:', err);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      await deleteDoc(doc(db, 'workout_logs', logId));
      setWorkoutLogs(prev => prev.filter(log => log.id !== logId));
      setLogToDelete(null);
    } catch (err) {
      console.error('Error deleting workout log:', err);
    }
  };

  // Generate 1-RM History chart data for an exercise
  const getChartDataForExercise = (exerciseId: string) => {
    // Filter and collect 1RM of this exercise chronologically
    const results: { date: string; max1RM: number }[] = [];
    
    // Sort logs oldest first for chronological chart
    const chronLogs = [...workoutLogs].reverse();

    chronLogs.forEach(log => {
      const we = log.exercises.find(e => e.exerciseId === exerciseId);
      if (!we) return;

      const exercise = exerciseDb.find(e => e.id === exerciseId);

      // Compute max 1RM achieved in this log for this exercise
      let max1RM = 0;
      we.sets.forEach(set => {
        if (set.type === 'regular') {
          const finalWeight = exercise ? getDisplayWeight(exercise, set.weight) : set.weight;
          const set1RM = calculate1RepMax(finalWeight, set.reps);
          if (set1RM > max1RM) {
            max1RM = set1RM;
          }
        }
      });

      if (max1RM > 0) {
        results.push({
          date: log.date.split('-').reverse().slice(0, 2).join('.'), // Format DD.MM
          max1RM
        });
      }
    });

    // Return last 20 mapped with unitIndex and labels
    return results.slice(-20).map((r, idx) => ({
      ...r,
      unitIndex: idx + 1,
      unitLabel: `Einheit ${idx + 1}`
    }));
  };

  // Render Workout History Log lists with expandable rows
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const toggleLogExpand = (logId: string) => {
    if (expandedLogId === logId) {
      setExpandedLogId(null);
    } else {
      setExpandedLogId(logId);
    }
  };

  const getFilteredLogs = () => {
    return workoutLogs.filter(log => {
      const isAfterStart = historyStart ? log.date >= historyStart : true;
      const isBeforeEnd = historyEnd ? log.date <= historyEnd : true;
      return isAfterStart && isBeforeEnd;
    });
  };

  // Exercise Navigation helpers
  const handleExerciseClick = (index: number) => {
    // Start duration tracker upon clicking the first exercise if not already tracking
    if (!durationTrackerActive) {
      setDurationTrackerActive(true);
      setStartTime(Date.now());
    }

    const targetId = activeWorkout?.exercises[index]?.exerciseId;

    setSessionData(prev => {
      const copy = { ...prev };
      // Collapse everything
      Object.keys(copy).forEach(id => {
        copy[id].expanded = false;
      });
      // Expand target
      if (targetId && copy[targetId]) {
        copy[targetId].expanded = true;
      }
      return copy;
    });

    setActiveExerciseIndex(index);

    // Scroll the expanded exercise to the top (just below the sticky header)
    if (targetId) {
      setTimeout(() => {
        const element = document.getElementById(`exercise-card-${targetId}`);
        if (element) {
          const yOffset = -80; // Account for sticky header (height 64px) + margin spacing
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const isExerciseCompletable = (exerciseId: string) => {
    const sData = sessionData[exerciseId];
    if (!sData) return true;
    // Exercised is completable if all sets are completed (or deleted? Here we assume completed means checked)
    // Actually we don't block them from finishing, but we want all sets marked.
    return sData.sets.every(s => s.completed);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 font-sans">
      {/* 1. LOBBY VIEW */}
      {view === 'lobby' && (
        <div className="space-y-8">
          {/* Header Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl"></div>
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-amber-500 mb-1">
              Athletik & Krafttraining
            </p>
            <h1 className="text-lg font-bold text-white mb-2">
              Wähle den Trainingsplan aus, den du heute starten möchtest!
            </h1>
          </div>

          {/* Horizontal Plans List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                Aktive Trainingspläne {workouts.length > 0 && `(Plan 1/${workouts.length})`}
              </h2>
            </div>

            {workouts.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-8 text-center text-slate-400">
                <p className="text-sm">Keine aktiven Trainingspläne für dich freigegeben.</p>
                <p className="text-xs text-slate-600 mt-1">Frage deinen Trainer in der Coaching Zone.</p>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto whitespace-nowrap scrollbar-none pb-4 select-none">
                {workouts.map((workout, idx) => (
                  <div
                    key={workout.id}
                    className="inline-block w-72 shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/40 transition-all shadow-lg"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] bg-amber-500/10 text-amber-500 font-mono font-bold px-2 py-1 rounded-md">
                        PLAN {idx + 1}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {workout.exercises?.length || 0} Übungen
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white truncate mb-4 whitespace-normal line-clamp-1">
                      {workout.name}
                    </h3>

                    <button
                      onClick={() => handleStartWorkout(workout)}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Training starten</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trainer-Notiz & Video Button */}
          <div className="p-4 bg-slate-900/60 border border-slate-800/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Trainer-Notiz
              </h4>
              <p className="text-xs text-slate-300 italic font-sans">
                "{trainerNote}"
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (trackingVideoUrl && trackingVideoUrl.trim() !== '') {
                  setVideoPopupUrl(trackingVideoUrl);
                } else {
                  alert('Noch kein Video hinterlegt. Der Trainer kann den Videolink in der Coaching Zone unter „Krafttraining-DB“ eintragen.');
                }
              }}
              className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Video className="w-4 h-4 text-amber-400" />
              <span>So geht das Tracken der Krafteinheit</span>
            </button>
          </div>

          {/* Trainingskalender & Logbuch Button */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Calendar Widget */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:col-span-2">
              <div className="flex items-center justify-between mb-3.5">
                <h4 className="text-xs font-bold text-white font-mono uppercase">
                  Trainingskalender
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarMonth(prev => {
                        if (prev === 0) {
                          setCalendarYear(y => y - 1);
                          return 11;
                        }
                        return prev - 1;
                      });
                    }}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Vorheriger Monat"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-400 font-semibold font-mono min-w-[120px] text-center">
                    {new Date(calendarYear, calendarMonth).toLocaleString('de-DE', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarMonth(prev => {
                        if (prev === 11) {
                          setCalendarYear(y => y + 1);
                          return 0;
                        }
                        return prev + 1;
                      });
                    }}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Nächster Monat"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grid 7 days */}
              <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs text-slate-500 mb-2 border-b border-slate-800 pb-1.5">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                  <div key={d} className="font-bold">{d}</div>
                ))}
              </div>

              {/* Month Days */}
              <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs">
                {(() => {
                  const year = calendarYear;
                  const month = calendarMonth;
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  
                  // offset (adjusting for Mo as first day of week)
                  const offset = firstDay === 0 ? 6 : firstDay - 1;
                  
                  const daysGrid = [];
                  for (let i = 0; i < offset; i++) {
                    daysGrid.push(<div key={`empty-${i}`} className="p-2"></div>);
                  }

                  // Dates on which user trained in this month (timezone-safe string parsing)
                  const trainedDays = new Set(
                    workoutLogs
                      .filter(log => {
                        if (!log.date) return false;
                        const parts = log.date.split('-');
                        if (parts.length !== 3) return false;
                        const logYear = parseInt(parts[0], 10);
                        const logMonth = parseInt(parts[1], 10) - 1;
                        return logYear === year && logMonth === month;
                      })
                      .map(log => {
                        const parts = log.date.split('-');
                        return parseInt(parts[2], 10);
                      })
                  );

                  const today = new Date();
                  const todayYear = today.getFullYear();
                  const todayMonth = today.getMonth();
                  const todayDay = today.getDate();

                  for (let d = 1; d <= daysInMonth; d++) {
                    const hasTrained = trainedDays.has(d);
                    const isToday = year === todayYear && month === todayMonth && d === todayDay;
                    daysGrid.push(
                      <div
                        key={`day-${d}`}
                        className={`p-2 rounded-lg font-semibold flex flex-col items-center justify-center relative min-h-[36px] transition-all ${
                          hasTrained
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black scale-105 border border-amber-400/30'
                            : 'text-slate-400 hover:bg-slate-800/40'
                        } ${isToday ? 'ring-1.5 ring-slate-400 ring-offset-1 ring-offset-slate-950' : ''}`}
                      >
                        <span>{d}</span>
                        {hasTrained && (
                          <span className="w-1 h-1 rounded-full bg-slate-950 mt-0.5" />
                        )}
                      </div>
                    );
                  }
                  return daysGrid;
                })()}
              </div>
            </div>

            {/* Sidebar with Logbuch trigger */}
            <div className="space-y-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full p-4 bg-slate-900 hover:bg-slate-850 active:bg-slate-800 border border-slate-800 rounded-2xl flex items-center justify-between text-left transition-all shadow cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-white">Logbuch</span>
                    <span className="block text-[10px] text-slate-400 font-mono">Vergangene Einheiten</span>
                  </div>
                </div>
                <span className="text-xs font-mono text-amber-500 font-bold uppercase tracking-wider bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/10">
                  {workoutLogs.length} logs
                </span>
              </button>
            </div>
          </div>

          {/* Expanded Logbook Section */}
          {showHistory && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                  Verlauf Krafttraining
                </h3>
                {/* Date filter logs */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={historyStart}
                    onChange={(e) => setHistoryStart(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-semibold text-white focus:outline-none"
                    placeholder="Start"
                  />
                  <span className="text-slate-500 text-xs">bis</span>
                  <input
                    type="date"
                    value={historyEnd}
                    onChange={(e) => setHistoryEnd(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-semibold text-white focus:outline-none"
                    placeholder="Ende"
                  />
                </div>
              </div>

              {getFilteredLogs().length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-mono">
                  Keine Trainingseinheiten im ausgewählten Zeitraum gefunden.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {getFilteredLogs().map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const hasPBStar = log.exercises.some(e => e.sets.some(s => s.isBest));

                    return (
                      <div key={log.id} className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950">
                        <button
                          onClick={() => toggleLogExpand(log.id)}
                          className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-slate-900 transition-colors"
                        >
                          <div className="min-w-0">
                            <span className="block text-xs font-mono text-slate-500">
                              {log.date.split('-').reverse().join('.')} • {log.duration} Min.
                            </span>
                            <span className="block text-sm font-bold text-white truncate mt-0.5">
                              {log.workoutName}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {hasPBStar && (
                              <span className="p-1 rounded-md bg-yellow-500/10 text-yellow-500" title="Neuer Bestwert!">
                                <Star className="w-4 h-4 fill-yellow-500" />
                              </span>
                            )}
                            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                              {log.totalVolume.toLocaleString()} kg Vol.
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </button>

                        {/* Collapsible log detail view */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-slate-900/60 bg-slate-950/60 text-slate-300 text-xs space-y-3">
                            {log.exercises.map((e, eIdx) => (
                              <div key={eIdx} className="border-b border-slate-900 pb-2 last:border-b-0 last:pb-0">
                                <span className="block font-bold text-slate-200 mb-1">{e.name}</span>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {e.sets.map((s, sIdx) => (
                                    <div key={sIdx} className="bg-slate-900/50 p-2 rounded-lg border border-slate-900 flex items-center justify-between">
                                      <div>
                                        <span className="block text-[9px] text-slate-500 font-mono uppercase">
                                          Satz {sIdx + 1} {s.type === 'warmup' && '(WU)'}
                                        </span>
                                        <span className="font-mono font-bold text-white">
                                          {s.weight} kg x {s.reps}
                                        </span>
                                      </div>
                                      {s.isBest && (
                                        <span className="text-[10px] bg-yellow-500/10 text-yellow-500 font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-yellow-500/20">
                                          <Star className="w-3 h-3 fill-yellow-500 shrink-0" />
                                          <span>1RM</span>
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}

                            {/* Delete Log Button */}
                            <div className="pt-3 border-t border-slate-900/40 flex justify-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLogToDelete(log);
                                }}
                                className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/30 border border-red-900/30 text-red-400 font-mono font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Eintrag löschen</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. ACTIVE WORKOUT SESSION VIEW */}
      {view === 'active_session' && activeWorkout && (
        <div className="space-y-6">
          {/* Persistent Header */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg sticky top-16 z-40">
            <div className="min-w-0 mr-4">
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-1 font-mono cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Abbrechen</span>
              </button>
              <h2 className="text-base font-extrabold text-white truncate">
                {activeWorkout.name}
              </h2>
            </div>

            {/* Live Timer duration tracker */}
            <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-right shrink-0 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-black font-mono text-white tracking-wider">
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          {/* Exercises Accordion Stack */}
          <div className="space-y-3">
            {activeWorkout.exercises.map((we, index) => {
              const exercise = exerciseDb.find(e => e.id === we.exerciseId);
              if (!exercise) return null;

              const isExpanded = sessionData[we.exerciseId]?.expanded || false;
              const completedCount = sessionData[we.exerciseId]?.sets.filter(s => s.completed).length || 0;
              const totalSetsCount = sessionData[we.exerciseId]?.sets.length || 0;

              return (
                <div
                  key={we.exerciseId}
                  id={`exercise-card-${we.exerciseId}`}
                  className={`border rounded-2xl overflow-hidden transition-all ${
                    isExpanded
                      ? 'bg-slate-900 border-amber-500/30 shadow-xl'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700/60'
                  }`}
                >
                  {/* Exercise Header Row */}
                  <button
                    onClick={() => handleExerciseClick(index)}
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-xs text-slate-400 font-mono shrink-0">
                        {index + 1}
                      </span>
                      {/* Adaptives Übungs-Symbol */}
                      <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-500 shrink-0">
                        {getExerciseIcon(exercise.name)}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-sm font-extrabold text-white truncate">
                          {exercise.name}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                          {exercise.muscleGroup} • {completedCount}/{totalSetsCount} Sätze
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {completedExercises.includes(we.exerciseId) && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono uppercase tracking-wider font-bold">
                          <Check className="w-3 h-3 font-bold" />
                          <span>Erledigt</span>
                        </span>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  {/* Expanded Exercise Content */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-800/60 bg-slate-950/30 space-y-6">
                      {/* Prominent exercise title display when opened */}
                      <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/40 flex items-center justify-between">
                        <h4 className="text-sm font-extrabold text-amber-500 font-mono uppercase tracking-wider flex items-center gap-1.5">
                          {getExerciseIcon(exercise.name)}
                          <span>{exercise.name}</span>
                        </h4>
                        <span className="text-[10px] bg-slate-800 text-slate-400 font-mono font-bold px-2 py-0.5 rounded uppercase">
                          {exercise.muscleGroup}
                        </span>
                      </div>

                      {/* Last Training Performance Stats (Oben) */}
                      {(() => {
                        const lastLogForEx = workoutLogs.find(log => 
                          log.exercises?.some(ex => ex.exerciseId === we.exerciseId)
                        );
                        const lastMatchingEx = lastLogForEx 
                          ? lastLogForEx.exercises.find(ex => ex.exerciseId === we.exerciseId) 
                          : null;

                        if (!lastMatchingEx) {
                          return (
                            <div className="p-3 bg-slate-900/40 border border-slate-800/60 rounded-xl text-center text-[11px] font-mono text-slate-500">
                              ℹ️ Kein vorheriges Training für diese Übung gefunden.
                            </div>
                          );
                        }

                        let lastMaxWeight = 0;
                        let lastMax1RM = 0;
                        lastMatchingEx.sets.forEach(s => {
                          const displayWeight = getDisplayWeight(exercise, s.weight);
                          if (displayWeight > lastMaxWeight) lastMaxWeight = displayWeight;
                          const oneRM = calculate1RepMax(displayWeight, s.reps);
                          if (oneRM > lastMax1RM) lastMax1RM = oneRM;
                        });

                        return (
                          <div className="bg-gradient-to-r from-amber-500/5 to-slate-900 border border-amber-500/10 p-3.5 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-amber-500 uppercase font-mono tracking-wider">
                                📊 Leistung im letzten Training ({lastLogForEx.date.split('-').reverse().join('.')})
                              </span>
                              <span className="text-[10px] font-bold text-white bg-amber-500/20 px-2 py-0.5 rounded font-mono">
                                Maximalkraft (1RM): {lastMax1RM} kg
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="block text-[9px] text-slate-500 font-mono uppercase">Absolvierte Sätze:</span>
                                <div className="flex flex-wrap gap-1.5 mt-1 font-sans">
                                  {lastMatchingEx.sets.map((ls, sIdx) => {
                                    const displayWeight = getDisplayWeight(exercise, ls.weight);
                                    return (
                                      <span key={sIdx} className="px-2 py-1 bg-slate-950 border border-slate-800 rounded font-mono font-bold text-white text-[11px]">
                                        S{sIdx+1}: {displayWeight}kg x {ls.reps} {ls.type === 'warmup' && '(Warmup)'}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="flex items-end justify-start sm:justify-end">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Max. Gewicht: <strong className="text-white">{lastMaxWeight} kg</strong>
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      {/* Grid 1: Notes & Instructions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Eigene Notizen (Left) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                              Eigene Notizen (z.B. Maschineneinstellungen)
                            </label>
                            {sessionData[we.exerciseId]?.notes !== sessionData[we.exerciseId]?.savedNotes && (
                              <button
                                onClick={() => handleSaveNotes(we.exerciseId)}
                                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Save className="w-3 h-3" />
                                <span>Speichern</span>
                              </button>
                            )}
                          </div>
                          <textarea
                            value={sessionData[we.exerciseId]?.notes || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSessionData(prev => ({
                                ...prev,
                                [we.exerciseId]: { ...prev[we.exerciseId], notes: val }
                              }));
                            }}
                            placeholder="Z.B. Sitzhöhe: 5, Griffweite: breit..."
                            className="w-full h-16 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-sans leading-relaxed"
                          />
                        </div>

                        {/* Trainerhinweise, Kadenz, Video (Right) */}
                        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-between space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="block text-[8px] text-slate-500 font-mono uppercase">Trainerhinweis</span>
                              <span className="font-semibold text-slate-200 text-xs">
                                {exercise.trainerNote || 'Keine Vorgabe.'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-slate-500 font-mono uppercase">Kadenz</span>
                              <span className="font-mono text-xs font-bold text-amber-500/90">
                                {exercise.cadence || 'Standard'}
                              </span>
                            </div>
                          </div>

                          {/* YouTube In-App player button if videoLink exists */}
                          {exercise.videoLink && (
                            <div className="flex justify-start mt-2">
                              <button
                                onClick={() => setVideoPopupUrl(exercise.videoLink || null)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow shadow-red-600/10"
                              >
                                <Video className="w-3 h-3" />
                                <span>Video</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Set Tracking Table */}
                      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                        <table className="w-full text-left border-collapse">
                           <thead>
                            <tr className="border-b border-slate-800 text-[9px] sm:text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                              <th className="py-2 pl-1 pr-0.5">Gewicht</th>
                              <th className="py-2 px-0.5 sm:px-2">Wdh.</th>
                              <th className="py-2 pr-0.5 text-right w-[82px] sm:w-[110px]">Aktion</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sessionData[we.exerciseId]?.sets.map((set, sIdx) => {
                              const isWarmup = set.type === 'warmup';
                              const setDef = we.sets[sIdx];
                              
                              // Check if there is an active rest timer that belongs ABOVE this set `sIdx` of exercise `we.exerciseId` (exercise index `index`)
                              let activeRestTimerValue: number | null = null;
                              
                              if (sIdx > 0) {
                                // Case A: Is the timer running for the previous set of this same exercise?
                                const prevSet = sessionData[we.exerciseId]?.sets[sIdx - 1];
                                if (prevSet && prevSet.timerRunning) {
                                  activeRestTimerValue = prevSet.timerValue;
                                }
                              } else if (sIdx === 0 && index > 0) {
                                // Case B: Is the timer running for the last set of the previous exercise?
                                const prevWe = activeWorkout.exercises[index - 1];
                                if (prevWe) {
                                  const prevExSets = sessionData[prevWe.exerciseId]?.sets;
                                  if (prevExSets && prevExSets.length > 0) {
                                    // Find if any set (especially the last completed one) has timerRunning === true
                                    const runningSet = prevExSets.find(s => s.timerRunning);
                                    if (runningSet) {
                                      activeRestTimerValue = runningSet.timerValue;
                                    }
                                  }
                                }
                              }

                              return (
                                <React.Fragment key={sIdx}>
                                  {activeRestTimerValue !== null && (
                                    <tr className="bg-amber-500/5 border-b border-slate-800/30">
                                      <td colSpan={3} className="py-2.5 px-3 text-center align-middle">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 font-mono text-xs font-black animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.05)]">
                                          <Timer className="w-3.5 h-3.5 shrink-0" />
                                          <span>Satzpause läuft: {formatDuration(activeRestTimerValue)}</span>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  <tr
                                    key={sIdx}
                                    className={`border-b border-slate-800/50 last:border-0 transition-colors ${
                                      set.completed 
                                        ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500' 
                                        : isWarmup 
                                          ? 'bg-slate-800/35 border-l-4 border-l-amber-500/20' 
                                          : ''
                                    }`}
                                  >
                                  {/* Col 2: Weight */}
                                  <td className="py-2 pl-1 pr-0.5 sm:px-2 align-middle">
                                    <div className="relative pb-3.5 sm:pb-4 flex flex-col justify-center">
                                      <div className="flex items-center gap-0.5 sm:gap-1">
                                        <span className="text-[9px] font-mono text-slate-500 font-bold mr-0.5 select-none">#{sIdx + 1}</span>
                                        <div className="relative flex items-center justify-center">
                                          <button
                                            onClick={() => {
                                              setSessionData(prev => {
                                                if (!prev[we.exerciseId]) return prev;
                                                const copy = { ...prev };
                                                const ex = { ...copy[we.exerciseId] };
                                                ex.sets = ex.sets.map((s, idx) => idx === sIdx ? { ...s, weight: Math.max(0, s.weight - 1) } : s);
                                                copy[we.exerciseId] = ex;
                                                return copy;
                                              });
                                            }}
                                            className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-950 hover:bg-slate-800 rounded text-slate-400 font-bold flex items-center justify-center border border-slate-800 cursor-pointer text-xs"
                                          >
                                            -
                                          </button>
                                          {isWarmup && (
                                            <span className="absolute top-full mt-0.5 text-[7px] text-amber-500 font-black leading-none uppercase tracking-wider whitespace-nowrap">
                                              WarmUp
                                            </span>
                                          )}
                                        </div>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={set.weight === 0 ? '' : set.weight}
                                          onChange={(e) => {
                                            let valStr = e.target.value;
                                            if (/^0[0-9]/.test(valStr)) {
                                              valStr = valStr.replace(/^0+/, '');
                                            }
                                            const val = parseFloat(valStr) || 0;
                                            setSessionData(prev => {
                                              if (!prev[we.exerciseId]) return prev;
                                              const copy = { ...prev };
                                              const ex = { ...copy[we.exerciseId] };
                                              ex.sets = ex.sets.map((s, idx) => idx === sIdx ? { ...s, weight: val } : s);
                                              copy[we.exerciseId] = ex;
                                              return copy;
                                            });
                                          }}
                                          className="w-10 h-7 sm:w-12 sm:h-8 bg-slate-950 border border-slate-800 rounded py-0 text-center font-mono font-bold text-white text-xs sm:text-sm focus:outline-none"
                                        />
                                        <button
                                          onClick={() => {
                                            setSessionData(prev => {
                                              if (!prev[we.exerciseId]) return prev;
                                              const copy = { ...prev };
                                              const ex = { ...copy[we.exerciseId] };
                                              ex.sets = ex.sets.map((s, idx) => idx === sIdx ? { ...s, weight: s.weight + 1 } : s);
                                              copy[we.exerciseId] = ex;
                                              return copy;
                                            });
                                          }}
                                          className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-950 hover:bg-slate-800 rounded text-slate-400 font-bold flex items-center justify-center border border-slate-800 cursor-pointer text-xs"
                                        >
                                          +
                                        </button>
                                      </div>
                                      <div className="absolute bottom-0 flex items-center gap-1 sm:gap-1.5 whitespace-nowrap left-[46px] sm:left-[54px]">
                                        <span className="text-[8px] sm:text-[9px] text-slate-500 font-semibold leading-none">
                                          Gesamt: {getDisplayWeight(exercise, set.weight)} kg
                                        </span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Col 3: Reps with Unilateral Stack support */}
                                  <td className="py-2 px-0.5 sm:px-2 align-middle">
                                    <div className="flex flex-col gap-1">
                                      {/* Reps input row */}
                                      <div className={exercise.unilateral ? "" : "relative pb-3.5 sm:pb-4"}>
                                        <div className="flex items-center gap-0.5 sm:gap-1">
                                          <div className="relative flex items-center justify-center">
                                            <button
                                              onClick={() => {
                                                if (isWarmup) return;
                                                setSessionData(prev => {
                                                  if (!prev[we.exerciseId]) return prev;
                                                  const copy = { ...prev };
                                                  const ex = { ...copy[we.exerciseId] };
                                                  ex.sets = ex.sets.map((s, idx) => idx === sIdx ? { ...s, reps: Math.max(1, s.reps - 1) } : s);
                                                  copy[we.exerciseId] = ex;
                                                  return copy;
                                                });
                                              }}
                                              disabled={isWarmup}
                                              className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-950 hover:bg-slate-800 disabled:hover:bg-slate-950 rounded text-slate-400 disabled:text-slate-600 font-bold flex items-center justify-center border border-slate-800 disabled:border-slate-900 cursor-pointer disabled:cursor-not-allowed text-xs"
                                            >
                                              -
                                            </button>
                                          </div>
                                          <input
                                            type="number"
                                            value={set.reps}
                                            disabled={isWarmup}
                                            readOnly={isWarmup}
                                            onChange={(e) => {
                                              if (isWarmup) return;
                                              const val = parseInt(e.target.value) || 0;
                                              setSessionData(prev => {
                                                if (!prev[we.exerciseId]) return prev;
                                                const copy = { ...prev };
                                                const ex = { ...copy[we.exerciseId] };
                                                ex.sets = ex.sets.map((s, idx) => idx === sIdx ? { ...s, reps: val } : s);
                                                copy[we.exerciseId] = ex;
                                                return copy;
                                              });
                                            }}
                                            className="w-9 h-7 sm:w-11 sm:h-8 bg-slate-950 disabled:bg-slate-950/40 border border-slate-800 disabled:border-slate-900 rounded py-0 text-center font-mono font-bold text-white disabled:text-slate-500 text-xs sm:text-sm focus:outline-none disabled:cursor-not-allowed"
                                          />
                                          <button
                                            onClick={() => {
                                              if (isWarmup) return;
                                              setSessionData(prev => {
                                                if (!prev[we.exerciseId]) return prev;
                                                const copy = { ...prev };
                                                const ex = { ...copy[we.exerciseId] };
                                                ex.sets = ex.sets.map((s, idx) => idx === sIdx ? { ...s, reps: s.reps + 1 } : s);
                                                copy[we.exerciseId] = ex;
                                                return copy;
                                              });
                                            }}
                                            disabled={isWarmup}
                                            className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-950 hover:bg-slate-800 disabled:hover:bg-slate-950 rounded text-slate-400 disabled:text-slate-600 font-bold flex items-center justify-center border border-slate-800 disabled:border-slate-900 cursor-pointer disabled:cursor-not-allowed text-xs"
                                          >
                                            +
                                          </button>
                                          {exercise.unilateral && <span className="text-[9px] text-slate-500 font-black shrink-0 ml-0.5 w-3 text-center">L</span>}
                                        </div>
                                      </div>

                                      {/* Unilateral Stack for Right (R) side */}
                                      {exercise.unilateral && (
                                        <div className="flex items-center gap-0.5 sm:gap-1">
                                          <div className="relative flex items-center justify-center">
                                            <button
                                              onClick={() => {
                                                if (isWarmup) return;
                                                setSessionData(prev => {
                                                  if (!prev[we.exerciseId]) return prev;
                                                  const copy = { ...prev };
                                                  const ex = { ...copy[we.exerciseId] };
                                                  ex.sets = ex.sets.map((s, idx) => idx === sIdx ? { ...s, repsRight: Math.max(1, (s.repsRight !== undefined ? s.repsRight : s.reps) - 1) } : s);
                                                  copy[we.exerciseId] = ex;
                                                  return copy;
                                                });
                                              }}
                                              disabled={isWarmup}
                                              className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-950 hover:bg-slate-800 disabled:hover:bg-slate-950 rounded text-slate-400 disabled:text-slate-600 font-bold flex items-center justify-center border border-slate-800 disabled:border-slate-900 cursor-pointer disabled:cursor-not-allowed text-xs"
                                            >
                                              -
                                            </button>
                                          </div>
                                          <input
                                            type="number"
                                            value={set.repsRight !== undefined ? set.repsRight : set.reps}
                                            disabled={isWarmup}
                                            readOnly={isWarmup}
                                            onChange={(e) => {
                                              if (isWarmup) return;
                                              const val = parseInt(e.target.value) || 0;
                                              setSessionData(prev => {
                                                if (!prev[we.exerciseId]) return prev;
                                                const copy = { ...prev };
                                                const ex = { ...copy[we.exerciseId] };
                                                ex.sets = ex.sets.map((s, idx) => idx === sIdx ? { ...s, repsRight: val } : s);
                                                copy[we.exerciseId] = ex;
                                                return copy;
                                              });
                                            }}
                                            className="w-9 h-7 sm:w-11 sm:h-8 bg-slate-950 disabled:bg-slate-950/40 border border-slate-800 disabled:border-slate-900 rounded py-0 text-center font-mono font-bold text-white disabled:text-slate-500 text-xs sm:text-sm focus:outline-none disabled:cursor-not-allowed"
                                          />
                                          <button
                                            onClick={() => {
                                              if (isWarmup) return;
                                              setSessionData(prev => {
                                                if (!prev[we.exerciseId]) return prev;
                                                const copy = { ...prev };
                                                const ex = { ...copy[we.exerciseId] };
                                                ex.sets = ex.sets.map((s, idx) => idx === sIdx ? { ...s, repsRight: (s.repsRight !== undefined ? s.repsRight : s.reps) + 1 } : s);
                                                copy[we.exerciseId] = ex;
                                                return copy;
                                              });
                                            }}
                                            disabled={isWarmup}
                                            className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-950 hover:bg-slate-800 disabled:hover:bg-slate-950 rounded text-slate-400 disabled:text-slate-600 font-bold flex items-center justify-center border border-slate-800 disabled:border-slate-900 cursor-pointer disabled:cursor-not-allowed text-xs"
                                          >
                                            +
                                          </button>
                                          <span className="text-[9px] text-slate-500 font-black shrink-0 ml-0.5 w-3 text-center">R</span>
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* Col 4: Action buttons */}
                                  <td className="py-2 pr-0.5 text-right align-middle">
                                    <div className="relative pb-3.5 sm:pb-4 flex items-center justify-end gap-1 sm:gap-2">
                                      {/* Complete Haken */}
                                      {exercise.unilateral ? (
                                        <>
                                          <div className="relative flex flex-col gap-1 shrink-0 justify-center">
                                            {/* R side is resting, show timer for R above L */}
                                            {set.timerRunningRight && (
                                              <span className="text-amber-500 font-mono text-[7px] sm:text-[8px] font-black animate-pulse select-none leading-none bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded whitespace-nowrap text-center mb-0.5">
                                                P-R: {formatDuration(set.timerValueRight || 0)}
                                              </span>
                                            )}
                                            {/* Left Check */}
                                            <button
                                              onClick={() => handleCompleteUnilateralSetSide(we.exerciseId, sIdx, 'L')}
                                              className={`w-11 h-7 sm:w-14 sm:h-8 rounded flex items-center justify-between px-1.5 border text-[10px] font-bold transition-all cursor-pointer ${
                                                set.completedLeft
                                                  ? 'bg-emerald-500 border-emerald-600 text-slate-950 font-black'
                                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                              }`}
                                              title="L links bestätigen"
                                            >
                                              <span>L</span>
                                              {set.completedLeft ? (
                                                <Check className="w-2.5 h-2.5 font-bold shrink-0 text-slate-950" />
                                              ) : (
                                                <span className="text-[7px] text-slate-600 font-bold shrink-0">○</span>
                                              )}
                                            </button>

                                            {/* L side is resting, show timer for L above R */}
                                            {set.timerRunningLeft && (
                                              <span className="text-amber-500 font-mono text-[7px] sm:text-[8px] font-black animate-pulse select-none leading-none bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded whitespace-nowrap text-center mt-0.5 mb-0.5">
                                                P-L: {formatDuration(set.timerValueLeft || 0)}
                                              </span>
                                            )}
                                            {/* Right Check */}
                                            <button
                                              onClick={() => handleCompleteUnilateralSetSide(we.exerciseId, sIdx, 'R')}
                                              className={`w-11 h-7 sm:w-14 sm:h-8 rounded flex items-center justify-between px-1.5 border text-[10px] font-bold transition-all cursor-pointer ${
                                                set.completedRight
                                                  ? 'bg-emerald-500 border-emerald-600 text-slate-950 font-black'
                                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                              }`}
                                              title="R rechts bestätigen"
                                            >
                                              <span>R</span>
                                              {set.completedRight ? (
                                                <Check className="w-2.5 h-2.5 font-bold shrink-0 text-slate-950" />
                                              ) : (
                                                <span className="text-[7px] text-slate-600 font-bold shrink-0">○</span>
                                              )}
                                            </button>
                                          </div>

                                          {/* Trash set */}
                                          <button
                                            onClick={() => {
                                              setSessionData(prev => {
                                                if (!prev[we.exerciseId]) return prev;
                                                const copy = { ...prev };
                                                const ex = { ...copy[we.exerciseId] };
                                                ex.sets = ex.sets.filter((_, idx) => idx !== sIdx);
                                                copy[we.exerciseId] = ex;
                                                return copy;
                                              });
                                            }}
                                            className="w-7 h-[60px] sm:w-8 sm:h-[68px] bg-slate-950 border border-slate-800 rounded text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-all cursor-pointer flex items-center justify-center"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <div className="relative flex items-center justify-center shrink-0">
                                            <button
                                              onClick={() => handleCompleteSet(we.exerciseId, sIdx)}
                                              className={`w-11 h-7 sm:w-14 sm:h-8 rounded border transition-all cursor-pointer flex items-center justify-center ${
                                                set.completed
                                                  ? 'bg-emerald-500 border-emerald-600 text-slate-950'
                                                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-white'
                                              }`}
                                            >
                                              <Check className="w-3.5 h-3.5" />
                                            </button>
                                          </div>

                                          <button
                                            onClick={() => {
                                              setSessionData(prev => {
                                                if (!prev[we.exerciseId]) return prev;
                                                const copy = { ...prev };
                                                const ex = { ...copy[we.exerciseId] };
                                                ex.sets = ex.sets.filter((_, idx) => idx !== sIdx);
                                                copy[we.exerciseId] = ex;
                                                return copy;
                                              });
                                            }}
                                            className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-950 border border-slate-800 rounded text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-all cursor-pointer flex items-center justify-center"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* 1-Rep Max Progress Line Chart */}
                      {getChartDataForExercise(we.exerciseId).length > 0 && (
                        <div className="pt-4 border-t border-slate-800/40">
                          <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                            <span>1-Rep Max Entwicklung</span>
                          </h4>
                          <div className="h-40 w-full bg-slate-950/40 p-1 border border-slate-800/40 rounded-xl">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={getChartDataForExercise(we.exerciseId)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="unitLabel" stroke="#64748b" fontSize={9} />
                                <YAxis stroke="#64748b" fontSize={9} domain={['auto', 'auto']} />
                                <Tooltip
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl font-mono text-[11px] space-y-1">
                                          <p className="text-slate-400 font-bold">{data.unitLabel} ({data.date})</p>
                                          <p className="text-amber-500 font-bold">1-Rep Max: {data.max1RM} kg</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Line type="monotone" dataKey="max1RM" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Accordion Action buttons */}
                      <div className="pt-4 border-t border-slate-800/60 flex flex-wrap gap-2.5 justify-between items-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSessionData(prev => {
                              if (!prev[we.exerciseId]) return prev;
                              const copy = { ...prev };
                              const ex = { ...copy[we.exerciseId] };
                              const currentSets = [...ex.sets];
                              const nextIdx = currentSets.length;
                              
                              // Check if there's a previous training log's set at this index
                              const lastLogForEx = workoutLogs.find(log => 
                                log.exercises?.some(el => el.exerciseId === we.exerciseId)
                              );
                              const matchingEx = lastLogForEx 
                                ? lastLogForEx.exercises.find(el => el.exerciseId === we.exerciseId) 
                                : null;
                                
                              let weight = 25;
                              let reps = 8;
                              
                              if (matchingEx && matchingEx.sets && matchingEx.sets[nextIdx]) {
                                weight = matchingEx.sets[nextIdx].weight;
                                reps = matchingEx.sets[nextIdx].reps;
                              } else if (currentSets.length > 0) {
                                // Fallback to last set in active session
                                weight = currentSets[currentSets.length - 1].weight;
                                reps = currentSets[currentSets.length - 1].reps;
                              }
                              
                              currentSets.push({
                                type: 'regular',
                                weight,
                                reps,
                                repsRight: reps,
                                completed: false,
                                completedLeft: false,
                                completedRight: false,
                                timerRunning: false,
                                timerValue: 0,
                                timerRunningLeft: false,
                                timerValueLeft: 0,
                                timerRunningRight: false,
                                timerValueRight: 0
                              });
                              ex.sets = currentSets;
                              copy[we.exerciseId] = ex;
                              return copy;
                            });
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs hover:bg-slate-850 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Satz hinzufügen</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {finishWorkoutError && index === activeWorkout.exercises.length - 1 && (
                            <div className="bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-red-400 text-[10px] font-semibold animate-in fade-in duration-200 mr-2">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                              <span>{finishWorkoutError}</span>
                            </div>
                          )}

                          {!completedExercises.includes(we.exerciseId) ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setCompletedExercises(prev => [...prev, we.exerciseId]);
                                // Switch to next index if not last
                                if (index < activeWorkout.exercises.length - 1) {
                                  setTimeout(() => {
                                    handleExerciseClick(index + 1);
                                  }, 300);
                                }
                              }}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-4 h-4 font-black" />
                              <span>Abschluss der Übung</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-500 font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                              Übung beendet
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Workout Completion Section */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 mt-6">
            <h3 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">
              Trainingseinheit beenden?
            </h3>
            <p className="text-[11px] text-slate-500 text-center max-w-xs font-sans">
              Bist du fertig mit deinen Übungen? Klicke auf den Button unten, um deine Session zu speichern und Punkte zu sammeln.
            </p>
            {finishWorkoutError && (
              <div className="bg-red-500/10 border border-red-500/30 px-4 py-2.5 rounded-xl flex items-center gap-2 text-red-400 text-xs font-semibold max-w-sm animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{finishWorkoutError}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleFinishWorkout}
              className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 rounded-xl font-bold font-mono uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Check className="w-4 h-4 font-black" />
              <span>Abschluss des Trainings</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. SUMMARY VIEW */}
      {view === 'summary' && (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 max-w-md mx-auto my-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl"></div>
          
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-bounce">
            <Sparkles className="w-8 h-8 text-amber-500" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-2">
              Richtig stark, du hast heute {savedVolume.toLocaleString()} kg bewegt!
            </h2>
            <p className="text-sm text-slate-400">
              Deine Leistungen wurden sicher in der Datenbank gespeichert. Deine Punkte in der Bestenliste wurden aktualisiert (+1 Punkt)!
            </p>
          </div>

          <button
            onClick={() => {
              setView('lobby');
              setActiveWorkout(null);
            }}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            Zurück zur Übersicht
          </button>
        </div>
      )}

      {/* In-App YouTube Video Popup overlay */}
      {videoPopupUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-200 font-mono">ÜBUNGS-VIDEO PLAYER</span>
              <button
                onClick={() => setVideoPopupUrl(null)}
                className="text-slate-400 hover:text-white font-mono text-xs cursor-pointer bg-slate-950 px-2 py-1 rounded"
              >
                [ Schließen ]
              </button>
            </div>
            <div className="aspect-video w-full">
              {(() => {
                // simple regex extractor for youtube watch / share link
                let embedId = '';
                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                const match = videoPopupUrl.match(regExp);
                if (match && match[2].length === 11) {
                  embedId = match[2];
                }

                if (embedId) {
                  return (
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${embedId}?vq=tiny&rel=0`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                      preload="none"
                    ></iframe>
                  );
                } else {
                  return (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs p-8">
                      Keine YouTube Video-ID erkannt. Link: <a href={videoPopupUrl} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline ml-1">{videoPopupUrl}</a>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Safe State-Based Deletion Confirmation Modal */}
      {logToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-left">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Eintrag löschen?</h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Möchtest du den Trainingseintrag vom <strong className="text-amber-500">{logToDelete.date.split('-').reverse().join('.')}</strong> (<span className="text-white font-semibold">{logToDelete.workoutName}</span>) wirklich aus deinem Logbuch löschen? Dies kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLogToDelete(null)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => handleDeleteLog(logToDelete.id)}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Beautiful Immersive Workout Interruption Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-left">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider font-display">Training abbrechen?</h3>
            <p className="text-sm text-zinc-300">
              Das führt zu einem Abbruch des Trainings, sicher? Sämtliche Daten dieser Session gehen verloren.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-zinc-300 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Fortsetzen
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelConfirm(false);
                  setView('lobby');
                  setDurationTrackerActive(false);
                  setActiveWorkout(null);
                  if (onWorkoutActiveChange) {
                    onWorkoutActiveChange(false);
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
