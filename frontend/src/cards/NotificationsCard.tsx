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
    const poll = setInterval(fetchNow, 180_000); // 3 min
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    if (!items?.length) return;
    setIndex(0);
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), rotateMs);
    return () => clearInterval(id);
  }, [items, rotateMs]);

const current = items?.length ? items[index % items.length] : null;

type NotificationColor = "fire" | "ocean" | "nature";

const GRADIENTS: Record<NotificationColor, string> = {
  fire:   "linear-gradient(135deg, #ff416c 0%, #ff4b2b 40%, #ff9966 100%)",
  ocean:  "linear-gradient(135deg, #667db6 0%, #0082c8 50%, #00c6ff 100%)",
  nature: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
};


  // Match NRK/other cards’ container styling
  const cardStyle: React.CSSProperties = {
    flex: "0 0 auto",
    alignSelf: "start",
    width: "100%",
  backgroundColor: theme.card,
  backgroundImage: current?.color && (GRADIENTS as any)[current.color as NotificationColor]
    ? GRADIENTS[current.color as NotificationColor]
    : GRADIENTS.fire, // fallback
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
