// frontend/src/cards/CalendarCard.tsx
import { useEffect, useMemo, useState } from "react";
import type { Theme, Colors } from "../types";
import PoweredBy from "../components/PoweredBy";
import googleLogoLight from "../assets/googleLogoLight.png";
import googleLogoDark from "../assets/googleLogoDark.png";

type Props = {
  theme: Theme;
  colors: Colors;
  isDay: boolean;
  daysAhead?: number; // how many days ahead (today + N); default 4
};

type IncomingFlat = { id: string; summary?: string; start?: string; end?: string };
type IncomingNested = {
  id: string;
  summary?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};
type Normalized = { id: string; summary?: string; startISO?: string; endISO?: string; allDay?: boolean };

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
  daysAhead = 4,
}: Props) {
  const [events, setEvents] = useState<Normalized[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const DAYS_AHEAD = Math.max(0, Math.round(daysAhead));  // normalize
  const colCount = DAYS_AHEAD + 1;                        // today + N
  const compress = colCount > 10;                         // hide text when too many columns
  const verticalText = !compress && DAYS_AHEAD > 4;       // rotate text when > 4 days ahead (i.e., >=6 cols)
  const NAME_COL_PX = 160;
  const GAP = compress ? 8 : 16;                          // smaller gaps when many cols

  // Build the dynamic window: [today 00:00, today+daysAhead 23:59:59]
  const windowBounds = useMemo(() => {
    const start = startOfDay(new Date());
    const end = endOfDay(addDays(start, DAYS_AHEAD));
    return { timeMin: start.toISOString(), timeMax: end.toISOString(), start, end };
  }, [DAYS_AHEAD]);

  // Days = today .. today+daysAhead
  const days = useMemo(() => {
    const arr: { date: Date }[] = [];
    for (let i = 0; i < colCount; i++) {
      arr.push({ date: addDays(windowBounds.start, i) });
    }
    return arr;
  }, [windowBounds.start, colCount]);

  const lastColIndex = colCount - 1;

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
        const params = new URLSearchParams({
          timeMin: windowBounds.timeMin,
          timeMax: windowBounds.timeMax,
          maxResults: "250",
          singleEvents: "true",
          orderBy: "startTime",
        });
        const r = await fetch(`/api/calendar/upcoming?${params.toString()}`);
        if (!r.ok) throw new Error(`Calendar fetch failed (${r.status})`);
        const data = await r.json();
        const raw = Array.isArray(data?.items) ? data.items :
                    Array.isArray(data?.events) ? data.events : [];
        if (!alive) return;

        // Only tagged events: "ALLE:" or exact person name followed by ":"
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
        if (!persons.length) continue; // skip unassigned

        const start = new Date(ev.startISO);
        let end = ev.endISO ? new Date(ev.endISO) : new Date(ev.startISO);
        const endIso = ev.endISO ?? ev.startISO;
        const isDateOnlyEnd = !!endIso && /^\d{4}-\d{2}-\d{2}$/.test(endIso);
        if (ev.allDay && isDateOnlyEnd) end = addDays(end, -1); // Google all-day is exclusive

        let sIdx = dayIndex(start);
        let eIdx = dayIndex(end);
        if (eIdx < 0 || sIdx > lastColIndex) continue; // outside window
        sIdx = Math.max(0, sIdx);
        eIdx = Math.min(lastColIndex, eIdx);

        // ✅ Only add to the parsed assignees (ALLE already expanded in parseAssignees)
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
  }, [events, lastColIndex]);

  // ---------- styles (fluid, no overflow) ----------
  const gridCols = `minmax(${NAME_COL_PX}px, ${NAME_COL_PX}px) repeat(${colCount}, minmax(0, 1fr))`;

  const cardStyle: React.CSSProperties = {
    width: "100%",
    background: theme.card as string,
    borderRadius: 20,
    padding: 20,
    boxSizing: "border-box",
    overflow: "hidden",
  };
  const headerStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: gridCols,
    gap: GAP,
    marginBottom: 10,
    minWidth: 0,
  };

  const fmtDay = (d:Date) =>
    new Intl.DateTimeFormat("nb-NO",{ day:"2-digit", month:"2-digit" }).format(d);

  const personAccent: Record<Person,string> = {
    Hallgrim:"#6b7280", Eskil:"#2563eb", Sindre:"#059669",
    Kristian:"#d97706", Niklas:"#db2777", Marius:"#9333ea",
  };

  const blockStyle = (bg:string): React.CSSProperties => ({
    background:bg,
    color:"white",
    fontWeight:400,
    borderRadius:12,
    height:"100%",
    padding: verticalText ? "6px 6px" : "10px 12px", // tighter padding when rotated
    overflow:"hidden",
    textOverflow:"ellipsis",
    whiteSpace:"nowrap",
    display:"flex",
    alignItems:"center",
    justifyContent:"center",
    boxShadow: isDay ? "0 2px 8px rgba(0,0,0,0.10)" : "0 2px 8px rgba(0,0,0,0.25)",
    fontSize: verticalText ? "1.4em" : "2.0em",       // smaller when rotated to fit height
    minWidth: 0,
  });

  if (!events) return <section style={cardStyle}>Laster kalender…</section>;
  if (err) return <section style={cardStyle}>{err}</section>;

  return (
    <section style={cardStyle}>
      {/* Header: empty + dynamic day labels */}
      <div style={headerStyle}>
        <div style={{ minWidth: 0 }} />
        {days.map(({date})=>(
          <div
            key={date.toISOString()}
            style={{
              fontWeight:700,
              textAlign:"center",
              color:theme.text,
              fontSize: compress ? "1.5em" : "2.0em",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {fmtDay(date)}
          </div>
        ))}
      </div>

      {/* Body with horizontal dividers per person */}
      <div style={{ display:"grid", minWidth: 0 }}>
        {PEOPLE.map((p, pi) => {
          const laneCount = lanesByPerson[p].laneCount;

          // Keep total person row height = 200px, preserving a gap between lanes.
          const perLaneHeight = Math.max(24, (200 - GAP) / laneCount);

          const rowGrid: React.CSSProperties = {
            display:"grid",
            gridTemplateColumns: gridCols,
            gridTemplateRows:`repeat(${laneCount}, ${perLaneHeight}px)`,
            columnGap: GAP,
            rowGap: GAP,
            alignItems:"center",
            minWidth: 0,
          };

          return (
            <div
              key={p}
              style={{
                paddingBottom: GAP,
                marginBottom: GAP,
                borderBottom: pi < PEOPLE.length - 1 ? `1px solid ${theme.border}` : "none",
                minWidth: 0,
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
                    fontWeight: 600,
                    color: theme.text,
                    fontSize: "1.6em",
                    paddingLeft: 4,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p}
                </div>

                {/* Invisible slots define grid cells for all day columns across all lanes */}
                {Array.from({ length: laneCount }).map((_, lane) =>
                  days.map((_, col) => (
                    <div
                      key={`slot-${p}-${lane}-${col}`}
                      style={{ gridColumn: `${col+2} / span 1`, gridRow: `${lane+1} / span 1`, minWidth: 0 }}
                    />
                  ))
                )}

                {/* Event blocks spanning the correct day columns */}
                {lanesByPerson[p].lanes.flat().map(ev => (
                  <div
                    key={ev.id}
                    style={{
                      ...blockStyle(personAccent[p]),
                      gridRow: `${ev.lane + 1} / span 1`,
                      gridColumn: `${ev.startIdx + 2} / span ${ev.span}`, // +2 skips the name column
                    }}
                    title={ev.title}
                  >
                    {/* Text visibility & orientation rules */}
                    {compress ? (
                      "" // too many columns, show color only
                    ) : verticalText ? (
                      <span
                        style={{
                          display: "inline-block",
                          transform: "rotate(-90deg)",
                          transformOrigin: "center",
                          whiteSpace: "nowrap",
                          pointerEvents: "none",
                        }}
                      >
                        {ev.title}
                      </span>
                    ) : (
                      ev.title
                    )}
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
