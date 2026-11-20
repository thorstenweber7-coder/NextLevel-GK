import React, { useState, useEffect } from 'react';
import { X, Shield, FileText, Scale } from 'lucide-react';
import { cn } from '../utils/cn';

export type LegalTab = 'impressum' | 'datenschutz' | 'agb';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'datenschutz',
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Rechtliche Hinweise &amp; Datenschutz (DSGVO)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-5 pt-3 border-b border-slate-800 flex gap-2 bg-slate-950/30">
          <button
            type="button"
            onClick={() => setActiveTab('datenschutz')}
            className={cn(
              "px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition flex items-center gap-1.5 cursor-pointer",
              activeTab === 'datenschutz'
                ? "border-emerald-400 text-emerald-300 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Datenschutz (DSGVO)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('impressum')}
            className={cn(
              "px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition flex items-center gap-1.5 cursor-pointer",
              activeTab === 'impressum'
                ? "border-emerald-400 text-emerald-300 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Impressum</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('agb')}
            className={cn(
              "px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition flex items-center gap-1.5 cursor-pointer",
              activeTab === 'agb'
                ? "border-emerald-400 text-emerald-300 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Nutzungsbedingungen</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto text-xs sm:text-sm text-slate-300 leading-relaxed space-y-4">
          {activeTab === 'datenschutz' && (
            <>
              <h3 className="text-base font-extrabold text-white">Datenschutzerklärung (gemäß DSGVO Art. 13/14)</h3>
              <p>
                Der Schutz personenbezogener Daten von Trainern sowie den betreuten Torhüterinnen und Torhütern hat höchste Priorität.
              </p>

              <div className="space-y-1.5">
                <h4 className="font-bold text-emerald-300">1. Verantwortlicher</h4>
                <p>
                  NextLevel Goalkeeping Development — Thorsten Weber, Erbsengasse 17, 97953 Königheim, E-Mail: Nextlevel-gka@gmail.com.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-emerald-300">2. Verarbeitete Daten &amp; Zweck</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li><strong>Trainer-Accountdaten:</strong> E-Mail-Adresse, Name, Rolle und Vereinszuordnung zur Authentifizierung und Lizenzverwaltung (Art. 6 Abs. 1 lit. b DSGVO).</li>
                  <li><strong>Trainings- &amp; Übungsdaten:</strong> Trainingspläne, Übungen, Taktikgrafiken, Periodisierung (Makro/Meso/Mikro) zur Erbringung der Planungsfunktion.</li>
                  <li><strong>Spieler- &amp; Gesundheitsdaten (Art. 9 DSGVO):</strong> Namen, Geburtsdaten/Altersklassen, Fehlzeiten inkl. Verletzungsangaben, anthropometrische Werte (Bio-Banding), Spielzeiten und Leistungsbewertungen werden ausschließlich im Auftrag des jeweiligen Trainers bzw. Vereins gespeichert.</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-700/50 text-amber-200 text-xs space-y-1">
                <strong className="block text-amber-300">Wichtiger Hinweis für Trainer &amp; Vereine (Minderjährige &amp; Gesundheitsdaten):</strong>
                <span>
                  Bei der Erfassung von Spielerdaten – insbesondere von Minderjährigen sowie von Gesundheits-/Verletzungsangaben (Art. 8 &amp; Art. 9 DSGVO) – ist der nutzende Verein bzw. Trainer verpflichtet, vorab die erforderliche Einwilligung der Erziehungsberechtigten bzw. betroffenen Personen einzuholen und bei Vereinsnutzung einen Auftragsverarbeitungsvertrag (AVV) abzuschließen.
                </span>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-emerald-300">3. Hosting, Sicherheit &amp; Auftragsverarbeiter</h4>
                <p>
                  Die Anwendung nutzt Google Firebase (Authentication, Cloud Firestore, Cloud Storage) sowie Firebase App Check / Google Cloud Fraud Defense (reCAPTCHA Enterprise) zum Schutz vor automatisiertem Missbrauch, zur verschlüsselten Übertragung (TLS) und Speicherung sowie lokalen Browser-Speicher (IndexedDB / localStorage) für die Offline-Funktionalität auf dem Trainingsplatz.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-emerald-300">4. Rechte der betroffenen Personen</h4>
                <p>
                  Sie haben jederzeit das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) sowie Widerspruch (Art. 21). Kontaktieren Sie hierzu den Verantwortlichen.
                </p>
              </div>
            </>
          )}

          {activeTab === 'impressum' && (
            <>
              <h3 className="text-base font-extrabold text-white">Impressum (Angaben gemäß § 5 DDG / § 5 TMG)</h3>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <p className="font-bold text-white">NextLevel Goalkeeping Development</p>
                <p><strong>Inhaber / Verantwortlicher:</strong> Thorsten Weber</p>
                <p><strong>Anschrift:</strong> Erbsengasse 17, 97953 Königheim</p>
                <p><strong>Kontakt:</strong> E-Mail: Nextlevel-gka@gmail.com</p>
              </div>
              <p className="text-xs text-slate-400">
                Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV: Thorsten Weber, Erbsengasse 17, 97953 Königheim.
              </p>
            </>
          )}

          {activeTab === 'agb' && (
            <>
              <h3 className="text-base font-extrabold text-white">Nutzungsbedingungen</h3>
              <div className="space-y-2">
                <p>
                  <strong>1. Leistungsgegenstand:</strong> NextLevel Coach PRO stellt eine webbasierte Trainingsplanungs-, Taktikboard- und Organisationsplattform für Torwarttrainer und Vereine bereit.
                </p>
                <p>
                  <strong>2. Testphase &amp; Lizenzen:</strong> Neu registrierte Einzelnutzer erhalten eine kostenlose 14-tägige Testphase. Nach Ablauf ist für die weitere Nutzung eine Freischaltung als Einzelnutzer (Standard/Pro) oder über eine Vereinslizenz erforderlich.
                </p>
                <p>
                  <strong>3. Urheberrecht &amp; Inhalte:</strong> Vom Nutzer erstellte private Übungen verbleiben beim Nutzer. Vom Master-Admin veröffentlichte Akademie-Übungen dürfen im Rahmen der aktiven Lizenz für die eigene Trainingsplanung genutzt, jedoch nicht kommerziell weiterverbreitet werden.
                </p>
                <p>
                  <strong>4. Sorgfaltspflicht bei Trainings- &amp; Belastungsdaten:</strong> Alle Belastungsempfehlungen (z. B. ACWR, Platzbelagsfaktoren) dienen ausschließlich als planerische Orientierungshilfe und ersetzen keine sportmedizinische oder ärztliche Beurteilung.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
