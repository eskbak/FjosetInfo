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
        const response = await fetch('/api/admin/devices');
        if (response.ok) {
          const data = await response.json();
          setDevices(data.devices || []);
        }
      } catch (error) {
        console.error('Failed to fetch known devices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  return { devices, loading, setDevices };
}