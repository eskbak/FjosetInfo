// components/PresenceDock.tsx
import { useEffect, useMemo, useState } from "react";

// --- IMPORT YOUR PNGs HERE ---
import eskilPng from "../assets/avatars/eskil.png?url";
import sindrePng from "../assets/avatars/sindre.png?url";
// import hallgrimPng from "../assets/avatars/hallgrim.png?url";
import kristianPng from "../assets/avatars/kristian.png?url";
// import niklasPng from "../assets/avatars/niklas.png?url";
// import mariusPng from "../assets/avatars/marius.png?url";
import fallbackPng from "../assets/avatars/fallback.png?url";

// Map KNOWN_DEVICES "name" -> image
const AVATARS: Record<string, string> = {
  Eskil: eskilPng,
  Sindre: sindrePng,
  Hallgrim: eskilPng,
  Kristian: kristianPng,
  Niklas: eskilPng,
  Marius: eskilPng,
};

type Props = {
  zIndex?: number;     // default 1800 (below ArrivalOverlay)
  gapPx?: number;      // default 12
  minSizePx?: number;  // default 150
  maxSizePx?: number;  // default 220
};

export default function PresenceDock({
  zIndex = 1800,
  gapPx = -10,
  minSizePx = 150,
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
        // Household order keeps positions stable
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

  // compute avatar size so n avatars use (almost) full width
  const recomputeSize = () => {
    const n = Math.max(1, present.length);
    const pad = 0; // no rail padding anymore
    const w = Math.max(360, window.innerWidth);
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
    pointerEvents: "none", // not interactive
    display: present.length ? "block" : "none",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: gapPx,
    padding: 0,
    minHeight: size, // sticks up exactly by the image height
  };

const avatarStyle: React.CSSProperties = {
  width: size,
  height: "auto",
  objectFit: "contain" as const,
  imageRendering: "auto" as const,
  transform: "translateY(2px)",
  border: "none",
  borderRadius: 0,
  pointerEvents: "none",
  userSelect: "none" as const,
  filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.35))", // ← subtle soft shadow
  willChange: "filter", // tiny hint; safe to remove if you want
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
  );
}
