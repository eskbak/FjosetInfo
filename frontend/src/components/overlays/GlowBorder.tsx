// components/overlays/GlowBorder.tsx
import type { OverlayRuntimeProps } from "./types";

export default function GlowBorder({ zIndex, data }: OverlayRuntimeProps) {
  const thickness = clampInt(data?.thicknessPx, 2, 60, 12);
  const radius    = clampInt(data?.radiusPx, 0, 80, 24);
  const speedMs   = clampInt(data?.speedMs, 1000, 60000, 6000);
  const opacity   = clampNum(data?.opacity, 0, 1, 1);

  // You can pass one or more colors in overlays.json "props.colors"
  const colors: string[] =
    Array.isArray(data?.colors) && data.colors.length
      ? data.colors
      : ["#ff6b6b", "#ffd93d", "#4d96ff", "#b967ff"];

  // Build a nice gradient for horizontal/vertical runs
  const gradStops = ["transparent 0%", ...colors, "transparent 100%"].join(", ");
  const gradientX = `linear-gradient(90deg, ${gradStops})`;
  const gradientY = `linear-gradient(180deg, ${gradStops})`;

  const borderShadowPx = Math.max(1, Math.round(thickness / 6)); // subtle static inner line

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        pointerEvents: "none",
      }}
    >
      <style>{`
@keyframes slideX {
  0%   { background-position-x: -200%; }
  100% { background-position-x:  200%; }
}
@keyframes slideY {
  0%   { background-position-y: -200%; }
  100% { background-position-y:  200%; }
}
      `}</style>

      {/* Rounded clip so corners look correct */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: radius,
          overflow: "hidden",
        }}
      >
        {/* Static, subtle inner border for contrast */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radius,
            boxShadow: `inset 0 0 0 ${borderShadowPx}px rgba(255,255,255,0.08)`,
          }}
        />

        {/* Top edge */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: thickness,
            backgroundImage: gradientX,
            backgroundSize: "200% 100%",
            backgroundRepeat: "no-repeat",
            animation: `slideX ${speedMs}ms linear infinite`,
            opacity,
            mixBlendMode: "screen",
            filter: "saturate(120%) brightness(1.05)",
          }}
        />

        {/* Bottom edge */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: thickness,
            backgroundImage: gradientX,
            backgroundSize: "200% 100%",
            backgroundRepeat: "no-repeat",
            animation: `slideX ${speedMs}ms linear infinite reverse`,
            opacity,
            mixBlendMode: "screen",
            filter: "saturate(120%) brightness(1.05)",
          }}
        />

        {/* Left edge */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: thickness,
            backgroundImage: gradientY,
            backgroundSize: "100% 200%",
            backgroundRepeat: "no-repeat",
            animation: `slideY ${speedMs}ms linear infinite`,
            opacity,
            mixBlendMode: "screen",
            filter: "saturate(120%) brightness(1.05)",
          }}
        />

        {/* Right edge */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: thickness,
            backgroundImage: gradientY,
            backgroundSize: "100% 200%",
            backgroundRepeat: "no-repeat",
            animation: `slideY ${speedMs}ms linear infinite reverse`,
            opacity,
            mixBlendMode: "screen",
            filter: "saturate(120%) brightness(1.05)",
          }}
        />
      </div>
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
