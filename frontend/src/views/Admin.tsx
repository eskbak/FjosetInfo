import { useEffect, useState } from "react";
import type { Theme } from "../types";

type AdminProps = { theme: Theme };

type Notification = {
  id: string;
  text: string;
  color?: string;   // "fire" | "ocean" | "nature"
  dates?: string[]; // ["MM-DD", ...]
  start?: string;   // "HH:MM"
  end?: string;     // "HH:MM"
};

type ListResponse = { items?: Notification[] } | Notification[];

// Preset choices shown in the UI (we store only the key in `color`)
const COLOR_PRESETS = [
  { key: "fire",   label: "Fire",   preview: "linear-gradient(135deg, #ff416c 0%, #ff4b2b 40%, #ff9966 100%)" },
  { key: "ocean",  label: "Ocean",  preview: "linear-gradient(135deg, #667db6 0%, #0082c8 50%, #00c6ff 100%)" },
  { key: "nature", label: "Nature", preview: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
];

function card(theme: Theme): React.CSSProperties {
  return {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    padding: 16,
  };
}

export default function Admin({ theme }: AdminProps) {
  // --- responsive helper ---
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const gridCols = isNarrow ? "1fr" : "1fr 1fr";

  // --- client-side gate that talks to your server /api/admin/login ---
  const [pass, setPass] = useState("");
  const [authed, setAuthed] = useState<boolean>(() => {
    try { return sessionStorage.getItem("adminAuthed") === "1"; } catch { return false; }
  });
  const [authError, setAuthError] = useState("");

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.ok) {
        try { sessionStorage.setItem("adminAuthed", "1"); } catch {}
        setAuthed(true);
      } else {
        setAuthError(j?.error || "Feil passord.");
      }
    } catch {
      setAuthError("Kunne ikke koble til server.");
    }
  };

  // --- CRUD state ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Notification[]>([]);
  const [editing, setEditing] = useState<Notification | null>(null);

  // New/edit form
  const [text, setText] = useState("");
  const [datesCsv, setDatesCsv] = useState(""); // "MM-DD, MM-DD"
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [preset, setPreset] = useState<string>(COLOR_PRESETS[0].key);

  const parseDates = (s: string): string[] =>
    s
      .split(/[,\s]+/)
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) =>
        x
          .replace(/^(\d)\-(\d)$/, "0$1-0$2")
          .replace(/^(\d)\-(\d{2})$/, "0$1-$2")
          .replace(/^(\d{2})\-(\d)$/, "$1-0$2")
      );

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

  useEffect(() => { if (authed) load(); }, [authed]);

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
    const found = COLOR_PRESETS.find((p) => (n.color || "").toLowerCase() === p.key);
    setPreset(found?.key || COLOR_PRESETS[0].key);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Notification = {
      id: editing?.id || String(Date.now()),
      text: text.trim(),
      color: preset as any, // "fire" | "ocean" | "nature"
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

  // --- Password gate UI ---
  if (!authed) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", paddingBottom: 24 }}>
        <h1 style={{ marginBottom: 16, fontSize: isNarrow ? 24 : 28 }}>Admin</h1>
        <div style={card(theme)}>
          <form onSubmit={submitLogin}>
            <label style={{ display: "block", marginBottom: 8 }}>Passord</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Admin-passord"
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: isNarrow ? 12 : 10,
                borderRadius: 10,
                border: `1px solid ${theme.border}`,
                background: theme.card,
                color: theme.text,
                marginBottom: 12,
                fontSize: isNarrow ? 16 : 14,
              }}
            />
            {authError && <div style={{ color: "#d33", marginBottom: 8 }}>{authError}</div>}
            <button
              type="submit"
              disabled={!pass.trim()}
              style={{
                padding: isNarrow ? "12px 16px" : "10px 14px",
                width: isNarrow ? "100%" : undefined,
                borderRadius: 10,
                border: `1px solid ${theme.border}`,
                background: theme.card,
                color: theme.text,
                cursor: "pointer",
                fontSize: isNarrow ? 16 : 14,
              }}
            >
              Logg inn
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Admin UI ---
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 24 }}>
      <h1 style={{ marginBottom: 16, fontSize: isNarrow ? 24 : 28 }}>Admin</h1>

      {/* Create / Edit */}
      <div style={{ ...card(theme), marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: isNarrow ? 18 : 20 }}>
          {editing ? "Rediger varsel" : "Nytt varsel"}
        </h2>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: 6 }}>Tekst</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={isNarrow ? 4 : 3}
                placeholder="Meldingstekst…"
                style={{
                  width: "100%",
                  padding: isNarrow ? 12 : 10,
                  borderRadius: 10,
                  border: `1px solid ${theme.border}`,
                  background: theme.card,
                  color: theme.text,
                  fontSize: isNarrow ? 16 : 14,
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
                  width: "100%",
                  padding: isNarrow ? 12 : 10,
                  borderRadius: 10,
                  border: `1px solid ${theme.border}`,
                  background: theme.card,
                  color: theme.text,
                  fontSize: isNarrow ? 16 : 14,
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
                  inputMode="numeric"
                  style={{
                    flex: 1,
                    padding: isNarrow ? 12 : 10,
                    borderRadius: 10,
                    border: `1px solid ${theme.border}`,
                    background: theme.card,
                    color: theme.text,
                    fontSize: isNarrow ? 16 : 14,
                  }}
                />
                <input
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  placeholder="Slutt HH:MM"
                  inputMode="numeric"
                  style={{
                    flex: 1,
                    padding: isNarrow ? 12 : 10,
                    borderRadius: 10,
                    border: `1px solid ${theme.border}`,
                    background: theme.card,
                    color: theme.text,
                    fontSize: isNarrow ? 16 : 14,
                  }}
                />
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: 6 }}>Farge (gradient-preset)</label>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPreset(p.key)}
                    style={{
                      width: isNarrow ? "100%" : 120,
                      height: 44,
                      borderRadius: 10,
                      border: preset === p.key ? "2px solid #4caf50" : `1px solid ${theme.border}`,
                      backgroundImage: p.preview,
                      backgroundColor: theme.card,
                      color: theme.text,
                      cursor: "pointer",
                      fontSize: isNarrow ? 16 : 14,
                    }}
                    title={p.label}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <div style={{ color: "#d33", marginTop: 10 }}>{error}</div>}

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: isNarrow ? "12px 16px" : "10px 14px",
                borderRadius: 10,
                border: `1px solid ${theme.border}`,
                background: theme.card,
                color: theme.text,
                cursor: "pointer",
                fontSize: isNarrow ? 16 : 14,
                width: isNarrow ? "100%" : undefined,
              }}
            >
              {editing ? "Lagre endringer" : "Opprett varsel"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: isNarrow ? "12px 16px" : "10px 14px",
                  borderRadius: 10,
                  border: `1px solid ${theme.border}`,
                  background: theme.card,
                  color: theme.text,
                  cursor: "pointer",
                  fontSize: isNarrow ? 16 : 14,
                  width: isNarrow ? "100%" : undefined,
                }}
              >
                Avbryt
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Existing list */}
      <div style={card(theme)}>
        <h2 style={{ marginTop: 0, fontSize: isNarrow ? 18 : 20 }}>Eksisterende varsler</h2>
        {items.length === 0 ? (
          <div style={{ opacity: 0.7 }}>{loading ? "Laster…" : "Ingen varsler."}</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
            {items.map((n) => (
              <div
                key={n.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: isNarrow ? "1fr" : "1fr auto auto",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: `1px solid ${theme.border}`,
                    background: theme.card,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{n.text}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Datoer: {(n.dates || []).join(", ") || "—"}
                    {" · "}Tid: {n.start || "—"}–{n.end || "—"}
                    {" · "}Farge: <code>{n.color || "—"}</code>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: isNarrow ? "stretch" : "flex-end",
                    width: "100%",
                  }}
                >
                  <button
                    onClick={() => startEdit(n)}
                    style={{
                      padding: isNarrow ? "10px 14px" : "8px 10px",
                      borderRadius: 10,
                      border: `1px solid ${theme.border}`,
                      background: theme.card,
                      color: theme.text,
                      cursor: "pointer",
                      width: isNarrow ? "100%" : undefined,
                    }}
                  >
                    Rediger
                  </button>
                  <button
                    onClick={() => del(n.id)}
                    style={{
                      padding: isNarrow ? "10px 14px" : "8px 10px",
                      borderRadius: 10,
                      border: `1px solid ${theme.border}`,
                      background: theme.card,
                      color: "#d33",
                      cursor: "pointer",
                      width: isNarrow ? "100%" : undefined,
                    }}
                  >
                    Slett
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7, display: "flex", gap: 8, flexWrap: "wrap" }}>
        Innlogget som admin.
        <button
          onClick={() => { try { sessionStorage.removeItem("adminAuthed"); } catch {} setAuthed(false); }}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            background: theme.card,
            color: theme.text,
            cursor: "pointer",
          }}
        >
          Logg ut
        </button>
      </div>
    </div>
  );
}
