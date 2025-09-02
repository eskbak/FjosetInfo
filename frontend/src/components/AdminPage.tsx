import { useEffect, useState } from "react";
import type { Theme } from "../types";

// Settings type matching backend
interface Settings {
  viewsEnabled: {
    dashboard: boolean;
    news: boolean;
    calendar: boolean;
  };
  dayHours: {
    start: number;
    end: number;
  };
  calendarDaysAhead: number;
  rotateSeconds: number;
}

interface Birthday {
  name: string;
  date: string; // MM-DD format
}

interface KnownDevice {
  name: string;
  macs: string[];
  ips: string[];
}

interface Notification {
  id: string;
  text: string;
  dates: string[]; // Array of MM-DD format dates
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState<Settings | null>(null);
  const [settingsChanged, setSettingsChanged] = useState(false);
  
  // Birthday state
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [newBirthday, setNewBirthday] = useState({ name: "", date: "" });
  
  // Known Devices state
  const [knownDevices, setKnownDevices] = useState<KnownDevice[]>([]);
  const [newDevice, setNewDevice] = useState({ name: "", macs: "", ips: "", avatar: null as File | null });
  
  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newNotification, setNewNotification] = useState({ text: "", dates: "" });

  // Theme (replicating main app theming)
  const localHour = new Date().getHours();
  const isDay = localHour >= 6 && localHour < 18;
  
  const theme: Theme = isDay
    ? { bg: "#fafafa", text: "#1a1a1a", card: "#ffffff", border: "#e0e0e0" }
    : { bg: "#0a0a0a", text: "#f0f0f0", card: "#1a1a1a", border: "#333" };

  // Auth check
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError("");
    
    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      
      const result = await response.json();
      if (result.ok) {
        setIsAuthenticated(true);
        setPassword(""); // Clear password from memory
      } else {
        setAuthError(result.error || "Authentication failed");
      }
    } catch (error) {
      setAuthError("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Load data when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadData = async () => {
      try {
        // Load settings
        const settingsRes = await fetch("/api/settings");
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings(settingsData);
        }
        
        // Load birthdays
        const birthdaysRes = await fetch("/api/admin/birthdays");
        if (birthdaysRes.ok) {
          const birthdaysData = await birthdaysRes.json();
          setBirthdays(birthdaysData.birthdays || []);
        }
        
        // Load known devices
        const devicesRes = await fetch("/api/admin/devices");
        if (devicesRes.ok) {
          const devicesData = await devicesRes.json();
          setKnownDevices(devicesData.devices || []);
        }
        
        // Load notifications
        const notificationsRes = await fetch("/api/admin/notifications");
        if (notificationsRes.ok) {
          const notificationsData = await notificationsRes.json();
          setNotifications(notificationsData.notifications || []);
        }
      } catch {
        console.error("Failed to load admin data");
      }
    };
    
    loadData();
  }, [isAuthenticated]);

  // Save settings
  const saveSettings = async () => {
    if (!settings) return;
    
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      
      if (response.ok) {
        setSettingsChanged(false);
        alert("Settings saved successfully!");
      } else {
        alert("Failed to save settings");
      }
    } catch (error) {
      alert("Network error while saving settings");
    }
  };

  // Cancel settings changes
  const cancelSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setSettingsChanged(false);
      }
    } catch {
      console.error("Failed to reload settings");
    }
  };

  // Add birthday
  const addBirthday = async () => {
    if (!newBirthday.name.trim() || !newBirthday.date.match(/^\d{2}-\d{2}$/)) {
      alert("Please enter a valid name and date (MM-DD format)");
      return;
    }
    
    try {
      const response = await fetch("/api/admin/birthdays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBirthday.name.trim(),
          date: newBirthday.date
        }),
      });
      
      const result = await response.json();
      if (result.ok) {
        setBirthdays(result.birthdays);
        setNewBirthday({ name: "", date: "" });
      } else {
        alert(result.error || "Failed to add birthday");
      }
    } catch (error) {
      alert("Network error while adding birthday");
    }
  };

  // Remove birthday
  const removeBirthday = async (birthday: Birthday) => {
    try {
      const response = await fetch("/api/admin/birthdays", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: birthday.name,
          date: birthday.date
        }),
      });
      
      const result = await response.json();
      if (result.ok) {
        setBirthdays(result.birthdays);
      } else {
        alert(result.error || "Failed to remove birthday");
      }
    } catch (error) {
      alert("Network error while removing birthday");
    }
  };

  // Add known device
  const addDevice = async () => {
    if (!newDevice.name.trim()) {
      alert("Please enter a device name");
      return;
    }
    
    if (!newDevice.avatar) {
      alert("Please select an avatar image (.png file)");
      return;
    }
    
    const macs = newDevice.macs.split(",").map(m => m.trim()).filter(Boolean);
    const ips = newDevice.ips.split(",").map(ip => ip.trim()).filter(Boolean);
    
    try {
      // First upload the avatar
      const formData = new FormData();
      formData.append('avatar', newDevice.avatar);
      formData.append('name', newDevice.name.trim());
      
      const uploadResponse = await fetch("/api/admin/upload-avatar", {
        method: "POST",
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        alert(uploadResult.error || "Failed to upload avatar");
        return;
      }
      
      // Then add the device
      const response = await fetch("/api/admin/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDevice.name.trim(),
          macs,
          ips
        }),
      });
      
      const result = await response.json();
      if (result.ok) {
        setKnownDevices(result.devices);
        setNewDevice({ name: "", macs: "", ips: "", avatar: null });
      } else {
        alert(result.error || "Failed to add device");
      }
    } catch (error) {
      alert("Network error while adding device");
    }
  };

  // Remove known device
  const removeDevice = async (deviceName: string) => {
    try {
      const response = await fetch("/api/admin/devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: deviceName }),
      });
      
      const result = await response.json();
      if (result.ok) {
        setKnownDevices(result.devices);
      } else {
        alert(result.error || "Failed to remove device");
      }
    } catch (error) {
      alert("Network error while removing device");
    }
  };

  // Add notification (no save button needed as requested)
  const addNotification = async () => {
    if (!newNotification.text.trim() || !newNotification.dates.trim()) {
      alert("Please enter notification text and dates");
      return;
    }
    
    const dates = newNotification.dates.split(",").map(d => d.trim()).filter(d => d.match(/^\d{2}-\d{2}$/));
    if (dates.length === 0) {
      alert("Please enter valid dates in MM-DD format, separated by commas");
      return;
    }
    
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newNotification.text.trim(),
          dates
        }),
      });
      
      const result = await response.json();
      if (result.ok) {
        setNotifications(result.notifications);
        setNewNotification({ text: "", dates: "" });
      } else {
        alert(result.error || "Failed to add notification");
      }
    } catch (error) {
      alert("Network error while adding notification");
    }
  };

  // Remove notification
  const removeNotification = async (id: string) => {
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      
      const result = await response.json();
      if (result.ok) {
        setNotifications(result.notifications);
      } else {
        alert(result.error || "Failed to remove notification");
      }
    } catch (error) {
      alert("Network error while removing notification");
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif"
      }}>
        <div style={{
          background: theme.card,
          border: `1px solid ${theme.border}`,
          borderRadius: "12px",
          padding: "40px",
          maxWidth: "400px",
          width: "100%",
          margin: "20px"
        }}>
          <h1 style={{ textAlign: "center", marginBottom: "30px", fontSize: "24px" }}>Admin Access</h1>
          
          <form onSubmit={handleAuth}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                Password:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: `1px solid ${theme.border}`,
                  borderRadius: "8px",
                  background: theme.bg,
                  color: theme.text,
                  fontSize: "16px",
                  boxSizing: "border-box"
                }}
                disabled={loading}
              />
            </div>
            
            {authError && (
              <div style={{ 
                color: "#ef4444", 
                marginBottom: "20px", 
                textAlign: "center",
                fontSize: "14px"
              }}>
                {authError}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading || !password.trim()}
              style={{
                width: "100%",
                padding: "12px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "500",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading || !password.trim() ? 0.6 : 1
              }}
            >
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>
          
          <div style={{ 
            textAlign: "center", 
            marginTop: "20px",
            fontSize: "14px",
            color: theme.text,
            opacity: 0.7
          }}>
            <button
              onClick={() => window.location.hash = ""}
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                textDecoration: "underline",
                cursor: "pointer"
              }}
            >
              Back to main app
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: theme.bg,
      color: theme.text,
      fontFamily: "system-ui, sans-serif"
    }}>
      {/* Header */}
      <div style={{
        background: theme.card,
        borderBottom: `1px solid ${theme.border}`,
        padding: "20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h1 style={{ margin: 0, fontSize: "24px" }}>FjosetInfo Admin</h1>
        <button
          onClick={() => window.location.hash = ""}
          style={{
            padding: "8px 16px",
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            borderRadius: "8px",
            color: theme.text,
            cursor: "pointer"
          }}
        >
          Back to App
        </button>
      </div>

      <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
        {/* Settings Section */}
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ marginBottom: "20px", fontSize: "20px" }}>App Settings</h2>
          
          {settings && (
            <div style={{
              background: theme.card,
              border: `1px solid ${theme.border}`,
              borderRadius: "12px",
              padding: "20px"
            }}>
              {/* Day/Night Hours */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ marginBottom: "12px", fontSize: "16px" }}>Day/Night Hours</h3>
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <label>
                    Start:
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={settings.dayHours.start}
                      onChange={(e) => {
                        setSettings({
                          ...settings,
                          dayHours: { ...settings.dayHours, start: parseInt(e.target.value) || 0 }
                        });
                        setSettingsChanged(true);
                      }}
                      style={{
                        marginLeft: "8px",
                        padding: "8px",
                        border: `1px solid ${theme.border}`,
                        borderRadius: "4px",
                        background: theme.bg,
                        color: theme.text,
                        width: "60px"
                      }}
                    />
                  </label>
                  <label>
                    End:
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={settings.dayHours.end}
                      onChange={(e) => {
                        setSettings({
                          ...settings,
                          dayHours: { ...settings.dayHours, end: parseInt(e.target.value) || 18 }
                        });
                        setSettingsChanged(true);
                      }}
                      style={{
                        marginLeft: "8px",
                        padding: "8px",
                        border: `1px solid ${theme.border}`,
                        borderRadius: "4px",
                        background: theme.bg,
                        color: theme.text,
                        width: "60px"
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Calendar Days Ahead */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ marginBottom: "12px", fontSize: "16px" }}>Calendar Days Ahead</h3>
                <input
                  type="number"
                  min="0"
                  max="14"
                  value={settings.calendarDaysAhead}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      calendarDaysAhead: parseInt(e.target.value) || 5
                    });
                    setSettingsChanged(true);
                  }}
                  style={{
                    padding: "8px",
                    border: `1px solid ${theme.border}`,
                    borderRadius: "4px",
                    background: theme.bg,
                    color: theme.text,
                    width: "80px"
                  }}
                />
              </div>

              {/* Rotation Duration */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ marginBottom: "12px", fontSize: "16px" }}>Rotation Duration (seconds)</h3>
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={settings.rotateSeconds}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      rotateSeconds: parseInt(e.target.value) || 30
                    });
                    setSettingsChanged(true);
                  }}
                  style={{
                    padding: "8px",
                    border: `1px solid ${theme.border}`,
                    borderRadius: "4px",
                    background: theme.bg,
                    color: theme.text,
                    width: "80px"
                  }}
                />
              </div>

              {/* Views Enabled */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ marginBottom: "12px", fontSize: "16px" }}>Enabled Views</h3>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {Object.entries(settings.viewsEnabled).map(([view, enabled]) => (
                    <label key={view} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => {
                          setSettings({
                            ...settings,
                            viewsEnabled: {
                              ...settings.viewsEnabled,
                              [view]: e.target.checked
                            }
                          });
                          setSettingsChanged(true);
                        }}
                      />
                      <span style={{ textTransform: "capitalize" }}>{view}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Settings Actions */}
              {settingsChanged && (
                <div style={{ display: "flex", gap: "12px", paddingTop: "16px", borderTop: `1px solid ${theme.border}` }}>
                  <button
                    onClick={saveSettings}
                    style={{
                      padding: "10px 20px",
                      background: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "500"
                    }}
                  >
                    Save Settings
                  </button>
                  <button
                    onClick={cancelSettings}
                    style={{
                      padding: "10px 20px",
                      background: theme.bg,
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                      borderRadius: "8px",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Birthdays Section */}
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ marginBottom: "20px", fontSize: "20px" }}>Birthday Management</h2>
          
          <div style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: "12px",
            padding: "20px"
          }}>
            {/* Add Birthday */}
            <div style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: `1px solid ${theme.border}` }}>
              <h3 style={{ marginBottom: "12px", fontSize: "16px" }}>Add Birthday</h3>
              <div style={{ display: "flex", gap: "12px", alignItems: "end", flexWrap: "wrap" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Name</label>
                  <input
                    type="text"
                    value={newBirthday.name}
                    onChange={(e) => setNewBirthday({ ...newBirthday, name: e.target.value })}
                    placeholder="Enter name"
                    style={{
                      padding: "8px",
                      border: `1px solid ${theme.border}`,
                      borderRadius: "4px",
                      background: theme.bg,
                      color: theme.text,
                      width: "200px"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Date (MM-DD)</label>
                  <input
                    type="text"
                    value={newBirthday.date}
                    onChange={(e) => setNewBirthday({ ...newBirthday, date: e.target.value })}
                    placeholder="MM-DD"
                    pattern="\d{2}-\d{2}"
                    style={{
                      padding: "8px",
                      border: `1px solid ${theme.border}`,
                      borderRadius: "4px",
                      background: theme.bg,
                      color: theme.text,
                      width: "80px"
                    }}
                  />
                </div>
                <button
                  onClick={addBirthday}
                  style={{
                    padding: "8px 16px",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Birthday List */}
            <div>
              <h3 style={{ marginBottom: "12px", fontSize: "16px" }}>Current Birthdays</h3>
              {birthdays.length === 0 ? (
                <p style={{ opacity: 0.7, fontStyle: "italic" }}>No birthdays configured</p>
              ) : (
                <div style={{ display: "grid", gap: "8px" }}>
                  {birthdays.map((birthday, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px",
                        background: theme.bg,
                        border: `1px solid ${theme.border}`,
                        borderRadius: "8px"
                      }}
                    >
                      <span>{birthday.name} - {birthday.date}</span>
                      <button
                        onClick={() => removeBirthday(birthday)}
                        style={{
                          padding: "4px 8px",
                          background: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px"
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Known Devices Section */}
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ marginBottom: "20px", fontSize: "20px" }}>Known Devices Management</h2>
          
          <div style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: "12px",
            padding: "20px"
          }}>
            {/* Add Device */}
            <div style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: `1px solid ${theme.border}` }}>
              <h3 style={{ marginBottom: "12px", fontSize: "16px" }}>Add Device</h3>
              <div style={{ display: "grid", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Name</label>
                  <input
                    type="text"
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                    placeholder="Device name"
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: `1px solid ${theme.border}`,
                      borderRadius: "4px",
                      background: theme.bg,
                      color: theme.text,
                      boxSizing: "border-box"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>MAC Addresses (comma separated)</label>
                  <input
                    type="text"
                    value={newDevice.macs}
                    onChange={(e) => setNewDevice({ ...newDevice, macs: e.target.value })}
                    placeholder="aa:bb:cc:dd:ee:ff, 11:22:33:44:55:66"
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: `1px solid ${theme.border}`,
                      borderRadius: "4px",
                      background: theme.bg,
                      color: theme.text,
                      boxSizing: "border-box"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>IP Addresses (comma separated)</label>
                  <input
                    type="text"
                    value={newDevice.ips}
                    onChange={(e) => setNewDevice({ ...newDevice, ips: e.target.value })}
                    placeholder="192.168.1.100, 192.168.1.101"
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: `1px solid ${theme.border}`,
                      borderRadius: "4px",
                      background: theme.bg,
                      color: theme.text,
                      boxSizing: "border-box"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Avatar Image (.png file required)</label>
                  <input
                    type="file"
                    accept=".png,image/png"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setNewDevice({ ...newDevice, avatar: file });
                    }}
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: `1px solid ${theme.border}`,
                      borderRadius: "4px",
                      background: theme.bg,
                      color: theme.text,
                      boxSizing: "border-box"
                    }}
                  />
                  {newDevice.avatar && (
                    <div style={{ marginTop: "8px", fontSize: "12px", color: theme.text }}>
                      Selected: {newDevice.avatar.name}
                    </div>
                  )}
                </div>
                <button
                  onClick={addDevice}
                  style={{
                    padding: "10px 20px",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    justifySelf: "start"
                  }}
                >
                  Add Device
                </button>
              </div>
            </div>

            {/* Device List */}
            <div>
              <h3 style={{ marginBottom: "12px", fontSize: "16px" }}>Current Devices</h3>
              {knownDevices.length === 0 ? (
                <p style={{ opacity: 0.7, fontStyle: "italic" }}>No devices configured</p>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {knownDevices.map((device, index) => (
                    <div
                      key={index}
                      style={{
                        padding: "16px",
                        background: theme.bg,
                        border: `1px solid ${theme.border}`,
                        borderRadius: "8px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "12px" }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: "0 0 8px 0", fontWeight: "500" }}>{device.name}</p>
                          {device.macs.length > 0 && (
                            <p style={{ margin: "0 0 4px 0", fontSize: "14px", opacity: 0.7 }}>
                              MACs: {device.macs.join(", ")}
                            </p>
                          )}
                          {device.ips.length > 0 && (
                            <p style={{ margin: 0, fontSize: "14px", opacity: 0.7 }}>
                              IPs: {device.ips.join(", ")}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeDevice(device.name)}
                          style={{
                            padding: "4px 8px",
                            background: "#ef4444",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section>
          <h2 style={{ marginBottom: "20px", fontSize: "20px" }}>Notification Management</h2>
          
          <div style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: "12px",
            padding: "20px"
          }}>
            {/* Add Notification */}
            <div style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: `1px solid ${theme.border}` }}>
              <h3 style={{ marginBottom: "12px", fontSize: "16px" }}>Add Notification</h3>
              <div style={{ display: "grid", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Text (max 200 chars)</label>
                  <input
                    type="text"
                    value={newNotification.text}
                    onChange={(e) => setNewNotification({ ...newNotification, text: e.target.value.slice(0, 200) })}
                    placeholder="Enter notification text"
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: `1px solid ${theme.border}`,
                      borderRadius: "4px",
                      background: theme.bg,
                      color: theme.text,
                      boxSizing: "border-box"
                    }}
                  />
                  <small style={{ opacity: 0.7 }}>{newNotification.text.length}/200 characters</small>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Dates (MM-DD, comma separated)</label>
                  <input
                    type="text"
                    value={newNotification.dates}
                    onChange={(e) => setNewNotification({ ...newNotification, dates: e.target.value })}
                    placeholder="01-01, 12-25"
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: `1px solid ${theme.border}`,
                      borderRadius: "4px",
                      background: theme.bg,
                      color: theme.text,
                      boxSizing: "border-box"
                    }}
                  />
                </div>
                <button
                  onClick={addNotification}
                  style={{
                    padding: "10px 20px",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    justifySelf: "start"
                  }}
                >
                  Add Notification
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div>
              <h3 style={{ marginBottom: "12px", fontSize: "16px" }}>Current Notifications</h3>
              {notifications.length === 0 ? (
                <p style={{ opacity: 0.7, fontStyle: "italic" }}>No notifications configured</p>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      style={{
                        padding: "16px",
                        background: theme.bg,
                        border: `1px solid ${theme.border}`,
                        borderRadius: "8px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "12px" }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: "0 0 8px 0", fontWeight: "500" }}>{notification.text}</p>
                          <p style={{ margin: 0, fontSize: "14px", opacity: 0.7 }}>
                            Dates: {notification.dates.join(", ")}
                          </p>
                        </div>
                        <button
                          onClick={() => removeNotification(notification.id)}
                          style={{
                            padding: "4px 8px",
                            background: "#ef4444",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}