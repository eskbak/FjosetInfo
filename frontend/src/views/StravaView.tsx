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
        setActivities(data.activities || []);
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
                marginBottom: 20,
                fontSize: "3em",
                textAlign: "center",
              }}
            >
              Siste Aktiviteter
            </h2>
            <div style={{ flex: 1, overflow: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                </colgroup>
                <thead>
                  <tr
                    style={{
                      textAlign: "left",
                      opacity: 0.65,
                      fontSize: "1.8em",
                    }}
                  >
                    <th style={{ padding: "0.35em 0.3em", paddingLeft: 15 }}>
                      
                    </th>
                    <th style={{ padding: "0.35em 0.3em" }}>Aktivitet</th>
                    <th style={{ padding: "0.35em 0.3em" }}>Hvem</th>
                    <th style={{ padding: "0.35em 0.3em" }}>Distanse</th>
                    <th style={{ padding: "0.35em 0.3em" }}>Tid</th>
                    <th
                      style={{
                        padding: "0.35em 0.3em",
                        textAlign: "right",
                        paddingRight: 30,
                      }}
                    >
                      Tempo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity, i) => (
                    <tr
                      key={activity.id}
                      style={{
                        borderTop: i > 0 ? `1px solid ${theme.border}` : "none",
                      }}
                    >
                      <td
                        style={{
                          padding: "0.4em 0.3em",
                          paddingLeft: 15,
                          fontSize: "3em",
                          textAlign: "center",
                        }}
                      >
                        {getActivityEmoji(activity.type)}
                      </td>
                      <td
                        style={{
                          padding: "0.4em 0.3em",
                          fontSize: "2.8em",
                          fontWeight: 400,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        <div>{activity.name}</div>
                        <div
                          style={{
                            fontSize: "0.6em",
                            opacity: 0.6,
                            marginTop: "0.2em",
                          }}
                        >
                          {formatDistanceToNow(new Date(activity.startDate), {
                            addSuffix: true,
                            locale: nb,
                          })}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "0.4em 0.3em",
                          fontSize: "2.8em",
                          fontWeight: 400,
                        }}
                      >
                        {activity.athleteName || "—"}
                      </td>
                      <td
                        style={{
                          padding: "0.4em 0.3em",
                          fontSize: "2.8em",
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 400,
                        }}
                      >
                        {formatDistance(activity.distance)}
                      </td>
                      <td
                        style={{
                          padding: "0.4em 0.3em",
                          fontSize: "2.8em",
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 400,
                        }}
                      >
                        {formatDuration(activity.movingTime)}
                      </td>
                      <td
                        style={{
                          padding: "0.4em 0.3em",
                          fontSize: "2.8em",
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 400,
                          textAlign: "right",
                          paddingRight: 30,
                        }}
                      >
                        {formatPace(
                          activity.distance,
                          activity.movingTime,
                          activity.type
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
