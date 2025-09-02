import type { Theme, Colors } from "../types";
import CalendarCard from "../cards/CalendarCard";

export default function CalendarView({
  theme,
  colors,
  isDay,
}: {
  theme: Theme;
  colors: Colors;
  isDay: boolean;
}) {
  // Use hardcoded daysAhead value (was previously from settings)
  const daysAhead = 4;

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
