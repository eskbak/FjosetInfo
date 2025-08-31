// components/ArrivalOverlay.tsx
import { useEffect, useRef, useState } from "react";

type Props = {
  name: string;
  onClose: () => void;
  /** How long the overlay stays fully visible before closing (ms). */
  durationMs?: number;
  /** Speak via Azure when the overlay opens. */
  speakOnMount?: boolean;
  /** 0.0 – 1.0 */
  volume?: number;
};

export default function ArrivalOverlay({
  name,
  onClose,
  durationMs = 9000,
  speakOnMount = true,
  volume = 1.0,
}: Props) {
  const [closing, setClosing] = useState(false);

  // timers / guards
  const closedRef = useRef(false);
  const mainTimerRef = useRef<number | null>(null);
  const watchdogRef = useRef<number | null>(null);

  // audio refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const close = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    setClosing(true);

    // fade out quickly, then call onClose
    window.setTimeout(() => {
      try {
        onClose();
      } catch {}
    }, 450);
  };

  // --- Azure TTS playback when shown ---
  useEffect(() => {
    let aborted = false;

    async function startTts() {
      if (!speakOnMount) return;

      // build a cache-busting URL so we always get a fresh audio
      const ttsUrl = `/api/announce/azure/simple?name=${encodeURIComponent(name)}&ts=${Date.now()}`;

      // Strategy A (fastest): stream directly by assigning the URL to an <audio> element.
      // This avoids extra memory copies on the Pi.
      try {
        const a = new Audio();
        audioRef.current = a;
        a.volume = Math.min(1, Math.max(0, volume));
        a.preload = "auto";
        a.src = ttsUrl;

        // Attempt play; autoplay may be allowed in kiosk mode. If it's blocked, we silently skip speech.
        await a.play().catch(() => {});
        // If component is already closing or unmounted, stop.
        if (aborted || closedRef.current) {
          try { a.pause(); } catch {}
        }
        return;
      } catch {
        /* fall through to Strategy B */
      }

      // Strategy B: fetch -> blob -> objectURL (slower / more RAM, but works if direct stream fails)
      try {
        const r = await fetch(ttsUrl, { cache: "no-store" });
        if (!r.ok) throw new Error(`Azure TTS ${r.status}`);
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const a = new Audio(url);
        audioRef.current = a;
        a.volume = Math.min(1, Math.max(0, volume));
        await a.play().catch(() => {});
        if (aborted || closedRef.current) {
          try { a.pause(); } catch {}
        }
      } catch {
        // Last-resort: no speech; just show overlay
      }
    }

    startTts();

    return () => {
      aborted = true;
      // cleanup any audio on unmount
      const a = audioRef.current;
      if (a) {
        try { a.pause(); } catch {}
        try { a.src = ""; } catch {}
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      audioRef.current = null;
    };
  }, [name, speakOnMount, volume]);

  // --- timers for auto-close + watchdog + Esc key ---
  useEffect(() => {
    // main auto-close
    mainTimerRef.current = window.setTimeout(close, durationMs) as unknown as number;

    // watchdog (belt-and-braces in case of any animation stall)
    watchdogRef.current = window.setTimeout(close, durationMs + 4000) as unknown as number;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
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

      {/* Center card */}
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
