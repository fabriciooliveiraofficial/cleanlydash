import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { useSessionManager, type RouteContext } from './hooks/use-session-manager';

const TenantApp = lazy(() => import('./components/TenantApp').then(m => ({ default: m.TenantApp })));
const PlatformApp = lazy(() => import('./components/PlatformApp').then(m => ({ default: m.PlatformApp })));
const CleanerAppWrapper = lazy(() => import('./components/cleaner/CleanerAppWrapper').then(m => ({ default: m.CleanerAppWrapper })));

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const { loadSessionForRoute, migrateExistingSessions } = useSessionManager();

  // Migrate existing sessions on first mount (one-time operation)
  useEffect(() => {
    migrateExistingSessions();
  }, [migrateExistingSessions]);

  const getRouteContext = useCallback((path: string): RouteContext => {
    if (path.startsWith('/platform') || path.startsWith('/admin/platform') || path.startsWith('/callback')) return 'platform';
    if (path.startsWith('/cleaner')) return 'cleaner';
    return 'tenant';
  }, []);

  // Load appropriate session when route changes
  useEffect(() => {
    let mounted = true;
    const loadSession = async () => {
      const route = getRouteContext(currentPath);

      console.log(`[App] Ensuring session for route: ${route}`);
      const success = await loadSessionForRoute(route);

      if (mounted) {
        setSessionLoaded(true);
      }
    };

    loadSession();
    return () => { mounted = false; };
  }, [currentPath, loadSessionForRoute, getRouteContext]);

  useEffect(() => {
    const onLocationChange = () => {
      const newPath = window.location.pathname;
      const oldContext = getRouteContext(currentPath);
      const newContext = getRouteContext(newPath);

      if (newPath !== currentPath) {
        setCurrentPath(newPath);

        if (oldContext !== newContext) {
          console.log(`[App] Switching context: ${oldContext} -> ${newContext}. Reloading session.`);
          setSessionLoaded(false);
        }
      }
    };
    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, [currentPath, getRouteContext]);

  // Wait for session to load before rendering the app
  if (!sessionLoaded) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Carregando módulos...</div>}>
      {/* 1. Platform App (Admin) */}
      {(currentPath.startsWith('/admin/platform') || currentPath.startsWith('/platform') || currentPath.startsWith('/callback')) && (
        <PlatformApp />
      )}

      {/* 2. Cleaner App */}
      {currentPath.startsWith('/cleaner') && (
        <CleanerAppWrapper />
      )}

      {/* 3. Tenant App (Default) */}
      {!currentPath.startsWith('/admin/platform') && !currentPath.startsWith('/platform') && !currentPath.startsWith('/callback') && !currentPath.startsWith('/cleaner') && (
        <TenantApp />
      )}
    </Suspense>
  );
};

export default App;
