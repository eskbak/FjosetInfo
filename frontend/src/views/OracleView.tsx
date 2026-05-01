import { useEffect, useMemo, useState } from "react";
import type { Theme } from "../types";

const prophecies = [
  {
    omen: "Kaffekoppen lytter",
    text: "En halvfull kopp vil fortelle mer om dagen enn kalenderen gjør.",
    verdict: "Stol på pausen mellom to slurker.",
  },
  {
    omen: "Døra nøler",
    text: "Den som står i døråpningen lengst, bærer dagens uuttalte beslutning.",
    verdict: "Enten gå inn eller bli et varsel.",
  },
  {
    omen: "Bussen smiler falskt",
    text: "En avgang vil se trygg ut helt til skoene må delta i planleggingen.",
    verdict: "Legg inn tre minutter ydmykhet.",
  },
  {
    omen: "Kjøleskapet er et speil",
    text: "Noen vil åpne kjøleskapet uten sult og finne en tanke som nesten var ferdig.",
    verdict: "Lukk døra før innsikten rømmer.",
  },
  {
    omen: "Stolen kjenner vekten",
    text: "Den beste ideen kommer fra den stolen som knirker mest anklagende.",
    verdict: "Sitt der med respekt.",
  },
  {
    omen: "Skjermen blunker",
    text: "En liten detalj på skjermen vil være viktigere enn den later som.",
    verdict: "Se én gang til før du går videre.",
  },
  {
    omen: "Været går personlig",
    text: "Dagens vær vil oppføre seg som en kommentar, ikke som et fenomen.",
    verdict: "Ikke svar høyt.",
  },
  {
    omen: "Ledningen husker",
    text: "En kabel som ingen tør fjerne, holder på en hemmelig balanse.",
    verdict: "Ikke rydd for aggressivt.",
  },
  {
    omen: "Planen er myk",
    text: "Dagens plan vil ikke brekke. Den vil bøye seg og late som det var meningen.",
    verdict: "Bøy med verdighet.",
  },
  {
    omen: "Samtalen får hale",
    text: "En enkel kommentar vil dra etter seg noe større enn forventet.",
    verdict: "Hold i riktig ende.",
  },
  {
    omen: "Stillheten arbeider",
    text: "Det viktigste svaret kommer etter at alle tror samtalen er ferdig.",
    verdict: "Ikke fyll rommet for raskt.",
  },
  {
    omen: "Snacken velger eier",
    text: "Noe knasende vil vandre gjennom rommet og endre stemningen uten møteinnkalling.",
    verdict: "Følg smulene.",
  },
  {
    omen: "Møtet later som",
    text: "Et møte som virker lite, bærer en stor beslutning forkledd som praktisk info.",
    verdict: "Lytt etter det som ikke står i agendaen.",
  },
  {
    omen: "Cache spøker",
    text: "Fortiden vil dukke opp på skjermen og påstå at den fortsatt er nåtid.",
    verdict: "Oppdater mer brutalt.",
  },
  {
    omen: "Lyset skifter mening",
    text: "Når rommet plutselig føles annerledes, er det ikke bare lampene.",
    verdict: "Sjekk både været og stemningen.",
  },
  {
    omen: "Nøklene søker drama",
    text: "En liten ting som burde ligge fast, vil prøve å bli en hovedperson.",
    verdict: "Gi den en fast plass.",
  },
  {
    omen: "Tiden sklir sidelengs",
    text: "Ti minutter vil oppføre seg som to, bortsett fra når bussen nærmer seg.",
    verdict: "Ikke stol på intern klokke.",
  },
  {
    omen: "Oppvasken observerer",
    text: "Noe i kjøkkenområdet vil stille et moralsk spørsmål uten ord.",
    verdict: "Svar med handling.",
  },
  {
    omen: "Vinduet gir råd",
    text: "Et blikk ut av vinduet vil løse mindre enn ønsket, men mer enn forventet.",
    verdict: "Ta blikket likevel.",
  },
  {
    omen: "Fokuset skifter eier",
    text: "Dagens viktigste oppgave er ikke den som roper høyest.",
    verdict: "Velg den som gir minst etterslep.",
  },
  {
    omen: "Gulvet samler planer",
    text: "Den beste løsningen blir først synlig når noen begynner å gå mens de snakker.",
    verdict: "La tanken få bein.",
  },
  {
    omen: "Meldingen lander skjevt",
    text: "En beskjed vil bli forstått riktig av feil grunn.",
    verdict: "Presiser før det blir tradisjon.",
  },
  {
    omen: "Laderen blir politisk",
    text: "Strømtilgang vil avsløre hvem som planla dagen og hvem som bare møtte opp.",
    verdict: "Del watt med måte.",
  },
  {
    omen: "Humøret får værmelding",
    text: "Dagens indre klima: delvis skjerpet, lokalt tåkete, mulighet for plutselig entusiasme.",
    verdict: "Kle tankene lagvis.",
  },
  {
    omen: "En snarvei åpner seg",
    text: "Det finnes en enklere løsning, men den krever at noen innrømmer at den gamle var rar.",
    verdict: "Vær modig nok til å forenkle.",
  },
  {
    omen: "Rytmen finner rommet",
    text: "Alt går bedre når den første lille oppgaven faller på plass.",
    verdict: "Start med den som nesten gjør seg selv.",
  },
  {
    omen: "En idé later som tull",
    text: "Det som først høres useriøst ut, kan være den mest presise diagnosen.",
    verdict: "Le, men noter.",
  },
  {
    omen: "Rommet krever offer",
    text: "For at noe skal fungere i dag, må én uviktig ting få være litt stygg.",
    verdict: "Ikke poler alt.",
  },
  {
    omen: "Avgjørelsen modner",
    text: "En beslutning som virker umulig nå, blir latterlig enkel etter mat.",
    verdict: "Ikke vedta på tom mage.",
  },
  {
    omen: "Det ukjente får navn",
    text: "Når problemet får riktig navn, mister det halvparten av makten sin.",
    verdict: "Navngi presist, ikke pent.",
  },
  {
    omen: "Systemet ber om nåde",
    text: "For mange små forbedringer på én gang vil gjøre maskinen filosofisk.",
    verdict: "Endre én ting og observer.",
  },
  {
    omen: "En gammel feil smiler",
    text: "Noe som har virket lenge, har ikke nødvendigvis vært riktig.",
    verdict: "Takknemlighet først, reparasjon etterpå.",
  },
  {
    omen: "Sofaen holder råd",
    text: "Den beste pausen er ikke flukt, men vedlikehold av dømmekraft.",
    verdict: "Sitt ned før du blir dum.",
  },
  {
    omen: "En tanke banker på",
    text: "Den ideen som kommer tilbake tre ganger, ber ikke om lov lenger.",
    verdict: "Gi den et dokument.",
  },
  {
    omen: "Rotet organiserer seg",
    text: "Det som ser ut som kaos, har en intern logikk. Den er bare dårlig på kommunikasjon.",
    verdict: "Sorter etter friksjon.",
  },
  {
    omen: "Dagen har en skjult boss",
    text: "Den vanskeligste delen av dagen er liten nok til at alle undervurderer den.",
    verdict: "Ta den tidlig.",
  },
  {
    omen: "Notatet blir profeti",
    text: "En tilfeldig setning skrevet ned i dag vil spare noen for irritasjon senere.",
    verdict: "Skriv den før den virker viktig.",
  },
  {
    omen: "Energien kommer bakfra",
    text: "Motivasjonen dukker ikke opp først. Den følger etter handlingen og later som den ledet.",
    verdict: "Begynn uten seremoni.",
  },
  {
    omen: "Et kompromiss glitrer",
    text: "Det nest beste valget kan vise seg å være det mest robuste.",
    verdict: "Ikke sørg over optimalitet.",
  },
  {
    omen: "Detaljen er en dør",
    text: "En liten irritasjon peker mot et større mønster som ber om å bli ryddet.",
    verdict: "Følg irritasjonen forsiktig.",
  },
];

const ORACLE_QUEUE_KEY = "fjosetOracleRemaining";
const ORACLE_LAST_KEY = "fjosetOracleLast";
const ORACLE_DAILY_KEY = "fjosetOracleDaily";

function shuffle(values: number[]) {
  const shuffled = [...values];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function makeQueue(previousIndex: number | null) {
  const indices = prophecies.map((_, i) => i);
  const queue = shuffle(indices);
  if (previousIndex !== null && queue.length > 1 && queue[0] === previousIndex) {
    [queue[0], queue[1]] = [queue[1], queue[0]];
  }
  return queue;
}

function readQueue() {
  try {
    const raw = window.localStorage.getItem(ORACLE_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (
      Array.isArray(parsed) &&
      parsed.every((value) => Number.isInteger(value) && value >= 0 && value < prophecies.length)
    ) {
      return parsed as number[];
    }
  } catch {
    /* ignore broken localStorage state */
  }
  return [];
}

function pickProphecy() {
  if (typeof window === "undefined") return prophecies[0];

  const today = new Date().toLocaleDateString("sv-SE");
  try {
    const rawDaily = window.localStorage.getItem(ORACLE_DAILY_KEY);
    const daily = rawDaily ? JSON.parse(rawDaily) : null;
    if (
      daily?.date === today &&
      Number.isInteger(daily.index) &&
      daily.index >= 0 &&
      daily.index < prophecies.length
    ) {
      return prophecies[daily.index];
    }
  } catch {
    /* ignore broken localStorage state */
  }

  let queue = readQueue();
  const previousRaw = window.localStorage.getItem(ORACLE_LAST_KEY);
  const previousIndex = previousRaw === null ? null : Number(previousRaw);

  if (queue.length === 0) {
    queue = makeQueue(Number.isInteger(previousIndex) ? previousIndex : null);
  }

  const nextIndex = queue.shift() ?? 0;
  window.localStorage.setItem(ORACLE_QUEUE_KEY, JSON.stringify(queue));
  window.localStorage.setItem(ORACLE_LAST_KEY, String(nextIndex));
  window.localStorage.setItem(ORACLE_DAILY_KEY, JSON.stringify({ date: today, index: nextIndex }));
  return prophecies[nextIndex] ?? prophecies[0];
}

export default function OracleView({ theme }: { theme: Theme }) {
  const [now, setNow] = useState(() => new Date());
  const [prophecy] = useState(() => pickProphecy());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const timeText = useMemo(
    () =>
      new Intl.DateTimeFormat("nb-NO", {
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(now),
    [now]
  );

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
          @keyframes oraclePulse {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-6px) scale(1.025); }
          }

          @keyframes oracleMist {
            0%, 100% { transform: translateX(-5%) rotate(-4deg); opacity: 0.52; }
            50% { transform: translateX(5%) rotate(4deg); opacity: 0.82; }
          }

          @keyframes oracleScan {
            from { transform: translateY(-120%); }
            to { transform: translateY(520%); }
          }

          .oracle-card-view {
            flex: 1;
            min-height: 0;
            position: relative;
            overflow: hidden;
            display: grid;
            grid-template-rows: auto 1fr auto;
            gap: clamp(14px, 2.4vh, 28px);
            padding: clamp(20px, 3.6vw, 46px);
            border-radius: clamp(28px, 5vw, 56px);
            border: 1px solid rgba(186, 230, 253, 0.34);
            background:
              radial-gradient(circle at 50% 10%, rgba(186,230,253,0.24), transparent 24%),
              radial-gradient(circle at 18% 74%, rgba(168,85,247,0.2), transparent 28%),
              radial-gradient(circle at 82% 66%, rgba(14,165,233,0.18), transparent 30%),
              linear-gradient(155deg, #111827 0%, #2f1747 50%, #061a26 100%);
            color: #f8fafc;
            box-shadow: 0 28px 90px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12);
          }

          .oracle-card-view::before {
            content: "";
            position: absolute;
            inset: 18px;
            border-radius: clamp(22px, 4vw, 44px);
            border: 1px solid rgba(255,255,255,0.09);
            background: linear-gradient(135deg, rgba(255,255,255,0.08), transparent 34%, rgba(125,211,252,0.08));
            pointer-events: none;
          }

          .oracle-card-view::after {
            content: "";
            position: absolute;
            left: -20%;
            top: -40%;
            width: 42%;
            height: 180%;
            border-radius: 999px;
            background: linear-gradient(90deg, transparent, rgba(125,211,252,0.1), transparent);
            animation: oracleScan 7s linear infinite;
            pointer-events: none;
          }

          .oracle-head {
            position: relative;
            z-index: 1;
            display: grid;
            gap: 4px;
            text-align: center;
            text-transform: uppercase;
          }

          .oracle-eyebrow {
            color: #7dd3fc;
            font-size: clamp(13px, 1.8vw, 22px);
            font-weight: 900;
            letter-spacing: 0.14em;
          }

          .oracle-title {
            margin: 0;
            font-size: clamp(40px, 6.6vw, 86px);
            line-height: 0.95;
            font-weight: 950;
            letter-spacing: 0;
            text-shadow: 0 6px 0 #7f1d1d, 0 20px 36px rgba(0,0,0,0.42);
          }

          .oracle-body {
            position: relative;
            z-index: 1;
            min-height: 0;
            display: grid;
            grid-template-columns: minmax(260px, 0.68fr) minmax(0, 1.32fr);
            align-items: center;
            gap: clamp(24px, 5vw, 74px);
          }

          .oracle-orb-wrap {
            position: relative;
            display: grid;
            place-items: center;
            min-height: 0;
            padding: clamp(20px, 3vw, 34px) clamp(14px, 2.6vw, 28px) clamp(54px, 7vw, 82px);
            border-radius: 999px;
            background: radial-gradient(circle at 50% 42%, rgba(125,211,252,0.16), rgba(2,6,23,0.1) 58%, transparent 72%);
          }

          .oracle-orb {
            position: relative;
            width: min(32vw, 390px);
            min-width: 240px;
            aspect-ratio: 1;
            display: grid;
            place-items: center;
            border-radius: 50%;
            overflow: hidden;
            border: 1px solid rgba(224, 242, 254, 0.6);
            background:
              radial-gradient(circle at 31% 22%, rgba(255,255,255,0.95) 0 6%, rgba(255,255,255,0.58) 7% 15%, transparent 16%),
              radial-gradient(circle at 66% 34%, rgba(186,230,253,0.48), transparent 24%),
              radial-gradient(circle at 42% 66%, rgba(168,85,247,0.34), transparent 34%),
              radial-gradient(circle at 50% 45%, rgba(125,211,252,0.28), rgba(30,41,59,0.36) 52%, rgba(2,6,23,0.84) 83%);
            box-shadow: 0 0 54px rgba(125,211,252,0.5), inset 18px 22px 32px rgba(255,255,255,0.16), inset -22px -30px 52px rgba(2,6,23,0.62), 0 34px 70px rgba(0,0,0,0.44);
            animation: oraclePulse 7s ease-in-out infinite;
          }

          .oracle-orb::before {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background: radial-gradient(circle at 28% 20%, rgba(255,255,255,0.5), transparent 18%), linear-gradient(130deg, rgba(255,255,255,0.22), transparent 38% 62%, rgba(255,255,255,0.08));
            mix-blend-mode: screen;
            pointer-events: none;
          }

          .oracle-orb-mist {
            position: absolute;
            inset: 22% 12% 18%;
            border-radius: 999px;
            background:
              radial-gradient(ellipse at 28% 48%, rgba(224,242,254,0.28), transparent 34%),
              radial-gradient(ellipse at 66% 54%, rgba(168,85,247,0.24), transparent 36%),
              linear-gradient(90deg, transparent, rgba(186,230,253,0.22), transparent);
            filter: blur(8px);
            animation: oracleMist 9s ease-in-out infinite;
          }

          .oracle-orb-star {
            position: absolute;
            width: 18%;
            aspect-ratio: 1;
            right: 23%;
            top: 24%;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(255,255,255,0.94), rgba(125,211,252,0.42) 34%, transparent 68%);
            filter: blur(0.3px);
          }

          .oracle-orb-base {
            position: absolute;
            bottom: clamp(24px, 4.6vw, 46px);
            width: min(31vw, 350px);
            min-width: 220px;
            height: clamp(42px, 5.4vw, 66px);
            border-radius: 50%;
            background:
              radial-gradient(ellipse at 50% 22%, rgba(186,230,253,0.42), transparent 34%),
              linear-gradient(180deg, rgba(51,65,85,0.94), rgba(2,6,23,0.96));
            box-shadow: inset 0 8px 16px rgba(255,255,255,0.1), 0 22px 42px rgba(0,0,0,0.38);
          }

          .oracle-orb-shadow {
            position: absolute;
            bottom: clamp(10px, 2.6vw, 22px);
            width: min(36vw, 390px);
            min-width: 250px;
            height: 34px;
            border-radius: 50%;
            background: radial-gradient(ellipse, rgba(0,0,0,0.46), transparent 70%);
            filter: blur(6px);
          }

          .oracle-message {
            display: grid;
            gap: clamp(14px, 2.3vh, 24px);
            padding: clamp(22px, 3vw, 42px);
            border: 1px solid rgba(186,230,253,0.24);
            border-radius: clamp(26px, 4vw, 46px);
            background:
              radial-gradient(circle at 16% 0%, rgba(125,211,252,0.14), transparent 34%),
              linear-gradient(180deg, rgba(2,6,23,0.5), rgba(15,23,42,0.34));
            box-shadow: 0 20px 58px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.08);
          }

          .oracle-omen {
            justify-self: start;
            padding: 10px 18px;
            border: 1px solid rgba(125,211,252,0.42);
            border-radius: 999px;
            background: rgba(125,211,252,0.13);
            color: #bae6fd;
            font-size: clamp(15px, 2vw, 25px);
            line-height: 1.1;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.09em;
          }

          .oracle-text {
            margin: 0;
            font-size: clamp(30px, 5vw, 72px);
            line-height: 1.05;
            font-weight: 930;
          }

          .oracle-verdict {
            margin: 0;
            color: #bae6fd;
            font-size: clamp(18px, 2.8vw, 36px);
            line-height: 1.15;
            font-weight: 850;
          }

          .oracle-footer {
            position: relative;
            z-index: 1;
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 0 clamp(10px, 2vw, 24px);
            color: rgba(255,255,255,0.72);
            font-size: clamp(13px, 1.8vw, 22px);
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }

          @media (orientation: portrait), (max-width: 820px) {
            .oracle-card-view {
              border-radius: 34px;
              grid-template-rows: auto 1fr auto;
              gap: clamp(12px, 2vh, 24px);
              padding: clamp(18px, 4.4vw, 34px);
            }

            .oracle-body {
              grid-template-columns: 1fr;
              grid-template-rows: auto auto;
              align-content: start;
              gap: clamp(16px, 2.6vh, 26px);
              text-align: center;
            }

            .oracle-title {
              font-size: clamp(52px, 12vw, 104px);
            }

            .oracle-orb {
              width: min(54vw, 330px);
              min-width: 200px;
            }

            .oracle-message {
              align-self: start;
              padding: clamp(18px, 3vh, 30px);
            }

            .oracle-omen {
              justify-self: center;
            }

            .oracle-text {
              font-size: clamp(30px, 6.4vw, 58px);
              line-height: 1.08;
            }

            .oracle-verdict {
              font-size: clamp(18px, 4vw, 32px);
            }

            .oracle-footer {
              flex-direction: column;
              align-items: center;
              text-align: center;
            }
          }
        `}
      </style>

      <section className="oracle-card-view" style={{ backgroundColor: theme.card }}>
        <header className="oracle-head">
          <div className="oracle-eyebrow">Dagens varsling</div>
          <h1 className="oracle-title">Fjøs-Orakelet</h1>
        </header>

        <div className="oracle-body">
          <div className="oracle-orb-wrap">
            <div className="oracle-orb-shadow" />
            <div className="oracle-orb-base" />
            <div className="oracle-orb">
              <span className="oracle-orb-mist" />
              <span className="oracle-orb-star" />
            </div>
          </div>

          <article className="oracle-message">
            <div className="oracle-omen">{prophecy.omen}</div>
            <p className="oracle-text">{prophecy.text}</p>
            <p className="oracle-verdict">Anbefaling: {prophecy.verdict}</p>
          </article>
        </div>

        <footer className="oracle-footer">
          <span>{timeText}</span>
        </footer>
      </section>
    </main>
  );
}
