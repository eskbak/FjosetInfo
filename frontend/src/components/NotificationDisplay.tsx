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
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
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
          setCurrentIndex(0); // Reset to first notification
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

  // Auto-rotate notifications if there are multiple
  useEffect(() => {
    if (notifications.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % notifications.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [notifications.length]);

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

  // Multiple notifications - display as carousel
  return (
    <div style={{ margin: "0 20px 20px 20px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          overflow: "hidden",
        }}
      >
        {/* Previous button */}
        <button
          onClick={() => setCurrentIndex((prev) => (prev - 1 + notifications.length) % notifications.length)}
          style={{
            background: "rgba(255, 255, 255, 0.2)",
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            flexShrink: 0,
          }}
          aria-label="Previous notification"
        >
          ‹
        </button>

        {/* Current notification */}
        <div
          style={{
            background: "linear-gradient(135deg, #15008e, #5a7bff)",
            color: "#aeaeae",
            padding: "10px 20px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            fontSize: "2.2em",
            fontWeight: 600,
            textAlign: "center",
            minHeight: "80px",
            flex: 1,
            transition: "all 0.3s ease",
          }}
        >
          📢 {notifications[currentIndex].text} 📢
        </div>

        {/* Next button */}
        <button
          onClick={() => setCurrentIndex((prev) => (prev + 1) % notifications.length)}
          style={{
            background: "rgba(255, 255, 255, 0.2)",
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            flexShrink: 0,
          }}
          aria-label="Next notification"
        >
          ›
        </button>
      </div>

      {/* Indicators */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "8px",
          marginTop: "12px",
        }}
      >
        {notifications.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              border: "none",
              background: index === currentIndex ? "#5a7bff" : "rgba(255, 255, 255, 0.3)",
              cursor: "pointer",
              transition: "background 0.3s ease",
            }}
            aria-label={`Go to notification ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
