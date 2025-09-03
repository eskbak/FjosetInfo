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
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        const response = await fetch("/api/birthdays/today");
        if (response.ok) {
          const data: BirthdayData = await response.json();
          setBirthdays(data);
        }
      } catch (error) {
        console.error("Failed to fetch birthdays:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBirthdays();
  }, []);

  // Don't render if loading, no birthdays, or dismissed
  if (loading || !birthdays || birthdays.birthdays.length === 0) {
    return null;
  }

  const names = birthdays.birthdays.map(b => b.name);
  const birthdayText = names.length === 1 
    ? `🎉 Gratulerer med dagen ${names[0]}! 🎉`
    : `🎉 Gratulerer med dagen ${names.slice(0, -1).join(", ")} og ${names[names.length - 1]}! 🎉`;

  return (
    <div
      style={{
        background: `linear-gradient(135deg, #ff6b6b, #ffd93d)`,
        color: "#333",
        padding: "10px",
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
    </div>
  );
}