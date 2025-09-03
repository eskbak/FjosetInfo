import { useEffect, useMemo, useState } from "react";
import type { Theme, Colors } from "../types";

type Props = {
  theme: Theme;
  colors: Colors;      // kept to match your other cards’ props shape
  isDay: boolean;
  rotateMs?: number;   // default 10000
};

type ApiResponse = {
  today?: string;
  notifications?: Array<{ id: string; text: string; color: string }>;
};

type Notification = { id: string; text: string; color: string };

export default function NotificationCard({ theme, colors, isDay, rotateMs = 10000 }: Props) {
  // prevent "unused var" lint error while preserving prop shape compatibility
  void colors;
  void isDay;

  const [items, setItems] = useState<Notification[] | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const fetchNow = async () => {
      try {
        const r = await fetch("/api/notifications/today");
        const j: ApiResponse = await r.json();
        const arr = Array.isArray(j?.notifications) ? j.notifications : [];
        setItems(arr);
      } catch {
        setItems([]); // non-fatal: show “no notifications”
      }
    };

    fetchNow();
    const poll = setInterval(fetchNow, 300_000); // 5 min
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    if (!items?.length) return;
    setIndex(0);
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), rotateMs);
    return () => clearInterval(id);
  }, [items, rotateMs]);

  const current = items?.length ? items[index % items.length] : null;

  const gradientBg = `linear-gradient(
  45deg,
  #d88b7fff 0%,
  #ed552b 25%,
  #e95b30 75%,
  #a1402e 100%
)`;


  // Match NRK/other cards’ container styling
  const cardStyle: React.CSSProperties = {
    flex: "0 0 auto",
    alignSelf: "start",
    width: "100%",
    background: gradientBg,
    borderRadius: 20,
    padding: 20,
    border: `1px solid ${theme.border}`,
    boxSizing: "border-box",
    height: "auto",
    maxHeight: "100%",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    gap: 0,
  };

  if (items === null) {
    return (
      null
    );
  }

  if (current) {
    return (
      <section style={cardStyle}>
        <article
          style={{
            borderRadius: 14,
          padding: "1em",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontWeight: 200,
            fontSize: "3.0em",
            lineHeight: 1.1,
            opacity: 0.9,
            textAlign: "center",
            width: "100%",
            // Keep it simple to avoid vendor-prefixed style typing errors
            wordBreak: "break-word",
          }}
        >
          📣 {current.text} 📣
        </div>
      </article>
    </section>
  );
}
}
