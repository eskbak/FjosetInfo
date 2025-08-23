import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import DashboardView from "./views/DashboardView";
import NewsView from "./views/NewsView";
import CalendarView from "./views/CalendarView";
import MatchdayView from "./views/MatchdayView";
import type { Theme, Colors } from "./types";

export default function App() {
  // Theme (06–16 day; otherwise night)
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 20;

  const theme: Theme = isDay
    ? { bg: "#f6f7f9", text: "#0b1220", card: "#ffffff", border: "#e5e7eb" }
    : { bg: "#0b1220", text: "#ffffff", card: "#151b2e", border: "#223" };

  const COLORS: Colors = {
    ATB: { primary: "#78BE20", dark: "#028300ff" },
    YR:  { primary: "#0053A5", light: "#E6F0FA" },
    NRK: { primary: "#3600e6ff", dark: "#870000" },
  };

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
    // tiny stability hint during switches
    willChange: "opacity",
  };

  const todayNo = useMemo(() => {
    const d = new Date();
    const fmt = new Intl.DateTimeFormat("nb-NO", { day: "2-digit", month: "short" });
    return fmt
      .formatToParts(d)
      .map(p => (p.type === "month" ? p.value.replace(/\.$/, "") : p.value))
      .join("");
  }, []);

  // ---- rotation + prefetch (no hidden mounting) ----
  type ViewKey = "dashboard" | "news" | "calendar" | "matchday";
  const ORDER: ViewKey[] = ["dashboard", "news", "calendar", "matchday"];

  const ROTATE_MS = 25_000;
  const PRELOAD_MS = 5_000; // start warming ~5s before switch

  const [view, setView] = useState<ViewKey>("dashboard");

  // helper: warm network/code for a view
  const prefetchFor = useMemo(() => {
    return async (name: ViewKey) => {
      try {
        if (name === "news") {
          // warm NRK feed
          await fetch("/api/nrk/latest"); // server should set Cache-Control; default cache mode is fine
        } else if (name === "calendar") {
          // warm 5-day window
          const start = new Date(); start.setHours(0, 0, 0, 0);
          const end = new Date(start); end.setDate(end.getDate() + 4); end.setHours(23, 59, 59, 999);
          const qs = new URLSearchParams({ timeMin: start.toISOString(), timeMax: end.toISOString() });
          await fetch(`/api/calendar/upcoming?${qs.toString()}`);
        } else if (name === "dashboard") {
          // TODO: add your dashboard prefetches if any (e.g. YR/ATB)
          // Example:
          // await fetch("/api/yr/today?lat=...&lon=...&hours=6");
          // await fetch("/api/entur/departures?stopPlaceId=...&max=...");
        } else if (name === "matchday") {
          // Optional: warm whatever MatchdayView needs
        }

        // (Optional) pre-warm view code chunk if you code-split with React.lazy later:
        // if (name === "news") import("./views/NewsView");
        // if (name === "calendar") import("./views/CalendarView");
        // ...
      } catch {
        // ignore prefetch errors – real render will retry
      }
    };
  }, []);

  useEffect(() => {
    let rotateId: number;
    let preloadId: number;
    let idleId: number | undefined;

    const curIdx = ORDER.indexOf(view);
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
  }, [view, prefetchFor]);

  return (
    <div style={pageStyle}>
      <Header todayText={todayNo} />

      {view === "dashboard" && (
        <DashboardView theme={theme} colors={COLORS} isDay={isDay} />
      )}
      {view === "news" && (
        <NewsView theme={theme} colors={COLORS} isDay={isDay} />
      )}
      {view === "calendar" && (
        <CalendarView theme={theme} colors={COLORS} isDay={isDay} />
      )}
      {view === "matchday" && (
        <MatchdayView theme={theme} />
      )}

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
          onClick={() => setView("matchday")}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: `1px solid ${theme.border}`,
            background: theme.card,
            color: theme.text,
            cursor: "pointer",
          }}
        >
          Matchday
        </button>
      </div>
    </div>
  );
}
