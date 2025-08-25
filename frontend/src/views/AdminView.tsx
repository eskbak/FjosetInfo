import { useEffect, useState } from "react";
import { useSettings } from "../state/SettingsContext";

export default function AdminView() {
  const { settings, loading, save, reload } = useSettings();
  const [local, setLocal] = useState(settings);
  const [overlaysText, setOverlaysText] = useState<string>("");

  useEffect(() => { setLocal(settings); }, [settings]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/overlays", { cache: "no-store" });
        const j = await r.json();
        setOverlaysText(JSON.stringify(j, null, 2));
      } catch {}
    })();
  }, []);

  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 };

  return (
    <section style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0, fontSize: 28 }}>Admin</h2>

      {loading ? <div>Laster…</div> : (
        <>
          <div style={{ ...row, flexWrap: "wrap" }}>
            <label><input type="checkbox"
              checked={local.viewsEnabled.dashboard}
              onChange={e => setLocal({ ...local, viewsEnabled: { ...local.viewsEnabled, dashboard: e.target.checked } })}
            /> Dashboard</label>
            <label><input type="checkbox"
              checked={local.viewsEnabled.news}
              onChange={e => setLocal({ ...local, viewsEnabled: { ...local.viewsEnabled, news: e.target.checked } })}
            /> News</label>
            <label><input type="checkbox"
              checked={local.viewsEnabled.calendar}
              onChange={e => setLocal({ ...local, viewsEnabled: { ...local.viewsEnabled, calendar: e.target.checked } })}
            /> Calendar</label>
          </div>

          <div style={row}>
            <label>Dag start (0–23): <input type="number" min={0} max={23}
              value={local.dayHours.start}
              onChange={e => setLocal({ ...local, dayHours: { ...local.dayHours, start: Number(e.target.value) } })}
              style={{ width: 80 }}
            /></label>
            <label>Dag slutt (1–24): <input type="number" min={1} max={24}
              value={local.dayHours.end}
              onChange={e => setLocal({ ...local, dayHours: { ...local.dayHours, end: Number(e.target.value) } })}
              style={{ width: 80 }}
            /></label>
          </div>

          <div style={row}>
            <label>Dager frem (kalender): <input type="number" min={0} max={14}
              value={local.calendarDaysAhead}
              onChange={e => setLocal({ ...local, calendarDaysAhead: Number(e.target.value) })}
              style={{ width: 80 }}
            /></label>
          </div>

          <div style={row}>
            <label>Visningsvarighet (sek): <input type="number" min={5} max={600}
              value={local.rotateSeconds}
              onChange={e => setLocal({ ...local, rotateSeconds: Number(e.target.value) })}
              style={{ width: 100 }}
            /></label>
          </div>

          <div style={{ ...row, justifyContent: "flex-start" }}>
            <button onClick={() => save(local)} style={btn}>Lagre innstillinger</button>
            <button onClick={() => reload()} style={{ ...btn, opacity: 0.7 }}>Last på nytt</button>
          </div>

          <hr style={{ margin: "20px 0", opacity: 0.2 }} />

          <h3 style={{ marginTop: 0 }}>Overlays</h3>
          <p style={{ opacity: 0.7, marginTop: 0 }}>Rediger hele JSON-strukturen ({`{ "overlays": [...] }`})</p>
          <textarea
            value={overlaysText}
            onChange={e => setOverlaysText(e.target.value)}
            spellCheck={false}
            style={{ width: "100%", height: 300, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 14 }}
          />
          <div style={{ ...row }}>
            <button
              onClick={async () => {
                try {
                  const parsed = JSON.parse(overlaysText);
                  const r = await fetch("/api/overlays", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(parsed),
                  });
                  if (!r.ok) throw new Error(await r.text());
                  alert("Overlays lagret ✅");
                } catch (e: any) {
                  alert("Ugyldig JSON eller lagring feilet: " + (e?.message || e));
                }
              }}
              style={btn}
            >
              Lagre overlays
            </button>
          </div>
        </>
      )}
    </section>
  );
}

const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #ccc",
  background: "#eee",
  cursor: "pointer",
};
