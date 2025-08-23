import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';

// ---------------- Types ----------------
type EnturDeparture = {
  expectedDepartureTime?: string;
  aimedDepartureTime?: string;
  realtime?: boolean;
  destinationDisplay?: { frontText?: string };
  serviceJourney?: {
    journeyPattern?: {
      line?: { id?: string; name?: string; publicCode?: string; transportMode?: string };
    };
  };
};

type EnturGraphQL = {
  data?: {
    stopPlace?: {
      id?: string;
      name?: string;
      estimatedCalls?: EnturDeparture[];
    };
  };
};

type YRCompact = {
  properties?: {
    timeseries?: Array<{
      time?: string;
      data?: {
        instant?: {
          details?: {
            air_temperature?: number;
            wind_speed?: number;             // m/s
            wind_speed_of_gust?: number;     // m/s
            wind_from_direction?: number;    // degrees
          };
        };
        next_1_hours?: {
          summary?: { symbol_code?: string };
          details?: {
            precipitation_amount?: number;        // mm (single value)
          };
        };
      };
    }>;
  };
};

type TeamKey = "Arsenal" | "Manchester United";

type MatchdayFixture = {
  team: TeamKey;
  utcDate: string;                 // ISO
  opponent: string;
  home: boolean;
  competition?: string | null;
  status?: string | null;          // SCHEDULED | IN_PLAY | LIVE | FINISHED | POSTPONED...
  venue?: string | null;
  score?: { home?: number | null; away?: number | null };

  // NEW: crest URLs (raw from football-data)
  teamCrest?: string | null;
  opponentCrest?: string | null;
};

const TEAMS = [
  { label: "Arsenal" as TeamKey,            id: 57,  homeStadium: "Emirates Stadium" },
  { label: "Manchester United" as TeamKey,  id: 66,  homeStadium: "Old Trafford" },
];

const app = express();
app.use(cors());

const PORT = Number(process.env.PORT || 8787);
const ET_CLIENT_NAME = process.env.ET_CLIENT_NAME || 'pi-infoscreen/0.1 (example@example.com)';
const MET_USER_AGENT = process.env.MET_USER_AGENT || 'pi-infoscreen/0.1 (example@example.com)';
const NRK_RSS_URL = process.env.NRK_RSS_URL || 'https://www.nrk.no/nyheter/siste.rss';

// --- Entur / AtB departures (filtered to publicCode=25)
app.get('/api/entur/departures', async (req: Request, res: Response) => {
  try {
    const stopPlaceId = String(req.query.stopPlaceId || '');
    const max = Number(req.query.max || 12);

    if (!stopPlaceId) {
      return res.status(400).json({ error: 'Missing stopPlaceId' });
    }

    const query = `
      query($id: String!, $max: Int!) {
        stopPlace(id: $id) {
          id
          name
          estimatedCalls(numberOfDepartures: $max, includeCancelledTrips: false) {
            realtime
            aimedDepartureTime
            expectedDepartureTime
            destinationDisplay { frontText }
            serviceJourney {
              journeyPattern { line { id name publicCode transportMode } }
            }
          }
        }
      }
    `;

    const r = await fetch('https://api.entur.io/journey-planner/v3/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ET-Client-Name': ET_CLIENT_NAME,
      },
      body: JSON.stringify({ query, variables: { id: stopPlaceId, max } }),
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).send(text);
    }

    const data = (await r.json()) as EnturGraphQL;

    // No filtering by line publicCode — include all lines
    const calls = (data.data?.stopPlace?.estimatedCalls ?? [])
      // sort by expected time (fallback to aimed)
      .slice()
      .sort((a, b) => {
        const ta = Date.parse(a.expectedDepartureTime ?? a.aimedDepartureTime ?? '');
        const tb = Date.parse(b.expectedDepartureTime ?? b.aimedDepartureTime ?? '');
        return ta - tb;
      });

    return res.json({
      stopPlace: {
        id: data.data?.stopPlace?.id,
        name: data.data?.stopPlace?.name,
      },
      departures: calls.map((c) => ({
        destination: c.destinationDisplay?.frontText ?? null,
        line: c.serviceJourney?.journeyPattern?.line?.publicCode ?? null,
        transportMode: c.serviceJourney?.journeyPattern?.line?.transportMode ?? null,
        realtime: Boolean(c.realtime),
        aimed: c.aimedDepartureTime ?? null,
        expected: c.expectedDepartureTime ?? null,
      })),
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Entur error' });
  }
});


// --- YR / MET Norway: today forecast (compact)
// --- YR / MET Norway: today + next hours (compact)
app.get('/api/yr/today', async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat || process.env.DEFAULT_LAT || 63.4305);
    const lon = Number(req.query.lon || process.env.DEFAULT_LON || 10.3951);
    const hoursWanted = Math.min(Math.max(Number(req.query.hours || 5), 1), 12); // 1..12

    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
    const r = await fetch(url, { headers: { 'User-Agent': MET_USER_AGENT } });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).send(text);
    }

    const payload = (await r.json()) as YRCompact;
    const timeseries = payload.properties?.timeseries ?? [];
    const now = new Date();

    // ---- "Today" summary (min/max temp and last symbol seen today)
    const todayISO = now.toISOString().slice(0, 10);
    const todayPoints = timeseries.filter((t) => (t.time ?? '').slice(0, 10) === todayISO);

    let minT = Infinity;
    let maxT = -Infinity;
    let symbol = '';

    for (const tp of todayPoints) {
      const temp = tp.data?.instant?.details?.air_temperature;
      if (typeof temp === 'number') {
        minT = Math.min(minT, temp);
        maxT = Math.max(maxT, temp);
      }
      const s = tp.data?.next_1_hours?.summary?.symbol_code;
      if (s) symbol = s;
    }

    // ---- Next N hours (>= now). Prefer rows that have next_1_hours present.
    const nextHours: Array<{
      time: string;              // "HH"
      symbol: string | null;
      temp: number | null;       // °C
      precipMm: number | null;   // single value (avg if only range present)
      wind: number | null;       // m/s
      dir: number | null;        // degrees
      iso: string;               // full ISO time
    }> = [];

    for (const tp of timeseries) {
      const t = new Date(tp.time ?? 0);
      if (isNaN(t.getTime()) || t < now) continue;

      const inst = tp.data?.instant?.details;
      const next = tp.data?.next_1_hours;

      if (!inst || !next) continue; // need both for hourly row

      // Precipitation: always forward min/max if present, and the single value if present
      const amt  = typeof next.details?.precipitation_amount === 'number'
        ? Number(next.details.precipitation_amount.toFixed(1))
        : null;

      // precipMm: prefer the single value, else average of min/max if both present, else null
      let precipMm: number | null = null;
      if (amt !== null) {
        precipMm = amt;
      }

      nextHours.push({
        time: String(t.getHours()).padStart(2, '0'),
        symbol: next.summary?.symbol_code ?? null,
        temp: typeof inst.air_temperature === 'number' ? Math.round(inst.air_temperature) : null,
        precipMm,
        wind: typeof inst.wind_speed === 'number' ? Math.round(inst.wind_speed) : null,
        dir:  typeof inst.wind_from_direction === 'number' ? Math.round(inst.wind_from_direction) : null,
        iso: tp.time as string,
      });

      if (nextHours.length >= hoursWanted) break;
    }

    return res.json({
      lat,
      lon,
      today: todayISO,
      tempMin: Number.isFinite(minT) ? Math.round(minT) : null,
      tempMax: Number.isFinite(maxT) ? Math.round(maxT) : null,
      symbol,
      hours: nextHours,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'YR error' });
  }
});



// --- NRK RSS proxied to JSON (title/link/pubDate/description/image)
app.get('/api/nrk/latest', async (req: Request, res: Response) => {
  try {
    const feedUrl = String(req.query.url || NRK_RSS_URL);
    const r = await fetch(feedUrl, {
      headers: { 'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8' },
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).send(text);
    }
    const xml = await r.text();

    const items: Array<{
      title: string;
      link: string;
      pubDate: string;
      description?: string;
      image?: string;
    }> = [];

    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let m: RegExpExecArray | null;

    const stripCdata = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const getTag = (block: string, tag: string) => {
      const mm = block.match(new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return stripCdata(mm?.[1] ?? '');
    };

    const getAttr = (block: string, tag: string, attr: string) => {
      const mm = block.match(new RegExp(`<${tag}[^>]*\\b${attr}="([^"]+)"[^>]*>`, 'i'));
      return mm?.[1] ?? '';
    };

    const firstImgInHtml = (html: string) => {
      const mm = html.match(/<img[^>]*src="([^"]+)"/i);
      return mm?.[1] ?? '';
    };

    while ((m = itemRegex.exec(xml))) {
      const block = m[1];

      const title = getTag(block, 'title');
      const link = getTag(block, 'link');
      const pubDate = getTag(block, 'pubDate');
      const description = getTag(block, 'description');

      // Try a few common places NRK puts images:
      // 1) <media:content url="...">, 2) <enclosure url="...">, 3) first <img src> in description
      const mediaUrl =
        getAttr(block, 'media:content', 'url') ||
        getAttr(block, 'enclosure', 'url') ||
        firstImgInHtml(description);

      items.push({
        title,
        link,
        pubDate,
        description: description || undefined,
        image: mediaUrl || undefined,
      });
    }

    return res.json({ source: feedUrl, items });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'NRK error' });
  }
});

app.get("/api/matchday/today", async (req: Request, res: Response) => {

    console.log("FOOTBALL_DATA_TOKEN:", process.env.FOOTBALL_DATA_TOKEN);

  try {
    const token = process.env.FOOTBALL_DATA_TOKEN || "";

    // Get today's date in UTC
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayStr = todayUTC.toISOString().slice(0, 10); // "YYYY-MM-DD"
    

    const out: MatchdayFixture[] = [];

    if (token) {
      const headers = { "X-Auth-Token": token };
      for (const t of TEAMS) {
        try {
          const url = `https://api.football-data.org/v4/teams/${t.id}/matches?dateFrom=${todayStr}&dateTo=${todayStr}`;
          const r = await fetch(url, { headers });
          if (!r.ok) throw new Error(`fd.org ${t.label}: ${r.status}`);
          const j = await r.json();

          const matches: any[] = j?.matches ?? [];
          for (const m of matches) {
            // Only compare the date part in UTC
            if (!m.utcDate || m.utcDate.slice(0, 10) !== todayStr) continue;

            const homeName = m.homeTeam?.name || "Home";
            const awayName = m.awayTeam?.name || "Away";
            const teamIsHome = homeName.toLowerCase().includes(t.label.toLowerCase());

            const oppName = teamIsHome ? awayName : homeName;

            // crests direct from football-data.org (may be svg/png)
            const homeCrest: string | null = m.homeTeam?.crest ?? null;
            const awayCrest: string | null = m.awayTeam?.crest ?? null;

            const venue = (m.venue as string | undefined) || (teamIsHome ? t.homeStadium : null);

            const score = m.score?.fullTime
              ? {
                  home: typeof m.score.fullTime.home === "number" ? m.score.fullTime.home : null,
                  away: typeof m.score.fullTime.away === "number" ? m.score.fullTime.away : null,
                }
              : { home: null, away: null };

            out.push({
              team: t.label,
              utcDate: m.utcDate,
              opponent: oppName,
              home: teamIsHome,
              competition: m.competition?.name ?? null,
              status: m.status ?? null,
              venue: venue ?? null,
              score,
              teamCrest: teamIsHome ? homeCrest : awayCrest,
              opponentCrest: teamIsHome ? awayCrest : homeCrest,
            });
          }
        } catch {
          // continue on per-team failure
        }
      }
    } else {
      // Fallback mock (no crests if no token)
      out.push(
        {
          team: "Arsenal",
          utcDate: `${todayStr}T16:30:00Z`,
          opponent: "Chelsea",
          home: true,
          competition: "Premier League",
          status: "SCHEDULED",
          venue: "Emirates Stadium",
          score: { home: null, away: null },
          teamCrest: null,
          opponentCrest: null,
        },
        {
          team: "Manchester United",
          utcDate: `${todayStr}T19:00:00Z`,
          opponent: "Liverpool",
          home: false,
          competition: "Premier League",
          status: "SCHEDULED",
          venue: null,
          score: { home: null, away: null },
          teamCrest: null,
          opponentCrest: null,
        }
      );
    }

    // Only keep fixtures for today (UTC)
    const fixturesToday = out.filter(f => f.utcDate.slice(0, 10) === todayStr)
      .sort((a, b) => a.utcDate.localeCompare(b.utcDate));

    return res.json({
      date: todayStr,
      hasMatches: fixturesToday.length > 0,
      fixtures: fixturesToday,
      source: token ? "football-data.org" : "mock",
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Matchday error" });
  }
});

// ---- Crest Proxy -----------------------------------------------------------
app.get("/api/crest", async (req: Request, res: Response) => {
  try {
    const raw = String(req.query.url || "");
    if (!raw) return res.status(400).send("Missing url");

    // Very simple allow-list (football-data.org, upload.wikimedia.org, etc.)
    const allowed = ["crests.football-data.org", "upload.wikimedia.org"];
    const u = new URL(raw);
    if (!allowed.includes(u.hostname)) {
      return res.status(400).send("Domain not allowed");
    }

    const r = await fetch(raw);
    if (!r.ok) {
      return res.status(r.status).send("Upstream crest fetch failed");
    }
    const ct = r.headers.get("content-type") || "image/svg+xml";
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=86400"); // 1 day
    const buf = Buffer.from(await r.arrayBuffer());
    return res.send(buf);
  } catch (e: any) {
    return res.status(500).send(e?.message || "Crest proxy error");
  }
});

app.listen(PORT, () => {
  console.log(`Proxy listening on http://localhost:${PORT}`);
});
