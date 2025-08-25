import { useEffect, useMemo, useState } from "react";
import PoweredBy from "../components/PoweredBy";
import type { Theme, Colors } from "../types";
import yrLogoLight from "../assets/yrLogoLight.png";
import yrLogoDark from "../assets/yrLogoDark.png";

type Props = {
  theme: Theme;
  colors: Colors;
  isDay: boolean;  // controls lightmode/darkmode icon variant
  lat: string;
  lon: string;
  hours?: number; // default 5
};

// Eager-import every symbol asset and give us URLs to use at runtime.
// Adjust the glob if your folder depth differs.
const ICONS = import.meta.glob("../assets/symbols/**/*.{png,svg}", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

// Map new MET/Yr symbol_code (base) -> old numeric id root.
// For codes with d/n/m variants we add the letter later based on the suffix.
const BASE_TO_OLD_ID: Record<string, string> = {
  // sky
  clearsky: "01", fair: "02", partlycloudy: "03", cloudy: "04",

  // showers
  lightrainshowers: "40", rainshowers: "05", heavyrainshowers: "41",
  lightsleetshowers: "42", sleetshowers: "07", heavysleetshowers: "43",
  lightsnowshowers: "44", snowshowers: "08", heavysnowshowers: "45",

  // continuous precip
  lightrain: "46", rain: "09", heavyrain: "10",
  lightsleet: "47", sleet: "12", heavysleet: "48",
  lightsnow: "49", snow: "13", heavysnow: "50",

  // thunder (continuous)
  lightrainandthunder: "30", rainandthunder: "22", heavyrainandthunder: "11",
  lightsleetandthunder: "31", sleetandthunder: "23", heavysleetandthunder: "32",
  lightsnowandthunder: "33", snowandthunder: "14", heavysnowandthunder: "34",

  // thunder (showers)
  lightrainshowersandthunder: "24", rainshowersandthunder: "06", heavyrainshowersandthunder: "25",
  lightssleetshowersandthunder: "26", sleetshowersandthunder: "20", heavysleetshowersandthunder: "27",
  lightssnowshowersandthunder: "28", snowshowersandthunder: "21", heavysnowshowersandthunder: "29",

  // other
  fog: "15",
};

// which bases need a time-of-day letter appended (d/n/m)?
const NEEDS_SUFFIX = new Set([
  "clearsky", "fair", "partlycloudy",
  "lightrainshowers", "rainshowers", "heavyrainshowers",
  "lightsleetshowers", "sleetshowers", "heavysleetshowers",
  "lightsnowshowers", "snowshowers", "heavysnowshowers",

  "lightrainshowersandthunder", "rainshowersandthunder", "heavyrainshowersandthunder",
  "lightssleetshowersandthunder", "sleetshowersandthunder", "heavysleetshowersandthunder",
  "lightssnowshowersandthunder", "snowshowersandthunder", "heavysnowshowersandthunder",
]);

function symbolCodeToOldId(code?: string): string | null {
  if (!code) return null;
  const m = code.trim().toLowerCase().match(/^(.*?)(?:_(day|night|polartwilight))?$/);
  const base = m?.[1] ?? code.toLowerCase();
  const tod = (m?.[2] ?? "") as "" | "day" | "night" | "polartwilight";
  const num = BASE_TO_OLD_ID[base];
  if (!num) return null;
  if (NEEDS_SUFFIX.has(base)) {
    // d=day, n=night, m=polar twilight (if missing, default to day)
    const letter = tod === "night" ? "n" : tod === "polartwilight" ? "m" : "d";
    return `${num}${letter}`;
  }
  return num; // fixed ids like 04, 09, 15, 22, ...
}

function iconUrlForSymbol(code: string | undefined, isDay: boolean): string | null {
  const oldId = symbolCodeToOldId(code);
  if (!oldId) return null;

  // choose pack by UI theme, not by day/night letter
  const mode = isDay ? "lightmode" : "darkmode";

  // Try 200px first, then 100px. Support png or svg.
  const candidates = [
    `../assets/symbols/${mode}/png/200/${oldId}.png`,
    `../assets/symbols/${mode}/png/100/${oldId}.png`,
    `../assets/symbols/${mode}/svg/${oldId}.svg`,
  ];

  for (const key of candidates) {
    if (ICONS[key]) return ICONS[key];
  }

  // fallback: try without d/n/m if we appended one but file only exists as number
  if (/[a-z]$/.test(oldId)) {
    const baseNum = oldId.slice(0, -1);
    const fallback = [
      `../assets/symbols/${mode}/png/200/${baseNum}.png`,
      `../assets/symbols/${mode}/png/100/${baseNum}.png`,
      `../assets/symbols/${mode}/svg/${baseNum}.svg`,
    ];
    for (const key of fallback) {
      if (ICONS[key]) return ICONS[key];
    }
  }

  return null;
}

// tiny emoji fallback if we can’t find an icon
const symbolToEmoji = (code?: string) => {
  if (!code) return "—";
  const c = code.toLowerCase();
  if (c.includes("clearsky")) return "☀️";
  if (c.includes("cloudy")) return "☁️";
  if (c.includes("fair")) return "🌤️";
  if (c.includes("rain")) return "🌧️";
  if (c.includes("snow")) return "❄️";
  if (c.includes("sleet")) return "🌨️";
  if (c.includes("fog")) return "🌫️";
  if (c.includes("thunder")) return "⛈️";
  return "•";
};

export default function YRCard({ theme, isDay, lat, lon, hours = 5 }: Props) {
  const [yr, setYr] = useState<any>(null);

  useEffect(() => {
    const fetchYr = async () => {
      const r = await fetch(`/api/yr/today?lat=${lat}&lon=${lon}&hours=${hours}`);
      setYr(await r.json());
    };
    fetchYr();
    const id = setInterval(fetchYr, 30 * 60_000);
    return () => clearInterval(id);
  }, [lat, lon, hours]);

  const nfNO = useMemo(
    () => new Intl.NumberFormat("nb-NO", { minimumFractionDigits: 0, maximumFractionDigits: 1 }),
    []
  );

  function renderPrecip(h: any) {
    const hasMin = typeof h.precipMin === "number";
    const hasMax = typeof h.precipMax === "number";
    if (hasMin || hasMax) {
      const a = hasMin ? h.precipMin : (typeof h.precipMm === "number" ? h.precipMm : 0);
      const b = hasMax ? h.precipMax : (typeof h.precipMm === "number" ? h.precipMm : 0);
      if (a === b) return nfNO.format(a);
      return `${nfNO.format(a)}–${nfNO.format(b)}`;
    }
    if (typeof h.precipMm === "number") {
      if (h.precipMm === 0) return "";
      return nfNO.format(h.precipMm);
    }
    return "—";
  }

  const cardStyle: React.CSSProperties = {
    flex: "0 0 auto",
    width: "100%",
    background: theme.card,
    borderRadius: 20,
    padding: 20,
    border: `1px solid ${theme.border}`,
    boxSizing: "border-box",
  };

  return (
    <section style={cardStyle}>
      {!yr ? (
        <div style={{ opacity: 0.7, fontSize: "3.6em" }}>Laster været…</div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "18%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "22%" }} />
              </colgroup>
              <thead>
                <tr style={{ textAlign: "left", opacity: 0.65, fontSize: "1.8em" }}>
                  <th style={{ padding: "0.1em 0.3em", paddingLeft: 30 }}>Tid</th>
                  <th style={{ padding: "0.1em 0.3em", paddingLeft: 30 }}>Vær</th>
                  <th style={{ padding: "0.1em 0.3em" }}>Temp.</th>
                  <th style={{ padding: "0.1em 0.3em" }}>Nedbør</th>
                  <th style={{ padding: "0.1em 0.3em", textAlign: "right", paddingRight: 44 }}>Vind (m/s)</th>
                </tr>
              </thead>
              <tbody>
                {yr.hours?.map((h: any, i: number) => {
                  const url = iconUrlForSymbol(h.symbol, isDay);
                  return (
                    <tr key={i} style={{ borderTop: i > 0 ? `1px solid ${theme.border}` : "none" }}>
                      <td style={{ padding: "0.4em 0.5em", paddingLeft: 30, fontSize: "2.8em", fontWeight: 400 }}>
                        {h.time}
                      </td>

                      <td style={{ padding: "0.4em 0.5em", fontSize: "3.5em" }}>
                        {url ? (
                          <img
                            src={url}
                            alt={h.symbol || "vær"}
                            style={{ height: "1.5em", display: "block" }}
                            loading="eager"
                            decoding="async"
                          />
                        ) : (
                          <span>{symbolToEmoji(h.symbol)}</span>
                        )}
                      </td>

                      <td style={{ padding: "0.4em 0.5em", fontSize: "3.5em" }}>
                        {h.temp ?? "—"}°
                      </td>
                      <td style={{ padding: "0.4em 0.5em", fontSize: "3.5em", color: "#046dc9ff", paddingLeft: 40 }}>
                        {renderPrecip(h)}
                      </td>
                      <td
                        style={{
                          padding: "0.4em 0.5em",
                          paddingRight: 44,
                          fontSize: "3.5em",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          justifyContent: "flex-end",
                          textAlign: "right",
                        }}
                      >
                        <span>{h.wind ?? "—"}</span>
                        {typeof h.gust === "number" && <span style={{ opacity: 0.6 }}>({h.gust})</span>}
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 20 20"
                          style={{
                            marginLeft: 16,
                            transform: `rotate(${typeof h.dir === "number" ? h.dir + 180 : 0}deg)`,
                            display: "inline-block",
                            flex: "0 0 auto",
                          }}
                          aria-label="Vindretning"
                        >
                          <g>
                            <line x1="10" y1="4" x2="10" y2="16" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                            <polygon points="10,4 14,8 6,8" fill="#fff" />
                          </g>
                        </svg>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <PoweredBy logo={isDay ? yrLogoLight : yrLogoDark} alt="YR logo" />
        </>
      )}
    </section>
  );
}
