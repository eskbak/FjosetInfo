import { useState, useEffect } from 'react';

export interface KnownDevice {
  name: string;
  macs: string[];
  ips: string[];
}

export function useKnownDevices() {
  const [devices, setDevices] = useState<KnownDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDevices = async () => {
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
    };

    fetchDevices();
  }, []);

  return { devices, loading, setDevices };
}