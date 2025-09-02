import { useEffect, useState, useRef } from "react";

export function useAvailableHeight() {
  const [availableHeight, setAvailableHeight] = useState<number>(0);
  const [birthdayNotificationHeight, setBirthdayNotificationHeight] = useState<number>(0);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Detect birthday notification height by checking if it exists
        const birthdayNotification = document.querySelector('[style*="linear-gradient(135deg, #ff6b6b, #ffd93d)"]') as HTMLElement;
        const birthdayHeight = birthdayNotification ? birthdayNotification.offsetHeight + 20 : 0; // +20 for margin
        
        setBirthdayNotificationHeight(birthdayHeight);
        
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

    // Observe the entire document body for birthday notification changes
    const bodyObserver = new MutationObserver(updateHeight);
    bodyObserver.observe(document.body, { 
      childList: true, 
      subtree: true, 
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    return () => {
      window.removeEventListener('resize', updateHeight);
      observer.disconnect();
      bodyObserver.disconnect();
    };
  }, []);

  return { availableHeight, birthdayNotificationHeight, containerRef };
}