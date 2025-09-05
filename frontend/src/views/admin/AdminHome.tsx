// frontend/src/views/admin/AdminHome.tsx
import { useState } from "react";
import type { Theme } from "../../types";

type Props = { theme: Theme };

function card(theme: Theme): React.CSSProperties {
  return {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    padding: 16,
  };
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
  variant?: "default" | "primary" | "ghost";
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

function Input({
  value,
  onChange,
  placeholder,
  theme,
  type = "text",
  ariaLabel,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  theme: Theme;
  type?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
}) {
  return (
    <input
      aria-label={ariaLabel}
      type={type}
      value={value}
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

export default function AdminHome({ theme }: Props) {
  const [authed, setAuthed] = useState<boolean>(() => {
    try { return sessionStorage.getItem("adminAuthed") === "1"; } catch { return false; }
  });
  const [pass, setPass] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  if (!authed) {
    // LOGIN GATE for /#admin
    return (
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 16 }}>Admin</h1>
        <div style={card(theme)}>
          <form onSubmit={submitLogin} style={{ display: "grid", gap: 12 }}>
            <label style={{ fontSize: 14 }}>Passord</label>
            <Input
              type="password"
              value={pass}
              onChange={setPass}
              placeholder="Admin-passord"
              ariaLabel="Admin-passord"
              theme={theme}
            />
            {authError && <div style={{ color: "#e53935", fontSize: 14 }}>{authError}</div>}
            <Button type="submit" variant="primary" block theme={theme} disabled={!pass.trim() || loading}>
              {loading ? "Logger inn…" : "Logg inn"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Tiles shown ONLY after successful login
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 16 }}>Admin</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <AdminCard theme={theme} title="Varsler" href="#admin/notifications" desc="Legg til, rediger og slett varsler." />
        <AdminCard theme={theme} title="Personer" href="#admin/persons" desc="Administrer kjente enheter/personer." />
        <AdminCard theme={theme} title="Innstillinger" href="#admin/settings" desc="App-innstillinger og preferanser." />
      </div>

      <div style={{ marginTop: 14, fontSize: 12, opacity: 0.8, display: "flex", gap: 8, flexWrap: "wrap" }}>
        Innlogget.
        <Button
          theme={theme}
          variant="ghost"
          onClick={() => { try { sessionStorage.removeItem("adminAuthed"); } catch {} ; setAuthed(false); }}
        >
          Logg ut
        </Button>
      </div>
    </div>
  );
}

function AdminCard({ theme, title, desc, href }: { theme: Theme; title: string; desc: string; href: string }) {
  return (
    <a
      href={href}
      style={{
        display: "block",
        padding: 18,
        borderRadius: 16,
        border: `1px solid ${theme.border}`,
        background: theme.card,
        color: theme.text,
        textDecoration: "none",
        transition: "transform 120ms ease",
      }}
      onMouseDown={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.98)")}
      onMouseUp={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)")}
    >
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ opacity: 0.8 }}>{desc}</div>
    </a>
  );
}
