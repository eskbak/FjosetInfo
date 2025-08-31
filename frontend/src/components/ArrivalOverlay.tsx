// components/ArrivalOverlay.tsx
import { useEffect, useRef, useState } from "react";

type Props = {
  name: string;
  onClose: () => void;
  /** How long the overlay stays fully visible before closing (ms). */
  durationMs?: number;
  /** Ask the server to speak when the overlay opens. */
  speakOnMount?: boolean;
  /**
   * The phrase to speak. You can pass a string or a function that receives the name.
   * Defaults to: "Velkommen hjem, {name}!"
   */
  phrase?: string | ((name: string) => string);
  /** Optional Azure voice override, e.g. "nb-NO-IselinNeural" */
  voice?: string;
};

export default function ArrivalOverlay({
  name,
  onClose,
  durationMs = 9000,
  speakOnMount = true,
  phrase,
  voice,
}: Props) {
  const [closing, setClosing] = useState(false);

  // timers / guards
  const closedRef = useRef(false);
  const mainTimerRef = useRef<number | null>(null);
  const watchdogRef = useRef<number | null>(null);

  const close = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    setClosing(true);
    // allow fade-out
    window.setTimeout(() => {
      try { onClose(); } catch {}
    }, 450);
  };

  // 🔊 Tell the server to speak (no browser audio/autoplay issues)
  useEffect(() => {
    if (!speakOnMount) return;

    const text =
      typeof phrase === "function"
        ? phrase(name)
        : phrase || `${name} er hjemme!`;

    // fire-and-forget; server will queue/play via mpg123 (or your configured player)
    fetch("/api/tts/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // you can also include { voice } when you want to override default server voice
      body: JSON.stringify(voice ? { text, voice } : { text }),
      keepalive: true,
    }).catch(() => {
      // ignore; overlay still shows even if TTS fails
    });
  }, [name, speakOnMount, phrase, voice]);

  // Auto-close + watchdog + Esc to dismiss
  useEffect(() => {
    mainTimerRef.current = window.setTimeout(close, durationMs) as unknown as number;
    watchdogRef.current = window.setTimeout(close, durationMs + 4000) as unknown as number;

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (mainTimerRef.current) window.clearTimeout(mainTimerRef.current);
      if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
    };
  }, [durationMs]);

  return (
    <div
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(255,255,255,0.35), transparent 60%), linear-gradient(120deg, #1e1b4b 0%, #7c3aed 50%, #1e1b4b 100%)",
        animation: closing ? "overlayFadeOut 420ms ease-in forwards" : "overlayFadeIn 420ms ease-out forwards",
      }}
      aria-live="polite"
      aria-label={`${name} er hjemme`}
      role="dialog"
    >
      <style>{`
@keyframes overlayFadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes overlayFadeOut { from { opacity: 1 } to { opacity: 0 } }
@keyframes popIn {
  0% { transform: translateY(20px) scale(0.96); opacity: 0 }
  45% { transform: translateY(0) scale(1.04); opacity: 1 }
  100% { transform: translateY(0) scale(1) }
}
      `}</style>

      <div
        style={{
          background: "rgba(255,255,255,0.10)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 24,
          padding: "28px 36px",
          textAlign: "center",
          color: "white",
          maxWidth: 980,
          width: "min(70vw, 980px)",
          animation: closing ? undefined : "popIn 650ms cubic-bezier(.2,.8,.2,1)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.45)",
          transition: "transform 220ms ease, opacity 220ms ease",
          transform: closing ? "scale(0.98)" : "none",
          opacity: closing ? 0.85 : 1,
        }}
      >
        <div
          style={{
            fontSize: "clamp(31px, 6vw, 64px)",
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
