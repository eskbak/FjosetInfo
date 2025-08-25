import type { Theme, Colors } from "../types";
import CalendarCard from "../cards/CalendarCard";
import { useSettings } from "../state/SettingsContext";

export default function CalendarView({
  theme,
  colors,
  isDay,
}: {
  theme: Theme;
  colors: Colors;
  isDay: boolean;
}) {
  // Hooks must be inside the component:
  const { settings } = useSettings();
  const daysAhead = settings.calendarDaysAhead ?? 4;

  return (
    <main style={{ display: "flex", flexDirection: "column", flex: 1, gap: 20, marginTop: 20 }}>
      <CalendarCard
        theme={theme}
        colors={colors}
        isDay={isDay}
        daysAhead={daysAhead}
      />
    </main>
  );
}
