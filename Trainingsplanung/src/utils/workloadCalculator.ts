import type { TrainingPlan, TrainingGroup, Player, PlayerMatchPlaytime, MesoPlan, MesoDayItem, PitchSurface, PlayerAbsence } from '../types';
import { PITCH_SURFACE_OPTIONS } from '../types';

/**
 * Helper: Check if a player was absent/injured on a given date (YYYY-MM-DD)
 */
export function isPlayerAbsentOnDate(
  playerId: string,
  dateStr: string | undefined | null,
  absences: PlayerAbsence[] = []
): boolean {
  if (!dateStr || !absences || absences.length === 0) return false;
  const pYMD = normalizeToYMD(dateStr);
  if (!pYMD) return false;

  const dateObj = new Date(pYMD + 'T12:00:00Z');
  const dayOfWeek = dateObj.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  return absences.some(abs => {
    if (abs.playerId !== playerId) return false;

    // 1. Recurring weekly absence (e.g. absent every Tuesday)
    if (abs.isRecurring && abs.recurringWeekday !== undefined) {
      if (Number(abs.recurringWeekday) === dayOfWeek) {
        const startYMD = abs.startDate ? normalizeToYMD(abs.startDate) : null;
        const endYMD = abs.endDate ? normalizeToYMD(abs.endDate) : null;
        if (startYMD && pYMD < startYMD) return false;
        if (endYMD && pYMD > endYMD) return false;
        return true;
      }
      return false;
    }

    // 2. Date range absence (e.g. injury from 2026-08-01 to 2026-08-21)
    if (!abs.startDate) return false;
    const startYMD = normalizeToYMD(abs.startDate);
    if (!startYMD) return false;
    const endYMD = normalizeToYMD(abs.endDate || abs.startDate) || startYMD;
    return pYMD >= startYMD && pYMD <= endYMD;
  });
}

export type WorkloadStatus = 'undertraining' | 'optimal' | 'warning' | 'danger';

export interface WorkloadStatusConfig {
  status: WorkloadStatus;
  label: string;
  badge: string;
  dotColor: string;
  hex: string;
  text: string;
  border: string;
  bg: string;
  recommendation: string;
}

export const WORKLOAD_STATUS_CONFIG: Record<WorkloadStatus, WorkloadStatusConfig> = {
  undertraining: {
    status: 'undertraining',
    label: 'Under-Training',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    dotColor: 'bg-sky-400',
    hex: '#38bdf8',
    text: 'text-sky-400',
    border: 'border-sky-500/40',
    bg: 'bg-sky-950/40',
    recommendation: 'Belastung ist gering (Dekonditionierung). Trainingsreize schrittweise steigern, um Anpassungseffekte zu erzielen.'
  },
  optimal: {
    status: 'optimal',
    label: 'Sweet Spot',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dotColor: 'bg-emerald-400',
    hex: '#10b981',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-950/40',
    recommendation: 'Optimale Belastung (0.8–1.3). Maximale Leistungsanpassung bei minimalem Verletzungsrisiko.'
  },
  warning: {
    status: 'warning',
    label: 'Erhöhte Ermüdung',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dotColor: 'bg-amber-400',
    hex: '#f59e0b',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/40',
    recommendation: 'Erhöhte Ermüdung (1.3–1.49). Regenerationsmaßnahmen intensivieren, Schlaf und Ernährung überwachen.'
  },
  danger: {
    status: 'danger',
    label: 'Spike / Überlastung',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
    dotColor: 'bg-rose-500',
    hex: '#f43f5e',
    text: 'text-rose-400',
    border: 'border-rose-500/60',
    bg: 'bg-rose-950/50',
    recommendation: 'Akute Belastungsspitze (≥ 1.5)! Signifikant erhöhtes Verletzungsrisiko. Intensität und Sprungvolumen in den nächsten 48h um 30–50% reduzieren.'
  }
};

export interface DailyLoadEntry {
  date: string; // YYYY-MM-DD
  load: number; // sRPE = minutes * rpe
  durationMinutes: number;
  rpe: number;
  jumpVolume?: 'low' | 'medium' | 'high' | string;
  pitchSurface?: PitchSurface | string;
  planTitle?: string;
  planId?: string;
  isMatch?: boolean;
}

export interface WeeklyLoadData {
  weekIndex: number; // 0 = current week, 1 = 1 week ago, etc.
  weekLabel: string; // e.g. "KW 36" or "W-3"
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;   // YYYY-MM-DD
  totalLoad: number; // sum of sRPE in this week
  totalMinutes: number;
  sessionCount: number;
  matchCount: number;
  acwr: number;
  status: WorkloadStatus;
  isCurrentWeek?: boolean;
}

export interface PlayerWorkload {
  playerId: string;
  playerName: string;
  jerseyNumber?: number | string;
  acuteLoad7d: number;      // Last 7 days sum of sRPE
  chronicLoad28d: number;   // Last 28 days sum of sRPE / 4
  acwr: number;             // acute / chronic
  status: WorkloadStatus;
  weeklyHistory: WeeklyLoadData[]; // 8 weeks (from W-7 to W0)
  dailyLoads: DailyLoadEntry[];
  avgWeeklyLoad: number;    // average weekly load over past 4 weeks
  monthlyPeakLoad: number;  // maximum single week load in 8 weeks
  documentedWeeksCount: number; // number of weeks in past 4 weeks with documented sessions
  isColdStart: boolean; // true if documentedWeeksCount < 2 (basis is building up)
  jumpVolume7dSummary?: 'low' | 'medium' | 'high' | 'none';
  jumpVolume7dCount?: { low: number; medium: number; high: number };
  
  // EWMA (Exponentially Weighted Moving Average) Smoothing
  acuteLoadEwma?: number;
  chronicLoadEwma?: number;
  acwrEwma?: number;
  statusEwma?: WorkloadStatus;

  // Separate Joint-Load metric based on Sprungvolumen
  jumpWeightedAcuteLoad7d?: number;
  jumpWeightedChronicLoad28d?: number;
  jumpWeightedAcwr?: number;
  jumpWeightedStatus?: WorkloadStatus;
}

export interface GroupWorkloadSummary {
  targetGroupId: string;
  targetGroupName: string;
  players: PlayerWorkload[];
  hasDangerSpike: boolean;
  hasWarning: boolean;
  isColdStart: boolean;
  teamAvgAcuteLoad: number;
  teamAvgChronicLoad: number;
  teamAvgAcwr: number;
  teamStatus: WorkloadStatus;
  teamWeeklyHistory: WeeklyLoadData[];
  teamJumpVolume7dSummary?: 'low' | 'medium' | 'high' | 'none';
  
  // Team EWMA averages
  teamAvgAcuteLoadEwma?: number;
  teamAvgChronicLoadEwma?: number;
  teamAvgAcwrEwma?: number;
  teamStatusEwma?: WorkloadStatus;

  // Team Jump-weighted joint-load averages
  teamAvgJumpWeightedAcuteLoad?: number;
  teamAvgJumpWeightedChronicLoad?: number;
  teamAvgJumpWeightedAcwr?: number;
  teamJumpWeightedStatus?: WorkloadStatus;
}

export interface SeasonWeeklyLoadData {
  weekIndex: number; // 0..51
  weekNumber: number; // 1..52
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;   // YYYY-MM-DD
  seasonMonthIndex: number; // 0=Juli, 1=August, ..., 11=Juni
  monthLabel: string; // "Juli", "August", ...
  totalLoad: number; // sum of sRPE in this 7-day week
  avgDailyLoad: number; // Math.round(totalLoad / 7)
  acuteLoad: number;
  chronicLoad: number;
  acwr: number;
  status: WorkloadStatus;
  sessionCount: number;
  matchCount: number;
  totalMinutes: number;
  isFuture: boolean;
  isCurrentWeek: boolean;
}

export interface PlayerSeasonWorkload {
  playerId: string;
  playerName: string;
  seasonLabel: string; // e.g. "2026/2027"
  seasonStartYear: number;
  weeks: SeasonWeeklyLoadData[];
  currentWeekIndex: number;
  currentAcwr: number;
  currentStatus: WorkloadStatus;
  currentAvgDailyLoad: number;
  currentWeeklyLoad: number;
  seasonPeakWeeklyLoad: number;
  seasonPeakDailyAvgLoad: number;
  seasonAvgWeeklyLoad: number;
  seasonAvgDailyLoad: number;
  totalSeasonMinutes: number;
  totalSeasonSessions: number;
  totalSeasonMatches: number;
  documentedWeeksCount: number;
}

/**
 * Normalizes a date string into YYYY-MM-DD using UTC noon anchor to prevent timezone shifts
 */
export const normalizeToYMD = (dateStr?: string | null): string => {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date().toISOString().substring(0, 10);
  }
  const clean = dateStr.trim().split('T')[0].split(' ')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const deMatch = clean.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (deMatch) {
    return `${deMatch[3]}-${deMatch[2].padStart(2, '0')}-${deMatch[1].padStart(2, '0')}`;
  }
  const d = new Date(clean.includes('T') ? clean : `${clean}T12:00:00Z`);
  return isNaN(d.getTime()) ? new Date().toISOString().substring(0, 10) : d.toISOString().substring(0, 10);
};

/**
 * Determine Workload Status based on ACWR ratio
 */
export const classifyACWR = (acwr: number): WorkloadStatus => {
  if (acwr < 0.8) return 'undertraining';
  if (acwr <= 1.3) return 'optimal';
  if (acwr < 1.5) return 'warning';
  return 'danger';
};

/**
 * Calculates sRPE and ACWR for a single goalkeeper over the past 8 weeks, including match day playtimes.
 * Workload Prioritization:
 * 1. Primary: Individual debrief rating from "Historie -> Einheit nachbereiten" (plan.keeperLoadRatings)
 * 2. Secondary: If unrated, uses Mikroplanung intensities (TW-Dauer * TW-Intensität + Team-Dauer * Team-Intensität)
 * 3. Fallback: Standard training load (duration * 6.0)
 */
export function calculatePlayerWorkload(
  player: { id: string; firstName?: string; lastName?: string; name?: string; jerseyNumber?: number | string; groupId?: string },
  savedPlans: TrainingPlan[],
  referenceDateInput: Date | string = new Date(),
  weeksCount: number = 8,
  matchPlaytimes?: PlayerMatchPlaytime[],
  mesoPlans?: MesoPlan[],
  absences?: PlayerAbsence[]
): PlayerWorkload {
  const refDate = typeof referenceDateInput === 'string' ? new Date(referenceDateInput) : new Date(referenceDateInput.getTime());
  // End of reference day (23:59:59)
  refDate.setHours(23, 59, 59, 999);

  const playerId = player.id;
  const playerName = player.name || `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Torwart';
  const playerGroupId = player.groupId;

  // Window limit (past 8-10 weeks)
  const windowStartDate = new Date(refDate.getTime());
  windowStartDate.setDate(windowStartDate.getDate() - (weeksCount * 7 + 14));
  windowStartDate.setHours(0, 0, 0, 0);

  // Helper to find a matching MesoDayItem for a given date
  const findMicroDayForDate = (dateStr: string): MesoDayItem | null => {
    if (!mesoPlans || mesoPlans.length === 0) return null;
    
    // Check plans matching the player's group first
    let candidates = mesoPlans;
    if (playerGroupId) {
      const groupSpecific = mesoPlans.filter(m => m.groupId === playerGroupId);
      if (groupSpecific.length > 0) {
        candidates = groupSpecific;
      }
    }

    for (const meso of candidates) {
      for (const week of meso.weeks || []) {
        for (const day of week.days || []) {
          if (normalizeToYMD(day.date) === dateStr) {
            return day;
          }
        }
      }
    }
    return null;
  };

  // Helper to calculate workload from a MesoDayItem (TW load + Team load)
  const calculateMicroDayLoad = (day: MesoDayItem, planDuration?: number) => {
    let totalLoad = 0;
    let totalMinutes = 0;
    const defaultTwMin = planDuration && planDuration > 0 ? planDuration : 75;

    // Morning Slot
    if (day.slots?.morning === 'tw_only') {
      const twInt = Number(day.morningTwIntensity) || 6;
      totalMinutes += defaultTwMin;
      totalLoad += defaultTwMin * twInt;
    } else if (day.slots?.morning === 'tw_and_team') {
      const twInt = Number(day.morningTwIntensity) || 6;
      const teamInt = Number(day.morningTeamIntensity) || 6;
      const teamMin = Number(day.morningTeamDurationMinutes ?? 60);
      totalMinutes += defaultTwMin + teamMin;
      totalLoad += (defaultTwMin * twInt) + (teamMin * teamInt);
    } else if (day.slots?.morning === 'team_only') {
      const teamInt = Number(day.morningTeamIntensity) || 6;
      const teamMin = Number(day.morningTeamDurationMinutes ?? 60);
      totalMinutes += teamMin;
      totalLoad += teamMin * teamInt;
    }

    // Afternoon Slot
    if (day.slots?.afternoon === 'tw_only') {
      const twInt = Number(day.afternoonTwIntensity) || 6;
      totalMinutes += 75;
      totalLoad += 75 * twInt;
    } else if (day.slots?.afternoon === 'tw_and_team') {
      const twInt = Number(day.afternoonTwIntensity) || 6;
      const teamInt = Number(day.afternoonTeamIntensity) || 6;
      const teamMin = Number(day.afternoonTeamDurationMinutes ?? 60);
      totalMinutes += 75 + teamMin;
      totalLoad += (75 * twInt) + (teamMin * teamInt);
    } else if (day.slots?.afternoon === 'team_only') {
      const teamInt = Number(day.afternoonTeamIntensity) || 6;
      const teamMin = Number(day.afternoonTeamDurationMinutes ?? 60);
      totalMinutes += teamMin;
      totalLoad += teamMin * teamInt;
    }

    const effectiveRpe = totalMinutes > 0 ? Math.round((totalLoad / totalMinutes) * 10) / 10 : 6;
    return {
      totalLoad,
      totalMinutes,
      effectiveRpe,
      hasTraining: totalMinutes > 0 && totalLoad > 0
    };
  };

  // 1. Extract all daily sessions with sRPE for this player
  const dailyLoadsMap: Record<string, DailyLoadEntry> = {};

  // 1a. Process Saved Plans (Debrief -> Microplan -> Fallback)
  savedPlans.forEach(plan => {
    if (plan.isArchived) return;
    const planDateStr = normalizeToYMD(plan.date || plan.planDate);
    const planDate = new Date(planDateStr);
    planDate.setHours(12, 0, 0, 0);

    // Skip future plans beyond reference date or outside history window
    if (planDate.getTime() > refDate.getTime() || planDate.getTime() < windowStartDate.getTime()) return;

    // Determine individual or general jump volume for this keeper
    const playerJumpVol = plan.keeperJumpVolumes?.[playerId]
      || (plan.keeperJumpVolumes && Object.keys(plan.keeperJumpVolumes).find(k => k.toLowerCase() === playerName.toLowerCase()) ? plan.keeperJumpVolumes[Object.keys(plan.keeperJumpVolumes).find(k => k.toLowerCase() === playerName.toLowerCase())!] : undefined)
      || (plan.jumpVolume as 'low' | 'medium' | 'high' | undefined);

    // Helper to merge jump volumes (high > medium > low)
    const mergeJumpVolume = (existing?: string, next?: string): 'low' | 'medium' | 'high' | undefined => {
      if (existing === 'high' || next === 'high') return 'high';
      if (existing === 'medium' || next === 'medium') return 'medium';
      if (existing === 'low' || next === 'low') return 'low';
      return undefined;
    };

    // Check if player was absent/injured on this date
    const isAbsent = isPlayerAbsentOnDate(playerId, planDateStr, absences);

    // Check Priority 1: Individual debrief rating entered in "Einheit nachbereiten"
    let debriefRpe = plan.keeperLoadRatings?.[playerId];
    if (debriefRpe === undefined && plan.keeperLoadRatings) {
      const matchKey = Object.keys(plan.keeperLoadRatings).find(k => k.toLowerCase() === playerName.toLowerCase());
      if (matchKey) debriefRpe = plan.keeperLoadRatings[matchKey];
    }

    // If player was absent and has NO explicit debrief rating > 0, their training load is 0 (skip)
    if (isAbsent && !(debriefRpe !== undefined && debriefRpe > 0)) {
      return;
    }

    if (debriefRpe !== undefined && debriefRpe > 0) {
      // Priority 1: Use Debrief rating
      const duration = plan.totalMinutes || plan.totalDuration || 75;
      const sessionLoad = duration * debriefRpe;

      if (!dailyLoadsMap[planDateStr]) {
        dailyLoadsMap[planDateStr] = {
          date: planDateStr,
          load: sessionLoad,
          durationMinutes: duration,
          rpe: debriefRpe,
          jumpVolume: playerJumpVol,
          pitchSurface: plan.pitchSurface || 'natural_grass',
          planTitle: plan.title || plan.planTitle || 'Trainingseinheit',
          planId: plan.id,
          isMatch: false
        };
      } else {
        dailyLoadsMap[planDateStr].load += sessionLoad;
        dailyLoadsMap[planDateStr].durationMinutes += duration;
        dailyLoadsMap[planDateStr].rpe = Math.round(((dailyLoadsMap[planDateStr].rpe + debriefRpe) / 2) * 10) / 10;
        dailyLoadsMap[planDateStr].jumpVolume = mergeJumpVolume(dailyLoadsMap[planDateStr].jumpVolume, playerJumpVol);
        if (plan.pitchSurface) dailyLoadsMap[planDateStr].pitchSurface = plan.pitchSurface;
      }
    } else {
      // Priority 2: Check matching day in Mikroplanung (TW training + Team training)
      const matchingMicroDay = findMicroDayForDate(planDateStr);
      if (matchingMicroDay) {
        const microLoadResult = calculateMicroDayLoad(matchingMicroDay, plan.totalMinutes || plan.totalDuration || 75);
        if (microLoadResult.hasTraining) {
          if (!dailyLoadsMap[planDateStr]) {
            dailyLoadsMap[planDateStr] = {
              date: planDateStr,
              load: microLoadResult.totalLoad,
              durationMinutes: microLoadResult.totalMinutes,
              rpe: microLoadResult.effectiveRpe,
              jumpVolume: playerJumpVol,
              pitchSurface: plan.pitchSurface || 'natural_grass',
              planTitle: plan.title || plan.planTitle || 'Trainingseinheit (gemäß Mikroplanung)',
              planId: plan.id,
              isMatch: false
            };
          } else {
            dailyLoadsMap[planDateStr].load += microLoadResult.totalLoad;
            dailyLoadsMap[planDateStr].durationMinutes += microLoadResult.totalMinutes;
            dailyLoadsMap[planDateStr].rpe = Math.round(((dailyLoadsMap[planDateStr].rpe + microLoadResult.effectiveRpe) / 2) * 10) / 10;
            dailyLoadsMap[planDateStr].jumpVolume = mergeJumpVolume(dailyLoadsMap[planDateStr].jumpVolume, playerJumpVol);
            if (plan.pitchSurface) dailyLoadsMap[planDateStr].pitchSurface = plan.pitchSurface;
          }
          return;
        }
      }

      // Priority 3: Fallback standard load (6.0 RPE)
      const duration = plan.totalMinutes || plan.totalDuration || 75;
      const fallbackRpe = 6;
      const sessionLoad = duration * fallbackRpe;

      if (!dailyLoadsMap[planDateStr]) {
        dailyLoadsMap[planDateStr] = {
          date: planDateStr,
          load: sessionLoad,
          durationMinutes: duration,
          rpe: fallbackRpe,
          jumpVolume: playerJumpVol,
          pitchSurface: plan.pitchSurface || 'natural_grass',
          planTitle: plan.title || plan.planTitle || 'Trainingseinheit',
          planId: plan.id,
          isMatch: false
        };
      } else {
        dailyLoadsMap[planDateStr].load += sessionLoad;
        dailyLoadsMap[planDateStr].durationMinutes += duration;
        dailyLoadsMap[planDateStr].rpe = Math.round(((dailyLoadsMap[planDateStr].rpe + fallbackRpe) / 2) * 10) / 10;
        dailyLoadsMap[planDateStr].jumpVolume = mergeJumpVolume(dailyLoadsMap[planDateStr].jumpVolume, playerJumpVol);
        if (plan.pitchSurface) dailyLoadsMap[planDateStr].pitchSurface = plan.pitchSurface;
      }
    }
  });

  // 1b. Check standalone days from Meso-/Mikroplanung (if no saved plan was created on that date)
  if (mesoPlans && mesoPlans.length > 0) {
    let relevantMeso = mesoPlans;
    if (playerGroupId) {
      const gSpecific = mesoPlans.filter(m => m.groupId === playerGroupId);
      if (gSpecific.length > 0) relevantMeso = gSpecific;
    }

    relevantMeso.forEach(meso => {
      (meso.weeks || []).forEach(week => {
        (week.days || []).forEach(day => {
          const dayDateStr = normalizeToYMD(day.date);
          const dayDate = new Date(dayDateStr);
          dayDate.setHours(12, 0, 0, 0);

          if (dayDate.getTime() > refDate.getTime() || dayDate.getTime() < windowStartDate.getTime()) return;

          // Only add if not already filled by a savedPlan
          if (!dailyLoadsMap[dayDateStr]) {
            // If player was absent/injured on this date, skip (load = 0)
            if (isPlayerAbsentOnDate(playerId, dayDateStr, absences)) return;

            const microLoadResult = calculateMicroDayLoad(day);
            if (microLoadResult.hasTraining) {
              const topicName = day.morningTopic || day.afternoonTopic || 'Einheit';
              dailyLoadsMap[dayDateStr] = {
                date: dayDateStr,
                load: microLoadResult.totalLoad,
                durationMinutes: microLoadResult.totalMinutes,
                rpe: microLoadResult.effectiveRpe,
                planTitle: `Mikroplanung: ${topicName}`,
                isMatch: false
              };
            }
          }
        });
      });
    });
  }

  // 1c. Extract match playtimes for this goalkeeper (Standard Match RPE = 8.0)
  if (matchPlaytimes && matchPlaytimes.length > 0) {
    matchPlaytimes.forEach(match => {
      const matchDateStr = normalizeToYMD(match.date);
      const matchDate = new Date(matchDateStr);
      matchDate.setHours(12, 0, 0, 0);

      if (matchDate.getTime() > refDate.getTime()) return;

      // Check keeper playtime
      let minutes = match.playerMinutes?.[playerId];
      if (minutes === undefined && match.playerMinutes) {
        const matchKey = Object.keys(match.playerMinutes).find(k => k.toLowerCase() === playerName.toLowerCase());
        if (matchKey) minutes = match.playerMinutes[matchKey];
      }

      // Check bench status (explicitly marked as substitute keeper on bench)
      let isBench = match.playerBenchStatus?.[playerId];
      if (isBench === undefined && match.playerBenchStatus) {
        const benchKey = Object.keys(match.playerBenchStatus).find(k => k.toLowerCase() === playerName.toLowerCase());
        if (benchKey) isBench = match.playerBenchStatus[benchKey];
      }

      // If player was absent and did not play active minutes (> 0), skip bench load
      const isAbsent = isPlayerAbsentOnDate(playerId, matchDateStr, absences);
      if (isAbsent && !(minutes !== undefined && minutes > 0)) {
        return;
      }

      if (minutes !== undefined && minutes > 0) {
        // High Match Intensity RPE: 8.0 (Borg CR-10 / Gabbett Benchmark for Match Day)
        const matchRpe = 8;

        if (minutes <= 45) {
          // Substitute Goalkeeper with Short Appearance:
          // Participated in full 35-minute pre-match warm-up (RPE 5.5) + played `minutes` at match intensity (RPE 8.0)
          const warmupMin = 35;
          const warmupRpe = 5.5;
          const totalMin = warmupMin + minutes;
          const combinedLoad = Math.round(warmupMin * warmupRpe + minutes * matchRpe);
          const effectiveRpe = Math.round((combinedLoad / totalMin) * 10) / 10;

          if (!dailyLoadsMap[matchDateStr]) {
            dailyLoadsMap[matchDateStr] = {
              date: matchDateStr,
              load: combinedLoad,
              durationMinutes: totalMin,
              rpe: effectiveRpe,
              planTitle: `⚽ Spiel & Warm-up: ${match.opponent || 'Wettkampf'} (${minutes} Min. Einsatz + 35 Min. Warm-up)`,
              planId: match.id,
              isMatch: true
            };
          } else {
            dailyLoadsMap[matchDateStr].load += combinedLoad;
            dailyLoadsMap[matchDateStr].durationMinutes += totalMin;
            dailyLoadsMap[matchDateStr].planTitle += ` + ⚽ Spiel (${minutes} Min.) & Warm-up`;
            dailyLoadsMap[matchDateStr].isMatch = true;
          }
        } else {
          // Primary Match Starter (> 45 Minutes)
          const matchLoad = minutes * matchRpe;

          if (!dailyLoadsMap[matchDateStr]) {
            dailyLoadsMap[matchDateStr] = {
              date: matchDateStr,
              load: matchLoad,
              durationMinutes: minutes,
              rpe: matchRpe,
              planTitle: `⚽ Spiel: ${match.opponent || 'Wettkampf'} (${match.team || match.location || 'Spiel'})`,
              planId: match.id,
              isMatch: true
            };
          } else {
            dailyLoadsMap[matchDateStr].load += matchLoad;
            dailyLoadsMap[matchDateStr].durationMinutes += minutes;
            dailyLoadsMap[matchDateStr].planTitle += ` + ⚽ Spiel (${minutes} Min)`;
            dailyLoadsMap[matchDateStr].isMatch = true;
          }
        }
      } else if (isBench === true || (isBench === undefined && minutes === 0 && match.playerMinutes && (playerId in match.playerMinutes || (playerName && playerName in match.playerMinutes)))) {
        // Bench Goalkeeper (Ersatztorwart auf der Bank):
        // Vollwertiges Vor-Match-Warmup (Einlaufen, Passspiel, Einschießen, Torschuss, Flanken) mit dem Start-TW
        // + Halbzeit-Aktivierung + mentale Wettkampf-Bereitschaft
        // Sportwissenschaftlicher Standard: 35 Minuten bei RPE 5.5 = ~193 A.U.
        const benchWarmupMinutes = 35;
        const benchWarmupRpe = 5.5;
        const benchLoad = Math.round(benchWarmupMinutes * benchWarmupRpe);

        if (!dailyLoadsMap[matchDateStr]) {
          dailyLoadsMap[matchDateStr] = {
            date: matchDateStr,
            load: benchLoad,
            durationMinutes: benchWarmupMinutes,
            rpe: benchWarmupRpe,
            planTitle: `🧤 Spieltag: Bank & Match-Warm-up (${match.opponent || 'Spiel'})`,
            planId: match.id,
            isMatch: true
          };
        } else {
          dailyLoadsMap[matchDateStr].load += benchLoad;
          dailyLoadsMap[matchDateStr].durationMinutes += benchWarmupMinutes;
          dailyLoadsMap[matchDateStr].planTitle += ` + 🧤 Bank & Warm-up`;
          dailyLoadsMap[matchDateStr].isMatch = true;
        }
      }
    });
  }

  const dailyLoads = Object.values(dailyLoadsMap).sort((a, b) => a.date.localeCompare(b.date));

  // 2. Compute Acute Load (Last 7 days from refDate)
  const sevenDaysAgo = new Date(refDate.getTime());
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  let acuteLoad7d = 0;
  dailyLoads.forEach(d => {
    const entryDate = new Date(d.date);
    entryDate.setHours(12, 0, 0, 0);
    if (entryDate >= sevenDaysAgo && entryDate <= refDate) {
      acuteLoad7d += d.load;
    }
  });

  // 3. Compute Chronic Load (Last 28 days sum / 4)
  const twentyEightDaysAgo = new Date(refDate.getTime());
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 27);
  twentyEightDaysAgo.setHours(0, 0, 0, 0);

  let total28dLoad = 0;
  dailyLoads.forEach(d => {
    const entryDate = new Date(d.date);
    entryDate.setHours(12, 0, 0, 0);
    if (entryDate >= twentyEightDaysAgo && entryDate <= refDate) {
      total28dLoad += d.load;
    }
  });

  // Chronic load is the weekly average of the 4-week window
  // Ensure a minimal baseline (e.g. 300 A.U.) to avoid division by zero or inflated spikes for initial sessions
  const chronicLoad28d = Math.max(300, Math.round(total28dLoad / 4));
  const rawAcwr = acuteLoad7d > 0 ? acuteLoad7d / chronicLoad28d : 0;
  const acwr = Math.round(rawAcwr * 100) / 100;
  const status = classifyACWR(acwr);

  // 4. Build 8-Week Historical Breakdown (from W-(weeksCount-1) to W0)
  const weeklyHistory: WeeklyLoadData[] = [];

  for (let w = weeksCount - 1; w >= 0; w--) {
    const wEnd = new Date(refDate.getTime());
    wEnd.setDate(wEnd.getDate() - w * 7);
    wEnd.setHours(23, 59, 59, 999);

    const wStart = new Date(wEnd.getTime());
    wStart.setDate(wStart.getDate() - 6);
    wStart.setHours(0, 0, 0, 0);

    const wStartStr = normalizeToYMD(wStart.toISOString());
    const wEndStr = normalizeToYMD(wEnd.toISOString());

    let weekLoad = 0;
    let weekMinutes = 0;
    let sessionCount = 0;
    let matchCount = 0;

    dailyLoads.forEach(d => {
      const entryDate = new Date(d.date);
      entryDate.setHours(12, 0, 0, 0);
      if (entryDate >= wStart && entryDate <= wEnd) {
        weekLoad += d.load;
        weekMinutes += d.durationMinutes;
        if (d.isMatch) {
          matchCount++;
        } else {
          sessionCount++;
        }
      }
    });

    // Rolling chronic for that historical week (28 days prior to wEnd)
    const hist28Start = new Date(wEnd.getTime());
    hist28Start.setDate(hist28Start.getDate() - 27);
    hist28Start.setHours(0, 0, 0, 0);

    let hist28Load = 0;
    dailyLoads.forEach(d => {
      const entryDate = new Date(d.date);
      entryDate.setHours(12, 0, 0, 0);
      if (entryDate >= hist28Start && entryDate <= wEnd) {
        hist28Load += d.load;
      }
    });

    const histChronic = Math.max(300, hist28Load / 4);
    const histAcwr = weekLoad > 0 ? Math.round((weekLoad / histChronic) * 100) / 100 : 0;

    // Last day of the 7-day week window formatted as DD.MM.
    const dEndObj = new Date(wEnd);
    const dayFormatted = `${String(dEndObj.getDate()).padStart(2, '0')}.${String(dEndObj.getMonth() + 1).padStart(2, '0')}.`;

    weeklyHistory.push({
      weekIndex: w,
      weekLabel: dayFormatted,
      weekStart: wStartStr,
      weekEnd: wEndStr,
      totalLoad: weekLoad,
      totalMinutes: weekMinutes,
      sessionCount,
      matchCount,
      acwr: histAcwr,
      status: classifyACWR(histAcwr),
      isCurrentWeek: w === 0
    });
  }

  // 5. Compute summary stats
  const past4Weeks = weeklyHistory.slice(-4);
  const avgWeeklyLoad = Math.round(past4Weeks.reduce((acc, curr) => acc + curr.totalLoad, 0) / Math.max(1, past4Weeks.length));
  const monthlyPeakLoad = Math.max(0, ...weeklyHistory.map(w => w.totalLoad));

  // 6. Compute documented weeks count & Cold-Start detector
  const documentedWeeksCount = past4Weeks.filter(w => (w.sessionCount || 0) > 0 || (w.matchCount || 0) > 0 || (w.totalLoad || 0) > 0).length;
  const isColdStart = documentedWeeksCount < 2;

  // 7. Compute Jump Volume 7-Day Summary & Separate Jump-Weighted Joint Load
  let jLow = 0;
  let jMed = 0;
  let jHigh = 0;
  let jumpWeightedAcuteLoad7d = 0;
  let jumpWeightedTotal28dLoad = 0;

  dailyLoads.forEach(d => {
    const entryDate = new Date(d.date);
    entryDate.setHours(12, 0, 0, 0);
    const surfaceMult = PITCH_SURFACE_OPTIONS.find(p => p.id === d.pitchSurface)?.impactFactor ?? 1.0;
    const jBaseMult = d.jumpVolume === 'high' ? 1.6 : d.jumpVolume === 'medium' ? 1.25 : 1.0;
    const jMult = jBaseMult * surfaceMult;
    const jLoad = Math.round(d.load * jMult);

    if (entryDate >= sevenDaysAgo && entryDate <= refDate) {
      jumpWeightedAcuteLoad7d += jLoad;
      if (d.jumpVolume === 'high') jHigh++;
      else if (d.jumpVolume === 'medium') jMed++;
      else if (d.jumpVolume === 'low') jLow++;
    }
    if (entryDate >= twentyEightDaysAgo && entryDate <= refDate) {
      jumpWeightedTotal28dLoad += jLoad;
    }
  });

  const jumpWeightedChronicLoad28d = Math.max(300, Math.round(jumpWeightedTotal28dLoad / 4));
  const jumpWeightedAcwr = jumpWeightedAcuteLoad7d > 0 ? Math.round((jumpWeightedAcuteLoad7d / jumpWeightedChronicLoad28d) * 100) / 100 : 0;
  const jumpWeightedStatus = classifyACWR(jumpWeightedAcwr);

  const jumpVolume7dSummary: 'low' | 'medium' | 'high' | 'none' = 
    jHigh > 0 ? 'high' : (jMed > 0 ? 'medium' : (jLow > 0 ? 'low' : 'none'));

  // 8. Compute EWMA (Exponentially Weighted Moving Average)
  const lambdaA = 2 / (7 + 1); // 0.25
  const lambdaC = 2 / (28 + 1); // 0.0689655
  let ewmaAcute = 0;
  let ewmaChronic = 0;

  // Iterate day by day chronologically across the window
  const curCal = new Date(windowStartDate.getTime());
  while (curCal.getTime() <= refDate.getTime()) {
    const dKey = normalizeToYMD(curCal.toISOString());
    const dayL = dailyLoadsMap[dKey]?.load || 0;

    ewmaAcute = dayL * lambdaA + (1 - lambdaA) * ewmaAcute;
    ewmaChronic = dayL * lambdaC + (1 - lambdaC) * ewmaChronic;

    curCal.setDate(curCal.getDate() + 1);
  }

  const acuteLoadEwma = Math.round(ewmaAcute * 7);
  const chronicLoadEwma = Math.max(300, Math.round(ewmaChronic * 7));
  const acwrEwma = acuteLoadEwma > 0 ? Math.round((acuteLoadEwma / chronicLoadEwma) * 100) / 100 : 0;
  const statusEwma = classifyACWR(acwrEwma);

  return {
    playerId,
    playerName,
    jerseyNumber: player.jerseyNumber,
    acuteLoad7d,
    chronicLoad28d,
    acwr,
    status,
    weeklyHistory,
    dailyLoads,
    avgWeeklyLoad,
    monthlyPeakLoad,
    documentedWeeksCount,
    isColdStart,
    jumpVolume7dSummary,
    jumpVolume7dCount: { low: jLow, medium: jMed, high: jHigh },
    acuteLoadEwma,
    chronicLoadEwma,
    acwrEwma,
    statusEwma,
    jumpWeightedAcuteLoad7d,
    jumpWeightedChronicLoad28d,
    jumpWeightedAcwr,
    jumpWeightedStatus
  };
}

/**
 * Calculates aggregate workload metrics and goalkeeper statuses for an entire training group.
 */
export function calculateGroupWorkload(
  targetGroup: TrainingGroup | null | undefined,
  allGroups: TrainingGroup[],
  savedPlans: TrainingPlan[],
  referenceDate: Date | string = new Date(),
  matchPlaytimes?: PlayerMatchPlaytime[],
  mesoPlans?: MesoPlan[],
  absences?: PlayerAbsence[]
): GroupWorkloadSummary {
  const groupObj = targetGroup || allGroups[0] || null;
  const targetGroupId = groupObj?.id || 'all';
  const targetGroupName = groupObj?.name || 'Alle Torhüter';

  // Get all goalkeepers in this group
  let playersList: Player[] = [];
  if (groupObj && groupObj.players && groupObj.players.length > 0) {
    playersList = groupObj.players;
  } else {
    // Collect from all groups
    const collected: Player[] = [];
    allGroups.forEach(g => {
      (g.players || []).forEach(p => {
        if (!collected.some(x => x.id === p.id)) {
          collected.push(p);
        }
      });
    });
    playersList = collected;
  }

  // Fallback defaults if no players are created yet
  if (playersList.length === 0) {
    playersList = [
      { id: 'tw_1', firstName: 'Torwart', lastName: '1', jerseyNumber: 1 } as Player,
      { id: 'tw_2', firstName: 'Torwart', lastName: '2', jerseyNumber: 12 } as Player,
      { id: 'tw_3', firstName: 'Torwart', lastName: '3', jerseyNumber: 22 } as Player
    ];
  }

  // Calculate workload for every keeper
  const playersWorkloads = playersList.map(p => calculatePlayerWorkload(p, savedPlans, referenceDate, 8, matchPlaytimes, mesoPlans, absences));

  const hasDangerSpike = playersWorkloads.some(p => p.status === 'danger');
  const hasWarning = playersWorkloads.some(p => p.status === 'warning');

  // Cold Start Detection for the group: true if majority of goalkeepers have < 2 documented weeks
  const isColdStart = playersWorkloads.length === 0 || playersWorkloads.filter(p => p.isColdStart).length >= Math.ceil(playersWorkloads.length / 2);

  // Jump Volume 7d Summary for group
  const teamHasHighJump = playersWorkloads.some(p => p.jumpVolume7dSummary === 'high');
  const teamHasMedJump = playersWorkloads.some(p => p.jumpVolume7dSummary === 'medium');
  const teamHasLowJump = playersWorkloads.some(p => p.jumpVolume7dSummary === 'low');
  const teamJumpVolume7dSummary: 'low' | 'medium' | 'high' | 'none' =
    teamHasHighJump ? 'high' : (teamHasMedJump ? 'medium' : (teamHasLowJump ? 'low' : 'none'));

  // Team averages
  const teamAvgAcuteLoad = Math.round(playersWorkloads.reduce((acc, p) => acc + p.acuteLoad7d, 0) / Math.max(1, playersWorkloads.length));
  const teamAvgChronicLoad = Math.round(playersWorkloads.reduce((acc, p) => acc + p.chronicLoad28d, 0) / Math.max(1, playersWorkloads.length));
  const teamAvgAcwr = teamAvgChronicLoad > 0 ? Math.round((teamAvgAcuteLoad / teamAvgChronicLoad) * 100) / 100 : 0;
  const teamStatus = classifyACWR(teamAvgAcwr);

  // Compute team average weekly history
  const teamWeeklyHistory: WeeklyLoadData[] = [];
  if (playersWorkloads.length > 0) {
    const weeksCount = playersWorkloads[0].weeklyHistory.length;
    for (let i = 0; i < weeksCount; i++) {
      const sample = playersWorkloads[0].weeklyHistory[i];
      const totalLoad = Math.round(playersWorkloads.reduce((acc, p) => acc + (p.weeklyHistory[i]?.totalLoad || 0), 0) / playersWorkloads.length);
      const totalMinutes = Math.round(playersWorkloads.reduce((acc, p) => acc + (p.weeklyHistory[i]?.totalMinutes || 0), 0) / playersWorkloads.length);
      const sessionCount = Math.round(playersWorkloads.reduce((acc, p) => acc + (p.weeklyHistory[i]?.sessionCount || 0), 0) / playersWorkloads.length);
      const matchCount = Math.round(playersWorkloads.reduce((acc, p) => acc + (p.weeklyHistory[i]?.matchCount || 0), 0) / playersWorkloads.length);
      const acwr = Math.round((playersWorkloads.reduce((acc, p) => acc + (p.weeklyHistory[i]?.acwr || 0), 0) / playersWorkloads.length) * 100) / 100;

      teamWeeklyHistory.push({
        ...sample,
        totalLoad,
        totalMinutes,
        sessionCount,
        matchCount,
        acwr,
        status: classifyACWR(acwr)
      });
    }
  }

  // Team EWMA averages
  const teamAvgAcuteLoadEwma = Math.round(playersWorkloads.reduce((acc, p) => acc + (p.acuteLoadEwma || 0), 0) / Math.max(1, playersWorkloads.length));
  const teamAvgChronicLoadEwma = Math.round(playersWorkloads.reduce((acc, p) => acc + (p.chronicLoadEwma || 0), 0) / Math.max(1, playersWorkloads.length));
  const teamAvgAcwrEwma = teamAvgChronicLoadEwma > 0 ? Math.round((teamAvgAcuteLoadEwma / teamAvgChronicLoadEwma) * 100) / 100 : 0;
  const teamStatusEwma = classifyACWR(teamAvgAcwrEwma);

  // Team Jump-weighted joint-load averages
  const teamAvgJumpWeightedAcuteLoad = Math.round(playersWorkloads.reduce((acc, p) => acc + (p.jumpWeightedAcuteLoad7d || 0), 0) / Math.max(1, playersWorkloads.length));
  const teamAvgJumpWeightedChronicLoad = Math.round(playersWorkloads.reduce((acc, p) => acc + (p.jumpWeightedChronicLoad28d || 0), 0) / Math.max(1, playersWorkloads.length));
  const teamAvgJumpWeightedAcwr = teamAvgJumpWeightedChronicLoad > 0 ? Math.round((teamAvgJumpWeightedAcuteLoad / teamAvgJumpWeightedChronicLoad) * 100) / 100 : 0;
  const teamJumpWeightedStatus = classifyACWR(teamAvgJumpWeightedAcwr);

  return {
    targetGroupId,
    targetGroupName,
    players: playersWorkloads,
    hasDangerSpike,
    hasWarning,
    isColdStart,
    teamAvgAcuteLoad,
    teamAvgChronicLoad,
    teamAvgAcwr,
    teamStatus,
    teamWeeklyHistory,
    teamJumpVolume7dSummary,
    teamAvgAcuteLoadEwma,
    teamAvgChronicLoadEwma,
    teamAvgAcwrEwma,
    teamStatusEwma,
    teamAvgJumpWeightedAcuteLoad,
    teamAvgJumpWeightedChronicLoad,
    teamAvgJumpWeightedAcwr,
    teamJumpWeightedStatus
  };
}

/**
  * Calculates full-season weekly workload and ACWR curve for a single goalkeeper (July to June).
  * 52 weeks mapped chronologically across the 12 season months.
  */
export function calculatePlayerSeasonWorkload(
  player: { id: string; firstName?: string; lastName?: string; name?: string; jerseyNumber?: number | string; groupId?: string },
  savedPlans: TrainingPlan[] = [],
  matchPlaytimes: PlayerMatchPlaytime[] = [],
  seasonStartYearInput?: number,
  absences: PlayerAbsence[] = []
): PlayerSeasonWorkload {
  const playerId = player.id;
  const playerName = player.name || `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Torwart';
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed (6 = July)
  const defaultSeasonStartYear = currentMonth >= 6 ? currentYear : currentYear - 1;
  const seasonStartYear = seasonStartYearInput || defaultSeasonStartYear;
  const seasonLabel = `${seasonStartYear}/${seasonStartYear + 1}`;

  // Season window: July 1 of seasonStartYear to June 30 of seasonStartYear + 1
  const seasonStartDate = new Date(seasonStartYear, 6, 1, 0, 0, 0, 0);
  const seasonEndDate = new Date(seasonStartYear + 1, 5, 30, 23, 59, 59, 999);

  // Baseline window starts 28 days before July 1
  const baselineStartDate = new Date(seasonStartDate.getTime() - 28 * 24 * 60 * 60 * 1000);

  // 1. Build Daily Loads Map for the player across the full season
  const dailyLoadsMap: Record<string, DailyLoadEntry> = {};

  const mergeJumpVolume = (existing?: string, next?: string): 'low' | 'medium' | 'high' | undefined => {
    if (existing === 'high' || next === 'high') return 'high';
    if (existing === 'medium' || next === 'medium') return 'medium';
    if (existing === 'low' || next === 'low') return 'low';
    return undefined;
  };

  // 1a. Saved Plans
  savedPlans.forEach(plan => {
    if (plan.isArchived) return;
    const planDateStr = normalizeToYMD(plan.date || plan.planDate);
    const planDate = new Date(planDateStr);
    planDate.setHours(12, 0, 0, 0);

    if (planDate.getTime() < baselineStartDate.getTime() || planDate.getTime() > seasonEndDate.getTime()) return;

    // Check if player was absent/injured on this date
    const isAbsent = isPlayerAbsentOnDate(playerId, planDateStr, absences);

    const playerJumpVol = plan.keeperJumpVolumes?.[playerId]
      || (plan.keeperJumpVolumes && Object.keys(plan.keeperJumpVolumes).find(k => k.toLowerCase() === playerName.toLowerCase()) ? plan.keeperJumpVolumes[Object.keys(plan.keeperJumpVolumes).find(k => k.toLowerCase() === playerName.toLowerCase())!] : undefined)
      || (plan.jumpVolume as 'low' | 'medium' | 'high' | undefined);

    let debriefRpe = plan.keeperLoadRatings?.[playerId];
    if (debriefRpe === undefined && plan.keeperLoadRatings) {
      const matchKey = Object.keys(plan.keeperLoadRatings).find(k => k.toLowerCase() === playerName.toLowerCase());
      if (matchKey) debriefRpe = plan.keeperLoadRatings[matchKey];
    }

    // If player was absent and has NO explicit debrief rating > 0, their training load is 0 (skip)
    if (isAbsent && !(debriefRpe !== undefined && debriefRpe > 0)) {
      return;
    }

    const duration = plan.totalMinutes || plan.totalDuration || 75;
    const rpe = debriefRpe !== undefined && debriefRpe > 0 ? debriefRpe : 6;
    const sessionLoad = duration * rpe;

    if (!dailyLoadsMap[planDateStr]) {
      dailyLoadsMap[planDateStr] = {
        date: planDateStr,
        load: sessionLoad,
        durationMinutes: duration,
        rpe,
        jumpVolume: playerJumpVol,
        pitchSurface: plan.pitchSurface || 'natural_grass',
        planTitle: plan.title || plan.planTitle || 'Trainingseinheit',
        planId: plan.id,
        isMatch: false
      };
    } else {
      dailyLoadsMap[planDateStr].load += sessionLoad;
      dailyLoadsMap[planDateStr].durationMinutes += duration;
      dailyLoadsMap[planDateStr].rpe = Math.round(((dailyLoadsMap[planDateStr].rpe + rpe) / 2) * 10) / 10;
      dailyLoadsMap[planDateStr].jumpVolume = mergeJumpVolume(dailyLoadsMap[planDateStr].jumpVolume, playerJumpVol);
    }
  });

  // 1b. Match Playtimes
  matchPlaytimes.forEach(match => {
    const matchDateStr = normalizeToYMD(match.date);
    const matchDate = new Date(matchDateStr);
    matchDate.setHours(12, 0, 0, 0);

    if (matchDate.getTime() < baselineStartDate.getTime() || matchDate.getTime() > seasonEndDate.getTime()) return;

    let minutes = match.playerMinutes?.[playerId];
    if (minutes === undefined && match.playerMinutes) {
      const matchKey = Object.keys(match.playerMinutes).find(k => k.toLowerCase() === playerName.toLowerCase());
      if (matchKey) minutes = match.playerMinutes[matchKey];
    }

    let isBench = match.playerBenchStatus?.[playerId];
    if (isBench === undefined && match.playerBenchStatus) {
      const benchKey = Object.keys(match.playerBenchStatus).find(k => k.toLowerCase() === playerName.toLowerCase());
      if (benchKey) isBench = match.playerBenchStatus[benchKey];
    }

    // If player was absent and did not play active minutes (> 0), skip bench load
    const isAbsent = isPlayerAbsentOnDate(playerId, matchDateStr, absences);
    if (isAbsent && !(minutes !== undefined && minutes > 0)) {
      return;
    }

    if (minutes !== undefined && minutes > 0) {
      const matchRpe = 8;
      if (minutes <= 45) {
        const warmupMin = 35;
        const warmupRpe = 5.5;
        const totalMin = warmupMin + minutes;
        const combinedLoad = Math.round(warmupMin * warmupRpe + minutes * matchRpe);
        const effectiveRpe = Math.round((combinedLoad / totalMin) * 10) / 10;

        if (!dailyLoadsMap[matchDateStr]) {
          dailyLoadsMap[matchDateStr] = {
            date: matchDateStr,
            load: combinedLoad,
            durationMinutes: totalMin,
            rpe: effectiveRpe,
            planTitle: `⚽ Spiel & Warm-up: ${match.opponent || 'Wettkampf'} (${minutes} Min.)`,
            planId: match.id,
            isMatch: true
          };
        } else {
          dailyLoadsMap[matchDateStr].load += combinedLoad;
          dailyLoadsMap[matchDateStr].durationMinutes += totalMin;
          dailyLoadsMap[matchDateStr].isMatch = true;
        }
      } else {
        const matchLoad = minutes * matchRpe;
        if (!dailyLoadsMap[matchDateStr]) {
          dailyLoadsMap[matchDateStr] = {
            date: matchDateStr,
            load: matchLoad,
            durationMinutes: minutes,
            rpe: matchRpe,
            planTitle: `⚽ Spiel: ${match.opponent || 'Wettkampf'} (${minutes} Min.)`,
            planId: match.id,
            isMatch: true
          };
        } else {
          dailyLoadsMap[matchDateStr].load += matchLoad;
          dailyLoadsMap[matchDateStr].durationMinutes += minutes;
          dailyLoadsMap[matchDateStr].isMatch = true;
        }
      }
    } else if (isBench === true || (isBench === undefined && minutes === 0 && match.playerMinutes && (playerId in match.playerMinutes || (playerName && playerName in match.playerMinutes)))) {
      const benchWarmupMinutes = 35;
      const benchWarmupRpe = 5.5;
      const benchLoad = Math.round(benchWarmupMinutes * benchWarmupRpe);

      if (!dailyLoadsMap[matchDateStr]) {
        dailyLoadsMap[matchDateStr] = {
          date: matchDateStr,
          load: benchLoad,
          durationMinutes: benchWarmupMinutes,
          rpe: benchWarmupRpe,
          planTitle: `🧤 Bank & Warm-up (${match.opponent || 'Spiel'})`,
          planId: match.id,
          isMatch: true
        };
      } else {
        dailyLoadsMap[matchDateStr].load += benchLoad;
        dailyLoadsMap[matchDateStr].durationMinutes += benchWarmupMinutes;
        dailyLoadsMap[matchDateStr].isMatch = true;
      }
    }
  });

  const dailyLoads = Object.values(dailyLoadsMap).sort((a, b) => a.date.localeCompare(b.date));

  // 2. Build 52 Weekly Slices from July 1st to June 30th
  const MONTH_NAMES = ['Juli', 'August', 'September', 'Oktober', 'November', 'Dezember', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni'];
  const weeks: SeasonWeeklyLoadData[] = [];
  const todayTime = now.getTime();

  let totalSeasonMinutes = 0;
  let totalSeasonSessions = 0;
  let totalSeasonMatches = 0;
  let currentWeekIndex = 0;

  for (let w = 0; w < 52; w++) {
    const wStartDate = new Date(seasonStartYear, 6, 1 + w * 7, 0, 0, 0, 0);
    const wEndDate = new Date(seasonStartYear, 6, 1 + w * 7 + 6, 23, 59, 59, 999);
    
    const wStartYMD = `${wStartDate.getFullYear()}-${String(wStartDate.getMonth() + 1).padStart(2, '0')}-${String(wStartDate.getDate()).padStart(2, '0')}`;
    const wEndYMD = `${wEndDate.getFullYear()}-${String(wEndDate.getMonth() + 1).padStart(2, '0')}-${String(wEndDate.getDate()).padStart(2, '0')}`;

    const m = wStartDate.getMonth(); // 6=July, ..., 11=Dec, 0=Jan, ..., 5=Jun
    const seasonMonthIndex = m >= 6 ? m - 6 : m + 6;
    const monthLabel = MONTH_NAMES[seasonMonthIndex] || 'Monat';

    // Sum loads in [wStartDate, wEndDate]
    let weekTotalLoad = 0;
    let weekTotalMinutes = 0;
    let sessionCount = 0;
    let matchCount = 0;

    dailyLoads.forEach(d => {
      const dDate = new Date(d.date);
      dDate.setHours(12, 0, 0, 0);
      if (dDate >= wStartDate && dDate <= wEndDate) {
        weekTotalLoad += d.load;
        weekTotalMinutes += d.durationMinutes;
        if (d.isMatch) matchCount++;
        else sessionCount++;
      }
    });

    const avgDailyLoad = Math.round(weekTotalLoad / 7);

    // Compute Chronic Load (28-day rolling window ending at wEndDate)
    const twentyEightDaysAgo = new Date(wEndDate.getTime() - 27 * 24 * 60 * 60 * 1000);
    let total28dLoad = 0;
    dailyLoads.forEach(d => {
      const dDate = new Date(d.date);
      dDate.setHours(12, 0, 0, 0);
      if (dDate >= twentyEightDaysAgo && dDate <= wEndDate) {
        total28dLoad += d.load;
      }
    });

    const chronicLoad = Math.max(300, Math.round(total28dLoad / 4));
    const acuteLoad = weekTotalLoad;
    const rawAcwr = acuteLoad > 0 ? acuteLoad / chronicLoad : 0;
    const acwr = Math.round(rawAcwr * 100) / 100;
    const status = classifyACWR(acwr);

    const isFuture = wStartDate.getTime() > todayTime;
    const isCurrentWeek = todayTime >= wStartDate.getTime() && todayTime <= wEndDate.getTime();

    if (isCurrentWeek) {
      currentWeekIndex = w;
    } else if (!isFuture && currentWeekIndex === 0) {
      currentWeekIndex = w;
    }

    if (!isFuture) {
      totalSeasonMinutes += weekTotalMinutes;
      totalSeasonSessions += sessionCount;
      totalSeasonMatches += matchCount;
    }

    weeks.push({
      weekIndex: w,
      weekNumber: w + 1,
      weekStart: wStartYMD,
      weekEnd: wEndYMD,
      seasonMonthIndex,
      monthLabel,
      totalLoad: weekTotalLoad,
      avgDailyLoad,
      acuteLoad,
      chronicLoad,
      acwr,
      status,
      sessionCount,
      matchCount,
      totalMinutes: weekTotalMinutes,
      isFuture,
      isCurrentWeek
    });
  }

  const activeWeeks = weeks.filter(w => !w.isFuture);
  const documentedWeeks = activeWeeks.filter(w => w.totalLoad > 0);
  const documentedWeeksCount = documentedWeeks.length;

  const currentWeekObj = weeks[currentWeekIndex] || activeWeeks[activeWeeks.length - 1] || weeks[0];
  const currentAcwr = currentWeekObj.acwr;
  const currentStatus = currentWeekObj.status;
  const currentAvgDailyLoad = currentWeekObj.avgDailyLoad;
  const currentWeeklyLoad = currentWeekObj.totalLoad;

  const seasonPeakWeeklyLoad = Math.max(0, ...activeWeeks.map(w => w.totalLoad));
  const seasonPeakDailyAvgLoad = Math.max(0, ...activeWeeks.map(w => w.avgDailyLoad));

  const seasonAvgWeeklyLoad = documentedWeeksCount > 0
    ? Math.round(documentedWeeks.reduce((acc, w) => acc + w.totalLoad, 0) / documentedWeeksCount)
    : (activeWeeks.length > 0 ? Math.round(activeWeeks.reduce((acc, w) => acc + w.totalLoad, 0) / activeWeeks.length) : 0);
  
  const seasonAvgDailyLoad = Math.round(seasonAvgWeeklyLoad / 7);

  return {
    playerId,
    playerName,
    seasonLabel,
    seasonStartYear,
    weeks,
    currentWeekIndex,
    currentAcwr,
    currentStatus,
    currentAvgDailyLoad,
    currentWeeklyLoad,
    seasonPeakWeeklyLoad,
    seasonPeakDailyAvgLoad,
    seasonAvgWeeklyLoad,
    seasonAvgDailyLoad,
    totalSeasonMinutes,
    totalSeasonSessions,
    totalSeasonMatches,
    documentedWeeksCount
  };
}
