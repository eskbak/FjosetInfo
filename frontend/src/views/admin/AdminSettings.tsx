// frontend/src/views/admin/AdminSettings.tsx
import { useEffect, useMemo, useState } from "react";
import type { Theme } from "../../types";

type Settings = {
  viewsEnabled: { dashboard: boolean; news: boolean; calendar: boolean; drinksMenu?: boolean };
  dayHours: { start: number; end: number }; // end exclusive
  calendarDaysAhead: number;                // 0..14
  rotateSeconds: number;                    // 5..600
};

const DEFAULTS: Settings = {
  viewsEnabled: { dashboard: true, news: true, calendar: true, drinksMenu: false },
  dayHours: { start: 6, end: 18 },
  calendarDaysAhead: 5,
  rotateSeconds: 30,
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
    boxSizing: "border-box",
    maxWidth: "100%",
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
      onMouseDown={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)")}
      onMouseUp={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  theme,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  theme: Theme;
  label: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: 12,
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
      }}
    >
      <span>{label}</span>
      <span
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        style={{
          width: 48,
          height: 28,
          borderRadius: 999,
          position: "relative",
          background: checked ? "linear-gradient(135deg, #0082c8, #00c6ff)" : "#5555",
          cursor: "pointer",
          transition: "background 120ms",
          border: `1px solid ${theme.border}`,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 24 : 3,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 120ms",
            boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
          }}
        />
      </span>
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
  theme,
  "aria-label": ariaLabel,
}: {
  value: string | number;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  theme: Theme;
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
        maxWidth: "100%",
        boxSizing: "border-box",
        padding: "14px 16px",
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        background: theme.card,
        color: theme.text,
        fontSize: 16,
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

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  theme,
  suffix,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  theme: Theme;
  suffix?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 8,
      }}
    >
      <input
        aria-label={ariaLabel}
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
          else onChange(min);
        }}
        style={{
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          padding: "14px 16px",
          borderRadius: 12,
          border: `1px solid ${theme.border}`,
          background: theme.card,
          color: theme.text,
          fontSize: 16,
        }}
      />
      {suffix && <span style={{ opacity: 0.8 }}>{suffix}</span>}
    </div>
  );
}

export default function AdminSettings({ theme }: { theme: Theme }) {
  // Guard: require login
  const authed = (() => {
    try {
      return sessionStorage.getItem("adminAuthed") === "1";
    } catch {
      return false;
    }
  })();
  if (!authed) {
    window.location.hash = "#admin";
    return null;
  }

  const isNarrow = useIsNarrow(780);

  // Local state
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const hourOptions = useMemo(
    () =>
      Array.from({ length: 25 }, (_, i) => {
        const label = i.toString().padStart(2, "0") + ":00";
        return { value: String(i), label };
      }),
    []
  );

  // Load current
  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const r = await fetch("/api/settings", { cache: "no-store" });
      if (!r.ok) throw new Error(`Server ${r.status}`);
      const j: Settings = await r.json();
      setSettings(j);
    } catch (e: any) {
      setError(e?.message || "Kunne ikke laste innstillinger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Client-side validation helpers
  const invalidEnd = settings.dayHours.end <= settings.dayHours.start;
  const dirtyNotice =
    "Husk å trykke “Lagre” for å lagre endringer.";

  const save = async () => {
    try {
      setSaving(true);
      setError("");
      // Patch only changed fields is ideal; for simplicity we can send full object
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        const msg = j?.errors ? j.errors.join(", ") : `Server ${r.status}`;
        throw new Error(msg);
      }
      // Refresh after save
      await load();
    } catch (e: any) {
      setError(e?.message || "Kunne ikke lagre");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!confirm("Tilbakestille til standardverdier?")) return;
    try {
      setSaving(true);
      setError("");
      const r = await fetch("/api/settings/reset", { method: "POST" });
      if (!r.ok) throw new Error(`Server ${r.status}`);
      const j = await r.json();
      setSettings(j.settings || DEFAULTS);
    } catch (e: any) {
      setError(e?.message || "Kunne ikke tilbakestille");
    } finally {
      setSaving(false);
    }
  };

  // UI
  const pill = {
    padding: "6px 10px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    textDecoration: "none",
    fontSize: 14,
  } as const;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 12px 28px" }}>
      {/* Header: back left, title centered */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <a href="#admin" style={pill}>← Tilbake</a>
        <h1 style={{ margin: 0, fontSize: 26, justifySelf: "center" }}>Innstillinger</h1>
        <div />
      </div>

      <div style={{ ...card(theme), marginBottom: 16 }}>
  <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 18 }}>DrinksMenu</h2>
  <div style={{ display: "grid", gap: 10 }}>
    <Toggle
      theme={theme}
      label="Aktiver DrinksMenu (deaktiverer andre visninger)"
      checked={!!settings.viewsEnabled.drinksMenu}
      onChange={(on) =>
        setSettings((s) => {
          if (on) {
            // Activate DrinksMenu, disable others
            return { 
              ...s, 
              viewsEnabled: { dashboard: false, news: false, calendar: false, drinksMenu: true } 
            };
          } else {
            // Deactivate DrinksMenu, restore to a sensible default (all on)
            return { 
              ...s, 
              viewsEnabled: { dashboard: true, news: true, calendar: true, drinksMenu: false } 
            };
          }
        })
      }
    />
    <div style={{ fontSize: 12, opacity: 0.75 }}>
      Når aktivert, vises kun DrinksMenu i fullskjerm.
    </div>
  </div>
</div>

<div style={{ ...card(theme), marginBottom: 16, opacity: settings.viewsEnabled.drinksMenu ? 0.5 : 1 }}>
  <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Visninger</h2>
  <div style={{ display: "grid", gap: 10 }}>
    <Toggle
      theme={theme}
      label="Dashboard"
      checked={settings.viewsEnabled.dashboard}
      onChange={(v) =>
        setSettings((s) => ({ ...s, viewsEnabled: { ...s.viewsEnabled, dashboard: v } }))
      }
    />
    <Toggle
      theme={theme}
      label="Nyheter"
      checked={settings.viewsEnabled.news}
      onChange={(v) =>
        setSettings((s) => ({ ...s, viewsEnabled: { ...s.viewsEnabled, news: v } }))
      }
    />
    <Toggle
      theme={theme}
      label="Kalender"
      checked={settings.viewsEnabled.calendar}
      onChange={(v) =>
        setSettings((s) => ({ ...s, viewsEnabled: { ...s.viewsEnabled, calendar: v } }))
      }
    />
  </div>
  {settings.viewsEnabled.drinksMenu && (
    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
      Disse er låst fordi DrinksMenu er aktivert.
    </div>
  )}
</div>

      <div style={{ ...card(theme), marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Dag / natt</h2>
        <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>Start (inkludert)</label>
            <Select
              aria-label="Starttime"
              value={settings.dayHours.start}
              onChange={(v) =>
                setSettings((s) => {
                  const start = Number(v);
                  // Ensure end > start
                  let end = s.dayHours.end;
                  if (end <= start) end = Math.min(24, start + 1);
                  return { ...s, dayHours: { start, end } };
                })
              }
              options={hourOptions}
              theme={theme}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>Slutt (eksklusiv)</label>
            <Select
              aria-label="Endtime"
              value={settings.dayHours.end}
              onChange={(v) =>
                setSettings((s) => ({ ...s, dayHours: { ...s.dayHours, end: Number(v) } }))
              }
              options={hourOptions}
              theme={theme}
            />
          </div>
        </div>
        {invalidEnd && (
          <div style={{ color: "#e53935", fontSize: 14, marginTop: 8 }}>
            Slutt må være større enn start.
          </div>
        )}
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
          UI regnes som «dag» i intervallet [start, slutt).
        </div>
      </div>

      <div style={{ ...card(theme), marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Kalender</h2>
        <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>
              Dager frem i tid (0–14)
            </label>
            <NumberInput
              value={settings.calendarDaysAhead}
              onChange={(n) => setSettings((s) => ({ ...s, calendarDaysAhead: n }))}
              min={0}
              max={14}
              step={1}
              theme={theme}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6 }}>
              Rotasjonstid (5–600 sek)
            </label>
            <NumberInput
              value={settings.rotateSeconds}
              onChange={(n) => setSettings((s) => ({ ...s, rotateSeconds: n }))}
              min={5}
              max={600}
              step={1}
              theme={theme}
              suffix="sek"
            />
          </div>
        </div>
      </div>

      {error && (
        <div style={{ color: "#e53935", fontSize: 14, marginBottom: 10 }}>{error}</div>
      )}
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>{dirtyNotice}</div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isNarrow ? "1fr" : "auto auto",
          gap: 10,
        }}
      >
        <Button variant="primary" theme={theme} onClick={save} disabled={saving || invalidEnd}>
          {saving ? "Lagrer…" : "Lagre"}
        </Button>
        <Button variant="ghost" theme={theme} onClick={resetToDefaults} disabled={saving}>
          Tilbakestill til standard
        </Button>
      </div>

      {loading && (
        <div style={{ marginTop: 12, opacity: 0.7, fontSize: 14 }}>Laster innstillinger…</div>
      )}
    </div>
  );
}
