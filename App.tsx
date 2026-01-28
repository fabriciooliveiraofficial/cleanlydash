import React, { useState, useEffect } from 'react';
import { TenantApp } from './components/TenantApp';
import { PlatformApp } from './components/PlatformApp';
import { CleanerAppWrapper } from './components/cleaner/CleanerAppWrapper';
import { useSessionManager } from './hooks/use-session-manager';

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

  // 1. Platform App (Admin)
  if (currentPath.startsWith('/admin/platform') || currentPath.startsWith('/platform') || currentPath.startsWith('/callback')) {
    return (
      <>
        <PlatformApp />
      </>
    );
  }

  // 2. Cleaner App
  if (currentPath.startsWith('/cleaner')) {
    return (
      <>
        <CleanerAppWrapper />
      </>
    );
  }

  // 3. Tenant App (Default)
  return (
    <>
      <TenantApp />
    </>
  );
};

export default App;
