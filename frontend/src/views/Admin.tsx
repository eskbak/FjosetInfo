import { useEffect, useMemo, useState } from "react";
import type { Theme } from "../types";

type AdminProps = { theme: Theme };

type Notification = {
  id: string;
  text: string;
  color?: string;      // base hex for gradient
  dates?: string[];    // ["MM-DD", ...]
  start?: string;      // "HH:MM"
  end?: string;        // "HH:MM"
};

type ListResponse = { items?: Notification[] } | Notification[];

const COLOR_PRESETS = [
  { key: "fire",  label: "Fire",  base: "#ff416c" },
  { key: "ocean", label: "Ocean", base: "#0082c8" },
  { key: "mint",  label: "Mint",  base: "#00c6ff" },
];

function gradientPreview(base: string) {
  return `linear-gradient(135deg, ${base} 0%, ${base} 40%, rgba(255,255,255,0.0) 100%)`;
}

function prettyCard(theme: Theme): React.CSSProperties {
  return {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    padding: 16,
  };
}

const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS || "";

export default function Admin({ theme }: AdminProps) {
  // ---- simple client-side gate ----
  const [pass, setPass] = useState("");
  const [authed, setAuthed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("adminAuthed") === "1";
    } catch { return false; }
  });
  const [authError, setAuthError] = useState("");

  const tryLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ADMIN_PASS) {
      // If no pass configured, allow through.
      try { sessionStorage.setItem("adminAuthed", "1"); } catch {}
      setAuthed(true);
      return;
    }
    if (pass === ADMIN_PASS) {
      try { sessionStorage.setItem("adminAuthed", "1"); } catch {}
      setAuthed(true);
      setAuthError("");
    } else {
      setAuthError("Feil passord.");
    }
  };

  // ---- CRUD state ----
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [items, setItems] = useState<Notification[]>([]);
  const [editing, setEditing] = useState<Notification | null>(null);

  // New/edit form state
  const [text, setText] = useState("");
  const [datesCsv, setDatesCsv] = useState("");     // comma/space separated MM-DD list
  const [start, setStart] = useState("");           // "HH:MM"
  const [end, setEnd] = useState("");               // "HH:MM"
  const [preset, setPreset] = useState<string>(COLOR_PRESETS[0].key);

  const presetBase = useMemo(
    () => COLOR_PRESETS.find(p => p.key === preset)?.base || COLOR_PRESETS[0].base,
    [preset]
  );

  const parseDates = (s: string): string[] =>
    s
      .split(/[,\s]+/)
      .map(x => x.trim())
      .filter(Boolean)
      .map(x => x.replace(/^(\d)\-(\d)$/, "0$1-0$2")
                 .replace(/^(\d)\-(\d{2})$/, "0$1-$2")
                 .replace(/^(\d{2})\-(\d)$/, "$1-0$2"));

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (!r.ok) throw new Error(`Server ${r.status}`);
      const j: ListResponse = await r.json();
      const arr = Array.isArray(j) ? j : (j.items ?? []);
      setItems(arr);
    } catch (e: any) {
      setError(e?.message || "Kunne ikke laste varsler");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed) load();
  }, [authed]);

  const resetForm = () => {
    setEditing(null);
    setText("");
    setDatesCsv("");
    setStart("");
    setEnd("");
    setPreset(COLOR_PRESETS[0].key);
  };

  const startEdit = (n: Notification) => {
    setEditing(n);
    setText(n.text || "");
    setDatesCsv((n.dates || []).join(", "));
    setStart(n.start || "");
    setEnd(n.end || "");
    const found = COLOR_PRESETS.find(p => (n.color || "").toLowerCase() === p.base.toLowerCase());
    setPreset(found?.key || COLOR_PRESETS[0].key);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Notification = {
      id: editing?.id || String(Date.now()),
      text: text.trim(),
      color: presetBase,
      dates: parseDates(datesCsv),
      start: start.trim() || undefined,
      end: end.trim() || undefined,
    };

    if (!payload.text) { setError("Tekst kan ikke være tom."); return; }
    if (!payload.dates?.length) { setError("Legg inn minst én dato (MM-DD)."); return; }

    try {
      setLoading(true);
      setError("");
      const method = editing ? "PUT" : "POST";
      const url = editing ? `/api/notifications/${encodeURIComponent(payload.id)}` : "/api/notifications";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || `Server ${r.status}`);
      }
      await load();
      resetForm();
    } catch (e: any) {
      setError(e?.message || "Kunne ikke lagre varsel");
    } finally {
      setLoading(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Slette varsel?")) return;
    try {
      setLoading(true);
      setError("");
      const r = await fetch(`/api/notifications/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`Server ${r.status}`);
      await load();
      if (editing?.id === id) resetForm();
    } catch (e: any) {
      setError(e?.message || "Kunne ikke slette varsel");
    } finally {
      setLoading(false);
    }
  };

  // ---- Password gate UI ----
  if (!authed) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 16 }}>Admin</h1>
        <div style={prettyCard(theme)}>
          <form onSubmit={tryLogin}>
            <label style={{ display: "block", marginBottom: 8 }}>Passord</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Admin-passord"
              style={{
                width: "100%", padding: 10, borderRadius: 10,
                border: `1px solid ${theme.border}`, background: theme.card, color: theme.text,
                marginBottom: 12,
              }}
            />
            {authError && <div style={{ color: "#d33", marginBottom: 8 }}>{authError}</div>}
            <button
              type="submit"
              disabled={!pass.trim() && !!ADMIN_PASS}
              style={{
                padding: "10px 14px", borderRadius: 10, border: `1px solid ${theme.border}`,
                background: theme.card, color: theme.text, cursor: "pointer",
              }}
            >
              Logg inn
            </button>
            {!ADMIN_PASS && (
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                Ingen VITE_ADMIN_PASS satt – tilgang er åpen (passord kreves ikke).
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // ---- Admin UI ----
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 16 }}>Admin</h1>

      {/* Create / Edit */}
      <div style={{ ...prettyCard(theme), marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>{editing ? "Rediger varsel" : "Nytt varsel"}</h2>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: 6 }}>Tekst</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="Meldingstekst…"
                style={{
                  width: "100%", padding: 10, borderRadius: 10,
                  border: `1px solid ${theme.border}`, background: theme.card, color: theme.text,
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6 }}>Dato(er)</label>
              <input
                value={datesCsv}
                onChange={(e) => setDatesCsv(e.target.value)}
                placeholder="MM-DD, MM-DD …"
                style={{
                  width: "100%", padding: 10, borderRadius: 10,
                  border: `1px solid ${theme.border}`, background: theme.card, color: theme.text,
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6 }}>Tidsrom (valgfritt)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  placeholder="Start HH:MM"
                  style={{
                    flex: 1, padding: 10, borderRadius: 10,
                    border: `1px solid ${theme.border}`, background: theme.card, color: theme.text,
                  }}
                />
                <input
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  placeholder="Slutt HH:MM"
                  style={{
                    flex: 1, padding: 10, borderRadius: 10,
                    border: `1px solid ${theme.border}`, background: theme.card, color: theme.text,
                  }}
                />
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: 6 }}>Farge (gradient-preset)</label>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {COLOR_PRESETS.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPreset(p.key)}
                    style={{
                      width: 120,
                      height: 44,
                      borderRadius: 10,
                      border: preset === p.key ? "2px solid #4caf50" : `1px solid ${theme.border}`,
                      backgroundImage: gradientPreview(p.base),
                      backgroundColor: theme.card,
                      color: theme.text,
                      cursor: "pointer",
                    }}
                    title={p.label}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                Lagres som basefarge <code>{presetBase}</code> og vises med appens gradient.
              </div>
            </div>
          </div>

          {error && <div style={{ color: "#d33", marginTop: 10 }}>{error}</div>}

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 14px", borderRadius: 10, border: `1px solid ${theme.border}`,
                background: theme.card, color: theme.text, cursor: "pointer",
              }}
            >
              {editing ? "Lagre endringer" : "Opprett varsel"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: "10px 14px", borderRadius: 10, border: `1px solid ${theme.border}`,
                  background: theme.card, color: theme.text, cursor: "pointer",
                }}
              >
                Avbryt
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Existing list */}
      <div style={prettyCard(theme)}>
        <h2 style={{ marginTop: 0 }}>Eksisterende varsler</h2>
        {items.length === 0 ? (
          <div style={{ opacity: 0.7 }}>{loading ? "Laster…" : "Ingen varsler."}</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8 }}>
            {items.map(n => (
              <div key={n.id} style={{ display: "contents" }}>
                <div style={{
                  padding: 10, borderRadius: 10, border: `1px solid ${theme.border}`,
                  background: theme.card,
                }}>
                  <div style={{ fontWeight: 600 }}>{n.text}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Datoer: {(n.dates || []).join(", ") || "—"}
                    {" · "}Tid: {n.start || "—"}–{n.end || "—"}
                    {" · "}Farge: <code>{n.color || "—"}</code>
                  </div>
                </div>
                <button
                  onClick={() => startEdit(n)}
                  style={{
                    padding: "8px 10px", borderRadius: 10, border: `1px solid ${theme.border}`,
                    background: theme.card, color: theme.text, cursor: "pointer", alignSelf: "center",
                  }}
                >
                  Rediger
                </button>
                <button
                  onClick={() => del(n.id)}
                  style={{
                    padding: "8px 10px", borderRadius: 10, border: `1px solid ${theme.border}`,
                    background: theme.card, color: "#d33", cursor: "pointer", alignSelf: "center",
                  }}
                >
                  Slett
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
        Innlogget som admin.
        <button
          onClick={() => { try { sessionStorage.removeItem("adminAuthed"); } catch {} setAuthed(false); }}
          style={{
            marginLeft: 8, padding: "4px 8px", borderRadius: 8, border: `1px solid ${theme.border}`,
            background: theme.card, color: theme.text, cursor: "pointer",
          }}
        >
          Logg ut
        </button>
      </div>
    </div>
  );
}
