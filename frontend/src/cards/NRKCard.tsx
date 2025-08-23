import { useEffect, useState } from "react";
import PoweredBy from "../components/PoweredBy";
import type { Theme, Colors } from "../types";
import nrkLogo from "../assets/nrkLogo.png";

type Props = {
  theme: Theme;
  colors: Colors;
  rotateMs?: number; // default 20000
};

export default function NRKCard({ theme, colors, rotateMs = 4000 }: Props) {
  const [nrk, setNrk] = useState<any>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const fetchNrk = async () => {
      const r = await fetch(`/api/nrk/latest`);
      setNrk(await r.json());
    };
    fetchNrk();
    const poll = setInterval(fetchNrk, 120_000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    if (!nrk?.items?.length) return;
    setIndex(0);
    const id = setInterval(() => setIndex((i) => (i + 1) % nrk.items.length), rotateMs);
    return () => clearInterval(id);
  }, [nrk, rotateMs]);

  // ⬇⬇⬇ Adjust the overall CARD HEIGHT here
  // Examples:
  //   fixed height: height: 520
  //   responsive cap: maxHeight: "70vh"
  const cardStyle: React.CSSProperties = {
    flex: "0 0 auto",
    width: "100%",
    background: theme.card,
    borderRadius: 20,
    padding: 20,
    border: `1px solid ${theme.border}`,
    boxSizing: "border-box",
    // height: 520,          // <— uncomment/set if you want a fixed card height
    // maxHeight: "70vh",    // <— or use a responsive cap
  };

  if (!nrk?.items?.length) {
    return (
      <section style={cardStyle}>
        <div style={{ opacity: 0.7, textAlign: "center", fontSize: "3.0em", padding: 40 }}>Laster nyheter…</div>
        <PoweredBy logo={nrkLogo} alt="NRK logo" />
      </section>
    );
  }

  const it = nrk.items[index % nrk.items.length];
  const hasImage = Boolean(it.image);

  // ⬇⬇⬇ Adjust the IMAGE HEIGHT here (full-width image on top)
  const IMAGE_HEIGHT = "clamp(180px, 28vh, 420px)";

  return (
    <section style={cardStyle}>
      <article
        style={{
          borderRadius: 14,
          padding: "1em",
          display: "grid",
          gridTemplateColumns: "1fr",
          gridTemplateRows: "auto auto 1fr auto",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* IMAGE ON TOP, FULL WIDTH */}
        {hasImage && (
          <img
            src={it.image}
            alt=""
            style={{
              width: "100%",
              height: IMAGE_HEIGHT,   // <— tweak this for the picture’s height
              objectFit: "cover",
              borderRadius: 12,
              alignSelf: "start",
              justifySelf: "stretch",
              paddingBottom: 20,
            }}
          />
        )}

        {/* HEADER / TITLE */}
        <div>
          <div style={{ fontWeight: 600, fontSize: "4.0em", lineHeight: 1.1, opacity: 0.8, textAlign: "center" }}>
            {it.title}
          </div>
        </div>

        {/* DESCRIPTION */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          {it.description && (
            <div
              style={{
                opacity: 0.85,
                fontSize: "3.5em",
                fontWeight: 200,
                lineHeight: 1.2,
                display: "-webkit-box",
                WebkitLineClamp: 6,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                minHeight: 0,
              }}
              dangerouslySetInnerHTML={{
                __html: it.description
                  .replace(/<script[\s\S]*?<\/script>/gi, "")
                  .replace(/<style[\s\S]*?<\/style>/gi, ""),
              }}
            />
          )}
        </div>

        {/* DOTS */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginTop: 4,
            minHeight: 0,
            flexWrap: "wrap",
          }}
        >
          {nrk.items.map((_: any, i: number) => (
            <span
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: i === (index % nrk.items.length) ? colors.NRK.primary : theme.border,
                display: "inline-block",
              }}
            />
          ))}
        </div>
      </article>

      <PoweredBy logo={nrkLogo} alt="NRK logo" />
    </section>
  );
}
