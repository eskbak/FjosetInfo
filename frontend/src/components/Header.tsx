import { useEffect, useMemo, useState } from "react";
import Clock from "./Clock";
import kua from "../assets/kua.png";

export default function Header({ todayText }: { todayText: string }) {
  // Pixel drift state (kept tiny to be imperceptible but prevents burn-in)
  const [drift, setDrift] = useState({ x: 0, y: 0 });
  const [rightDrift, setRightDrift] = useState({ x: 0, y: 0 });
  const [logoHue, setLogoHue] = useState(0);     // 0..360 deg (very slow)
  const [textOpacity, setTextOpacity] = useState(0.75); // 0.7..0.85 oscillation

  // Respect reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    // Update every 60 seconds: pick new small targets and let CSS transition do the glide.
    const tick = () => {
      // Whole header drift
      setDrift({
        x: rndInt(-4, 4),     // px
        y: rndInt(-3, 3),
      });
      // Right title drift (independent so sub-areas aren’t locked)
      setRightDrift({
        x: rndInt(-2, 2),
        y: rndInt(-2, 2),
      });
      // Very slow hue drift on logo (kept tiny)
      setLogoHue((h) => (h + rndInt(2, 5)) % 360);
      // Nudge opacity within a narrow band
      setTextOpacity(clamp(0.70 + Math.random() * 0.15, 0.70, 0.85));
    };

    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [prefersReducedMotion]);

  return (
    <header
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "0.6em 1.2em",
        paddingBottom: 30,
        gap: 12,
        // glide to new drift with a smooth transition
        transform: `translate(${drift.x}px, ${drift.y}px)`,
        transition: "transform 900ms ease",
        willChange: "transform",
      }}
    >
      <div style={{ justifySelf: "start" }}>
        <Clock />
      </div>

      <div style={{ justifySelf: "center", lineHeight: 0 }}>
        <img
          src={kua}
          alt="Kua"
          style={{
            height: "10em",
            display: "block",
            // imperceptible hue/brightness drift to exercise pixels
            filter: prefersReducedMotion ? undefined : `hue-rotate(${logoHue * 0.05}deg) brightness(0.98)`,
            transition: "filter 1200ms linear",
            willChange: "filter",
          }}
        />
      </div>

      <h2
        style={{
          justifySelf: "end",
          fontSize: "5.5em",
          fontWeight: 400,
          margin: 0,
          whiteSpace: "nowrap",
          textAlign: "right",
          opacity: textOpacity,
          transform: `translate(${rightDrift.x}px, ${rightDrift.y}px)`,
          transition: "transform 900ms ease, opacity 900ms ease",
          willChange: "transform, opacity",
        }}
      >
        {todayText}
      </h2>
    </header>
  );
}

function rndInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}
