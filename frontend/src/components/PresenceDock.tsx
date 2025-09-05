// frontend/src/components/PresenceDock.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import fallbackPng from "../assets/avatars/fallback.png?url";

type Props = {
  zIndex?: number;
  gapPx?: number;
  minSizePx?: number;
  maxSizePx?: number;
  refreshMs?: number; // how often to re-fetch avatars (default 10s)
};

export default function PresenceDock({
  zIndex = 1800,
  gapPx = -10,
  minSizePx = 150,
  maxSizePx = 220,
  refreshMs = 10_000,
}: Props) {
  const [present, setPresent] = useState<string[]>([]);
  const [size, setSize] = useState<number>(minSizePx);

  // Re-tick to force avatar refetches even if names don't change
  const [bustTick, setBustTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setBustTick((n) => n + 1), refreshMs);
    return () => clearInterval(id);
  }, [refreshMs]);

  // Poll presence list
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const r = await fetch("/api/presence", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        const list = Array.isArray(j.present) ? (j.present as string[]) : [];

        const ORDER = ["Hallgrim", "Eskil", "Sindre", "Skurken", "Niklas", "Marius", "Mina"];
        list.sort((a, b) => {
          const ia = ORDER.indexOf(a);
          const ib = ORDER.indexOf(b);
          return (ia === -1 ? 9999 : ia) - (ib === -1 ? 9999 : ib);
        });

        setPresent(list);
        setBustTick((n) => n + 1); // force avatar refresh on membership changes
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
    const pad = 0;
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
    minHeight: size,
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
      present.map((name) => ({
        name,
        // IMPORTANT: runtime files are served from /src/assets/avatars/<slug>.png
        url: `/src/assets/avatars/${slugFromName(name)}.png`,
      })),
    [present]
  );

  return (
    <div style={containerStyle} aria-hidden>
      <div style={rowStyle}>
        {avatars.map((a) => (
          <AvatarImg
            key={a.name}
            name={a.name}
            runtimeUrl={a.url}
            fallbackUrl={fallbackPng}
            bustTick={bustTick}
            style={avatarStyle}
          />
        ))}
      </div>
    </div>
  );
}

/** Image that bypasses cache by fetching as a Blob with cache:'no-store' */
function AvatarImg({
  name,
  runtimeUrl,
  fallbackUrl,
  bustTick,
  style,
}: {
  name: string;
  runtimeUrl: string;
  fallbackUrl: string;
  bustTick: number;
  style: React.CSSProperties;
}) {
  const [src, setSrc] = useState<string>(fallbackUrl);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const r = await fetch(runtimeUrl, { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const blob = await r.blob();
        const objUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objUrl);
          return;
        }
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = objUrl;
        setSrc(objUrl);
      } catch {
        if (!cancelled) setSrc(fallbackUrl);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [runtimeUrl, fallbackUrl, bustTick]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  return <img src={src} alt={name} title={name} loading="eager" decoding="async" style={style} />;
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
