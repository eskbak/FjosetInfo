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

export default function FjosetRankingView() {
  const [table, setTable] = useState<Row[]>([]);
  const [players, setPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fjoset/ranking");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setPlayers(j.players || []);
      setTable(j.table || []);
    } catch (e: any) {
      setError(e?.message || "Feil ved lasting");
      setPlayers([]);
      setTable([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60_000); // refresh every 60s
    return () => clearInterval(id);
  }, []);

  return (
    <section
      style={{
        padding: 20,
        boxSizing: "border-box",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0 }}>Fjøset Ranking</h2>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          <button onClick={load} style={{ padding: "6px 10px" }}>
            Oppdater
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ opacity: 0.8 }}>Laster...</div>
      ) : error ? (
        <div style={{ color: "crimson" }}>{error}</div>
      ) : table.length === 0 ? (
        <div style={{ opacity: 0.85 }}>Ingen resultater enda.</div>
      ) : (
        <>
          <div style={{ overflowX: "auto", flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "rgba(0,0,0,0.7)" }}>
                  <th style={{ width: 36 }}>#</th>
                  <th>Navn</th>
                  <th style={{ width: 48, textAlign: "center" }}>P</th>
                  <th style={{ width: 48, textAlign: "center" }}>W</th>
                  <th style={{ width: 48, textAlign: "center" }}>D</th>
                  <th style={{ width: 48, textAlign: "center" }}>L</th>
                  <th style={{ width: 56, textAlign: "center" }}>GF</th>
                  <th style={{ width: 56, textAlign: "center" }}>GA</th>
                  <th style={{ width: 56, textAlign: "center" }}>GD</th>
                  <th style={{ width: 64, textAlign: "center" }}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {table.map((r, i) => (
                  <tr key={r.name} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <td style={{ padding: "8px 6px" }}>{i + 1}</td>
                    <td style={{ padding: "8px 6px", fontWeight: 700 }}>{r.name}</td>
                    <td style={{ textAlign: "center" }}>{r.P}</td>
                    <td style={{ textAlign: "center" }}>{r.W}</td>
                    <td style={{ textAlign: "center" }}>{r.D}</td>
                    <td style={{ textAlign: "center" }}>{r.L}</td>
                    <td style={{ textAlign: "center" }}>{r.GF}</td>
                    <td style={{ textAlign: "center" }}>{r.GA}</td>
                    <td style={{ textAlign: "center" }}>{r.GD}</td>
                    <td style={{ textAlign: "center", fontWeight: 800 }}>{r.Pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Spillerne: {players.length ? players.join(", ") : "—"}
          </div>
        </>
      )}
    </section>
  );
}