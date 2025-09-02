import type { Theme, Colors } from "../types";
import NRKCard from "../cards/NRKCard";

export default function NewsView({
  theme,
  colors,
  isDay,
}: {
  theme: Theme;
  colors: Colors;
  isDay: boolean;
}) {
  return (
    <main style={{ 
      display: "flex", 
      flexDirection: "column", 
      flex: 1, 
      gap: 20, 
      marginTop: 20,
      minHeight: 0, // Allow shrinking below content size
      overflow: "hidden" // Prevent this container from causing page overflow
    }}>
      <NRKCard theme={theme} colors={colors} isDay={isDay} />
    </main>
  );
}