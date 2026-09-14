import { useState, useEffect, useCallback } from 'react';

export type ActiveTab = 'planner' | 'orga' | 'editor' | 'catalog' | 'admin' | 'club_admin';
export type OrgaSubTab = 'periodization' | 'structure' | 'groups' | 'dataEntry' | 'stats' | 'absences' | 'playtimes' | 'evaluation' | 'feedbackTalks' | 'macro' | 'meso' | 'micro';

export interface RouteState {
  activeTab: ActiveTab;
  orgaSubTab: OrgaSubTab;
  dataEntrySubTab?: string;
  queryParams: Record<string, string>;
}

function parseHash(hash: string): RouteState {
  const cleanHash = hash.replace(/^#\/?/, '');
  const [pathPart, queryPart] = cleanHash.split('?');
  const segments = pathPart ? pathPart.split('/').filter(Boolean) : [];

  const queryParams: Record<string, string> = {};
  if (queryPart) {
    const searchParams = new URLSearchParams(queryPart);
    searchParams.forEach((val, key) => {
      queryParams[key] = val;
    });
  }

  const validTabs: ActiveTab[] = ['planner', 'orga', 'editor', 'catalog', 'admin', 'club_admin'];
  const firstSegment = segments[0] as ActiveTab;
  const activeTab: ActiveTab = validTabs.includes(firstSegment) ? firstSegment : 'planner';

  let orgaSubTab: OrgaSubTab = 'periodization';
  let dataEntrySubTab: string | undefined = undefined;

  if (activeTab === 'orga' && segments[1]) {
    const second = segments[1] as OrgaSubTab;
    const validOrgaSubTabs: OrgaSubTab[] = [
      'periodization', 'structure', 'groups', 'dataEntry', 'stats', 'absences', 'playtimes', 'evaluation', 'feedbackTalks', 'macro', 'meso', 'micro'
    ];
    if (validOrgaSubTabs.includes(second)) {
      orgaSubTab = second;
    }
    if (segments[2]) {
      dataEntrySubTab = segments[2];
    }
  }

  return { activeTab, orgaSubTab, dataEntrySubTab, queryParams };
}

export function useAppRouter() {
  const [route, setRoute] = useState<RouteState>(() => {
    if (typeof window === 'undefined') {
      return { activeTab: 'planner', orgaSubTab: 'periodization', queryParams: {} };
    }
    return parseHash(window.location.hash);
  });

  // Listen to hash changes (browser back/forward, direct link modification)
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    // If initial hash was empty, initialize with default
    if (!window.location.hash || window.location.hash === '#/') {
      window.location.hash = `#/planner`;
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const navigate = useCallback((
    tab: ActiveTab, 
    subTab?: string, 
    extraParams?: Record<string, string>,
    replace: boolean = false
  ) => {
    let newHash = `#/${tab}`;
    if (tab === 'orga' && subTab) {
      newHash += `/${subTab}`;
    }

    if (extraParams && Object.keys(extraParams).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.set(k, v);
        }
      });
      const qStr = searchParams.toString();
      if (qStr) {
        newHash += `?${qStr}`;
      }
    }

    if (replace) {
      window.history.replaceState(null, '', newHash);
    } else {
      if (window.location.hash !== newHash) {
        window.location.hash = newHash;
      }
    }
    setRoute(parseHash(newHash));
  }, []);

  const setActiveTab = useCallback((tab: ActiveTab) => {
    navigate(tab);
  }, [navigate]);

  const setOrgaSubTab = useCallback((subTab: OrgaSubTab) => {
    navigate('orga', subTab);
  }, [navigate]);

  return {
    activeTab: route.activeTab,
    orgaSubTab: route.orgaSubTab,
    dataEntrySubTab: route.dataEntrySubTab,
    queryParams: route.queryParams,
    navigate,
    setActiveTab,
    setOrgaSubTab
  };
}
