import { useEffect, useState } from "react";
import type { Theme } from "../types";
import { useSettingsContext } from "../contexts/SettingsContext";

interface Notification {
  id: string;
  text: string;
}

interface NotificationDisplayProps {
  theme: Theme;
}

export default function NotificationDisplay({ theme }: NotificationDisplayProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { onNotificationsChange } = useSettingsContext();

  const fetchNotifications = async () => {
    try {
      // Get today's date in DD-MM format
      const today = new Date();
      const todayDM =
        String(today.getDate()).padStart(2, "0") +
        "-" +
        String(today.getMonth() + 1).padStart(2, "0");

      const response = await fetch(`/api/notifications/date/${todayDM}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
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

    return () => {
      clearTimeout(midnightTimer);
    };
  }, []);

  // Register for notification change events through centralized system
  useEffect(() => {
    const unsubscribe = onNotificationsChange(() => {
      console.log('🔄 Notifications file changed, reloading...');
      fetchNotifications();
    });
    return unsubscribe;
  }, [onNotificationsChange]);

  const visibleNotifications = notifications;

  if (visibleNotifications.length === 0) {
    return null;
  }

  // Single notification - display as before
  if (visibleNotifications.length === 1) {
    return (
      <div>
        <div
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
            📢 {visibleNotifications[0].text} 📢
          </div>
        </div>
      </div>
    );
  }

  // Multiple notifications - display as continuous scrolling carousel
  return (
    <div style={{ margin: "0 20px 20px 20px" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #15008e, #5a7bff)",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          overflow: "hidden",
          minHeight: "80px",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            animation: "scroll-left 20s linear infinite",
            whiteSpace: "nowrap",
          }}
        >
          {/* Duplicate notifications for seamless loop */}
          {[...notifications, ...notifications].map((notification, index) => (
            <div
              key={`${notification.id}-${index}`}
              style={{
                color: "#aeaeae",
                padding: "10px 40px",
                fontSize: "2.2em",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              📢 {notification.text} 📢
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
