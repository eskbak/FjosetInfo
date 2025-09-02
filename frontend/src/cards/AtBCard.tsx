import { useEffect, useMemo, useState } from "react";
import { differenceInMinutes, format, parseISO } from "date-fns";
import PoweredBy from "../components/PoweredBy";
import type { Theme, Colors } from "../types";
import enturLogoLight from "../assets/enturLogoLight.png";
import enturLogoDark from "../assets/enturLogoDark.png";

type Props = {
  theme: Theme;
  colors: Colors;
  isDay: boolean;
  stopPlaceId: string;           // e.g. "NSR:StopPlace:42404"
  maxRows?: number;              // default 5
};

export default function AtBCard({ theme, isDay, stopPlaceId, maxRows = 5 }: Props) {
  const [entur, setEntur] = useState<any>(null);

  useEffect(() => {
    const fetchEntur = async () => {
      const r = await fetch(`/api/entur/departures?stopPlaceId=${encodeURIComponent(stopPlaceId)}&max=12`);
      setEntur(await r.json());
    };
    fetchEntur();
    const id = setInterval(fetchEntur, 60_000);
    return () => clearInterval(id);
  }, [stopPlaceId]);

  const departures = useMemo(() => {
    const list =
      (entur?.departures || []).map((d: any) => ({
        destination: d.destination,
        aimed: d.aimed,
        expected: d.expected,
        realtime: d.realtime,
        inMin: d.expected ? Math.max(0, differenceInMinutes(parseISO(d.expected), new Date())) : null,
      })) || [];
    const filtered = list.filter((d: any) => d.inMin !== null && d.inMin >= 3 && d.inMin <= 59);
    return filtered.slice(0, maxRows);
  }, [entur, maxRows]);

  const cardStyle: React.CSSProperties = {
    flex: "0 0 auto",
    width: "100%",
    background: theme.card,
    borderRadius: 20,
    padding: 20,
    border: `1px solid ${theme.border}`,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    minHeight: 0, // Allow shrinking
    overflow: "hidden", // Prevent overflow
  };

  return (
    <section style={cardStyle}>
      {!departures.length ? (
        <div style={{ opacity: 0.75, fontSize: "2.5em", textAlign: "center", padding: 20 }}>
          Ingen avganger den neste timen.
          <br />
          Ta beina fatt!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "40%" }} />
                <col style={{ width: "30%" }} />
                <col style={{ width: "30%" }} />
              </colgroup>
              <thead>
                <tr style={{ textAlign: "left", opacity: 0.65, fontSize: "1.8em" }}>
                  <th style={{ padding: "0.35em 0.3em", paddingLeft: 30 }}>Destinasjon</th>
                  <th style={{ padding: "0.35em 0.3em" }}>Avgang</th>
                  <th style={{ padding: "0.35em 0.3em", textAlign: "right", paddingRight: 60 }}>Om</th>
                </tr>
              </thead>
              <tbody>
                {departures.map((d: any, i: number) => (
                  <tr key={i} style={{ borderTop: i > 0 ? `1px solid ${theme.border}` : "none" }}>
<td
  style={{
    padding: "0.4em 0.3em",
    paddingLeft: 35,
    fontSize: "3.5em",
    fontWeight: 400,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "200px" // adjust as needed
  }}
>
  {d.destination}
</td>

                    <td style={{ padding: "0.4em 0.3em", fontSize: "3.5em", fontVariantNumeric: "tabular-nums", fontWeight: 400 }}>
                      {d.expected ? format(parseISO(d.expected), "HH:mm") : "—"}
                    </td>
                    <td style={{ padding: "0.4em 0.3em", fontSize: "3.5em", textAlign: "right", fontWeight: 400, paddingRight: 60 }}>
                      {d.inMin !== null ? `${d.inMin} min` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PoweredBy logo={isDay ? enturLogoLight : enturLogoDark} alt="Entur logo" />
        </div>
      )}
    </section>
  );
}
