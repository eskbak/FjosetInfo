import { useEffect, useMemo, useRef, useState } from "react";
import Header from "./components/Header";
import BirthdayNotification from "./components/BirthdayNotification";
import DashboardView from "./views/DashboardView";
import NewsView from "./views/NewsView";
import CalendarView from "./views/CalendarView";
import ArrivalOverlay from "./components/ArrivalOverlay";
import PresenceDock from "./components/PresenceDock";
import NotificationsCard from "./cards/NotificationsCard";
import Admin from "./views/Admin";
import type { Theme, Colors } from "./types";

export default function App() {
  // --- Arrival overlay state ---
  const [arrivalName, setArrivalName] = useState<string | null>(null);

  // poll presence
  const POLL_MS = 10_000;

  // remember current present set and "first fetch" baseline to avoid firing on load
  const lastPresentRef = useRef<Set<string>>(new Set());
  const baselineDoneRef = useRef(false);

  // queue multiple arrivals that happen close together
  const queueRef = useRef<string[]>([]);

  // simple cooldown to avoid repeated alerts for the same person (5 minutes)
  const lastAnnouncedAtRef = useRef<Map<string, number>>(new Map());
  const ANNOUNCE_COOLDOWN_MS = 5 * 60 * 1000;

  // ---- theme / day-night based on hardcoded dayHours ----
  const localHour = new Date().getHours();
  const isDay = localHour >= 6 && localHour < 18;

  const theme: Theme = isDay
    ? { bg: "#f6f7f9", text: "#0b1220", card: "#ffffff", border: "#e5e7eb" }
    : { bg: "#0b1220", text: "#ffffff", card: "#151b2e", border: "#223" };

  const COLORS: Colors = {
    ATB: { primary: "#78BE20", dark: "#028300ff" },
    YR: { primary: "#0053A5", light: "#E6F0FA" },
    NRK: { primary: "#3600e6ff", dark: "#870000" },
  };

  // ---------- HASH ROUTING (SSR-safe) ----------
  const initialHash = typeof window !== "undefined" ? window.location.hash : "";
  const [route, setRoute] = useState<string>(initialHash);

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || "");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // 👉 Short-circuit: render Admin BEFORE any other effects/timers run
  if (route === "#admin") {
    return (
      <div
        style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: "clamp(10px, 2.2vw, 18px)",
          background: theme.bg,
          color: theme.text,
          width: "100vw",
          minHeight: "100vh",
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <Admin theme={theme} />
      </div>
    );
  }
  // ---------- END HASH ROUTING ----------

  const pageStyle: React.CSSProperties = {
    fontFamily: "system-ui, sans-serif",
    fontSize: "clamp(10px, 2.2vw, 18px)",
    background: theme.bg,
    color: theme.text,
    width: "100vw",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    padding: 24,
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

  // ---- rotation + prefetch (no hidden mounting) ----
  type ViewKey = "dashboard" | "news" | "calendar";
  const ORDER = useMemo<ViewKey[]>(() => ["dashboard", "news", "calendar"], []);
  const ROTATE_MS = 45 * 1000; // fixed 45s
  const PRELOAD_MS = 5_000; // start warming right before switch

  const [view, setView] = useState<ViewKey>(ORDER[0] ?? "dashboard");

  // helper: warm network/code for a view
  const prefetchFor = useMemo(() => {
    return async (name: ViewKey) => {
      try {
        if (name === "news") {
          await fetch("/api/nrk/latest"); // server should set Cache-Control
        } else if (name === "calendar") {
          // warm N-day window per hardcoded daysAhead
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(end.getDate() + Math.max(0, 4));
          end.setHours(23, 59, 59, 999);
          const qs = new URLSearchParams({
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
          });
          await fetch(`/api/calendar/upcoming?${qs.toString()}`);
        } else if (name === "dashboard") {
          // add dashboard prefetches if desired
          // await fetch("/api/yr/today?lat=...&lon=...&hours=6");
          // await fetch("/api/entur/departures?stopPlaceId=...&max=...");
        }
      } catch {
        // ignore prefetch errors – real render will retry
      }
    };
  }, []);

  useEffect(() => {
    // if all views toggled off, don't rotate; keep whatever view is set
    if (ORDER.length === 0) return;

    let rotateId = 0 as unknown as number;
    let preloadId = 0 as unknown as number;
    let idleId: number | undefined;

    const curIdx = Math.max(0, ORDER.indexOf(view));
    const nextView = ORDER[(curIdx + 1) % ORDER.length];

    const doPrefetch = () => {
      const w = window as unknown as {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      };
      if (w.requestIdleCallback) {
        idleId = w.requestIdleCallback(() => prefetchFor(nextView), { timeout: PRELOAD_MS });
      } else {
        prefetchFor(nextView);
      }
    };

    preloadId = window.setTimeout(doPrefetch, Math.max(0, ROTATE_MS - PRELOAD_MS));
    rotateId = window.setTimeout(() => {
      setView(nextView);
    }, ROTATE_MS);

    return () => {
      clearTimeout(preloadId);
      clearTimeout(rotateId);
      const w = window as any;
      if (idleId && w?.cancelIdleCallback) w.cancelIdleCallback(idleId);
    };
  }, [view, prefetchFor, ORDER, ROTATE_MS, PRELOAD_MS]);

  // presence polling -> queue new arrivals
  useEffect(() => {
    const tick = async () => {
      try {
        const r = await fetch("/api/presence", { cache: "no-store" });
        const j = await r.json();
        const present: string[] = Array.isArray(j.present) ? j.present : [];
        const cur = new Set(present);

        if (!baselineDoneRef.current) {
          // first fetch: set baseline, don't alert existing people
          lastPresentRef.current = cur;
          baselineDoneRef.current = true;
          return;
        }

        // clear cooldown for anyone who left since last poll
        const prev = lastPresentRef.current;
        const removed = [...prev].filter((p) => !cur.has(p));
        for (const name of removed) {
          lastAnnouncedAtRef.current.delete(name);
        }

        // find newly present vs the previous poll
        const added = present.filter((p) => !prev.has(p));

        // enqueue with cooldown
        const now = Date.now();
        for (const name of added) {
          const lastAt = lastAnnouncedAtRef.current.get(name) || 0;
          if (now - lastAt >= ANNOUNCE_COOLDOWN_MS) {
            queueRef.current.push(name);
            lastAnnouncedAtRef.current.set(name, now);
          }
        }

        lastPresentRef.current = cur;

        // if nothing showing, pop next
        if (!arrivalName && queueRef.current.length > 0) {
          setArrivalName(queueRef.current.shift() || null);
        }
      } catch {
        // ignore; try again on next poll
      }
    };

    // initial + interval
    tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [arrivalName, ANNOUNCE_COOLDOWN_MS, POLL_MS]);

  const handleArrivalClosed = () => {
    setArrivalName(null);
    setTimeout(() => {
      if (queueRef.current.length > 0) {
        setArrivalName(queueRef.current.shift() || null);
      }
    }, 300);
  };

  // dev helper to trigger overlay manually
  const triggerArrival = (name: string) => {
    if (!name) return;
    if (arrivalName) {
      queueRef.current.push(name);
    } else {
      setArrivalName(name);
    }
    lastAnnouncedAtRef.current.set(name, Date.now());
  };

  // --- main app view ---
  return (
    <div style={pageStyle}>
      <Header todayText={todayNo} />

      <NotificationsCard theme={theme} colors={COLORS} isDay={isDay} rotateMs={10000} />

      {/* Birthday notification */}
      <BirthdayNotification theme={theme} />

      <PresenceDock />

      {/* Rotating views */}
      {view === "dashboard" && <DashboardView theme={theme} colors={COLORS} isDay={isDay} />}
      {view === "news" && <NewsView theme={theme} colors={COLORS} isDay={isDay} />}
      {view === "calendar" && <CalendarView theme={theme} colors={COLORS} isDay={isDay} />}

      {/* Arrival overlay (full-screen) */}
      {arrivalName && <ArrivalOverlay name={arrivalName} onClose={handleArrivalClosed} />}

      {/* dev view switcher */}
      <div
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          display: "flex",
          gap: 8,
          opacity: 0.6,
        }}
      >
        <button
          onClick={() => setView("dashboard")}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: `1px solid ${theme.border}`,
            background: theme.card,
            color: theme.text,
            cursor: "pointer",
          }}
        >
          Dashboard
        </button>
        <button
          onClick={() => setView("news")}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: `1px solid ${theme.border}`,
            background: theme.card,
            color: theme.text,
            cursor: "pointer",
          }}
        >
          News
        </button>
        <button
          onClick={() => setView("calendar")}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: `1px solid ${theme.border}`,
            background: theme.card,
            color: theme.text,
            cursor: "pointer",
          }}
        >
          Calendar
        </button>
        <button
          onClick={() => {
            const n = prompt("Who arrived?", "Testperson") || "";
            triggerArrival(n.trim());
          }}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: `1px solid ${theme.border}`,
            background: theme.card,
            color: theme.text,
            cursor: "pointer",
          }}
        >
          Test arrival
        </button>
      </div>
    </div>
  );
}
