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

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Get today's date in MM-DD format
        const today = new Date();
        const todayMD =
          String(today.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(today.getDate()).padStart(2, "0");

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
      fetchNotifications();
    }, timeUntilMidnight);

    return () => clearTimeout(midnightTimer);
  }, []);

  const visibleNotifications = notifications;

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div>
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          style={{
            background: "linear-gradient(135deg, #15008e, #5a7bff)",
            color: "#aeaeae",
            padding: "10px",
            borderRadius: "12px",
            margin: "0 20px 20px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            fontSize: "2.2em",
            fontWeight: 600,
            textAlign: "center",
            position: "relative",
            minHeight: "80px",
          }}
        >
          <div style={{ flex: 1, paddingRight: "12px" }}>
            📢 {notification.text} 📢
          </div>
        </div>
      ))}
    </div>
  );
}
