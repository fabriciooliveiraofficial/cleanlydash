import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useSessionManager } from './hooks/use-session-manager';

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

  // Load appropriate session when route changes
  useEffect(() => {
    const loadSession = async () => {
      const route = currentPath.startsWith('/platform') || currentPath.startsWith('/admin/platform') || currentPath.startsWith('/callback')
        ? 'platform'
        : currentPath.startsWith('/cleaner')
          ? 'cleaner'
          : 'tenant';

      await loadSessionForRoute(route);
      setSessionLoaded(true);
    };

    loadSession();
  }, [currentPath, loadSessionForRoute]);

  useEffect(() => {
    const onLocationChange = () => {
      setCurrentPath(window.location.pathname);
      setSessionLoaded(false); // Reset to trigger session reload
    };
    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

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
