import React, { useState, useMemo, useCallback } from 'react';
import type {
  TrainingGroup,
  PlayerAbsence,
  PlayerEvaluation,
  PlayerFeedbackTalk,
  TrainingPlan,
  Exercise,
  PlayerMatchPlaytime
} from '../../types';
import { SKILL_DEFINITIONS } from '../../types';
import {
  Users,
  CalendarCheck,
  Award,
  Target,
  FileDown,
  User,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Loader2,
  Search,
  X,
  Tag,
  Sparkles,
  Dna,
  Scale
} from 'lucide-react';
import { RadarChart, type RadarAxis, type RadarSeries } from '../RadarChart';
import {
  getScaleRatingLabel,
  TECHNIQUE_GROUP_CONFIG
} from './statsConfig';
import { evaluateAllAthleticTests } from '../../utils/athleticNormEvaluation';
import { getClosestBiologicalEvaluation } from '../../utils/biologicalMaturity';
import { generatePlayerEvaluationPDF } from '../../utils/playerEvaluationPdfExport';
import { MatchAnalysisSection } from './MatchAnalysisSection';
import { AttendanceStatsSection } from './AttendanceStatsSection';
import { PlayerWorkloadSeasonSection } from './PlayerWorkloadSeasonSection';
import { cn } from '../../utils/cn';

interface PlayerDiagnosticsCardProps {
  groups: TrainingGroup[];
  absences?: PlayerAbsence[];
  evaluations?: PlayerEvaluation[];
  feedbackTalks?: PlayerFeedbackTalk[];
  savedPlans?: TrainingPlan[];
  exercises?: Exercise[];
  matchPlaytimes?: PlayerMatchPlaytime[];
}

const createRadarSeries = (
  id: string,
  name: string,
  colorHex: string,
  data: Record<string, number>,
  fillOpacity = 0.25
): RadarSeries => {
  let fillColor = colorHex;
  if (colorHex.startsWith('#') && colorHex.length === 7) {
    const alphaHex = Math.round(fillOpacity * 255).toString(16).padStart(2, '0');
    fillColor = `${colorHex}${alphaHex}`;
  }
  return {
    id,
    name,
    color: colorHex,
    fillColor,
    strokeColor: colorHex,
    data
  };
};

export const PlayerDiagnosticsCard: React.FC<PlayerDiagnosticsCardProps> = ({
  groups,
  absences = [],
  evaluations = [],
  feedbackTalks = [],
  savedPlans = [],
  exercises = [],
  matchPlaytimes = []
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => groups[0]?.id || '');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(() => groups[0]?.players?.[0]?.id || '');

  const [openPlayerCards, setOpenPlayerCards] = useState<{
    anwesenheit: boolean;
    feedback: boolean;
    bewertung: boolean;
  }>({
    anwesenheit: false,
    feedback: false,
    bewertung: false
  });

  const [activePlayerEvaluationTab, setActivePlayerEvaluationTab] = useState<'Technik' | 'Taktik' | 'Mental' | 'Athletik'>('Technik');

  const [compareTechEvalId1, setCompareTechEvalId1] = useState<string>('');
  const [compareTechEvalId2, setCompareTechEvalId2] = useState<string>('');
  const [compareTactEvalId1, setCompareTactEvalId1] = useState<string>('');
  const [compareTactEvalId2, setCompareTactEvalId2] = useState<string>('');
  const [compareMenEvalId1, setCompareMenEvalId1] = useState<string>('');
  const [compareMenEvalId2, setCompareMenEvalId2] = useState<string>('');
  const [compareAthEvalId1, setCompareAthEvalId1] = useState<string>('');
  const [compareAthEvalId2, setCompareAthEvalId2] = useState<string>('');

  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const togglePlayerCard = (card: 'anwesenheit' | 'feedback' | 'bewertung') => {
    setOpenPlayerCards(prev => ({ ...prev, [card]: !prev[card] }));
  };

  const selectedGroup = useMemo(() => {
    return groups.find(g => g.id === selectedGroupId) || groups[0];
  }, [groups, selectedGroupId]);

  const groupPlayers = useMemo(() => {
    if (!selectedGroup) return [];
    return (selectedGroup.players || []).filter(p => !p.archived);
  }, [selectedGroup]);

  const activeSelectedPlayerObj = useMemo(() => {
    if (!selectedGroup) return null;
    const player = groupPlayers.find(p => p.id === selectedPlayerId);
    return player ? { player, group: selectedGroup } : null;
  }, [selectedGroup, groupPlayers, selectedPlayerId]);

  const playerGroupPlans = useMemo(() => {
    if (!selectedGroupId) return [];
    return savedPlans.filter(p => (p as any).groupId === selectedGroupId || (p as any).trainingGroupId === selectedGroupId || p.targetGroup === selectedGroup?.name);
  }, [savedPlans, selectedGroupId, selectedGroup]);

  const filteredAbsences = useMemo(() => {
    if (!selectedPlayerId) return [];
    return absences.filter(a => a.playerId === selectedPlayerId);
  }, [absences, selectedPlayerId]);

  const absenceDatesSet = useMemo(() => {
    const set = new Set<string>();
    filteredAbsences.forEach(a => {
      if (a.isRecurring && a.recurringWeekday !== undefined) {
        const startStr = a.startDate || '2020-01-01';
        const endStr = a.endDate || '2035-12-31';
        const cur = new Date(startStr);
        const end = new Date(endStr);
        if (!isNaN(cur.getTime()) && !isNaN(end.getTime())) {
          while (cur <= end) {
            if (cur.getDay() === Number(a.recurringWeekday)) {
              set.add(cur.toISOString().split('T')[0]);
            }
            cur.setDate(cur.getDate() + 1);
          }
        }
        return;
      }

      const cur = new Date(a.startDate || '');
      const end = new Date(a.endDate || a.startDate || '');
      if (isNaN(cur.getTime()) || isNaN(end.getTime())) return;
      while (cur <= end) {
        set.add(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return set;
  }, [filteredAbsences]);

  const attendedPlansCount = useMemo(() => {
    return playerGroupPlans.filter(p => {
      const pDate = p.date ? new Date(p.date).toISOString().split('T')[0] : '';
      return pDate && !absenceDatesSet.has(pDate);
    }).length;
  }, [playerGroupPlans, absenceDatesSet]);

  const playerFeedbackTalks = useMemo(() => {
    if (!selectedPlayerId) return [];
    return feedbackTalks.filter(t => t.playerId === selectedPlayerId)
      .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
  }, [feedbackTalks, selectedPlayerId]);

  // Insights from historical training sessions (from "Einheit nachbereiten" / plan.keeperInsights)
  const [insightSearchTerm, setInsightSearchTerm] = useState<string>('');

  const playerTrainingInsights = useMemo(() => {
    if (!selectedPlayerId) return [];
    const list: {
      planId: string;
      planTitle: string;
      planDate: string;
      trainerName?: string;
      text: string;
      createdAt?: number;
      rawDate?: string;
    }[] = [];

    const player = activeSelectedPlayerObj?.player;
    const pIdNorm = (selectedPlayerId || '').trim().toLowerCase();
    const pFullName = player ? `${player.firstName} ${player.lastName}`.trim().toLowerCase() : '';
    const pReverseName = player ? `${player.lastName} ${player.firstName}`.trim().toLowerCase() : '';
    const pFirstOnly = player ? (player.firstName || '').trim().toLowerCase() : '';

    (savedPlans || []).forEach(plan => {
      let insightText = '';

      // 1. Direct plan.keeperInsights match
      if (plan.keeperInsights && typeof plan.keeperInsights === 'object') {
        if (plan.keeperInsights[selectedPlayerId]?.trim()) {
          insightText = plan.keeperInsights[selectedPlayerId].trim();
        } else if (player) {
          for (const [k, v] of Object.entries(plan.keeperInsights)) {
            if (!v || !v.trim()) continue;
            const normKey = k.trim().toLowerCase();
            if (
              normKey === pIdNorm ||
              normKey === pFullName ||
              normKey === pReverseName ||
              (pFirstOnly.length > 2 && normKey === pFirstOnly)
            ) {
              insightText = v.trim();
              break;
            }
          }
        }
      }

      // 2. Alternative fields check
      if (!insightText) {
        const altFields = [
          (plan as any).keeperNotes,
          (plan as any).individualInsights,
          (plan as any).keeperDebriefs
        ];
        for (const field of altFields) {
          if (field && typeof field === 'object') {
            if (field[selectedPlayerId]?.trim()) {
              insightText = field[selectedPlayerId].trim();
              break;
            }
            if (player) {
              for (const [k, v] of Object.entries(field as Record<string, string>)) {
                if (!v || !v.trim()) continue;
                const normKey = k.trim().toLowerCase();
                if (normKey === pIdNorm || normKey === pFullName || normKey === pReverseName) {
                  insightText = v.trim();
                  break;
                }
              }
            }
          }
        }
      }

      if (insightText) {
        const rawDate = (plan.date || plan.planDate || '').trim();
        list.push({
          planId: plan.id || `${plan.date}-${plan.title}`,
          planTitle: plan.title || plan.planTitle || 'Torwart-Trainingseinheit',
          planDate: rawDate || 'Kein Datum',
          rawDate,
          trainerName: plan.debriefedByTrainer || plan.trainerName || 'Trainer',
          text: insightText,
          createdAt: plan.createdAt
        });
      }
    });

    // Sort: newest first
    return list.sort((a, b) => {
      const dateToTimestamp = (dStr: string) => {
        if (!dStr) return 0;
        const parts = dStr.split('.');
        if (parts.length === 3) {
          return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime() || 0;
        }
        return new Date(dStr).getTime() || 0;
      };
      const timeA = a.createdAt || dateToTimestamp(a.rawDate || a.planDate);
      const timeB = b.createdAt || dateToTimestamp(b.rawDate || b.planDate);
      if (timeA && timeB && timeA !== timeB) return timeB - timeA;
      return b.planDate.localeCompare(a.planDate);
    });
  }, [savedPlans, selectedPlayerId, activeSelectedPlayerObj]);

  const filteredTrainingInsights = useMemo(() => {
    if (!insightSearchTerm.trim()) return playerTrainingInsights;
    const term = insightSearchTerm.toLowerCase().trim();
    return playerTrainingInsights.filter(i =>
      i.text.toLowerCase().includes(term) ||
      i.planTitle.toLowerCase().includes(term) ||
      i.planDate.toLowerCase().includes(term) ||
      (i.trainerName && i.trainerName.toLowerCase().includes(term))
    );
  }, [playerTrainingInsights, insightSearchTerm]);

  // Evaluations by Category for the selected keeper
  const playerTechnikHistory = useMemo(() => {
    if (!selectedPlayerId) return [];
    return evaluations.filter(e => e.playerId === selectedPlayerId && e.category === 'Technik')
      .sort((a, b) => new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime());
  }, [evaluations, selectedPlayerId]);

  const playerTaktikHistory = useMemo(() => {
    if (!selectedPlayerId) return [];
    return evaluations.filter(e => e.playerId === selectedPlayerId && e.category === 'Taktik')
      .sort((a, b) => new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime());
  }, [evaluations, selectedPlayerId]);

  const playerMentalHistory = useMemo(() => {
    if (!selectedPlayerId) return [];
    return evaluations.filter(e => e.playerId === selectedPlayerId && e.category === 'Mental')
      .sort((a, b) => new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime());
  }, [evaluations, selectedPlayerId]);

  const playerBioMetrics = useMemo(() => {
    if (!selectedPlayerId) return undefined;
    const latestWithBio = evaluations
      .filter(e => e.playerId === selectedPlayerId && e.category === 'Athletik' && e.biologicalMetrics && (e.biologicalMetrics.standingHeightCm || e.biologicalMetrics.phvClassification || e.biologicalMetrics.weightKg))
      .sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0))[0];
    return latestWithBio?.biologicalMetrics;
  }, [evaluations, selectedPlayerId]);

  const getAthleticScoresFromEval = useCallback((evaluation?: PlayerEvaluation) => {
    if (!evaluation || !evaluation.athleticMetrics) return {};
    const birthYear = activeSelectedPlayerObj?.player?.birthYear;
    const testDate = evaluation.athleticMetrics.testDate || evaluation.updatedAt;
    const matchedBio = getClosestBiologicalEvaluation(evaluations, selectedPlayerId, testDate)?.biologicalMetrics;
    const bioMetrics = evaluation.biologicalMetrics || matchedBio || playerBioMetrics;
    const res = evaluateAllAthleticTests(
      evaluation.athleticMetrics,
      bioMetrics,
      birthYear
    );
    const scores: Record<string, number> = {};
    if (res && res.items) {
      res.items.forEach(item => {
        scores[item.id] = item.score;
      });
    }
    return scores;
  }, [activeSelectedPlayerObj, playerBioMetrics, evaluations, selectedPlayerId]);

  const playerAthletikHistory = useMemo(() => {
    if (!selectedPlayerId) return [];
    return evaluations
      .filter(e => e.playerId === selectedPlayerId && e.category === 'Athletik' && e.athleticMetrics && Object.values(e.athleticMetrics).some(Boolean))
      .filter(e => {
        const scores = getAthleticScoresFromEval(e);
        const validScores = Object.values(scores).filter((v): v is number => typeof v === 'number' && v > 0);
        return validScores.length > 0;
      })
      .sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
  }, [evaluations, selectedPlayerId, getAthleticScoresFromEval]);

  const playerCategoryScores = useMemo(() => {
    const map: Record<string, { avg: number; count: number; totalCount: number }> = {};
    const cats = ['Technik', 'Taktik', 'Mental', 'Athletik'] as const;

    cats.forEach(cat => {
      if (cat === 'Athletik') {
        const latest = playerAthletikHistory[0];
        const scores = getAthleticScoresFromEval(latest);
        const sVals = Object.values(scores).filter((v): v is number => typeof v === 'number' && v > 0);
        const avg = sVals.length > 0 ? sVals.reduce((a, b) => a + b, 0) / sVals.length : 0;
        map[cat] = {
          avg,
          count: sVals.length,
          totalCount: 9
        };
      } else {
        const hist = cat === 'Technik' ? playerTechnikHistory : cat === 'Taktik' ? playerTaktikHistory : playerMentalHistory;
        const latest = hist[0];
        const ratings = latest?.ratings || {};
        const rVals = Object.values(ratings).filter((v): v is number => typeof v === 'number' && v > 0);
        const avg = rVals.length > 0 ? rVals.reduce((a, b) => a + b, 0) / rVals.length : 0;
        const totalCount = (SKILL_DEFINITIONS[cat] || []).length;
        map[cat] = {
          avg,
          count: rVals.length,
          totalCount
        };
      }
    });

    return map;
  }, [playerTechnikHistory, playerTaktikHistory, playerMentalHistory, playerAthletikHistory, getAthleticScoresFromEval]);

  const overallAvgRating = useMemo(() => {
    const activeEntries = Object.values(playerCategoryScores).filter(c => c.count > 0);
    if (activeEntries.length === 0) return null;
    let totalSum = 0;
    let totalCount = 0;
    activeEntries.forEach(entry => {
      totalSum += entry.avg * entry.count;
      totalCount += entry.count;
    });
    return totalCount > 0 ? totalSum / totalCount : null;
  }, [playerCategoryScores]);

  // Radar Axes & Series for Technik
  const techCategoryAxes = useMemo<RadarAxis[]>(() => {
    return Object.keys(TECHNIQUE_GROUP_CONFIG).map(g => ({
      key: g,
      label: TECHNIQUE_GROUP_CONFIG[g]?.label || g,
      max: 5
    }));
  }, []);

  const techCategorySeries = useMemo<RadarSeries[]>(() => {
    const latest = playerTechnikHistory[0];
    const ratings = latest?.ratings || {};
    const groupAverages: Record<string, number> = {};

    Object.keys(TECHNIQUE_GROUP_CONFIG).forEach(gKey => {
      const skillsInGrp = (SKILL_DEFINITIONS.Technik || []).filter(s => s.group === gKey);
      const validScores = skillsInGrp
        .map(s => ratings[s.id])
        .filter((v): v is number => typeof v === 'number' && v > 0);

      groupAverages[gKey] = validScores.length > 0
        ? validScores.reduce((a, b) => a + b, 0) / validScores.length
        : 0;
    });

    const dStr = latest ? new Date(latest.updatedAt || '').toLocaleDateString('de-DE') : 'Aktuell';
    return [createRadarSeries("tech-cat", `${dStr} (Stand)`, "#10b981", groupAverages, 0.25)];
  }, [playerTechnikHistory]);

  const tech30Axes = useMemo<RadarAxis[]>(() => {
    return (SKILL_DEFINITIONS.Technik || []).map(t => ({
      key: t.id,
      label: t.name,
      max: 5
    }));
  }, []);

  const tech30CurrentSeries = useMemo<RadarSeries[]>(() => {
    const latest = playerTechnikHistory[0];
    const ratings = latest?.ratings || {};
    const data30: Record<string, number> = {};
    (SKILL_DEFINITIONS.Technik || []).forEach(t => {
      data30[t.id] = ratings[t.id] || 0;
    });
    const dStr = latest ? new Date(latest.updatedAt || '').toLocaleDateString('de-DE') : 'Aktuell';
    return [createRadarSeries('tech-current', `${dStr}`, '#10b981', data30, 0.25)];
  }, [playerTechnikHistory]);

  const tech30ComparisonSeries = useMemo<RadarSeries[]>(() => {
    const evalA = playerTechnikHistory.find(e => e.id === compareTechEvalId1) || playerTechnikHistory[0];
    const evalB = playerTechnikHistory.find(e => e.id === compareTechEvalId2) || playerTechnikHistory[1] || playerTechnikHistory[0];

    const dataA: Record<string, number> = {};
    const dataB: Record<string, number> = {};

    (SKILL_DEFINITIONS.Technik || []).forEach(t => {
      dataA[t.id] = evalA?.ratings?.[t.id] || 0;
      dataB[t.id] = evalB?.ratings?.[t.id] || 0;
    });

    const list: RadarSeries[] = [];
    if (evalA) {
      const dStrA = new Date(evalA.updatedAt || '').toLocaleDateString('de-DE');
      list.push(createRadarSeries('tech-a', `Test A: ${dStrA}`, '#10b981', dataA, 0.25));
    }
    if (evalB && evalB.id !== evalA?.id) {
      const dStrB = new Date(evalB.updatedAt || '').toLocaleDateString('de-DE');
      list.push(createRadarSeries('tech-b', `Test B: ${dStrB}`, '#06b6d4', dataB, 0.2));
    }
    return list;
  }, [playerTechnikHistory, compareTechEvalId1, compareTechEvalId2]);

  // Radar Axes & Series for Taktik
  const tactCategoryAxes = useMemo<RadarAxis[]>(() => {
    const groupsList = Array.from(new Set((SKILL_DEFINITIONS.Taktik || []).map(s => s.group || 'Allgemein')));
    return groupsList.map(g => ({ key: g, label: g, max: 5 }));
  }, []);

  const tactCategorySeries = useMemo<RadarSeries[]>(() => {
    const latest = playerTaktikHistory[0];
    const ratings = latest?.ratings || {};
    const groupAverages: Record<string, number> = {};

    tactCategoryAxes.forEach(axis => {
      const skillsInGrp = (SKILL_DEFINITIONS.Taktik || []).filter(s => (s.group || 'Allgemein') === axis.key);
      const validScores = skillsInGrp
        .map(s => ratings[s.id])
        .filter((v): v is number => typeof v === 'number' && v > 0);

      groupAverages[axis.key] = validScores.length > 0
        ? validScores.reduce((a, b) => a + b, 0) / validScores.length
        : 0;
    });

    const dStr = latest ? new Date(latest.updatedAt || '').toLocaleDateString('de-DE') : 'Aktuell';
    return [createRadarSeries("tact-cat", `${dStr} (Stand)`, "#0284c7", groupAverages, 0.25)];
  }, [playerTaktikHistory, tactCategoryAxes]);

  const tactAllAxes = useMemo<RadarAxis[]>(() => {
    return (SKILL_DEFINITIONS.Taktik || []).map(t => ({
      key: t.id,
      label: t.name,
      max: 5
    }));
  }, []);

  const tactAllSeries = useMemo<RadarSeries[]>(() => {
    const latest = playerTaktikHistory[0];
    const ratings = latest?.ratings || {};
    const dataTact: Record<string, number> = {};
    (SKILL_DEFINITIONS.Taktik || []).forEach(t => {
      dataTact[t.id] = ratings[t.id] || 0;
    });
    const dStr = latest ? new Date(latest.updatedAt || '').toLocaleDateString('de-DE') : 'Aktuell';
    return [createRadarSeries('tact-current', `${dStr}`, '#0284c7', dataTact, 0.25)];
  }, [playerTaktikHistory]);

  const tactComparisonSeries = useMemo<RadarSeries[]>(() => {
    const evalA = playerTaktikHistory.find(e => e.id === compareTactEvalId1) || playerTaktikHistory[0];
    const evalB = playerTaktikHistory.find(e => e.id === compareTactEvalId2) || playerTaktikHistory[1] || playerTaktikHistory[0];

    const dataA: Record<string, number> = {};
    const dataB: Record<string, number> = {};

    (SKILL_DEFINITIONS.Taktik || []).forEach(t => {
      dataA[t.id] = evalA?.ratings?.[t.id] || 0;
      dataB[t.id] = evalB?.ratings?.[t.id] || 0;
    });

    const list: RadarSeries[] = [];
    if (evalA) {
      const dStrA = new Date(evalA.updatedAt || '').toLocaleDateString('de-DE');
      list.push(createRadarSeries('tact-a', `Test A: ${dStrA}`, '#0284c7', dataA, 0.25));
    }
    if (evalB && evalB.id !== evalA?.id) {
      const dStrB = new Date(evalB.updatedAt || '').toLocaleDateString('de-DE');
      list.push(createRadarSeries('tact-b', `Test B: ${dStrB}`, '#8b5cf6', dataB, 0.2));
    }
    return list;
  }, [playerTaktikHistory, compareTactEvalId1, compareTactEvalId2]);

  // Radar Axes & Series for Mental
  const mentalAxes = useMemo<RadarAxis[]>(() => {
    return (SKILL_DEFINITIONS.Mental || []).map(t => ({
      key: t.id,
      label: t.name,
      max: 5
    }));
  }, []);

  const mentalSeries = useMemo<RadarSeries[]>(() => {
    const latest = playerMentalHistory[0];
    const ratings = latest?.ratings || {};
    const dataMen: Record<string, number> = {};
    (SKILL_DEFINITIONS.Mental || []).forEach(t => {
      dataMen[t.id] = ratings[t.id] || 0;
    });
    const dStr = latest ? new Date(latest.updatedAt || '').toLocaleDateString('de-DE') : 'Aktuell';
    return [createRadarSeries('men-current', `${dStr}`, '#a855f7', dataMen, 0.25)];
  }, [playerMentalHistory]);

  const mentalComparisonSeries = useMemo<RadarSeries[]>(() => {
    const evalA = playerMentalHistory.find(e => e.id === compareMenEvalId1) || playerMentalHistory[0];
    const evalB = playerMentalHistory.find(e => e.id === compareMenEvalId2) || playerMentalHistory[1] || playerMentalHistory[0];

    const dataA: Record<string, number> = {};
    const dataB: Record<string, number> = {};

    (SKILL_DEFINITIONS.Mental || []).forEach(t => {
      dataA[t.id] = evalA?.ratings?.[t.id] || 0;
      dataB[t.id] = evalB?.ratings?.[t.id] || 0;
    });

    const list: RadarSeries[] = [];
    if (evalA) {
      const dStrA = new Date(evalA.updatedAt || '').toLocaleDateString('de-DE');
      list.push(createRadarSeries('men-a', `Test A: ${dStrA}`, '#a855f7', dataA, 0.25));
    }
    if (evalB && evalB.id !== evalA?.id) {
      const dStrB = new Date(evalB.updatedAt || '').toLocaleDateString('de-DE');
      list.push(createRadarSeries('men-b', `Test B: ${dStrB}`, '#ec4899', dataB, 0.2));
    }
    return list;
  }, [playerMentalHistory, compareMenEvalId1, compareMenEvalId2]);

  // Radar Axes & Series for Athletik
  const athleticMatrixAxes = useMemo<RadarAxis[]>(() => {
    return [
      { key: 'ath_grip', label: '1. Oberkörperkraft (Griffkraft)', shortLabel: 'Oberkörperkraft (Griff)', group: 'Oberkörper' },
      { key: 'ath_cmj', label: '2. Vertikale Sprunghöhe (CMJ)', shortLabel: 'Vertikale Sprunghöhe', group: 'Sprungkraft' },
      { key: 'ath_lateral_push', label: '3. Seitliche Sprungkraft (Lateral Push)', shortLabel: 'Seitliche Sprungkraft', group: 'Sprungkraft' },
      { key: 'ath_sprint_5m', label: '4. 5m Antritt', shortLabel: '5m Antritt', group: 'Schnelligkeit' },
      { key: 'ath_sprint_10m', label: '5. 10m Geschwindigkeit', shortLabel: '10m Geschwindigkeit', group: 'Schnelligkeit' },
      { key: 'ath_shuttle', label: '6. Positionsanpassung (Agility)', shortLabel: 'Positionsanpassung', group: 'Agilität' },
      { key: 'ath_medball', label: '7. Schnellkraft Oberkörper (Medizinballwurf)', shortLabel: 'Schnellkraft Oberkörper', group: 'Oberkörper' },
      { key: 'ath_blazepod_hits', label: '8. BlazePod Reaktion', shortLabel: 'BlazePod Reaktion', group: 'Kognition' },
      { key: 'ath_blazepod_gonogo', label: '9. Impulskontrolle (BlazePod Go/No-Go)', shortLabel: 'Impulskontrolle', group: 'Kognition' }
    ];
  }, []);

  const athleticSeries = useMemo<RadarSeries[]>(() => {
    const latest = playerAthletikHistory[0];
    const dataAth = getAthleticScoresFromEval(latest);
    const dStr = latest?.athleticMetrics?.testDate
      ? latest.athleticMetrics.testDate.split('-').reverse().join('.')
      : (latest ? new Date(latest.updatedAt || '').toLocaleDateString('de-DE') : 'Aktuell');
    const testDate = latest?.athleticMetrics?.testDate || latest?.updatedAt;
    const matchedBio = getClosestBiologicalEvaluation(evaluations, selectedPlayerId, testDate)?.biologicalMetrics;
    const bioStage = matchedBio?.phvClassification || (matchedBio ? 'Erfasst' : 'Standard');
    return [createRadarSeries('ath-current', `${dStr} (${bioStage})`, '#f59e0b', dataAth, 0.25)];
  }, [playerAthletikHistory, getAthleticScoresFromEval, evaluations, selectedPlayerId]);

  const athleticComparisonSeries = useMemo<RadarSeries[]>(() => {
    const evalA = playerAthletikHistory.find(e => e.id === compareAthEvalId1) || playerAthletikHistory[0];
    const evalB = playerAthletikHistory.find(e => e.id === compareAthEvalId2) || playerAthletikHistory[1] || playerAthletikHistory[0];

    const dataA = getAthleticScoresFromEval(evalA);
    const dataB = getAthleticScoresFromEval(evalB);

    const list: RadarSeries[] = [];
    if (evalA) {
      const dStrA = evalA.athleticMetrics?.testDate
        ? evalA.athleticMetrics.testDate.split('-').reverse().join('.')
        : new Date(evalA.updatedAt || '').toLocaleDateString('de-DE');
      const testDateA = evalA.athleticMetrics?.testDate || evalA.updatedAt;
      const matchedBioA = getClosestBiologicalEvaluation(evaluations, selectedPlayerId, testDateA)?.biologicalMetrics;
      const bioStageA = matchedBioA?.phvClassification || (matchedBioA ? 'Erfasst' : 'Standard');
      list.push(createRadarSeries('ath-a', `Linie 1: ${dStrA} (${bioStageA})`, '#f59e0b', dataA, 0.25));
    }
    if (evalB && evalB.id !== evalA?.id) {
      const dStrB = evalB.athleticMetrics?.testDate
        ? evalB.athleticMetrics.testDate.split('-').reverse().join('.')
        : new Date(evalB.updatedAt || '').toLocaleDateString('de-DE');
      const testDateB = evalB.athleticMetrics?.testDate || evalB.updatedAt;
      const matchedBioB = getClosestBiologicalEvaluation(evaluations, selectedPlayerId, testDateB)?.biologicalMetrics;
      const bioStageB = matchedBioB?.phvClassification || (matchedBioB ? 'Erfasst' : 'Standard');
      list.push(createRadarSeries('ath-b', `Linie 2: ${dStrB} (${bioStageB})`, '#10b981', dataB, 0.2));
    }
    return list;
  }, [playerAthletikHistory, compareAthEvalId1, compareAthEvalId2, getAthleticScoresFromEval, evaluations, selectedPlayerId]);

  const handleExportPlayerPDF = async () => {
    if (!activeSelectedPlayerObj) return;
    setIsExportingPdf(true);
    try {
      await generatePlayerEvaluationPDF({
        player: activeSelectedPlayerObj.player,
        group: activeSelectedPlayerObj.group,
        evaluations,
        absences,
        savedPlans,
        feedbackTalks,
        exercises,
        matchPlaytimes
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SELECTION BAR: GRUPPE, SPIELER & PDF-AUSGABE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Trainingsgruppe Dropdown & Spieler-Buttons in einer Zeile */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gruppe:</span>
              </span>
              <select
                value={selectedGroupId}
                onChange={e => {
                  const newGId = e.target.value;
                  setSelectedGroupId(newGId);
                  const grp = groups.find(g => g.id === newGId);
                  const firstP = (grp?.players || []).find(p => !p.archived);
                  if (firstP) setSelectedPlayerId(firstP.id);
                }}
                className="bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer min-h-[40px]"
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({(g.players || []).filter(p => !p.archived).length} TW)
                  </option>
                ))}
              </select>
            </div>

            {/* Trennlinie auf mittleren/großen Bildschirmen */}
            {groupPlayers.length > 0 && (
              <div className="hidden sm:block w-px h-6 bg-slate-800 mx-0.5" />
            )}

            {/* Spieler-Buttons */}
            {groupPlayers.length === 0 ? (
              <div className="text-xs text-slate-500 italic py-2">
                Keine aktiven Torhüter in dieser Trainingsgruppe hinterlegt.
              </div>
            ) : (
              groupPlayers.map(p => {
                const isSelected = p.id === selectedPlayerId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlayerId(p.id)}
                    className={cn(
                      "px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center gap-2 border shadow-sm min-h-[40px]",
                      isSelected
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400 shadow-md shadow-emerald-950/50 scale-[1.02]"
                        : "bg-slate-950/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border",
                      isSelected ? "bg-white/20 text-white border-white/30" : "bg-slate-900 text-slate-400 border-slate-700"
                    )}>
                      {p.jerseyNumber || '#'}
                    </div>
                    <span>{p.firstName} {p.lastName}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Right: PDF-Ausgabe Button */}
          {activeSelectedPlayerObj && (
            <div className="flex items-center ml-auto">
              <button
                type="button"
                onClick={handleExportPlayerPDF}
                disabled={isExportingPdf}
                className="px-4 py-2 min-h-[40px] rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer disabled:opacity-50 flex-shrink-0"
                title="Vollständige PDF-Ausgabe mit allen Diagrammen exportieren"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                <span>PDF Ausgabe</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AUSGEWÄHLTER SPIELER: HERO HEADER & STATS CARDS */}
      {!activeSelectedPlayerObj ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 space-y-2">
          <User className="w-10 h-10 mx-auto text-slate-600" />
          <div className="text-sm font-bold text-slate-400">Kein Torhüter ausgewählt</div>
          <div className="text-xs">Wähle oben einen Torhüter aus, um die Leistungsdiagnostik einzusehen.</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* HEADER BANNER FÜR DEN SPIELER */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 p-6 sm:p-7 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-2xl sm:text-3xl flex items-center justify-center border-2 border-emerald-400/50 shadow-xl shadow-emerald-950/60 flex-shrink-0">
                  {activeSelectedPlayerObj.player.jerseyNumber || <User className="w-8 h-8" />}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {activeSelectedPlayerObj.group.name}
                    </span>
                    {activeSelectedPlayerObj.player.birthYear && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-900 text-slate-300 border border-slate-800">
                        Jg. {activeSelectedPlayerObj.player.birthYear}
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                    {activeSelectedPlayerObj.player.firstName} {activeSelectedPlayerObj.player.lastName}
                  </h2>

                  <p className="text-xs text-slate-400">
                    Detaillierte Auswertung von Anwesenheit, Trainer-Feedback, Leistungsradar & Wettkämpfen
                  </p>
                </div>
              </div>

              {/* OVERALL SCORE BADGE */}
              <div className="flex items-center gap-3 self-start md:self-center bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl">
                <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                    Gesamt-Leistungslevel
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono flex items-baseline gap-1">
                    {overallAvgRating !== null ? (
                      <>
                        <span>{overallAvgRating.toFixed(2)}</span>
                        <span className="text-xs text-slate-500 font-normal">/ 5.0</span>
                      </>
                    ) : (
                      <span className="text-slate-500 text-base">Keine Daten</span>
                    )}
                  </div>
                  {overallAvgRating !== null && (
                    <div className="text-[11px] font-bold text-amber-400">
                      {getScaleRatingLabel(overallAvgRating)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 1. KARTE: ANWESENHEIT */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-all">
            <div
              onClick={() => togglePlayerCard('anwesenheit')}
              className="p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-850/50 transition select-none"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-base sm:text-lg flex items-center gap-2">
                    <span>Anwesenheit</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                      {playerGroupPlans.length > 0 ? `${((attendedPlansCount / playerGroupPlans.length) * 100).toFixed(0)} % Quote` : '100 %'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Trainingsbeteiligung, Kreisdiagramm, Ausfallgründe & Ausfall-Häufigkeitsdiagramm
                  </p>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400">
                {openPlayerCards.anwesenheit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {openPlayerCards.anwesenheit && (
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-800/80 animate-fadeIn">
                <AttendanceStatsSection
                  player={activeSelectedPlayerObj.player}
                  playerGroupPlans={playerGroupPlans}
                  filteredAbsences={filteredAbsences}
                  attendedPlansCount={attendedPlansCount}
                  exerciseMap={new Map((exercises || []).filter(e => Boolean(e.id)).map(e => [e.id!, e]))}
                  exercises={exercises}
                />
              </div>
            )}
          </div>

          {/* 2. KARTE: FEEDBACKGESPRÄCHE & TRAININGS-ERKENNTNISSE */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-all">
            <div
              onClick={() => togglePlayerCard('feedback')}
              className="p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-850/50 transition select-none"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-base sm:text-lg flex items-center gap-2 flex-wrap">
                    <span>Trainer-Feedback &amp; Erkenntnisse</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono font-bold">
                      {playerFeedbackTalks.length} Feedbackgespräche
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                      {playerTrainingInsights.length} Trainings-Erkenntnisse
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Protokolle von Feedbackgesprächen &amp; qualitative Erkenntnisse aus den Trainingseinheiten
                  </p>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400">
                {openPlayerCards.feedback ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {openPlayerCards.feedback && (
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-800/80 animate-fadeIn">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-5">
                  {/* LINKE SPALTE: FEEDBACKGESPRÄCHE */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-sky-400" />
                        <h5 className="text-sm font-black text-white">
                          Feedbackgespräche
                        </h5>
                      </div>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-950 text-sky-300 border border-slate-800">
                        {playerFeedbackTalks.length} {playerFeedbackTalks.length === 1 ? 'Eintrag' : 'Einträge'}
                      </span>
                    </div>

                    {playerFeedbackTalks.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 bg-slate-950 rounded-2xl border border-slate-800">
                        Noch keine Feedbackgespräche für diesen Torhüter hinterlegt.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                        {playerFeedbackTalks.map(talk => (
                          <div key={talk.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-black text-sky-400 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                <span>{talk.trainer1 || 'Trainer'} {talk.trainer2 ? `& ${talk.trainer2}` : ''}</span>
                              </span>
                              <span className="text-slate-400 font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                {talk.date ? new Date(talk.date).toLocaleDateString('de-DE') : '–'}
                              </span>
                            </div>
                            {talk.keyPoints && (
                              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/60">
                                {talk.keyPoints}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* RECHTE SPALTE: ERKENNTNISSE AUS TRAININGSEINHEITEN MIT FREITEXTFILTER */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <h5 className="text-sm font-black text-white">
                          Erkenntnisse aus Torwarttraining
                        </h5>
                      </div>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-950 text-cyan-300 border border-slate-800">
                        {playerTrainingInsights.length} {playerTrainingInsights.length === 1 ? 'Einheit' : 'Einheiten'}
                      </span>
                    </div>

                    {/* Freitextfilter */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={insightSearchTerm}
                        onChange={e => setInsightSearchTerm(e.target.value)}
                        placeholder="Erkenntnisse durchsuchen (Thema, Datum, Stichwort)..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8.5 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition font-medium"
                      />
                      {insightSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setInsightSearchTerm('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Liste der gefilterten Erkenntnisse */}
                    {filteredTrainingInsights.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                        {insightSearchTerm ? (
                          <>
                            <p className="font-bold text-slate-400">Keine Erkenntnisse gefunden</p>
                            <p className="text-[11px]">Kein Treffer für Suchbegriff „{insightSearchTerm}“</p>
                          </>
                        ) : (
                          <>
                            <p className="font-bold text-slate-400">Noch keine Trainings-Erkenntnisse erfasst</p>
                            <p className="text-[11px] text-slate-500">Erfassung im Trainingsplaner unter Historie ➔ Einheit nachbereiten ➔ 1. Torhüter.</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                        {filteredTrainingInsights.map((insight, idx) => (
                          <div key={insight.planId || idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="font-extrabold text-cyan-300 flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span className="truncate max-w-[180px] sm:max-w-[240px]">{insight.planTitle}</span>
                              </span>
                              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                                {insight.trainerName && (
                                  <span className="text-slate-400 hidden sm:inline">
                                    {insight.trainerName}
                                  </span>
                                )}
                                <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                                  {insight.planDate ? new Date(insight.planDate).toLocaleDateString('de-DE') : insight.planDate}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/60 italic">
                              „{insight.text}“
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. KARTE: LEISTUNGSRADAR & DIAGNOSTIK (4 KATEGORIEN) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-all">
            <div
              onClick={() => togglePlayerCard('bewertung')}
              className="p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-850/50 transition select-none"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-base sm:text-lg flex items-center gap-2">
                    <span>Leistungsdiagnostik</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold">
                      10 Diagramme
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    360°-Netzdiagramme für Technik, Taktik, Mental & Athletik inklusive historischem Entwicklungsvergleich
                  </p>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400">
                {openPlayerCards.bewertung ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {openPlayerCards.bewertung && (
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-800/80 space-y-6 animate-fadeIn">
                {/* 4 CATEGORY TABS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                  {(['Technik', 'Taktik', 'Mental', 'Athletik'] as const).map(cat => {
                    const data = playerCategoryScores[cat];
                    const isActive = activePlayerEvaluationTab === cat;

                    const catColors =
                      cat === 'Technik' ? { activeBorder: 'border-emerald-500/80', activeRing: 'ring-2 ring-emerald-500/40', activeBg: 'bg-emerald-950/30', bar: 'bg-emerald-500', text: 'text-emerald-400' } :
                      cat === 'Taktik' ? { activeBorder: 'border-sky-500/80', activeRing: 'ring-2 ring-sky-500/40', activeBg: 'bg-sky-950/30', bar: 'bg-sky-500', text: 'text-sky-400' } :
                      cat === 'Mental' ? { activeBorder: 'border-purple-500/80', activeRing: 'ring-2 ring-purple-500/40', activeBg: 'bg-purple-950/30', bar: 'bg-purple-500', text: 'text-purple-400' } :
                      { activeBorder: 'border-amber-500/80', activeRing: 'ring-2 ring-amber-500/40', activeBg: 'bg-amber-950/30', bar: 'bg-amber-500', text: 'text-amber-400' };

                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActivePlayerEvaluationTab(cat)}
                        className={cn(
                          "p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group shadow-sm",
                          isActive
                            ? cn("bg-slate-900 shadow-lg", catColors.activeBorder, catColors.activeRing, catColors.activeBg)
                            : "bg-slate-950/90 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/60"
                        )}
                      >
                        {isActive && (
                          <span className={cn("absolute top-0 left-0 right-0 h-1.5", catColors.bar)} />
                        )}
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={cn("font-extrabold flex items-center gap-1.5", isActive ? catColors.text : "text-slate-300")}>
                            {cat}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {data ? `${data.count} / ${data.totalCount} bewertet` : '0 bewertet'}
                          </span>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-white flex items-baseline gap-1 my-0.5">
                          {data && data.count > 0 ? data.avg.toFixed(1) : '–'}
                          {data && data.count > 0 && <span className="text-xs text-slate-500 font-normal">/ 5.0</span>}
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mt-2">
                          <div
                            className={cn("h-full rounded-full transition-all duration-300", catColors.bar)}
                            style={{ width: `${data && data.count > 0 ? (data.avg / 5) * 100 : 0}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* 1. TECHNIK TAB */}
                {activePlayerEvaluationTab === 'Technik' && (
                  <div className="space-y-6 pt-1 animate-fadeIn">
                    {/* 1. Netzdiagramm mit den Kategorien (Gruppen) */}
                    <div className="bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4 shadow-inner">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              Diagramm 1 von 3
                            </span>
                            <h5 className="text-sm sm:text-base font-extrabold text-white">
                              Netzdiagramm: Technik-Kategorien (Aktueller Stand)
                            </h5>
                          </div>
                          <p className="text-xs text-slate-400">
                            Aggregierter Durchschnittsscore (0 bis 5) der 6 Technik-Schwerpunkte aus der 5-Stufen Bewertungsmatrix.
                          </p>
                        </div>

                        {playerCategoryScores.Technik && (
                          <div className="text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-300 font-mono font-bold self-start sm:self-auto">
                            Gesamt-Technik: Ø {playerCategoryScores.Technik.avg.toFixed(1)} / 5.0
                          </div>
                        )}
                      </div>

                      <RadarChart
                        axes={techCategoryAxes}
                        series={techCategorySeries}
                        maxValue={5}
                        levels={5}
                        size={560}
                        showLegend={true}
                      />
                    </div>

                    {/* 2. Netzdiagramm mit den 30 Techniken (Aktuellster Stand) */}
                    <div className="bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4 shadow-inner">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              Diagramm 2 von 3
                            </span>
                            <h5 className="text-sm sm:text-base font-extrabold text-white">
                              Netzdiagramm: Alle 30 Techniken (Aktueller Stand)
                            </h5>
                          </div>
                          <p className="text-xs text-slate-400">
                            360°-Detailprofil aller 30 isolierten Techniken aus der aktuellsten Bewertung (Skala: 0 ganz innen bis 5 ganz außen).
                          </p>
                        </div>
                      </div>

                      <RadarChart
                        axes={tech30Axes}
                        series={tech30CurrentSeries}
                        maxValue={5}
                        levels={5}
                        size={580}
                        showLegend={true}
                      />
                    </div>

                    {/* 3. Netzdiagramm: Entwicklungsvergleich (2 Linien via Dropdowns aus der Historie) */}
                    <div className="bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4 shadow-inner">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40">
                              Diagramm 3 von 3
                            </span>
                            <h5 className="text-sm sm:text-base font-extrabold text-white">
                              Netzdiagramm: Entwicklungsvergleich (2 historische Verlaufskurven)
                            </h5>
                          </div>
                          <p className="text-xs text-slate-400">
                            Wähle zwei beliebige historische Datensätze aus, um die Leistungsentwicklung der 30 Techniken direkt übereinanderzulegen.
                          </p>
                        </div>
                      </div>

                      {playerTechnikHistory.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
                          Noch keine historischen Technik-Einträge für diesen Torhüter vorhanden.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-900 rounded-2xl border border-slate-800">
                            {/* Dropdown 1 (Linie 1 / Grün) */}
                            <div>
                              <label className="block text-xs font-bold text-emerald-400 mb-1.5 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                                <span>Linie 1 (Erster Erfassungszeitpunkt):</span>
                              </label>
                              <select
                                value={compareTechEvalId1 || playerTechnikHistory[0]?.id || ''}
                                onChange={e => setCompareTechEvalId1(e.target.value)}
                                className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-400 font-mono"
                              >
                                {playerTechnikHistory.map((hEv, hIdx) => {
                                  const d = new Date(hEv.updatedAt || '');
                                  const dStr = d.toLocaleDateString('de-DE') + ' (' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr)';
                                  const rVals = Object.values(hEv.ratings || {}).filter((v): v is number => typeof v === 'number' && v > 0);
                                  const avg = rVals.length > 0 ? (rVals.reduce((a, b) => a + b, 0) / rVals.length).toFixed(1) : '–';
                                  return (
                                    <option key={hEv.id} value={hEv.id}>
                                      {hIdx === 0 ? '★ Aktuellste: ' : ''}{dStr} — Ø {avg} ({rVals.length} Kriterien)
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            {/* Dropdown 2 (Linie 2 / Blau/Sky) */}
                            <div>
                              <label className="block text-xs font-bold text-sky-400 mb-1.5 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                                <span>Linie 2 (Vergleichs-Erfassungszeitpunkt):</span>
                              </label>
                              <select
                                value={compareTechEvalId2 || playerTechnikHistory[1]?.id || playerTechnikHistory[0]?.id || ''}
                                onChange={e => setCompareTechEvalId2(e.target.value)}
                                className="w-full bg-slate-950 border border-sky-500/40 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-400 font-mono"
                              >
                                {playerTechnikHistory.map((hEv, hIdx) => {
                                  const d = new Date(hEv.updatedAt || '');
                                  const dStr = d.toLocaleDateString('de-DE') + ' (' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr)';
                                  const rVals = Object.values(hEv.ratings || {}).filter((v): v is number => typeof v === 'number' && v > 0);
                                  const avg = rVals.length > 0 ? (rVals.reduce((a, b) => a + b, 0) / rVals.length).toFixed(1) : '–';
                                  return (
                                    <option key={hEv.id} value={hEv.id}>
                                      {hIdx === 0 ? '★ Aktuellste: ' : ''}{dStr} — Ø {avg} ({rVals.length} Kriterien)
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          </div>

                          <RadarChart
                            axes={tech30Axes}
                            series={tech30ComparisonSeries}
                            maxValue={5}
                            levels={5}
                            size={580}
                            showLegend={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. TAKTIK TAB */}
                {activePlayerEvaluationTab === 'Taktik' && (
                  <div className="space-y-6 pt-1 animate-fadeIn">
                    {/* 1. Taktik-Kategorien Radar */}
                    <div className="bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4 shadow-inner">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40">
                              Diagramm 1 von 3
                            </span>
                            <h5 className="text-sm sm:text-base font-extrabold text-white">
                              Netzdiagramm: Taktik-Bereiche (Aktueller Stand)
                            </h5>
                          </div>
                          <p className="text-xs text-slate-400">
                            Aggregierter Reifegrad über alle taktischen Handlungsfelder.
                          </p>
                        </div>

                        {playerCategoryScores.Taktik && (
                          <div className="text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-sky-300 font-mono font-bold self-start sm:self-auto">
                            Gesamt-Taktik: Ø {playerCategoryScores.Taktik.avg.toFixed(1)} / 5.0
                          </div>
                        )}
                      </div>

                      <RadarChart
                        axes={tactCategoryAxes}
                        series={tactCategorySeries}
                        maxValue={5}
                        levels={5}
                        size={560}
                        showLegend={true}
                      />
                    </div>

                    {/* 2. Alle Taktik-Kriterien Radar */}
                    <div className="bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4 shadow-inner">
                      <div className="border-b border-slate-800/80 pb-3 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40">
                            Diagramm 2 von 3
                          </span>
                          <h5 className="text-sm sm:text-base font-extrabold text-white">
                            Netzdiagramm: Alle taktischen Einzelkriterien
                          </h5>
                        </div>
                        <p className="text-xs text-slate-400">
                          Detailübersicht aller taktischen Entscheidungskriterien (Skala 0 bis 5).
                        </p>
                      </div>

                      <RadarChart
                        axes={tactAllAxes}
                        series={tactAllSeries}
                        maxValue={5}
                        levels={5}
                        size={580}
                        showLegend={true}
                      />
                    </div>

                    {/* 3. Taktik Entwicklungsvergleich */}
                    <div className="bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4 shadow-inner">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                              Diagramm 3 von 3
                            </span>
                            <h5 className="text-sm sm:text-base font-extrabold text-white">
                              Netzdiagramm: Entwicklungsvergleich Taktik (2 Verlaufskurven)
                            </h5>
                          </div>
                          <p className="text-xs text-slate-400">
                            Wähle zwei Zeitpunkte für den direkten Vergleich der taktischen Handlungsfelder.
                          </p>
                        </div>
                      </div>

                      {playerTaktikHistory.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
                          Noch keine historischen Taktik-Einträge für diesen Torhüter vorhanden.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-900 rounded-2xl border border-slate-800">
                            <div>
                              <label className="block text-xs font-bold text-sky-400 mb-1.5 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                                <span>Linie 1 (Erster Erfassungszeitpunkt):</span>
                              </label>
                              <select
                                value={compareTactEvalId1 || playerTaktikHistory[0]?.id || ''}
                                onChange={e => setCompareTactEvalId1(e.target.value)}
                                className="w-full bg-slate-950 border border-sky-500/40 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-400 font-mono"
                              >
                                {playerTaktikHistory.map((hEv, hIdx) => {
                                  const d = new Date(hEv.updatedAt || '');
                                  const dStr = d.toLocaleDateString('de-DE') + ' (' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr)';
                                  const rVals = Object.values(hEv.ratings || {}).filter((v): v is number => typeof v === 'number' && v > 0);
                                  const avg = rVals.length > 0 ? (rVals.reduce((a, b) => a + b, 0) / rVals.length).toFixed(1) : '–';
                                  return (
                                    <option key={hEv.id} value={hEv.id}>
                                      {hIdx === 0 ? '★ Aktuellste: ' : ''}{dStr} — Ø {avg} ({rVals.length} Kriterien)
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-indigo-400 mb-1.5 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                                <span>Linie 2 (Vergleichs-Erfassungszeitpunkt):</span>
                              </label>
                              <select
                                value={compareTactEvalId2 || playerTaktikHistory[1]?.id || playerTaktikHistory[0]?.id || ''}
                                onChange={e => setCompareTactEvalId2(e.target.value)}
                                className="w-full bg-slate-950 border border-indigo-500/40 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-400 font-mono"
                              >
                                {playerTaktikHistory.map((hEv, hIdx) => {
                                  const d = new Date(hEv.updatedAt || '');
                                  const dStr = d.toLocaleDateString('de-DE') + ' (' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr)';
                                  const rVals = Object.values(hEv.ratings || {}).filter((v): v is number => typeof v === 'number' && v > 0);
                                  const avg = rVals.length > 0 ? (rVals.reduce((a, b) => a + b, 0) / rVals.length).toFixed(1) : '–';
                                  return (
                                    <option key={hEv.id} value={hEv.id}>
                                      {hIdx === 0 ? '★ Aktuellste: ' : ''}{dStr} — Ø {avg} ({rVals.length} Kriterien)
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          </div>

                          <RadarChart
                            axes={tactAllAxes}
                            series={tactComparisonSeries}
                            maxValue={5}
                            levels={5}
                            size={580}
                            showLegend={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. MENTAL TAB */}
                {activePlayerEvaluationTab === 'Mental' && (
                  <div className="space-y-6 pt-1 animate-fadeIn">
                    {/* 1. Netzdiagramm: 10 Mentale Kategorien (Aktueller Stand) */}
                    <div className="bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4 shadow-inner">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              Diagramm 1 von 2
                            </span>
                            <h5 className="text-sm sm:text-base font-extrabold text-white">
                              Netzdiagramm: 10 Mentale Leistungskriterien (Aktueller Stand)
                            </h5>
                          </div>
                          <p className="text-xs text-slate-400">
                            360°-Detailprofil aller 10 mentalen Leistungskriterien aus der aktuellsten Bewertung.
                          </p>
                        </div>

                        {playerCategoryScores.Mental && (
                          <div className="text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-purple-300 font-mono font-bold self-start sm:self-auto">
                            Gesamt-Mental: Ø {playerCategoryScores.Mental.avg.toFixed(1)} / 5.0
                          </div>
                        )}
                      </div>

                      <RadarChart
                        axes={mentalAxes}
                        series={mentalSeries}
                        maxValue={5}
                        levels={5}
                        size={560}
                        showLegend={true}
                      />
                    </div>

                    {/* 2. Netzdiagramm: Entwicklungsvergleich */}
                    <div className="bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4 shadow-inner">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              Diagramm 2 von 2
                            </span>
                            <h5 className="text-sm sm:text-base font-extrabold text-white">
                              Netzdiagramm: Entwicklungsvergleich (2 historische Verlaufskurven)
                            </h5>
                          </div>
                          <p className="text-xs text-slate-400">
                            Wähle zwei beliebige historische Datensätze aus, um die mentale Leistungsentwicklung direkt übereinanderzulegen.
                          </p>
                        </div>
                      </div>

                      {playerMentalHistory.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
                          Noch keine historischen Mental-Einträge für diesen Torhüter vorhanden.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-900 rounded-2xl border border-slate-800">
                            <div>
                              <label className="block text-xs font-bold text-purple-400 mb-1.5 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                                <span>Linie 1 (Erster Erfassungszeitpunkt):</span>
                              </label>
                              <select
                                value={compareMenEvalId1 || playerMentalHistory[0]?.id || ''}
                                onChange={e => setCompareMenEvalId1(e.target.value)}
                                className="w-full bg-slate-950 border border-purple-500/40 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-400 font-mono"
                              >
                                {playerMentalHistory.map((hEv, hIdx) => {
                                  const d = new Date(hEv.updatedAt || '');
                                  const dStr = d.toLocaleDateString('de-DE') + ' (' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr)';
                                  const rVals = Object.values(hEv.ratings || {}).filter((v): v is number => typeof v === 'number' && v > 0);
                                  const avg = rVals.length > 0 ? (rVals.reduce((a, b) => a + b, 0) / rVals.length).toFixed(1) : '–';
                                  return (
                                    <option key={hEv.id} value={hEv.id}>
                                      {hIdx === 0 ? '★ Aktuellste: ' : ''}{dStr} — Ø {avg} ({rVals.length} Kriterien)
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-rose-400 mb-1.5 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                                <span>Linie 2 (Vergleichs-Erfassungszeitpunkt):</span>
                              </label>
                              <select
                                value={compareMenEvalId2 || playerMentalHistory[1]?.id || playerMentalHistory[0]?.id || ''}
                                onChange={e => setCompareMenEvalId2(e.target.value)}
                                className="w-full bg-slate-950 border border-rose-500/40 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-rose-400 font-mono"
                              >
                                {playerMentalHistory.map((hEv, hIdx) => {
                                  const d = new Date(hEv.updatedAt || '');
                                  const dStr = d.toLocaleDateString('de-DE') + ' (' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr)';
                                  const rVals = Object.values(hEv.ratings || {}).filter((v): v is number => typeof v === 'number' && v > 0);
                                  const avg = rVals.length > 0 ? (rVals.reduce((a, b) => a + b, 0) / rVals.length).toFixed(1) : '–';
                                  return (
                                    <option key={hEv.id} value={hEv.id}>
                                      {hIdx === 0 ? '★ Aktuellste: ' : ''}{dStr} — Ø {avg} ({rVals.length} Kriterien)
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          </div>

                          <RadarChart
                            axes={mentalAxes}
                            series={mentalComparisonSeries}
                            maxValue={5}
                            levels={5}
                            size={580}
                            showLegend={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. ATHLETIK TAB */}
                {activePlayerEvaluationTab === 'Athletik' && (() => {
                  const latestAth = playerAthletikHistory[0];
                  const athDate = latestAth?.athleticMetrics?.testDate || latestAth?.updatedAt;
                  const matchedBio = getClosestBiologicalEvaluation(evaluations, selectedPlayerId, athDate)?.biologicalMetrics;
                  const evalRes = evaluateAllAthleticTests(
                    latestAth?.athleticMetrics,
                    matchedBio || playerBioMetrics,
                    activeSelectedPlayerObj?.player?.birthYear
                  );
                  const { phvInfo } = evalRes;

                  return (
                    <div className="space-y-6 pt-1 animate-fadeIn">
                      {/* PHV-Reifegrad & Normwert-Status Banner */}
                      <div className="p-4 sm:p-5 rounded-3xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-inner">
                        <div className="flex items-center gap-3.5">
                          <div className={cn(
                            "w-11 h-11 rounded-2xl flex items-center justify-center border flex-shrink-0 shadow-sm",
                            phvInfo.stage === 'Pre-PHV' ? "bg-sky-500/10 border-sky-500/30 text-sky-400" :
                            phvInfo.stage === 'Circa-PHV' ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                            "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          )}>
                            <Dna className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-white">
                                Angewandte PHV-Normwertstufe:
                              </span>
                              <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider border font-mono",
                                phvInfo.stage === 'Pre-PHV' ? "bg-sky-950 text-sky-300 border-sky-600" :
                                phvInfo.stage === 'Circa-PHV' ? "bg-amber-950 text-amber-300 border-amber-600" :
                                "bg-emerald-950 text-emerald-300 border-emerald-600"
                              )}>
                                {phvInfo.stage}
                                {phvInfo.offsetYears !== undefined && ` (${phvInfo.offsetYears > 0 ? '+' : ''}${phvInfo.offsetYears} J.)`}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {phvInfo.isEstimated ? (
                                <span>Kein biologischer Reifegrad eingetragen • Standard-Entwicklung nach Geburtsjahr {activeSelectedPlayerObj?.player?.birthYear ? `(Jg. ${activeSelectedPlayerObj.player.birthYear})` : ''}</span>
                              ) : (
                                <span>Zuletzt eingetragener biologischer Entwicklungsstand ({playerBioMetrics?.standingHeightCm ? `${playerBioMetrics.standingHeightCm} cm, ` : ''}{playerBioMetrics?.weightKg ? `${playerBioMetrics.weightKg} kg` : ''})</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                          <Scale className="w-3.5 h-3.5 text-teal-400" />
                          <span>Referenz: NLZ-Normwertkriterien</span>
                        </div>
                      </div>

                      {/* 1. Matrix Radar */}
                      <div className="bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4 shadow-inner">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                Diagramm 1 von 2
                              </span>
                              <h5 className="text-sm sm:text-base font-extrabold text-white">
                                Netzdiagramm: 9-Dimensionen Athletik-Leistungsmatrix
                              </h5>
                            </div>
                            <p className="text-xs text-slate-400">
                              Normwert-Leistungsmatrix nach biologischem Reifegrad (Skala: 1 bis 5).
                            </p>
                          </div>

                          {playerCategoryScores.Athletik && (
                            <div className="text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 font-mono font-bold self-start sm:self-auto">
                              Gesamt-Athletik: Ø {playerCategoryScores.Athletik.avg.toFixed(1)} / 5.0
                            </div>
                          )}
                        </div>

                      <RadarChart
                        axes={athleticMatrixAxes}
                        series={athleticSeries}
                        maxValue={5}
                        levels={5}
                        size={560}
                        showLegend={true}
                      />
                    </div>

                    {/* 2. Historical comparison radar */}
                    <div className="bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4 shadow-inner">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                              Diagramm 2 von 2
                            </span>
                            <h5 className="text-sm sm:text-base font-extrabold text-white">
                              Netzdiagramm: Entwicklungsvergleich (2 historische Verlaufskurven)
                            </h5>
                          </div>
                          <p className="text-xs text-slate-400">
                            Wähle zwei Zeitpunkte für den direkten Vergleich der athletischen Leistungsdaten.
                          </p>
                        </div>
                      </div>

                      {playerAthletikHistory.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
                          Noch keine historischen Athletik-Einträge für diesen Torhüter vorhanden.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-900 rounded-2xl border border-slate-800">
                            {(() => {
                              const evalA = playerAthletikHistory.find(e => e.id === compareAthEvalId1) || playerAthletikHistory[0];
                              const evalB = playerAthletikHistory.find(e => e.id === compareAthEvalId2) || playerAthletikHistory[1] || playerAthletikHistory[0];

                              const dateA = evalA?.athleticMetrics?.testDate || evalA?.updatedAt;
                              const bioA = evalA ? getClosestBiologicalEvaluation(evaluations, selectedPlayerId, dateA)?.biologicalMetrics : undefined;

                              const dateB = evalB?.athleticMetrics?.testDate || evalB?.updatedAt;
                              const bioB = evalB ? getClosestBiologicalEvaluation(evaluations, selectedPlayerId, dateB)?.biologicalMetrics : undefined;

                              return (
                                <>
                                  <div>
                                    <label className="block text-xs font-bold text-amber-400 mb-1.5 flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                                      <span>Linie 1 (Erster Erfassungszeitpunkt):</span>
                                    </label>
                                    <select
                                      value={compareAthEvalId1 || playerAthletikHistory[0]?.id || ''}
                                      onChange={e => setCompareAthEvalId1(e.target.value)}
                                      className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400 font-mono"
                                    >
                                      {playerAthletikHistory.map((hEv, hIdx) => {
                                        const d = new Date(hEv.updatedAt || '');
                                        const dStr = hEv.athleticMetrics?.testDate 
                                          ? hEv.athleticMetrics.testDate.split('-').reverse().join('.')
                                          : d.toLocaleDateString('de-DE');
                                        const testDate = hEv.athleticMetrics?.testDate || hEv.updatedAt;
                                        const matchedBio = getClosestBiologicalEvaluation(evaluations, selectedPlayerId, testDate)?.biologicalMetrics;
                                        const bioStage = matchedBio?.phvClassification || (matchedBio ? 'Erfasst' : 'Standard');
                                        const scores = getAthleticScoresFromEval(hEv);
                                        const sVals = Object.values(scores).filter((v): v is number => typeof v === 'number' && v > 0);
                                        const avg = sVals.length > 0 ? (sVals.reduce((a, b) => a + b, 0) / sVals.length).toFixed(1) : '–';
                                        return (
                                          <option key={hEv.id} value={hEv.id}>
                                            {hIdx === 0 ? '★ Aktuellste: ' : ''}{dStr} [{bioStage}] — Ø {avg} ({sVals.length} Tests)
                                          </option>
                                        );
                                      })}
                                    </select>
                                    <div className="mt-2 text-[11px] text-slate-400 bg-slate-950/80 rounded-xl p-2.5 border border-slate-800/80 flex items-center justify-between gap-2">
                                      <span className="font-semibold text-slate-300">Zugeordnete PHV-Norm:</span>
                                      <span className="font-bold text-amber-300 font-mono">
                                        {bioA?.phvClassification || 'Standard'}
                                        {bioA?.measurementDate ? ` (Bio-Stand: ${bioA.measurementDate.split('-').reverse().join('.')})` : ''}
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-emerald-400 mb-1.5 flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                                      <span>Linie 2 (Vergleichs-Erfassungszeitpunkt):</span>
                                    </label>
                                    <select
                                      value={compareAthEvalId2 || playerAthletikHistory[1]?.id || playerAthletikHistory[0]?.id || ''}
                                      onChange={e => setCompareAthEvalId2(e.target.value)}
                                      className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-400 font-mono"
                                    >
                                      {playerAthletikHistory.map((hEv, hIdx) => {
                                        const d = new Date(hEv.updatedAt || '');
                                        const dStr = hEv.athleticMetrics?.testDate 
                                          ? hEv.athleticMetrics.testDate.split('-').reverse().join('.')
                                          : d.toLocaleDateString('de-DE');
                                        const testDate = hEv.athleticMetrics?.testDate || hEv.updatedAt;
                                        const matchedBio = getClosestBiologicalEvaluation(evaluations, selectedPlayerId, testDate)?.biologicalMetrics;
                                        const bioStage = matchedBio?.phvClassification || (matchedBio ? 'Erfasst' : 'Standard');
                                        const scores = getAthleticScoresFromEval(hEv);
                                        const sVals = Object.values(scores).filter((v): v is number => typeof v === 'number' && v > 0);
                                        const avg = sVals.length > 0 ? (sVals.reduce((a, b) => a + b, 0) / sVals.length).toFixed(1) : '–';
                                        return (
                                          <option key={hEv.id} value={hEv.id}>
                                            {hIdx === 0 ? '★ Aktuellste: ' : ''}{dStr} [{bioStage}] — Ø {avg} ({sVals.length} Tests)
                                          </option>
                                        );
                                      })}
                                    </select>
                                    <div className="mt-2 text-[11px] text-slate-400 bg-slate-950/80 rounded-xl p-2.5 border border-slate-800/80 flex items-center justify-between gap-2">
                                      <span className="font-semibold text-slate-300">Zugeordnete PHV-Norm:</span>
                                      <span className="font-bold text-emerald-300 font-mono">
                                        {bioB?.phvClassification || 'Standard'}
                                        {bioB?.measurementDate ? ` (Bio-Stand: ${bioB.measurementDate.split('-').reverse().join('.')})` : ''}
                                      </span>
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          <RadarChart
                            axes={athleticMatrixAxes}
                            series={athleticComparisonSeries}
                            maxValue={5}
                            levels={5}
                            size={580}
                            showLegend={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
              </div>
            )}
          </div>

          {/* 4. KARTE: WETTKAMPFANALYSE */}
          {activeSelectedPlayerObj && (
            <MatchAnalysisSection
              player={activeSelectedPlayerObj.player}
              group={activeSelectedPlayerObj.group}
              matchPlaytimes={matchPlaytimes}
            />
          )}

          {/* 5. KARTE: BELASTUNG (SAISONKURVE JULI - JUNI) */}
          {activeSelectedPlayerObj && (
            <PlayerWorkloadSeasonSection
              player={activeSelectedPlayerObj.player}
              group={activeSelectedPlayerObj.group}
              savedPlans={savedPlans}
              matchPlaytimes={matchPlaytimes}
            />
          )}
        </div>
      )}
    </div>
  );
};
