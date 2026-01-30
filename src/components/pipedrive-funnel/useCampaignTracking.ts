import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CampaignTrackingData, CampaignTrackingResponse, PIPELINE_ID, DateRange } from './types';
import { format } from 'date-fns';

interface UseCampaignTrackingReturn {
  data: CampaignTrackingData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: (force?: boolean) => Promise<void>;
}

export function useCampaignTracking(dateRange: DateRange): UseCampaignTrackingReturn {
  const [data, setData] = useState<CampaignTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<string>('');

  const fetchData = useCallback(async (force = false) => {
    const startDate = format(dateRange.start, 'yyyy-MM-dd');
    const endDate = format(dateRange.end, 'yyyy-MM-dd');
    const fetchKey = `${startDate}_${endDate}`;

    if (!force && fetchKey === lastFetchRef.current && data) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: responseData, error: fetchError } = await supabase.functions.invoke<CampaignTrackingResponse>(
        'pipedrive-proxy',
        {
          body: {
            action: 'get_campaign_tracking',
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
        throw new Error(responseData?.error || 'Erro ao buscar dados de rastreamento');
      }

      setData(responseData.data || null);
      setLastUpdated(new Date());
      lastFetchRef.current = fetchKey;
    } catch (err) {
      console.error('Error fetching campaign tracking data:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [dateRange, data]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchData();
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [dateRange.start.getTime(), dateRange.end.getTime()]);

  const refetch = useCallback(async (force = false) => {
    await fetchData(force);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch,
  };
}
