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

// Date filter: only consider deals created from this date onwards
// This aligns with the new funnel stage rules implemented in 2026
const DEALS_CREATED_AFTER = '2026-01-01'

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
  // Snapshot atual: conta TODOS os deals abertos em cada etapa, sem filtro de data
  const cacheKey = `deals_per_stage_${pipelineId}_snapshot`
  
  if (!forceRefresh) {
    const cached = await getCachedData(supabase, cacheKey)
    if (cached) {
      console.log('Using cached deals per stage (snapshot)')
      return cached.payload as Record<number, number>
    }
  }

  const result: Record<number, number> = {}
  
  // Fetch deals for each stage - NO date filter for snapshot
  console.log('Fetching deals per stage for', stages.length, 'stages (snapshot - all open deals)')
  
  for (const stage of stages) {
    try {
      // Fetch all open deals in this stage (no date filter)
      const stageDeals = await fetchFromPipedrive('/api/v2/deals', {
        pipeline_id: pipelineId.toString(),
        stage_id: stage.id.toString(),
        status: 'open',
        limit: '500'
      }) as { data?: Array<{ add_time?: string }> }
      
      // Count all open deals - no date filtering for snapshot
      result[stage.id] = stageDeals?.data?.length || 0
      console.log(`Stage ${stage.name} (${stage.id}): ${result[stage.id]} deals (snapshot)`)
    } catch (e) {
      console.error(`Error fetching deals for stage ${stage.id}:`, e)
      result[stage.id] = 0
    }
  }

  await setCachedData(supabase, cacheKey, result, TTL_CONFIG.deals)
  return result
}

// Helper function to get deals that entered each stage during the period
// Only considers deals created on or after DEALS_CREATED_AFTER
async function getStageArrivalsFromDeals(
  supabase: AnySupabaseClient,
  pipelineId: number,
  stages: StageInfo[],
  startDate: string,
  endDate: string,
  forceRefresh: boolean
): Promise<{ arrivals: Record<number, number>; totalNewDeals: number }> {
  const cacheKey = `stage_arrivals_${pipelineId}_${startDate}_${endDate}_created_after_${DEALS_CREATED_AFTER}`
  
  if (!forceRefresh) {
    const cached = await getCachedData(supabase, cacheKey)
    if (cached) {
      console.log('Using cached stage arrivals')
      return cached.payload as { arrivals: Record<number, number>; totalNewDeals: number }
    }
  }

  console.log('Calculating stage arrivals from deals (created after', DEALS_CREATED_AFTER, ')')
  
  // Fetch all deals in the pipeline (including won/lost to track movements)
  const allDealsResponse = await fetchFromPipedrive('/api/v2/deals', {
    pipeline_id: pipelineId.toString(),
    limit: '500',
    sort_by: 'add_time',
    sort_direction: 'desc'
  }) as { data?: Array<{ 
    id: number
    add_time?: string
    stage_id?: number
    status?: string
    stage_change_time?: string
  }> }

  const allDeals = allDealsResponse?.data || []
  
  // Filter deals created on or after DEALS_CREATED_AFTER
  const filteredDeals = allDeals.filter(deal => {
    if (!deal.add_time) return false
    const addDate = deal.add_time.split('T')[0]
    return addDate >= DEALS_CREATED_AFTER
  })

  console.log(`Total deals: ${allDeals.length}, After ${DEALS_CREATED_AFTER}: ${filteredDeals.length}`)

  // Count deals that were added during the period (new leads)
  const newDealsInPeriod = filteredDeals.filter(deal => {
    if (!deal.add_time) return false
    const addDate = deal.add_time.split('T')[0]
    return addDate >= startDate && addDate <= endDate
  })

  const totalNewDeals = newDealsInPeriod.length
  console.log(`New deals in period ${startDate} to ${endDate}: ${totalNewDeals}`)

  // For arrivals per stage, we need to count how many deals reached each stage during the period
  // Since Pipedrive API doesn't give us historical stage transitions easily,
  // we'll use the conversion statistics but apply the creation date filter logic
  
  // First stage gets all new deals from the period
  const arrivals: Record<number, number> = {}
  const sortedStages = [...stages].sort((a, b) => a.order_nr - b.order_nr)
  
  if (sortedStages.length > 0) {
    arrivals[sortedStages[0].id] = totalNewDeals
    
    // For subsequent stages, count deals from the period that are currently in this stage or later
    // This reflects deals that were created in the period AND progressed to each stage
    for (let i = 1; i < sortedStages.length; i++) {
      const stageId = sortedStages[i].id
      // Count deals created in the period that are now in this stage or later stages
      const dealsInOrPastStage = newDealsInPeriod.filter(deal => {
        const dealStageIndex = sortedStages.findIndex(s => s.id === deal.stage_id)
        return dealStageIndex >= i
      })
      arrivals[stageId] = dealsInOrPastStage.length
    }
  }

  console.log('Stage arrivals calculated:', arrivals)

  const result = { arrivals, totalNewDeals }
  await setCachedData(supabase, cacheKey, result, TTL_CONFIG.movement_statistics)
  return result
}

// Get lost deals with their loss reasons
async function getLostDealsReasons(
  supabase: AnySupabaseClient,
  pipelineId: number,
  startDate: string,
  endDate: string,
  forceRefresh: boolean
): Promise<Record<string, number>> {
  const cacheKey = `lost_reasons_${pipelineId}_${startDate}_${endDate}`
  
  if (!forceRefresh) {
    const cached = await getCachedData(supabase, cacheKey)
    if (cached) {
      console.log('Using cached lost reasons')
      return cached.payload as Record<string, number>
    }
  }

  console.log('Fetching lost deals reasons for period:', startDate, 'to', endDate)

  // First, fetch all lost deals in the period
  const lostDealsResponse = await fetchFromPipedrive('/api/v2/deals', {
    pipeline_id: pipelineId.toString(),
    status: 'lost',
    limit: '500'
  }) as { data?: Array<{ 
    id: number
    lost_time?: string
    lost_reason?: string
  }> }

  const lostDeals = lostDealsResponse?.data || []
  
  // Filter to period
  const lostInPeriod = lostDeals.filter(deal => {
    if (!deal.lost_time) return false
    const lostDate = deal.lost_time.split('T')[0]
    return lostDate >= startDate && lostDate <= endDate
  })

  console.log(`Lost deals in period: ${lostInPeriod.length} of ${lostDeals.length}`)

  // Group by loss reason
  const reasonCounts: Record<string, number> = {}
  
  lostInPeriod.forEach(deal => {
    const reason = deal.lost_reason || 'Não informado'
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
  })

  // Sort by count descending
  const sortedReasons: Record<string, number> = {}
  Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([reason, count]) => {
      sortedReasons[reason] = count
    })

  console.log('Lost reasons:', sortedReasons)

  await setCachedData(supabase, cacheKey, sortedReasons, TTL_CONFIG.deals)
  return sortedReasons
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
        console.log('Using deals created after filter:', DEALS_CREATED_AFTER)

        // Fetch data in parallel - now using the filtered arrivals calculation
        const [conversionStats, dealsPerStage, arrivalsData, lostReasons] = await Promise.all([
          getConversionStatistics(supabase, pipeline_id, start_date, end_date, forceRefresh),
          getDealsPerStage(supabase, pipeline_id, allStagesSorted, forceRefresh),
          getStageArrivalsFromDeals(supabase, pipeline_id, allStagesSorted, start_date, end_date, forceRefresh),
          getLostDealsReasons(supabase, pipeline_id, start_date, end_date, forceRefresh)
        ])

        // Log raw conversion stats to understand the data structure
        console.log('Raw conversion stats full:', JSON.stringify(conversionStats, null, 2))
        
        // Parse conversion statistics - handle array format from Pipedrive API
        const convData = conversionStats as { 
          success?: boolean
          data?: { 
            stage_conversions?: Array<{ 
              conversion_rate: number
              from_stage_id: number
              to_stage_id: number
              deals_converted?: number
              deals_entered?: number
              count?: number
            }> 
          } 
        }
        const stageConversionsArray = convData?.data?.stage_conversions || []
        
        console.log('Stage conversions array:', JSON.stringify(stageConversionsArray, null, 2))
        
        // Create a map of stage transitions: "fromId_toId" -> { rate, dealsEntered, dealsConverted }
        const conversionMap = new Map<string, { rate: number; entered: number; converted: number }>()
        stageConversionsArray.forEach(conv => {
          const key = `${conv.from_stage_id}_${conv.to_stage_id}`
          conversionMap.set(key, { 
            rate: conv.conversion_rate, 
            entered: conv.deals_entered || 0,
            converted: conv.deals_converted || 0
          })
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
          const convInfo = conversionMap.get(idKey)
          const rate = convInfo?.rate ?? 0
          
          // Add with ID-based key
          conversions[idKey] = rate
          
          // Also add with name-based key for backward compatibility
          const fromName = fromStage.name.toLowerCase().split(' ')[0].split('(')[0]
          const toName = toStage.name.toLowerCase().split(' ')[0].split('(')[0]
          conversions[`${fromName}_to_${toName}`] = rate
          
          console.log(`Conversion ${fromName} -> ${toName} (${idKey}): ${rate}%`)
        }

        // Use the filtered arrivals from the new function
        const stageArrivals = arrivalsData.arrivals
        const leadsCount = arrivalsData.totalNewDeals

        console.log('Leads count (filtered):', leadsCount)
        console.log('Deals per stage (current, filtered):', dealsPerStage)
        console.log('Stage arrivals (period, filtered):', stageArrivals)

        // Recalculate conversion rates based on filtered data
        // This gives more accurate conversions for the filtered dataset
        for (let i = 0; i < allStagesSorted.length - 1; i++) {
          const fromStage = allStagesSorted[i]
          const toStage = allStagesSorted[i + 1]
          const idKey = `${fromStage.id}_${toStage.id}`
          
          const fromArrivals = stageArrivals[fromStage.id] || 0
          const toArrivals = stageArrivals[toStage.id] || 0
          
          // Calculate conversion rate from filtered data
          const calculatedRate = fromArrivals > 0 ? Math.round((toArrivals / fromArrivals) * 100) : 0
          
          // Use the calculated rate if we have data, otherwise keep the Pipedrive rate
          if (fromArrivals > 0) {
            conversions[idKey] = calculatedRate
            const fromName = fromStage.name.toLowerCase().split(' ')[0].split('(')[0]
            const toName = toStage.name.toLowerCase().split(' ')[0].split('(')[0]
            conversions[`${fromName}_to_${toName}`] = calculatedRate
            console.log(`Updated conversion ${fromName} -> ${toName}: ${calculatedRate}% (${toArrivals}/${fromArrivals})`)
          }
        }

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
              stage_arrivals: stageArrivals,
              stage_data: stageData,
              lost_reasons: lostReasons,
              deals_created_after: DEALS_CREATED_AFTER, // Include filter info in response
              raw_conversion_stats: conversionStats,
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
