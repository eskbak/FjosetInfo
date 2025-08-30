// components/ArrivalOverlay.tsx
import { useEffect, useMemo } from "react";

type Props = {
  name: string;
  onClose: () => void;
  durationMs?: number; // default 9000
};

export default function ArrivalOverlay({ name, onClose, durationMs = 9000 }: Props) {
  // adapt confetti count to device “power”
  const devMem = (navigator as any).deviceMemory || 4;       // 1/2/4/8 (not on all browsers)
  const baseCount = devMem >= 6 ? 70 : devMem >= 4 ? 50 : 36;

  // Make a batch of confetti pieces with random positions/emoji
  const confetti = useMemo(() => {
    const EMOJI = ["🎉", "✨", "🎊", "⭐", "🏠", "🎈"]; // trimmed set (lighter)
    const N = baseCount;
    return new Array(N).fill(0).map((_, i) => ({
      id: i,
      left: Math.random() * 100,             // %
      size: 16 + Math.random() * 18,         // px (smaller)
      rot: Math.random() * 360,              // deg
      delay: Math.random() * 0.6,            // s
      duration: 3.2 + Math.random() * 1.8,   // s (shorter)
      emoji: EMOJI[Math.floor(Math.random() * EMOJI.length)],
      drift: (Math.random() - 0.5) * 36,     // px
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCount]);

  useEffect(() => {
    const id = window.setTimeout(onClose, durationMs);
    return () => clearTimeout(id);
  }, [onClose, durationMs]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        // Keep background cheap: no backdrop-filter, no crazy gradients
        background: "rgba(0,0,0,0.25)",
        animation: "overlayFade 400ms ease-out",
        // performance hints
        willChange: "opacity, transform",
        contain: "layout paint style", // isolate
        backfaceVisibility: "hidden" as any,
        transform: "translateZ(0)",
      }}
    >
      <style>{`
@keyframes overlayFade { from { opacity: 0 } to { opacity: 1 } }
@keyframes popIn {
  0% { transform: translateY(16px) scale(0.98); opacity: 0 }
  50% { transform: translateY(0) scale(1.01); opacity: 1 }
  100% { transform: translateY(0) scale(1) }
}
@keyframes confettiFall {
  0%   { transform: translate3d(var(--drift,0px), -110vh, 0) rotate(0deg) }
  100% { transform: translate3d(var(--drift,0px),  110vh, 0) rotate(540deg) }
}
        `}</style>

      {/* Confetti layer */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          willChange: "transform",
          contain: "layout paint",
        }}
      >
        {confetti.map((c) => (
          <div
            key={c.id}
            style={{
              position: "absolute",
              left: `${c.left}%`,
              top: "-10vh",
              fontSize: `${c.size}px`,
              transform: `rotate(${c.rot}deg) translateZ(0)`,
              animation: `confettiFall ${c.duration}s linear ${c.delay}s forwards`,
              // @ts-ignore custom property
              "--drift": `${c.drift}px`,
              // Avoid filter-based shadows; if needed, use cheap textShadow
              textShadow: "0 1px 2px rgba(0,0,0,0.25)",
              willChange: "transform",
              backfaceVisibility: "hidden",
            } as React.CSSProperties}
          >
            {c.emoji}
          </div>
        ))}
      </div>

      {/* Center card (no backdrop-filter) */}
      <div
        style={{
          background: "rgba(20,20,35,0.65)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 20,
          padding: "24px 30px",
          textAlign: "center",
          color: "white",
          maxWidth: 880,
          width: "min(90vw, 880px)",
          animation: "popIn 500ms cubic-bezier(.2,.8,.2,1)",
          // lighter shadow
          boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
          willChange: "transform, opacity",
          transform: "translateZ(0)",
          contain: "layout paint style",
        }}
      >
        <div
          style={{
            fontSize: "clamp(18px, 4vw, 36px)",
            opacity: 0.9,
            marginBottom: 6,
          }}
        >
          🎉 Velkommen hjem! 🎉
        </div>
        <div
          style={{
            fontSize: "clamp(40px, 8vw, 90px)",
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: -0.5,
          }}
        >
          {name} er hjemme
        </div>
      </div>
    </div>
  );
}
