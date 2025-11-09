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
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<HistoryFact[][]>([]);
  const ITEMS_PER_PAGE = 5; // Max 5 facts per page to avoid overflow

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
          
          // Split facts into pages
          const factPages: HistoryFact[][] = [];
          for (let i = 0; i < json.facts.length; i += ITEMS_PER_PAGE) {
            factPages.push(json.facts.slice(i, i + ITEMS_PER_PAGE));
          }
          setPages(factPages);
          setCurrentPage(0);
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

  // Rotate through pages every 12 seconds if there are multiple pages
  useEffect(() => {
    if (pages.length <= 1) return;
    const rotateId = setInterval(() => {
      setCurrentPage((i) => (i + 1) % pages.length);
    }, 12000);
    return () => clearInterval(rotateId);
  }, [pages]);

  if (!data || pages.length === 0) {
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

  const currentFacts = pages[currentPage];

  return (
    <main style={{ 
      display: "flex", 
      flexDirection: "column", 
      flex: 1, 
      padding: "30px 50px",
      minHeight: 0,
      overflow: "hidden",
      background: "#000000",
      color: "#FFFFFF",
      fontFamily: "monospace",
      borderRadius: "20px"
    }}>
      {/* Tekst-TV Header */}
      <div style={{
        marginBottom: "20px"
      }}>
        <div style={{
          fontSize: "5em",
          fontWeight: "bold",
          color: "#CC0000",
          letterSpacing: "0.1em",
          marginBottom: "10px"
        }}>
          DAGEN I DAG
        </div>
        <div style={{
          fontSize: "2.2em",
          marginBottom: "5px"
        }}>
          {data.date}
        </div>
        <div style={{
          height: "8px",
          background: "#CC0000",
          marginTop: "15px"
        }}></div>
      </div>

      {/* History Facts List - Tekst-TV Style */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        fontSize: "3em",
        lineHeight: 1.4,
        minHeight: 0
      }}>
        {currentFacts.map((fact, i) => (
          <div key={i} style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "15px"
          }}>
            <span style={{
              color: "#79F3F9",
              minWidth: "100px",
              fontWeight: "bold"
            }}>
              {fact.year}
            </span>
            <span style={{
              flex: 1,
              color: "#FFFFFF"
            }}>
              {fact.text}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom Red Bar with Page Indicator */}
      <div style={{
        marginTop: "20px"
      }}>
        {pages.length > 1 && (
          <div style={{
            textAlign: "center",
            fontSize: "1.5em",
            color: "#79F3F9",
            marginBottom: "10px"
          }}>
            {currentPage + 1} / {pages.length}
          </div>
        )}
        <div style={{
          height: "8px",
          background: "#CC0000"
        }}></div>
      </div>
    </main>
  );
}
