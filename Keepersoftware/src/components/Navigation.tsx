import React, { useState, useRef, useEffect } from 'react';
import { UserRole, UserProfile, hasModulePermission } from '../types';
import { Trophy, Dumbbell, Video, Swords, BookOpen, Target, Settings, LogOut, ChevronLeft, ChevronRight, Lock, MessageSquare, ChevronDown, X } from 'lucide-react';
import logoImg from '../assets/Logo.png';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
  const currentTab = visibleTabs.find(tab => tab.id === activeTab) || visibleTabs[0];
  const CurrentIcon = currentTab?.icon;
  const isCurrentAdminTab = currentTab?.id === 'admin';

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    <nav className="sticky top-0 z-50 w-full flex items-center bg-brand-panel border-b border-brand-border px-3 sm:px-6 py-2.5 sm:py-3 relative">
      {/* Left Side: Logo */}
      <div className="flex items-center gap-2 sm:gap-3 mr-2 sm:mr-8 shrink-0">
        <img 
          src={logoImg} 
          alt="NextLevel Goalkeeping" 
          className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-[0_0_10px_rgba(192,255,0,0.2)]"
        />
        <div className="flex flex-col">
          <span className="font-black text-[11px] sm:text-xs tracking-tight text-white uppercase font-display leading-none">
            NextLevel
          </span>
          <span className="font-bold text-[7px] sm:text-[8px] tracking-widest text-brand-neon uppercase font-mono leading-none mt-0.5">
            Goalkeeping
          </span>
        </div>
      </div>

      {/* Center: Mobile Category Selector Button (Mobile only) */}
      <div className="flex-1 flex sm:hidden items-center justify-center min-w-0 px-1">
        <button
          onClick={() => setMobileMenuOpen(prev => !prev)}
          className={`flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-all max-w-[210px] w-auto ${
            isCurrentAdminTab
              ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.35)] font-bold'
              : 'bg-brand-neon text-brand-bg shadow-[0_0_15px_rgba(192,255,0,0.35)] font-bold'
          }`}
          aria-expanded={mobileMenuOpen}
          aria-label="Kategorie auswählen"
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            {CurrentIcon && <CurrentIcon className="w-3.5 h-3.5 shrink-0" />}
            <span className="text-xs uppercase tracking-wide truncate">
              {currentTab?.label || 'Kategorie'}
            </span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
              mobileMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Center: Scrollable Tabs (Desktop only) */}
      <div className="flex-1 relative overflow-hidden hidden sm:flex items-center">
        <button 
          onClick={() => scroll('left')}
          className="p-1 text-zinc-500 hover:text-white bg-brand-bg rounded-full border border-brand-border shrink-0 mr-1.5 flex cursor-pointer"
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
                  <Lock className="w-3.5 h-3.5 text-zinc-500" />
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
          className="p-1 text-zinc-500 hover:text-white bg-brand-bg rounded-full border border-brand-border shrink-0 ml-1.5 flex cursor-pointer"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Right Side: Logged-in Info & Logout */}
      <div className="ml-2 sm:ml-4 flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="text-right hidden sm:block">
          <div className="text-[10px] text-zinc-500 uppercase font-bold leading-none mb-0.5">Eingeloggt als</div>
          <div className="text-xs font-bold text-white leading-none">{userName}</div>
        </div>
        <img 
          src={logoImg} 
          alt="NextLevel Goalkeeping Academy" 
          className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-[0_0_8px_rgba(192,255,0,0.25)] hidden sm:block" 
        />
        <button
          onClick={onLogout}
          title="Abmelden"
          className="p-2 bg-brand-border hover:bg-red-950/30 hover:text-red-400 text-zinc-400 border border-brand-border-light hover:border-red-900/50 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mobile Category Dropdown Panel ("Leiste nach unten") */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop for closing */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 sm:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Downward Dropdown Bar */}
          <div className="absolute top-full left-0 right-0 w-full bg-brand-panel border-b border-brand-border z-50 p-3 sm:hidden shadow-2xl">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-brand-border/60 px-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono">
                Kategorie auswählen
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-zinc-500 hover:text-white p-1 -mr-1 cursor-pointer transition-colors"
                title="Schließen"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isAdminTab = tab.id === 'admin';

                const isWorkoutsLocked = tab.id === 'workouts' && !hasModulePermission(currentUserProfile, 'workouts');
                const isGoalsLocked = tab.id === 'goals' && !hasModulePermission(currentUserProfile, 'goals');
                const isLocked = isWorkoutsLocked || isGoalsLocked;

                let itemClass = "";
                if (isLocked) {
                  itemClass = "bg-slate-900/50 border border-slate-900/80 text-zinc-500 opacity-60";
                } else if (isActive) {
                  if (isAdminTab) {
                    itemClass = "bg-red-500 text-white font-black shadow-[0_0_12px_rgba(239,68,68,0.35)] border border-red-400";
                  } else {
                    itemClass = "bg-brand-neon text-brand-bg font-black shadow-[0_0_12px_rgba(192,255,0,0.35)] border border-lime-300";
                  }
                } else {
                  if (isAdminTab) {
                    itemClass = "bg-red-950/30 border border-red-900/40 text-red-400 hover:bg-red-900/20";
                  } else {
                    itemClass = "bg-brand-bg/80 border border-brand-border text-zinc-300 hover:bg-brand-border/80 hover:text-white";
                  }
                }

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide transition-all text-left cursor-pointer ${itemClass}`}
                  >
                    {isLocked ? (
                      <Lock className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                    ) : (
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
