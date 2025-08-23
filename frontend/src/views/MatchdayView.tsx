import { useEffect, useMemo, useState } from "react";
import type { Theme } from "../types";

// Local club crests (fallbacks)
import arsenalLogo from "../assets/arsenal.png";
import manutdLogo from "../assets/manutd.png";

type TeamKey = "Arsenal" | "Manchester United";

type Fixture = {
  team: TeamKey;
  utcDate: string;
  opponent: string;
  home: boolean;
  competition?: string;
  status?: string; // SCHEDULED | LIVE | IN_PLAY | FINISHED | etc
  venue?: string | null;
  score?: { home?: number | null; away?: number | null };

  // NEW: crest URLs from API (raw sources, likely SVG/PNG)
  teamCrest?: string | null;
  opponentCrest?: string | null;
};

type ApiResp = {
  date: string;
  hasMatches: boolean;
  fixtures: Fixture[];
  source?: string;
};

const CLUB_META: Record<TeamKey, { color: string; logo: string; nickname: string }> = {
  Arsenal: { color: "#DB0007", logo: arsenalLogo, nickname: "The Gunners" },
  "Manchester United": { color: "#DA020E", logo: manutdLogo, nickname: "The Red Devils" },
};

export default function MatchdayView({
  theme,
}: {
  theme: Theme;
}) {
  const [data, setData] = useState<ApiResp | null>(null);

useEffect(() => {
  fetch("/api/matchday/today")
    .then(res => res.json())
    .then(setData)
    .catch(console.error);
}, []);

const fixtures = useMemo(() => {
  if (!data?.fixtures) return [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10); // "YYYY-MM-DD"
  return data.fixtures.filter(f => {
    // Parse fixture date as UTC and compare to today
    const fixtureDate = new Date(f.utcDate);
    const fixtureStr = fixtureDate.toISOString().slice(0, 10);
    return fixtureStr === todayStr;
  });
}, [data]);
  const count = fixtures.length;

  const wrapStyle: React.CSSProperties = {
    display: "grid",
    gap: 20,
    marginTop: 20,
    gridTemplateColumns: "1fr",
    gridAutoRows:
      count === 1 ? "minmax(420px, 1fr)" :
      count === 2 ? "minmax(360px, 1fr)" :
      "minmax(300px, 1fr)",
  };

  const cardStyleBase: React.CSSProperties = {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 20,
    padding: 20,
    display: "grid",
    gridTemplateColumns: "96px 1fr auto", // crest | text | right column
    alignItems: "center",
    gap: 16,
  };

  if (!data) {
    return (
      <main style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <section style={{ ...cardStyleBase, placeItems: "center" }}>
          <div style={{ opacity: 0.7 }}>Laster kamper…</div>
        </section>
      </main>
    );
  }

  if (!data.hasMatches) {
    return (
      <main style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <section style={{ ...cardStyleBase, placeItems: "center" }}>
          <div style={{ fontSize: "2.2em", textAlign: "center", opacity: 0.7 }}>
            Ingen kamper i dag for Arsenal eller Manchester United.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={{ flex: 1 }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: "3.0em", fontWeight: 600, margin: 20,
          color: theme.text}}>
            ⚽🔥 Matchday 🔥⚽
        </h1>
      </div>
      <div style={wrapStyle}>
        {fixtures.map((f, i) => {
const homeName = f.home ? f.team : f.opponent;
const awayName = f.home ? f.opponent : f.team;
const fallbackMeta = { color: "#888", logo: "", nickname: "" };
const homeMeta = CLUB_META[homeName as TeamKey] || fallbackMeta;
const awayMeta = CLUB_META[awayName as TeamKey] || fallbackMeta;
const homeCrest = f.home ? f.teamCrest : f.opponentCrest;
const awayCrest = f.home ? f.opponentCrest : f.teamCrest;
          const kickoff = new Date(f.utcDate);
          const kickoffTime = kickoff.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "stretch",
                background: theme.card,
                borderRadius: 16,
                margin: "24px 0",
                boxShadow: "0 2px 12px #0001",
                overflow: "hidden",
                minHeight: 180,
              }}
            >
              {/* Left color bar */}
              <div style={{
                width: 12,
                background: homeMeta.color,
              }} />
              {/* Main content */}
              <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 32px",
              }}>
                {/* Home team */}
                <div style={{ textAlign: "center", flex: 1 }}>
                  <img src={homeCrest || homeMeta.logo} alt="" style={{ height: 100, marginBottom: 8 }} />
                  <div style={{ fontWeight: 700, fontSize: "2.0em" }}>{homeName}</div>
                </div>
                {/* Center info */}
                <div style={{ textAlign: "center", flex: 1.2 }}>
                  <div style={{ fontSize: "2.5em", fontWeight: 600, marginBottom: 4 }}>
                    {kickoffTime}
                  </div>
                  <div style={{ fontSize: "1em", opacity: 0.7, marginBottom: 2 }}>
                    {f.competition}
                  </div>
                  <div style={{ fontSize: "0.95em", opacity: 0.6 }}>
                    {f.venue}
                  </div>
                </div>
                {/* Away team */}
                <div style={{ textAlign: "center", flex: 1 }}>
                  <img src={awayCrest || awayMeta.logo} alt="" style={{ height: 100, marginBottom: 8 }} />
                  <div style={{ fontWeight: 700, fontSize: "2.0em" }}>{awayName}</div>
                </div>
              </div>
              {/* Right color bar */}
              <div style={{
                width: 12,
                background: awayMeta.color,
              }} />
            </div>
          );
        })}
      </div>
    </main>
  );
}