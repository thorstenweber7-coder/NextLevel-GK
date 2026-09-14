import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MailCheck, RefreshCw, LogOut, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

export const EmailVerificationScreen: React.FC = () => {
  const { user, resendVerificationEmail, reloadUser, logout } = useAuth();
  
  const [resending, setResending] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResend = async () => {
    try {
      setResending(true);
      setMsg(null);
      await resendVerificationEmail();
      setMsg({ type: 'success', text: 'Bestätigungs-E-Mail wurde erneut gesendet. Bitte prüfe auch deinen Spam-Ordner.' });
    } catch (err: any) {
      console.error('Error resending email:', err);
      setMsg({ type: 'error', text: 'Fehler beim Senden. Bitte warte einen Moment vor dem nächsten Versuch.' });
    } finally {
      setResending(false);
    }
  };

  const handleCheck = async () => {
    try {
      setChecking(true);
      setMsg(null);
      const isVerified = await reloadUser();
      if (!isVerified) {
        setMsg({ type: 'error', text: 'Deine E-Mail wurde noch nicht bestätigt. Bitte klicke zuerst auf den Link in der E-Mail.' });
      }
    } catch (err) {
      console.error('Error reloading user:', err);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-600" />

        {/* Icon & Heading */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/40">
          <MailCheck className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            E-Mail-Bestätigung erforderlich
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Wir haben einen Bestätigungslink an deine E-Mail gesendet:
          </p>
          <p className="text-sm font-bold text-emerald-400 bg-slate-950/80 py-1.5 px-3 rounded-lg border border-slate-800 break-all inline-block mt-1">
            {user?.email}
          </p>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Bitte klicke auf den Bestätigungslink in der E-Mail, um deinen 7-tägigen kostenlosen Testzeitraum und deinen Zugang freizuschalten.
        </p>

        {/* Alerts */}
        {msg && (
          <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
            msg.type === 'success' ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200' : 'bg-rose-950/60 border-rose-800 text-rose-200'
          }`}>
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />}
            <span className="text-left">{msg.text}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="w-full py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Überprüfe...' : 'Ich habe bestätigt (Aktualisieren)'}</span>
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="w-full py-2.5 rounded-xl font-semibold text-slate-300 bg-slate-950 border border-slate-800 hover:bg-slate-800 hover:text-white transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{resending ? 'Sende erneut...' : 'Bestätigungs-E-Mail erneut senden'}</span>
          </button>

          <div className="pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={logout}
              className="text-xs text-slate-500 hover:text-rose-400 transition flex items-center justify-center gap-1.5 mx-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Mit anderem Account anmelden / Abmelden</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
