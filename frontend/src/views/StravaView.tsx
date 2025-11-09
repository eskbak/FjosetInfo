import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import type { Theme, Colors } from "../types";
import { useAvailableHeight } from "../hooks/useAvailableHeight";

type Activity = {
  id: number;
  name: string;
  type: string;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  totalElevationGain: number;
  startDate: string;
  athleteName: string | null;
};

const ACTIVITY_EMOJI: Record<string, string> = {
  Run: "🏃",
  Ride: "🚴",
  Swim: "🏊",
  Walk: "🚶",
  Hike: "🥾",
  AlpineSki: "⛷️",
  BackcountrySki: "🎿",
  NordicSki: "⛷️",
  Snowboard: "🏂",
  IceSkate: "⛸️",
  Workout: "💪",
  Yoga: "🧘",
  WeightTraining: "🏋️",
  default: "🏃",
};

export default function StravaView({
  theme,
  colors,
  isDay,
}: {
  theme: Theme;
  colors: Colors;
  isDay: boolean;
}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const { containerRef } = useAvailableHeight();

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const r = await fetch(`/api/strava/activities`);
        const data = await r.json();
        // Only show top 3 activities
        setActivities((data.activities || []).slice(0, 3));
      } catch (err) {
        console.error("Failed to fetch Strava activities:", err);
      }
    };
    fetchActivities();
    const id = setInterval(fetchActivities, 15 * 60_000); // 15 minutes
    return () => clearInterval(id);
  }, []);

  const formatDistance = (meters: number) => {
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}t ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatPace = (distance: number, seconds: number, type: string) => {
    if (distance === 0) return "—";

    // For cycling, show km/h instead of pace
    if (
      type === "Ride" ||
      type.includes("Ski") ||
      type === "Snowboard"
    ) {
      const kmh = distance / 1000 / (seconds / 3600);
      return `${kmh.toFixed(1)} km/t`;
    }

    // For running/walking, show min/km
    const minPerKm = seconds / 60 / (distance / 1000);
    const min = Math.floor(minPerKm);
    const sec = Math.floor((minPerKm - min) * 60);
    return `${min}:${sec.toString().padStart(2, "0")}/km`;
  };

  const getActivityEmoji = (type: string) => {
    return ACTIVITY_EMOJI[type] || ACTIVITY_EMOJI.default;
  };

  const cardStyle: React.CSSProperties = {
    background: theme.card,
    borderRadius: 20,
    padding: 20,
    border: `1px solid ${theme.border}`,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  };

  return (
    <main
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        gap: 20,
        marginTop: 20,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <section style={cardStyle}>
        {!activities.length ? (
          <div
            style={{
              opacity: 0.75,
              fontSize: "2.5em",
              textAlign: "center",
              padding: 20,
            }}
          >
            Ingen aktiviteter funnet.
            <br />
            Kom deg ut! 💪
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: 40,
                fontSize: "4em",
                textAlign: "center",
              }}
            >
              Siste Aktiviteter
            </h2>
            <div style={{ flex: 1, overflow: "auto" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 50,
                }}
              >
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    style={{
                      background: isDay ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)",
                      borderRadius: 20,
                      padding: 50,
                      display: "flex",
                      flexDirection: "column",
                      gap: 30,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
                      <div style={{ fontSize: "8em", flexShrink: 0 }}>
                        {getActivityEmoji(activity.type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "4.5em",
                            fontWeight: 700,
                            marginBottom: 15,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {activity.name}
                        </div>
                        <div
                          style={{
                            fontSize: "3em",
                            opacity: 0.7,
                          }}
                        >
                          {activity.athleteName || "—"}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-around",
                        paddingTop: 20,
                        borderTop: `1px solid ${isDay ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"}`,
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: "2.2em",
                            opacity: 0.5,
                            marginBottom: 10,
                          }}
                        >
                          Distanse
                        </div>
                        <div
                          style={{
                            fontSize: "3.5em",
                            fontWeight: 600,
                          }}
                        >
                          {formatDistance(activity.distance)}
                        </div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: "2.2em",
                            opacity: 0.5,
                            marginBottom: 10,
                          }}
                        >
                          Tid
                        </div>
                        <div
                          style={{
                            fontSize: "3.5em",
                            fontWeight: 600,
                          }}
                        >
                          {formatDuration(activity.movingTime)}
                        </div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: "2.2em",
                            opacity: 0.5,
                            marginBottom: 10,
                          }}
                        >
                          Tempo
                        </div>
                        <div
                          style={{
                            fontSize: "3.5em",
                            fontWeight: 600,
                          }}
                        >
                          {formatPace(
                            activity.distance,
                            activity.movingTime,
                            activity.type
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: "2.2em",
                            opacity: 0.5,
                            marginBottom: 10,
                          }}
                        >
                          Når
                        </div>
                        <div
                          style={{
                            fontSize: "3.5em",
                            fontWeight: 600,
                          }}
                        >
                          {formatDistanceToNow(new Date(activity.startDate), {
                            addSuffix: false,
                            locale: nb,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div
              style={{
                marginTop: 20,
                textAlign: "center",
                opacity: 0.5,
                fontSize: "1.2em",
              }}
            >
              Powered by Strava
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
