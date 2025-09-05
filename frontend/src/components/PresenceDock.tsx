// frontend/src/components/PresenceDock.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import fallbackPng from "../assets/avatars/fallback.png?url";

type Props = {
  zIndex?: number;     // default 1800 (below ArrivalOverlay)
  gapPx?: number;      // default -10 (overlap slightly)
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

  // Light cache-buster that changes every 30s so new uploads are picked up
  const [bustTick, setBustTick] = useState<number>(() => Math.floor(Date.now() / 30000));
  useEffect(() => {
    const id = window.setInterval(() => {
      setBustTick(Math.floor(Date.now() / 30000));
    }, 10_000); // check every 10s; tick value only changes every 30s
    return () => clearInterval(id);
  }, []);

  // poll presence list every 10s
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const r = await fetch("/api/presence", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        const list = Array.isArray(j.present) ? (j.present as string[]) : [];

        // Keep positions stable with a fixed order if desired
        const ORDER = ["Hallgrim", "Eskil", "Sindre", "Skurken", "Niklas", "Marius", "Mina"];
        list.sort((a, b) => {
          const ia = ORDER.indexOf(a);
          const ib = ORDER.indexOf(b);
          return (ia === -1 ? 9999 : ia) - (ib === -1 ? 9999 : ib);
        });

        setPresent(list);
      } catch {
        /* ignore */
      }
    };

    load();
    const id = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // compute avatar size so n avatars use (almost) full width
  const recomputeSize = () => {
    const n = Math.max(1, present.length);
    const pad = 0; // no rail padding
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
    pointerEvents: "none",
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
    filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.35))",
    willChange: "filter",
  };

  const avatars = useMemo(
    () =>
      present.map((name) => {
        const slug = slugFromName(name);
        const runtimeUrl = `/avatars/${slug}.png?v=${bustTick}`;
        return { name, runtimeUrl };
      }),
    [present, bustTick]
  );

  return (
    <div style={containerStyle} aria-hidden>
      <div style={rowStyle}>
        {avatars.map((a) => (
          <AvatarImg
            key={a.name}
            name={a.name}
            runtimeUrl={a.runtimeUrl}
            fallbackUrl={fallbackPng}
            style={avatarStyle}
          />
        ))}
      </div>
    </div>
  );
}

/** Small image component that falls back to bundled fallback.png on error */
function AvatarImg({
  name,
  runtimeUrl,
  fallbackUrl,
  style,
}: {
  name: string;
  runtimeUrl: string;
  fallbackUrl: string;
  style: React.CSSProperties;
}) {
  const [src, setSrc] = useState(runtimeUrl);
  const triedFallback = useRef(false);

  useEffect(() => {
    // when url (and its ?v= cache-buster) changes, try runtime first again
    triedFallback.current = false;
    setSrc(runtimeUrl);
  }, [runtimeUrl]);

  return (
    <img
      src={src}
      alt={name}
      title={name}
      loading="eager"
      decoding="async"
      style={style}
      onError={() => {
        // try fallback once
        if (!triedFallback.current) {
          triedFallback.current = true;
          setSrc(fallbackUrl);
        }
      }}
    />
  );
}

function slugFromName(name: string) {
  return (name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .trim();
}
