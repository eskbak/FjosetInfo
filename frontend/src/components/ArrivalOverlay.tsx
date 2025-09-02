// components/ArrivalOverlay.tsx
import { useEffect, useRef, useState } from "react";

// --- OPTIONAL avatar imports (add yours as you create the files) ---
import eskilPng from "../assets/avatars/eskil.png?url";
import sindrePng from "../assets/avatars/sindre.png?url";
import kristianPng from "../assets/avatars/kristian.png?url";
import fallbackPng from "../assets/avatars/fallback.png?url";
import niklasPng from "../assets/avatars/niklas.png?url";
import hallgrimPng from "../assets/avatars/hallgrim.png?url";
import minaPng from "../assets/avatars/mina.png?url";

// Map of KNOWN_DEVICES name -> avatar image.
// Update these as you add files (e.g., sindre.png, hallgrim.png, etc.)
const AVATARS: Record<string, string> = {
  Eskil: eskilPng,
  Sindre: sindrePng,
  Hallgrim: hallgrimPng,
  Skurken: kristianPng,
  Niklas: niklasPng,
  Marius: fallbackPng,
  Mina: minaPng
};

// at top of the component file
const emojiStyle: React.CSSProperties = {
  // force an emoji font; fall back to system if not available
  fontFamily:
    '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",system-ui,sans-serif',
  fontWeight: 400,     // avoid bold on emoji (some stacks flake)
  letterSpacing: 0,    // spacing can break certain multi-codepoint emoji
  lineHeight: 1,       // tighter baseline for emoji
  display: "inline-block",
};

type Props = {
  name: string;
  onClose: () => void;
  /** How long the overlay stays fully visible before closing (ms). */
  durationMs?: number;
  /** Ask the server to speak when the overlay opens. */
  speakOnMount?: boolean;
  /**
   * The phrase to speak. You can pass a string or a function that receives the name.
   * Defaults to: "{name} er hjemme!"
   */
  phrase?: string | ((name: string) => string);
  /** Optional Azure voice override, e.g. "nb-NO-IselinNeural" */
  voice?: string;
  /** Override avatar image directly (optional). */
  avatarSrc?: string;
};

export default function ArrivalOverlay({
  name,
  onClose,
  durationMs = 9000,
  speakOnMount = true,
  phrase,
  voice,
  avatarSrc,
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

  // 🔊 Tell the server to speak (server-side playback on the Pi)
useEffect(() => {
  if (!speakOnMount) return;
  const h = new Date().getHours();
  if (h < 9 || h >= 22) return; // client-side guard (keep in sync with server env if you change it)

  const text = typeof phrase === "function" ? phrase(name) : (phrase || `${name} er hjemme!`);
  fetch("/api/tts/play", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(voice ? { text, voice } : { text }),
    keepalive: true,
  }).catch(() => {});
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

  const src = avatarSrc || AVATARS[name] || fallbackPng;

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

@keyframes avatarPop {
  0%   { transform: translateY(40px) scale(0.92); opacity: 0 }
  55%  { transform: translateY(-6px) scale(1.06); opacity: 1 }
  100% { transform: translateY(0) scale(1) }
}

@keyframes pulseHalo {
  0%, 100% { transform: scale(1); opacity: 0.65 }
  50% { transform: scale(1.08); opacity: 0.95 }
}
      `}</style>

      {/* Card */}
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
          width: "min(78vw, 980px)",
          animation: closing ? undefined : "popIn 650ms cubic-bezier(.2,.8,.2,1)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.45)",
          transition: "transform 220ms ease, opacity 220ms ease",
          transform: closing ? "scale(0.98)" : "none",
          opacity: closing ? 0.85 : 1,
        }}
      >
        {/* Avatar + halo */}
        <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
          {/* soft halo behind the avatar */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: "-10%",
              borderRadius: "9999px",
              background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.35), rgba(255,255,255,0.05) 60%, transparent 70%)",
              filter: "blur(8px)",
              animation: closing ? undefined : "pulseHalo 1600ms ease-in-out infinite",
            }}
          />
          <img
            src={src}
            alt={name}
            title={name}
            style={{
              width: "min(38vw, 340px)",
              height: "auto",
              objectFit: "contain",
              imageRendering: "auto",
              filter: "drop-shadow(0 8px 22px rgba(0,0,0,0.45))",
              borderRadius: 16,     // if your PNGs are already masked, you can set this to 0
              animation: closing ? undefined : "avatarPop 600ms cubic-bezier(.2,.8,.2,1)",
              willChange: "transform, filter, opacity",
            }}
            loading="eager"
            decoding="async"
          />
        </div>

<div
  style={{
    fontSize: "clamp(28px, 5.2vw, 56px)",
    letterSpacing: 1,
    opacity: 0.95,
    marginBottom: 6,
  }}
>
  <span style={emojiStyle}>🎉</span>
  &nbsp;Velkommen hjem!&nbsp;
  <span style={emojiStyle}>🎉</span>
</div>
        <div
          style={{
            fontSize: "clamp(44px, 9vw, 96px)",
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: -1,
          }}
        >
          {name} er hjemme!
        </div>
      </div>
    </div>
  );
}
