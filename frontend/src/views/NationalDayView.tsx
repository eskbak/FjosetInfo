import { useEffect, useMemo, useState } from "react";

type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
};

const CONFETTI_COLORS = ["#ba0c2f", "#ffffff", "#00205b"];

function nextSeventeenthOfMay(now: Date) {
  const year = now.getFullYear();
  const thisYear = new Date(year, 4, 17, 0, 0, 0, 0);
  const tomorrow = new Date(year, now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  if (now.getMonth() === 4 && now.getDate() === 17) return tomorrow;
  if (now.getTime() < thisYear.getTime()) return thisYear;
  return new Date(year + 1, 4, 17, 0, 0, 0, 0);
}

function getCountdown(target: Date, now: Date): Countdown {
  const totalMs = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, totalMs };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export default function NationalDayView() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const target = useMemo(() => nextSeventeenthOfMay(now), [now]);
  const countdown = useMemo(() => getCountdown(target, now), [target, now]);
  const isToday = now.getMonth() === 4 && now.getDate() === 17;

  const stats = [
    { label: "dager", value: String(countdown.days) },
    { label: "timer", value: pad(countdown.hours) },
    { label: "min", value: pad(countdown.minutes) },
    { label: "sek", value: pad(countdown.seconds) },
  ];

  return (
    <main
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        color: "#fff",
        background:
          "linear-gradient(115deg, #ba0c2f 0 24%, #fff 24% 31%, #00205b 31% 44%, #fff 44% 51%, #ba0c2f 51% 100%)",
        fontFamily: "system-ui, sans-serif",
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 12% 18%, rgba(255,255,255,0.28), transparent 18%), radial-gradient(circle at 88% 78%, rgba(255,255,255,0.22), transparent 20%)",
        }}
      />

      {Array.from({ length: 13 }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            left: `${4 + i * 8}%`,
            top: `${i % 2 === 0 ? 6 : 12}%`,
            width: 18,
            height: "72vh",
            background:
              "linear-gradient(180deg, transparent 0 8%, #ba0c2f 8% 28%, #fff 28% 36%, #00205b 36% 48%, #fff 48% 56%, #ba0c2f 56% 78%, transparent 78%)",
            transform: `rotate(${i % 2 === 0 ? -8 : 8}deg)`,
            opacity: 0.42,
            borderRadius: 999,
          }}
        />
      ))}

      <style>
        {`
          @keyframes syttendeMaiConfetti {
            0% {
              transform: translate3d(0, -12vh, 0) rotate(0deg);
              opacity: 0;
            }
            12% {
              opacity: 0.95;
            }
            100% {
              transform: translate3d(var(--drift), 112vh, 0) rotate(var(--spin));
              opacity: 0;
            }
          }
        `}
      </style>

      {Array.from({ length: 100 }).map((_, i) => {
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const left = (i * 17) % 100;
        const duration = 7 + (i % 6) * 0.8;
        const delay = -1 * ((i * 0.37) % duration);
        const width = 8 + (i % 4) * 3;
        const height = i % 3 === 0 ? 22 : 12;

        return (
          <span
            key={`confetti-${i}`}
            aria-hidden
            style={
              {
                position: "absolute",
                left: `${left}%`,
                top: "-14vh",
                width,
                height,
                background: color,
                border: color === "#ffffff" ? "1px solid rgba(0,32,91,0.28)" : "1px solid rgba(255,255,255,0.24)",
                borderRadius: i % 5 === 0 ? 999 : 2,
                opacity: 0,
                zIndex: 1,
                pointerEvents: "none",
                animation: `syttendeMaiConfetti ${duration}s linear infinite`,
                animationDelay: `${delay}s`,
                "--drift": `${i % 2 === 0 ? 1 : -1}${18 + (i % 7) * 6}vw`,
                "--spin": `${i % 2 === 0 ? 1 : -1}${260 + (i % 8) * 55}deg`,
              } as React.CSSProperties
            }
          />
        );
      })}

      <section
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(1120px, calc(100vw - 56px))",
          display: "grid",
          gap: 26,
          textAlign: "center",
          textShadow: "0 3px 18px rgba(0,0,0,0.28)",
        }}
      >
        <div
          style={{
            justifySelf: "center",
            display: "inline-grid",
            gridTemplateColumns: "auto auto auto",
            alignItems: "center",
            gap: 14,
            fontSize: "clamp(15px, 2vw, 24px)",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ width: 76, height: 8, background: "#fff", borderRadius: 999 }} />
          <span>Nedtelling til 17. mai</span>
          <span style={{ width: 76, height: 8, background: "#00205b", borderRadius: 999 }} />
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(72px, 16vw, 210px)",
            lineHeight: 0.86,
            letterSpacing: 0,
            fontWeight: 950,
            WebkitTextStroke: "clamp(2px, 0.55vw, 8px) #00205b",
            paintOrder: "stroke fill",
            textShadow:
              "0 8px 0 #ba0c2f, 0 18px 26px rgba(0,0,0,0.38), 0 0 34px rgba(255,255,255,0.42)",
          }}
        >
          17. mai
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          {stats.map((item) => (
            <div
              key={item.label}
              style={{
                minWidth: 0,
                padding: "clamp(14px, 2vw, 28px) clamp(10px, 1.8vw, 22px)",
                border: "3px solid rgba(255,255,255,0.78)",
                background: "rgba(0, 32, 91, 0.62)",
                boxShadow: "0 18px 46px rgba(0,0,0,0.24)",
              }}
            >
              <div
                style={{
                  fontSize: "clamp(42px, 9vw, 126px)",
                  lineHeight: 0.9,
                  fontWeight: 950,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {isToday ? "00" : item.value}
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: "clamp(14px, 2vw, 26px)",
                  fontWeight: 850,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>

        <p
          style={{
            margin: 0,
            fontSize: "clamp(24px, 4vw, 58px)",
            fontWeight: 900,
            lineHeight: 1.05,
          }}
        >
          {isToday ? "Gratulerer med dagen!" : "Get ready boys!"}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
            alignItems: "stretch",
            fontSize: "clamp(15px, 2.2vw, 30px)",
            fontWeight: 850,
          }}
        >
          {["Pils", "Kake", "Pils"].map((word, i) => (
            <div
              key={word}
              style={{
                padding: "16px 10px",
                background: i === 1 ? "rgba(255,255,255,0.88)" : "rgba(186,12,47,0.76)",
                color: i === 1 ? "#00205b" : "#fff",
                borderTop: "8px solid #00205b",
              }}
            >
              {word}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
