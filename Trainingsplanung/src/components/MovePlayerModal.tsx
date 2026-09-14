import React, { useState } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  Users, 
  Loader2, 
  AlertCircle,
  Shield
} from 'lucide-react';
import { cn } from '../utils/cn';
import type { Player, TrainingGroup } from '../types';
import { movePlayerBetweenGroups } from '../firebase/firestoreService';
import { useAuth } from '../context/AuthContext';

interface MovePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  sourceGroup: TrainingGroup | null;
  allGroups: TrainingGroup[];
  onPlayerMoved?: (playerName: string, targetGroupName: string) => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

export const MovePlayerModal: React.FC<MovePlayerModalProps> = ({
  isOpen,
  onClose,
  player,
  sourceGroup,
  allGroups,
  onPlayerMoved,
  showToast
}) => {
  const { user, clubId } = useAuth();
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Available target groups (all groups except current source group)
  const targetGroups = React.useMemo(() => {
    if (!sourceGroup) return [];
    return allGroups.filter(g => g.id !== sourceGroup.id);
  }, [allGroups, sourceGroup]);

  // Set default selection when modal opens or targetGroups changes
  React.useEffect(() => {
    if (targetGroups.length > 0) {
      setSelectedTargetGroupId(targetGroups[0].id);
    } else {
      setSelectedTargetGroupId('');
    }
    setErrorMessage(null);
  }, [isOpen, targetGroups]);

  if (!isOpen || !player || !sourceGroup) return null;

  const playerName = `${player.firstName} ${player.lastName}`.trim();

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetGroupId) {
      setErrorMessage('Bitte wähle eine Ziel-Trainingsgruppe aus.');
      return;
    }

    const targetGroup = allGroups.find(g => g.id === selectedTargetGroupId);
    if (!targetGroup) {
      setErrorMessage('Die ausgewählte Zielgruppe wurde nicht gefunden.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const result = await movePlayerBetweenGroups(
        sourceGroup.id,
        selectedTargetGroupId,
        player.id,
        user,
        clubId
      );

      if (showToast) {
        showToast(result.message, 'success');
      }

      if (onPlayerMoved) {
        onPlayerMoved(playerName, targetGroup.name);
      }

      onClose();
    } catch (err: any) {
      console.error('Error moving player:', err);
      const errMsg = err?.message || 'Fehler beim Verschieben des Torhüters.';
      setErrorMessage(errMsg);
      if (showToast) {
        showToast(errMsg, 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleIn flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                Torhüter verschieben
              </h2>
              <p className="text-xs text-slate-400">
                Gruppe wechseln & Datenverknüpfungen übertragen
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleMove} className="p-6 space-y-5">
          
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-950/80 border border-rose-800 rounded-2xl text-xs font-bold text-rose-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Player & Current Group Preview */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Ausgewählter Torhüter
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {player.birthYear ? `Jg. ${player.birthYear}` : 'Kein Jahrgang'}
              </span>
            </div>
            <div className="text-sm font-extrabold text-white flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-300 text-xs font-black">
                {player.firstName.charAt(0)}{player.lastName.charAt(0)}
              </div>
              <span>{playerName}</span>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-900 text-xs text-slate-400">
              <span>Aktuelle Gruppe:</span>
              <span className="font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-lg">
                {sourceGroup.name}
              </span>
            </div>
          </div>

          {/* Target Group Selector */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-300 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ziel-Trainingsgruppe auswählen:</span>
            </label>

            {targetGroups.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-800/50 text-amber-300 text-xs text-center space-y-1">
                <p className="font-bold">Keine weitere Trainingsgruppe vorhanden.</p>
                <p className="text-[11px] text-amber-400/80">
                  Erstelle im Bereich "Trainingsgruppen" zuerst eine weitere Gruppe, um Spieler verschieben zu können.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                {targetGroups.map(grp => {
                  const isSelected = selectedTargetGroupId === grp.id;
                  const count = (grp.players || []).filter(p => !p.archived).length;
                  return (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => setSelectedTargetGroupId(grp.id)}
                      className={cn(
                        "p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer active:scale-98",
                        isSelected
                          ? "bg-cyan-950/80 border-cyan-500 shadow-md shadow-cyan-950 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0",
                          isSelected ? "border-cyan-400 bg-cyan-400" : "border-slate-600"
                        )}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </div>
                        <div className="min-w-0">
                          <span className={cn("text-xs font-bold block truncate", isSelected ? "text-cyan-200" : "text-white")}>
                            {grp.name}
                          </span>
                          {grp.ageCategory && (
                            <span className="text-[10px] text-slate-500 block">
                              Altersklasse: {grp.ageCategory}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 flex-shrink-0">
                        {count} {count === 1 ? 'TW' : 'TWs'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info Notice */}
          <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-200/90 leading-relaxed flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Hinweis:</strong> Alle historischen Leistungsdaten, Abwesenheiten und Feedback-Gespräche dieses Torhüters bleiben lückenlos erhalten und werden automatisch auf die neue Trainingsgruppe umgebucht.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting || targetGroups.length === 0 || !selectedTargetGroupId}
              className="px-5 py-2.5 rounded-2xl text-xs font-extrabold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 transition shadow-lg shadow-cyan-950 flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Wird verschoben...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4 text-slate-950" />
                  <span>Torhüter verschieben</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
