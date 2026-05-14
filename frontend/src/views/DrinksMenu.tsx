// frontend/src/views/DrinksMenu.tsx
import React, { useEffect, useRef, useState } from "react";
import type { Theme, Colors } from "../types";
import eurovisionLogo from "../assets/EurovisionFjoset.png";
import placeholderPng from "../assets/drinks/placeholder.png";
import walkingCow from "../assets/drinks/cowWalking.gif";
import chaChaShot from "../assets/drinks/chaChaShot.png";
import spritInTheSky from "../assets/drinks/spritInTheSky.png";
import pureEuphoria from "../assets/drinks/pureEuphoria.png";

type Drink = {
  name: string;
  imageUrl?: string;
  accent?: string;
  subtitle?: string;
};

const DEFAULT_DRINKS: Drink[] = [
  { name: "Sprit in the Sky", imageUrl: spritInTheSky, accent: "#4cc9f0", subtitle: "celestial barn anthem" },
  { name: "Cha Cha Shot", imageUrl: chaChaShot, accent: "#7ae582", subtitle: "party in a tiny glass" },
  { name: "Pure Euphoria", imageUrl: pureEuphoria, accent: "#ff4fd8", subtitle: "hands-up house classic" },
];

// Tweak these values to tune the screen without digging through the CSS.
// clamp(min, preferred, max) means: never smaller than min, try preferred, never bigger than max.
// You can replace any clamp(...) with a fixed value like "72px" if you want exact sizing.
const MENU_TUNING = {
  logoWidth: "min(70vw, 820px)",
  logoWidthPortrait: "min(88vw, 720px)",
  logoScale: "1",
  logoScalePortrait: "1.0",

  listDrinkPngPadding: "clamp(10px, 1.6vh, 22px)",
  listDrinkPngPaddingPortrait: "clamp(8px, 12.0vh, 20px)",
  listDrinkPngPaddingLeft: "clamp(24px, 3vw, 48px)",
  listDrinkPngPaddingBottom: "var(--dm-list-png-padding)",
  listDrinkPngPaddingLeftPortrait: "clamp(52px, 8vw, 76px)",
  listDrinkPngPaddingBottomPortrait: "var(--dm-list-png-padding-portrait)",
  listDrinkPngScale: "1.08",
  listDrinkPngScalePortrait: "3.0",
  listDrinkNameSize: "clamp(3rem, 6.8vh, 7.6rem)",
  listDrinkNameSizePortrait: "clamp(1.45rem, 3.45vh, 5.2rem)",

  adDrinkPngSize: "min(40vh, 430px)",
  adDrinkPngSizePortrait: "min(60vw, 750px)",
  adDrinkNameSize: "clamp(3.6rem, 9vh, 9.5rem)",
  adDrinkNameSizePortrait: "clamp(2.8rem, 7vh, 6.6rem)",

  footerTextSize: "clamp(1.6rem, 3.5vh, 2.7rem)",
  footerAnimationDuration: "20s",
  drinksTopOffset: "122px",
  drinksTopOffsetPortrait: "28px",
} as const;

const tuningVars = {
  "--dm-logo-width": MENU_TUNING.logoWidth,
  "--dm-logo-width-portrait": MENU_TUNING.logoWidthPortrait,
  "--dm-logo-scale": MENU_TUNING.logoScale,
  "--dm-logo-scale-portrait": MENU_TUNING.logoScalePortrait,
  "--dm-list-png-padding": MENU_TUNING.listDrinkPngPadding,
  "--dm-list-png-padding-portrait": MENU_TUNING.listDrinkPngPaddingPortrait,
  "--dm-list-png-padding-left": MENU_TUNING.listDrinkPngPaddingLeft,
  "--dm-list-png-padding-bottom": MENU_TUNING.listDrinkPngPaddingBottom,
  "--dm-list-png-padding-left-portrait": MENU_TUNING.listDrinkPngPaddingLeftPortrait,
  "--dm-list-png-padding-bottom-portrait": MENU_TUNING.listDrinkPngPaddingBottomPortrait,
  "--dm-list-png-scale": MENU_TUNING.listDrinkPngScale,
  "--dm-list-png-scale-portrait": MENU_TUNING.listDrinkPngScalePortrait,
  "--dm-list-name-size": MENU_TUNING.listDrinkNameSize,
  "--dm-list-name-size-portrait": MENU_TUNING.listDrinkNameSizePortrait,
  "--dm-ad-png-size": MENU_TUNING.adDrinkPngSize,
  "--dm-ad-png-size-portrait": MENU_TUNING.adDrinkPngSizePortrait,
  "--dm-ad-name-size": MENU_TUNING.adDrinkNameSize,
  "--dm-ad-name-size-portrait": MENU_TUNING.adDrinkNameSizePortrait,
  "--dm-footer-text-size": MENU_TUNING.footerTextSize,
  "--dm-footer-animation-duration": MENU_TUNING.footerAnimationDuration,
  "--dm-drinks-top-offset": MENU_TUNING.drinksTopOffset,
  "--dm-drinks-top-offset-portrait": MENU_TUNING.drinksTopOffsetPortrait,
} as React.CSSProperties;

const BEAM_COLORS = ["#ff4fd8", "#4cc9f0", "#ffd166", "#7ae582", "#f72585", "#b8f35f"];
const CARD_TITLES = ["Opening act", "Semi-final fever", "Pyro chorus", "Green room", "Jury favorite", "Final drop"];

const STAR_POINTS = Array.from({ length: 46 }, (_, i) => ({
  left: `${(i * 17 + 9) % 100}%`,
  top: `${(i * 23 + 13) % 82}%`,
  size: 2 + (i % 4),
  delay: `${(i % 9) * 0.21}s`,
  color: BEAM_COLORS[i % BEAM_COLORS.length],
}));

export default function DrinksMenu({
  theme,
  colors,
  logoUrl = eurovisionLogo,
  drinks = DEFAULT_DRINKS,
}: {
  theme: Theme;
  colors: Colors;
  logoUrl?: string;
  drinks?: Drink[];
}) {
  const sourceDrinks = drinks.length ? drinks : DEFAULT_DRINKS;
  const menuDrinks = sourceDrinks.slice(0, 3);
  const drinkCount = Math.max(1, menuDrinks.length);

  const [isAd, setIsAd] = useState(false);
  const [adIndex, setAdIndex] = useState(0);
  const adTimeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const adActiveRef = useRef(false);

  useEffect(() => {
    function startAdSequence() {
      if (adActiveRef.current) return;
      adActiveRef.current = true;

      setAdIndex((i) => (i + 1) % drinkCount);
      setIsAd(true);

      if (adTimeoutRef.current) window.clearTimeout(adTimeoutRef.current);

      adTimeoutRef.current = window.setTimeout(() => {
        setIsAd(false);
        adActiveRef.current = false;
      }, 8000);
    }

    intervalRef.current = window.setInterval(startAdSequence, 25000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (adTimeoutRef.current) window.clearTimeout(adTimeoutRef.current);
      adActiveRef.current = false;
    };
  }, [drinkCount]);

  const featuredDrink = menuDrinks[adIndex % drinkCount] || DEFAULT_DRINKS[0];

  return (
    <div
      className="euro-drinks"
      style={
        {
          ...wrap,
          ...tuningVars,
          "--theme-card": theme.card,
          "--theme-border": theme.border,
          "--farm-green": colors.ATB.primary,
        } as React.CSSProperties
      }
    >
      <style>{css()}</style>

      <div className="dm-stage-bg" aria-hidden />
      <LightBeams />
      <StarField />

      <header className="dm-hero">
        <img className="dm-logo" src={logoUrl} alt="Eurovision Fjøset logo" />
      </header>

      <main className={`dm-main ${isAd ? "dm-main-ad" : ""}`}>
        {isAd ? (
          <DrinkAd drink={featuredDrink} index={adIndex} />
        ) : (
          <section className="dm-menu-grid" aria-label="Drink menu">
            {menuDrinks.map((drink, index) => (
              <DrinkCard key={`${drink.name}-${index}`} drink={drink} index={index} />
            ))}
          </section>
        )}
      </main>

      <footer className="dm-footer" aria-hidden>
        <div className="dm-runway">
          <span>12 points to the bartender</span>
          <span>Fjøset votes tonight</span>
          <span>Shaken, stirred, and ready to slay</span>
          
        </div>
        <CowWalker />
      </footer>
    </div>
  );
}

function LightBeams() {
  return (
    <div className="dm-beams" aria-hidden>
      {BEAM_COLORS.map((color, index) => (
        <span
          key={color}
          className="dm-beam"
          style={
            {
              "--beam-color": color,
              "--beam-left": `${8 + index * 16}%`,
              "--beam-delay": `${index * -0.7}s`,
              "--beam-tilt-start": `${index % 2 === 0 ? -16 : 16}deg`,
              "--beam-tilt-end": `${index % 2 === 0 ? 16 : -16}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function StarField() {
  return (
    <div className="dm-stars" aria-hidden>
      {STAR_POINTS.map((star, index) => (
        <span
          key={index}
          className="dm-star"
          style={
            {
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              background: star.color,
              color: star.color,
              animationDelay: star.delay,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function DrinkCard({ drink, index }: { drink: Drink; index: number }) {
  const accent = drink.accent || defaultAccent(index);
  const title = drink.subtitle || CARD_TITLES[index % CARD_TITLES.length];

  return (
    <article
      className="dm-drink-card"
      style={
        {
          "--accent": accent,
          "--delay": `${index * 0.07}s`,
        } as React.CSSProperties
      }
    >
      <div className="dm-card-flare" />
      <div className="dm-drink-image-wrap">
        <div className="dm-drink-halo" />
        <img src={drink.imageUrl || placeholderPng} alt={drink.name} className="dm-drink-image" />
      </div>
      <div className="dm-drink-copy">
        <div className="dm-act-label">{title}</div>
        <h2>{drink.name}</h2>
      </div>
      <EqualizerBars index={index} />
    </article>
  );
}

function EqualizerBars({ index }: { index: number }) {
  return (
    <div className="dm-eq" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          style={
            {
              height: `${24 + ((i * 13 + index * 7) % 58)}%`,
              animationDelay: `${(i + index) * -0.12}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function DrinkAd({ drink, index }: { drink: Drink; index: number }) {
  const accent = drink.accent || defaultAccent(index);

  return (
    <section
      className="dm-ad-card"
      style={
        {
          "--accent": accent,
        } as React.CSSProperties
      }
      aria-label={`${drink.name} spotlight`}
    >
      <div className="dm-ad-rank">Now performing</div>
      <div className="dm-ad-visual">
        <div className="dm-ad-orbit" />
        <img src={drink.imageUrl || placeholderPng} alt={drink.name} />
      </div>
      <div className="dm-ad-copy">
        <div className="dm-ad-kicker">Fjøset finalist</div>
        <h2>{drink.name}</h2>
      </div>
    </section>
  );
}

function CowWalker() {
  return <img src={walkingCow} alt="" className="dm-cow" />;
}

const wrap: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: 0,
  overflow: "hidden",
  color: "#fffdf7",
  fontFamily: "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif",
  display: "grid",
  gridTemplateRows: "var(--dm-rows, minmax(180px, 24vh) minmax(0, 1fr) minmax(64px, 8vh))",
  gap: "clamp(8px, 1.2vh, 16px)",
  padding: "var(--dm-pad, clamp(14px, 2vh, 28px) clamp(16px, 2.6vw, 42px) clamp(8px, 1.2vh, 16px))",
  boxSizing: "border-box",
  background: "#09070d",
};

function defaultAccent(i: number): string {
  return BEAM_COLORS[i % BEAM_COLORS.length];
}

function css() {
  return `
    .euro-drinks * {
      box-sizing: border-box;
    }

    .euro-drinks {
      --dm-rows: minmax(180px, 24vh) minmax(0, 1fr) minmax(64px, 8vh);
      --dm-pad: clamp(14px, 2vh, 28px) clamp(16px, 2.6vw, 42px) clamp(8px, 1.2vh, 16px);
    }

    .dm-stage-bg {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 50% -8%, rgba(255,255,255,0.28), transparent 22%),
        radial-gradient(circle at 15% 18%, rgba(255,79,216,0.32), transparent 28%),
        radial-gradient(circle at 85% 20%, rgba(76,201,240,0.3), transparent 30%),
        radial-gradient(circle at 50% 80%, rgba(255,209,102,0.17), transparent 34%),
        linear-gradient(180deg, #150719 0%, #08070d 48%, #11100a 100%);
      z-index: 0;
    }

    .dm-stage-bg::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px),
        linear-gradient(180deg, rgba(255,255,255,0.04) 1px, transparent 1px);
      background-size: 44px 44px;
      mask-image: linear-gradient(180deg, rgba(0,0,0,0.85), transparent 76%);
      animation: dm-led-drift 14s linear infinite;
    }

    .dm-stage-bg::after {
      content: "";
      position: absolute;
      left: -8%;
      right: -8%;
      bottom: -5%;
      height: 31%;
      background:
        linear-gradient(115deg, transparent 0 18%, rgba(255,255,255,0.08) 18% 19%, transparent 19% 37%, rgba(255,255,255,0.07) 37% 38%, transparent 38%),
        linear-gradient(180deg, rgba(30, 45, 22, 0.92), rgba(6, 8, 7, 0.96));
      border-top: 1px solid rgba(255,255,255,0.16);
      transform: perspective(520px) rotateX(54deg);
      transform-origin: bottom;
      box-shadow: 0 -28px 80px rgba(122,229,130,0.22);
    }

    .dm-beams,
    .dm-stars {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 1;
    }

    .dm-beam {
      position: absolute;
      left: var(--beam-left);
      top: -16%;
      width: clamp(76px, 9vw, 140px);
      height: 88%;
      background: linear-gradient(180deg, var(--beam-color), transparent 82%);
      opacity: 0.32;
      filter: blur(15px);
      transform: rotate(var(--beam-tilt-start));
      transform-origin: top center;
      animation: dm-beam-sweep 7.4s ease-in-out infinite;
      animation-delay: var(--beam-delay);
      mix-blend-mode: screen;
    }

    .dm-star {
      position: absolute;
      border-radius: 50%;
      box-shadow: 0 0 14px currentColor;
      opacity: 0.72;
      animation: dm-star-pulse 2.8s ease-in-out infinite;
    }

    .dm-hero {
      position: relative;
      z-index: 4;
      min-height: 0;
      display: grid;
      place-items: center;
    }

    .dm-logo {
      --logo-scale: var(--dm-logo-scale);
      justify-self: center;
      align-self: center;
      width: var(--dm-logo-width);
      height: auto;
      max-height: 100%;
      max-width: 100%;
      object-fit: contain;
      filter:
        drop-shadow(0 12px 24px rgba(0,0,0,0.58))
        drop-shadow(0 0 24px rgba(255,79,216,0.4))
        drop-shadow(0 0 30px rgba(76,201,240,0.32));
      animation: dm-logo-pop 5.6s ease-in-out infinite;
    }

    .dm-main {
      position: relative;
      z-index: 3;
      min-height: 0;
      display: grid;
      padding-top: var(--dm-drinks-top-offset);
    }

    .dm-menu-grid {
      min-height: 0;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      grid-template-rows: minmax(0, 1fr);
      gap: clamp(14px, 2vw, 28px);
    }

    .dm-drink-card {
      position: relative;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto minmax(0, 1fr) auto;
      align-items: center;
      justify-items: center;
      gap: clamp(12px, 2.2vh, 24px);
      padding: clamp(16px, 2.9vh, 34px);
      text-align: center;
      border: 1px solid color-mix(in srgb, var(--accent) 54%, rgba(255,255,255,0.26));
      border-radius: 8px;
      background:
        linear-gradient(90deg, color-mix(in srgb, var(--accent) 22%, rgba(0,0,0,0.76)), rgba(0,0,0,0.48) 42%, rgba(255,255,255,0.06)),
        rgba(8, 7, 13, 0.72);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 16px 38px rgba(0,0,0,0.34);
      animation: dm-card-enter 0.62s cubic-bezier(.2,.72,.18,1) both;
      animation-delay: var(--delay);
    }

    .dm-card-flare {
      position: absolute;
      inset: -34% -18% 46% -18%;
      background: radial-gradient(circle, color-mix(in srgb, var(--accent) 62%, transparent), transparent 62%);
      opacity: 0.68;
      filter: blur(12px);
      pointer-events: none;
    }

    .dm-drink-image-wrap {
      position: relative;
      width: 100%;
      min-height: 0;
      height: min(32vh, 310px);
      padding: var(--dm-list-png-padding);
      padding-left: var(--dm-list-png-padding-left);
      padding-bottom: var(--dm-list-png-padding-bottom);
      display: grid;
      place-items: center;
    }

    .dm-drink-halo {
      position: absolute;
      inset: 4%;
      border-radius: 50%;
      background: radial-gradient(circle, color-mix(in srgb, var(--accent) 46%, transparent), transparent 66%);
      filter: blur(12px);
    }

    .dm-drink-image {
      position: relative;
      --drink-scale: var(--dm-list-png-scale);
      max-width: 100%;
      max-height: min(100%, 30vh);
      object-fit: contain;
      filter: drop-shadow(0 18px 25px rgba(0,0,0,0.46));
      animation: dm-float 4.5s ease-in-out infinite;
    }

    .dm-drink-copy {
      position: relative;
      width: 100%;
      min-width: 0;
      align-self: center;
      display: grid;
      place-items: center;
      padding-right: 0;
      text-align: center;
    }

    .dm-act-label {
      margin-bottom: 8px;
      color: color-mix(in srgb, var(--accent) 72%, white);
      font-size: clamp(0.78rem, 1.55vh, 1.18rem);
      line-height: 1.05;
      font-weight: 950;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }

    .dm-drink-copy h2 {
      margin: 0;
      color: #fffdf7;
      font-size: var(--dm-list-name-size);
      line-height: 0.88;
      font-weight: 950;
      letter-spacing: 0;
      overflow-wrap: anywhere;
      text-wrap: balance;
      text-shadow:
        0 4px 0 rgba(0,0,0,0.34),
        0 0 12px color-mix(in srgb, var(--accent) 82%, white),
        0 0 28px color-mix(in srgb, var(--accent) 70%, transparent),
        0 0 54px color-mix(in srgb, var(--accent) 46%, transparent);
    }

    .dm-eq {
      align-self: center;
      justify-content: center;
      display: flex;
      align-items: end;
      gap: 4px;
      width: min(72%, 280px);
      height: clamp(18px, 3.2vh, 38px);
      max-width: 280px;
      opacity: 0.8;
    }

    .dm-eq span {
      width: clamp(4px, 0.65vh, 8px);
      min-height: 4px;
      border-radius: 999px 999px 0 0;
      background: linear-gradient(180deg, white, var(--accent));
      box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 72%, transparent);
      animation: dm-eq 0.86s ease-in-out infinite alternate;
    }

    .dm-main-ad {
      place-items: center;
    }

    .dm-ad-card {
      position: relative;
      width: min(100%, 1180px);
      height: min(100%, 560px);
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(260px, 0.9fr) minmax(0, 1fr);
      align-items: center;
      gap: clamp(18px, 4vw, 62px);
      overflow: hidden;
      padding: clamp(20px, 4vh, 54px);
      border: 1px solid color-mix(in srgb, var(--accent, #ffd166) 58%, rgba(255,255,255,0.22));
      border-radius: 8px;
      background:
        radial-gradient(circle at 26% 44%, color-mix(in srgb, var(--accent, #ffd166) 32%, transparent), transparent 34%),
        linear-gradient(135deg, rgba(0,0,0,0.82), rgba(35,12,42,0.72), rgba(0,0,0,0.72));
      box-shadow: 0 28px 90px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.12);
      animation: dm-ad-in 0.56s cubic-bezier(.2,.72,.18,1) both;
    }

    .dm-ad-card::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(105deg, transparent 0 35%, rgba(255,255,255,0.12), transparent 65% 100%);
      transform: translateX(-80%);
      animation: dm-shimmer 3.8s ease-in-out infinite;
      pointer-events: none;
    }

    .dm-ad-rank {
      position: absolute;
      top: clamp(12px, 2vh, 24px);
      left: clamp(14px, 2.6vw, 34px);
      color: color-mix(in srgb, var(--accent, #ffd166) 76%, white);
      font-size: clamp(0.9rem, 1.9vh, 1.38rem);
      font-weight: 950;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .dm-ad-visual {
      position: relative;
      min-height: 0;
      display: grid;
      place-items: center;
      height: 100%;
    }

    .dm-ad-orbit {
      position: absolute;
      width: min(42vh, 390px);
      aspect-ratio: 1;
      border: 2px solid color-mix(in srgb, var(--accent, #ffd166) 72%, rgba(255,255,255,0.34));
      border-radius: 50%;
      box-shadow: 0 0 44px color-mix(in srgb, var(--accent, #ffd166) 45%, transparent);
      animation: dm-orbit 7s linear infinite;
    }

    .dm-ad-orbit::before,
    .dm-ad-orbit::after {
      content: "";
      position: absolute;
      inset: 13%;
      border: 1px dashed rgba(255,255,255,0.22);
      border-radius: 50%;
    }

    .dm-ad-orbit::after {
      inset: -11%;
      border-color: color-mix(in srgb, var(--accent, #ffd166) 42%, transparent);
      transform: rotate(28deg);
    }

    .dm-ad-visual img {
      position: relative;
      max-width: var(--dm-ad-png-size);
      max-height: var(--dm-ad-png-size);
      object-fit: contain;
      filter: drop-shadow(0 28px 42px rgba(0,0,0,0.58));
      animation: dm-float 4.2s ease-in-out infinite;
      z-index: 1;
    }

    .dm-ad-copy {
      position: relative;
      min-width: 0;
      z-index: 1;
    }

    .dm-ad-kicker {
      color: color-mix(in srgb, var(--accent, #ffd166) 78%, white);
      font-size: clamp(1rem, 2.2vh, 1.55rem);
      font-weight: 950;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .dm-ad-copy h2 {
      margin: 14px 0 16px;
      font-size: var(--dm-ad-name-size);
      line-height: 0.82;
      font-weight: 950;
      letter-spacing: 0;
      overflow-wrap: anywhere;
      text-wrap: balance;
      text-shadow:
        0 7px 0 rgba(0,0,0,0.36),
        0 0 16px color-mix(in srgb, var(--accent, #ffd166) 86%, white),
        0 0 42px color-mix(in srgb, var(--accent, #ffd166) 70%, transparent),
        0 0 78px color-mix(in srgb, var(--accent, #ffd166) 48%, transparent);
    }

    .dm-ad-copy p {
      max-width: 620px;
      margin: 0;
      color: #eafcff;
      font-size: clamp(1.3rem, 3.2vh, 2.6rem);
      line-height: 1.1;
      font-weight: 900;
    }

    .dm-footer {
      position: relative;
      z-index: 4;
      min-height: 0;
      display: flex;
      align-items: end;
      justify-content: center;
      overflow: hidden;
      border-top: 1px solid rgba(255,255,255,0.16);
    }

    .dm-footer::before {
      content: "";
      position: absolute;
      inset: 0 -5%;
      background:
        repeating-linear-gradient(90deg, rgba(255,255,255,0.14) 0 1px, transparent 1px 22px),
        linear-gradient(180deg, rgba(122,229,130,0.24), rgba(0,0,0,0.2));
      opacity: 0.5;
      transform: skewX(-14deg);
    }

    .dm-runway {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: clamp(16px, 4vw, 64px);
      width: max-content;
      color: #f7ffe8;
      font-size: var(--dm-footer-text-size);
      line-height: 1;
      font-weight: 950;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      white-space: nowrap;
      text-shadow: 0 2px 12px rgba(0,0,0,0.62);
      animation: dm-runway var(--dm-footer-animation-duration) linear infinite;
    }

    .dm-runway span {
      position: relative;
    }

    .dm-runway span::after {
      content: "";
      position: absolute;
      right: -32px;
      top: 50%;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--farm-green);
      box-shadow: 0 0 16px var(--farm-green);
      transform: translateY(-50%);
    }

    .dm-cow {
      position: absolute;
      left: 0;
      bottom: 28px;
      height: min(8vh, 70px);
      width: auto;
      z-index: 2;
      opacity: 0.92;
      filter: drop-shadow(0 8px 14px rgba(0,0,0,0.42));
      animation: dm-cow-walk 27s linear infinite;
      pointer-events: none;
    }

    @media (orientation: portrait), (max-width: 900px) {
      .euro-drinks {
        --dm-rows: minmax(145px, 17vh) minmax(0, 1fr) minmax(58px, 7vh);
        --dm-pad: 12px;
        --dm-drinks-top-offset: var(--dm-drinks-top-offset-portrait);
      }

      .dm-hero {
        grid-template-columns: 1fr;
        justify-items: center;
        gap: 8px;
        text-align: center;
      }

      .dm-logo {
        --logo-scale: var(--dm-logo-scale-portrait);
        width: var(--dm-logo-width-portrait);
        max-height: 100%;
      }

      .dm-menu-grid {
        grid-template-columns: 1fr;
        grid-template-rows: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      .dm-drink-card {
        grid-template-columns: clamp(118px, 21vw, 180px) minmax(0, 1fr);
        grid-template-rows: minmax(0, 1fr);
        align-items: center;
        justify-items: center;
        gap: clamp(12px, 2vw, 22px);
        padding: clamp(14px, 2.2vw, 24px);
        text-align: center;
      }

      .dm-drink-image-wrap {
        grid-column: 1;
        grid-row: 1;
        width: 100%;
        height: clamp(120px, 16vh, 190px);
        padding: var(--dm-list-png-padding-portrait);
        padding-left: var(--dm-list-png-padding-left-portrait);
        padding-bottom: var(--dm-list-png-padding-bottom-portrait);
      }

      .dm-drink-copy {
        grid-column: 2;
        grid-row: 1;
        align-self: center;
        min-height: 100%;
        place-items: center;
        text-align: center;
      }

      .dm-drink-copy h2 {
        font-size: var(--dm-list-name-size-portrait);
      }

      .dm-drink-image {
        --drink-scale: var(--dm-list-png-scale-portrait);
        max-height: min(100%, 15vh);
      }

      .dm-act-label,
      .dm-eq {
        display: none;
      }

      .dm-ad-card {
        width: 100%;
        height: 100%;
        grid-template-columns: 1fr;
        grid-template-rows: minmax(0, 0.85fr) auto;
        gap: 10px;
        padding: 18px;
        text-align: center;
      }

      .dm-ad-rank {
        left: 18px;
        right: 18px;
        text-align: center;
      }

      .dm-ad-visual img {
        max-width: var(--dm-ad-png-size-portrait);
        max-height: var(--dm-ad-png-size-portrait);
      }

      .dm-ad-copy h2 {
        font-size: var(--dm-ad-name-size-portrait);
      }

      .dm-ad-copy p {
        font-size: clamp(1.05rem, 2.4vh, 1.7rem);
      }
    }

    @keyframes dm-led-drift {
      from { background-position: 0 0; }
      to { background-position: 44px 44px; }
    }

    @keyframes dm-beam-sweep {
      0%, 100% { transform: rotate(var(--beam-tilt-start)) translateX(-9%); opacity: 0.18; }
      50% { transform: rotate(var(--beam-tilt-end)) translateX(9%); opacity: 0.42; }
    }

    @keyframes dm-star-pulse {
      0%, 100% { transform: scale(0.7); opacity: 0.38; }
      50% { transform: scale(1.25); opacity: 0.95; }
    }

    @keyframes dm-logo-pop {
      0%, 100% { transform: translateY(0) scale(var(--logo-scale)); }
      50% { transform: translateY(-3px) scale(var(--logo-scale)); }
    }

    @keyframes dm-card-enter {
      from { opacity: 0; transform: translateY(16px) scale(0.985); filter: blur(8px); }
      to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
    }

    @keyframes dm-float {
      0%, 100% { transform: translateY(0) scale(var(--drink-scale, 1)); }
      50% { transform: translateY(-7px) scale(var(--drink-scale, 1)); }
    }

    @keyframes dm-eq {
      from { transform: scaleY(0.45); opacity: 0.58; }
      to { transform: scaleY(1); opacity: 1; }
    }

    @keyframes dm-ad-in {
      from { opacity: 0; transform: translateY(18px) scale(0.97); filter: blur(8px); }
      to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
    }

    @keyframes dm-shimmer {
      0%, 18% { transform: translateX(-82%); opacity: 0; }
      42% { opacity: 1; }
      70%, 100% { transform: translateX(82%); opacity: 0; }
    }

    @keyframes dm-orbit {
      to { transform: rotate(360deg); }
    }

    @keyframes dm-runway {
      from { transform: translateX(80%); }
      to { transform: translateX(-80%); }
    }

    @keyframes dm-cow-walk {
      from { transform: translateX(-24vw); }
      to { transform: translateX(124vw); }
    }
  `;
}
