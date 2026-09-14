import React from 'react';
import { useAuth, MAIN_ADMIN_EMAIL } from '../context/AuthContext';
import { ShieldAlert, LogOut, Mail, Sparkles } from 'lucide-react';

export const AccessBlockedScreen: React.FC = () => {
  const { userProfile, logout } = useAuth();
  const isBlocked = userProfile?.isBlocked;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-400 to-rose-600" />

        {/* Brand Logo & Icon */}
        <div className="flex flex-col items-center space-y-2">
          <div className="h-16 w-auto flex items-center justify-center">
            <img
              src="/Logo.png"
              alt="NextLevel Logo"
              className="h-full w-auto object-contain drop-shadow-[0_4px_12px_rgba(34,197,94,0.3)]"
            />
          </div>
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/40">
            <ShieldAlert className="w-7 h-7" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white">
            {isBlocked ? 'Account vorübergehend gesperrt' : 'Testphase abgelaufen'}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            {isBlocked 
              ? 'Dein Zugang zu NextLevel Coach PRO wurde deaktiviert. Bitte wende dich an den Administrator zur Freischaltung.' 
              : 'Dein kostenloser 7-tägiger Testzeitraum für NextLevel Coach PRO ist abgelaufen.'}
          </p>
        </div>

        {/* Feature Highlights & Activation Info */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs text-slate-300">
          <div className="font-bold text-slate-200 flex items-center gap-1.5 text-emerald-400">
            <Sparkles className="w-4 h-4" />
            <span>Vollversion freischalten:</span>
          </div>
          <ul className="space-y-1 text-slate-400 list-disc list-inside">
            <li>Unbegrenzte Erstellung von Übungen & Taktikboards</li>
            <li>Vollständiger PDF-Export für jede Trainingseinheit</li>
            <li>Zugriff auf die NextLevel-Akademie-Übungsdatenbank</li>
            <li>Cloud-Synchronisation auf allen deinen Geräten</li>
          </ul>
        </div>

        {/* Contact CTA */}
        <div className="space-y-3 pt-2">
          <a
            href={`mailto:${MAIN_ADMIN_EMAIL}?subject=Freischaltung%20NextLevel%20Coach%20PRO%20(${encodeURIComponent(userProfile?.email || '')})&body=Hallo%20Thorsten,%0A%0Abitte%20schalte%20meinen%20Account%20(${encodeURIComponent(userProfile?.email || '')})%20f%C3%BCr%20NextLevel%20Coach%20PRO%20frei.%0A%0AViele%20Gr%C3%BC%C3%9Fe`}
            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 text-sm"
          >
            <Mail className="w-4 h-4" />
            <span>Lizenz anfragen (Thorsten Weber kontaktieren)</span>
          </a>

          <button
            type="button"
            onClick={logout}
            className="text-xs text-slate-500 hover:text-rose-400 transition flex items-center justify-center gap-1.5 mx-auto pt-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Abmelden</span>
          </button>
        </div>
      </div>
    </div>
  );
};
