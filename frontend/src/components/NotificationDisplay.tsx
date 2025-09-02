import { useEffect, useState } from "react";
import type { Theme } from "../types";

interface Notification {
  id: string;
  text: string;
}

interface NotificationDisplayProps {
  theme: Theme;
}

export default function NotificationDisplay({ theme }: NotificationDisplayProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Get today's date in MM-DD format
        const today = new Date();
        const todayMD = String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
        
        const response = await fetch(`/api/notifications/date/${todayMD}`);
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchNotifications();
    
    // Refresh notifications at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    const midnightTimer = setTimeout(() => {
      setDismissed(new Set()); // Clear dismissed state
      fetchNotifications();
    }, timeUntilMidnight);

    return () => clearTimeout(midnightTimer);
  }, []);

  const handleDismiss = (notificationId: string) => {
    setDismissed(prev => new Set([...prev, notificationId]));
  };

  // Filter out dismissed notifications
  const visibleNotifications = notifications.filter(n => !dismissed.has(n.id));

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div style={{ margin: "0 20px 20px 20px" }}>
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          style={{
            background: `linear-gradient(135deg, #60a5fa, #3b82f6)`,
            color: "#ffffff",
            padding: "16px 20px",
            borderRadius: "12px",
            margin: "0 0 12px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            fontSize: "1.1em",
            fontWeight: "500",
            position: "relative",
          }}
        >
          <div style={{ flex: 1, paddingRight: "12px" }}>
            📢 {notification.text}
          </div>
          <button
            onClick={() => handleDismiss(notification.id)}
            style={{
              background: "rgba(255,255,255,0.3)",
              border: "none",
              borderRadius: "50%",
              width: "28px",
              height: "28px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              color: "#ffffff",
              fontWeight: "bold",
              flexShrink: 0,
            }}
            title="Skjul denne meldingen"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}