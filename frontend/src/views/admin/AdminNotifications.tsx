// frontend/src/views/admin/AdminNotifications.tsx
import { useEffect, useMemo, useState } from "react";
import type { Theme } from "../../types";

type Notification = {
  id: string;
  text: string;
  color?: "fire" | "ocean" | "nature";
  dates?: string[]; // ["MM-DD", ...]
  start?: string;   // "HH:MM"
  end?: string;     // "HH:MM"
};

type ListResponse = { items?: Notification[] } | Notification[];

// UI preset cards (we store only the key in `color`)
const COLOR_PRESETS = [
  { key: "fire" as const,   label: "Fire",   preview: "linear-gradient(135deg, #ff416c 0%, #ff4b2b 40%, #ff9966 100%)" },
  { key: "ocean" as const,  label: "Ocean",  preview: "linear-gradient(135deg, #667db6 0%, #0082c8 50%, #00c6ff 100%)" },
  { key: "nature" as const, label: "Nature", preview: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
];

const GRADIENT_SWATCH: Record<NonNullable<Notification["color"]>, string> = {
  fire:   "linear-gradient(135deg, #ff416c 0%, #ff4b2b 50%, #ff9966 100%)",
  ocean:  "linear-gradient(135deg, #667db6 0%, #0082c8 50%, #00c6ff 100%)",
  nature: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
};

function card(theme: Theme): React.CSSProperties {
  return {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    padding: 16,
  };
}

function useIsNarrow(breakpoint = 780) {
  const [narrow, setNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : true
  );
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return narrow;
}

/** Month/day helper for building MM-DD (no year) */
function daysInMonth(month: number) {
  if (month === 2) return 29; // allow Feb 29 since we don't carry year
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function Select({
  value,
  onChange,
  options,
  theme,
  style,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  theme: Theme;
  style?: React.CSSProperties;
  "aria-label"?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        width: "100%",
        padding: "14px 16px",
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        background: theme.card,
        color: theme.text,
        fontSize: 16,
        ...style,
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  theme,
  type = "text",
  ariaLabel,
  style,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  theme: Theme;
  type?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <input
      aria-label={ariaLabel}
      type={type}
      value={value}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "14px 16px",
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        background: theme.card,
        color: theme.text,
        fontSize: 16,
        ...style,
      }}
    />
  );
}

function Button({
  children,
  onClick,
  theme,
  type = "button",
  variant = "default",
  block,
  disabled,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  theme: Theme;
  type?: "button" | "submit";
  variant?: "default" | "danger" | "ghost" | "primary";
  block?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    padding: "14px 16px",
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    fontSize: 16,
    cursor: disabled ? "not-allowed" : "pointer",
    width: block ? "100%" : undefined,
    opacity: disabled ? 0.6 : 1,
    transition: "transform 120ms ease",
  };

  const variants: Record<string, React.CSSProperties> = {
    default: {},
    ghost: { background: "transparent" },
    danger: { color: "#e53935", borderColor: "#e53935" },
    primary: {
      background: "linear-gradient(135deg, #0082c8, #00c6ff)",
      color: "#fff",
      borderColor: "transparent",
    },
  };

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)";
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
    >
      {children}
    </button>
  );
}

function Chip({
  label,
  onRemove,
  theme,
}: {
  label: string;
  onRemove?: () => void;
  theme: Theme;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 999,
        border: `1px solid ${theme.border}`,
        background: theme.card,
        fontSize: 14,
      }}
    >
      <span>{label}</span>
      {onRemove && (
        <button
          aria-label={`Fjern ${label}`}
          onClick={onRemove}
          style={{
            border: "none",
            background: "transparent",
            color: "#e53935",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

export default function AdminNotifications({ theme }: { theme: Theme }) {
  // ---- Guard: require login (sessionStorage set by /#admin login) ----
  const authed = (() => {
    try {
      return sessionStorage.getItem("adminAuthed") === "1";
    } catch {
      return false;
    }
  })();
  if (!authed) {
    // bounce back to admin home (which has the login form)
    window.location.hash = "#admin";
    return null;
  }

  const isNarrow = useIsNarrow(780);

  // ---- CRUD ----
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Notification[]>([]);
  const [editing, setEditing] = useState<Notification | null>(null);

  // Form state
  const [text, setText] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [month, setMonth] = useState<string>(() =>
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [day, setDay] = useState<string>(() =>
    String(new Date().getDate()).padStart(2, "0")
  );
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [preset, setPreset] = useState<NonNullable<Notification["color"]>>("ocean");

  // Capitalized Norwegian month labels (no numbers shown)
  const monthOpts = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        let label = new Date(2000, i, 1)
          .toLocaleString("nb-NO", { month: "long" })
          .replace(/\.$/, "");
        label = label.charAt(0).toUpperCase() + label.slice(1);
        return { value: String(m).padStart(2, "0"), label };
      }),
    []
  );

  const dayOpts = useMemo(() => {
    const m = Number(month);
    const max = daysInMonth(m);
    return Array.from({ length: max }, (_, i) => {
      const d = i + 1;
      return { value: String(d).padStart(2, "0"), label: String(d).padStart(2, "0") };
    });
  }, [month]);

  const addDate = () => {
    const md = `${month}-${day}`;
    if (!dates.includes(md)) setDates((arr) => [...arr, md].sort());
  };
  const removeDate = (md: string) => setDates((arr) => arr.filter((d) => d !== md));

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (!r.ok) throw new Error(`Server ${r.status}`);
      const j: ListResponse = await r.json();
      const arr = Array.isArray(j) ? j : j.items ?? [];
      setItems(arr);
    } catch (e: any) {
      setError(e?.message || "Kunne ikke laste varsler");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditing(null);
    setText("");
    setDates([]);
    setStart("");
    setEnd("");
    setMonth(String(new Date().getMonth() + 1).padStart(2, "0"));
    setDay(String(new Date().getDate()).padStart(2, "0"));
    setPreset("ocean");
  };

  const startEdit = (n: Notification) => {
    setEditing(n);
    setText(n.text || "");
    setDates([...(n.dates || [])].sort());
    setStart(n.start || "");
    setEnd(n.end || "");
    setPreset((n.color as any) || "ocean");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Notification = {
      id: editing?.id || String(Date.now()),
      text: text.trim(),
      color: preset,
      dates: dates.slice(),
      start: start.trim() || undefined,
      end: end.trim() || undefined,
    };

    if (!payload.text) {
      setError("Tekst kan ikke være tom.");
      return;
    }
    if (!payload.dates?.length) {
      setError("Legg inn minst én dato (MM-DD).");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const method = editing ? "PUT" : "POST";
      const url = editing
        ? `/api/notifications/${encodeURIComponent(payload.id)}`
        : "/api/notifications";
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
      const r = await fetch(`/api/notifications/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error(`Server ${r.status}`);
      await load();
      if (editing?.id === id) resetForm();
    } catch (e: any) {
      setError(e?.message || "Kunne ikke slette varsel");
    } finally {
      setLoading(false);
    }
  };

  const gridCols = isNarrow ? "1fr" : "1fr 1fr";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <a
          href="#admin"
          style={{
            textDecoration: "none",
            fontSize: 14,
            opacity: 0.8,
            padding: "6px 10px",
            borderRadius: 10,
            border: `1px solid ${theme.border}`,
            background: theme.card,
            color: theme.text,
          }}
        >
          ← Tilbake
        </a>
        <h1 style={{ margin: 0, fontSize: 26 }}>Varsler</h1>
      </div>

      {/* Create / Edit */}
      <div style={{ ...card(theme), marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>
          {editing ? "Rediger varsel" : "Nytt varsel"}
        </h2>

        <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
          {/* Text */}
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 14 }}>Tekst</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Meldingstekst…"
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${theme.border}`,
                background: theme.card,
                color: theme.text,
                fontSize: 16,
              }}
            />
          </div>

          {/* Dates builder */}
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ fontSize: 14 }}>Dato(er)</label>
            <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr auto", gap: 10 }}>
              <Select aria-label="Dag" value={day} onChange={setDay} options={dayOpts} theme={theme} />
              <Select aria-label="Måned" value={month} onChange={setMonth} options={monthOpts} theme={theme} />
              <Button onClick={addDate} variant="primary" theme={theme}>
                Legg til dato
              </Button>
            </div>

            {/* Chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {dates.length === 0 ? (
                <div style={{ opacity: 0.7, fontSize: 14 }}>Ingen datoer lagt til ennå.</div>
              ) : (
                dates.map((d) => <Chip key={d} label={d} onRemove={() => removeDate(d)} theme={theme} />)
              )}
            </div>
          </div>

          {/* Time window */}
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ fontSize: 14 }}>Tidsrom (valgfritt)</label>
            <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr", gap: 10 }}>
              <Input type="time" value={start} onChange={setStart} placeholder="Start HH:MM" ariaLabel="Starttid" theme={theme} />
              <Input type="time" value={end} onChange={setEnd} placeholder="Slutt HH:MM" ariaLabel="Sluttid" theme={theme} />
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Hvis tomt vises varselet hele dagen. Tidspicker bruker mobilens native «rullehjul».
            </div>
          </div>

          {/* Color presets */}
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ fontSize: 14 }}>Farge (gradient)</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isNarrow ? "1fr" : `repeat(${COLOR_PRESETS.length}, 1fr)`,
                gap: 10,
              }}
            >
              {COLOR_PRESETS.map((p) => {
                const active = preset === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPreset(p.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      borderRadius: 12,
                      border: active ? "2px solid #4caf50" : `1px solid ${theme.border}`,
                      background: theme.card,
                      color: theme.text,
                      cursor: "pointer",
                      fontSize: 16,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundImage: p.preview,
                        border: "none",
                        flex: "0 0 auto",
                      }}
                    />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Errors */}
          {error && <div style={{ color: "#e53935", fontSize: 14 }}>{error}</div>}

          {/* Actions */}
          <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "auto auto", gap: 10 }}>
            <Button type="submit" variant="primary" theme={theme} disabled={loading}>
              {editing ? "Lagre endringer" : "Opprett varsel"}
            </Button>
            {editing && (
              <Button variant="ghost" theme={theme} onClick={resetForm}>
                Avbryt
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Existing list */}
      <div style={card(theme)}>
        <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Eksisterende varsler</h2>
        {items.length === 0 ? (
          <div style={{ opacity: 0.7 }}>{loading ? "Laster…" : "Ingen varsler."}</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((n) => {
              const colorKey = (n.color ?? "ocean") as "fire" | "ocean" | "nature"; // precompute cast outside JSX
              return (
                <div
                  key={n.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: isNarrow ? "1fr" : "1fr auto auto",
                    gap: 10,
                    alignItems: "center",
                    border: `1px solid ${theme.border}`,
                    borderRadius: 12,
                    padding: 12,
                    background: theme.card,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div
                      aria-hidden
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundImage: GRADIENT_SWATCH[colorKey],
                        flex: "0 0 auto",
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{n.text}</div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        Datoer: {(n.dates || []).join(", ") || "—"}
                        {" · "}Tid: {n.start || "—"}–{n.end || "—"}
                        {" · "}Farge: <code>{n.color || "—"}</code>
                      </div>
                    </div>
                  </div>

                  <Button
                    theme={theme}
                    onClick={() => startEdit(n)}
                    style={{ width: isNarrow ? "100%" : undefined }}
                  >
                    Rediger
                  </Button>
                  <Button
                    theme={theme}
                    variant="danger"
                    onClick={() => del(n.id)}
                    style={{ width: isNarrow ? "100%" : undefined }}
                  >
                    Slett
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
