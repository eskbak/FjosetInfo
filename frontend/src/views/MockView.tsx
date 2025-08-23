import type { Theme, Colors } from "../types";
import NRKCard from "../cards/NRKCard";

export default function MockView({
  theme,
  colors,
}: {
  theme: Theme;
  colors: Colors;
  isDay: boolean;
}) {
  return (
    <main style={{ display: "flex", flexDirection: "column", flex: 1, gap: 20, marginTop: 20 }}>
      <NRKCard theme={theme} colors={colors} />
    </main>
  );
}