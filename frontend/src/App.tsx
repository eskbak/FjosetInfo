import { useMemo, useState } from "react";
import Header from "./components/Header";
import DashboardView from "./views/DashboardView";
import MockView from "./views/MockView";
import MatchdayView from "./views/MatchdayView";
import type { Theme, Colors } from "./types";

export default function App() {
  // Theme (08–21 day; otherwise night)
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 21;

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
  };

const todayNo = useMemo(() => {
  const d = new Date();
  const fmt = new Intl.DateTimeFormat("nb-NO", { day: "2-digit", month: "short" });
  return fmt
    .formatToParts(d)
    .map(p => (p.type === "month" ? p.value.replace(/\.$/, "") : p.value))
    .join("");
}, []);

  // View switching
  type ViewKey = "dashboard" | "mock" | "matchday";
  const [view, setView] = useState<ViewKey>("dashboard");

  return (
    <div style={pageStyle}>
      <Header todayText={todayNo} />

      {view === "dashboard" && (
        <DashboardView theme={theme} colors={COLORS} isDay={isDay} />
      )}
      {view === "mock" && (
        <MockView theme={theme} colors={COLORS} isDay={isDay} />
      )}
      {view === "matchday" && (
        <MatchdayView theme={theme}/>
      )}

      {/* dev view switcher (bottom-right) */}
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
          onClick={() => setView("mock")}
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
