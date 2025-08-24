// frontend/src/cards/CalendarCard.tsx
import { useEffect, useMemo, useState } from "react";
import type { Theme, Colors } from "../types";
import PoweredBy from "../components/PoweredBy";
import googleLogoLight from "../assets/googleLogoLight.png";
import googleLogoDark from "../assets/googleLogoDark.png";

type Props = {
  theme?: Theme;
  colors?: Colors;
  isDay?: boolean;
};

type IncomingFlat = { id: string; summary?: string; start?: string; end?: string };
type IncomingNested = {
  id: string;
  summary?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};
type Normalized = { id: string; summary?: string; startISO?: string; endISO?: string; allDay?: boolean };

// ROWS = people (full names), COLS = next 5 days
const PEOPLE = ["Hallgrim", "Eskil", "Sindre", "Kristian", "Niklas", "Marius"] as const;
type Person = typeof PEOPLE[number];

const defaultTheme: Theme = { card: "#ffffff", border: "#e5e7eb", text: "#111827" } as Theme;
const defaultColors: Colors = {} as Colors;

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }

const PEOPLE_UC = PEOPLE.map(p => p.toUpperCase());
function parseAssignees(summary?: string): { persons: Person[]; title?: string } {
  if (!summary) return { persons: [] };
  const m = summary.match(/^\s*([A-Za-zÅÆØåæø]+)\s*:\s*(.+)\s*$/);
  if (!m) return { persons: [] };
  const tagUC = m[1].toUpperCase();
  const title = m[2];
  if (tagUC === "ALLE") return { persons: [...PEOPLE], title };
  const idx = PEOPLE_UC.indexOf(tagUC);
  if (idx >= 0) return { persons: [PEOPLE[idx]], title };
  return { persons: [] };
}

function normalize(ev: IncomingFlat | IncomingNested): Normalized {
  const n = ev as IncomingNested;
  const f = ev as IncomingFlat;
  const startISO = n.start?.dateTime ?? n.start?.date ?? f.start;
  const endISO   = n.end?.dateTime   ?? n.end?.date   ?? f.end;
  const allDay =
    Boolean(n.start?.date && !n.start?.dateTime) ||
    (!!startISO && /^\d{4}-\d{2}-\d{2}$/.test(startISO));
  return { id: (ev as any).id, summary: (ev as any).summary, startISO, endISO, allDay };
}

export default function CalendarCard({
  theme = defaultTheme,
  colors = defaultColors,
  isDay = true,
}: Props) {
  const [events, setEvents] = useState<Normalized[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Build the exact 5-day window: [today 00:00, today+4 23:59:59]
  const windowBounds = useMemo(() => {
    const start = startOfDay(new Date());
    const end = endOfDay(addDays(start, 4));
    return { timeMin: start.toISOString(), timeMax: end.toISOString(), start, end };
  }, []);

  // Days = 5 columns
  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 5; i++) {
      const date = addDays(windowBounds.start, i);
      arr.push({ date });
    }
    return arr;
  }, [windowBounds.start]);

  const day0 = days[0]?.date ?? startOfDay(new Date());
  const dayIndex = (d: Date) => {
    const diff = startOfDay(d).getTime() - startOfDay(day0).getTime();
    return Math.floor(diff / (24 * 3600 * 1000));
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr(null);
        // Ask backend for ALL events in the 5-day window
        const params = new URLSearchParams({
          timeMin: windowBounds.timeMin,
          timeMax: windowBounds.timeMax,
          maxResults: "250",          // server forwards to Google; 250 is API max per page
          singleEvents: "true",       // (your server already sets this, but harmless here)
          orderBy: "startTime",
        });
        const r = await fetch(`/api/calendar/upcoming?${params.toString()}`);
        if (!r.ok) throw new Error(`Calendar fetch failed (${r.status})`);
        const data = await r.json();
        const raw = Array.isArray(data?.items) ? data.items :
                    Array.isArray(data?.events) ? data.events : [];
        if (!alive) return;

        // Optional micro-filter: drop untagged before normalize to save a bit
        const relevant = (raw as Array<IncomingFlat | IncomingNested>).filter(e => {
          const s = (e as any).summary as string | undefined;
          if (!s) return false;
          const m = s.match(/^\s*([A-Za-zÅÆØåæø]+)\s*:/);
          if (!m) return false;
          const tagUC = m[1].toUpperCase();
          return tagUC === "ALLE" || PEOPLE_UC.includes(tagUC);
        });

        setEvents(relevant.map(normalize));
      } catch (e) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Kunne ikke laste kalenderen");
        setEvents([]);
      }
    })();
    return () => { alive = false; };
  }, [windowBounds]);

  type SpanEvent = { id: string; title: string; row: Person; startIdx: number; endIdx: number; span: number };
  type LaneEvent = SpanEvent & { lane: number };

  // Build per-person lanes for stacking
  const lanesByPerson: Record<Person, { lanes: LaneEvent[][]; laneCount: number }> = useMemo(() => {
    const byPerson: Record<Person, SpanEvent[]> =
      { Hallgrim:[], Eskil:[], Sindre:[], Kristian:[], Niklas:[], Marius:[] };

    if (events?.length) {
      for (const ev of events) {
        if (!ev.startISO) continue;
        const { persons, title } = parseAssignees(ev.summary);
        if (!persons.length) continue;

        const start = new Date(ev.startISO);
        let end = ev.endISO ? new Date(ev.endISO) : new Date(ev.startISO);
        const endIso = ev.endISO ?? ev.startISO;
        const isDateOnlyEnd = !!endIso && /^\d{4}-\d{2}-\d{2}$/.test(endIso);
        if (ev.allDay && isDateOnlyEnd) end = addDays(end, -1);

        let sIdx = dayIndex(start);
        let eIdx = dayIndex(end);
        if (eIdx < 0 || sIdx > 4) continue; // outside window
        sIdx = Math.max(0, sIdx);
        eIdx = Math.min(4, eIdx);

        for (const p of persons) {
          const span = Math.max(1, eIdx - sIdx + 1);
          byPerson[p].push({
            id: ev.id + ":" + p,
            title: (title ?? ev.summary ?? "").trim(),
            row: p,
            startIdx: sIdx,
            endIdx: eIdx,
            span,
          });
        }
      }
    }

    const out: Record<Person, { lanes: LaneEvent[][]; laneCount: number }> =
      { Hallgrim:{lanes:[], laneCount:0}, Eskil:{lanes:[], laneCount:0}, Sindre:{lanes:[], laneCount:0},
        Kristian:{lanes:[], laneCount:0}, Niklas:{lanes:[], laneCount:0}, Marius:{lanes:[], laneCount:0} };

    for (const p of PEOPLE) {
      const evs = byPerson[p].sort((a,b)=> a.startIdx - b.startIdx || a.endIdx - b.endIdx || a.title.localeCompare(b.title));
      const lanes: LaneEvent[][] = [];
      const laneEnds: number[] = []; // inclusive endIdx per lane
      for (const e of evs) {
        let placed = false;
        for (let li = 0; li < lanes.length; li++) {
          if (laneEnds[li] < e.startIdx) {
            lanes[li].push({ ...e, lane: li });
            laneEnds[li] = e.endIdx;
            placed = true; break;
          }
        }
        if (!placed) {
          const li = lanes.length;
          lanes.push([{ ...e, lane: li }]);
          laneEnds.push(e.endIdx);
        }
      }
      out[p] = { lanes, laneCount: Math.max(lanes.length, 1) };
    }
    return out;
  }, [events]);

  // ---------- styles ----------
  const COL_WIDTH = 150;
  const LANE_HEIGHT = 200; // thicker bars
  const GAP = 6;

  const cardStyle: React.CSSProperties = {
    width:"100%", maxWidth: 1000, margin:"0 auto",
    background: theme.card as string, borderRadius:20, padding:20,
  };
  const headerStyle: React.CSSProperties = {
    display:"grid", gridTemplateColumns:`160px repeat(5, ${COL_WIDTH}px)`, gap:GAP, marginBottom:10
  };

  const fmtDay = (d:Date) =>
    new Intl.DateTimeFormat("nb-NO",{ day:"2-digit", month:"2-digit" }).format(d);

  const personAccent: Record<Person,string> = {
    Hallgrim:"#6b7280", Eskil:"#2563eb", Sindre:"#059669",
    Kristian:"#d97706", Niklas:"#db2777", Marius:"#9333ea",
  };
  const blockStyle = (bg:string): React.CSSProperties => ({
    background:bg, color:"white", fontWeight:400, borderRadius:12, height: ( LANE_HEIGHT - 4 * GAP ),
    padding:"10px 12px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
    display:"flex", alignItems:"center", justifyContent:"center",
    boxShadow: isDay ? "0 2px 8px rgba(0,0,0,0.10)" : "0 2px 8px rgba(0,0,0,0.25)",
    fontSize: "1.5em",
  });

  if (!events) return <section style={cardStyle}>Laster kalender…</section>;
  if (err) return <section style={cardStyle}>{err}</section>;

  return (
    <section style={cardStyle}>
      {/* Header: empty + 5 day labels */}
      <div style={headerStyle}>
        <div />
        {days.map(({date})=>(
          <div key={date.toISOString()} style={{fontWeight:700,textAlign:"center",color:theme.text, fontSize:"2.0em"}}>
            {fmtDay(date)}
          </div>
        ))}
      </div>

      {/* Body with horizontal dividers per person */}
      <div style={{ display:"grid" }}>
        {PEOPLE.map((p, pi) => {
          const laneCount = lanesByPerson[p].laneCount;
          const rowGrid: React.CSSProperties = {
            display:"grid",
            gridTemplateColumns:`160px repeat(5, ${COL_WIDTH}px)`,
            gridTemplateRows:`repeat(${laneCount}, ${LANE_HEIGHT}px)`,
            columnGap: GAP,
            rowGap: GAP,
            alignItems:"center",
          };
          return (
            <div
              key={p}
              style={{
                paddingBottom: GAP,
                marginBottom: GAP,
                borderBottom: pi < PEOPLE.length - 1 ? `1px solid ${theme.border}` : "none",
              }}
            >
              <div style={rowGrid}>
                {/* Person label spanning all lanes */}
                <div
                  style={{
                    gridColumn: "1 / 2",
                    gridRow: `1 / span ${laneCount}`,
                    display:"flex",
                    alignItems:"center",
                    fontWeight:700,
                    color: theme.text,
                    fontSize: "1.6em",
                    paddingLeft: 4,
                  }}
                >
                  {p}
                </div>

                {/* Invisible slots to define grid */}
                {Array.from({ length: laneCount }).map((_, lane) =>
                  days.map((_, col) => (
                    <div key={`slot-${p}-${lane}-${col}`} style={{ gridColumn: `${col+2} / span 1`, gridRow: `${lane+1} / span 1` }} />
                  ))
                )}

                {/* Event blocks spanning columns */}
                {lanesByPerson[p].lanes.flat().map(ev => (
                  <div
                    key={ev.id}
                    style={{
                      ...blockStyle(personAccent[p]),
                      gridRow: `${ev.lane + 1} / span 1`,
                      gridColumn: `${ev.startIdx + 2} / span ${ev.span}`, // +2 skips name column
                    }}
                    title={ev.title}
                  >
                    {ev.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
                <PoweredBy logo={isDay ? googleLogoLight : googleLogoDark} alt="Google logo" />
    </section>
  );
}
