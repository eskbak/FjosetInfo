// frontend/src/views/DrinksMenu.tsx
import React, { useEffect, useRef, useState } from "react";
import type { Theme, Colors } from "../types";
import placeholderPng from "../assets/drinks/placeholder.png";
import walkingCow from "../assets/drinks/cowWalking.gif";
import mjolkerampaLogo from "../assets/drinks/Mjolkerampa.png";
import nykkelTilHelvete from "../assets/drinks/nykkelTilHelvete.png";
import ingvaldoBomb from "../assets/drinks/ingvaldoBomb.png";
import sinDrekk from "../assets/drinks/sinDrekk.png";
import brekkeren from "../assets/drinks/brekkeren.png";
import grimmTonic from "../assets/drinks/grimmTonic.png";
import eskilluminati from "../assets/drinks/eskilluminati.png";
import spinningChip from "../assets/drinks/spinningChip.gif";

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
    { name: "AureBrekker'n",  imageUrl: brekkeren, accent: "#ffd27a" },
    { name: "EskIlluminati", imageUrl: eskilluminati,    accent: "#ffb37a" },
    { name: "Nykkelen til Helvete",    imageUrl: nykkelTilHelvete,      accent: "#f8e08e" },
    { name: "SinDrekk deg i hjel",         imageUrl: sinDrekk,           accent: "#86e39b" },
    { name: "Grimm'n'Tonic",    imageUrl: grimmTonic,               accent: "#c6f2ff" },
    { name: "Ingvaldo-Bomb",    imageUrl: ingvaldoBomb,      accent: "#b7f07b" },
  ],
}: {
  theme: Theme;
  colors: Colors;
  logoUrl?: string;
  drinks?: Drink[];
}) {
  const vpad = "clamp(16px, 3vw, 36px)";
  const topbarH = "clamp(56px, 8vh, 90px)";

  // --- AD STATE ---
  const [isAd, setIsAd] = useState(false);
  const [adIndex, setAdIndex] = useState(0);
  const adTimeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [adVariant, setAdVariant] = useState<"drink" | "chip">("drink");
  const adActiveRef = useRef(false);
  const chipTimeoutRef = useRef<number | null>(null);

useEffect(() => {
  function startAdSequence() {
    if (adActiveRef.current) return;       // don't overlap
    adActiveRef.current = true;

    // 1) DRINK AD (8s)
    setAdVariant("drink");
    setAdIndex((i) => (i + 1) % Math.min(6, Math.max(1, drinks.length)));
    setIsAd(true);

    if (adTimeoutRef.current) window.clearTimeout(adTimeoutRef.current);
    if (chipTimeoutRef.current) window.clearTimeout(chipTimeoutRef.current);

    adTimeoutRef.current = window.setTimeout(() => {
      // 2) CHIP AD (5s)
      setAdVariant("chip");
      setIsAd(true);

      chipTimeoutRef.current = window.setTimeout(() => {
        // 3) Back to list
        setIsAd(false);
        adActiveRef.current = false;
      }, 5000);
    }, 8000);
  }

  // fire every 30s
  intervalRef.current = window.setInterval(startAdSequence, 25000);

  return () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    if (adTimeoutRef.current) window.clearTimeout(adTimeoutRef.current);
    if (chipTimeoutRef.current) window.clearTimeout(chipTimeoutRef.current);
    adActiveRef.current = false;
  };
}, [drinks.length]);


  return (
    <div
      style={{
        ...wrap,
        // @ts-ignore
        ["--vpad" as any]: vpad,
        ["--topbar-h" as any]: topbarH,
      }}
    >
      {/* Corner spinning chips */}
      <img
        src={spinningChip}
        alt="Spinning chip"
        style={{ ...cornerChip, left: "25px" }}
      />
      <img
        src={spinningChip}
        alt="Spinning chip"
        style={{ ...cornerChip, right: "25px" }}
      />

      {/* TOP LOGO */}
      <div style={topBar}>
        <img
          src={mjolkerampaLogo}
          alt="Mjølkerampa logo"
          style={{
            maxHeight: "100%",
            maxWidth: "65%",
            objectFit: "contain",
          }}
        />
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Amatic+SC:wght@700&display=swap');`}</style>
      <style>{css()}</style>

      {/* SKY & TEXTURES */}
      <div style={skyGradient} />
      {/* <div style={sunGlow} /> */}
      <div style={woodGrain} />
      <div style={cowSpots} className="dm-noise" />

      {/* CONTENT STAGE: liste ELLER reklame */}
{isAd ? (
  <div
    style={{
      ...list,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      paddingTop: "300px", // lets the ad use more vertical space
    }}
  >
    {adVariant === "chip" ? (
      <ChipAd />
    ) : (
      <DrinkAd drink={drinks[(adIndex % 6)] || drinks[0]} />
    )}
  </div>
) : (
  <div style={list}>
    {drinks.slice(0, 6).map((d, i) => (
      <Row key={i} index={i} drink={d} />
    ))}
  </div>
)}


      {/* BOTTOM FIELD */}
      <GrassField />

      {/* COWS (behind content) */}
      <CowWalker variant="main" />
      <CowWalker variant="second" />
    </div>
  );
}

/* ---------------- SIMPLE AD COMPONENT ---------------- */

function DrinkAd({ drink }: { drink: Drink }) {
  const accent = drink.accent || defaultAccent(0);
  return (
    <div className="dm-ad" style={adWrap}>
      <div className="dm-float" style={adImgWrap}>
        <div style={imgGlow(accent)} />
        <img
          src={drink.imageUrl || placeholderPng}
          alt={drink.name}
          style={adImg}
        />
      </div>
      <div style={adTextWrap}>
        <WoodSign text={drink.name} size={1.5} />
        <div style={adTagline}>1 Fjøssing = 1 drink</div>
      </div>
    </div>
  );
}

function ChipAd() {
  return (
    <div className="dm-ad" style={adWrap}>
      <div className="dm-float" style={adImgWrap}>
        <img src={spinningChip} alt="Fjøssing" style={chipImg} />
      </div>
      <div style={adTextWrap}>
        <div style={bigTagline}>1 Fjøssing = 1 drink</div>
      </div>
    </div>
  );
}


/* ---------------- WOOD SIGN ---------------- */

/* ---------------- WOOD SIGN ---------------- */

function WoodSign({
  text,
  alignRight,
  size = 1,               // <— NY: skaleringsfaktor
}: {
  text: string;
  alignRight?: boolean;
  size?: number;
}) {
  const s = size;         // 1 = original, 1.3 = 30% større, osv.

  // Dynamiske overstyringer for skiltets paddings (X/Y) og fontstørrelse
  const signGridDyn: React.CSSProperties = {
    ...signGrid,
    // @ts-ignore
    ["--padX" as any]: `${250 * s}px`,
    // @ts-ignore
    ["--padY" as any]: `${25 * s}px`,
  };

  const signTextDyn: React.CSSProperties = {
    ...signText,
    fontSize: `${80 * s}px`,
  };

  return (
    <div
      style={{
        ...signWrap,
        alignSelf: alignRight ? "flex-end" : "flex-start",
        transform: `rotate(${alignRight ? -0.6 : 0.6}deg)`,
      }}
    >
      {/* two planks; width = text width + padding */}
      <div style={signGridDyn}>
        <div style={plankRowTop} />
        <div style={plankRowBot} />

        {/* centered label across both planks */}
        <span style={signTextDyn}>{text}</span>

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
      <img src={drink.imageUrl || placeholderPng} alt={drink.name} style={img} />
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
  const H = 300;

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
      15 +
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

  // Small barn SVG, positioned left of center, on the grass
  const barnX = W * 0.19; // ~20% from left
  const barnY = baseY + 20; // slightly above top of grass
  const barnScale = 0.5; // 10% scaling

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
        {/* Blades of grass */}
        {blades}
        {/* Barn */}
        <g
          transform={`translate(${barnX}, ${barnY}) scale(${barnScale})`}
          style={{ pointerEvents: "none" }}
        >
          <rect x="0" y="30" width="100" height="70" fill="#a82d20" stroke="#84231a" strokeWidth="4"/>
          <polygon points="0,30 50,0 100,30" fill="#d2562d" stroke="#84231a" strokeWidth="4"/>
          <rect x="40" y="65" width="20" height="35" fill="#fff" stroke="#84231a" strokeWidth="3"/>
          <circle cx="50" cy="82" r="7" fill="#b4b4b4" />
          {/* barn doors */}
          <rect x="45" y="80" width="10" height="20" fill="#fff9ed" stroke="#84231a" strokeWidth="2"/>
        </g>
      </svg>
    </div>
  );
}

/* ---------------- WALKING COWS (behind content) ---------------- */
// Accepts variant: "main" for original (smaller and lower), "second" for mirrored, even lower
function CowWalker({variant = "main"}: {variant?: "main" | "second"}) {
  // Use different styles based on variant
  const base: React.CSSProperties = {
    position: "absolute",
    width: "auto",
    imageRendering: "auto",
    filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.35))",
    willChange: "transform",
    pointerEvents: "none",
    zIndex: 3,
  };

  if (variant === "main") {
    // Smaller, lower than before
    return (
      <img
        src={walkingCow}
        alt="Walking cow"
        className="cow-walk"
        style={{
          ...base,
          height: "17vh",
          bottom: "4vh",
          animation: "cow-walk 23s linear infinite",
        }}
      />
    );
  }
  // Second cow: mirrored (left-to-right), even lower, smaller, and in front of the barn
  return (
    <img
      src={walkingCow}
      alt="Walking cow"
      className="cow-walk cow-walk-right"
      style={{
        ...base,
        height: "13vh",
        bottom: "1.5vh",
        left: 0,
        transform: "scaleX(-1)", // mirror
        animation: "cow-walk-right 29s linear infinite",
        zIndex: 3,
        opacity: 0.93, // slightly faded so doesn't distract
      }}
    />
  );
}

/* ---------------- STYLE SYSTEM ---------------- */
const cornerChip: React.CSSProperties = {
  position: "absolute",
  top: "25px",
  width: "150px",
  height: "auto",
  pointerEvents: "none",
  zIndex: 6,
  filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.35))",
};

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
  background: "linear-gradient(180deg, #092241ff 0%, #143b69ff 32%, #2c5c8aff 60%, #06093bff 100%)",
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
  background: "radial-gradient(circle, rgba(90, 69, 28, 0.35), transparent 60%)",
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

const list: React.CSSProperties = {
  position: "relative",
  zIndex: 4, // content ABOVE cow
  display: "grid",
  gridTemplateRows: "repeat(6, 1fr)",
  paddingTop: "330px",
};

const rowBase: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: "clamp(12px, 3.2vw, 36px)",
  padding: "0 20px",
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

const topBar: React.CSSProperties = {
  position: "relative",
  height: "var(--topbar-h)",
  display: "grid",
  placeItems: "center",
  zIndex: 5,
  marginBottom: "clamp(8px, 1.5vh, 16px)",
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
  height: "180px",
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

/* ---------- AD styles ---------- */
const chipImg: React.CSSProperties = {
  height: "clamp(340px, 56vh, 40vh)", // bigger than the drink ad
  width: "auto",
  objectFit: "contain",
  filter: "drop-shadow(0 24px 44px rgba(0,0,0,0.45))",
};

const bigTagline: React.CSSProperties = {
  fontSize: "6vh",
  color: "#e7fbff",
  textShadow: "0 2px 0 rgba(0,0,0,0.35)",
};

// med dette:
const adWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",          // <— stack: bilde over, skilt under
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "clamp(8px, 2.4vh, 24px)",
  width: "100%",
  padding: "0 clamp(24px, 4vw, 64px)",
  height: "100%",                   // <— får vokse vertikalt
};

// erstatt adImg med en høyere variant
const adImg: React.CSSProperties = {
  height: "40vh",  // <— større bilde
  width: "auto",
  objectFit: "contain",
  filter: "drop-shadow(0 24px 44px rgba(0,0,0,0.45))",
};

// valgfritt: litt spacing under bildet/over teksten
const adTextWrap: React.CSSProperties = {
  display: "grid",
  gap: "12px",
  placeItems: "center",
  textAlign: "center",
  marginTop: "clamp(8px, 1.8vh, 20px)",
};

const adImgWrap: React.CSSProperties = {
  ...imgWrap,
};

const adTagline: React.CSSProperties = {
  fontSize: "4vh",
  color: "#e7fbff",
  textShadow: "0 2px 0 rgba(0,0,0,0.35)",
};

/* ---------- wooden sign styles ---------- */

// SIGN WRAPPER (auto width)
const signWrap: React.CSSProperties = {
  position: "relative",
  display: "inline-block",
  paddingTop: 0,          // room for ropes
  width: "fit-content",    // <-- key: shrink to content
  whiteSpace: "nowrap",    // keep single line (change if you want wrapping)
  zIndex: 4,
};

// Grid container holding two planks; width = text + padding via fit-content
const signGrid: React.CSSProperties = {
  position: "relative",
  display: "grid",
  gridTemplateRows: "1fr 1fr",
  rowGap: 2,
  alignItems: "stretch",
  width: "fit-content",
  // Responsive horizontal and vertical paddings for plank size
  // @ts-ignore
  ["--padX" as any]: "250px",
  ["--padY" as any]: "25px",
};

// Realistic wood textures per plank (slightly different tones)
const commonPlank: React.CSSProperties = {
  position: "relative",
  padding: "var(--padY) var(--padX)",
  borderRadius: 15,
  border: "1px solid rgba(0,0,0,0.3)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.2), 0 8px 20px rgba(0,0,0,0.35)",
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
  fontSize: "80px",
  letterSpacing: 0.6,
  padding: "0 8px",
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
  .dm-ad     { animation: ad-in 0.6s cubic-bezier(.2,.65,.2,1) both; }

  /* Cow walks fully across viewport: off-screen left to off-screen right */
  @keyframes cow-walk {
    0%   { transform: translateX(-30vw) }
    100% { transform: translateX(130vw) }
  }
  /* Second cow: walks right-to-left (mirrored) */
  @keyframes cow-walk-right {
    0%   { transform: scaleX(-1) translateX(-130vw) }
    100% { transform: scaleX(-1) translateX(30vw) }
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
  @keyframes ad-in {
    from { opacity: 0; transform: translateY(8px) scale(.98); }
    to   { opacity: 1; transform: translateY(0)  scale(1); }
  }
  `;
}
