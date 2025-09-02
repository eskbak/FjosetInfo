import { useMemo } from "react";
import type { Theme, Colors } from "../types";
import AtBCard from "../cards/AtBCard";
import YRCard from "../cards/YRCard";
import { useAvailableHeight } from "../hooks/useAvailableHeight";

const STOP_PLACE_ID = "NSR:StopPlace:42404";
const LAT = "63.4305";
const LON = "10.3951";

// Calculate the maximum number of rows that can fit in the available height
function calculateMaxRows(availableHeight: number): number {
  if (availableHeight <= 0) return 5; // Default fallback
  
  // Estimated heights in pixels (based on font sizes and padding in the cards)
  const CARD_HEADER_HEIGHT = 80; // Header with padding
  const CARD_FOOTER_HEIGHT = 60; // PoweredBy component
  const CARD_PADDING = 40; // Card padding
  const CARD_BORDER_RADIUS = 40; // Space for border radius and margins
  const ROW_HEIGHT = 85; // Approximate height per table row (3.5em font + padding)
  const GAP_BETWEEN_CARDS = 20; // Gap between the two cards
  
  // Calculate space for two cards
  const totalFixedHeight = 
    2 * (CARD_HEADER_HEIGHT + CARD_FOOTER_HEIGHT + CARD_PADDING + CARD_BORDER_RADIUS) + 
    GAP_BETWEEN_CARDS;
  
  const availableForRows = availableHeight - totalFixedHeight;
  const maxRowsPerCard = Math.floor(availableForRows / (2 * ROW_HEIGHT));
  
  // Ensure we have at least 2 rows but no more than 8
  return Math.max(2, Math.min(8, maxRowsPerCard));
}

export default function DashboardView({
  theme,
  colors,
  isDay,
}: {
  theme: Theme;
  colors: Colors;
  isDay: boolean;
}) {
  const { availableHeight, containerRef } = useAvailableHeight();
  
  const maxVisibleRows = useMemo(() => {
    return calculateMaxRows(availableHeight);
  }, [availableHeight]);

  return (
    <main 
      ref={containerRef}
      style={{ 
        display: "flex", 
        flexDirection: "column", 
        flex: 1, 
        gap: 20, 
        marginTop: 20,
        minHeight: 0, // Allow shrinking
        overflow: "hidden" // Prevent overflow
      }}
    >
      <AtBCard theme={theme} colors={colors} isDay={isDay} stopPlaceId={STOP_PLACE_ID} maxRows={maxVisibleRows} />
      <YRCard theme={theme} colors={colors} isDay={isDay} lat={LAT} lon={LON} hours={maxVisibleRows} />
    </main>
  );
}