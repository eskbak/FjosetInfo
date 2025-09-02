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
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
}