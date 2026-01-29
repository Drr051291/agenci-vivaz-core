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

// Stage name aliases for flexible matching
const STAGE_ALIASES: Record<string, string[]> = {
  'lead': ['lead'],
  'mql': ['mql'],
  'sql': ['sql'],
  'oportunidade': ['oportunidade', 'oportunidad'],
  'contrato': ['contrato', 'negociação', 'negociacao', 'fechamento'],
}

function findStageByAlias(stages: StageInfo[], alias: string): StageInfo | undefined {
  const aliases = STAGE_ALIASES[alias.toLowerCase()] || [alias.toLowerCase()]
  
  for (const stageAlias of aliases) {
    // Try exact match first
    const exactMatch = stages.find(s => s.name.toLowerCase() === stageAlias)
    if (exactMatch) return exactMatch
    
    // Try partial match (stage name starts with alias)
    const partialMatch = stages.find(s => s.name.toLowerCase().startsWith(stageAlias))
    if (partialMatch) return partialMatch
    
    // Try contains match
    const containsMatch = stages.find(s => s.name.toLowerCase().includes(stageAlias))
    if (containsMatch) return containsMatch
  }
  
  return undefined
}

async function getStagesMap(supabase: AnySupabaseClient, pipelineId: number, forceRefresh: boolean): Promise<{ map: Map<string, StageInfo>, all: StageInfo[] }> {
  const cacheKey = `stages_pipeline_${pipelineId}`
  
  if (!forceRefresh) {
    const cached = await getCachedData(supabase, cacheKey)
    if (cached) {
      console.log('Using cached stages')
      const stagesArray = cached.payload as StageInfo[]
      const map = new Map<string, StageInfo>()
      stagesArray.forEach(stage => map.set(stage.name.toLowerCase(), stage))
      return { map, all: stagesArray }
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
  return { map, all: stagesInfo }
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

async function getDealsPerStage(
  supabase: AnySupabaseClient,
  pipelineId: number,
  stages: StageInfo[],
  forceRefresh: boolean
): Promise<Record<number, number>> {
  const cacheKey = `deals_per_stage_${pipelineId}`
  
  if (!forceRefresh) {
    const cached = await getCachedData(supabase, cacheKey)
    if (cached) {
      console.log('Using cached deals per stage')
      return cached.payload as Record<number, number>
    }
  }

  const result: Record<number, number> = {}
  
  // Fetch deals for each stage using the v2 deals endpoint with filter
  // This is more reliable than the summary endpoint
  console.log('Fetching deals per stage for', stages.length, 'stages')
  
  for (const stage of stages) {
    try {
      const stageDeals = await fetchFromPipedrive('/api/v2/deals', {
        pipeline_id: pipelineId.toString(),
        stage_id: stage.id.toString(),
        status: 'open',
        limit: '500' // Get enough to count
      }) as { data?: Array<unknown> }
      
      const count = stageDeals?.data?.length || 0
      result[stage.id] = count
      console.log(`Stage ${stage.name} (${stage.id}): ${count} deals`)
    } catch (e) {
      console.error(`Error fetching deals for stage ${stage.id}:`, e)
      result[stage.id] = 0
    }
  }

  await setCachedData(supabase, cacheKey, result, TTL_CONFIG.deals)
  return result
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
        const stagesResult = await getStagesMap(supabase, pipeline_id, forceRefresh)
        return new Response(
          JSON.stringify({ success: true, data: stagesResult.all }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_funnel_data': {
        // Get all data needed for funnel dashboard
        // First get stages, then fetch all other data including deals per stage
        const stagesResult = await getStagesMap(supabase, pipeline_id, forceRefresh)
        const allStagesSorted = [...stagesResult.all].sort((a, b) => a.order_nr - b.order_nr)

        console.log('All stages sorted by order:', allStagesSorted.map(s => ({ id: s.id, name: s.name, order: s.order_nr })))

        const [conversionStats, movementStats, dealsPerStage] = await Promise.all([
          getConversionStatistics(supabase, pipeline_id, start_date, end_date, forceRefresh),
          getMovementStatistics(supabase, pipeline_id, start_date, end_date, forceRefresh),
          getDealsPerStage(supabase, pipeline_id, allStagesSorted, forceRefresh)
        ])

        // Parse conversion statistics - handle array format from Pipedrive API
        const convData = conversionStats as { 
          data?: { 
            stage_conversions?: Array<{ 
              conversion_rate: number
              from_stage_id: number
              to_stage_id: number 
            }> 
          } 
        }
        const stageConversionsArray = convData?.data?.stage_conversions || []
        
        // Create a map of stage transitions: "fromId_toId" -> conversion_rate
        const conversionMap = new Map<string, number>()
        stageConversionsArray.forEach(conv => {
          const key = `${conv.from_stage_id}_${conv.to_stage_id}`
          conversionMap.set(key, conv.conversion_rate)
        })
        
        console.log('Conversion map entries:', Array.from(conversionMap.entries()))


        // Calculate conversion rates between consecutive stages
        const conversions: Record<string, number> = {}
        
        // Add conversions for all consecutive stages (using ID-based keys)
        // This allows the frontend to look up conversions dynamically
        for (let i = 0; i < allStagesSorted.length - 1; i++) {
          const fromStage = allStagesSorted[i]
          const toStage = allStagesSorted[i + 1]
          const idKey = `${fromStage.id}_${toStage.id}`
          const rate = conversionMap.get(idKey) ?? 0
          
          // Add with ID-based key
          conversions[idKey] = rate
          
          // Also add with name-based key for backward compatibility
          const fromName = fromStage.name.toLowerCase().split(' ')[0].split('(')[0]
          const toName = toStage.name.toLowerCase().split(' ')[0].split('(')[0]
          conversions[`${fromName}_to_${toName}`] = rate
          
          console.log(`Conversion ${fromName} -> ${toName} (${idKey}): ${rate}%`)
        }

        // Parse movement statistics for lead count
        const movData = movementStats as { 
          data?: { 
            new_deals?: { count?: number }
            deals_started?: number
          } 
        }
        
        // Primary: new_deals.count (deals that entered the pipeline in the period)
        const leadsCount = movData?.data?.new_deals?.count || 
                          movData?.data?.deals_started || 
                          0

        console.log('Leads count:', leadsCount)
        console.log('Deals per stage:', dealsPerStage)

        // Get stage-specific counts
        const stageData: Record<number, { count: number; name: string }> = {}
        allStagesSorted.forEach(stage => {
          stageData[stage.id] = {
            count: dealsPerStage[stage.id] || 0,
            name: stage.name
          }
        })

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              stages: allStagesSorted.slice(0, 5),
              all_stages: allStagesSorted,
              conversions,
              leads_count: leadsCount,
              stage_counts: dealsPerStage,
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
