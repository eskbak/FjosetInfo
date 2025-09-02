import { useEffect, useState } from "react";
import type { Theme } from "../types";

interface BirthdayData {
  today: string;
  birthdays: Array<{ name: string }>;
}

interface BirthdayNotificationProps {
  theme: Theme;
}

export default function BirthdayNotification({ theme }: BirthdayNotificationProps) {
  const [birthdays, setBirthdays] = useState<BirthdayData | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        const response = await fetch("/api/birthdays/today");
        if (response.ok) {
          const data: BirthdayData = await response.json();
          setBirthdays(data);

          // Check if already dismissed today
          const dismissedToday = localStorage.getItem(`birthdays-dismissed-${data.today}`);
          setDismissed(dismissedToday === "true");
        }
      } catch (error) {
        console.error("Failed to fetch birthdays:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBirthdays();
  }, []);

  const handleDismiss = () => {
    if (birthdays) {
      localStorage.setItem(`birthdays-dismissed-${birthdays.today}`, "true");
      setDismissed(true);
    }
  };

  // Don't render if loading, no birthdays, or dismissed
  if (loading || !birthdays || birthdays.birthdays.length === 0 || dismissed) {
    return null;
  }

  const names = birthdays.birthdays.map(b => b.name);
  const birthdayText = names.length === 1 
    ? `🎉 ${names[0]} har bursdag i dag!`
    : `🎉 ${names.slice(0, -1).join(", ")} og ${names[names.length - 1]} har bursdag i dag!`;

  return (
    <div
      style={{
        background: `linear-gradient(135deg, #ff6b6b, #ffd93d)`,
        color: "#333",
        padding: "20px",
        borderRadius: "12px",
        margin: "0 20px 20px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        fontSize: "2.2em",
        fontWeight: "600",
        textAlign: "center",
        position: "relative",
        minHeight: "80px",
      }}
    >
      <span style={{ flex: 1 }}>{birthdayText}</span>
      <button
        onClick={handleDismiss}
        style={{
          background: "rgba(255,255,255,0.4)",
          border: "none",
          borderRadius: "50%",
          width: "32px",
          height: "32px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          color: "#333",
          position: "absolute",
          right: "16px",
          top: "50%",
          transform: "translateY(-50%)",
          fontWeight: "bold",
        }}
        title="Skjul for i dag"
      >
        ×
      </button>
    </div>
  );
}