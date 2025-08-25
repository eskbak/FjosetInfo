// components/overlays/Snowfall.tsx
import { useMemo } from "react";
import type { OverlayRuntimeProps } from "./types";

/**
 * Props you can pass via overlays.json in "props":
 * - count?: number                   // default 80
 * - sizeRangePx?: [number, number]   // default [2, 6]
 * - speedRangeS?: [number, number]   // fall duration, default [8, 18]
 * - swayRangePx?: [number, number]   // horizontal amplitude, default [20, 80]
 * - swaySpeedRangeS?: [number, number] // sway period, default [3, 7]
 * - twirl?: boolean                  // default true
 * - twirlSpeedRangeS?: [number, number] // default [3, 8]
 * - opacity?: number                 // default 0.95
 * - useEmoji?: boolean               // default false (use drawn dot)
 * - emoji?: string                   // default "❄️" if useEmoji is true
 * - color?: string                   // default "#ffffff" (for drawn dots)
 * - blurPx?: number                  // default 0 (soften flakes if > 0)
 */
export default function Snowfall({ zIndex, data }: OverlayRuntimeProps) {
  const count = clampInt(data?.count, 1, 500, 80);
  const [sMin, sMax] = ensurePair(data?.sizeRangePx, [2, 6]);
  const [fallMin, fallMax] = ensurePair(data?.speedRangeS, [8, 18]);
  const [ampMin, ampMax] = ensurePair(data?.swayRangePx, [20, 80]);
  const [swayMin, swayMax] = ensurePair(data?.swaySpeedRangeS, [3, 7]);
  const twirl = data?.twirl ?? true;
  const [twMin, twMax] = ensurePair(data?.twirlSpeedRangeS, [3, 8]);
  const opacity = clampNum(data?.opacity, 0, 1, 0.95);
  const useEmoji = !!data?.useEmoji;
  const emoji = typeof data?.emoji === "string" ? data.emoji : "🍺";
  const color = typeof data?.color === "string" ? data.color : "#ffffff";
  const blurPx = clampInt(data?.blurPx, 0, 12, 0);

  // Generate flake parameters once (or when `count` changes)
  const flakes = useMemo(
    () =>
      new Array(count).fill(0).map((_, i) => {
        const left = Math.random() * 100;                  // %
        const startTop = -10 - Math.random() * 20;         // vh (start above)
        const size = sMin + Math.random() * (sMax - sMin); // px
        const fall = fallMin + Math.random() * (fallMax - fallMin); // s
        const swayAmp = ampMin + Math.random() * (ampMax - ampMin); // px
        const swayDur = swayMin + Math.random() * (swayMax - swayMin); // s
        const delay = Math.random() * fall;                // s
        const twirlDur = twMin + Math.random() * (twMax - twMin); // s
        return {
          id: `${i}-${Math.random().toString(36).slice(2, 7)}`,
          left,
          startTop,
          size,
          fall,
          swayAmp,
          swayDur,
          delay,
          twirlDur,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, sMin, sMax, fallMin, fallMax, ampMin, ampMax, swayMin, swayMax, twMin, twMax]
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
@keyframes fallY {
  0%   { transform: translateY(0vh); }
  100% { transform: translateY(220vh); } /* plenty to leave screen */
}
@keyframes swayX {
  0%   { transform: translateX(var(--dx, 0px)); }
  50%  { transform: translateX(calc(var(--dx, 0px) * -1)); }
  100% { transform: translateX(var(--dx, 0px)); }
}
@keyframes twirl {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
      `}</style>

      {flakes.map((f) => (
        <div
          key={f.id}
          // Outer wrapper: sets initial left/top and handles horizontal sway
          style={
            {
              position: "absolute",
              left: `${f.left}%`,
              top: `${f.startTop}vh`,
              willChange: "transform",
              animation: `swayX ${f.swayDur}s ease-in-out ${f.delay}s infinite`,
              // @ts-ignore CSS var is fine
              "--dx": `${f.swayAmp}px`,
            } as React.CSSProperties
          }
        >
          {/* Fall layer: moves down the screen linearly */}
          <div
            style={{
              willChange: "transform",
              animation: `fallY ${f.fall}s linear ${f.delay}s infinite`,
            }}
          >
            {/* Shape: either emoji or drawn dot */}
            {useEmoji ? (
              <div
                style={{
                  fontSize: `${Math.max(f.size * 3, 12)}px`, // emoji needs to be bigger to look similar
                  lineHeight: 1,
                  opacity,
                  filter: blurPx ? `blur(${blurPx}px)` : undefined,
                  textShadow: "0 2px 6px rgba(0,0,0,0.25)",
                  animation: twirl ? `twirl ${f.twirlDur}s linear ${f.delay}s infinite` : undefined,
                }}
              >
                {emoji}
              </div>
            ) : (
              <div
                style={{
                  width: `${f.size}px`,
                  height: `${f.size}px`,
                  borderRadius: "50%",
                  opacity,
                  filter: [
                    blurPx ? `blur(${blurPx}px)` : "",
                    "drop-shadow(0 2px 4px rgba(0,0,0,0.25))",
                  ]
                    .filter(Boolean)
                    .join(" "),
                  // soft dot via radial gradient
                  background: `radial-gradient(circle at 50% 40%, ${color} 0%, ${hexWithAlpha(
                    color,
                    0.85
                  )} 60%, ${hexWithAlpha(color, 0.0)} 70%)`,
                  animation: twirl ? `twirl ${f.twirlDur}s linear ${f.delay}s infinite` : undefined,
                }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function clampInt(v: any, min: number, max: number, d: number) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
}
function clampNum(v: any, min: number, max: number, d: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
}
function ensurePair<T extends number>(v: any, d: [T, T]): [number, number] {
  if (Array.isArray(v) && v.length === 2 && isFinite(v[0]) && isFinite(v[1])) {
    return [Number(v[0]), Number(v[1])];
  }
  return d;
}
function hexWithAlpha(hex: string, a: number) {
  // Accept #rgb, #rrggbb; fall back to white
  const h = hex.replace("#", "");
  const to255 = (s: string) => parseInt(s, 16);
  let r = 255, g = 255, b = 255;
  if (h.length === 3) {
    r = to255(h[0] + h[0]);
    g = to255(h[1] + h[1]);
    b = to255(h[2] + h[2]);
  } else if (h.length === 6) {
    r = to255(h.slice(0, 2));
    g = to255(h.slice(2, 4));
    b = to255(h.slice(4, 6));
  }
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}
