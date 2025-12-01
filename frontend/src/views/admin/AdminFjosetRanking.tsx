// Admin FjosetRanking removed — placeholder to complete cleanup.
export default function AdminFjosetRanking() {
  return null;
}
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