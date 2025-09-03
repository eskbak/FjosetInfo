import { useState, useEffect, useCallback } from 'react';
import { useSettingsContext } from '../contexts/SettingsContext';

export interface KnownDevice {
  name: string;
  macs: string[];
  ips: string[];
}

export function useKnownDevices() {
  const [devices, setDevices] = useState<KnownDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const { onKnownDevicesChange } = useSettingsContext();

  const fetchDevices = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/devices', {
        timeout: 5000, // 5 second timeout
      } as RequestInit);
      
      if (response.ok) {
        const data = await response.json();
        setDevices(Array.isArray(data.devices) ? data.devices : []);
      } else {
        console.warn('Known devices API returned:', response.status, response.statusText);
      }
    } catch (error) {
      console.warn('Failed to fetch known devices, using empty list:', error);
      // Keep empty devices array if fetch fails
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Register for known devices change events through centralized system
  useEffect(() => {
    const unsubscribe = onKnownDevicesChange(() => {
      console.log('🔄 Known devices file changed, reloading...');
      fetchDevices();
    });
    return unsubscribe;
  }, [onKnownDevicesChange, fetchDevices]);

  return { devices, loading, setDevices };
}