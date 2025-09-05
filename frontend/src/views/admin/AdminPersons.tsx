// frontend/src/views/admin/AdminPersons.tsx
import { useEffect, useMemo, useState } from "react";
import type { Theme } from "../../types";

/* ---------- cache-buster ---------- */
function cacheBusted(url: string, v?: number) {
  if (!url) return url;
  const sep = url.includes("?") ? "&" : "?";
  return typeof v === "number" ? `${url}${sep}v=${v}` : url;
}

/* ---------- Build-time fallback avatars from /src/assets/avatars/*.png ---------- */
const avatarGlobs = import.meta.glob("/src/assets/avatars/*.png", {
  eager: true,
  as: "url",
}) as Record<string, string>;

const FALLBACK_AVATAR_BY_SLUG: Record<string, string> = {};
for (const fullPath in avatarGlobs) {
  const file = fullPath.split("/").pop()!; // e.g. "eskil.png"
  const slug = file.replace(/\.png$/i, ""); // "eskil"
  FALLBACK_AVATAR_BY_SLUG[slug] = avatarGlobs[fullPath];
}
function getFallbackAvatarUrl(slug: string) {
  return FALLBACK_AVATAR_BY_SLUG[slug] || "";
}

/* ---------- Types ---------- */
type Person = { name: string; macs?: string[]; ips?: string[] };
type ListResponse = { items?: Person[] } | Person[];

/* ---------- Component ---------- */
export default function AdminPersons({ theme }: { theme: Theme }) {
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

  // State
  const [items, setItems] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [avatarVersion, setAvatarVersion] = useState<Record<string, number>>({});

  // Form visibility & mode
  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null); // original name when editing

  // Form fields
  const [name, setName] = useState("");
  const [mac, setMac] = useState("");
  const [ip, setIp] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null); // data URL
  const [avatarChanged, setAvatarChanged] = useState(false); // whether to upload on save
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const r = await fetch("/api/people", { cache: "no-store" });
      if (!r.ok) throw new Error(`Server ${r.status}`);
      const j: ListResponse = await r.json();
      const arr = Array.isArray(j) ? j : (j.items ?? []);
      setItems(arr);
    } catch (e: any) {
      setErr(e?.message || "Kunne ikke laste personer");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingKey(null);
    setName("");
    setMac("");
    setIp("");
    setAvatarPreview(null);
    setAvatarChanged(false);
  };

  const startEdit = (p: Person) => {
    setEditingKey(p.name);
    setName(p.name);
    setMac((p.macs?.[0] ?? "").toLowerCase());
    setIp(p.ips?.[0] ?? "");
    setAvatarPreview(null);
    setAvatarChanged(false);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSelectAvatar = async (file: File | null) => {
    if (!file) {
      setAvatarPreview(null);
      setAvatarChanged(false);
      return;
    }
    if (!/\.png$/i.test(file.name) && file.type !== "image/png") {
      alert("Vennligst velg en PNG-fil.");
      return;
    }

    try {
      const resizedDataUrl = await resizeImageToPng(file, 256); // shrink to 256px max
      setAvatarPreview(resizedDataUrl);
      setAvatarChanged(true);
    } catch (err) {
      console.error("Resize failed", err);
      alert("Kunne ikke behandle bildet.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nm = name.trim();
    if (!nm) {
      setErr("Navn kan ikke være tomt.");
      return;
    }

    const macNorm = normMacInput(mac);
    if (mac && !macNorm) {
      setErr("MAC-adresse må være på formen aa:bb:cc:dd:ee:ff");
      return;
    }

    const payload: Person = {
      name: nm,
      macs: macNorm ? [macNorm] : [],
      ips: ip.trim() ? [ip.trim()] : [],
    };

    try {
      setSaving(true);
      setErr("");

      if (editingKey) {
        const r = await fetch(`/api/people/${encodeURIComponent(editingKey)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const t = await r.text().catch(() => "");
          throw new Error(t || `Server ${r.status}`);
        }
        if (avatarChanged && avatarPreview) {
          await uploadAvatar(nm, avatarPreview);
          const slug = slugFromName(nm);
          setAvatarVersion((m) => ({ ...m, [slug]: Date.now() }));
          notifyAvatarUpdated(nm);
        }
      } else {
        const r = await fetch(`/api/people`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const t = await r.text().catch(() => "");
          throw new Error(t || `Server ${r.status}`);
        }
        if (avatarChanged && avatarPreview) {
          await uploadAvatar(nm, avatarPreview);
          const slug = slugFromName(nm);
          setAvatarVersion((m) => ({ ...m, [slug]: Date.now() }));
          notifyAvatarUpdated(nm);
        }
      }

      await load();
      resetForm();
      setShowForm(false);
    } catch (e: any) {
      setErr(e?.message || "Kunne ikke lagre person");
    } finally {
      setSaving(false);
    }
  };

  const del = async (personName: string) => {
    if (!confirm(`Slette ${personName}?`)) return;
    try {
      setSaving(true);
      setErr("");
      const r = await fetch(`/api/people/${encodeURIComponent(personName)}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error(`Server ${r.status}`);
      await load();
      if (editingKey === personName) {
        resetForm();
        setShowForm(false);
      }
    } catch (e: any) {
      setErr(e?.message || "Kunne ikke slette");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- UI ---------- */
  const shell = { maxWidth: 1100, margin: "0 auto", padding: "0 12px 28px" } as const;

  return (
    <div style={shell}>
      {/* Header/Nav */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <a href="#admin" style={pill(theme)}>← Tilbake</a>
        <h1 style={{ margin: 0, fontSize: 26, justifySelf: "center" }}>Personer</h1>
        <div />
      </div>

      {/* Collapsible Create / Edit form */}
      {showForm && (
        <div style={{ ...card(theme), marginBottom: 16 }}>
          <h2 style={{ margin: 0, marginBottom: 12, fontSize: 18 }}>
            {editingKey ? `Rediger: ${editingKey}` : "Ny person"}
          </h2>

          <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
            {/* Avatar + Name row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isNarrow ? "1fr" : "auto 1fr",
                gap: 14,
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <AvatarPreview
                  theme={theme}
                  name={name || editingKey || ""}
                  dataUrl={avatarPreview}
                  version={avatarVersion[slugFromName(name || editingKey || "")]}
                />
                <FileButton
                  theme={theme}
                  label="Velg PNG"
                  accept="image/png"
                  onSelect={onSelectAvatar}
                />
                {avatarPreview && (
                  <Button
                    variant="ghost"
                    theme={theme}
                    onClick={() => {
                      setAvatarPreview(null);
                      setAvatarChanged(false);
                    }}
                  >
                    Fjern valgt
                  </Button>
                )}
              </div>

              <div>
                <label style={labelStyle}>Navn</label>
                <Input theme={theme} value={name} onChange={setName} placeholder="Navn" />
              </div>
            </div>

            {/* MAC + IP */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <label style={labelStyle}>MAC-adresse</label>
                <Input
                  theme={theme}
                  value={mac}
                  onChange={setMac}
                  placeholder="aa:bb:cc:dd:ee:ff"
                />
              </div>
              <div>
                <label style={labelStyle}>IP-adresse</label>
                <Input theme={theme} value={ip} onChange={setIp} placeholder="192.168.0.1" />
              </div>
            </div>

            {/* Errors + Actions */}
            {err && <div style={{ color: "#e53935", fontSize: 14 }}>{err}</div>}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isNarrow ? "1fr" : "auto auto",
                gap: 10,
              }}
            >
              <Button type="submit" variant="primary" theme={theme} disabled={saving}>
                {editingKey ? "Lagre endringer" : "Opprett person"}
              </Button>
              <Button
                variant="ghost"
                theme={theme}
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Avbryt
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div style={card(theme)}>
        <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Eksisterende</h2>
        {loading ? (
          <div style={{ opacity: 0.7 }}>Laster…</div>
        ) : items.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Ingen personer.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
              gap: 12,
            }}
          >
            {items.map((p) => (
              <PersonCard
                key={p.name}
                person={p}
                theme={theme}
                version={avatarVersion[slugFromName(p.name)]}
                onEdit={() => startEdit(p)}
                onDelete={() => del(p.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating add button */}
      {!showForm && (
        <button
          aria-label="Legg til person"
          onClick={openNewForm}
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            padding: "14px 18px",
            borderRadius: 999,
            border: "none",
            background:
              "linear-gradient(135deg, #0082c8, #00c6ff)",
            color: "#fff",
            fontSize: 18,
            boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
            cursor: "pointer",
          }}
        >
          +
        </button>
      )}
    </div>
  );
}

/* ---------- helpers & small components ---------- */

function useIsNarrow(bp = 780) {
  const [narrow, setNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < bp : true
  );
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < bp);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [bp]);
  return narrow;
}

function card(theme: Theme): React.CSSProperties {
  return {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    padding: 16,
  };
}
function pill(theme: Theme): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    textDecoration: "none",
    fontSize: 14,
  };
}
const labelStyle: React.CSSProperties = { fontSize: 14, marginBottom: 6 };

function Input({
  value,
  onChange,
  placeholder,
  theme,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  theme: Theme;
  type?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
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
  );
}

function Button({
  children,
  onClick,
  theme,
  type = "button",
  variant = "default",
  disabled,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  theme: Theme;
  type?: "button" | "submit";
  variant?: "default" | "danger" | "ghost" | "primary";
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: theme.text,
    fontSize: 16,
    cursor: disabled ? "not-allowed" : "pointer",
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
      onMouseDown={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)")
      }
      onMouseUp={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")
      }
    >
      {children}
    </button>
  );
}

/* ---------- Person list card ---------- */
function PersonCard({
  person,
  theme,
  onEdit,
  onDelete,
  version,
}: {
  person: Person;
  theme: Theme;
  onEdit: () => void;
  onDelete: () => void;
  version?: number;
}) {
  const slug = slugFromName(person.name);
  const runtimeUrl = `/avatars/${slug}.png`;
  const fallbackUrl = getFallbackAvatarUrl(slug);

  const runtimeUrlWithV = cacheBusted(runtimeUrl, version);
  const [src, setSrc] = useState(runtimeUrlWithV);
  useEffect(() => {
    setSrc(runtimeUrlWithV);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtimeUrlWithV]);

  const mac = person.macs?.[0] || "—";
  const ip = person.ips?.[0] || "—";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        gap: 12,
        alignItems: "center",
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        padding: 12,
        background: theme.card,
      }}
    >
      <img
        src={src}
        alt=""
        width={52}
        height={52}
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          objectFit: "cover",
          background: "#0002",
        }}
        onError={() => {
          const fb = fallbackUrl ? cacheBusted(fallbackUrl, version) : "";
          if (fb && src !== fb) setSrc(fb);
        }}
      />

      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>{person.name}</div>
        <div style={{ fontSize: 12, opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          MAC: {mac} · IP: {ip}
        </div>
      </div>

      <Button theme={theme} onClick={onEdit}>
        Rediger
      </Button>
      <Button theme={theme} variant="danger" onClick={onDelete}>
        🗑️
      </Button>
    </div>
  );
}

/* ---------- Avatar preview (form) ---------- */
function AvatarPreview({
  theme,
  name,
  dataUrl,
  version,
  size = 84,
}: {
  theme: Theme;
  name: string;
  dataUrl: string | null;
  version?: number;
  size?: number;
}) {
  const slug = slugFromName(name);
  const runtimeUrl = name ? `/avatars/${slug}.png` : "";
  const fallbackUrl = name ? getFallbackAvatarUrl(slug) : "";

  const runtimeUrlWithV = runtimeUrl ? cacheBusted(runtimeUrl, version) : "";

  // Prefer chosen file; else runtime (versioned); else nothing
  const [src, setSrc] = useState<string | null>(dataUrl ?? (runtimeUrlWithV || null));

  useEffect(() => {
    if (dataUrl) setSrc(dataUrl);
    else if (runtimeUrlWithV) setSrc(runtimeUrlWithV);
    else setSrc(null);
  }, [dataUrl, runtimeUrlWithV]);

  const boxStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 16,
    objectFit: "cover",
    background: "#0002",
    border: `1px solid ${theme.border}`,
  };

  if (!src) {
    return (
      <div
        style={{
          ...boxStyle,
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          opacity: 0.7,
        }}
      >
        Ingen
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={boxStyle}
      onError={() => {
        if (src === runtimeUrlWithV && fallbackUrl) setSrc(cacheBusted(fallbackUrl, version));
      }}
    />
  );
}

function FileButton({
  theme,
  label,
  accept,
  onSelect,
}: {
  theme: Theme;
  label: string;
  accept?: string;
  onSelect: (file: File | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <label
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        background: theme.card,
        color: theme.text,
        cursor: "pointer",
        display: "inline-block",
        boxSizing: "border-box",
        maxWidth: "100%",
      }}
    >
      {busy ? "Laster…" : label}
      <input
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.currentTarget.files?.[0] || null;
          setBusy(true);
          try {
            onSelect(file);
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
}

/* ---------- utils ---------- */
async function resizeImageToPng(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      // scale down proportionally
      let { width, height } = img;
      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      // export back to PNG data URL
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Image load error"));
    img.src = URL.createObjectURL(file);
  });
}

function notifyAvatarUpdated(name: string) {
  const slug = slugFromName(name);
  // Broadcast to other tabs/parts of the app
  try {
    new BroadcastChannel("avatars").postMessage({ type: "updated", slug });
  } catch {}
  // Fallback for environments without BroadcastChannel
  try {
    localStorage.setItem(`avatarUpdated:${slug}`, String(Date.now()));
  } catch {}
}

function slugFromName(name: string) {
  return (name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .trim();
}

function normMacInput(s: string) {
  const v = (s || "").trim().toLowerCase().replace(/-/g, ":");
  return /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(v) ? v : "";
}

async function uploadAvatar(name: string, dataUrl: string) {
  const r = await fetch(`/api/people/${encodeURIComponent(name)}/avatar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: dataUrl }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(t || `Avatar server ${r.status}`);
  }
}
