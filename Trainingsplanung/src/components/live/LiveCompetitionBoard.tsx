import React from 'react';
import type { CompetitionRound, Player } from '../../types';
import { 
  Trophy, 
  Crown, 
  Plus, 
  RotateCcw, 
  Trash2
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface LiveCompetitionBoardProps {
  competitionRounds: CompetitionRound[];
  selectedRoundId: string;
  setSelectedRoundId: (roundId: string) => void;
  onAddRound: (title?: string) => void;
  onDeleteRound: (roundId: string) => void;
  onResetRoundScores: (roundId: string) => void;
  onAdjustScore: (roundId: string, keeperId: string, delta: number) => void;
  groupKeepers: Player[];
  competitionPresets?: string[];
}

export const LiveCompetitionBoard: React.FC<LiveCompetitionBoardProps> = ({
  competitionRounds,
  selectedRoundId,
  setSelectedRoundId,
  onAddRound,
  onDeleteRound,
  onResetRoundScores,
  onAdjustScore,
  groupKeepers,
  competitionPresets: _competitionPresets
}) => {
  const activeRound = competitionRounds.find(r => r.id === selectedRoundId) || competitionRounds[0];

  // Calculate cumulative scores across all rounds
  const totalScores: Record<string, number> = {};
  groupKeepers.forEach(k => {
    totalScores[k.id] = 0;
  });

  competitionRounds.forEach(round => {
    Object.entries(round.scores || {}).forEach(([kId, score]) => {
      totalScores[kId] = (totalScores[kId] || 0) + (score || 0);
    });
  });

  // Active round scores
  const currentScores = selectedRoundId === 'total' ? totalScores : (activeRound?.scores || {});

  // Sorted Keepers by score descending
  const sortedKeepers = [...groupKeepers].sort((a, b) => {
    const scoreA = currentScores[a.id] || 0;
    const scoreB = currentScores[b.id] || 0;
    return scoreB - scoreA;
  });

  const topScore = sortedKeepers.length > 0 ? (currentScores[sortedKeepers[0].id] || 0) : 0;

  return (
    <div className="space-y-6">
      {/* 1. ROUND TABS & CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-extrabold text-white">Torwart-Wettkampf & Scoreboard</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAddRound()}
              className="px-3.5 py-2 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Neue Runde</span>
            </button>
          </div>
        </div>

        {/* Round Tabs Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {competitionRounds.map((r, idx) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRoundId(r.id)}
              className={cn(
                "px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold whitespace-nowrap transition border flex items-center gap-2 cursor-pointer",
                selectedRoundId === r.id
                  ? "bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-950/60"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
              )}
            >
              <span>{r.title || `Runde ${idx + 1}`}</span>
            </button>
          ))}

          {competitionRounds.length > 1 && (
            <button
              type="button"
              onClick={() => setSelectedRoundId('total')}
              className={cn(
                "px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-extrabold whitespace-nowrap transition border flex items-center gap-1.5 cursor-pointer",
                selectedRoundId === 'total'
                  ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-950"
                  : "bg-slate-950 border-purple-900/60 text-purple-400 hover:text-purple-300"
              )}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Gesamt-Wertung</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KEEPER SCORE CARDS */}
      <div className="space-y-3">
        {sortedKeepers.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-xs text-slate-400">
            Keine Torhüter in der ausgewählten Trainingsgruppe gefunden.
          </div>
        ) : (
          sortedKeepers.map((keeper, rankIdx) => {
            const score = currentScores[keeper.id] || 0;
            const isLeading = topScore > 0 && score === topScore;

            return (
              <div
                key={keeper.id}
                className={cn(
                  "p-4 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg",
                  isLeading
                    ? "bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30"
                    : rankIdx === 0
                    ? "bg-slate-900 border-slate-800"
                    : "bg-slate-900/80 border-slate-800/80"
                )}
              >
                {/* Left: Rank & Keeper Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs border shadow-inner flex-shrink-0",
                      rankIdx === 0 && topScore > 0
                        ? "bg-amber-500 text-slate-950 border-amber-300 shadow-amber-950"
                        : rankIdx === 1 && topScore > 0
                        ? "bg-slate-300 text-slate-950 border-slate-200"
                        : rankIdx === 2 && topScore > 0
                        ? "bg-amber-800 text-amber-100 border-amber-700"
                        : "bg-slate-950 text-slate-400 border-slate-800"
                    )}
                  >
                    {isLeading ? <Crown className="w-4 h-4 fill-current" /> : rankIdx + 1}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-extrabold text-white truncate flex items-center gap-1.5">
                      <span>{keeper.firstName} {keeper.lastName}</span>
                      {isLeading && (
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500 text-slate-950">
                          Führend
                        </span>
                      )}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {keeper.birthYear ? `Jg. ${keeper.birthYear}` : 'Torhüter'}
                    </span>
                  </div>
                </div>

                {/* Right: Score Counter & Quick Points (+1, +2, +3, -1) */}
                <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
                  {/* Big Score Display */}
                  <div className="text-center min-w-[54px] bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-800">
                    <span className="text-xl font-black font-mono text-amber-400 block leading-none">
                      {score}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">
                      Punkte
                    </span>
                  </div>

                  {/* Point Buttons (Only for specific round, not total view) */}
                  {selectedRoundId !== 'total' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onAdjustScore(activeRound.id, keeper.id, -1)}
                        className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-xl bg-slate-950 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 flex items-center justify-center font-bold text-xs active:scale-95 transition cursor-pointer"
                        title="-1 Punkt"
                      >
                        -1
                      </button>

                      <button
                        type="button"
                        onClick={() => onAdjustScore(activeRound.id, keeper.id, 1)}
                        className="px-3 py-2 min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-emerald-950 text-slate-200 hover:text-emerald-300 border border-slate-700 hover:border-emerald-600 flex items-center justify-center font-black text-xs active:scale-95 transition cursor-pointer"
                        title="+1 Punkt"
                      >
                        +1
                      </button>

                      <button
                        type="button"
                        onClick={() => onAdjustScore(activeRound.id, keeper.id, 2)}
                        className="px-3 py-2 min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-emerald-950 text-emerald-400 border border-slate-700 hover:border-emerald-600 flex items-center justify-center font-black text-xs active:scale-95 transition cursor-pointer"
                        title="+2 Punkte"
                      >
                        +2
                      </button>

                      <button
                        type="button"
                        onClick={() => onAdjustScore(activeRound.id, keeper.id, 3)}
                        className="px-3 py-2 min-h-[44px] min-w-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center shadow-lg shadow-emerald-950/60 active:scale-95 transition cursor-pointer"
                        title="+3 Punkte"
                      >
                        +3
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. ROUND FOOTER ACTIONS (Reset / Delete Round) */}
      {selectedRoundId !== 'total' && activeRound && (
        <div className="flex items-center justify-between text-xs pt-2">
          <button
            type="button"
            onClick={() => onResetRoundScores(activeRound.id)}
            className="text-slate-400 hover:text-amber-400 flex items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-slate-900 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Punkte dieser Runde zurücksetzen</span>
          </button>

          {competitionRounds.length > 1 && (
            <button
              type="button"
              onClick={() => onDeleteRound(activeRound.id)}
              className="text-rose-400/80 hover:text-rose-300 flex items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-rose-950/40 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Runde löschen</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
