import { useEffect, useMemo, useState } from "react";

// --- IMPORT YOUR PNGs HERE ---
import eskilPng from "../assets/avatars/eskil.png?url";
import sindrePng from "../assets/avatars/sindre.png?url";
import hallgrimPng from "../assets/avatars/hallgrim.png?url";
import kristianPng from "../assets/avatars/kristian.png?url";
import niklasPng from "../assets/avatars/niklas.png?url";
import mariusPng from "../assets/avatars/marius.png?url";
// Optional fallback silhouette
import fallbackPng from "../assets/avatars/fallback.png?url";

// Map KNOWN_DEVICES "name" -> image
const AVATARS: Record<string, string> = {
  Eskil: eskilPng,
  Sindre: sindrePng,
  Hallgrim: hallgrimPng,
  Kristian: kristianPng,
  Niklas: niklasPng,
  Marius: mariusPng,
};

type Props = {
  zIndex?: number;     // default 1800 (below ArrivalOverlay 9999, above views)
  gapPx?: number;      // default 12
  minSizePx?: number;  // default 90
  maxSizePx?: number;  // default 220
};

export default function PresenceDock({
  zIndex = 1800,
  gapPx = 12,
  minSizePx = 90,
  maxSizePx = 220,
}: Props) {
  const [present, setPresent] = useState<string[]>([]);
  const [size, setSize] = useState<number>(minSizePx);

  // poll presence
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const r = await fetch("/api/presence", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        const list = Array.isArray(j.present) ? (j.present as string[]) : [];
        // Keep a stable, friendly order (your household order)
        const ORDER = ["Hallgrim", "Eskil", "Sindre", "Kristian", "Niklas", "Marius"];
        list.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
        setPresent(list);
      } catch {
        /* ignore */
      }
    };

    load();
    const id = setInterval(load, 10_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // compute avatar size so n avatars use full width (with gap)
  const recomputeSize = () => {
    const n = Math.max(1, present.length);
    const pad = 16; // left+right padding of the dock
    const w = Math.max(360, window.innerWidth); // guard tiny widths
    const available = w - pad * 2 - gapPx * (n - 1);
    const s = Math.floor(available / n);
    setSize(Math.max(minSizePx, Math.min(maxSizePx, s)));
  };

  useEffect(() => {
    recomputeSize();
    const onResize = () => recomputeSize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [present.length, gapPx, minSizePx, maxSizePx]);

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex,
    pointerEvents: "none", // overlay-only, not interactive
    display: present.length ? "block" : "none",
  };

  const railStyle: React.CSSProperties = {
    width: "100vw",
    padding: "0 16px",
    boxSizing: "border-box",
    // Subtle gradient so they feel like they’re “popping up”
    background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.35) 100%)",
    // Give it a little top fade only when someone is present
    backdropFilter: "blur(2px)",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: gapPx,
    paddingBottom: 0,
    paddingTop: 6,
    minHeight: size + 6, // "sticks up" from the very bottom
  };

  const avatarStyle: React.CSSProperties = {
    width: size,
    height: size,                  // if your PNGs are square heads; if full-body, remove height
    objectFit: "contain" as const,
    imageRendering: "auto" as const,
    filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.35))",
    transform: "translateY(6px)",  // sit slightly below baseline so they feel grounded
    willChange: "transform, opacity",
    animation: "dockPop 420ms cubic-bezier(.2,.8,.2,1)",
    // rounded only if your PNGs aren’t already masked
    borderRadius: 12,
    pointerEvents: "none",
    userSelect: "none" as const,
  };

  const avatars = useMemo(
    () =>
      present.map((name) => ({
        name,
        src: AVATARS[name] || fallbackPng,
      })),
    [present]
  );

  return (
    <div style={containerStyle} aria-hidden>
      <style>{`
@keyframes dockPop {
  0% { opacity: 0; transform: translateY(20px) scale(0.95) }
  60% { opacity: 1; transform: translateY(2px) scale(1.04) }
  100% { opacity: 1; transform: translateY(6px) scale(1) }
}
      `}</style>

      <div style={railStyle}>
        <div style={rowStyle}>
          {avatars.map((a) => (
            <img
              key={a.name}
              src={a.src}
              alt={a.name}
              title={a.name}
              style={avatarStyle}
              loading="eager"
              decoding="async"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
