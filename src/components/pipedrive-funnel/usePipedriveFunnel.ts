import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  FunnelData, 
  FunnelResponse, 
  PIPELINE_ID, 
  DateRange, 
  ComparisonConfig,
  PeriodPreset 
} from './types';
import { format } from 'date-fns';
import { getComparisonRange } from './comparisonUtils';

interface UsePipedriveFunnelReturn {
  data: FunnelData | null;
  comparisonData: FunnelData | null;
  loading: boolean;
  comparisonLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: (force?: boolean) => Promise<void>;
}

interface UsePipedriveFunnelOptions {
  comparisonConfig?: ComparisonConfig;
  periodPreset?: PeriodPreset;
}

export function usePipedriveFunnel(
  dateRange: DateRange, 
  options: UsePipedriveFunnelOptions = {}
): UsePipedriveFunnelReturn {
  const { 
    comparisonConfig = { enabled: true, preset: 'auto' }, 
    periodPreset = 'thisMonth' 
  } = options;

  const [data, setData] = useState<FunnelData | null>(null);
  const [comparisonData, setComparisonData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Debounce ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<string>('');
  const lastComparisonFetchRef = useRef<string>('');

  const fetchSinglePeriod = useCallback(async (
    range: DateRange,
    force = false
  ): Promise<FunnelData | null> => {
    const startDate = format(range.start, 'yyyy-MM-dd');
    const endDate = format(range.end, 'yyyy-MM-dd');

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

    return responseData.data || null;
  }, []);

  const fetchFunnelData = useCallback(async (force = false) => {
    const startDate = format(dateRange.start, 'yyyy-MM-dd');
    const endDate = format(dateRange.end, 'yyyy-MM-dd');
    const fetchKey = `${startDate}_${endDate}`;

    // Calculate comparison range
    const comparisonRange = getComparisonRange(dateRange, periodPreset, comparisonConfig);
    const comparisonFetchKey = comparisonRange 
      ? `${format(comparisonRange.start, 'yyyy-MM-dd')}_${format(comparisonRange.end, 'yyyy-MM-dd')}`
      : '';

    // Skip if same request and not forcing (only for main data)
    const skipMain = !force && fetchKey === lastFetchRef.current && data;
    const skipComparison = !force && comparisonFetchKey === lastComparisonFetchRef.current && comparisonData;

    if (skipMain && (skipComparison || !comparisonRange)) {
      return;
    }

    if (!skipMain) {
      setLoading(true);
    }
    if (comparisonRange && !skipComparison) {
      setComparisonLoading(true);
    }
    setError(null);

    try {
      // Fetch both periods in parallel
      const promises: Promise<FunnelData | null>[] = [];
      
      if (!skipMain) {
        promises.push(fetchSinglePeriod(dateRange, force));
      } else {
        promises.push(Promise.resolve(data));
      }

      if (comparisonRange && !skipComparison) {
        promises.push(fetchSinglePeriod(comparisonRange, force));
      } else if (comparisonRange) {
        promises.push(Promise.resolve(comparisonData));
      }

      const results = await Promise.all(promises);

      if (!skipMain) {
        setData(results[0]);
        lastFetchRef.current = fetchKey;
      }

      if (comparisonRange) {
        setComparisonData(results[1] || null);
        lastComparisonFetchRef.current = comparisonFetchKey;
      } else {
        setComparisonData(null);
        lastComparisonFetchRef.current = '';
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching funnel data:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
      setComparisonLoading(false);
    }
  }, [dateRange, data, comparisonData, comparisonConfig, periodPreset, fetchSinglePeriod]);

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
  }, [dateRange.start.getTime(), dateRange.end.getTime(), comparisonConfig.enabled, comparisonConfig.preset, comparisonConfig.customRange?.start?.getTime(), comparisonConfig.customRange?.end?.getTime()]);

  const refetch = useCallback(async (force = false) => {
    await fetchFunnelData(force);
  }, [fetchFunnelData]);

  return {
    data,
    comparisonData,
    loading,
    comparisonLoading,
    error,
    lastUpdated,
    refetch,
  };
}
