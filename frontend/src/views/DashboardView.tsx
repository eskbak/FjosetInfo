import { useMemo, useRef, useCallback, useEffect, useState } from "react";
import type { Theme, Colors } from "../types";
import AtBCard from "../cards/AtBCard";
import YRCard from "../cards/YRCard";
import { useAvailableHeight } from "../hooks/useAvailableHeight";

const STOP_PLACE_ID = "NSR:StopPlace:42404";
const LAT = "63.4305";
const LON = "10.3951";

// Calculate the maximum number of rows that can fit in the available height
function calculateMaxRows(
  availableHeight: number, 
  birthdayNotificationHeight: number,
  actualCardMeasurements?: {
    headerHeight: number;
    footerHeight: number;
    cardPadding: number;
    rowHeight: number;
    gapBetweenCards: number;
  }
): number {
  if (availableHeight <= 0) return 5; // Default fallback
  
  // Use actual measurements if available, otherwise fall back to estimates
  const measurements = actualCardMeasurements || {
    headerHeight: 80,    // Header with padding
    footerHeight: 60,    // PoweredBy component
    cardPadding: 40,     // Card padding (top + bottom)
    rowHeight: 85,       // Approximate height per table row
    gapBetweenCards: 20  // Gap between the two cards
  };
  
  // Calculate space used by two cards (without row content)
  const fixedHeightPerCard = measurements.headerHeight + measurements.footerHeight + measurements.cardPadding;
  const totalFixedHeight = (2 * fixedHeightPerCard) + measurements.gapBetweenCards;
  
  // Account for birthday notification height
  const effectiveAvailableHeight = availableHeight - birthdayNotificationHeight;
  
  // Calculate available space for rows
  const availableForRows = effectiveAvailableHeight - totalFixedHeight;
  
  // Calculate how many rows can fit (divided by 2 since both cards need same number of rows)
  const maxRowsPerCard = Math.floor(availableForRows / (2 * measurements.rowHeight));
  
  // Ensure we have at least 2 rows but no more than 8, and at least 1 if space is very limited
  return Math.max(1, Math.min(8, maxRowsPerCard));
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
  const { availableHeight, birthdayNotificationHeight, containerRef } = useAvailableHeight();
  const cardMeasurementRef = useRef<HTMLDivElement>(null);
  const [actualMeasurements, setActualMeasurements] = useState<{
    headerHeight: number;
    footerHeight: number;
    cardPadding: number;
    rowHeight: number;
    gapBetweenCards: number;
  } | null>(null);

  // Measure actual card dimensions for more accurate calculations
  const measureCards = useCallback(() => {
    if (cardMeasurementRef.current) {
      const cards = cardMeasurementRef.current.querySelectorAll('section');
      if (cards.length >= 2) {
        const firstCard = cards[0];
        const table = firstCard.querySelector('table');
        const header = table?.querySelector('thead');
        const rows = table?.querySelectorAll('tbody tr');
        const poweredBy = firstCard.querySelector('[alt*="logo"]')?.closest('div');
        
        if (header && rows && rows.length > 0 && poweredBy) {
          const headerHeight = header.getBoundingClientRect().height;
          const footerHeight = poweredBy.getBoundingClientRect().height;
          const rowHeight = rows[0].getBoundingClientRect().height;
          
          // Get card padding by looking at computed styles
          const cardStyles = window.getComputedStyle(firstCard);
          const cardPadding = parseFloat(cardStyles.paddingTop) + parseFloat(cardStyles.paddingBottom);
          
          // Get gap between cards
          const secondCard = cards[1];
          const firstCardRect = firstCard.getBoundingClientRect();
          const secondCardRect = secondCard.getBoundingClientRect();
          const gapBetweenCards = secondCardRect.top - firstCardRect.bottom;
          
          setActualMeasurements({
            headerHeight,
            footerHeight,
            cardPadding,
            rowHeight,
            gapBetweenCards
          });
        }
      }
    }
  }, []);

  // Measure cards when they're rendered and data is loaded
  useEffect(() => {
    const timer = setTimeout(measureCards, 500); // Small delay to ensure cards are rendered
    return () => clearTimeout(timer);
  }, [measureCards]);

  // Re-measure when window resizes
  useEffect(() => {
    window.addEventListener('resize', measureCards);
    return () => window.removeEventListener('resize', measureCards);
  }, [measureCards]);
  
  const maxVisibleRows = useMemo(() => {
    return calculateMaxRows(availableHeight, birthdayNotificationHeight, actualMeasurements || undefined);
  }, [availableHeight, birthdayNotificationHeight, actualMeasurements]);

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
      <div ref={cardMeasurementRef} style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1, minHeight: 0 }}>
        <AtBCard theme={theme} colors={colors} isDay={isDay} stopPlaceId={STOP_PLACE_ID} maxRows={maxVisibleRows} />
        <YRCard theme={theme} colors={colors} isDay={isDay} lat={LAT} lon={LON} hours={maxVisibleRows} />
      </div>
    </main>
  );
}