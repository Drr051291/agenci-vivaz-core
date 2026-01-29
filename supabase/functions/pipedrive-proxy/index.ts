import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PIPEDRIVE_API_TOKEN = Deno.env.get('PIPEDRIVE_API_KEY') || ''
const PIPEDRIVE_BASE_URL = 'https://api.pipedrive.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''

// TTL configuration in seconds
const TTL_CONFIG = {
  stages: 21600, // 6 hours
  conversion_statistics: 600, // 10 minutes
  movement_statistics: 300, // 5 minutes
  deals: 300, // 5 minutes
}

interface CacheEntry {
  key: string
  payload: unknown
  fetched_at: string
  ttl_seconds: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>

async function getCachedData(supabase: AnySupabaseClient, cacheKey: string): Promise<CacheEntry | null> {
  const { data, error } = await supabase
    .from('pipedrive_cache')
    .select('*')
    .eq('key', cacheKey)
    .single()

  if (error || !data) return null

  const entry = data as CacheEntry
  const fetchedAt = new Date(entry.fetched_at).getTime()
  const now = Date.now()
  const ageSeconds = (now - fetchedAt) / 1000

  if (ageSeconds > entry.ttl_seconds) {
    return null // Cache expired
  }

  return entry
}

async function setCachedData(
  supabase: AnySupabaseClient, 
  cacheKey: string, 
  payload: unknown, 
  ttlSeconds: number
): Promise<void> {
  await supabase
    .from('pipedrive_cache')
    .upsert({
      key: cacheKey,
      payload,
      fetched_at: new Date().toISOString(),
      ttl_seconds: ttlSeconds,
    }, { onConflict: 'key' })
}

async function fetchFromPipedrive(endpoint: string, params: Record<string, string> = {}): Promise<unknown> {
  const url = new URL(`${PIPEDRIVE_BASE_URL}${endpoint}`)
  url.searchParams.set('api_token', PIPEDRIVE_API_TOKEN)
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  console.log(`Fetching from Pipedrive: ${endpoint}`)
  
  const response = await fetch(url.toString())
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Pipedrive API error: ${response.status} - ${errorText}`)
    throw new Error(`Pipedrive API error: ${response.status}`)
  }

  return response.json()
}

interface StageInfo {
  id: number
  name: string
  order_nr: number
}

async function getStagesMap(supabase: AnySupabaseClient, pipelineId: number, forceRefresh: boolean): Promise<Map<string, StageInfo>> {
  const cacheKey = `stages_pipeline_${pipelineId}`
  
  if (!forceRefresh) {
    const cached = await getCachedData(supabase, cacheKey)
    if (cached) {
      console.log('Using cached stages')
      const stagesArray = cached.payload as StageInfo[]
      const map = new Map<string, StageInfo>()
      stagesArray.forEach(stage => map.set(stage.name.toLowerCase(), stage))
      return map
    }
  }

  // Fetch from API (v2 endpoint)
  const response = await fetchFromPipedrive('/api/v2/stages', { 
    pipeline_id: pipelineId.toString(),
    limit: '100'
  }) as { data: Array<{ id: number; name: string; order_nr: number }> }

  const stages = response.data || []
  const stagesInfo: StageInfo[] = stages.map(s => ({
    id: s.id,
    name: s.name,
    order_nr: s.order_nr
  }))

  // Cache the stages
  await setCachedData(supabase, cacheKey, stagesInfo, TTL_CONFIG.stages)

  const map = new Map<string, StageInfo>()
  stagesInfo.forEach(stage => map.set(stage.name.toLowerCase(), stage))
  return map
}

async function getConversionStatistics(
  supabase: AnySupabaseClient, 
  pipelineId: number, 
  startDate: string, 
  endDate: string,
  forceRefresh: boolean
): Promise<unknown> {
  const cacheKey = `conversion_stats_${pipelineId}_${startDate}_${endDate}`
  
  if (!forceRefresh) {
    const cached = await getCachedData(supabase, cacheKey)
    if (cached) {
      console.log('Using cached conversion statistics')
      return cached.payload
    }
  }

  const response = await fetchFromPipedrive(`/v1/pipelines/${pipelineId}/conversion_statistics`, {
    start_date: startDate,
    end_date: endDate
  })

  await setCachedData(supabase, cacheKey, response, TTL_CONFIG.conversion_statistics)
  return response
}

async function getMovementStatistics(
  supabase: AnySupabaseClient, 
  pipelineId: number, 
  startDate: string, 
  endDate: string,
  forceRefresh: boolean
): Promise<unknown> {
  const cacheKey = `movement_stats_${pipelineId}_${startDate}_${endDate}`
  
  if (!forceRefresh) {
    const cached = await getCachedData(supabase, cacheKey)
    if (cached) {
      console.log('Using cached movement statistics')
      return cached.payload
    }
  }

  const response = await fetchFromPipedrive(`/v1/pipelines/${pipelineId}/movement_statistics`, {
    start_date: startDate,
    end_date: endDate
  })

  await setCachedData(supabase, cacheKey, response, TTL_CONFIG.movement_statistics)
  return response
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: req.headers.get('Authorization') || '' },
      },
    })

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const { action, pipeline_id, start_date, end_date, force } = await req.json()
    const forceRefresh = force === true

    console.log(`Pipedrive proxy request: ${action}, pipeline: ${pipeline_id}, dates: ${start_date} - ${end_date}`)

    if (!PIPEDRIVE_API_TOKEN) {
      throw new Error('PIPEDRIVE_API_KEY not configured')
    }

    switch (action) {
      case 'get_stages': {
        const stagesMap = await getStagesMap(supabase, pipeline_id, forceRefresh)
        const stagesArray = Array.from(stagesMap.values())
        return new Response(
          JSON.stringify({ success: true, data: stagesArray }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_funnel_data': {
        // Get all data needed for funnel dashboard
        const [stagesMap, conversionStats, movementStats] = await Promise.all([
          getStagesMap(supabase, pipeline_id, forceRefresh),
          getConversionStatistics(supabase, pipeline_id, start_date, end_date, forceRefresh),
          getMovementStatistics(supabase, pipeline_id, start_date, end_date, forceRefresh)
        ])

        // Define stage order for funnel
        const stageOrder = ['lead', 'mql', 'sql', 'oportunidade', 'contrato']
        
        // Map stage names to IDs
        const orderedStages = stageOrder
          .map(name => stagesMap.get(name.toLowerCase()))
          .filter(Boolean) as StageInfo[]

        // Parse conversion statistics
        const convData = conversionStats as { data?: { stage_conversions?: Record<string, { conversion_rate: number }> } }
        const convStats = convData?.data?.stage_conversions || {}

        // Calculate conversion rates between consecutive stages
        const conversions: Record<string, number> = {}
        for (let i = 0; i < orderedStages.length - 1; i++) {
          const fromStage = orderedStages[i]
          const toStage = orderedStages[i + 1]
          const key = `${fromStage.id}_${toStage.id}`
          const keyAlt = `stage_${fromStage.id}_to_${toStage.id}`
          
          // Try different key formats
          conversions[`${stageOrder[i]}_to_${stageOrder[i + 1]}`] = 
            convStats[key]?.conversion_rate || 
            convStats[keyAlt]?.conversion_rate || 
            0
        }

        // Parse movement statistics for lead count
        const movData = movementStats as { 
          data?: { 
            new_deals_count?: number
            deals_started?: number
            movements_between_stages?: { count?: number }
          } 
        }
        const leadsCount = movData?.data?.new_deals_count || 
                          movData?.data?.deals_started || 
                          0

        // Get stage-specific counts if available
        const stageData: Record<string, { entries: number }> = {}
        orderedStages.forEach(stage => {
          stageData[stage.name.toLowerCase()] = {
            entries: 0 // Would need additional API call to get this
          }
        })

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              stages: orderedStages,
              conversions,
              leads_count: leadsCount,
              stage_data: stageData,
              raw_conversion_stats: conversionStats,
              raw_movement_stats: movementStats,
              fetched_at: new Date().toISOString()
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }
  } catch (error) {
    console.error('Error in pipedrive-proxy:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
