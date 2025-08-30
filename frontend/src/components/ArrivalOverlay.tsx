// components/ArrivalOverlay.tsx
import { useEffect, useMemo, useRef } from "react";

type Props = {
  name: string;
  onClose: () => void;
  durationMs?: number; // default 10s
};

export default function ArrivalOverlay({ name, onClose, durationMs = 10_000 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const killRef = useRef(false);

  // Perf-aware particle budget
  const perf = useMemo(() => {
    const mem = (navigator as any).deviceMemory || 4;              // 1/2/4/8
    const cores = (navigator as any).hardwareConcurrency || 4;     // 2/4/8…
    const tier = (mem >= 8 || cores >= 6) ? 1.35 : (mem >= 4 ? 1.0 : 0.75);
    return {
      CONFETTI: Math.round(90 * tier),
      EMOJI: Math.round(24 * tier),
      SPARKS: Math.round(100 * tier),
      DPR: Math.min((window.devicePixelRatio || 1), 1.5),          // cap DPR for speed
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: true })!;
    let width = 0, height = 0;

    // Resize & scale
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = perf.DPR;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // --------- Particles ----------
    type Confetti = {
      x: number; y: number; vx: number; vy: number; size: number;
      rot: number; vr: number; color: string; life: number; maxLife: number;
    };
    type Spark = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; };
    type Emoji = { x: number; y: number; vy: number; size: number; c: string; sway: number; t: number; };

    const COLORS = ["#ff6b6b","#ffd93d","#4d96ff","#2ecc71","#b967ff","#ff8b3d"];
    const EMOJIS = ["🎉","✨","🎈","🎊","⭐","🎵","💫"];

    const confetti: Confetti[] = [];
    const sparks: Spark[] = [];
    const emojis: Emoji[] = [];

    const RND = Math.random;
    const rnd = (a: number, b: number) => a + RND() * (b - a);

    // spawners
    const spawnConfetti = (n: number) => {
      for (let i = 0; i < n; i++) {
        confetti.push({
          x: rnd(0, width),
          y: rnd(-40, -10),
          vx: rnd(-30, 30),
          vy: rnd(120, 240),
          size: rnd(6, 12),
          rot: rnd(0, Math.PI * 2),
          vr: rnd(-4, 4),
          color: COLORS[(Math.random() * COLORS.length) | 0],
          life: 0,
          maxLife: rnd(3.5, 6.5),
        });
      }
    };
    const spawnEmojis = (n: number) => {
      for (let i = 0; i < n; i++) {
        emojis.push({
          x: rnd(0, width),
          y: rnd(height * 0.65, height * 0.95),
          vy: rnd(-18, -40),
          size: rnd(22, 34),
          c: EMOJIS[(Math.random() * EMOJIS.length) | 0],
          sway: rnd(12, 28),
          t: rnd(0, Math.PI * 2),
        });
      }
    };
    const ringBurst = (cx: number, cy: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        const spd = rnd(180, 320);
        sparks.push({
          x: cx, y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 0,
          maxLife: rnd(0.6, 1.1),
        });
      }
    };

    // initial population
    spawnConfetti(perf.CONFETTI);
    spawnEmojis(perf.EMOJI);
    setTimeout(() => ringBurst(width * 0.5, height * 0.42, perf.SPARKS), 280);

    // occasional top-up rain
    let drizzleTimer = 0;

    // --------- Loop ----------
    const start = performance.now();
    let last = start;

    const step = (now: number) => {
      if (killRef.current) return;
      const t = (now - start) / 1000;
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;

      // end?
      if ((now - start) >= durationMs) {
        onClose();
        return;
      }

      // Clear
      ctx.clearRect(0, 0, width, height);

      // Subtle vignette gradient (cheap radial)
      const grad = ctx.createRadialGradient(width/2, height/2, Math.min(width,height)*0.1, width/2, height/2, Math.max(width,height)*0.8);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.25)");
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,width,height);

      // Confetti update/draw
      const wind = Math.sin(t * 0.7) * 20;
      for (let i = confetti.length - 1; i >= 0; i--) {
        const p = confetti[i];
        p.vx += wind * dt * 0.5;
        p.vy += 280 * dt;           // gravity
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.life += dt;

        // recycle below bottom
        if (p.y > height + 30 || p.x < -30 || p.x > width + 30 || p.life > p.maxLife) {
          confetti.splice(i, 1);
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          // paper flip effect via alpha
          const flip = 0.6 + 0.4 * Math.sin(p.rot * 2);
          ctx.globalAlpha = flip;
          ctx.fillRect(-p.size * 0.5, -p.size * 0.25, p.size, p.size * 0.5);
          ctx.restore();
        }
      }

      // top-up some confetti every ~0.25s
      drizzleTimer += dt;
      if (drizzleTimer > 0.25 && confetti.length < perf.CONFETTI) {
        drizzleTimer = 0;
        spawnConfetti(6);
      }

      // Sparks (burst)
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.vy += 480 * dt; // gravity
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life += dt;
        const a = Math.max(0, 1 - s.life / s.maxLife);

        if (s.life >= s.maxLife) {
          sparks.splice(i, 1);
        } else {
          ctx.globalAlpha = a;
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - s.vx * 0.03, s.y - s.vy * 0.03);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // Emojis float up with gentle sway
      for (let i = emojis.length - 1; i >= 0; i--) {
        const e = emojis[i];
        e.t += dt;
        e.y += e.vy * dt;
        const x = e.x + Math.sin(e.t * 1.2) * e.sway;

        ctx.font = `${e.size}px system-ui, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(e.c, x, e.y);

        if (e.y < -40) emojis.splice(i, 1);
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    // Auto close
    const endTimer = window.setTimeout(() => {
      killRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      onClose();
    }, durationMs + 500);

    // Cleanup
    return () => {
      killRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.clearTimeout(endTimer);
      window.removeEventListener("resize", resize);
    };
  }, [durationMs, onClose, perf]);

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
        // Animated diagonal sheen (CSS only, cheap)
        background:
          "linear-gradient(120deg, rgba(20,20,30,0.65), rgba(20,20,30,0.65))",
      }}
    >
      {/* subtle moving highlight ribbon */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(100deg, rgba(255,255,255,0.05) 0 14px, rgba(255,255,255,0.0) 14px 28px)",
          backgroundSize: "200% 200%",
          animation: "ribbon 6s linear infinite",
          pointerEvents: "none",
        }}
      />
      <style>{`
@keyframes ribbon {
  0% { background-position: 0% 0% }
  100% { background-position: 200% 200% }
}
@keyframes popIn {
  0% { transform: translateY(16px) scale(0.98); opacity: 0 }
  50% { transform: translateY(0) scale(1.02); opacity: 1 }
  100% { transform: translateY(0) scale(1) }
}
      `}</style>

      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          willChange: "transform, opacity",
          contain: "strict",
        }}
      />

      {/* Center card (no backdrop-filter; simple shadow + glow via text-shadow) */}
      <div
        style={{
          position: "relative",
          background: "rgba(25,25,40,0.8)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 22,
          padding: "24px 32px",
          color: "#fff",
          textAlign: "center",
          width: "min(92vw, 900px)",
          boxShadow: "0 14px 48px rgba(0,0,0,0.45)",
          animation: "popIn 500ms cubic-bezier(.2,.8,.2,1)",
          willChange: "transform, opacity",
          transform: "translateZ(0)",
        }}
      >
        <div
          style={{
            fontSize: "clamp(18px, 4vw, 36px)",
            opacity: 0.9,
            marginBottom: 8,
            textShadow: "0 1px 2px rgba(0,0,0,0.35)",
          }}
        >
          🎉 Velkommen hjem! 🎉
        </div>
        <div
          style={{
            fontSize: "clamp(40px, 8vw, 96px)",
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: -0.5,
            textShadow:
              "0 2px 6px rgba(0,0,0,0.45), 0 0 24px rgba(255,255,255,0.18)",
          }}
        >
          {name} er hjemme
        </div>
      </div>
    </div>
  );
}
