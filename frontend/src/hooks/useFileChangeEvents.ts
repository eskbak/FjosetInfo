import { useEffect, useRef } from 'react';

type FileChangeEvent = {
  type: 'settings' | 'birthdays' | 'notifications' | 'knownDevices' | 'connected';
  timestamp: number;
};

type FileChangeHandler = (eventType: FileChangeEvent['type']) => void;

export function useFileChangeEvents(handlers: {
  onSettingsChange?: () => void;
  onBirthdaysChange?: () => void;
  onNotificationsChange?: () => void;
  onKnownDevicesChange?: () => void;
}) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const handlersRef = useRef(handlers);
  
  // Update handlers ref when handlers change
  handlersRef.current = handlers;

  useEffect(() => {
    // Create EventSource connection
    const eventSource = new EventSource('/api/events');
    eventSourceRef.current = eventSource;

    console.log('📡 Connecting to file change events...');

    eventSource.onmessage = (event) => {
      try {
        const data: FileChangeEvent = JSON.parse(event.data);
        console.log('📡 Received file change event:', data);

        const currentHandlers = handlersRef.current;
        
        switch (data.type) {
          case 'settings':
            currentHandlers.onSettingsChange?.();
            break;
          case 'birthdays':
            currentHandlers.onBirthdaysChange?.();
            break;
          case 'notifications':
            currentHandlers.onNotificationsChange?.();
            break;
          case 'knownDevices':
            currentHandlers.onKnownDevicesChange?.();
            break;
          case 'connected':
            console.log('📡 Connected to file change events');
            break;
          default:
            console.log('📡 Unknown event type:', data.type);
        }
      } catch (error) {
        console.error('📡 Error parsing file change event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('📡 SSE connection error:', error);
    };

    eventSource.onopen = () => {
      console.log('📡 SSE connection opened');
    };

    // Cleanup on unmount
    return () => {
      console.log('📡 Closing file change events connection');
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, []); // Empty dependency array - connection should persist

  // Return a function to manually close the connection if needed
  return {
    close: () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    }
  };
}