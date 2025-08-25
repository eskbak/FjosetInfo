// components/ArrivalOverlay.tsx
import { useEffect, useMemo } from "react";

type Props = {
  name: string;
  onClose: () => void;
  durationMs?: number; // default 6000
};

export default function ArrivalOverlay({ name, onClose, durationMs = 12000 }: Props) {
  // Make a batch of confetti pieces with random positions/emoji
  const confetti = useMemo(() => {
    const EMOJI = ["🎉", "✨", "🎊", "⭐", "🏠", "💥", "🎈", "🍺"];
    const N = 100;
    return new Array(N).fill(0).map((_, i) => ({
      id: i,
      left: Math.random() * 100,                // percent
      size: 18 + Math.random() * 22,            // px
      rot: Math.random() * 360,                 // deg
      delay: Math.random() * 0.8,               // s
      duration: 3.8 + Math.random() * 2.5,      // s
      emoji: EMOJI[Math.floor(Math.random() * EMOJI.length)],
      drift: (Math.random() - 0.5) * 40,        // px
    }));
  }, []);

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
        // animated gradient wash
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(255,255,255,0.35), transparent 60%), linear-gradient(120deg, #2a0845 0%, #6441A5 50%, #2a0845 100%)",
        animation: "overlayFade 600ms ease-out",
      }}
    >
      {/* Local styles + keyframes */}
      <style>{`
@keyframes overlayFade { from { opacity: 0 } to { opacity: 1 } }
@keyframes popIn {
  0% { transform: translateY(20px) scale(0.96); opacity: 0 }
  40% { transform: translateY(0) scale(1.02); opacity: 1 }
  100% { transform: translateY(0) scale(1) }
}
@keyframes glowPulse {
  0%,100% { box-shadow: 0 0 0 rgba(255,255,255,0) }
  50% { box-shadow: 0 0 90px rgba(255,255,255,0.25) }
}
@keyframes confettiFall {
  0%   { transform: translate3d(var(--drift,0px), -110vh, 0) rotate(0deg) }
  100% { transform: translate3d(var(--drift,0px),  110vh, 0) rotate(720deg) }
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
              transform: `rotate(${c.rot}deg)`,
              animation: `confettiFall ${c.duration}s linear ${c.delay}s forwards`,
              // per-piece horizontal drift
              // @ts-ignore CSS var is fine
              "--drift": `${c.drift}px`,
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))",
            } as React.CSSProperties}
          >
            {c.emoji}
          </div>
        ))}
      </div>

      {/* Center card */}
      <div
        style={{
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 24,
          padding: "28px 36px",
          textAlign: "center",
          color: "white",
          maxWidth: 900,
          width: "min(90vw, 900px)",
          animation: "popIn 700ms cubic-bezier(.2,.8,.2,1)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            fontSize: "clamp(20px, 4.5vw, 40px)",
            letterSpacing: 1,
            opacity: 0.9,
            marginBottom: 6,
          }}
        >
          🎉 Velkommen hjem! 🎉
        </div>
        <div
          style={{
            fontSize: "clamp(44px, 9vw, 96px)",
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: -1,
          }}
        >
          {name} er hjemme
        </div>
      </div>
    </div>
  );
}