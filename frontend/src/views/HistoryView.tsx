import { useEffect, useState } from "react";
import type { Theme, Colors } from "../types";

type HistoryFact = {
  year: number;
  text: string;
  type: "event" | "birth" | "death";
};

type HistoryData = {
  date: string;
  facts: HistoryFact[];
};

export default function HistoryView({
  theme,
  colors,
}: {
  theme: Theme;
  colors: Colors;
  isDay: boolean;
}) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/history");
        if (!res.ok) {
          console.error("History API returned:", res.status);
          return;
        }
        const json = await res.json();
        console.log("History data loaded:", json);
        if (alive && json.facts && json.facts.length > 0) {
          setData(json);
          setCurrentIndex(0);
        } else {
          console.warn("No history facts available");
        }
      } catch (err) {
        console.error("Failed to load history:", err);
      }
    };
    load();
    // Refresh every 6 hours
    const refreshId = setInterval(load, 6 * 60 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(refreshId);
    };
  }, []);

  // Rotate through facts every 12 seconds
  useEffect(() => {
    if (!data || data.facts.length === 0) return;
    const rotateId = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % data.facts.length);
    }, 12000);
    return () => clearInterval(rotateId);
  }, [data]);

  if (!data || data.facts.length === 0) {
    return (
      <main style={{ 
        display: "flex", 
        flexDirection: "column", 
        flex: 1, 
        alignItems: "center",
        justifyContent: "center",
        padding: 40
      }}>
        <p style={{ fontSize: "2em", opacity: 0.5 }}>Laster historie...</p>
      </main>
    );
  }

  const currentFact = data.facts[currentIndex];
  const typeEmoji = currentFact.type === "birth" ? "👶" : currentFact.type === "death" ? "🕊️" : "📅";
  const typeLabel = currentFact.type === "birth" ? "Født" : currentFact.type === "death" ? "Død" : "Hendelse";

  return (
    <main style={{ 
      display: "flex", 
      flexDirection: "column", 
      flex: 1, 
      padding: "40px 60px",
      gap: 30,
      justifyContent: "center",
      minHeight: 0,
      overflow: "hidden"
    }}>
      {/* Title */}
      <div style={{ textAlign: "center" }}>
        <h1 style={{ 
          fontSize: "4.5em", 
          margin: 0,
          fontWeight: 300,
          opacity: 0.9
        }}>
          📜 Dagens historie
        </h1>
        <p style={{ 
          fontSize: "2.5em", 
          margin: "10px 0 0 0",
          opacity: 0.6,
          fontWeight: 300
        }}>
          {data.date}
        </p>
      </div>

      {/* Current Fact */}
      <div style={{
        background: theme.card,
        border: `2px solid ${theme.border}`,
        borderRadius: 20,
        padding: "50px 60px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
        transition: "all 0.5s ease",
        minHeight: "300px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 30
      }}>
        {/* Year Badge */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 20
        }}>
          <div style={{
            background: colors.YR.primary + "20",
            color: colors.YR.primary,
            padding: "15px 30px",
            borderRadius: 12,
            fontSize: "3em",
            fontWeight: 600,
            border: `2px solid ${colors.YR.primary}40`
          }}>
            {currentFact.year}
          </div>
          <div style={{
            fontSize: "2em",
            opacity: 0.5,
            display: "flex",
            alignItems: "center",
            gap: 10
          }}>
            <span>{typeEmoji}</span>
            <span style={{ fontSize: "0.8em" }}>{typeLabel}</span>
          </div>
        </div>

        {/* Fact Text */}
        <p style={{ 
          fontSize: "2.8em", 
          lineHeight: 1.5,
          margin: 0,
          fontWeight: 300
        }}>
          {currentFact.text}
        </p>
      </div>

      {/* Progress Dots */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: 12,
        marginTop: 10
      }}>
        {data.facts.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentIndex ? 16 : 10,
              height: i === currentIndex ? 16 : 10,
              borderRadius: "50%",
              background: i === currentIndex ? colors.YR.primary : theme.text,
              opacity: i === currentIndex ? 1 : 0.3,
              transition: "all 0.3s ease"
            }}
          />
        ))}
      </div>
    </main>
  );
}
