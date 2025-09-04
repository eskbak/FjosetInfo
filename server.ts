// server.ts
import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import fs from "fs";
import { exec, execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { mkdtemp, writeFile } from "fs/promises";
import os from "os";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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
            precipitation_amount?: number;   // mm (single value)
          };
        };
      };
    }>;
  };
};

type GoogleEventItem = {
  id: string;
  summary?: string;
  location?: string;
  description?: string;
  htmlLink?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end:   { date?: string; dateTime?: string; timeZone?: string };
};

type NotificationColor = "fire" | "ocean" | "nature";

type NotificationItem = {
  id: string;
  text: string;
  color?: NotificationColor; // now preset keys
  dates?: string[];
  start?: string;            // "HH:MM" optional
  end?: string;              // "HH:MM" optional
};

type KnownDevice = { name: string; macs?: string[]; ips?: string[] };
type NeighborRow = { ip: string; mac: string; state: string };

// ---------------------------------------------------------------------------
// Paths / constants
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT || 8787);
const ET_CLIENT_NAME = process.env.ET_CLIENT_NAME || "pi-infoscreen/0.1 (example@example.com)";
const MET_USER_AGENT = process.env.MET_USER_AGENT || "pi-infoscreen/0.1 (example@example.com)";
const NRK_RSS_URL = process.env.NRK_RSS_URL || "https://www.nrk.no/nyheter/siste.rss";

const PRESENCE_MODE = process.env.PRESENCE_MODE || "auto"; // "arp" | "beacon" | "auto"
const PRESENCE_TTL_SEC = Number(process.env.PRESENCE_TTL_SEC || 20); // beacon TTL (seconds)
const BEACON_SECRET = process.env.PRESENCE_BEACON_SECRET || "";      // required for beacon writes
const PRESENCE_SCAN_INTERVAL_SEC = Number(process.env.PRESENCE_SCAN_INTERVAL_SEC || 10);

// ARP presence: which neighbor states count as "alive"
const ARP_ACTIVE_STATES = new Set(
  (process.env.ARP_ACTIVE_STATES || "REACHABLE,DELAY,PROBE")
    .split(",")
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)
);

// ARP presence: how long after last "alive" sighting we keep someone present
const ARP_PRESENT_TTL_SEC = Number(
  process.env.ARP_PRESENT_TTL_SEC || Math.max(20, PRESENCE_SCAN_INTERVAL_SEC * 2)
);

const OVERLAYS_FILE = process.env.OVERLAYS_FILE
  ? path.resolve(process.cwd(), process.env.OVERLAYS_FILE)
  : path.join(__dirname, "overlays.json");

const SETTINGS_FILE = process.env.SETTINGS_FILE
  ? path.resolve(process.cwd(), process.env.SETTINGS_FILE)
  : path.join(__dirname, "settings.json");

const DEFAULT_SETTINGS = {
  viewsEnabled: { dashboard: true, news: true, calendar: true },
  dayHours: { start: 6, end: 18 }, // local hours where UI is considered "day"
  calendarDaysAhead: 4,
  rotateSeconds: 45,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readJsonSafe<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, "utf8");
    const j = JSON.parse(raw);
    return (j as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(file: string, data: any) {
  const tmp = `${file}.tmp-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

function clampInt(v: any, min: number, max: number, d: number) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
}

// Normalize MAC & devices from env
function normMac(s?: string) {
  return (s || "").trim().toLowerCase().replace(/-/g, ":");
}
function normDevice(d: { name: string; macs?: string[]; ips?: string[] }): KnownDevice {
  return {
    name: String(d.name || "").trim(),
    macs: Array.isArray(d.macs) ? d.macs.map(normMac).filter(Boolean) : [],
    ips: Array.isArray(d.ips) ? d.ips.map((ip) => String(ip || "").trim()).filter(Boolean) : [],
  };
}

// Parse KNOWN_DEVICES from .env as proper JSON
const KNOWN_DEVICES: KnownDevice[] = (() => {
  try {
    const raw = process.env.KNOWN_DEVICES || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(normDevice) : [];
  } catch {
    return [];
  }
})();

// ---------------------------------------------------------------------------
// Entur departures (no line filter)
// ---------------------------------------------------------------------------
app.get("/api/entur/departures", async (req: Request, res: Response) => {
  try {
    const stopPlaceId = String(req.query.stopPlaceId || "");
    const max = Number(req.query.max || 12);
    if (!stopPlaceId) {
      return res.status(400).json({ error: "Missing stopPlaceId" });
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

    const r = await fetch("https://api.entur.io/journey-planner/v3/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ET-Client-Name": ET_CLIENT_NAME,
      },
      body: JSON.stringify({ query, variables: { id: stopPlaceId, max } }),
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).send(text);
    }

    const data = (await r.json()) as EnturGraphQL;
    const calls = (data.data?.stopPlace?.estimatedCalls ?? [])
      .slice()
      .sort((a, b) => {
        const ta = Date.parse(a.expectedDepartureTime ?? a.aimedDepartureTime ?? "");
        const tb = Date.parse(b.expectedDepartureTime ?? b.aimedDepartureTime ?? "");
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
    // Return mock data when API fails
    console.log("Entur API failed, returning mock data:", e?.message);
    const max = Number(req.query.max || 12);
    const mockDepartures = Array.from({ length: Math.min(max, 8) }, (_, i) => {
      const baseTime = new Date();
      baseTime.setMinutes(baseTime.getMinutes() + 6 + i * 6); // Start 6 minutes from now, then every 6 minutes
      return {
        destination: i % 4 === 0 ? "Trondheim sentrum" : i % 4 === 1 ? "Dragvoll" : i % 4 === 2 ? "Gløshaugen" : "Lade",
        line: `${i + 1}`,
        transportMode: "bus",
        realtime: i % 3 !== 0,
        aimed: baseTime.toISOString(),
        expected: baseTime.toISOString(),
      };
    });
    
    return res.json({
      stopPlace: { id: "NSR:StopPlace:42404", name: "Test Stop" },
      departures: mockDepartures,
    });
  }
});

// ---------------------------------------------------------------------------
// YR / MET Norway today + hours (compact)
// ---------------------------------------------------------------------------
app.get("/api/yr/today", async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat || process.env.DEFAULT_LAT || 63.4305);
    const lon = Number(req.query.lon || process.env.DEFAULT_LON || 10.3951);
    const hoursWanted = Math.min(Math.max(Number(req.query.hours || 5), 1), 12); // 1..12

    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
    const r = await fetch(url, { headers: { "User-Agent": MET_USER_AGENT } });
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).send(text);
    }

    const payload = (await r.json()) as YRCompact;
    const timeseries = payload.properties?.timeseries ?? [];
    const now = new Date();

    const todayISO = now.toISOString().slice(0, 10);
    const todayPoints = timeseries.filter((t) => (t.time ?? "").slice(0, 10) === todayISO);

    let minT = Infinity;
    let maxT = -Infinity;
    let symbol = "";

    for (const tp of todayPoints) {
      const temp = tp.data?.instant?.details?.air_temperature;
      if (typeof temp === "number") {
        minT = Math.min(minT, temp);
        maxT = Math.max(maxT, temp);
      }
      const s = tp.data?.next_1_hours?.summary?.symbol_code;
      if (s) symbol = s;
    }

    const nextHours: Array<{
      time: string;
      symbol: string | null;
      temp: number | null;
      precipMm: number | null;
      wind: number | null;
      dir: number | null;
      iso: string;
    }> = [];

    for (const tp of timeseries) {
      const t = new Date(tp.time ?? 0);
      if (isNaN(t.getTime()) || t < now) continue;
      const inst = tp.data?.instant?.details;
      const next = tp.data?.next_1_hours;
      if (!inst || !next) continue;

      const amt =
        typeof next.details?.precipitation_amount === "number"
          ? Number(next.details.precipitation_amount.toFixed(1))
          : null;

      let precipMm: number | null = null;
      if (amt !== null) precipMm = amt;

      nextHours.push({
        time: String(t.getHours()).padStart(2, "0"),
        symbol: next.summary?.symbol_code ?? null,
        temp: typeof inst.air_temperature === "number" ? Math.round(inst.air_temperature) : null,
        precipMm,
        wind: typeof inst.wind_speed === "number" ? Math.round(inst.wind_speed) : null,
        dir: typeof inst.wind_from_direction === "number" ? Math.round(inst.wind_from_direction) : null,
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
    // Return mock data when API fails
    console.log("YR API failed, returning mock data:", e?.message);
    const hoursWanted = Math.min(Math.max(Number(req.query.hours || 5), 1), 12);
    const mockHours = Array.from({ length: hoursWanted }, (_, i) => ({
      time: String((new Date().getHours() + i) % 24).padStart(2, "0"), // Start from current hour
      symbol: i % 3 === 0 ? "clearsky_day" : i % 3 === 1 ? "partlycloudy_day" : "rain",
      temp: Math.round(15 + Math.random() * 10),
      precipMm: i % 4 === 0 ? Math.round(Math.random() * 5 * 10) / 10 : 0,
      wind: Math.round(3 + Math.random() * 8),
      gust: Math.round(5 + Math.random() * 12),
      dir: Math.round(Math.random() * 360),
      iso: new Date(Date.now() + i * 3600000).toISOString(),
    }));
    
    return res.json({
      lat: 63.4305,
      lon: 10.3951,
      today: new Date().toISOString().slice(0, 10),
      tempMin: 12,
      tempMax: 22,
      symbol: "partlycloudy_day",
      hours: mockHours,
    });
  }
});

// ---------------------------------------------------------------------------
// NRK RSS → JSON
// ---------------------------------------------------------------------------
app.get("/api/nrk/latest", async (req: Request, res: Response) => {
  try {
    const feedUrl = String(req.query.url || NRK_RSS_URL);
    const r = await fetch(feedUrl, {
      headers: { Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8" },
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

    const stripCdata = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    const getTag = (block: string, tag: string) => {
      const mm = block.match(new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return stripCdata(mm?.[1] ?? "");
    };
    const getAttr = (block: string, tag: string, attr: string) => {
      const mm = block.match(new RegExp(`<${tag}[^>]*\\b${attr}="([^"]+)"[^>]*>`, "i"));
      return mm?.[1] ?? "";
    };
    const firstImgInHtml = (html: string) => {
      const mm = html.match(/<img[^>]*src="([^"]+)"/i);
      return mm?.[1] ?? "";
    };

    while ((m = itemRegex.exec(xml))) {
      const block = m[1];
      const title = getTag(block, "title");
      const link = getTag(block, "link");
      const pubDate = getTag(block, "pubDate");
      const description = getTag(block, "description");
      const mediaUrl =
        getAttr(block, "media:content", "url") ||
        getAttr(block, "enclosure", "url") ||
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
    return res.status(500).json({ error: e?.message || "NRK error" });
  }
});

// ---------------------------------------------------------------------------
// Google Calendar helpers + endpoint
// ---------------------------------------------------------------------------
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
    const defaultEnd = new Date(
      defaultStart.getFullYear(),
      defaultStart.getMonth(),
      defaultStart.getDate() + 4,
      23, 59, 59, 999
    );

    const timeMin = (
      typeof req.query.timeMin === "string" ? new Date(req.query.timeMin) : defaultStart
    ).toISOString();
    const timeMax = (
      typeof req.query.timeMax === "string" ? new Date(req.query.timeMax) : defaultEnd
    ).toISOString();

    const items = await fetchAllEvents(accessToken, calId, {
      singleEvents: "true",
      orderBy: "startTime",
      timeMin,
      timeMax,
    });

    res.setHeader("Cache-Control", "public, max-age=30");
    res.json({
      items: items.map((it) => ({
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

// ---------------------------------------------------------------------------
// Presence (ARP / Beacon)
// ---------------------------------------------------------------------------

// Prefer iproute2 JSON with proper neighbor states. Fallback to /proc/net/arp.
function readNeighbors(): NeighborRow[] {
  try {
    const out = execSync("ip -j neigh", { timeout: 1500 }).toString();
    const arr = JSON.parse(out) as Array<any>;
    return arr
      .map(e => ({
        ip: String(e.dst || ""),
        mac: String(e.lladdr || "").toLowerCase(),
        state: String(e.state || "").toUpperCase(),
      }))
      .filter(n => n.ip && n.mac && n.mac !== "00:00:00:00:00:00");
  } catch {
    // Fallback: /proc/net/arp (no state → approximate)
    try {
      const txt = fs.readFileSync("/proc/net/arp", "utf8");
      const lines = txt.trim().split("\n").slice(1);
      return lines
        .map(l => l.trim().split(/\s+/))
        .map(([ip, _hwtype, flags, mac]) => ({
          ip,
          mac: (mac || "").toLowerCase(),
          // crude guess: flag 0x2 indicates complete; treat as STALE so it won't keep presence alive by itself
          state: Number(flags) === 0x2 ? "STALE" : "INCOMPLETE",
        }))
        .filter(n => n.mac && n.mac !== "00:00:00:00:00:00");
    } catch {
      return [];
    }
  }
}

// Optional "nudge" to keep ARP fresh by pinging known IPs
function pingOnce(ip: string) {
  if (!ip) return;
  exec(`ping -c 1 -W 1 ${ip} >/dev/null 2>&1`);
}
function warmArpKnownIps() {
  for (const d of KNOWN_DEVICES) for (const ip of d.ips || []) pingOnce(ip);
}

let lastNeighbors: NeighborRow[] = [];
const lastArpAliveAt = new Map<string, number>(); // name -> last time seen in an "active" neighbor state
const lastSeen = new Map<string, number>();       // beacon name -> last ping time

function scanNeighbors() {
  try { warmArpKnownIps(); } catch {}
  setTimeout(() => {
    const now = Date.now();
    lastNeighbors = readNeighbors();

    // Update "alive" timestamps for names matched this scan, but only if neighbor state is active
    for (const dev of KNOWN_DEVICES) {
      const match = lastNeighbors.find(n =>
        (dev.macs || []).some(m => n.mac === m.toLowerCase()) ||
        (dev.ips || []).some(ip => n.ip === ip)
      );
      if (match && ARP_ACTIVE_STATES.has(match.state)) {
        lastArpAliveAt.set(dev.name, now);
      }
    }
  }, 500); // small delay so nudge pings can populate neighbor cache
}

// initial + interval
scanNeighbors();
setInterval(scanNeighbors, PRESENCE_SCAN_INTERVAL_SEC * 1000);

function computePresence() {
  const now = Date.now();
  const seenVia: Record<string, "arp" | "beacon"> = {};
  const present = new Set<string>();

  // ARP presence with TTL on last alive sighting
  if (PRESENCE_MODE === "arp" || PRESENCE_MODE === "auto") {
    for (const dev of KNOWN_DEVICES) {
      const ts = lastArpAliveAt.get(dev.name) || 0;
      if (now - ts <= ARP_PRESENT_TTL_SEC * 1000) {
        present.add(dev.name);
        seenVia[dev.name] = "arp";
      }
    }
  }

  // Beacon presence (time-based)
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

// Who is home
app.get("/api/presence", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(computePresence());
});

// Beacon ping (dev/hotspot)
app.get("/api/presence/beacon", (req, res) => {
  const name = String(req.query.name || "").trim();
  const key = String(req.query.key || "");
  if (!name) return res.status(400).json({ error: "Missing name" });
  if (!BEACON_SECRET || key !== BEACON_SECRET) return res.status(403).json({ error: "Forbidden" });

  lastSeen.set(name, Date.now());
  res.json({ ok: true, name, ttlSec: PRESENCE_TTL_SEC, at: new Date().toISOString() });
});

// Presence debug (richer)
app.get("/api/presence/debug", (_req, res) => {
  const now = Date.now();
  res.json({
    mode: PRESENCE_MODE,
    arpPresentTtlSec: ARP_PRESENT_TTL_SEC,
    activeStates: [...ARP_ACTIVE_STATES],
    knownDevices: KNOWN_DEVICES,
    neighbors: lastNeighbors, // ip, mac, state
    lastAlive: [...lastArpAliveAt.entries()].map(([name, ts]) => ({
      name, lastAliveIso: new Date(ts).toISOString(), ageSec: Math.round((now - ts) / 1000),
    })),
    now: new Date().toISOString(),
  });
});


// --- Azure TTS (minimal + custom phrase) -----------------------------------
import crypto from "crypto";

// ENV
const AZURE_TTS_REGION = process.env.AZURE_TTS_REGION || "";                 // e.g. "westeurope"
const AZURE_TTS_KEY    = process.env.AZURE_TTS_KEY || "";                    // Speech key
const AZURE_TTS_VOICE  = process.env.AZURE_TTS_VOICE || "nb-NO-FinnNeural";
const AZURE_TTS_FORMAT = process.env.AZURE_TTS_FORMAT || "audio-24khz-48kbitrate-mono-mp3";
const AUDIO_PLAYER     = process.env.AUDIO_PLAYER || "mpg123";               // or "mpv", "omxplayer", etc.

// Simple file cache
const TTS_CACHE_DIR = process.env.TTS_CACHE_DIR || path.join(os.tmpdir(), "tts-cache");
fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });

// ---- SSML builder (safe & flexible) ----
function buildSSML(
  text: string,
  voice: string,
  opts?: {
    rate?: string;        // "-6%", "+3%"
    pitch?: string;       // "-1st", "+2st"
    volume?: string;      // "+0dB", "-2dB"
    style?: string;       // "general", "cheerful", ...
    styledegree?: number; // 0.01–2.0
    breakMs?: number;     // extra pause after text
  }
) {
  const safe = text.replace(/[<&>]/g, (m) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[m]!));
  const rate   = opts?.rate   ?? "-6%";
  const pitch  = opts?.pitch  ?? "-1st";
  const volume = opts?.volume ?? "+0dB";

  const prosody =
    `<prosody rate="${rate}" pitch="${pitch}" volume="${volume}">` +
      safe +
      (opts?.breakMs ? `<break time="${Math.max(0, Math.floor(opts.breakMs))}ms"/>` : ``) +
    `</prosody>`;

  let inner = prosody;
  if (opts?.style) {
    const sd = Number.isFinite(opts.styledegree as number) ? ` styledegree="${opts!.styledegree}"` : "";
    inner = `<mstts:express-as style="${opts.style}"${sd}>${prosody}</mstts:express-as>`;
  }

  return `
<speak version="1.0" xml:lang="nb-NO"
       xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="https://www.w3.org/2001/mstts">
  <voice name="${voice}">
    ${inner}
  </voice>
</speak>`.trim();
}

async function issueToken(): Promise<string> {
  if (!AZURE_TTS_REGION || !AZURE_TTS_KEY) throw new Error("Azure TTS not configured");
  const url = `https://${AZURE_TTS_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
  const r = await fetch(url, { method: "POST", headers: { "Ocp-Apim-Subscription-Key": AZURE_TTS_KEY } });
  if (!r.ok) throw new Error(`Token ${r.status}: ${await r.text().catch(() => "")}`);
  return r.text();
}

function buildBasicSSML(text: string, voice: string) {
  const safe = text.replace(/[<&>]/g, (m) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[m]!));
  return `
<speak version="1.0" xml:lang="nb-NO" xmlns="http://www.w3.org/2001/10/synthesis">
  <voice name="${voice}">${safe}</voice>
</speak>`.trim();
}

async function synthesize(text: string, voice = AZURE_TTS_VOICE): Promise<Buffer> {
  if (!AZURE_TTS_REGION || !AZURE_TTS_KEY) throw new Error("Azure TTS not configured");
  const url = `https://${AZURE_TTS_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

  // Formats to try (some regions/voices dislike certain MP3 variants)
  const formats = [
    AZURE_TTS_FORMAT,                      // your env, e.g. "audio-24khz-48kbitrate-mono-mp3"
    "audio-24khz-48kbitrate-mono-mp3",
    "audio-16khz-32kbitrate-mono-mp3",
  ].filter((v, i, a) => !!v && a.indexOf(v) === i);

  // Build bodies up front
  const ssmlRich   = buildSSML(text, voice);        // your prosody-capable builder
  const ssmlBasic  = buildBasicSSML(text, voice);   // plain SSML (no mstts/prosody)
  const plainText  = text;                           // text/plain + Synthesis-VoiceName

  let lastErr: Error | null = null;

  for (const fmt of formats) {
    // Try with key first; on 401, retry with bearer token inside each attempt.
    const attempts: Array<{
      type: string;
      headers: Record<string, string>;
      body: string;
      usePlain?: boolean;
    }> = [
      { type: `ssml-rich/${fmt}`,  headers: { "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": fmt }, body: ssmlRich },
      { type: `ssml-basic/${fmt}`, headers: { "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": fmt }, body: ssmlBasic },
      // Plain text mode (no SSML). Azure accepts this with Synthesis-VoiceName header.
      { type: `plain/${fmt}`,      headers: { "Content-Type": "text/plain", "X-Microsoft-OutputFormat": fmt, "Synthesis-VoiceName": voice }, body: plainText, usePlain: true },
    ];

    for (const step of attempts) {
      try {
        // Try with subscription key
        let r = await fetch(url, {
          method: "POST",
          headers: { ...step.headers, "Ocp-Apim-Subscription-Key": AZURE_TTS_KEY },
          body: step.body,
        });

        // Retry with bearer token if needed
        if (r.status === 401) {
          const token = await issueToken();
          r = await fetch(url, {
            method: "POST",
            headers: { ...step.headers, Authorization: `Bearer ${token}` },
            body: step.body,
          });
        }

        if (r.ok) {
          const ab = await r.arrayBuffer();
          return Buffer.from(ab);
        }

        const txt = await r.text().catch(() => "");
        // Keep trying other shapes on common client errors
        if (r.status === 400 || r.status === 415 || r.status === 422) {
          lastErr = new Error(`Azure TTS ${r.status} on ${step.type}: ${txt}`);
          continue;
        }
        // For other statuses (403/404/5xx), remember and keep trying next attempt/format
        lastErr = new Error(`Azure TTS ${r.status} on ${step.type}: ${txt}`);
      } catch (e: any) {
        lastErr = new Error(`Azure TTS error on ${step.type}: ${e?.message || e}`);
      }
    }
  }

  throw lastErr || new Error("Azure TTS failed");
}


function cacheKey(text: string, voice: string) {
  return crypto.createHash("sha1").update(`${voice}\n${text}`).digest("hex") + ".mp3";
}

async function ensureCachedMp3(text: string, voice: string): Promise<string> {
  const file = path.join(TTS_CACHE_DIR, cacheKey(text, voice));
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) {
    const buf = await synthesize(text, voice);
    fs.writeFileSync(file, buf);
  }
  return file;
}

// 1) Stream MP3 to the client (browser playback)
app.get("/api/tts", async (req, res) => {
  try {
    const text = String(req.query.text || "").trim();
    if (!text) return res.status(400).send("Missing ?text");
    const voice = String(req.query.voice || AZURE_TTS_VOICE);

    const buf = await synthesize(text, voice);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(buf);
  } catch (e: any) {
    res.status(500).send(e?.message || "TTS failed");
  }
});

// 2) Play on the Pi’s speakers (server-side)
app.post("/api/tts/play", async (req, res) => {
  try {
    // You already have app.use(express.json({ limit: "1mb" })) earlier, so no need to add per-route parser.
    const text = String(req.body?.text || req.query.text || "").trim();
    if (!text) return res.status(400).json({ ok: false, error: "Missing text" });
    const voice = String(req.body?.voice || req.query.voice || AZURE_TTS_VOICE);

    const file = await ensureCachedMp3(text, voice); // cache → instant on repeat
    const args = AUDIO_PLAYER === "mpg123" ? ["-q", file] : [file];
    execFile(AUDIO_PLAYER, args, (err) => {
      if (err) console.error("audio player error:", err);
    });

    res.json({ ok: true, file, voice });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "play failed" });
  }
});

// ---------------------------------------------------------------------------
// Birthday API
// ---------------------------------------------------------------------------
app.get("/api/birthdays/today", (_req, res) => {
  try {
    const birthdayListEnv = process.env.BIRTHDAY_LIST || "[]";
    let birthdayList: Array<{ name: string; date: string }> = [];
    
    try {
      birthdayList = JSON.parse(birthdayListEnv);
    } catch (e) {
      console.error("Failed to parse BIRTHDAY_LIST:", e);
      return res.status(500).json({ error: "Invalid birthday list format" });
    }

    if (!Array.isArray(birthdayList)) {
      return res.status(500).json({ error: "Birthday list must be an array" });
    }

    // Get today's date in MM-DD format
    const today = new Date();
    const todayMD = String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");

    // Find birthdays matching today
    const todaysBirthdays = birthdayList
      .filter(birthday => {
        if (!birthday || typeof birthday.name !== "string" || typeof birthday.date !== "string") {
          return false;
        }
        return birthday.date === todayMD;
      })
      .map(birthday => ({ name: birthday.name.trim() }))
      .filter(birthday => birthday.name.length > 0);

    res.setHeader("Cache-Control", "public, max-age=300"); // Cache for 5 minutes
    res.json({
      today: todayMD,
      birthdays: todaysBirthdays,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Birthday service error" });
  }
});

// ---------------------------------------------------------------------------
// Overlays API
// ---------------------------------------------------------------------------
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

app.put("/api/overlays", (req, res) => {
  try {
    const overlays = Array.isArray(req.body?.overlays) ? req.body.overlays : [];
    for (const o of overlays) {
      if (typeof o.id !== "string" || typeof o.type !== "string") {
        return res.status(400).json({ ok: false, error: "Each overlay needs id and type" });
      }
    }
    writeJsonAtomic(OVERLAYS_FILE, { overlays });
    res.json({ ok: true, count: overlays.length });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || "Overlays write failed" });
  }
});

// ---------------------------------------------------------------------------
// Settings API
// ---------------------------------------------------------------------------
app.get("/api/settings", (_req, res) => {
  const s = readJsonSafe(SETTINGS_FILE, DEFAULT_SETTINGS);
  res.setHeader("Cache-Control", "no-store");
  res.json(s);
});

app.put("/api/settings", (req, res) => {
  try {
    const body = req.body || {};
    const v = body.viewsEnabled ?? {};
    const next = {
      viewsEnabled: {
        dashboard: !!v.dashboard,
        news: !!v.news,
        calendar: !!v.calendar,
      },
      dayHours: {
        start: clampInt(body?.dayHours?.start, 0, 23, DEFAULT_SETTINGS.dayHours.start),
        end:   clampInt(body?.dayHours?.end,   1, 24, DEFAULT_SETTINGS.dayHours.end),
      },
      calendarDaysAhead: clampInt(body.calendarDaysAhead, 0, 14, DEFAULT_SETTINGS.calendarDaysAhead),
      rotateSeconds:     clampInt(body.rotateSeconds,     5, 600, DEFAULT_SETTINGS.rotateSeconds),
    };
    writeJsonAtomic(SETTINGS_FILE, next);
    res.json({ ok: true, settings: next });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || "Invalid settings" });
  }
});

// ---------------------------------------------------------------------------
// OAuth helper (mint a refresh_token once)
// ---------------------------------------------------------------------------
const OAUTH_REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI || `http://localhost:${PORT}/oauth2callback`;

app.get("/auth/google/start", (_req, res) => {
  const { GOOGLE_CLIENT_ID } = process.env;
  if (!GOOGLE_CLIENT_ID) return res.status(500).send("Missing GOOGLE_CLIENT_ID");

  const scope = "https://www.googleapis.com/auth/calendar.readonly";
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get("/oauth2callback", async (req, res) => {
  try {
    const code = String(req.query.code || "");
    if (!code) return res.status(400).send("Missing ?code");

    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(500).send("Missing GOOGLE_CLIENT_ID/SECRET");
    }

    const body = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: OAUTH_REDIRECT_URI,
    });

    const tokenResp /*: globalThis.Response */ = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const json = await tokenResp.json();
    console.log("OAuth token response:", json);

    const refresh = json.refresh_token as string | undefined;
    if (!tokenResp.ok) {
      return res
        .status(tokenResp.status)
        .send(`Token exchange failed (${tokenResp.status}): ${JSON.stringify(json)}`);
    }

    if (!refresh) {
      return res
        .status(400)
        .send(
          "No refresh_token returned. Remove this app under https://myaccount.google.com/permissions and try again."
        );
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(`
      <html><body style="font-family: system-ui; padding:24px">
        <h2>✅ Got your refresh token</h2>
        <p>Copy this value into your environment as <code>GOOGLE_REFRESH_TOKEN</code> and restart the server:</p>
        <pre style="white-space: pre-wrap; word-break: break-all; background:#f4f4f4; padding:12px; border-radius:8px">${refresh}</pre>
        <p>Access token (short-lived) was also issued; but you only need the refresh token.</p>
      </body></html>
    `);
  } catch (e: any) {
    res.status(500).send(e?.message || "OAuth callback error");
  }
});

// ---- Paths -----------------------------------------------------------------
const NOTIFICATIONS_FILE = process.env.NOTIFICATIONS_FILE
  ? path.resolve(process.cwd(), process.env.NOTIFICATIONS_FILE)
  : path.join(__dirname, "notifications.json");

// ---- Helpers ---------------------------------------------------------------
// Get today's date as "MM-DD" in Europe/Oslo (default), unless ?tz=... is provided.
function todayMonthDay(tz = "Europe/Oslo") {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    month: "2-digit",
    day: "2-digit",
  });
  // en-GB gives "DD/MM/…" – we only want month/day as numbers
  const parts = fmt.formatToParts(new Date());
  const dd = parts.find(p => p.type === "day")?.value ?? "01";
  const mm = parts.find(p => p.type === "month")?.value ?? "01";
  return `${mm}-${dd}`;
}

// Normalize hex like "FFF" | "FFFFFF" | "#FFF" | "#FFFFFF" to "#RRGGBB"
function normalizeHex(hex?: string): string | null {
  if (!hex) return null;
  let s = hex.trim().replace(/^#/, "").toUpperCase();
  if (s.length === 3) s = s.split("").map(c => c + c).join("");
  if (/^[0-9A-F]{6}$/.test(s)) return `#${s}`;
  return null;
}

function isWithinTimeWindow(start?: string, end?: string): boolean {
  if (!start && !end) return true; // no restriction

  const now = new Date();
  const curMins = now.getHours() * 60 + now.getMinutes();

  const parseMins = (s: string) => {
    const [h, m] = s.split(":").map((x) => parseInt(x, 10));
    return h * 60 + m;
  };

  const startMins = start ? parseMins(start) : 0;
  const endMins = end ? parseMins(end) : 24 * 60;

  return curMins >= startMins && curMins <= endMins;
}

// ---- Endpoint: today's notifications --------------------------------------
app.get("/api/notifications/today", (req: Request, res: Response) => {
  try {
    const tz = typeof req.query.tz === "string" && req.query.tz ? req.query.tz : "Europe/Oslo";
    const today = todayMonthDay(tz);

    if (!fs.existsSync(NOTIFICATIONS_FILE)) {
      return res.json({ today, notifications: [] });
    }

    const raw = fs.readFileSync(NOTIFICATIONS_FILE, "utf8");
    let list: NotificationItem[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed as NotificationItem[];
    } catch {
      return res.status(500).json({ error: "Invalid notifications.json" });
    }

const todays = list
  .filter(n => Array.isArray(n.dates) && n.dates.includes(today))
  .filter(n => isWithinTimeWindow(n.start, n.end)) // keep this if you added time windows
  .map(n => ({
    id: String(n.id ?? ""),
    text: String(n.text ?? "").trim(),
    color: (COLOR_SET.has((n.color as NotificationColor)) ? (n.color as NotificationColor) : "fire"),
  }))
  .filter(n => n.id && n.text);

    res.setHeader("Cache-Control", "public, max-age=30"); // quick refresh OK
    return res.json({ today, notifications: todays });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "notifications error" });
  }
});

// File IO (file is a raw JSON array)
function readNotificationsFile(): NotificationItem[] {
  if (!fs.existsSync(NOTIFICATIONS_FILE)) return [];
  try {
    const raw = fs.readFileSync(NOTIFICATIONS_FILE, "utf8");
    const j = JSON.parse(raw);
    return Array.isArray(j) ? (j as NotificationItem[]) : [];
  } catch {
    return [];
  }
}
function writeNotificationsFile(list: NotificationItem[]) {
  const tmp = `${NOTIFICATIONS_FILE}.tmp-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2), "utf8");
  fs.renameSync(tmp, NOTIFICATIONS_FILE);
}

// Validation
const COLOR_SET = new Set<NotificationColor>(["fire", "ocean", "nature"]);

function validateNotification(
  input: any,
  idFromParam?: string
): { ok: true; value: NotificationItem } | { ok: false; msg: string } {
  const id = String(idFromParam ?? input?.id ?? "").trim() || String(Date.now());
  const text = String(input?.text ?? "").trim();
  if (!text) return { ok: false, msg: "Missing text" };

  // Default to "fire" if missing/invalid
  let color = String(input?.color ?? "fire").trim().toLowerCase() as NotificationColor;
  if (!COLOR_SET.has(color)) color = "fire";

  const RE_MD = /^\d{2}-\d{2}$/;
  const RE_HM = /^\d{2}:\d{2}$/;

  const datesRaw = Array.isArray(input?.dates) ? input.dates : [];
  const dates = datesRaw.map((d: any) => String(d || "").trim()).filter(Boolean);
  if (dates.length === 0 || !dates.every((d: string) => RE_MD.test(d))) {
    return { ok: false, msg: "dates must be array of 'MM-DD'" };
  }

  const start = input?.start ? String(input.start) : undefined;
  const end   = input?.end   ? String(input.end)   : undefined;

  const isValidHM = (s?: string) => {
    if (!s) return true;
    if (!RE_HM.test(s)) return false;
    const [h, m] = s.split(":").map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  };
  if (!isValidHM(start) || !isValidHM(end)) return { ok: false, msg: "start/end must be 'HH:MM'" };

  return { ok: true, value: { id, text, color, dates, start, end } };
}

// ===================== Notifications ADMIN API =============================

// List all (open)
app.get("/api/notifications", (_req, res) => {
  const items = readNotificationsFile();
  res.setHeader("Cache-Control", "no-store");
  res.json({ items });
});

// Create (open)
app.post("/api/notifications", (req, res) => {
  const parsed = validateNotification(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.msg });

  const items = readNotificationsFile();
  if (items.some(n => n.id === parsed.value.id)) {
    return res.status(409).json({ error: "id already exists" });
  }
  items.push(parsed.value);
  writeNotificationsFile(items);
  res.status(201).json({ ok: true, item: parsed.value });
});

// Update by id (open)
app.put("/api/notifications/:id", (req, res) => {
  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ error: "Missing id" });

  const parsed = validateNotification(req.body, id);
  if (!parsed.ok) return res.status(400).json({ error: parsed.msg });

  const items = readNotificationsFile();
  const idx = items.findIndex(n => n.id === id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });

  items[idx] = parsed.value;
  writeNotificationsFile(items);
  res.json({ ok: true, item: parsed.value });
});

// Delete by id (open)
app.delete("/api/notifications/:id", (req, res) => {
  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ error: "Missing id" });

  const items = readNotificationsFile();
  const next = items.filter(n => n.id !== id);
  if (next.length === items.length) return res.status(404).json({ error: "Not found" });

  writeNotificationsFile(next);
  res.json({ ok: true, id });
});

app.post("/api/admin/login", (req, res) => {
  const pw = String(req.body?.password || "");
  if (!process.env.ADMIN_KEY) {
    return res.status(500).json({ ok: false, error: "Server not configured" });
  }
  if (pw === process.env.ADMIN_KEY) {
    return res.json({ ok: true });
  }
  res.status(403).json({ ok: false, error: "Wrong password" });
});


// ---------------------------------------------------------------------------
// Static files & SPA fallback
// ---------------------------------------------------------------------------
const distDir = path.join(__dirname, "frontend", "dist");
app.use(express.static(distDir));

app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Proxy listening on http://localhost:${PORT}`);
});
