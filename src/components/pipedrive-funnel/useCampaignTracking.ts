import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CampaignTrackingData, CampaignTrackingResponse, PIPELINE_ID, DateRange } from './types';
import { format } from 'date-fns';

interface UseCampaignTrackingReturn {
  data: CampaignTrackingData | null;
  snapshotData: CampaignTrackingData | null;
  loading: boolean;
  snapshotLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: (force?: boolean) => Promise<void>;
}

interface UseCampaignTrackingOptions {
  pipelineId?: number;
}

export function useCampaignTracking(
  dateRange: DateRange,
  options: UseCampaignTrackingOptions = {}
): UseCampaignTrackingReturn {
  const { pipelineId = PIPELINE_ID } = options;
  
  const [data, setData] = useState<CampaignTrackingData | null>(null);
  const [snapshotData, setSnapshotData] = useState<CampaignTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<string>('');
  const snapshotFetchedRef = useRef<string>('');

  // Fetch period data
  const fetchData = useCallback(async (force = false) => {
    const startDate = format(dateRange.start, 'yyyy-MM-dd');
    const endDate = format(dateRange.end, 'yyyy-MM-dd');
    const fetchKey = `${pipelineId}_${startDate}_${endDate}`;

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
            pipeline_id: pipelineId,
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
  }, [dateRange, data, pipelineId]);

  // Fetch snapshot data (only once per pipelineId, no date filter)
  const fetchSnapshotData = useCallback(async (force = false) => {
    const snapshotKey = `${pipelineId}`;
    if (!force && snapshotFetchedRef.current === snapshotKey && snapshotData) {
      return;
    }

    setSnapshotLoading(true);

    try {
      const { data: responseData, error: fetchError } = await supabase.functions.invoke<CampaignTrackingResponse>(
        'pipedrive-proxy',
        {
          body: {
            action: 'get_campaign_tracking_snapshot',
            pipeline_id: pipelineId,
            force,
          },
        }
      );

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!responseData?.success) {
        throw new Error(responseData?.error || 'Erro ao buscar snapshot de rastreamento');
      }

      setSnapshotData(responseData.data || null);
      snapshotFetchedRef.current = snapshotKey;
    } catch (err) {
      console.error('Error fetching campaign tracking snapshot data:', err);
    } finally {
      setSnapshotLoading(false);
    }
  }, [snapshotData, pipelineId]);

  // Fetch period data on date range change
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

  // Fetch snapshot data on mount and when pipelineId changes
  useEffect(() => {
    fetchSnapshotData();
  }, [pipelineId]);

  const refetch = useCallback(async (force = false) => {
    await Promise.all([fetchData(force), fetchSnapshotData(force)]);
  }, [fetchData, fetchSnapshotData]);

  return {
    data,
    snapshotData,
    loading,
    snapshotLoading,
    error,
    lastUpdated,
    refetch,
  };
}
