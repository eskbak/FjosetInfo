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
          "linear-gradient(180deg, #ba0c2f 0 24%, #ffffff 24% 29%, #00205b 29% 43%, #ffffff 43% 48%, #ba0c2f 48% 100%)",
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
            "linear-gradient(90deg, rgba(0,32,91,0.65) 0 8%, transparent 8% 92%, rgba(0,32,91,0.65) 92% 100%), radial-gradient(circle at 50% 12%, rgba(255,255,255,0.24), transparent 20%), radial-gradient(circle at 50% 86%, rgba(255,255,255,0.2), transparent 24%)",
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
          .national-stage {
            position: relative;
            z-index: 2;
            width: min(760px, calc(100vw - 44px));
            height: min(1180px, calc(100vh - 44px));
            display: grid;
            grid-template-rows: auto auto 1fr auto;
            align-items: center;
            gap: clamp(18px, 3vh, 34px);
            text-align: center;
            text-shadow: 0 3px 18px rgba(0,0,0,0.28);
          }

          .national-kicker {
            justify-self: center;
            display: inline-grid;
            grid-template-columns: 64px auto 64px;
            align-items: center;
            gap: 14px;
            padding: 10px 0;
            font-size: clamp(17px, 3.2vw, 28px);
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .national-kicker::before,
          .national-kicker::after {
            content: "";
            height: 8px;
            border-radius: 999px;
          }

          .national-kicker::before {
            background: #ffffff;
          }

          .national-kicker::after {
            background: #00205b;
          }

          .national-title {
            margin: 0;
            font-size: clamp(96px, 25vw, 218px);
            line-height: 0.82;
            letter-spacing: 0;
            font-weight: 950;
            -webkit-text-stroke: clamp(3px, 1vw, 8px) #00205b;
            paint-order: stroke fill;
            text-shadow: 0 9px 0 #ba0c2f, 0 20px 28px rgba(0,0,0,0.4), 0 0 34px rgba(255,255,255,0.42);
          }

          .national-countdown-grid {
            align-self: stretch;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: clamp(12px, 2.2vh, 22px);
          }

          .national-countdown-card {
            min-width: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: clamp(14px, 2.4vh, 28px) clamp(10px, 3vw, 22px);
            border: 3px solid rgba(255,255,255,0.82);
            background: rgba(0, 32, 91, 0.72);
            box-shadow: 0 18px 46px rgba(0,0,0,0.28);
          }

          .national-countdown-value {
            font-size: clamp(58px, 17vw, 136px);
            line-height: 0.86;
            font-weight: 950;
            font-variant-numeric: tabular-nums;
          }

          .national-countdown-label {
            margin-top: 14px;
            font-size: clamp(15px, 3.6vw, 26px);
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .national-subtitle {
            margin: 0;
            font-size: clamp(26px, 7vw, 58px);
            font-weight: 950;
            line-height: 1.04;
          }

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

      <section className="national-stage">
        <div className="national-kicker">Nedtelling til</div>

        <h1 className="national-title">17. mai</h1>

        <div className="national-countdown-grid">
          {stats.map((item) => (
            <div key={item.label} className="national-countdown-card">
              <div className="national-countdown-value">{isToday ? "00" : item.value}</div>
              <div className="national-countdown-label">{item.label}</div>
            </div>
          ))}
        </div>

        <p className="national-subtitle">
          {isToday ? "Gratulerer med dagen!" : "Get ready boys!"}
        </p>

      </section>
    </main>
  );
}
