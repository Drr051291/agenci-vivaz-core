import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FunnelData, FunnelResponse, PIPELINE_ID, DateRange } from './types';
import { format, subDays } from 'date-fns';

interface UsePipedriveFunnelReturn {
  data: FunnelData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: (force?: boolean) => Promise<void>;
}

export function usePipedriveFunnel(dateRange: DateRange): UsePipedriveFunnelReturn {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Debounce ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<string>('');

  const fetchFunnelData = useCallback(async (force = false) => {
    const startDate = format(dateRange.start, 'yyyy-MM-dd');
    const endDate = format(dateRange.end, 'yyyy-MM-dd');
    const fetchKey = `${startDate}_${endDate}`;

    // Skip if same request and not forcing
    if (!force && fetchKey === lastFetchRef.current && data) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: responseData, error: fetchError } = await supabase.functions.invoke<FunnelResponse>(
        'pipedrive-proxy',
        {
          body: {
            action: 'get_funnel_data',
            pipeline_id: PIPELINE_ID,
            start_date: startDate,
            end_date: endDate,
            force,
          },
        }
      );

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!responseData?.success) {
        throw new Error(responseData?.error || 'Erro ao buscar dados do Pipedrive');
      }

      setData(responseData.data || null);
      setLastUpdated(new Date());
      lastFetchRef.current = fetchKey;
    } catch (err) {
      console.error('Error fetching funnel data:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [dateRange, data]);

  // Debounced fetch on date range change
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchFunnelData();
    }, 500); // 500ms debounce

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [dateRange.start.getTime(), dateRange.end.getTime()]);

  const refetch = useCallback(async (force = false) => {
    await fetchFunnelData(force);
  }, [fetchFunnelData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch,
  };
}
