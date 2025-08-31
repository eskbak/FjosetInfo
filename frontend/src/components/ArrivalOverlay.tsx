// components/ArrivalOverlay.tsx
import { useEffect, useRef, useState } from "react";

type Props = {
  name: string;
  onClose: () => void;
  durationMs?: number; // how long the overlay stays fully visible
};

export default function ArrivalOverlay({
  name,
  onClose,
  durationMs = 9000,
}: Props) {
  const [closing, setClosing] = useState(false);
  const closedRef = useRef(false);
  const mainTimerRef = useRef<number | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const close = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    setClosing(true);
    // fade-out then finish
    window.setTimeout(() => {
      try { onClose(); } catch {}
    }, 450);
  };

  // Fetch Azure MP3 and play once
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch(`/api/announce/azure?name=${encodeURIComponent(name)}`, { cache: "no-store" });
        if (!r.ok) throw new Error("Azure TTS fetch failed");
        const blob = await r.blob();
        if (cancelled) return;

        const url = URL.createObjectURL(blob);
        urlRef.current = url;

        const a = new Audio(url);
        a.preload = "auto";
        a.volume = 1.0;
        audioRef.current = a;

        // try play; ignore user-gesture errors (kiosk likely allows autoplay)
        a.play().catch(() => {});
      } catch {
        // optional: fallback to Web Speech API (browser TTS) if you want:
        // const u = new SpeechSynthesisUtterance(`Velkommen hjem, ${name}!`);
        // u.lang = "nb-NO";
        // speechSynthesis.speak(u);
      }
    })();

    return () => {
      cancelled = true;
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch {}
      }
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [name]);

  // Timers / close logic
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
