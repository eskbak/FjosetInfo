import React, { useEffect, useState } from "react";

type Row = {
  name: string;
  P: number;
  W: number;
  D: number;
  L: number;
  GF: number;
  GA: number;
  GD: number;
  Pts: number;
};

export default function AdminFjosetRanking() {
  const [players, setPlayers] = useState<string[]>(["", "", "", "", "", ""]);
  const [table, setTable] = useState<Row[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Result form
  const [home, setHome] = useState<string>("");
  const [away, setAway] = useState<string>("");
  const [homeGoals, setHomeGoals] = useState<number>(0);
  const [awayGoals, setAwayGoals] = useState<number>(0);
  const [date, setDate] = useState<string>("");

  const load = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/fjoset/ranking");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setPlayers(j.players?.length ? j.players : ["", "", "", "", "", ""]);
      setTable(j.table || []);
      setResults(j.results || []);
      // default selects
      if (j.players?.length) {
        setHome(j.players[0] || "");
        setAway(j.players[1] || j.players[0] || "");
      }
    } catch (e: any) {
      setStatus(`Feil: ${e?.message || "Kan ikke laste"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function savePlayers(e?: React.FormEvent) {
    e?.preventDefault();
    setStatus("Lagrer spillere...");
    try {
      const p = players.map((x) => (x || "").trim()).slice(0, 6);
      if (p.length !== 6 || p.some((x) => !x)) {
        setStatus("Skriv 6 gyldige spillernavn.");
        return;
      }
      const res = await fetch("/api/fjoset/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players: p }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.status);
      setStatus("Spillere oppdatert.");
      await load();
    } catch (err: any) {
      setStatus(`Feil ved lagring: ${err?.message || err}`);
    }
  }

  async function submitResult(e?: React.FormEvent) {
    e?.preventDefault();
    setStatus("Sender resultat...");
    try {
      if (!home || !away) {
        setStatus("Velg hjemmelag og bortelag.");
        return;
      }
      if (home === away) {
        setStatus("Hjemme og borte kan ikke være samme spiller.");
        return;
      }
      const payload = {
        home,
        away,
        homeGoals: Number(homeGoals),
        awayGoals: Number(awayGoals),
        date: date || undefined,
      };
      const res = await fetch("/api/fjoset/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.status);
      setStatus("Resultat lagret.");
      // reset form scores
      setHomeGoals(0);
      setAwayGoals(0);
      setDate("");
      await load();
    } catch (err: any) {
      setStatus(`Feil ved innsending: ${err?.message || err}`);
    }
  }

  return (
    <section style={{ padding: 20, boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Fjøset — Admin</h2>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          <button onClick={load} style={{ padding: "6px 10px" }}>
            Oppdater
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
        {/* Left: players & results form */}
        <div>
          <form onSubmit={savePlayers} style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 700 }}>Spillernavn (6)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  value={players[i] ?? ""}
                  onChange={(e) => {
                    const p = [...players];
                    p[i] = e.target.value;
                    setPlayers(p);
                  }}
                  placeholder={`Spiller ${i + 1}`}
                  style={{ padding: 8, minWidth: 160 }}
                />
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <button type="submit">Lagre spillere</button>
            </div>
          </form>

          <form onSubmit={submitResult} style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 12 }}>
            <div style={{ marginBottom: 8, fontWeight: 700 }}>Legg til resultat</div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <select value={home} onChange={(e) => setHome(e.target.value)} style={{ padding: 8, minWidth: 140 }}>
                <option value="">Velg hjemmelag</option>
                {players.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={0}
                value={homeGoals}
                onChange={(e) => setHomeGoals(Number(e.target.value))}
                style={{ width: 64, padding: 8 }}
              />

              <div style={{ padding: "0 6px" }}>–</div>

              <input
                type="number"
                min={0}
                value={awayGoals}
                onChange={(e) => setAwayGoals(Number(e.target.value))}
                style={{ width: 64, padding: 8 }}
              />

              <select value={away} onChange={(e) => setAway(e.target.value)} style={{ padding: 8, minWidth: 140 }}>
                <option value="">Velg bortelag</option>
                {players.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: 13, opacity: 0.8 }}>Dato (valgfri):</label>
              <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: 8 }} />
            </div>

            <div>
              <button type="submit">Legg til resultat</button>
            </div>
          </form>

          <div style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>{status}</div>
        </div>

        {/* Right: preview table and recent results */}
        <div style={{ background: "rgba(0,0,0,0.03)", padding: 12, borderRadius: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Tabell (preview)</div>

          {loading ? (
            <div>Laster...</div>
          ) : table.length === 0 ? (
            <div style={{ opacity: 0.8 }}>Ingen resultater</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "rgba(0,0,0,0.7)" }}>
                  <th style={{ width: 28 }}>#</th>
                  <th>Navn</th>
                  <th style={{ width: 48, textAlign: "center" }}>P</th>
                  <th style={{ width: 48, textAlign: "center" }}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {table.map((r, i) => (
                  <tr key={r.name} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <td style={{ padding: "6px" }}>{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{r.name}</td>
                    <td style={{ textAlign: "center" }}>{r.P}</td>
                    <td style={{ textAlign: "center", fontWeight: 800 }}>{r.Pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Siste resultater</div>
            {results.length === 0 ? (
              <div style={{ opacity: 0.8 }}>Ingen registrerte resultater</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {results.slice(-8).reverse().map((r: any, idx: number) => (
                  <li key={idx} style={{ marginBottom: 6 }}>
                    {new Date(r.date).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" })} —{" "}
                    <strong>{r.home}</strong> {r.homeGoals}–{r.awayGoals} <strong>{r.away}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}