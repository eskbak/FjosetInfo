import { useEffect, useState } from "react";
import PoweredBy from "../components/PoweredBy";
import type { Theme, Colors } from "../types";
import nrkLogoDark from "../assets/nrkLogoDark.png";
import nrkLogoLight from "../assets/nrkLogoLight.png";

type Props = {
  theme: Theme;
  colors: Colors;
  isDay: boolean;
  rotateMs?: number; // default 20000
};

export default function NRKCard({ theme, isDay, colors, rotateMs = 10000 }: Props) {
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
    flex: "1 1 auto", // Allow the card to grow and shrink
    width: "100%",
    background: theme.card,
    borderRadius: 20,
    padding: 20,
    border: `1px solid ${theme.border}`,
    boxSizing: "border-box",
    minHeight: 0, // Allow shrinking below content size
    maxHeight: "100%", // Don't exceed parent container
    display: "flex",
    flexDirection: "column",
    overflow: "hidden", // Prevent content from overflowing the card
  };

  if (!nrk?.items?.length) {
    return (
      <section style={cardStyle}>
        <div style={{ 
          opacity: 0.7, 
          textAlign: "center", 
          fontSize: "3.0em", 
          padding: 40,
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          Laster nyheter…
        </div>
        <PoweredBy logo={isDay ? nrkLogoLight : nrkLogoDark} alt="YR logo" />
      </section>
    );
  }

  const it = nrk.items[index % nrk.items.length];
  const hasImage = Boolean(it.image);

  // ⬇⬇⬇ Adjust the IMAGE HEIGHT here (full-width image on top)
  const IMAGE_HEIGHT = "clamp(120px, 20vh, 300px)"; // Reduced max height for better fit

  return (
    <section style={cardStyle}>
      <article
        style={{
          borderRadius: 14,
          padding: "1em",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          alignItems: "start",
          flex: 1,
          minHeight: 0, // Allow shrinking
          overflow: "hidden", // Prevent content overflow
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
          <div style={{ fontWeight: 600, fontSize: "5.0em", lineHeight: 1.1, opacity: 0.8, textAlign: "center" }}>
            {it.title}
          </div>
        </div>

        {/* DESCRIPTION */}
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: 12, 
          flex: 1,
          minHeight: 0,
          overflow: "hidden"
        }}>
          {it.description && (
            <div
              style={{
                opacity: 0.85,
                fontSize: "4.5em",
                fontWeight: 200,
                lineHeight: 1.2,
                display: "-webkit-box",
                WebkitLineClamp: 4, // Reduced from 6 to fit better
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                minHeight: 0,
                paddingBottom: 15,
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
            flexShrink: 0, // Don't shrink the dots section
          }}
        >
          {nrk.items.map((_: any, i: number) => (
            <span
              key={i}
              style={{
                width: 15,
                height: 15,
                borderRadius: 999,
                background: i === (index % nrk.items.length) ? colors.NRK.primary : theme.border,
                display: "inline-block",
              }}
            />
          ))}
        </div>
      </article>

      <PoweredBy logo={isDay ? nrkLogoLight : nrkLogoDark} alt="YR logo" />
    </section>
  );
}
