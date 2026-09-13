import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, getLevelForPoints } from '../types';
import { Trophy, Calendar, Filter, Award, Sparkles, SlidersHorizontal, ArrowDownAZ } from 'lucide-react';

interface LeaderboardProps {
  userProfile?: UserProfile;
}

export default function Leaderboard({ userProfile }: LeaderboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [pointLogs, setPointLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Month generation starting from July 2026 (2026-07)
  const getAvailableMonths = () => {
    const GermanMonthNames = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];

    const now = new Date();
    const months: Array<{ key: string; label: string; year: number; monthIndex: number }> = [];

    // Base start date: July 2026
    const startYear = 2026;
    const startMonth = 6; // July (0-indexed)

    // Current date bounds (at least August 2026 if current date is 2026-08)
    const targetYear = Math.max(now.getFullYear(), 2026);
    const targetMonthIndex = now.getFullYear() < 2026 ? 6 : (now.getFullYear() === 2026 ? Math.max(now.getMonth(), 6) : now.getMonth());

    let currY = startYear;
    let currM = startMonth;

    while (currY < targetYear || (currY === targetYear && currM <= targetMonthIndex)) {
      const key = `${currY}-${String(currM + 1).padStart(2, '0')}`;
      const monthName = GermanMonthNames[currM];
      const shortYear = String(currY).slice(-2);
      const label = `${monthName} ${shortYear}`; // e.g. "Juli 26"
      months.push({ key, label, year: currY, monthIndex: currM });

      currM++;
      if (currM > 11) {
        currM = 0;
        currY++;
      }
    }

    return months;
  };

  const availableMonths = getAvailableMonths();
  const defaultMonthKey = availableMonths.length > 0 ? availableMonths[availableMonths.length - 1].key : '2026-07';

  // Filters and Ranking Modes
  const [rankingMode, setRankingMode] = useState<'month' | 'total'>('month'); // 'month' by default
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonthKey);
  const [category, setCategory] = useState<string>('all'); // 'all', 'Kraftsport', 'Wettkämpfe', 'Quiz', 'Ziele'
  const [clubFilter, setClubFilter] = useState<string>('all'); // 'all', 'verein', 'extern'

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all non-admin users
        const usersQuery = query(collection(db, 'users'), where('role', '!=', 'admin'));
        const usersSnap = await getDocs(usersQuery);
        const usersList: UserProfile[] = [];
        usersSnap.forEach((doc) => {
          usersList.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });

        // Fetch all point logs
        const logsSnap = await getDocs(collection(db, 'point_logs'));
        const logsList: any[] = [];
        logsSnap.forEach((doc) => {
          logsList.push({ id: doc.id, ...doc.data() });
        });

        setUsers(usersList);
        setPointLogs(logsList);
      } catch (err) {
        console.error('Error fetching leaderboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper to check if a log date matches YYYY-MM
  const isLogInMonth = (logDateStr: string, targetMonthKey: string) => {
    if (!logDateStr) return false;
    if (logDateStr.startsWith(targetMonthKey)) return true;
    const d = new Date(logDateStr);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}` === targetMonthKey;
    }
    return false;
  };

  // Compute points per user
  const getFilteredLeaderboard = () => {
    let baseUsers = users.filter(u => !u.archived && u.role !== 'kraftsport');

    // Filter by Club
    if (clubFilter === 'verein') {
      baseUsers = baseUsers.filter(u => u.role === 'keeper_verein');
    } else if (clubFilter === 'extern') {
      baseUsers = baseUsers.filter(u => u.role === 'keeper_extern');
    }

    const userScoresMap: {
      [uid: string]: {
        monthTotal: number;
        monthScores: { Kraftsport: number; Wettkämpfe: number; Quiz: number; Ziele: number };
        totalAll: number;
        totalScores: { Kraftsport: number; Wettkämpfe: number; Quiz: number; Ziele: number };
      };
    } = {};

    baseUsers.forEach(u => {
      userScoresMap[u.uid] = {
        monthTotal: 0,
        monthScores: { Kraftsport: 0, Wettkämpfe: 0, Quiz: 0, Ziele: 0 },
        totalAll: 0,
        totalScores: { Kraftsport: 0, Wettkämpfe: 0, Quiz: 0, Ziele: 0 }
      };
    });

    // Process logs
    pointLogs.forEach(log => {
      const uid = log.userId;
      if (!userScoresMap[uid]) return;

      const pts = Number(log.points) || 0;
      const cat = log.category;
      if (cat === 'Videoanalyse') return; // Exclude Videoanalyse points

      let catKey: 'Kraftsport' | 'Wettkämpfe' | 'Quiz' | 'Ziele' | null = null;
      if (cat === 'Kraftsport') catKey = 'Kraftsport';
      else if (cat === 'Wettkämpfe' || cat === 'Kognition') catKey = 'Wettkämpfe';
      else if (cat === 'Quiz' || cat === 'Wissens-Quiz' || cat === 'Wissensquiz') catKey = 'Quiz';
      else if (cat === 'Ziele') catKey = 'Ziele';

      // Total points sum
      userScoresMap[uid].totalAll += pts;
      if (catKey) {
        userScoresMap[uid].totalScores[catKey] += pts;
      }

      // Selected month points sum
      if (log.date && isLogInMonth(String(log.date), selectedMonth)) {
        userScoresMap[uid].monthTotal += pts;
        if (catKey) {
          userScoresMap[uid].monthScores[catKey] += pts;
        }
      }
    });

    // Reconcile/fallback with pre-aggregated profile totals for all-time points
    baseUsers.forEach(u => {
      const s = userScoresMap[u.uid];
      const profKraft = u.pointsByCategory?.Kraftsport || 0;
      const profWett = u.pointsByCategory?.Wettkämpfe || 0;
      const profQuiz = u.pointsByCategory?.Quiz || u.pointsByCategory?.['Wissens-Quiz'] || u.pointsByCategory?.WissensQuiz || 0;
      const profZiele = u.pointsByCategory?.Ziele || 0;
      const profTotal = u.points || (profKraft + profWett + profQuiz + profZiele);

      s.totalScores.Kraftsport = Math.max(s.totalScores.Kraftsport, profKraft);
      s.totalScores.Wettkämpfe = Math.max(s.totalScores.Wettkämpfe, profWett);
      s.totalScores.Quiz = Math.max(s.totalScores.Quiz, profQuiz);
      s.totalScores.Ziele = Math.max(s.totalScores.Ziele, profZiele);
      s.totalAll = Math.max(s.totalAll, profTotal, s.totalScores.Kraftsport + s.totalScores.Wettkämpfe + s.totalScores.Quiz + s.totalScores.Ziele);
    });

    // Build user list with scores for display & ranking
    const leaderboardList = baseUsers.map(u => {
      const s = userScoresMap[u.uid];

      let monthPoints = 0;
      let totalPoints = 0;

      if (category === 'all') {
        monthPoints = s.monthTotal;
        totalPoints = s.totalAll;
      } else if (category === 'Kraftsport' || category === 'Wettkämpfe' || category === 'Quiz' || category === 'Ziele') {
        const key = category as keyof typeof s.monthScores;
        monthPoints = s.monthScores[key] || 0;
        totalPoints = s.totalScores[key] || 0;
      }

      const displayPoints = rankingMode === 'month' ? monthPoints : totalPoints;
      const activeCategoryScores = rankingMode === 'month' ? s.monthScores : s.totalScores;

      return {
        ...u,
        monthPoints,
        totalPoints,
        displayPoints,
        activeCategoryScores,
        allScores: s
      };
    });

    // Sort users descending by displayPoints (monthly or total)
    return leaderboardList.sort((a, b) => {
      if (b.displayPoints !== a.displayPoints) {
        return b.displayPoints - a.displayPoints;
      }
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return (a.username || a.name || '').localeCompare(b.username || b.name || '');
    });
  };

  const rankedData = getFilteredLeaderboard();

  // Separate top 3 and others
  const top3 = rankedData.slice(0, 3);
  const remaining = rankedData.slice(3);

  // Re-order top 3 for podium: [2nd, 1st, 3rd]
  const podiumOrder = [];
  if (top3[1]) podiumOrder.push({ ...top3[1], rank: 2 });
  if (top3[0]) podiumOrder.push({ ...top3[0], rank: 1 });
  if (top3[2]) podiumOrder.push({ ...top3[2], rank: 3 });

  const activeMonthLabel = availableMonths.find(m => m.key === selectedMonth)?.label || 'Monat';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 font-sans">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-brand-border pb-6 gap-6 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
            <Trophy className="w-8 h-8 text-brand-neon" />
            Bestenliste
          </h1>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mt-1">
            Performance Ranking & Punkteübersicht
          </p>
        </div>

        {/* Filter Controls Accordion */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category Dropdown */}
          <div className="flex flex-col gap-1 w-full sm:w-48">
            <label className="text-[9px] uppercase font-bold text-zinc-500 ml-1">Kategorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-brand-panel border border-brand-border text-white text-xs rounded-xl px-3 py-2 w-full focus:outline-none focus:border-brand-neon"
            >
              <option value="all">Alle Kategorien</option>
              <option value="Kraftsport">Krafttraining</option>
              <option value="Wettkämpfe">Training</option>
              <option value="Quiz">Wissens-Quiz</option>
              <option value="Ziele">ToDos / Ziele</option>
            </select>
          </div>

          {/* Club Filter */}
          <div className="flex flex-col gap-1 w-full sm:w-40">
            <label className="text-[9px] uppercase font-bold text-zinc-500 ml-1">Gruppe</label>
            <select
              value={clubFilter}
              onChange={(e) => setClubFilter(e.target.value)}
              className="bg-brand-panel border border-brand-border text-white text-xs rounded-xl px-3 py-2 w-full focus:outline-none focus:border-brand-neon"
            >
              <option value="all">Alle Keeper</option>
              <option value="verein">Eigener Verein</option>
              <option value="extern">Externe Keeper</option>
            </select>
          </div>
        </div>
      </div>

      {/* Top Selector Bar: Gesamtpunkte & Month Buttons */}
      <div className="flex flex-col gap-3 bg-brand-panel/60 border border-brand-border p-4 rounded-2xl mb-8 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-brand-neon" />
            <span>Zeitraum & Rangfolge auswählen:</span>
          </span>
          {rankingMode === 'month' && (
            <span className="text-[10px] font-mono text-brand-neon uppercase font-bold bg-brand-neon/10 px-2.5 py-0.5 rounded-full border border-brand-neon/20">
              Rangliste nach Monat: {activeMonthLabel}
            </span>
          )}
          {rankingMode === 'total' && (
            <span className="text-[10px] font-mono text-amber-400 uppercase font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              Rangliste nach Gesamtpunkte
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar scrollbar-none">
          {/* Gesamtpunkte Button */}
          <button
            onClick={() => setRankingMode('total')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shrink-0 cursor-pointer ${
              rankingMode === 'total'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'bg-brand-panel hover:bg-zinc-800 text-zinc-300 border border-brand-border hover:border-zinc-600'
            }`}
          >
            <Trophy className={`w-4 h-4 ${rankingMode === 'total' ? 'text-slate-950' : 'text-amber-400'}`} />
            <span>Gesamtpunkte</span>
          </button>

          <div className="h-6 w-px bg-zinc-800 mx-1 shrink-0" />

          {/* Month Buttons starting from Juli 26 */}
          {availableMonths.map((m) => {
            const isActive = rankingMode === 'month' && selectedMonth === m.key;
            return (
              <button
                key={m.key}
                onClick={() => {
                  setSelectedMonth(m.key);
                  setRankingMode('month');
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-brand-neon text-slate-950 shadow-md shadow-brand-neon/20 font-black'
                    : 'bg-brand-panel hover:bg-zinc-800 text-zinc-300 border border-brand-border hover:border-zinc-600'
                }`}
              >
                <Calendar className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-zinc-400'}`} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-neon mb-4"></div>
          <p className="text-sm text-zinc-400 font-mono">Lade Bestenliste...</p>
        </div>
      ) : rankedData.length === 0 ? (
        <div className="bg-brand-panel border border-brand-border rounded-2xl p-12 text-center text-zinc-400">
          <p className="text-sm font-medium">Keine Profile gefunden.</p>
          <p className="text-xs text-zinc-600 mt-1">Hier herrscht noch gähnende Leere.</p>
        </div>
      ) : (
        <>
          {/* Elegant Podium Section */}
          <div className="flex items-end justify-center gap-3 sm:gap-4 py-8 mb-10 overflow-x-auto no-scrollbar">
            {podiumOrder.map((user) => {
              const isFirst = user.rank === 1;
              const isSecond = user.rank === 2;
              const isThird = user.rank === 3;

              if (isFirst) {
                const lvl = getLevelForPoints(user.points || 0);
                return (
                  <div key={user.uid} className="flex flex-col items-center gap-3 shrink-0">
                    <div className="text-brand-neon font-black text-[10px] sm:text-xs uppercase tracking-widest animate-pulse">Champion</div>
                    <div className="w-14 h-14 rounded-full border-2 border-[#ffcc00] bg-brand-panel flex items-center justify-center shadow-[0_0_25px_rgba(255,204,0,0.3)] text-2xl">
                      🏆
                    </div>
                    <div className="bg-gradient-to-b from-zinc-800 to-brand-bg w-40 sm:w-56 h-[330px] rounded-t-2xl flex flex-col items-center justify-between py-5 px-3 border-t border-[#ffcc00] shadow-2xl relative z-10 scale-105 overflow-hidden">
                       <div className="absolute top-0 w-full h-1 bg-[#ffcc00] opacity-50"></div>

                       {/* Identity */}
                       <div className="text-center w-full flex flex-col items-center">
                         <span className="text-sm sm:text-base font-black uppercase italic truncate max-w-full block text-white">{user.username || user.name}</span>
                         <span className="text-[10px] text-zinc-400 font-sans tracking-normal block">@{user.name}</span>
                         <div className="flex justify-center mt-1">
                           <span className={`px-2 py-0.5 text-[8px] font-bold rounded-full uppercase tracking-wider border ${lvl.badgeColor}`}>
                             {lvl.name}
                           </span>
                         </div>
                       </div>

                       {/* Dual Scores Display */}
                       <div className="flex flex-col items-center w-full">
                         <div className="text-brand-neon font-mono text-xl sm:text-2xl font-black tracking-tighter">
                           {user.displayPoints} <span className="text-xs font-normal text-zinc-400">pts</span>
                         </div>

                         {/* Separated Monat vs Gesamt Pill */}
                         <div className="flex items-center gap-2 mt-1 bg-zinc-950/80 px-2.5 py-1 rounded-lg border border-zinc-800 text-[10px] font-mono w-full justify-center">
                           <div className={`flex items-center gap-1 ${rankingMode === 'month' ? 'text-brand-neon font-bold' : 'text-zinc-400'}`}>
                             <span className="text-[8px] text-zinc-500 uppercase">Monat:</span>
                             <span>{user.monthPoints}</span>
                           </div>
                           <span className="text-zinc-700">|</span>
                           <div className={`flex items-center gap-1 ${rankingMode === 'total' ? 'text-amber-400 font-bold' : 'text-zinc-400'}`}>
                             <span className="text-[8px] text-zinc-500 uppercase">Gesamt:</span>
                             <span>{user.totalPoints}</span>
                           </div>
                         </div>

                         {/* Category Breakdown */}
                         <div className="flex flex-col items-center font-mono text-center w-full mt-2">
                           <span className="text-[6.5px] sm:text-[7.5px] text-zinc-500 uppercase font-black tracking-wider mb-0.5">Kraft • Train • Quiz • ToDos</span>
                           <span className="font-semibold text-zinc-300 text-[9.5px] sm:text-xs">
                             {user.activeCategoryScores?.Kraftsport || 0} <span className="text-zinc-600">|</span> {user.activeCategoryScores?.Wettkämpfe || 0} <span className="text-zinc-600">|</span> {user.activeCategoryScores?.Quiz || 0} <span className="text-zinc-600">|</span> {user.activeCategoryScores?.Ziele || 0}
                           </span>
                         </div>
                       </div>

                       {/* Club */}
                       <div className="text-[9px] sm:text-[10px] text-brand-neon uppercase font-black truncate max-w-[95%] text-center">
                         {user.club || 'Top Performer'}
                       </div>
                    </div>
                  </div>
                );
              }

              if (isSecond) {
                const lvl = getLevelForPoints(user.points || 0);
                return (
                  <div key={user.uid} className="flex flex-col items-center gap-3 shrink-0">
                    <div className="text-zinc-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest">Silber</div>
                    <div className="w-11 h-11 rounded-full border-2 border-[#b8b8b8] bg-brand-panel flex items-center justify-center shadow-[0_0_15px_rgba(184,184,184,0.2)] text-xl">
                      🥈
                    </div>
                    <div className="bg-gradient-to-b from-zinc-700 to-zinc-900 w-36 sm:w-48 h-[290px] rounded-t-xl flex flex-col items-center justify-between py-4 px-3 border-t border-zinc-600 shadow-2xl relative">
                       {/* Identity */}
                       <div className="text-center w-full flex flex-col items-center">
                         <span className="text-xs sm:text-sm font-black uppercase italic truncate max-w-full block text-white">{user.username || user.name}</span>
                         <span className="text-[10px] text-zinc-400 font-sans tracking-normal block">@{user.name}</span>
                         <div className="flex justify-center mt-1">
                           <span className={`px-2 py-0.5 text-[8px] font-bold rounded-full uppercase tracking-wider border ${lvl.badgeColor}`}>
                             {lvl.name}
                           </span>
                         </div>
                       </div>

                       {/* Dual Scores Display */}
                       <div className="flex flex-col items-center w-full">
                         <div className="text-brand-neon font-mono text-lg sm:text-xl font-black">{user.displayPoints} <span className="text-xs font-normal text-zinc-400">pts</span></div>

                         {/* Separated Monat vs Gesamt Pill */}
                         <div className="flex items-center gap-1.5 mt-1 bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800 text-[9px] font-mono w-full justify-center">
                           <div className={`flex items-center gap-0.5 ${rankingMode === 'month' ? 'text-brand-neon font-bold' : 'text-zinc-400'}`}>
                             <span className="text-[7.5px] text-zinc-500 uppercase">M:</span>
                             <span>{user.monthPoints}</span>
                           </div>
                           <span className="text-zinc-700">|</span>
                           <div className={`flex items-center gap-0.5 ${rankingMode === 'total' ? 'text-amber-400 font-bold' : 'text-zinc-400'}`}>
                             <span className="text-[7.5px] text-zinc-500 uppercase">G:</span>
                             <span>{user.totalPoints}</span>
                           </div>
                         </div>

                         {/* Category Breakdown */}
                         <div className="flex flex-col items-center font-mono text-center w-full mt-2">
                           <span className="text-[6.5px] sm:text-[7.5px] text-zinc-500 uppercase font-black tracking-wider mb-0.5">Kraft • Train • Quiz • ToDos</span>
                           <span className="font-semibold text-zinc-300 text-[9.5px] sm:text-xs">
                             {user.activeCategoryScores?.Kraftsport || 0} <span className="text-zinc-600">|</span> {user.activeCategoryScores?.Wettkämpfe || 0} <span className="text-zinc-600">|</span> {user.activeCategoryScores?.Quiz || 0} <span className="text-zinc-600">|</span> {user.activeCategoryScores?.Ziele || 0}
                           </span>
                         </div>
                       </div>

                       {/* Club */}
                       <div className="text-[8px] sm:text-[9px] text-zinc-400 uppercase truncate max-w-[95%] text-center">
                         {user.club || 'Eigener Verein'}
                       </div>
                    </div>
                  </div>
                );
              }

              if (isThird) {
                const lvl = getLevelForPoints(user.points || 0);
                return (
                  <div key={user.uid} className="flex flex-col items-center gap-3 shrink-0">
                    <div className="text-zinc-500 font-bold text-[10px] sm:text-xs uppercase tracking-widest">Bronze</div>
                    <div className="w-11 h-11 rounded-full border-2 border-[#cd7f32] bg-brand-panel flex items-center justify-center shadow-[0_0_15px_rgba(205,127,50,0.2)] text-xl">
                      🥉
                    </div>
                    <div className="bg-gradient-to-b from-zinc-800 to-zinc-950 w-36 sm:w-48 h-[260px] rounded-t-xl flex flex-col items-center justify-between py-4 px-2.5 border-t border-zinc-700 shadow-2xl relative">
                       {/* Identity */}
                       <div className="text-center w-full flex flex-col items-center">
                         <span className="text-xs sm:text-sm font-black uppercase italic truncate max-w-full block text-white">{user.username || user.name}</span>
                         <span className="text-[10px] text-zinc-400 font-sans tracking-normal block">@{user.name}</span>
                         <div className="flex justify-center mt-1">
                           <span className={`px-2 py-0.5 text-[8px] font-bold rounded-full uppercase tracking-wider border ${lvl.badgeColor}`}>
                             {lvl.name}
                           </span>
                         </div>
                       </div>

                       {/* Dual Scores Display */}
                       <div className="flex flex-col items-center w-full">
                         <div className="text-brand-neon font-mono text-lg sm:text-xl font-black">{user.displayPoints} <span className="text-xs font-normal text-zinc-400">pts</span></div>

                         {/* Separated Monat vs Gesamt Pill */}
                         <div className="flex items-center gap-1.5 mt-1 bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800 text-[9px] font-mono w-full justify-center">
                           <div className={`flex items-center gap-0.5 ${rankingMode === 'month' ? 'text-brand-neon font-bold' : 'text-zinc-400'}`}>
                             <span className="text-[7.5px] text-zinc-500 uppercase">M:</span>
                             <span>{user.monthPoints}</span>
                           </div>
                           <span className="text-zinc-700">|</span>
                           <div className={`flex items-center gap-0.5 ${rankingMode === 'total' ? 'text-amber-400 font-bold' : 'text-zinc-400'}`}>
                             <span className="text-[7.5px] text-zinc-500 uppercase">G:</span>
                             <span>{user.totalPoints}</span>
                           </div>
                         </div>

                         {/* Category Breakdown */}
                         <div className="flex flex-col items-center font-mono text-center w-full mt-2">
                           <span className="text-[6.5px] sm:text-[7.5px] text-zinc-500 uppercase font-black tracking-wider mb-0.5">Kraft • Train • Quiz • ToDos</span>
                           <span className="font-semibold text-zinc-300 text-[9.5px] sm:text-xs">
                             {user.activeCategoryScores?.Kraftsport || 0} <span className="text-zinc-600">|</span> {user.activeCategoryScores?.Wettkämpfe || 0} <span className="text-zinc-600">|</span> {user.activeCategoryScores?.Quiz || 0} <span className="text-zinc-600">|</span> {user.activeCategoryScores?.Ziele || 0}
                           </span>
                         </div>
                       </div>

                       {/* Club */}
                       <div className="text-[8px] sm:text-[9px] text-zinc-400 uppercase truncate max-w-[95%] text-center">
                         {user.club || 'Eigener Verein'}
                       </div>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>

          {/* List Section for Remaining Keepers */}
          <div className="flex flex-col bg-brand-panel/50 rounded-xl border border-brand-border overflow-hidden shadow-xl">
            {/* Table Header */}
            <div className="grid grid-cols-12 px-4 sm:px-6 py-3.5 bg-brand-panel text-[10px] uppercase font-black tracking-widest text-zinc-400 border-b border-brand-border items-center">
              <div className="col-span-2 sm:col-span-1">Pos</div>
              <div className="col-span-5 sm:col-span-4">Spieler / Verein</div>
              <div className="col-span-5 sm:col-span-3 text-center">Einzelwerte</div>
              <div className="col-span-6 sm:col-span-2 text-right">Monatspunkte</div>
              <div className="col-span-6 sm:col-span-2 text-right">Gesamtpunkte</div>
            </div>

            {/* Table Rows */}
            <div className="flex flex-col divide-y divide-brand-border/30">
              {remaining.map((user, index) => (
                <div
                  key={user.uid}
                  className="grid grid-cols-12 px-4 sm:px-6 py-4 items-center hover:bg-white/5 transition-all duration-150 group"
                >
                  {/* Position */}
                  <div className="col-span-2 sm:col-span-1 flex items-center font-mono font-bold text-zinc-500 text-sm">
                    {(index + 4).toString().padStart(2, '0')}
                  </div>

                  {/* Name and club */}
                  <div className="col-span-5 sm:col-span-4 flex flex-col min-w-0 pr-2">
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <span className="text-sm font-bold text-white group-hover:text-brand-neon transition-colors truncate">
                        {user.username || user.name}
                      </span>
                      {(() => {
                        const lvl = getLevelForPoints(user.points || 0);
                        return (
                          <span className={`px-1.5 py-0.2 text-[7px] font-extrabold rounded-full uppercase tracking-wider border shrink-0 ${lvl.badgeColor}`}>
                            {lvl.name}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex flex-col mt-0.5 min-w-0">
                      <span className="text-[11px] font-medium text-zinc-400 truncate">
                        @{user.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-medium truncate mt-0.5">
                        {user.club || 'Eigener Verein'} • {user.position || 'Torwart'}
                      </span>
                    </div>
                  </div>

                  {/* Individual scores */}
                  <div className="col-span-5 sm:col-span-3 flex flex-col justify-center items-center text-center font-mono text-[10px] text-zinc-400">
                    <div className="text-zinc-500 uppercase font-black text-[7px] sm:text-[8px] tracking-widest mb-0.5">Kraft • Train • Quiz • ToDos</div>
                    <div className="text-[11px] sm:text-xs font-semibold">
                      {user.activeCategoryScores?.Kraftsport || 0} <span className="text-zinc-600">|</span> {user.activeCategoryScores?.Wettkämpfe || 0} <span className="text-zinc-600">|</span> {user.activeCategoryScores?.Quiz || 0} <span className="text-zinc-600">|</span> {user.activeCategoryScores?.Ziele || 0}
                    </div>
                  </div>

                  {/* Monatspunkte */}
                  <div className="col-span-6 sm:col-span-2 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center font-mono text-right mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-brand-border/20 sm:border-t-0">
                    <span className="sm:hidden text-[9px] uppercase font-black text-zinc-500">Monat ({activeMonthLabel})</span>
                    <span className={`text-sm font-black ${rankingMode === 'month' ? 'text-brand-neon' : 'text-zinc-300'}`}>
                      {user.monthPoints} <span className="text-[10px] font-normal text-zinc-500">pts</span>
                    </span>
                  </div>

                  {/* Gesamtpunkte */}
                  <div className="col-span-6 sm:col-span-2 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center font-mono text-right mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-brand-border/20 sm:border-t-0">
                    <span className="sm:hidden text-[9px] uppercase font-black text-zinc-500">Gesamtpunkte</span>
                    <span className={`text-sm font-black ${rankingMode === 'total' ? 'text-amber-400' : 'text-zinc-400'}`}>
                      {user.totalPoints} <span className="text-[10px] font-normal text-zinc-500">pts</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
