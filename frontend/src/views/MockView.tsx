import type { Theme, Colors } from "../types";
import NRKCard from "../cards/NRKCard";
import CalendarCard from "../cards/CalendarCard";

export default function MockView({
  theme,
  colors,
  isDay,
}: {
  theme: Theme;
  colors: Colors;
  isDay: boolean;
}) {
  return (
    <main style={{ display: "flex", flexDirection: "column", flex: 1, gap: 20, marginTop: 20 }}>
      <NRKCard theme={theme} colors={colors} isDay={isDay} />
      <CalendarCard />
    </main>
  );
}