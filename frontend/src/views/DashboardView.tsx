import type { Theme, Colors } from "../types";
import AtBCard from "../cards/AtBCard";
import YRCard from "../cards/YRCard";

const STOP_PLACE_ID = "NSR:StopPlace:42404";
const LAT = "63.4305";
const LON = "10.3951";

export default function DashboardView({
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
      <AtBCard theme={theme} colors={colors} isDay={isDay} stopPlaceId={STOP_PLACE_ID} />
      <YRCard  theme={theme} colors={colors} isDay={isDay} lat={LAT} lon={LON} hours={4} />
    </main>
  );
}