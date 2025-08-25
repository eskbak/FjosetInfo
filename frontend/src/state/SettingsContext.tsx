import React, { createContext, useContext, useEffect, useState } from "react";

export type Settings = {
  viewsEnabled: { dashboard: boolean; news: boolean; calendar: boolean };
  dayHours: { start: number; end: number };
  calendarDaysAhead: number;
  rotateSeconds: number;
};

const DEFAULTS: Settings = {
  viewsEnabled: { dashboard: true, news: true, calendar: true },
  dayHours: { start: 6, end: 18 },
  calendarDaysAhead: 4,
  rotateSeconds: 45,
};

const Ctx = createContext<{
  settings: Settings;
  loading: boolean;
  save: (s: Partial<Settings>) => Promise<void>;
  reload: () => Promise<void>;
}>({
  settings: DEFAULTS,
  loading: true,
  save: async () => {},
  reload: async () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const r = await fetch("/api/settings", { cache: "no-store" });
      const j = await r.json();
      setSettings({ ...DEFAULTS, ...j });
    } finally {
      setLoading(false);
    }
  }

  async function save(patch: Partial<Settings>) {
    const next = {
      ...settings,
      ...patch,
      viewsEnabled: { ...settings.viewsEnabled, ...(patch as any).viewsEnabled },
      dayHours: { ...settings.dayHours, ...(patch as any).dayHours },
    };
    const r = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!r.ok) throw new Error(await r.text());
    await reload();
  }

  useEffect(() => { reload(); }, []);

  return <Ctx.Provider value={{ settings, loading, save, reload }}>{children}</Ctx.Provider>;
}

export function useSettings() {
  return useContext(Ctx);
}
