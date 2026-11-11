import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const NetworkStatusBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showRestored, setShowRestored] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showRestored) {
    return null;
  }

  if (showRestored) {
    return (
      <div
        role="status"
        className="bg-emerald-600 text-white text-xs font-medium py-2 px-4 flex items-center justify-center gap-2 shadow-md transition-all duration-300 z-50 sticky top-0"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-200 animate-ping inline-block" />
        <span>Internet connection restored. ATS services are fully synchronized.</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="bg-amber-600 text-white text-xs font-medium py-2.5 px-4 flex items-center justify-between gap-3 shadow-md z-50 sticky top-0"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 shrink-0 text-amber-200" />
        <span>
          You are currently working offline. Unsaved modifications will synchronize automatically once connectivity is restored.
        </span>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded text-[11px] font-semibold transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Retry Now
      </button>
    </div>
  );
};
