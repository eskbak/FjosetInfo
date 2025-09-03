import { useState, useEffect } from 'react';

export interface AppSettings {
  viewsEnabled: {
    dashboard: boolean;
    news: boolean;
    calendar: boolean;
  };
  dayHours: {
    start: number;
    end: number;
  };
  calendarDaysAhead: number;
  rotateSeconds: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  viewsEnabled: { dashboard: true, news: true, calendar: true },
  dayHours: { start: 6, end: 18 },
  calendarDaysAhead: 4,
  rotateSeconds: 45,
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings', {
          timeout: 5000, // 5 second timeout
        } as RequestInit);
        
        if (response.ok) {
          const data = await response.json();
          // Validate the data structure
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
        // Keep default settings if fetch fails
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
}