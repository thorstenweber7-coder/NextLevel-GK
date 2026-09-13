import React, { useRef } from 'react';
import { UserRole, UserProfile, hasModulePermission } from '../types';
import { Trophy, Dumbbell, Video, Swords, BookOpen, Target, Settings, LogOut, ChevronLeft, ChevronRight, Lock, MessageSquare } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  userName: string;
  onLogout: () => void;
  currentUserProfile?: UserProfile;
}

export default function Navigation({ activeTab, setActiveTab, userRole, userName, onLogout, currentUserProfile }: NavigationProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const allTabs = [
    { id: 'leaderboard', label: 'Bestenliste', icon: Trophy, roles: ['admin', 'keeper_verein', 'keeper_extern'] },
    { id: 'workouts', label: 'Kraftsport', icon: Dumbbell, roles: ['admin', 'kraftsport', 'keeper_verein', 'keeper_extern'] },
    { id: 'video', label: 'Videoanalyse', icon: Video, roles: ['admin', 'keeper_verein', 'keeper_extern'] },
    { id: 'competitions', label: 'Training', icon: Swords, roles: ['admin', 'keeper_verein', 'keeper_extern'] },
    { id: 'contents', label: 'Inhalte', icon: BookOpen, roles: ['admin', 'keeper_verein', 'keeper_extern'] },
    { id: 'goals', label: 'Individuelle Ziele', icon: Target, roles: ['admin', 'keeper_verein', 'keeper_extern'] },
    { id: 'chat', label: 'TW-Chat', icon: MessageSquare, roles: ['admin', 'keeper_verein', 'keeper_extern'] },
    { id: 'admin', label: 'Coaching Zone', icon: Settings, roles: ['admin', 'kraftsport'] },
  ];

  const visibleTabs = allTabs.filter(tab => tab.roles.includes(userRole));

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 150;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full flex items-center bg-brand-panel border-b border-brand-border px-4 sm:px-6 py-3">
      {/* Left Side: Logo */}
      <div className="flex items-center gap-2.5 sm:gap-3 mr-4 sm:mr-8 shrink-0">
        <div className="w-8 h-8 bg-gradient-to-tr from-brand-neon to-brand-neon-hover rounded-lg flex items-center justify-center shadow-[0_0_10px_rgba(192,255,0,0.2)]">
          <span className="text-brand-bg font-black italic text-sm">N</span>
        </div>
        <div className="flex flex-col">
          <span className="font-black text-xs tracking-tight text-white uppercase font-display leading-none">
            NextLevel
          </span>
          <span className="font-bold text-[8px] tracking-widest text-brand-neon uppercase font-mono leading-none mt-0.5">
            Goalkeeping
          </span>
        </div>
      </div>

      {/* Center: Scrollable Tabs */}
      <div className="flex-1 relative overflow-hidden flex items-center">
        <button 
          onClick={() => scroll('left')}
          className="p-1 text-zinc-500 hover:text-white bg-brand-bg rounded-full border border-brand-border shrink-0 mr-1.5 sm:flex hidden cursor-pointer"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>

        <div 
          ref={scrollContainerRef}
          className="flex-1 flex items-center overflow-x-auto no-scrollbar gap-2 py-0.5 scroll-smooth"
        >
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isAdminTab = tab.id === 'admin';
            
            const isWorkoutsLocked = tab.id === 'workouts' && !hasModulePermission(currentUserProfile, 'workouts');
            const isGoalsLocked = tab.id === 'goals' && !hasModulePermission(currentUserProfile, 'goals');
            const isLocked = isWorkoutsLocked || isGoalsLocked;
            
            let btnClass = "";
            if (isLocked) {
              btnClass = "bg-slate-900/40 border border-slate-900/65 text-zinc-500 font-bold text-xs uppercase whitespace-nowrap px-4 py-1.5 rounded-full opacity-60 hover:bg-slate-900/60 transition-all";
            } else if (isActive) {
              if (isAdminTab) {
                btnClass = "bg-red-500 text-white font-bold text-xs uppercase whitespace-nowrap px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.3)]";
              } else {
                btnClass = "bg-brand-neon text-brand-bg font-bold text-xs uppercase whitespace-nowrap px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(192,255,0,0.3)]";
              }
            } else {
              if (isAdminTab) {
                btnClass = "bg-red-950/40 border border-red-900/30 text-red-400 font-bold text-xs uppercase whitespace-nowrap px-4 py-1.5 rounded-full hover:bg-red-900/20 transition-colors";
              } else {
                btnClass = "bg-brand-border hover:bg-brand-border-light text-zinc-400 font-bold text-xs uppercase whitespace-nowrap px-4 py-1.5 rounded-full transition-colors";
              }
            }

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 cursor-pointer ${btnClass}`}
              >
                {isLocked ? (
                  <Lock className="w-3 h-3 text-zinc-500" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button 
          onClick={() => scroll('right')}
          className="p-1 text-zinc-500 hover:text-white bg-brand-bg rounded-full border border-brand-border shrink-0 ml-1.5 sm:flex hidden cursor-pointer"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Right Side: Logged-in Info & Logout */}
      <div className="ml-4 flex items-center gap-3 sm:gap-4 shrink-0">
        <div className="text-right hidden sm:block">
          <div className="text-[10px] text-zinc-500 uppercase font-bold leading-none mb-0.5">Eingeloggt als</div>
          <div className="text-xs font-bold text-white leading-none">{userName}</div>
        </div>
        <div className="w-8 h-8 rounded-full bg-brand-border border border-brand-border-light flex items-center justify-center text-xs font-black uppercase text-brand-neon">
          {userName.slice(0, 2)}
        </div>
        <button
          onClick={onLogout}
          title="Abmelden"
          className="p-2 bg-brand-border hover:bg-red-950/30 hover:text-red-400 text-zinc-400 border border-brand-border-light hover:border-red-900/50 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
}
