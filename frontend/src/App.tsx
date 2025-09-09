// App.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "./components/Header";
import DashboardView from "./views/DashboardView";
import NewsView from "./views/NewsView";
import CalendarView from "./views/CalendarView";
import ArrivalOverlay from "./components/ArrivalOverlay";
import PresenceDock from "./components/PresenceDock";
import NotificationsCard from "./cards/NotificationsCard";
import AdminHome from "./views/admin/AdminHome";
import AdminNotifications from "./views/admin/AdminNotifications";
import AdminPersons from "./views/admin/AdminPersons";
import AdminSettings from "./views/admin/AdminSettings";
import DrinksMenu from "./views/DrinksMenu";
import type { Theme, Colors } from "./types";

// Keep this in sync with server Settings type
type Settings = {
  viewsEnabled: { dashboard: boolean; news: boolean; calendar: boolean; drinksMenu?: boolean };
  dayHours: { start: number; end: number }; // end exclusive
  calendarDaysAhead: number;                // 0..14
  rotateSeconds: number;                    // 5..600
};

const DEFAULT_SETTINGS: Settings = {
  viewsEnabled: { dashboard: true, news: true, calendar: true, drinksMenu: false },
  dayHours: { start: 6, end: 18 },
  calendarDaysAhead: 5,
  rotateSeconds: 30,
};

export default function App() {
  // ---------- SETTINGS (load + poll) ----------
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/settings", { cache: "no-store" });
        if (!r.ok) return; // keep previous if server not ready
        const j: Settings = await r.json();
        if (alive) setSettings(j);
      } catch {
        /* ignore */
      }
    };
    load();
    const id = window.setInterval(load, 60_000); // poll every 60s
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // --- theme / day-night based on settings.dayHours ---
  const nowHour = new Date().getHours(); // 0..23
  const isDay = (() => {
    const { start, end } = settings.dayHours;
    // Treat as [start, end) with end exclusive, wrap if end < start (overnight)
    if (start < end) return nowHour >= start && nowHour < end;
    if (start > end) return nowHour >= start || nowHour < end; // overnight
    // start === end → degenerate; consider "always night"
    return false;
  })();

  const theme: Theme = isDay
    ? { bg: "#f6f7f9", text: "#0b1220", card: "#ffffff", border: "#e5e7eb" }
    : { bg: "#0b1220", text: "#ffffff", card: "#151b2e", border: "#223" };

  const COLORS: Colors = {
    ATB: { primary: "#78BE20", dark: "#028300ff" },
    YR: { primary: "#0053A5", light: "#E6F0FA" },
    NRK: { primary: "#3600e6ff", dark: "#870000" },
  };

  // ---------- HASH ROUTING ----------
  const [route, setRoute] = useState<string>(() =>
    typeof window !== "undefined" ? window.location.hash || "" : ""
  );

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || "");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const isAdmin = route.startsWith("#admin");
  if (isAdmin) {
    const section = (route.match(/^#admin\/?(.*)$/)?.[1] || "").toLowerCase();

    const adminShellStyle: React.CSSProperties = {
      fontFamily: "system-ui, sans-serif",
      fontSize: "clamp(12px, 2.2vw, 18px)",
      background: theme.bg,
      color: theme.text,
      width: "100vw",
      minHeight: "100vh",
      padding: 24,
      boxSizing: "border-box",
    };

    switch (true) {
      case section === "" || section === "#admin":
        return (
          <div style={adminShellStyle}>
            <AdminHome theme={theme} />
          </div>
        );
      case section.startsWith("notifications"):
        return (
          <div style={adminShellStyle}>
            <AdminNotifications theme={theme} />
          </div>
        );
      case section.startsWith("persons"):
        return (
          <div style={adminShellStyle}>
            <AdminPersons theme={theme} />
          </div>
        );
      case section.startsWith("settings"):
        return (
          <div style={adminShellStyle}>
            <AdminSettings theme={theme} />
          </div>
        );
      default:
        return (
          <div style={adminShellStyle}>
            <AdminHome theme={theme} />
          </div>
        );
    }
  }
  // ---------- END HASH ROUTING ----------

// ---------- Derive rotation/order from settings ----------
type ViewKey = "dashboard" | "news" | "calendar" | "drinks"; // ⬅️ add "drinks"

const ORDER: ViewKey[] = useMemo(() => {
  // If DrinksMenu is enabled, it takes over the screen exclusively
  if (settings.viewsEnabled.drinksMenu) return ["drinks"];

  const list: ViewKey[] = [];
  if (settings.viewsEnabled.dashboard) list.push("dashboard");
  if (settings.viewsEnabled.news) list.push("news");
  if (settings.viewsEnabled.calendar) list.push("calendar");
  return list.length ? list : ["dashboard"]; // fallback
}, [
  settings.viewsEnabled.dashboard,
  settings.viewsEnabled.news,
  settings.viewsEnabled.calendar,
  settings.viewsEnabled.drinksMenu, // ⬅️
]);

  const ROTATE_MS = Math.max(5, Math.min(600, settings.rotateSeconds)) * 1000;
  const PRELOAD_MS = 5_000;

  // --- Arrival overlay, presence, etc. ---
  const [arrivalName, setArrivalName] = useState<string | null>(null);
  const lastPresentRef = useRef<Set<string>>(new Set());
  const baselineDoneRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const lastAnnouncedAtRef = useRef<Map<string, number>>(new Map());
  const ANNOUNCE_COOLDOWN_MS = 5 * 60 * 1000;
  const POLL_MS = 10_000;

    const [view, setView] = useState<ViewKey>(ORDER[0] ?? "dashboard");
    const drinksMode = settings.viewsEnabled.drinksMenu || view === "drinks";

const pageStyle: React.CSSProperties = {
  fontFamily: "system-ui, sans-serif",
  fontSize: "clamp(10px, 2.2vw, 18px)",
  background: theme.bg,
  color: theme.text,
  width: "100vw",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  padding: drinksMode ? 0 : 24, // ⬅️ CHANGED
  boxSizing: "border-box",
  willChange: "opacity",
};

  const todayNo = useMemo(() => {
    const d = new Date();
    const fmt = new Intl.DateTimeFormat("nb-NO", { day: "2-digit", month: "short" });
    return fmt
      .formatToParts(d)
      .map((p) => (p.type === "month" ? p.value.replace(/\.$/, "") : p.value))
      .join("");
  }, []);

  // If ORDER changes (e.g., toggled a view off), keep current view if possible, else fall back
  useEffect(() => {
    if (!ORDER.includes(view)) {
      setView(ORDER[0] ?? "dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ORDER.join("|")]); // join to compare content, not ref

  // helper: warm network/code for a view (uses settings.calendarDaysAhead)
  const prefetchFor = useMemo(() => {
    return async (name: ViewKey) => {
      try {
        if (name === "news") {
          await fetch("/api/nrk/latest");
        } else if (name === "calendar") {
          const days = Math.max(0, Math.min(14, settings.calendarDaysAhead));
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(end.getDate() + days);
          end.setHours(23, 59, 59, 999);
          const qs = new URLSearchParams({
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
          });
          await fetch(`/api/calendar/upcoming?${qs.toString()}`);
        }
      } catch {
        /* ignore prefetch errors */
      }
    };
  }, [settings.calendarDaysAhead]);

  // Rotation loop driven by settings.rotateSeconds and ORDER
  useEffect(() => {
    if (ORDER.length === 0) return;

    let rotateId: number;
    let preloadId: number;
    let idleId: number | undefined;

    const curIdx = Math.max(0, ORDER.indexOf(view));
    const nextView = ORDER[(curIdx + 1) % ORDER.length];

    const doPrefetch = () => {
      if ("requestIdleCallback" in window) {
        // @ts-ignore
        idleId = window.requestIdleCallback(() => prefetchFor(nextView), { timeout: PRELOAD_MS });
      } else {
        prefetchFor(nextView);
      }
    };

    preloadId = window.setTimeout(doPrefetch, Math.max(0, ROTATE_MS - PRELOAD_MS));
    rotateId = window.setTimeout(() => setView(nextView), ROTATE_MS);

    return () => {
      clearTimeout(preloadId);
      clearTimeout(rotateId);
      // @ts-ignore
      if (idleId && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
    };
  }, [view, ORDER, ROTATE_MS, prefetchFor]);

  // presence polling -> queue new arrivals
  useEffect(() => {
    const tick = async () => {
      try {
        const r = await fetch("/api/presence", { cache: "no-store" });
        const j = await r.json();
        const present: string[] = Array.isArray(j.present) ? j.present : [];
        const cur = new Set(present);

        if (!baselineDoneRef.current) {
          lastPresentRef.current = cur;
          baselineDoneRef.current = true;
          return;
        }

        const prev = lastPresentRef.current;
        const removed = [...prev].filter((p) => !cur.has(p));
        for (const name of removed) lastAnnouncedAtRef.current.delete(name);

        const added = present.filter((p) => !prev.has(p));
        const now = Date.now();
        for (const name of added) {
          const lastAt = lastAnnouncedAtRef.current.get(name) || 0;
          if (now - lastAt >= ANNOUNCE_COOLDOWN_MS) {
            queueRef.current.push(name);
            lastAnnouncedAtRef.current.set(name, now);
          }
        }

        lastPresentRef.current = cur;
        if (!arrivalName && queueRef.current.length > 0) {
          setArrivalName(queueRef.current.shift() || null);
        }
      } catch {
        /* ignore; try again on next poll */
      }
    };

    tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [arrivalName]);

  const handleArrivalClosed = () => {
    setArrivalName(null);
    setTimeout(() => {
      if (queueRef.current.length > 0) {
        setArrivalName(queueRef.current.shift() || null);
      }
    }, 300);
  };

  const triggerArrival = (name: string) => {
    if (!name) return;
    if (arrivalName) queueRef.current.push(name);
    else setArrivalName(name);
    lastAnnouncedAtRef.current.set(name, Date.now());
  };

  return (
    <div style={pageStyle}>
      {!drinksMode && <Header todayText={todayNo} />}  {/* ⬅️ CHANGED */}

      {/* Always-on cards */}
      {!drinksMode && (
      <>
        <NotificationsCard theme={theme} colors={COLORS} isDay={isDay} rotateMs={10_000} />
        <PresenceDock />
      </>
      )}

      {/* Rotating views based on settings */}
      {view === "dashboard" && <DashboardView theme={theme} colors={COLORS} isDay={isDay} />}
      {view === "news" && <NewsView theme={theme} colors={COLORS} isDay={isDay} />}
      {view === "calendar" && <CalendarView theme={theme} colors={COLORS} isDay={isDay} />}
      {view === "drinks" && <DrinksMenu theme={theme} colors={COLORS} />}

      {/* Arrival overlay */}
      {!drinksMode && arrivalName && <ArrivalOverlay name={arrivalName} onClose={handleArrivalClosed} />}

      {/* dev view switcher */}
      <div
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          display: "flex",
          gap: 8,
          opacity: 0.6,
          flexWrap: "wrap",
        }}
      >
        <button onClick={() => setView("dashboard")} style={btn(theme)}>
          Dashboard
        </button>
        <button onClick={() => setView("news")} style={btn(theme)}>
          News
        </button>
        <button onClick={() => setView("calendar")} style={btn(theme)}>
          Calendar
        </button>
        <button
          onClick={() => {
            const n = prompt("Who arrived?", "Testperson") || "";
            triggerArrival((n || "").trim());
          }}
          style={btn(theme)}
        >
          Test arrival
        </button>
        <button onClick={() => setView("drinks")} style={btn(theme)}>
          Drinks
        </button>
      </div>
    </div>
  );
}

function btn(theme: Theme): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    cursor: "pointer",
  };
}
