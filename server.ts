import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import fs from "fs";
import { execSync } from "child_process";

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

const app = express();
app.use(cors());

const PORT = Number(process.env.PORT || 8787);
const ET_CLIENT_NAME = process.env.ET_CLIENT_NAME || 'pi-infoscreen/0.1 (example@example.com)';
const MET_USER_AGENT = process.env.MET_USER_AGENT || 'pi-infoscreen/0.1 (example@example.com)';
const NRK_RSS_URL = process.env.NRK_RSS_URL || 'https://www.nrk.no/nyheter/siste.rss';
const PRESENCE_MODE = process.env.PRESENCE_MODE || "auto"; // "arp" | "beacon" | "auto"
const PRESENCE_TTL_SEC = Number(process.env.PRESENCE_TTL_SEC || 600); // 10 minutes
const BEACON_SECRET = process.env.PRESENCE_BEACON_SECRET || ""; // required for beacon writes
const PRESENCE_SCAN_INTERVAL_SEC = Number(process.env.PRESENCE_SCAN_INTERVAL_SEC || 10);
type KnownDevice = { name: string; macs?: string[]; ips?: string[] };
const KNOWN_DEVICES: KnownDevice[] = (() => {
  try {
    const raw = process.env.KNOWN_DEVICES || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
})();

let lastArpRows: Array<{ ip: string; mac: string }> = [];
function scanArp() { lastArpRows = readArp(); }
scanArp();
setInterval(scanArp, PRESENCE_SCAN_INTERVAL_SEC * 1000);

function readArp(): Array<{ ip: string; mac: string }> {
  // Linux: /proc/net/arp
  try {
    const txt = fs.readFileSync("/proc/net/arp", "utf8");
    const lines = txt.trim().split("\n").slice(1);
    const rows = lines
      .map((l) => l.trim().split(/\s+/))
      .map(([ip, _hwtype, _flags, mac]) => ({ ip, mac: (mac || "").toLowerCase() }))
      .filter((r) => r.mac && r.mac !== "00:00:00:00:00:00");
    return rows;
  } catch {
    // Fallback: `arp -an`
    try {
      const out = execSync("arp -an", { timeout: 1500 }).toString();
      const rows = [...out.matchAll(/\(([^)]+)\)\s+at\s+([0-9a-f:]+)/gi)].map((m) => ({
        ip: m[1],
        mac: m[2].toLowerCase(),
      }));
      return rows;
    } catch {
      return [];
    }
  }
}

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

async function getAccessToken(): Promise<string> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error("Missing GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN");
  }

  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: GOOGLE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });

  // let TS infer fetch() response OR annotate with globalThis.Response
  const resp /* : globalThis.Response */ = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Token exchange failed (${resp.status}): ${text}`);
  }
  const json = (await resp.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("No access_token in token response");
  return json.access_token;
}

type GoogleEventItem = {
  id: string;
  summary?: string;
  location?: string;
  description?: string;
  htmlLink?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end:   { date?: string; dateTime?: string; timeZone?: string };
};

async function fetchAllEvents(
  accessToken: string,
  calId: string,
  baseParams: Record<string, string>
): Promise<GoogleEventItem[]> {
  const all: GoogleEventItem[] = [];
  let pageToken: string | undefined;
  let safety = 0;

  do {
    const params = new URLSearchParams({
      ...baseParams,
      maxResults: "250",
      ...(pageToken ? { pageToken } : {}),
    });

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calId
    )}/events?${params.toString()}`;

    const resp /* : globalThis.Response */ = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Calendar page fetch failed (${resp.status}): ${text}`);
    }

    const json = (await resp.json()) as { items?: GoogleEventItem[]; nextPageToken?: string };
    if (Array.isArray(json.items)) all.push(...json.items);
    pageToken = json.nextPageToken || undefined;

    safety += 1;
    if (safety > 20) break;
  } while (pageToken);

  return all;
}

app.get("/api/calendar/upcoming", async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const calId = process.env.GOOGLE_CALENDAR_ID;
    if (!calId) throw new Error("Missing GOOGLE_CALENDAR_ID");

    const accessToken = await getAccessToken();

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const defaultEnd   = new Date(defaultStart.getFullYear(), defaultStart.getMonth(), defaultStart.getDate() + 4, 23, 59, 59, 999);

    const timeMin = (typeof req.query.timeMin === "string" ? new Date(req.query.timeMin) : defaultStart).toISOString();
    const timeMax = (typeof req.query.timeMax === "string" ? new Date(req.query.timeMax) : defaultEnd).toISOString();

    const items = await fetchAllEvents(accessToken, calId, {
      singleEvents: "true",
      orderBy: "startTime",
      timeMin,
      timeMax,
    });

    res.setHeader("Cache-Control", "public, max-age=30");
    res.json({
      items: items.map(it => ({
        id: it.id,
        summary: it.summary,
        location: it.location,
        description: it.description,
        htmlLink: it.htmlLink,
        start: it.start,
        end: it.end,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    res.status(500).json({ error: msg });
  }
});

// ---- Presence service -------------------------------------------------------
const lastSeen = new Map<string, number>(); // for beacon mode

function computePresence() {
  const now = Date.now();
  const seenVia: Record<string, "arp" | "beacon"> = {};
  const present = new Set<string>();

  // ARP scan (home Wi-Fi)
  if (PRESENCE_MODE === "arp" || PRESENCE_MODE === "auto") {
  const arp = lastArpRows;
    const arpMacs = new Set(arp.map((r) => r.mac));
    const arpIps = new Set(arp.map((r) => r.ip));
    for (const d of KNOWN_DEVICES) {
      const macHit = (d.macs || []).some((m) => arpMacs.has(m.toLowerCase()));
      const ipHit = (d.ips || []).some((ip) => arpIps.has(ip));
      if (macHit || ipHit) {
        present.add(d.name);
        seenVia[d.name] = "arp";
      }
    }
  }

  // Beacon (hotspot/dev)
  if (PRESENCE_MODE === "beacon" || PRESENCE_MODE === "auto") {
    for (const [name, ts] of lastSeen) {
      if (now - ts <= PRESENCE_TTL_SEC * 1000) {
        if (!present.has(name)) seenVia[name] = "beacon";
        present.add(name);
      }
    }
  }

  return {
    present: [...present].sort(),
    seenVia,
    mode: PRESENCE_MODE,
    known: KNOWN_DEVICES.map((d) => d.name).sort(),
    serverTime: new Date().toISOString(),
  };
}

// GET who is home right now
app.get("/api/presence", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(computePresence());
});

// DEV: beacon from a phone (bookmark this URL on the device)
// Example: GET /api/presence/beacon?name=Eskil&key=YOURSECRET
app.get("/api/presence/beacon", (req, res) => {
  const name = String(req.query.name || "").trim();
  const key = String(req.query.key || "");
  if (!name) return res.status(400).json({ error: "Missing name" });
  if (!BEACON_SECRET || key !== BEACON_SECRET) return res.status(403).json({ error: "Forbidden" });

  lastSeen.set(name, Date.now());
  res.json({ ok: true, name, ttlSec: PRESENCE_TTL_SEC, at: new Date().toISOString() });
});

// server.ts (above SPA fallback)
const __dirname2 = path.dirname(fileURLToPath(import.meta.url));
const OVERLAYS_FILE = process.env.OVERLAYS_FILE
  ? path.resolve(process.cwd(), process.env.OVERLAYS_FILE)
  : path.join(__dirname2, "overlays.json");

app.get("/api/overlays", (_req, res) => {
  try {
    const raw = fs.existsSync(OVERLAYS_FILE) ? fs.readFileSync(OVERLAYS_FILE, "utf8") : '{"overlays":[]}';
    const j = JSON.parse(raw);
    res.setHeader("Cache-Control", "no-store");
    res.json({ overlays: Array.isArray(j.overlays) ? j.overlays : [] });
  } catch (e: any) {
    res.status(500).json({ overlays: [], error: e?.message || "overlay parse error" });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy listening on http://localhost:${PORT}`);
});

// ---- place this AT THE VERY BOTTOM, after every /api route ----
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "frontend", "dist");

// serve built assets
app.use(express.static(distDir));

// SPA fallback for non-API routes ONLY (exclude /api/*)
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});