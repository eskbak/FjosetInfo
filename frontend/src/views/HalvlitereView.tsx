import type { Theme } from "../types";

type MemberPour = {
  name: string;
  halvlitere: number;
  accent: string;
  note: string;
};

const STUDY_YEARS = 5;

const pours: MemberPour[] = [
  { name: "Hallgrim", halvlitere: 743, accent: "#f59e0b", note: "grunnskvulp" },
  { name: "Eskil", halvlitere: 689, accent: "#fbbf24", note: "gyllen innsats" },
  { name: "Sindre", halvlitere: 642, accent: "#f97316", note: "sen kveld, god flyt" },
  { name: "Kristian", halvlitere: 611, accent: "#fde047", note: "stabilt volum" },
  { name: "Niklas", halvlitere: 574, accent: "#fb923c", note: "skum i systemet" },
  { name: "Marius", halvlitere: 548, accent: "#facc15", note: "trofast paafyll" },
];

const totalHalvlitere = pours.reduce((sum, member) => sum + member.halvlitere, 0);
const liters = Math.round(totalHalvlitere * 0.5);
const weeklyPace = totalHalvlitere / (STUDY_YEARS * 52);
const monthlyPace = totalHalvlitere / (STUDY_YEARS * 12);

export default function HalvlitereView({ theme }: { theme: Theme }) {
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
          @keyframes tankSlosh {
            0%, 100% { transform: translateX(-2%) rotate(-1.5deg); }
            50% { transform: translateX(2%) rotate(1.5deg); }
          }

          @keyframes waveSlide {
            from { transform: translateX(-36%); }
            to { transform: translateX(0%); }
          }

          @keyframes bubbleRise {
            0% { transform: translateY(24px) scale(0.7); opacity: 0; }
            18% { opacity: 0.72; }
            100% { transform: translateY(-180px) scale(1.15); opacity: 0; }
          }

          @keyframes foamWobble {
            0%, 100% { transform: translateX(-1%) translateY(0); }
            50% { transform: translateX(1%) translateY(-7px); }
          }

          @keyframes amberShine {
            0% { transform: translateX(-130%) skewX(-16deg); }
            100% { transform: translateX(360%) skewX(-16deg); }
          }

          .halvlitere-card {
            position: relative;
            flex: 1;
            min-height: 0;
            overflow: hidden;
            display: grid;
            grid-template-rows: auto 1fr auto;
            gap: clamp(16px, 2.6vh, 30px);
            padding: clamp(22px, 3.8vw, 50px);
            border-radius: clamp(28px, 5vw, 56px);
            border: 1px solid rgba(254, 243, 199, 0.45);
            color: #fff7ed;
            background:
              radial-gradient(circle at 14% 14%, rgba(254,243,199,0.24), transparent 24%),
              radial-gradient(circle at 84% 22%, rgba(251,191,36,0.18), transparent 26%),
              linear-gradient(145deg, #2a1307 0%, #6b2b09 46%, #1c1209 100%);
            box-shadow: 0 28px 90px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.16);
          }

          .halvlitere-card::before {
            content: "";
            position: absolute;
            inset: 0;
            background:
              radial-gradient(circle at 20% 86%, rgba(255,247,237,0.18) 0 1.5%, transparent 1.7%),
              radial-gradient(circle at 76% 72%, rgba(254,243,199,0.14) 0 1.2%, transparent 1.4%),
              linear-gradient(90deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 100%),
              linear-gradient(180deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 100%);
            background-size: auto, auto, 54px 54px, 54px 54px;
            mask-image: linear-gradient(180deg, rgba(0,0,0,0.72), transparent 82%);
            pointer-events: none;
          }

          .halvlitere-card::after {
            content: "";
            position: absolute;
            left: -16%;
            top: 0;
            width: 28%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
            animation: amberShine 9s ease-in-out infinite;
            pointer-events: none;
          }

          .halvlitere-head,
          .halvlitere-stage,
          .halvlitere-footer {
            position: relative;
            z-index: 1;
          }

          .halvlitere-head {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: end;
            gap: clamp(18px, 3vw, 42px);
          }

          .halvlitere-kicker {
            color: #fde68a;
            font-size: clamp(14px, 1.9vw, 24px);
            font-weight: 950;
            letter-spacing: 0.14em;
            text-transform: uppercase;
          }

          .halvlitere-title {
            margin: 6px 0 0;
            font-size: clamp(54px, 8.8vw, 122px);
            line-height: 0.88;
            font-weight: 950;
            letter-spacing: 0;
            text-shadow: 0 7px 0 #92400e, 0 24px 36px rgba(0,0,0,0.42);
          }

          .halvlitere-total {
            min-width: min(31vw, 360px);
            padding: clamp(16px, 2.2vw, 26px);
            border: 1px solid rgba(254,243,199,0.34);
            border-radius: clamp(20px, 3vw, 34px);
            background: linear-gradient(180deg, rgba(69,26,3,0.62), rgba(120,53,15,0.36));
            text-align: right;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
          }

          .halvlitere-total-number {
            font-size: clamp(46px, 6vw, 86px);
            line-height: 0.9;
            font-weight: 950;
            font-variant-numeric: tabular-nums;
          }

          .halvlitere-total-label {
            margin-top: 8px;
            color: #fed7aa;
            font-size: clamp(15px, 2vw, 25px);
            font-weight: 850;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .halvlitere-stage {
            min-height: 0;
            display: grid;
            grid-template-columns: minmax(320px, 0.9fr) minmax(0, 1.1fr);
            align-items: center;
            gap: clamp(20px, 4vw, 58px);
          }

          .halvlitere-tank-wrap {
            position: relative;
            display: grid;
            place-items: center;
            min-height: 0;
          }

          .halvlitere-tank {
            position: relative;
            width: min(35vw, 440px);
            min-width: 310px;
            aspect-ratio: 0.86;
            overflow: hidden;
            border-radius: 38px 38px 64px 64px;
            border: clamp(7px, 1vw, 12px) solid rgba(255,247,237,0.62);
            background:
              linear-gradient(90deg, rgba(255,255,255,0.22), transparent 18% 78%, rgba(255,255,255,0.1)),
              linear-gradient(180deg, rgba(255,247,237,0.16), rgba(120,53,15,0.24));
            box-shadow: inset 18px 0 30px rgba(255,255,255,0.12), inset -18px 0 34px rgba(69,26,3,0.32), 0 34px 70px rgba(0,0,0,0.34);
          }

          .halvlitere-beer {
            position: absolute;
            inset: 18% 0 0;
            overflow: hidden;
            background:
              radial-gradient(circle at 26% 28%, rgba(255,255,255,0.3), transparent 10%),
              linear-gradient(180deg, #fde68a 0%, #f59e0b 36%, #b45309 100%);
            animation: tankSlosh 5.4s ease-in-out infinite;
            transform-origin: 50% 10%;
          }

          .halvlitere-wave {
            position: absolute;
            left: -46%;
            top: -7%;
            width: 192%;
            height: 34%;
            background:
              radial-gradient(ellipse at 8% 78%, #fff7ed 0 8%, transparent 9%),
              radial-gradient(ellipse at 18% 74%, #fffbeb 0 10%, transparent 11%),
              radial-gradient(ellipse at 30% 80%, #fef3c7 0 8%, transparent 9%),
              radial-gradient(ellipse at 43% 70%, #fff7ed 0 11%, transparent 12%),
              radial-gradient(ellipse at 57% 76%, #fffbeb 0 9%, transparent 10%),
              radial-gradient(ellipse at 72% 70%, #fff7ed 0 10%, transparent 11%),
              radial-gradient(ellipse at 86% 78%, #fef3c7 0 8%, transparent 9%),
              linear-gradient(180deg, #fff7ed 0%, #fde68a 62%, transparent 63%);
            animation: waveSlide 6.8s linear infinite, foamWobble 4.6s ease-in-out infinite;
          }

          .halvlitere-wave.back {
            top: -2%;
            opacity: 0.54;
            animation-duration: 8.4s, 5.8s;
            animation-direction: reverse, normal;
          }

          .halvlitere-bubble {
            position: absolute;
            left: var(--x);
            bottom: var(--y);
            width: var(--size);
            aspect-ratio: 1;
            border-radius: 50%;
            border: 2px solid rgba(255,247,237,0.42);
            background: rgba(255,247,237,0.12);
            animation: bubbleRise var(--duration) ease-in infinite;
            animation-delay: var(--delay);
          }

          .halvlitere-tank-text {
            position: absolute;
            inset: auto 8% 9%;
            text-align: center;
            text-shadow: 0 4px 18px rgba(69,26,3,0.55);
          }

          .halvlitere-tank-text strong {
            display: block;
            font-size: clamp(42px, 6vw, 86px);
            line-height: 0.88;
            font-weight: 950;
            font-variant-numeric: tabular-nums;
          }

          .halvlitere-tank-text span {
            color: #fffbeb;
            font-size: clamp(14px, 1.8vw, 23px);
            font-weight: 950;
            letter-spacing: 0.1em;
            text-transform: uppercase;
          }

          .halvlitere-handle {
            position: absolute;
            right: max(4%, calc(50% - min(35vw, 440px) / 2 - 68px));
            top: 24%;
            width: clamp(72px, 8vw, 118px);
            height: clamp(120px, 15vw, 210px);
            border: clamp(9px, 1vw, 13px) solid rgba(255,247,237,0.5);
            border-left: 0;
            border-radius: 0 70px 70px 0;
          }

          .halvlitere-contributions {
            min-height: 0;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: clamp(11px, 1.7vh, 18px);
          }

          .halvlitere-pour {
            min-width: 0;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            align-items: center;
            gap: clamp(10px, 1.7vw, 18px);
            padding: clamp(12px, 1.7vw, 20px);
            border: 1px solid rgba(254,243,199,0.2);
            border-radius: 22px;
            background: rgba(67, 20, 7, 0.48);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
          }

          .halvlitere-mini {
            position: relative;
            width: clamp(42px, 5vw, 68px);
            aspect-ratio: 0.62;
            overflow: hidden;
            border-radius: 11px 11px 16px 16px;
            border: 3px solid rgba(255,247,237,0.5);
            background: rgba(255,247,237,0.12);
          }

          .halvlitere-mini-fill {
            position: absolute;
            inset: auto 0 0;
            height: var(--fill);
            background: linear-gradient(180deg, #fde68a 0%, var(--accent) 48%, #b45309 100%);
          }

          .halvlitere-mini-fill::before {
            content: "";
            position: absolute;
            left: -18%;
            top: -12px;
            width: 136%;
            height: 24px;
            border-radius: 50%;
            background:
              radial-gradient(circle at 18% 54%, #fff7ed 0 17%, transparent 18%),
              radial-gradient(circle at 40% 44%, #fffbeb 0 22%, transparent 23%),
              radial-gradient(circle at 66% 52%, #fef3c7 0 18%, transparent 19%),
              linear-gradient(180deg, #fff7ed, #fde68a);
          }

          .halvlitere-name {
            min-width: 0;
            font-size: clamp(22px, 3vw, 42px);
            line-height: 1;
            font-weight: 950;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .halvlitere-note {
            margin-top: 7px;
            color: #fed7aa;
            font-size: clamp(12px, 1.5vw, 19px);
            font-weight: 750;
            text-transform: uppercase;
            letter-spacing: 0.07em;
          }

          .halvlitere-footer {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: clamp(10px, 1.8vw, 18px);
          }

          .halvlitere-stat {
            padding: clamp(13px, 1.8vw, 20px);
            border-radius: 18px;
            border: 1px solid rgba(254,243,199,0.2);
            background: rgba(28,18,9,0.46);
          }

          .halvlitere-stat strong {
            display: block;
            font-size: clamp(26px, 3.7vw, 54px);
            line-height: 0.95;
            font-weight: 950;
          }

          .halvlitere-stat span {
            color: #fed7aa;
            font-size: clamp(12px, 1.6vw, 20px);
            font-weight: 850;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          @media (orientation: portrait), (max-width: 900px) {
            .halvlitere-card {
              border-radius: 34px;
              grid-template-rows: auto auto auto;
              gap: clamp(12px, 1.7vh, 22px);
              padding: clamp(16px, 3.8vw, 30px);
            }

            .halvlitere-head {
              grid-template-columns: 1fr;
              align-items: start;
              gap: clamp(10px, 1.2vh, 16px);
              text-align: center;
            }

            .halvlitere-kicker {
              font-size: clamp(13px, 2.5vw, 20px);
            }

            .halvlitere-title {
              font-size: clamp(58px, 14vw, 116px);
            }

            .halvlitere-stage {
              grid-template-columns: 1fr;
              grid-template-rows: auto minmax(0, 1fr);
              align-content: start;
              gap: clamp(12px, 1.8vh, 22px);
            }

            .halvlitere-total {
              min-width: 0;
              justify-self: center;
              width: min(100%, 520px);
              padding: clamp(12px, 2.4vw, 18px);
              text-align: center;
            }

            .halvlitere-total-number {
              font-size: clamp(42px, 9vw, 72px);
            }

            .halvlitere-total-label {
              font-size: clamp(12px, 2.4vw, 18px);
            }

            .halvlitere-tank {
              width: min(58vw, 360px);
              min-width: 230px;
              max-height: 42vh;
            }

            .halvlitere-tank-text strong {
              font-size: clamp(36px, 8vw, 66px);
            }

            .halvlitere-tank-text span {
              font-size: clamp(11px, 2.2vw, 17px);
            }

            .halvlitere-handle {
              display: none;
            }

            .halvlitere-contributions {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: clamp(8px, 1.2vh, 12px);
            }

            .halvlitere-pour {
              grid-template-columns: auto minmax(0, 1fr);
              gap: 9px;
              padding: clamp(9px, 1.5vw, 13px);
              border-radius: 16px;
            }

            .halvlitere-mini {
              width: clamp(32px, 6vw, 48px);
              border-width: 2px;
            }

            .halvlitere-name {
              font-size: clamp(18px, 4.2vw, 32px);
            }

            .halvlitere-note {
              margin-top: 4px;
              font-size: clamp(10px, 2vw, 14px);
            }

            .halvlitere-footer {
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: clamp(8px, 1.4vw, 12px);
            }

            .halvlitere-stat {
              padding: clamp(10px, 2vw, 14px);
              border-radius: 15px;
            }

            .halvlitere-stat strong {
              font-size: clamp(24px, 5.2vw, 42px);
            }

            .halvlitere-stat span {
              font-size: clamp(9px, 1.8vw, 13px);
              line-height: 1.15;
            }
          }
        `}
      </style>

      <section className="halvlitere-card" style={{ backgroundColor: theme.card }}>
        <header className="halvlitere-head">
          <div>
            <div className="halvlitere-kicker">{STUDY_YEARS} studiear i Trondheim</div>
            <h1 className="halvlitere-title">mjØLketanken</h1>
          </div>
          <div className="halvlitere-total">
            <div className="halvlitere-total-number">{totalHalvlitere.toLocaleString("nb-NO")}</div>
            <div className="halvlitere-total-label">felles halvlitere</div>
          </div>
        </header>

        <div className="halvlitere-stage">
          <div className="halvlitere-tank-wrap" aria-label={`mjØLketanken: ${totalHalvlitere} halvlitere`}>
            <div className="halvlitere-handle" aria-hidden />
            <div className="halvlitere-tank">
              <div className="halvlitere-beer">
                <div className="halvlitere-wave back" />
                <div className="halvlitere-wave" />
                {Array.from({ length: 18 }).map((_, i) => (
                  <span
                    key={i}
                    className="halvlitere-bubble"
                    style={
                      {
                        "--x": `${10 + ((i * 17) % 78)}%`,
                        "--y": `${4 + ((i * 13) % 28)}%`,
                        "--size": `${8 + (i % 5) * 4}px`,
                        "--duration": `${4.8 + (i % 6) * 0.7}s`,
                        "--delay": `${-1 * ((i * 0.53) % 5)}s`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
              <div className="halvlitere-tank-text">
                <strong>{liters.toLocaleString("nb-NO")} L</strong>
                <span>kollektivt skvulp</span>
              </div>
            </div>
          </div>

          <div className="halvlitere-contributions">
            {pours.map((member, i) => {
              const fill = 62 + ((i * 7) % 24);
              return (
                <article key={member.name} className="halvlitere-pour">
                  <div className="halvlitere-mini" aria-hidden>
                    <div
                      className="halvlitere-mini-fill"
                      style={
                        {
                          "--fill": `${Math.max(48, Math.min(88, fill))}%`,
                          "--accent": member.accent,
                        } as React.CSSProperties
                      }
                    />
                  </div>
                  <div>
                    <div className="halvlitere-name">{member.name}</div>
                    <div className="halvlitere-note">{member.note}</div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <footer className="halvlitere-footer">
          <div className="halvlitere-stat">
            <strong>{weeklyPace.toFixed(1)}</strong>
            <span>halvlitere per uke sammen</span>
          </div>
          <div className="halvlitere-stat">
            <strong>{monthlyPace.toFixed(0)}</strong>
            <span>halvlitere per måned</span>
          </div>
          <div className="halvlitere-stat">
            <strong>{pours.length}</strong>
            <span>medlemmer i skvulpet</span>
          </div>
        </footer>
      </section>
    </main>
  );
}
