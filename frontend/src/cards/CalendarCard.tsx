import React, { useEffect, useState } from "react";

type Event = {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
};

export default function CalendarCard() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetch("/api/calendar/upcoming")
      .then(res => res.json())
      .then(data => setEvents(data.events || []));
  }, []);

  return (
    <section style={{
      borderRadius: 14,
      padding: "1.2em",
      border: "1px solid #e5e7eb",
      background: "#fff",
      marginBottom: 24,
      minWidth: 320,
      maxWidth: 480,
    }}>
      <h2 style={{ fontSize: "1.3em", marginBottom: 12 }}>Kommende kalenderhendelser</h2>
      {events.length === 0 && <div>Ingen kommende hendelser</div>}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {events.map(ev => (
          <li key={ev.id} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700 }}>{ev.summary}</div>
            <div style={{ fontSize: "0.95em", opacity: 0.7 }}>
              {new Date(ev.start).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" })}
              {ev.location && <> · {ev.location}</>}
            </div>
            {ev.description && (
              <div style={{ fontSize: "0.9em", opacity: 0.6, marginTop: 2 }}>
                {ev.description}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}