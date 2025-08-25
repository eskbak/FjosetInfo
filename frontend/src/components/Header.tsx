import { useEffect, useState } from "react";
import Clock from "./Clock";
import kua from "../assets/kua.png"; // adjust path if your file lives elsewhere

function PresenceLine() {
  const [present, setPresent] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const r = await fetch("/api/presence");
      const j = await r.json();
      setPresent(Array.isArray(j.present) ? j.present : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 20000); // 20s
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ fontSize: "1.25em", marginTop: 6, opacity: 0.9 }}>
      <strong>Hjemme:&nbsp;</strong>
      {loading ? "…" : present.length ? present.join(", ") : "Ingen"}
    </div>
  );
}

export default function Header({ todayText }: { todayText: string }) {
  return (
    <header
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "0.6em 1.2em",
        paddingBottom: 30,
        gap: 12,
      }}
    >
      <div style={{ justifySelf: "start" }}>
        <Clock />
        <PresenceLine />
      </div>

      <div style={{ justifySelf: "center", lineHeight: 0 }}>
        <img
          src={kua}
          alt="Kua"
          style={{
            height: "10em",
            display: "block",
          }}
        />
      </div>

      <h2
        style={{
          justifySelf: "end",
          fontSize: "5.5em",
          fontWeight: 400,
          margin: 0,
          whiteSpace: "nowrap",
          textAlign: "right",
          opacity: 0.75,
        }}
      >
        {todayText}
      </h2>
    </header>
  );
}
