import React, { useState } from 'react';
import type { TacticalPrinciple } from '../../types';
import { X, Search, CheckCircle2, ShieldCheck } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface TacticalPrinciplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tacticalPrinciples: TacticalPrinciple[];
  selectedPrinciples: string[];
  onTogglePrinciple: (principleName: string) => void;
  includeInPdf: boolean;
  onToggleIncludeInPdf: () => void;
}

export const TacticalPrinciplesModal: React.FC<TacticalPrinciplesModalProps> = ({
  isOpen,
  onClose,
  tacticalPrinciples,
  selectedPrinciples,
  onTogglePrinciple,
  includeInPdf,
  onToggleIncludeInPdf
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  if (!isOpen) return null;

  const filtered = tacticalPrinciples.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      (p.tacticName || '').toLowerCase().includes(term) ||
      (p.group || '').toLowerCase().includes(term) ||
      (p.taktikprinzipien || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Taktische Torwartprinzipien</h3>
              <p className="text-xs text-slate-400">Verhalten, Entscheidungsfindung & Raum-/Zielverteidigung</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & PDF inclusion switch */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Prinzip suchen (z. B. Raumverteidigung, 1vs1, Stellungsspiel)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeInPdf}
              onChange={onToggleIncludeInPdf}
              className="rounded bg-slate-950 border-slate-700 text-cyan-600 focus:ring-cyan-500"
            />
            <span>Ausgewählte Prinzipien auf Trainingsplan-PDF mit andrucken</span>
          </label>
        </div>

        {/* List of Tactical Principles */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-96">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-950 rounded-2xl border border-slate-800">
              Keine taktischen Prinzipien gefunden.
            </div>
          ) : (
            filtered.map(p => {
              const name = p.tacticName || 'Prinzip';
              const isSelected = selectedPrinciples.includes(name);

              return (
                <div
                  key={p.id}
                  onClick={() => onTogglePrinciple(name)}
                  className={cn(
                    "p-3.5 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-3 select-none",
                    isSelected
                      ? "bg-cyan-950/40 border-cyan-500/60 text-cyan-200"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                  )}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-white block">{name}</span>
                      {p.group && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-semibold">
                          {p.group}
                        </span>
                      )}
                    </div>
                    {p.taktikprinzipien && (
                      <p className="text-[11px] text-slate-400 line-clamp-2">{p.taktikprinzipien}</p>
                    )}
                  </div>

                  <div className={cn(
                    "w-6 h-6 rounded-xl flex items-center justify-center flex-shrink-0 transition",
                    isSelected ? "bg-cyan-500 text-slate-950" : "bg-slate-900 border border-slate-800 text-transparent"
                  )}>
                    <CheckCircle2 className="w-4 h-4 fill-current" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <span className="text-xs text-slate-400">
            {selectedPrinciples.length} Prinzipien ausgewählt
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs transition shadow-lg shadow-cyan-950 cursor-pointer"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
};
