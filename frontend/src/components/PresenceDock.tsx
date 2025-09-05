// frontend/src/components/PresenceDock.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import fallbackPng from "../assets/avatars/fallback.png?url";

type Props = {
  zIndex?: number;
  gapPx?: number;
  minSizePx?: number;
  maxSizePx?: number;
  /** How often we check headers (ETag/Last-Modified) to see if an avatar changed */
  headPingMs?: number; // default 30s
  /** How often we poll the presence list */
  presencePollMs?: number; // default 10s
};

export default function PresenceDock({
  zIndex = 1800,
  gapPx = -10,
  minSizePx = 150,
  maxSizePx = 220,
  headPingMs = 30_000,
  presencePollMs = 10_000,
}: Props) {
  const [present, setPresent] = useState<string[]>([]);
  const [size, setSize] = useState<number>(minSizePx);

  // Poll presence list (names only)
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const r = await fetch("/api/presence", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        const list = Array.isArray(j.present) ? (j.present as string[]) : [];

        // Keep positions stable with a preferred order
        const ORDER = [
          "Hallgrim",
          "Eskil",
          "Sindre",
          "Skurken",
          "Niklas",
          "Marius",
          "Mina",
        ];
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
    const id = window.setInterval(load, presencePollMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [presencePollMs]);

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
        runtimeUrl: `/src/assets/avatars/${slugFromName(name)}.png`,
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
            runtimeUrl={a.runtimeUrl}
            fallbackUrl={fallbackPng}
            headPingMs={headPingMs}
            style={avatarStyle}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Avatar image that:
 * - Downloads the image once as a Blob (cache: 'no-store') to bypass cache.
 * - Then only performs lightweight HEAD checks every `headPingMs` to compare
 *   ETag / Last-Modified. If changed, it re-downloads the Blob.
 * - Also listens for cross-tab "avatar updated" notifications via:
 *   - BroadcastChannel('avatars'): { type: 'updated', slug }
 *   - localStorage key: avatarUpdated:<slug> = timestamp
 */
function AvatarImg({
  name,
  runtimeUrl,
  fallbackUrl,
  headPingMs,
  style,
}: {
  name: string;
  runtimeUrl: string;
  fallbackUrl: string;
  headPingMs: number;
  style: React.CSSProperties;
}) {
  const [src, setSrc] = useState<string>(fallbackUrl);
  const objectUrlRef = useRef<string | null>(null);
  const etagRef = useRef<string | null>(null);
  const lmRef = useRef<string | null>(null);
  const slug = slugFromName(name);

  // Initial load
  useEffect(() => {
    let cancelled = false;

    async function initial() {
      try {
        const r = await fetch(runtimeUrl, { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        etagRef.current = r.headers.get("ETag");
        lmRef.current = r.headers.get("Last-Modified");
        const blob = await r.blob();
        const obj = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(obj);
          return;
        }
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = obj;
        setSrc(obj);
      } catch {
        if (!cancelled) setSrc(fallbackUrl);
      }
    }

    initial();
    return () => {
      cancelled = true;
    };
  }, [runtimeUrl, fallbackUrl]);

  // Periodic lightweight HEAD check
  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        const h = await fetch(runtimeUrl, {
          method: "HEAD",
          cache: "no-store",
        });
        if (!alive) return;
        if (!h.ok) return;
        const etag = h.headers.get("ETag");
        const lm = h.headers.get("Last-Modified");
        const changed =
          (etag && etag !== etagRef.current) ||
          (!etag && lm && lm !== lmRef.current);

        if (changed) {
          // re-fetch blob
          const r = await fetch(runtimeUrl, { cache: "no-store" });
          if (!r.ok) return;
          etagRef.current = r.headers.get("ETag");
          lmRef.current = r.headers.get("Last-Modified");
          const blob = await r.blob();
          const obj = URL.createObjectURL(blob);
          if (!alive) {
            URL.revokeObjectURL(obj);
            return;
          }
          if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = obj;
          setSrc(obj);
        }
      } catch {
        /* ignore */
      }
    };

    const id = window.setInterval(tick, headPingMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [runtimeUrl, headPingMs]);

  // Instant refresh on cross-tab/local notification
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("avatars");
      bc.onmessage = (ev) => {
        const msg = ev?.data;
        if (msg && msg.type === "updated" && msg.slug === slug) {
          // force reload now
          forceReload();
        }
      };
    } catch {
      // BroadcastChannel not available; that's fine
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === `avatarUpdated:${slug}` && e.newValue) {
        forceReload();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener("storage", onStorage);
    };

    async function forceReload() {
      try {
        const r = await fetch(runtimeUrl, { cache: "no-store" });
        if (!r.ok) return;
        etagRef.current = r.headers.get("ETag");
        lmRef.current = r.headers.get("Last-Modified");
        const blob = await r.blob();
        const obj = URL.createObjectURL(blob);
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = obj;
        setSrc(obj);
      } catch {
        // noop
      }
    }
  }, [runtimeUrl, slug]);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  return (
    <img src={src} alt={name} title={name} loading="eager" decoding="async" style={style} />
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
