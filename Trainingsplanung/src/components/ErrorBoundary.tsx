import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Download, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { db } from '../db/database';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  isExportingSnapshot: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    isExportingSnapshot: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = '#/planner';
    window.location.reload();
  };

  private handleExportEmergencySnapshot = async () => {
    this.setState({ isExportingSnapshot: true });
    try {
      const [
        exercises,
        plans,
        groups,
        absences,
        evaluations,
        playtimes,
        feedbackTalks,
        mesoPlans,
        macroPlans
      ] = await Promise.all([
        db.exercises.toArray().catch(() => []),
        db.plans.toArray().catch(() => []),
        db.groups.toArray().catch(() => []),
        db.absences.toArray().catch(() => []),
        db.evaluations.toArray().catch(() => []),
        db.playtimes.toArray().catch(() => []),
        db.feedbackTalks.toArray().catch(() => []),
        db.mesoPlans.toArray().catch(() => []),
        db.macroPlans.toArray().catch(() => [])
      ]);

      // Collect all localStorage keys as backup
      const localBackup: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          try {
            localBackup[k] = JSON.parse(localStorage.getItem(k) || '');
          } catch {
            localBackup[k] = localStorage.getItem(k);
          }
        }
      }

      const snapshot = {
        exportedAt: new Date().toISOString(),
        error: this.state.error?.message,
        errorStack: this.state.error?.stack,
        indexedDbData: {
          exercises,
          plans,
          groups,
          absences,
          evaluations,
          playtimes,
          feedbackTalks,
          mesoPlans,
          macroPlans
        },
        localStorageBackup: localBackup
      };

      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `torwart-app-notfall-backup-${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting emergency snapshot:', err);
      alert('Snapshot-Export fehlgeschlagen. Bitte wende dich an den Support.');
    } finally {
      this.setState({ isExportingSnapshot: false });
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-rose-400">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {this.props.fallbackTitle || 'Unerwarteter Anwendungsfehler'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Keine Sorge: Deine Daten in der Datenbank sind gesichert.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
              <div className="font-bold text-rose-400 flex items-center justify-between">
                <span>Fehlermeldung:</span>
                <button
                  type="button"
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px] underline"
                >
                  <span>{this.state.showDetails ? 'Details verbergen' : 'Details anzeigen'}</span>
                  {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="font-mono text-slate-200 bg-slate-900 p-2.5 rounded-xl border border-slate-800 break-all">
                {this.state.error?.message || 'Unbekannter Fehler'}
              </p>

              {this.state.showDetails && this.state.errorInfo?.componentStack && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Component Stack:</span>
                  <pre className="text-[10px] font-mono text-slate-400 bg-slate-900 p-2.5 rounded-xl overflow-x-auto max-h-48 leading-relaxed">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Neu laden</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
              >
                <Home className="w-4 h-4" />
                <span>Zum Planer</span>
              </button>

              <button
                type="button"
                onClick={this.handleExportEmergencySnapshot}
                disabled={this.state.isExportingSnapshot}
                className="px-4 py-3 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 active:scale-95 text-indigo-300 font-bold text-xs flex items-center justify-center gap-2 border border-indigo-700/60 transition"
              >
                <Download className="w-4 h-4" />
                <span>{this.state.isExportingSnapshot ? 'Sichere...' : 'Backup sichern'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
