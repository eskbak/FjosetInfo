// frontend/src/views/DrinksMenu.tsx
import type { Theme, Colors } from "../types";
import placeholderPng from "../assets/drinks/placeholder.png";
import walkingCow from "../assets/drinks/cowWalking.gif";

type Drink = {
  name: string;
  imageUrl?: string;  // transparent PNG
  accent?: string;    // optional hex for glows per item
};

export default function DrinksMenu({
  theme,
  colors,
  logoUrl = "/assets/bar-logo.svg",
  drinks = [
    { name: "AureBrekkeren",  imageUrl: "/assets/drinks/espresso-martini.png", accent: "#ffd27a" },
    { name: "Eskils Revenge", imageUrl: "/assets/drinks/aperol-spritz.png",    accent: "#ffb37a" },
    { name: "Whisky Sour",    imageUrl: "/assets/drinks/whisky-sour.png",      accent: "#f8e08e" },
    { name: "Mojito",         imageUrl: "/assets/drinks/mojito.png",           accent: "#86e39b" },
    { name: "Gin & Tonic",    imageUrl: "/assets/drinks/gt.png",               accent: "#c6f2ff" },
    { name: "Virgin Mule",    imageUrl: "/assets/drinks/virgin-mule.png",      accent: "#b7f07b" },
  ],
}: {
  theme: Theme;
  colors: Colors;
  logoUrl?: string;
  drinks?: Drink[];
}) {
  const vpad = "clamp(16px, 3vw, 36px)";
  const topbarH = "clamp(56px, 8vh, 90px)";

  return (
    <div
      style={{
        ...wrap,
        // @ts-ignore
        ["--vpad" as any]: vpad,
        ["--topbar-h" as any]: topbarH,
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Amatic+SC:wght@700&display=swap');`}</style>
      <style>{css()}</style>

      {/* SKY & TEXTURES */}
      <div style={skyGradient} />
      <div style={sunGlow} />
      <div style={woodGrain} />
      <div style={cowSpots} className="dm-noise" />

      {/* TOP BAR
      <div style={{ ...topBar, height: topbarH }}>
        <img
          src={logoUrl}
          alt="Bar logo"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
          style={logoImg}
        />
      </div> */}

      {/* LIST (content is above cow) */}
      <div style={list}>
        {drinks.slice(0, 6).map((d, i) => (
          <Row key={i} index={i} drink={d} />
        ))}
      </div>

      {/* BOTTOM FIELD */}
      <GrassField />

      {/* COW (behind content) */}
      <CowWalker />
    </div>
  );
}

/* ---------------- WOOD SIGN ---------------- */

function WoodSign({
  text,
  alignRight,
}: {
  text: string;
  alignRight?: boolean;
}) {
  return (
    <div
      style={{
        ...signWrap,
        alignSelf: alignRight ? "flex-end" : "flex-start",
        transform: `rotate(${alignRight ? -0.6 : 0.6}deg)`,
      }}
    >
      {/* ropes (auto width; anchored to wrapper corners) */}
      <div style={{ ...rope, left: 12 }} />
      <div style={{ ...rope, right: 12 }} />

      {/* two planks; width = text width + padding */}
      <div style={signGrid}>
        <div style={plankRowTop} />
        <div style={plankRowBot} />

        {/* centered label across both planks */}
        <span style={signText}>{text}</span>

        {/* nails (four corners) */}
        <span style={{ ...nail, left: 10, top: 10 }} />
        <span style={{ ...nail, right: 10, top: 10 }} />
        <span style={{ ...nail, left: 10, bottom: 10 }} />
        <span style={{ ...nail, right: 10, bottom: 10 }} />
      </div>
    </div>
  );
}

/* ---------------- ROW ---------------- */

function Row({ index, drink }: { index: number; drink: Drink }) {
  const pngOnLeft = index % 2 === 1; // true → PNG left, false → PNG right
  const accent = drink.accent || defaultAccent(index);

  // cluster to the side where the PNG is
  const sideJustify: React.CSSProperties = {
    justifyContent: pngOnLeft ? "flex-start" : "flex-end",
  };

  const Img = (
    <div className="dm-float" style={{ ...imgWrap }}>
      <div style={imgGlow(accent)} />
      <img src={placeholderPng} alt={drink.name} style={img} />
    </div>
  );

  const Sign = (
    <div style={textWrap}>
      <WoodSign text={drink.name} alignRight={!pngOnLeft} />
    </div>
  );

  return (
    <div
      className="dm-row"
      style={{
        ...rowBase,
        ...sideJustify,
        animationDelay: `${0.08 * index}s`,
      }}
    >
      {/* order: if PNG on left → [PNG, SIGN], else → [SIGN, PNG] */}
      {pngOnLeft ? (
        <>
          {Img}
          {Sign}
        </>
      ) : (
        <>
          {Sign}
          {Img}
        </>
      )}

      <Sparkles />
    </div>
  );
}


/* ---------------- SPARKLES ---------------- */

function Sparkles() {
  const dots = Array.from({ length: 8 }, () => ({
    left: `${Math.random() * 90 + 5}%`,
    top: `${Math.random() * 70 + 15}%`,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 1.0,
    alpha: Math.random() * 0.35 + 0.2,
  }));
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {dots.map((d, i) => (
        <span
          key={i}
          className="dm-spark"
          style={{
            position: "absolute",
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.8)",
            filter: "blur(0.6px)",
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ---------------- GRASS FIELD (wavy horizon) ---------------- */

function GrassField() {
  const W = 1200;
  const H = 500;

  const baseY = 140;
  const amp1 = 16;
  const freq1 = 2.2;
  const amp2 = 8;
  const freq2 = 5.2;
  const samples = 120;

  const points: Array<[number, number]> = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = t * W;
    const y =
      baseY +
      amp1 * Math.sin(t * Math.PI * 2 * freq1) +
      amp2 * Math.sin(t * Math.PI * 2 * freq2 + Math.PI / 3);
    points.push([x, y]);
  }

  const pathTop = `M 0 ${H} L 0 ${points[0][1].toFixed(2)} ` +
    points.map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ") +
    ` L ${W} ${H} Z`;

  const pathMid = `M 0 ${H} L 0 ${(baseY + 10).toFixed(2)} ` +
    points.map(([x, y]) => `L ${x.toFixed(2)} ${(y + 10).toFixed(2)}`).join(" ") +
    ` L ${W} ${H} Z`;

  const pathBack = `M 0 ${H} L 0 ${(baseY + 22).toFixed(2)} ` +
    points.map(([x, y]) => `L ${x.toFixed(2)} ${(y + 22).toFixed(2)}`).join(" ") +
    ` L ${W} ${H} Z`;

  const bladeCount = 80;
  const blades = Array.from({ length: bladeCount }, (_, i) => {
    const t = i / (bladeCount - 1);
    const x = t * W;
    const y =
      baseY +
      amp1 * Math.sin(t * Math.PI * 2 * freq1) +
      amp2 * Math.sin(t * Math.PI * 2 * freq2 + Math.PI / 3);
    const h = 6 + Math.random() * 6; // 6–12px
    const tilt = (Math.random() - 0.5) * 6;
    const shade = Math.random() < 0.5 ? "#6fb873" : "#83cf86";
    const delay = (i % 7) * 0.12;

    return (
      <g
        key={i}
        className="bladeSwing"
        style={{ transformOrigin: "center bottom", animationDelay: `${delay}s` }}
        transform={`translate(${x.toFixed(2)}, ${y.toFixed(2)}) rotate(${tilt.toFixed(2)})`}
      >
        <line x1="0" y1="0" x2="0" y2={-h} stroke={shade} strokeWidth="2" strokeLinecap="round" />
        <line x1="0" y1={-h * 0.6} x2="1.5" y2={-h * 0.75} stroke={shade} strokeWidth="2" strokeLinecap="round" />
      </g>
    );
  });

  return (
    <div style={grassWrap} aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={grassSvg}>
        <path d={pathBack} fill="#234626" opacity="0.9" />
        <path d={pathMid}  fill="#2f5b31" opacity="0.95" />
        <path d={pathTop}  fill="url(#grassGrad)" />
        <defs>
          <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#3b6f3d" />
            <stop offset="100%" stopColor="#2c5a31" />
          </linearGradient>
        </defs>
        {blades}
      </svg>
    </div>
  );
}

/* ---------------- SINGLE WALKING COW (behind content) ---------------- */

function CowWalker() {
  return (
    <img
      src={walkingCow}
      alt="Walking cow"
      className="cow-walk"
      style={cowImg}
    />
  );
}

/* ---------------- STYLE SYSTEM ---------------- */

const wrap: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  background: "#0b0f14",
  color: "#fffdf7",
  fontFamily: `'Amatic SC', system-ui, -apple-system, Segoe UI, Roboto, sans-serif`,
  display: "flex",
  flexDirection: "column",
  padding: "var(--vpad) clamp(18px, 3vw, 36px)",
  boxSizing: "border-box",
};

const skyGradient: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(180deg, #2b4b73 0%, #3e6ba1 32%, #74a6d4 60%, #e9e0cf 100%)",
  zIndex: 0,
};

const sunGlow: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  transform: "translateX(-50%)",
  bottom: "28vh",
  width: "80vh",
  height: "80vh",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(255,223,158,0.35), transparent 60%)",
  filter: "blur(20px)",
  zIndex: 0,
};

const woodGrain: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0 1px, rgba(0,0,0,0) 1px 5px)",
  mixBlendMode: "soft-light",
  zIndex: 0,
};

const cowSpots: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at 15% 20%, rgba(0,0,0,0.05), transparent 40%)," +
    "radial-gradient(circle at 85% 15%, rgba(0,0,0,0.045), transparent 42%)," +
    "radial-gradient(circle at 30% 75%, rgba(0,0,0,0.04), transparent 38%)," +
    "radial-gradient(circle at 70% 80%, rgba(0,0,0,0.05), transparent 40%)",
  mixBlendMode: "multiply",
  zIndex: 0,
};

const topBar: React.CSSProperties = {
  position: "relative",
  zIndex: 5,
  display: "flex",
  alignItems: "center",
  gap: 14,
  marginBottom: "clamp(6px, 1.2vw, 14px)",
};

const logoImg: React.CSSProperties = {
  height: "clamp(32px, 5.6vw, 64px)",
  width: "auto",
  objectFit: "contain",
  filter: "drop-shadow(0 2px 6px rgba(0,0,0,.25))",
};

const title: React.CSSProperties = {
  position: "relative",
  margin: 0,
  fontSize: "clamp(36px, 6.2vw, 88px)",
  letterSpacing: 1.5,
  color: "#f9f5ef",
  textShadow: "0 2px 0 rgba(0,0,0,0.25)",
};

const shine: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.35) 40%, transparent 60%)",
  mixBlendMode: "soft-light",
  pointerEvents: "none",
  borderRadius: 6,
};

const list: React.CSSProperties = {
  position: "relative",
  zIndex: 4, // content ABOVE cow
  height: "calc(90vh - var(--topbar-h) - (2 * var(--vpad)))",
  display: "grid",
  gridTemplateRows: "repeat(6, 1fr)",
  gap: "clamp(2px, 0.7vh, 8px)",
};

const rowBase: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: "clamp(12px, 3.2vw, 36px)",
  padding: "0 clamp(8px, 2vw, 28px)",
  // no space-between — we cluster to one side via justifyContent in Row()
  animation: "dm-enter 0.56s cubic-bezier(.2,.65,.2,1) both",
};

const imgWrap: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 0,
  flex: "0 0 auto",
  zIndex: 4,
};

function imgGlow(accent: string): React.CSSProperties {
  return {
    position: "absolute",
    inset: "-16% -16% -12% -16%",
    borderRadius: "32px",
    background: `radial-gradient(60% 60% at 50% 45%, ${rgba(accent, 0.35)}, transparent 70%)`,
    filter: "blur(12px)",
    pointerEvents: "none",
  };
}

const img: React.CSSProperties = {
  height: "calc((100vh - var(--topbar-h) - (2 * var(--vpad))) / 6 * 0.80)",
  width: "auto",
  objectFit: "contain",
  filter: "drop-shadow(0 18px 34px rgba(0,0,0,0.35))",
  transform: "translateZ(0)",
};

const textWrap: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  minWidth: 0,
  zIndex: 4,
};


/* ---------- wooden sign styles ---------- */

// SIGN WRAPPER (auto width)
const signWrap: React.CSSProperties = {
  position: "relative",
  display: "inline-block",
  paddingTop: 22,          // room for ropes
  width: "fit-content",    // <-- key: shrink to content
  whiteSpace: "nowrap",    // keep single line (change if you want wrapping)
  zIndex: 4,
};

// Two ropes hanging down from top edge
const rope: React.CSSProperties = {
  position: "absolute",
  top: 0,
  width: 2,
  height: 22,
  background: "linear-gradient(180deg, #c6a377, #8c6b43)",
  boxShadow: "0 0 2px rgba(0,0,0,0.25)",
  borderRadius: 2,
};

// Grid container holding two planks; width = text + padding via fit-content
const signGrid: React.CSSProperties = {
  position: "relative",
  display: "grid",
  gridTemplateRows: "1fr 1fr",
  rowGap: 2,                              // tiny separation between planks
  alignItems: "stretch",
  width: "fit-content",                   // <-- key
  padding: "0",                           // padding built into planks
  // Horizontal padding applied via CSS var for both planks
  // @ts-ignore
  ["--padX" as any]: "110px",
  ["--padY" as any]: "16px",
};

// Realistic wood textures per plank (slightly different tones)
const commonPlank: React.CSSProperties = {
  position: "relative",
  padding: "var(--padY) var(--padX)",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.3)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.2), 0 8px 20px rgba(0,0,0,0.35)",
  // keep width tight to content
  width: "fit-content",
};

const plankRowTop: React.CSSProperties = {
  ...commonPlank,
  background:
    "linear-gradient(180deg, #8a5a33 0%, #7a4d2b 40%, #6c4426 100%), " +
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, rgba(0,0,0,0) 1px 12px)",
};

const plankRowBot: React.CSSProperties = {
  ...commonPlank,
  background:
    "linear-gradient(180deg, #7f532f 0%, #6f4728 40%, #613f23 100%), " +
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.045) 0 1px, rgba(0,0,0,0) 1px 10px)",
};

// Text centered over both planks
const signText: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  pointerEvents: "none",
  color: "#fff3e4",
  textShadow: "0 2px 0 rgba(0,0,0,0.35)",
  fontSize: "clamp(24px, 3.6vh, 52px)",
  letterSpacing: 0.6,
  padding: "0 8px", // slight breathing space visually
};

// Nails for the corners
const nail: React.CSSProperties = {
  position: "absolute",
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "radial-gradient(circle, #d7d7d7 30%, #9a9a9a 70%)",
  boxShadow: "0 1px 0 rgba(0,0,0,0.4)",
};


/* ---------- farm details ---------- */

const grassWrap: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  height: "24vh",
  zIndex: 2,
  overflow: "hidden",
};

const grassSvg: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  display: "block",
};

/* ---------- walking cow (behind content) ---------- */

const cowImg: React.CSSProperties = {
  position: "absolute",
  bottom: "7.2vh",
  height: "24vh",
  width: "auto",
  imageRendering: "auto",
  filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.35))",
  willChange: "transform",
  animation: "cow-walk 25s linear infinite",
  zIndex: 3, // under list (4) and topBar (5); above grass (2)
  pointerEvents: "none",
};

/* ---------- helpers ---------- */

function defaultAccent(i: number): string {
  const palette = ["#ffd27a", "#ffb37a", "#f8e08e", "#86e39b", "#c6f2ff", "#b7f07b"];
  return palette[i % palette.length];
}

function rgba(hex: string, a: number) {
  if (!hex) return `rgba(255,255,255,${a})`;
  const c = hex.replace("#", "");
  const to = (s: string) => parseInt(s, 16);
  if (c.length === 3) {
    const r = to(c[0] + c[0]), g = to(c[1] + c[1]), b = to(c[2] + c[2]);
    return `rgba(${r},${g},${b},${a})`;
  }
  const r = to(c.slice(0, 2)), g = to(c.slice(2, 4)), b = to(c.slice(4, 6));
  return `rgba(${r},${g},${b},${a})`;
}

/* ---------- CSS keyframes & utilities ---------- */
function css() {
  return `
  .dm-noise {
    background-size: 160px 160px;
    animation: dm-noise 1.8s steps(2,end) infinite;
  }
  .dm-appear { animation: dm-appear 0.66s cubic-bezier(.2,.65,.2,1) both; }
  .dm-float  { animation: dm-float 4.4s ease-in-out infinite; }
  .dm-spark  { animation: dm-spark 2.2s ease-in-out infinite; }
  .dm-shimmer{ animation: dm-shine 3.2s ease-in-out infinite; }

  /* Cow walks fully across viewport: off-screen left to off-screen right */
  @keyframes cow-walk {
    0%   { transform: translateX(-30vw) }
    100% { transform: translateX(130vw) }
  }

  @keyframes dm-enter {
    from { opacity: 0; transform: translateY(8px) scale(0.99); filter: blur(4px); }
    to   { opacity: 1; transform: translateY(0)   scale(1);     filter: blur(0); }
  }
  @keyframes dm-appear {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes dm-float {
    0%, 100% { transform: translateY(0) }
    50%      { transform: translateY(-6px) }
  }
  @keyframes dm-spark {
    0%, 100% { transform: translateY(0) scale(1); opacity: .9; }
    50%      { transform: translateY(-6px) scale(1.12); opacity: .65; }
  }
  @keyframes dm-shine {
    0%   { transform: translateX(-60%); opacity: 0; }
    40%  { opacity: 1; }
    100% { transform: translateX(130%); opacity: 0; }
  }
  @keyframes dm-noise {
    0%   { background-position: 0 0; }
    100% { background-position: 160px 160px; }
  }
  @keyframes blade-sway {
    0%, 100% { transform: rotate(0deg) }
    50%      { transform: rotate(2.5deg) }
  }
  `;
}
