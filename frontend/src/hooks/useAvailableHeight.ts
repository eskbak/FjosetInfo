import { useEffect, useState, useRef } from "react";

export function useAvailableHeight() {
  const [availableHeight, setAvailableHeight] = useState<number>(0);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const availableSpace = windowHeight - rect.top - 24; // 24px for bottom padding
        setAvailableHeight(Math.max(0, availableSpace));
      }
    };

    // Initial measurement
    updateHeight();

    // Update on resize
    window.addEventListener('resize', updateHeight);
    
    // Also update when the page layout changes (e.g., birthday notification appears/disappears)
    const observer = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateHeight);
      observer.disconnect();
    };
  }, []);

  return { availableHeight, containerRef };
}