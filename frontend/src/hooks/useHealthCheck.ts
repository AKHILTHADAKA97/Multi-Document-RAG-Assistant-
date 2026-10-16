import { useState, useEffect, useCallback } from 'react';
import { healthApi } from '@/utils/api';
import type { ReadyResponse } from '@/types';

export function useHealthCheck() {
  const [healthy, setHealthy] = useState(false);
  const [ready, setReady] = useState<ReadyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = useCallback(async () => {
    try {
      const health = await healthApi.check();
      setHealthy(health.status === 'healthy');

      const readiness = await healthApi.ready();
      setReady(readiness);
    } catch {
      setHealthy(false);
      setReady(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { healthy, ready, loading, refresh: checkHealth };
}