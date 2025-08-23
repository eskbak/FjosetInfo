import { useEffect, useMemo, useState } from "react";
import PoweredBy from "../components/PoweredBy";
import type { Theme, Colors } from "../types";
import yrLogoLight from "../assets/yrLogoLight.png";
import yrLogoDark from "../assets/yrLogoDark.png";

type Props = {
  theme: Theme;
  colors: Colors;
  isDay: boolean;
  lat: string;
  lon: string;
  hours?: number; // default 5
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
    return code;
  };

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
        <div style={{ opacity: 0.7, fontSize: "1.6em" }}>Laster været…</div>
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
                <tr style={{ textAlign: "left", opacity: 0.65, fontSize: "1.4em" }}>
                  <th style={{ padding: "0.1em 0.3em", paddingLeft: 30 }}>Tid</th>
                  <th style={{ padding: "0.1em 0.3em" }}>Vær</th>
                  <th style={{ padding: "0.1em 0.3em" }}>Temp.</th>
                  <th style={{ padding: "0.1em 0.3em" }}>Nedbør (mm)</th>
                  <th style={{ padding: "0.1em 0.3em", textAlign: "right", paddingRight: 44 }}>Vind (m/s)</th>
                </tr>
              </thead>
              <tbody>
                {yr.hours?.map((h: any, i: number) => (
                  <tr key={i} style={{ borderTop: i > 0 ? `1px solid ${theme.border}` : "none" }}>
                    <td style={{ padding: "0.4em 0.5em", paddingLeft: 30, fontSize: "2.0em", fontWeight: 400 }}>
                      {h.time}
                    </td>
                    <td style={{ padding: "0.4em 0.5em", fontSize: "2.0em" }}>{symbolToEmoji(h.symbol)}</td>
                    <td style={{ padding: "0.4em 0.5em", fontSize: "2.0em" }}>
                      {h.temp ?? "—"}°
                    </td>
                    <td style={{ padding: "0.4em 0.5em", fontSize: "2.0em", color: "#046dc9ff", paddingLeft: 60 }}>
                      {renderPrecip(h)}
                    </td>
                    <td
                      style={{
                        padding: "0.4em 0.5em",
                        paddingRight: 44,
                        fontSize: "2.0em",
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
                ))}
              </tbody>
            </table>
          </div>
          <PoweredBy logo={isDay ? yrLogoLight : yrLogoDark} alt="YR logo" />
        </>
      )}
    </section>
  );
}
