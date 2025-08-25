// components/overlays/EmojiFloaters.tsx
import { useMemo } from "react";
import type { OverlayRuntimeProps } from "./types";

export default function EmojiFloaters({ zIndex, data }: OverlayRuntimeProps) {
  const emojis: string[] = data?.emojis ?? ["✨", "⭐", "🎈"];
  const count            = data?.count ?? 32;
  const [vmin, vmax]     = data?.speedRangeS ?? [6, 10];
  const [smin, smax]     = data?.sizeRangePx ?? [18, 34];
  const opacity          = data?.opacity ?? 0.9;

  const items = useMemo(
    () =>
      new Array(count).fill(0).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: smin + Math.random() * (smax - smin),
        dur:  vmin + Math.random() * (vmax - vmin),
        delay: Math.random() * 2,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        drift: (Math.random() - 0.5) * 40,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, smin, smax, vmin, vmax, emojis.join("|")]
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <style>{`
@keyframes floatDrift {
  0%   { transform: translate3d(var(--dx, 0px),  0, 0) }
  50%  { transform: translate3d(calc(var(--dx, 0px) * -1), -12px, 0) }
  100% { transform: translate3d(var(--dx, 0px),  0, 0) }
}
      `}</style>
      {items.map((it) => (
        <div
          key={it.id}
          style={{
            position: "absolute",
            left: `${it.left}%`,
            top: `${it.top}%`,
            fontSize: `${it.size}px`,
            opacity,
            animation: `floatDrift ${it.dur}s ease-in-out ${it.delay}s infinite`,
            // @ts-ignore CSS var
            "--dx": `${it.drift}px`,
            textShadow: "0 2px 6px rgba(0,0,0,0.35)",
          } as React.CSSProperties}
        >
          {it.emoji}
        </div>
      ))}
    </div>
  );
}
