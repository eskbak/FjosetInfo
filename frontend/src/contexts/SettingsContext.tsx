import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '../hooks/useSettings';
import { useFileChangeEvents } from '../hooks/useFileChangeEvents';

const DEFAULT_SETTINGS: AppSettings = {
  viewsEnabled: { dashboard: true, news: true, calendar: true },
  dayHours: { start: 6, end: 18 },
  calendarDaysAhead: 4,
  rotateSeconds: 45,
};

interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
  updateSettings: (newSettings: AppSettings) => Promise<boolean>;
  reloadSettings: () => Promise<void>;
  // Event dispatch methods for other components to use
  onBirthdaysChange: (callback: () => void) => void;
  onNotificationsChange: (callback: () => void) => void;
  onKnownDevicesChange: (callback: () => void) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  
  // Callback registries for other components
  const [birthdayCallbacks, setBirthdayCallbacks] = useState<Set<() => void>>(new Set());
  const [notificationCallbacks, setNotificationCallbacks] = useState<Set<() => void>>(new Set());
  const [deviceCallbacks, setDeviceCallbacks] = useState<Set<() => void>>(new Set());

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings', {
        timeout: 5000,
      } as RequestInit);
      
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data === 'object') {
          setSettings({
            viewsEnabled: {
              dashboard: data.viewsEnabled?.dashboard ?? DEFAULT_SETTINGS.viewsEnabled.dashboard,
              news: data.viewsEnabled?.news ?? DEFAULT_SETTINGS.viewsEnabled.news,
              calendar: data.viewsEnabled?.calendar ?? DEFAULT_SETTINGS.viewsEnabled.calendar,
            },
            dayHours: {
              start: data.dayHours?.start ?? DEFAULT_SETTINGS.dayHours.start,
              end: data.dayHours?.end ?? DEFAULT_SETTINGS.dayHours.end,
            },
            calendarDaysAhead: data.calendarDaysAhead ?? DEFAULT_SETTINGS.calendarDaysAhead,
            rotateSeconds: data.rotateSeconds ?? DEFAULT_SETTINGS.rotateSeconds,
          });
        }
      } else {
        console.warn('Settings API returned:', response.status, response.statusText);
      }
    } catch (error) {
      console.warn('Failed to fetch settings, using defaults:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: AppSettings): Promise<boolean> => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      
      if (response.ok) {
        setSettings(newSettings);
        return true;
      } else {
        console.error('Failed to save settings');
        return false;
      }
    } catch (error) {
      console.error('Network error while saving settings:', error);
      return false;
    }
  }, []);

  const reloadSettings = useCallback(async () => {
    setLoading(true);
    await fetchSettings();
  }, [fetchSettings]);

  // Event registration methods
  const onBirthdaysChange = useCallback((callback: () => void) => {
    setBirthdayCallbacks(prev => new Set([...prev, callback]));
    return () => {
      setBirthdayCallbacks(prev => {
        const next = new Set(prev);
        next.delete(callback);
        return next;
      });
    };
  }, []);

  const onNotificationsChange = useCallback((callback: () => void) => {
    setNotificationCallbacks(prev => new Set([...prev, callback]));
    return () => {
      setNotificationCallbacks(prev => {
        const next = new Set(prev);
        next.delete(callback);
        return next;
      });
    };
  }, []);

  const onKnownDevicesChange = useCallback((callback: () => void) => {
    setDeviceCallbacks(prev => new Set([...prev, callback]));
    return () => {
      setDeviceCallbacks(prev => {
        const next = new Set(prev);
        next.delete(callback);
        return next;
      });
    };
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Single SSE connection for all file changes
  useFileChangeEvents({
    onSettingsChange: () => {
      console.log('🔄 Settings file changed, reloading...');
      fetchSettings();
    },
    onBirthdaysChange: () => {
      console.log('🔄 Birthdays file changed, notifying components...');
      birthdayCallbacks.forEach(callback => callback());
    },
    onNotificationsChange: () => {
      console.log('🔄 Notifications file changed, notifying components...');
      notificationCallbacks.forEach(callback => callback());
    },
    onKnownDevicesChange: () => {
      console.log('🔄 Known devices file changed, notifying components...');
      deviceCallbacks.forEach(callback => callback());
    }
  });

  return (
    <SettingsContext.Provider value={{ 
      settings, 
      loading, 
      updateSettings, 
      reloadSettings,
      onBirthdaysChange,
      onNotificationsChange,
      onKnownDevicesChange
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
}