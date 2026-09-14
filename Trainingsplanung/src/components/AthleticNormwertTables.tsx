import React, { useState } from 'react';
import { 
  TableProperties, 
  Scale, 
  Dna, 
  Zap, 
  Calculator, 
  Flame, 
  Gauge 
} from 'lucide-react';
import { cn } from '../utils/cn';

// 9-Stufen-Raster Definition
const RATING_LEVELS = [
  { level: '1,0', label: 'Deutlicher Förderbedarf / Reha-Level', zScore: '< -2,0 σ', percentile: '< P 2,5', color: 'bg-rose-950/80 text-rose-300 border-rose-700/80', dot: 'bg-rose-500' },
  { level: '1,5', label: 'Stark unterdurchschnittlich', zScore: '-2,0 σ bis -1,5 σ', percentile: 'P 2,5 - P 7,0', color: 'bg-orange-950/80 text-orange-300 border-orange-700/80', dot: 'bg-orange-500' },
  { level: '2,0', label: 'Unterer Entwicklungsbereich (Basis)', zScore: '-1,5 σ bis -1,0 σ', percentile: 'P 7,0 - P 16,0', color: 'bg-amber-950/80 text-amber-300 border-amber-700/80', dot: 'bg-amber-500' },
  { level: '2,5', label: 'Leicht unter NLZ-Schnitt', zScore: '-1,0 σ bis -0,5 σ', percentile: 'P 16,0 - P 31,0', color: 'bg-yellow-950/80 text-yellow-300 border-yellow-700/80', dot: 'bg-yellow-500' },
  { level: '3,0', label: 'NLZ-Durchschnitt (Sollwert / Baseline)', zScore: '-0,5 σ bis +0,5 σ', percentile: 'P 31,0 - P 69,0', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/90 font-black', dot: 'bg-emerald-400', isBaseline: true },
  { level: '3,5', label: 'Leicht überdurchschnittlich', zScore: '+0,5 σ bis +1,0 σ', percentile: 'P 69,0 - P 84,0', color: 'bg-teal-950/80 text-teal-300 border-teal-700/80', dot: 'bg-teal-400' },
  { level: '4,0', label: 'Gute NLZ-Leistung', zScore: '+1,0 σ bis +1,5 σ', percentile: 'P 84,0 - P 93,0', color: 'bg-sky-950/80 text-sky-300 border-sky-700/80', dot: 'bg-sky-400' },
  { level: '4,5', label: 'Sehr hohes Leistungsniveau', zScore: '+1,5 σ bis +2,0 σ', percentile: 'P 93,0 - P 97,5', color: 'bg-indigo-950/80 text-indigo-300 border-indigo-700/80', dot: 'bg-indigo-400' },
  { level: '5,0', label: 'Elite / Top-Talent (DFB-Schnitt / Benchmark)', zScore: '> +2,0 σ', percentile: '> P 97,5', color: 'bg-purple-950/80 text-purple-300 border-purple-500/90 font-black', dot: 'bg-purple-400', isElite: true },
];

// Parameter Rows for the 3 PHV Stages
interface TestParameterRow {
  parameter: string;
  category: string;
  unit: string;
  isInverse?: boolean; // Lower is better (Sprint, Shuttle, Time)
  values: string[]; // [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]
}

const PRE_PHV_TABLE: TestParameterRow[] = [
  { parameter: '1. Griffkraft', category: 'Maximalkraft Hände/Unterarme', unit: 'kg', values: ['≤ 14', '16', '18', '20', '22', '24', '26', '28', '≥ 30'] },
  { parameter: '2. CMJ Sprunghöhe', category: 'Vertikale Explosivkraft', unit: 'cm', values: ['≤ 22', '24', '26', '28', '30', '32', '34', '36', '≥ 38'] },
  { parameter: '3. Single-Leg Lateral Push', category: 'Laterale Explosivkraft (Abdruck)', unit: 'cm', values: ['≤ 115', '125', '135', '145', '155', '165', '175', '185', '≥ 195'] },
  { parameter: '4. Linearsprint 5 m', category: 'Antritts- & Reaktionsschnelligkeit', unit: 's', isInverse: true, values: ['≥ 1,32', '1,28', '1,24', '1,20', '1,16', '1,12', '1,08', '1,04', '≤ 1,00'] },
  { parameter: '4. Linearsprint 10 m', category: 'Beschleunigungsschnelligkeit', unit: 's', isInverse: true, values: ['≥ 2,25', '2,18', '2,11', '2,04', '1,97', '1,90', '1,83', '1,76', '≤ 1,70'] },
  { parameter: '5. Hybrid-Shuttle 5-10-5', category: 'Richtungswechsel & Agilität (COD)', unit: 's', isInverse: true, values: ['≥ 5,90', '5,75', '5,60', '5,45', '5,30', '5,15', '5,00', '4,85', '≤ 4,70'] },
  { parameter: '6. Medizinballwurf (1 kg)', category: 'Rumpf- & Oberkörper-Schnellkraft', unit: 'm', values: ['≤ 4,5', '5,0', '5,5', '6,0', '6,5', '7,0', '7,5', '8,0', '≥ 8,5'] },
  { parameter: '7. BlazePod T1 - Hits (20s)', category: 'Reaktionsrate / Frequenz', unit: 'Hits', values: ['≤ 24', '26', '28', '30', '32', '34', '36', '38', '≥ 40'] },
  { parameter: '7. BlazePod T2 - Go/No-Go', category: 'Kognitive Handlungsinhibition', unit: 'Hits / Fehler', values: ['16 / ≥4', '18 / 3', '20 / 3', '22 / 2', '24 / 2', '26 / 1', '28 / 1', '30 / 0', '≥ 32 / 0'] },
];

const CIRCA_PHV_TABLE: TestParameterRow[] = [
  { parameter: '1. Griffkraft', category: 'Maximalkraft Hände/Unterarme', unit: 'kg', values: ['≤ 22', '25', '28', '31', '34', '37', '40', '43', '≥ 46'] },
  { parameter: '2. CMJ Sprunghöhe', category: 'Vertikale Explosivkraft', unit: 'cm', values: ['≤ 28', '30', '32', '34', '36', '38', '40', '42', '≥ 45'] },
  { parameter: '3. Single-Leg Lateral Push', category: 'Laterale Explosivkraft (Abdruck)', unit: 'cm', values: ['≤ 145', '155', '165', '175', '185', '195', '205', '215', '≥ 225'] },
  { parameter: '4. Linearsprint 5 m', category: 'Antritts- & Reaktionsschnelligkeit', unit: 's', isInverse: true, values: ['≥ 1,24', '1,20', '1,16', '1,12', '1,08', '1,04', '1,00', '0,97', '≤ 0,94'] },
  { parameter: '4. Linearsprint 10 m', category: 'Beschleunigungsschnelligkeit', unit: 's', isInverse: true, values: ['≥ 2,08', '2,01', '1,94', '1,88', '1,82', '1,76', '1,70', '1,64', '≤ 1,58'] },
  { parameter: '5. Hybrid-Shuttle 5-10-5', category: 'Richtungswechsel & Agilität (COD)', unit: 's', isInverse: true, values: ['≥ 5,45', '5,30', '5,15', '5,00', '4,85', '4,70', '4,55', '4,40', '≤ 4,25'] },
  { parameter: '6. Medizinballwurf (2 kg)', category: 'Rumpf- & Oberkörper-Schnellkraft', unit: 'm', values: ['≤ 5,5', '6,2', '6,9', '7,6', '8,3', '9,0', '9,7', '10,4', '≥ 11,2'] },
  { parameter: '7. BlazePod T1 - Hits (20s)', category: 'Reaktionsrate / Frequenz', unit: 'Hits', values: ['≤ 25', '28', '30', '32', '34', '36', '38', '40', '≥ 43'] },
  { parameter: '7. BlazePod T2 - Go/No-Go', category: 'Kognitive Handlungsinhibition', unit: 'Hits / Fehler', values: ['17 / ≥4', '19 / 3', '21 / 2', '23 / 2', '25 / 1', '27 / 1', '29 / 0', '31 / 0', '≥ 34 / 0'] },
];

const POST_PHV_TABLE: TestParameterRow[] = [
  { parameter: '1. Griffkraft', category: 'Maximalkraft Hände/Unterarme', unit: 'kg', values: ['≤ 34', '38', '42', '46', '50', '54', '58', '62', '≥ 66'] },
  { parameter: '2. CMJ Sprunghöhe', category: 'Vertikale Explosivkraft', unit: 'cm', values: ['≤ 34', '37', '40', '43', '46', '49', '52', '55', '≥ 58'] },
  { parameter: '3. Single-Leg Lateral Push', category: 'Laterale Explosivkraft (Abdruck)', unit: 'cm', values: ['≤ 175', '185', '195', '205', '215', '225', '235', '245', '≥ 255'] },
  { parameter: '4. Linearsprint 5 m', category: 'Antritts- & Reaktionsschnelligkeit', unit: 's', isInverse: true, values: ['≥ 1,16', '1,12', '1,08', '1,04', '1,01', '0,98', '0,95', '0,92', '≤ 0,89'] },
  { parameter: '4. Linearsprint 10 m', category: 'Beschleunigungsschnelligkeit', unit: 's', isInverse: true, values: ['≥ 1,92', '1,86', '1,80', '1,74', '1,68', '1,62', '1,57', '1,52', '≤ 1,47'] },
  { parameter: '5. Hybrid-Shuttle 5-10-5', category: 'Richtungswechsel & Agilität (COD)', unit: 's', isInverse: true, values: ['≥ 5,10', '4,95', '4,80', '4,65', '4,50', '4,35', '4,20', '4,08', '≤ 3,95'] },
  { parameter: '6. Medizinballwurf (2 kg)', category: 'Rumpf- & Oberkörper-Schnellkraft', unit: 'm', values: ['≤ 8,0', '9,0', '10,0', '11,0', '12,0', '13,0', '14,0', '15,0', '≥ 16,0'] },
  { parameter: '7. BlazePod T1 - Hits (20s)', category: 'Reaktionsrate / Frequenz', unit: 'Hits', values: ['≤ 30', '33', '35', '38', '41', '44', '46', '49', '≥ 52'] },
  { parameter: '7. BlazePod T2 - Go/No-Go', category: 'Kognitive Handlungsinhibition', unit: 'Hits / Fehler', values: ['21 / ≥3', '24 / 2', '27 / 2', '30 / 1', '33 / 1', '36 / 0', '39 / 0', '42 / 0', '≥ 45 / 0'] },
];

export const AthleticNormwertTables: React.FC = () => {
  const [activePhvFilter, setActivePhvFilter] = useState<'all' | 'pre' | 'circa' | 'post'>('all');

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* ========================================================================= */}
      {/* 1. HERO BANNER                                                            */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-3xl border border-slate-800 p-6 sm:p-7 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-400">
              <TableProperties className="w-4 h-4 text-teal-400" />
              <span>NextLevel Goalkeeping Academy • Leistungsdiagnostik</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white">
              Normwerttabellen & 9-Stufen-Raster nach PHV-Reifegrad
            </h3>
          </div>

          <span className="px-3.5 py-1.5 rounded-xl bg-teal-950/80 text-teal-300 border border-teal-700/80 font-bold text-xs flex items-center gap-1.5 shadow-sm">
            <Scale className="w-3.5 h-3.5" />
            <span>NLZ-Wissenschaftsstandard</span>
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl">
          Standardisierte athletische Leistungsbewertung für NLZ-Nachwuchstorhüter auf Basis von 
          statistischen <strong>Z-Score-Perzentilbändern</strong> und dem biologischen Reifegrad 
          (<strong>Pre-PHV</strong>, <strong>Circa-PHV</strong>, <strong>Post-PHV</strong>).
        </p>

        {/* Quick Jumper Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 flex-wrap">
          <span className="text-[11px] font-bold uppercase text-slate-400 mr-1">
            Ansicht filtern:
          </span>
          <button
            type="button"
            onClick={() => setActivePhvFilter('all')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5",
              activePhvFilter === 'all'
                ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-black shadow-sm"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            )}
          >
            <TableProperties className="w-3.5 h-3.5" />
            <span>Alle 3 Reifegrade</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePhvFilter('pre')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5",
              activePhvFilter === 'pre'
                ? "bg-gradient-to-r from-sky-500 to-teal-500 text-slate-950 font-black shadow-sm"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            )}
          >
            <Dna className="w-3.5 h-3.5 text-sky-400" />
            <span>Tabelle A: Pre-PHV (U12–U13)</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePhvFilter('circa')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5",
              activePhvFilter === 'circa'
                ? "bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black shadow-sm"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            )}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Tabelle B: Circa-PHV (U14–U15)</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePhvFilter('post')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5",
              activePhvFilter === 'post'
                ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-slate-950 font-black shadow-sm"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            )}
          >
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>Tabelle C: Post-PHV (U16–U19+)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SYSTEMATIK DES 9-STUFEN-BEWERTUNGSSRASTERS                              */}
      {/* ========================================================================= */}
      {activePhvFilter === 'all' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-white">
                  1. Systematik des 9-Stufen-Bewertungsrasters
                </h4>
                <p className="text-xs text-slate-400">
                  Statistische Einteilung von Schulnoten (1,0 bis 5,0) auf Basis von Z-Score & Perzentilbändern
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800">
              9 Bewertungsstufen
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800 text-[10.5px]">
                <tr>
                  <th className="py-3 px-4 w-20 text-center">Stufe</th>
                  <th className="py-3 px-4">NLZ-Leistungsniveau & Einstufung</th>
                  <th className="py-3 px-4 text-center">Statistischer Z-Score Bereich</th>
                  <th className="py-3 px-4 text-center">Perzentilband (P)</th>
                  <th className="py-3 px-4 text-right">Bedeutung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {RATING_LEVELS.map(item => (
                  <tr 
                    key={item.level} 
                    className={cn(
                      "hover:bg-slate-850/60 transition",
                      item.isBaseline && "bg-emerald-950/20",
                      item.isElite && "bg-purple-950/20"
                    )}
                  >
                    <td className="py-3 px-4 text-center">
                      <span className={cn(
                        "inline-flex items-center justify-center px-2.5 py-1 rounded-xl text-xs font-black border font-mono shadow-sm",
                        item.color
                      )}>
                        {item.level}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", item.dot)} />
                        <strong className={cn(
                          "text-xs",
                          item.isBaseline ? "text-emerald-300 font-black" : item.isElite ? "text-purple-300 font-black" : "text-white"
                        )}>
                          {item.label}
                        </strong>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-300">
                      {item.zScore}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[11px] text-teal-300 font-bold">
                      {item.percentile}
                    </td>
                    <td className="py-3 px-4 text-right text-[11px] text-slate-400">
                      {item.isBaseline ? (
                        <span className="text-emerald-400 font-bold">★ NLZ-Sollwert (50. Perzentil)</span>
                      ) : item.isElite ? (
                        <span className="text-purple-400 font-bold">★ DFB-Spitzenbenchmark</span>
                      ) : (
                        'Standard-Einstufung'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DIE 3 NORMWERTTABELLEN (PRE, CIRCA, POST)                              */}
      {/* ========================================================================= */}

      {/* TABELLE A: PRE-PHV */}
      {(activePhvFilter === 'all' || activePhvFilter === 'pre') && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Dna className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-white">
                    2. Normwerttabelle A: Pre-PHV
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800 text-[10.5px] font-bold">
                    Grundlagenbereich / Ca. U12–U13
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  <strong>Maturity Offset &lt; -1,0 Jahre</strong> • Geringe Muskelmasse, ZNS- und koordinationsdominierte Leistungsprofile
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
              10 Testparameter
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800 text-[10.5px]">
                <tr>
                  <th className="py-3 px-3.5 min-w-[200px]">Testübung / Parameter</th>
                  <th className="py-3 px-2 text-center text-rose-400 bg-rose-950/20">1,0</th>
                  <th className="py-3 px-2 text-center text-orange-400">1,5</th>
                  <th className="py-3 px-2 text-center text-amber-400">2,0</th>
                  <th className="py-3 px-2 text-center text-yellow-400">2,5</th>
                  <th className="py-3 px-2.5 text-center text-emerald-300 font-black bg-emerald-950/50 border-x border-emerald-500/40">3,0 (Soll)</th>
                  <th className="py-3 px-2 text-center text-teal-400">3,5</th>
                  <th className="py-3 px-2 text-center text-sky-400">4,0</th>
                  <th className="py-3 px-2 text-center text-indigo-400">4,5</th>
                  <th className="py-3 px-2.5 text-center text-purple-300 font-black bg-purple-950/40 border-l border-purple-500/40">5,0 (Elite)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11.5px]">
                {PRE_PHV_TABLE.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-850/60 transition">
                    <td className="py-3 px-3.5 font-sans font-bold text-white">
                      <div className="flex flex-col">
                        <span>{row.parameter}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{row.category}</span>
                      </div>
                    </td>
                    {row.values.map((val, vIdx) => {
                      const isBaseline = vIdx === 4; // 3.0
                      const isElite = vIdx === 8; // 5.0
                      return (
                        <td 
                          key={vIdx} 
                          className={cn(
                            "py-3 px-2 text-center whitespace-nowrap",
                            isBaseline ? "bg-emerald-950/30 font-black text-emerald-300 border-x border-emerald-500/20" :
                            isElite ? "bg-purple-950/20 font-black text-purple-300 border-l border-purple-500/20" :
                            "text-slate-200"
                          )}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABELLE B: CIRCA-PHV */}
      {(activePhvFilter === 'all' || activePhvFilter === 'circa') && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-white">
                    3. Normwerttabelle B: Circa-PHV
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-[10.5px] font-bold">
                    Aufbaubereich / Ca. U14–U15
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  <strong>Maturity Offset -1,0 bis +1,0 Jahre</strong> • Wachstumsschub, Hebelveränderungen, Zuwachs an Rumpf- & Schnellkraft
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
              10 Testparameter
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800 text-[10.5px]">
                <tr>
                  <th className="py-3 px-3.5 min-w-[200px]">Testübung / Parameter</th>
                  <th className="py-3 px-2 text-center text-rose-400 bg-rose-950/20">1,0</th>
                  <th className="py-3 px-2 text-center text-orange-400">1,5</th>
                  <th className="py-3 px-2 text-center text-amber-400">2,0</th>
                  <th className="py-3 px-2 text-center text-yellow-400">2,5</th>
                  <th className="py-3 px-2.5 text-center text-emerald-300 font-black bg-emerald-950/50 border-x border-emerald-500/40">3,0 (Soll)</th>
                  <th className="py-3 px-2 text-center text-teal-400">3,5</th>
                  <th className="py-3 px-2 text-center text-sky-400">4,0</th>
                  <th className="py-3 px-2 text-center text-indigo-400">4,5</th>
                  <th className="py-3 px-2.5 text-center text-purple-300 font-black bg-purple-950/40 border-l border-purple-500/40">5,0 (Elite)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11.5px]">
                {CIRCA_PHV_TABLE.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-850/60 transition">
                    <td className="py-3 px-3.5 font-sans font-bold text-white">
                      <div className="flex flex-col">
                        <span>{row.parameter}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{row.category}</span>
                      </div>
                    </td>
                    {row.values.map((val, vIdx) => {
                      const isBaseline = vIdx === 4; // 3.0
                      const isElite = vIdx === 8; // 5.0
                      return (
                        <td 
                          key={vIdx} 
                          className={cn(
                            "py-3 px-2 text-center whitespace-nowrap",
                            isBaseline ? "bg-emerald-950/30 font-black text-emerald-300 border-x border-emerald-500/20" :
                            isElite ? "bg-purple-950/20 font-black text-purple-300 border-l border-purple-500/20" :
                            "text-slate-200"
                          )}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABELLE C: POST-PHV */}
      {(activePhvFilter === 'all' || activePhvFilter === 'post') && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-white">
                    4. Normwerttabelle C: Post-PHV
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 text-[10.5px] font-bold">
                    Leistungsbereich / Ca. U16–U19 & Übergang
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  <strong>Maturity Offset &gt; +1,0 Jahre</strong> • Ausgereiftes neuromuskuläres Profil, hohe Explosiv- & Maximalkraft
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
              10 Testparameter
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800 text-[10.5px]">
                <tr>
                  <th className="py-3 px-3.5 min-w-[200px]">Testübung / Parameter</th>
                  <th className="py-3 px-2 text-center text-rose-400 bg-rose-950/20">1,0</th>
                  <th className="py-3 px-2 text-center text-orange-400">1,5</th>
                  <th className="py-3 px-2 text-center text-amber-400">2,0</th>
                  <th className="py-3 px-2 text-center text-yellow-400">2,5</th>
                  <th className="py-3 px-2.5 text-center text-emerald-300 font-black bg-emerald-950/50 border-x border-emerald-500/40">3,0 (Soll)</th>
                  <th className="py-3 px-2 text-center text-teal-400">3,5</th>
                  <th className="py-3 px-2 text-center text-sky-400">4,0</th>
                  <th className="py-3 px-2 text-center text-indigo-400">4,5</th>
                  <th className="py-3 px-2.5 text-center text-purple-300 font-black bg-purple-950/40 border-l border-purple-500/40">5,0 (Elite)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11.5px]">
                {POST_PHV_TABLE.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-850/60 transition">
                    <td className="py-3 px-3.5 font-sans font-bold text-white">
                      <div className="flex flex-col">
                        <span>{row.parameter}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{row.category}</span>
                      </div>
                    </td>
                    {row.values.map((val, vIdx) => {
                      const isBaseline = vIdx === 4; // 3.0
                      const isElite = vIdx === 8; // 5.0
                      return (
                        <td 
                          key={vIdx} 
                          className={cn(
                            "py-3 px-2 text-center whitespace-nowrap",
                            isBaseline ? "bg-emerald-950/30 font-black text-emerald-300 border-x border-emerald-500/20" :
                            isElite ? "bg-purple-950/20 font-black text-purple-300 border-l border-purple-500/20" :
                            "text-slate-200"
                          )}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DIAGNOSTISCHE ZUSATZFORMELN & AUSWERTUNGSHINWEISE                      */}
      {/* ========================================================================= */}
      {activePhvFilter === 'all' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          
          {/* FORMEL 1: MIRWALD MATURITY OFFSET */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">
                    Biologische Reifegradbestimmung (Mirwald Formel)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Maturity Offset Schätzung für männliche Nachwuchsathleten
                  </p>
                </div>
              </div>

              {/* Formula Code Box */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-teal-300 leading-relaxed overflow-x-auto shadow-inner">
                <strong>Offset (Jahre) =</strong> -9,236 + (0,0002708 × Beinlänge × Sitzhöhe) - (0,001663 × Alter × Beinlänge) + (0,007216 × Alter × Sitzhöhe) + (0,02292 × [Gewicht / Körperhöhe] × 100)
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <p className="text-[11px] text-slate-400">
                  • <strong>Beinlänge</strong> = Körperhöhe - Sitzhöhe (in cm)<br />
                  • <strong>Alter</strong> = Dezimalalter zum Testzeitpunkt (in Jahren)
                </p>
              </div>
            </div>

            {/* Classification Pills */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-sky-950/60 border border-sky-800/80">
                <span className="text-[10px] text-sky-400 block font-bold uppercase">Pre-PHV</span>
                <strong className="text-white text-xs font-mono">&lt; -1,0 J.</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800/80">
                <span className="text-[10px] text-amber-400 block font-bold uppercase">Circa-PHV</span>
                <strong className="text-white text-xs font-mono">-1,0 bis +1,0 J.</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-800/80">
                <span className="text-[10px] text-purple-400 block font-bold uppercase">Post-PHV</span>
                <strong className="text-white text-xs font-mono">&gt; +1,0 J.</strong>
              </div>
            </div>
          </div>

          {/* FORMEL 2: SYMMETRIE-INDEX (L/R ASYMMETRIE) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">
                    Symmetrie-Index (Griffkraft, Lateral Push, Shuttle Start R/L)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Erkennung von bilateralen Leistungsdefiziten & Verletzungsprävention
                  </p>
                </div>
              </div>

              {/* Formula Code Box */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-rose-300 leading-relaxed overflow-x-auto shadow-inner">
                <strong>Asymmetrie-Index (%) =</strong> [(Starke Seite - Schwache Seite) / Starke Seite] × 100
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Bei unilateralen Kraft- und Sprungtests (z. B. Lateral Push Rechts vs. Links) darf die Asymmetrie physiologische Schwellen nicht überschreiten.
              </p>
            </div>

            {/* Threshold Matrix */}
            <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
                <span className="font-bold text-emerald-300">≤ 5 % Asymmetrie</span>
                <span className="text-[11px] text-slate-300 font-medium">Exzellent / Physiologisch symmetrisch</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-amber-950/40 border border-amber-800/60">
                <span className="font-bold text-amber-300">6 – 10 % Asymmetrie</span>
                <span className="text-[11px] text-slate-300 font-medium">Physiologischer Toleranzbereich</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-rose-950/40 border border-rose-800/60">
                <span className="font-bold text-rose-300">&gt; 10 % Asymmetrie</span>
                <span className="text-[11px] text-rose-200 font-bold">Signifikantes Defizit (Abwertung um 0,5 Stufen)</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
