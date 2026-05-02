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
        display: "flex",
        flexDirection: "column",
        flex: 1,
        gap: 20,
        marginTop: 20,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <style>
        {`
          .national-card-view {
            position: relative;
            flex: 1;
            min-height: 0;
            overflow: hidden;
            display: grid;
            grid-template-rows: auto auto 1fr auto;
            align-items: center;
            gap: clamp(18px, 3vh, 34px);
            padding: clamp(22px, 4.2vw, 54px);
            border-radius: clamp(28px, 5vw, 56px);
            border: 1px solid rgba(255,255,255,0.64);
            color: #ffffff;
            text-align: center;
            text-shadow: 0 3px 18px rgba(0,0,0,0.28);
            background: linear-gradient(135deg, #d3123f 0%, #ba0c2f 46%, #8f0a25 100%);
            box-shadow: 0 28px 90px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.28);
          }

          .national-card-view::before {
            content: "";
            position: absolute;
            left: 50%;
            top: 50%;
            width: max(100%, calc(100vh * 22 / 16));
            aspect-ratio: 22 / 16;
            transform: translate(-50%, -50%);
            background:
              linear-gradient(90deg, transparent 0 45.455%, #00205b 45.455% 54.545%, transparent 54.545% 100%),
              linear-gradient(180deg, transparent 0 43.75%, #00205b 43.75% 56.25%, transparent 56.25% 100%),
              linear-gradient(90deg, transparent 0 40.909%, #ffffff 40.909% 59.091%, transparent 59.091% 100%),
              linear-gradient(180deg, transparent 0 37.5%, #ffffff 37.5% 62.5%, transparent 62.5% 100%),
              #ba0c2f;
            pointer-events: none;
          }

          .national-card-view::after {
            content: "";
            position: absolute;
            inset: 0;
            border: 1px solid rgba(255,255,255,0.28);
            border-radius: clamp(22px, 4vw, 44px);
            background:
              radial-gradient(circle at 74% 14%, rgba(255,255,255,0.28), transparent 20%),
              radial-gradient(circle at 18% 78%, rgba(0,32,91,0.22), transparent 28%),
              linear-gradient(105deg, rgba(255,255,255,0.24), transparent 22% 76%, rgba(0,0,0,0.14));
            pointer-events: none;
          }

          .national-content {
            position: relative;
            z-index: 2;
            align-self: stretch;
            min-height: 0;
            display: grid;
            grid-template-rows: auto auto 1fr auto;
            align-items: center;
            gap: clamp(18px, 3vh, 34px);
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
            min-height: 0;
          }

          .national-countdown-card {
            min-width: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: clamp(14px, 2.4vh, 28px) clamp(10px, 3vw, 22px);
            border: 3px solid rgba(255,255,255,0.82);
            border-radius: clamp(18px, 3vw, 34px);
            background: rgba(0, 32, 91, 0.72);
            box-shadow: 0 18px 46px rgba(0,0,0,0.28);
            backdrop-filter: blur(2px);
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

          @media (orientation: portrait), (max-width: 820px) {
            .national-card-view {
              border-radius: 34px;
              padding: clamp(18px, 4.4vw, 34px);
            }

            .national-title {
              font-size: clamp(78px, 23vw, 150px);
            }

            .national-countdown-grid {
              gap: 12px;
            }

            .national-countdown-value {
              font-size: clamp(48px, 15vw, 96px);
            }
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

      <section className="national-card-view">
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

        <div className="national-content">
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
        </div>
      </section>
    </main>
  );
}
