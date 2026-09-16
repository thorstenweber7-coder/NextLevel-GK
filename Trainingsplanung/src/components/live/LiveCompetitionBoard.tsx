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

  // Standard keeper order: preserve original groupKeepers order without sorting
  const displayedKeepers = groupKeepers;

  // Determine top score (greatest number / lowest negative points / fewest conceded goals)
  const allScores = displayedKeepers.map(k => currentScores[k.id] ?? 0);
  const hasAnyScoreRecorded = displayedKeepers.some(k => currentScores[k.id] !== undefined && currentScores[k.id] !== 0);
  const topScore = displayedKeepers.length > 0 ? Math.max(...allScores) : 0;

  return (
    <div className="space-y-3">
      {/* 1. ROUND TABS & CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3.5 sm:p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs sm:text-sm font-extrabold text-white">Torwart-Wettkampf</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAddRound()}
              className="px-3 py-1.5 min-h-[38px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Neue Runde</span>
            </button>
          </div>
        </div>

        {/* Round Tabs Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {competitionRounds.map((r, idx) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRoundId(r.id)}
              className={cn(
                "px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold whitespace-nowrap transition border flex items-center gap-1.5 cursor-pointer",
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
                "px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-extrabold whitespace-nowrap transition border flex items-center gap-1.5 cursor-pointer",
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

      {/* 2. KEEPER SCORE CARDS (Fixed Standard Order, [-1] [Score] [+1]) */}
      <div className="space-y-2">
        {displayedKeepers.length === 0 ? (
          <div className="p-6 text-center bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400">
            Keine Torhüter in der ausgewählten Trainingsgruppe gefunden.
          </div>
        ) : (
          displayedKeepers.map((keeper, idx) => {
            const score = currentScores[keeper.id] ?? 0;
            const isLeading = hasAnyScoreRecorded && score === topScore;

            return (
              <div
                key={keeper.id}
                className={cn(
                  "p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-md",
                  isLeading
                    ? "bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30"
                    : "bg-slate-900 border-slate-800"
                )}
              >
                {/* Left: Fixed Rank / Crown & Keeper Info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs border shadow-inner flex-shrink-0",
                      isLeading
                        ? "bg-amber-500 text-slate-950 border-amber-300 shadow-amber-950"
                        : "bg-slate-950 text-slate-400 border-slate-800"
                    )}
                  >
                    {isLeading ? <Crown className="w-4 h-4 fill-current" /> : idx + 1}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-extrabold text-white truncate flex items-center gap-1.5">
                      <span>{keeper.firstName} {keeper.lastName}</span>
                      {isLeading && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500 text-slate-950">
                          Führend
                        </span>
                      )}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {keeper.birthYear ? `Jg. ${keeper.birthYear}` : 'Torhüter'}
                    </span>
                  </div>
                </div>

                {/* Right: Score Counter [-1] [Score] [+1] */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {selectedRoundId !== 'total' && (
                    <button
                      type="button"
                      onClick={() => onAdjustScore(activeRound.id, keeper.id, -1)}
                      className="w-9 h-9 min-h-[38px] min-w-[38px] rounded-xl bg-slate-950 hover:bg-rose-950/70 text-rose-400 border border-slate-800 hover:border-rose-700/50 flex items-center justify-center font-black text-xs active:scale-95 transition cursor-pointer shadow-sm"
                      title="-1 Punkt (z.B. Gegentor)"
                    >
                      -1
                    </button>
                  )}

                  {/* Big Score Display */}
                  <div className="text-center min-w-[50px] bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 shadow-inner">
                    <span className={cn(
                      "text-base sm:text-lg font-black font-mono block leading-none",
                      score > 0 ? "text-emerald-400" : score < 0 ? "text-rose-400" : "text-amber-400"
                    )}>
                      {score > 0 ? `+${score}` : score}
                    </span>
                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">
                      Punkte
                    </span>
                  </div>

                  {selectedRoundId !== 'total' && (
                    <button
                      type="button"
                      onClick={() => onAdjustScore(activeRound.id, keeper.id, 1)}
                      className="w-9 h-9 min-h-[38px] min-w-[38px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 flex items-center justify-center font-black text-xs active:scale-95 transition cursor-pointer shadow-md shadow-emerald-950/50"
                      title="+1 Punkt"
                    >
                      +1
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. ROUND FOOTER ACTIONS (Reset / Delete Round) */}
      {selectedRoundId !== 'total' && activeRound && (
        <div className="flex items-center justify-between text-[11px] pt-1 px-1">
          <button
            type="button"
            onClick={() => onResetRoundScores(activeRound.id)}
            className="text-slate-400 hover:text-amber-400 flex items-center gap-1.5 py-1 px-2 rounded-xl hover:bg-slate-900 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Punkte zurücksetzen</span>
          </button>

          {competitionRounds.length > 1 && (
            <button
              type="button"
              onClick={() => onDeleteRound(activeRound.id)}
              className="text-rose-400/80 hover:text-rose-300 flex items-center gap-1.5 py-1 px-2 rounded-xl hover:bg-rose-950/40 transition"
            >
              <Trash2 className="w-3 h-3" />
              <span>Runde löschen</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
