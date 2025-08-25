// components/GlobalOverlays.tsx
import { useEffect, useMemo, useState } from "react";
import type { OverlayConfig, OverlayRuntimeProps, DailyWindow } from "./overlays/types";
import { loadOverlayComponent } from "./overlays/registry";

// --- NEW: helpers to evaluate daily windows in a timezone ---
function pad2(n: number) { return n.toString().padStart(2, "0"); }

function getTzParts(epochMs: number, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  } as any);
  const parts = fmt.formatToParts(new Date(epochMs));
  const pick = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const y = Number(pick("year"));
  const m = Number(pick("month"));
  const d = Number(pick("day"));
  const hh = Number(pick("hour"));
  const mm = Number(pick("minute"));
  const wdStr = (pick("weekday") || "").slice(0, 3).toLowerCase(); // mon,tue,...
  const wdMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const dow = wdMap[wdStr] ?? new Date(epochMs).getUTCDay();
  return {
    y, m, d, hh, mm, dow,
    dateStr: `${y}-${pad2(m)}-${pad2(d)}`,             // YYYY-MM-DD in tz
    minutes: hh * 60 + mm,                              // minutes since midnight in tz
  };
}

function parseHHMM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s || "");
  if (!m) return null;
  const hh = Number(m[1]), mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

/** Check if "now" is within a daily recurring window (supports overnight). */
function isActiveDaily(d: DailyWindow, nowMs: number): boolean {
  const tz = d.tz || "Europe/Oslo";
  const cur = getTzParts(nowMs, tz);
  const startMin = parseHHMM(d.timeStart);
  const endMin   = parseHHMM(d.timeEnd);
  if (startMin == null || endMin == null) return false;

  // Optional weekday gating (overnight windows need special handling)
  const hasDayFilter = Array.isArray(d.days) && d.days.length > 0;

  // Optional date range gating (local to tz)
  const inDateRangeToday =
    (!d.dateFrom || cur.dateStr >= d.dateFrom) &&
    (!d.dateTo   || cur.dateStr <= d.dateTo);

  if (startMin <= endMin) {
    // Same-day window: e.g., 07:00–09:00
    if (cur.minutes < startMin || cur.minutes >= endMin) return false;
    if (hasDayFilter && !d.days!.includes(cur.dow)) return false;
    return inDateRangeToday;
  }

  // Overnight window: e.g., 22:00–02:00
  // Case A: today's local time >= start -> belongs to TODAY's day filter/date
  if (cur.minutes >= startMin) {
    if (hasDayFilter && !d.days!.includes(cur.dow)) return false;
    return inDateRangeToday;
  }

  // Case B: today's local time < end -> belongs to PREVIOUS day's filter/date
  const prev = getTzParts(nowMs - 24 * 3600 * 1000, tz);
  if (hasDayFilter && !d.days!.includes(prev.dow)) return false;

  const inDateRangePrev =
    (!d.dateFrom || prev.dateStr >= d.dateFrom) &&
    (!d.dateTo   || prev.dateStr <= d.dateTo);

  return inDateRangePrev;
}

// Backward-compatible: absolute schedule or daily window
function isActive(cfg: OverlayConfig, now: number) {
  if (cfg.daily) return isActiveDaily(cfg.daily, now);
  if (cfg.start && cfg.end) {
    const s = Date.parse(cfg.start);
    const e = Date.parse(cfg.end);
    return Number.isFinite(s) && Number.isFinite(e) && s <= now && now < e;
  }
  return false;
}

// --- rest of your file stays the same ---
function DynamicOverlay({ cfg, now }: { cfg: OverlayConfig; now: number }) {
  const [Comp, setComp] = useState<React.ComponentType<OverlayRuntimeProps> | null>(null);

  useEffect(() => {
    let on = true;
    loadOverlayComponent(cfg.type).then((C) => on && setComp(() => C));
    return () => {
      on = false;
      setComp(null);
    };
  }, [cfg.type]);

  if (!Comp) return null;

  const z = cfg.zIndex ?? 2000;
  return (
    <Comp
      id={cfg.id}
      zIndex={z}
      now={now}
      start={new Date(cfg.start ?? Date.now())}
      end={new Date(cfg.end ?? Date.now())}
      data={cfg.props ?? {}}
      capturesClicks={cfg.capturesClicks}
    />
  );
}

export default function GlobalOverlays() {
  const [all, setAll] = useState<OverlayConfig[]>([]);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch("/api/overlays", { cache: "no-store" });
        const j = await r.json();
        if (!stop && Array.isArray(j.overlays)) setAll(j.overlays);
      } catch {}
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const active = useMemo(() => all.filter((o) => isActive(o, now)), [all, now]);
  if (active.length === 0) return null;

  return (
    <>
      {active.map((cfg) => (
        <DynamicOverlay key={cfg.id} cfg={cfg} now={now} />
      ))}
    </>
  );
}
