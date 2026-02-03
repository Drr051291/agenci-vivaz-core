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
// This aligns with the new funnel stage rules implemented in October 2025
const DEALS_CREATED_AFTER = '2025-10-01'

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

// Lost reasons result type
interface LostReasonsResult {
  total: Record<string, number>
  by_stage: Record<number, Record<string, number>>
}

// Campaign tracking data types
interface CampaignTrackingResult {
  by_campaign: Record<string, { total: number; by_stage: Record<number, number> }>
  by_adset: Record<string, { total: number; by_stage: Record<number, number> }>
  by_creative: Record<string, { total: number; by_stage: Record<number, number> }>
  field_key: string | null
}

// Lead source tracking data types
type LeadSource = 'Landing Page' | 'Base Sétima' | 'Lead Nativo'

interface LeadSourceTrackingResult {
  by_source: Record<LeadSource, { total: number; by_stage: Record<number, number> }>
}

// Parse the tracking field value
// Handles various UTM structures:
// Format A: [F][Lead][Nativo][Sétima] - RMKT / Visitantes 30D / ad04 (uses " / ")
// Format B: [M][Lead][Nativo][Sétima] - Geral - 00 - Funciários... - Criativos Sávio - Tera (uses " - " throughout)
function parseTrackingField(value: string): { campaign: string; adSet: string; creative: string } {
  if (!value || value.trim() === '') {
    return { campaign: 'Não informado', adSet: 'Não informado', creative: 'Não informado' }
  }
  
  // Try splitting by " / " first (Format A)
  let parts = value.split(' / ').map(p => p.trim())
  
  // If only 1 part after splitting by " / ", maybe it uses " - " as separator
  // We need to be smart about this because campaigns like "[M][Lead][Nativo][Sétima] - RMKT" 
  // have " - " as part of the campaign name
  if (parts.length < 3) {
    parts = value.split('/').map(p => p.trim())
  }
  
  // Still only 1 part? Try a smarter " - " split
  // Pattern for 3D pipeline: [M][Lead][Nativo][Sétima] - Campanha - Conjunto - Anúncio
  // We need to find the structure: Campanha prefix, then split remaining by " - "
  if (parts.length < 3) {
    // Look for pattern starting with brackets: [X][Y][Z][W]
    const bracketMatch = value.match(/^(\[[^\]]+\])+/)
    if (bracketMatch) {
      const prefix = bracketMatch[0] // e.g., "[M][Lead][Nativo][Sétima]"
      const remainder = value.substring(prefix.length).trim()
      
      // Remove leading " - " if present
      const cleanedRemainder = remainder.startsWith(' - ') 
        ? remainder.substring(3) 
        : (remainder.startsWith('- ') ? remainder.substring(2) : remainder)
      
      // Now split the remainder by " - "
      const remainderParts = cleanedRemainder.split(' - ').map(p => p.trim()).filter(p => p)
      
      if (remainderParts.length >= 3) {
        // Reconstruct: campaign = prefix + first part, adSet = second part, creative = last part
        return {
          campaign: `${prefix} - ${remainderParts[0]}`,
          adSet: remainderParts.slice(1, -1).join(' - '), // Middle parts as adset
          creative: remainderParts[remainderParts.length - 1]
        }
      } else if (remainderParts.length === 2) {
        return {
          campaign: `${prefix} - ${remainderParts[0]}`,
          adSet: remainderParts[1],
          creative: 'Não informado'
        }
      } else if (remainderParts.length === 1) {
        return {
          campaign: `${prefix} - ${remainderParts[0]}`,
          adSet: 'Não informado',
          creative: 'Não informado'
        }
      }
    }
  }
  
  // Clean up each part: remove leading "- " or " - " if present
  const cleanPart = (part: string): string => {
    if (!part) return 'Não informado'
    let cleaned = part.trim()
    // Remove leading dash variations
    if (cleaned.startsWith('- ')) {
      cleaned = cleaned.substring(2).trim()
    } else if (cleaned.startsWith('-')) {
      cleaned = cleaned.substring(1).trim()
    }
    return cleaned || 'Não informado'
  }
  
  return {
    campaign: cleanPart(parts[0]),
    adSet: cleanPart(parts[1]),
    creative: cleanPart(parts[2])
  }
}

// Get the custom field key for "Origem - Campanha / Conjunto / Criativo"
async function getTrackingFieldKey(
  supabase: AnySupabaseClient,
  forceRefresh: boolean
): Promise<string | null> {
  const cacheKey = 'pipedrive_tracking_field_key'
  
  if (!forceRefresh) {
    const cached = await getCachedData(supabase, cacheKey)
    if (cached) {
      console.log('Using cached tracking field key')
      return cached.payload as string | null
    }
  }

  console.log('Fetching deal fields to find tracking field key')
  
  const response = await fetchFromPipedrive('/v1/dealFields') as {
    data?: Array<{
      key: string
      name: string
      field_type: string
    }>
  }

  const fields = response?.data || []
  
  // Look for the field by name (case-insensitive, partial match)
  const trackingField = fields.find(f => 
    f.name.toLowerCase().includes('origem') && 
    (f.name.toLowerCase().includes('campanha') || f.name.toLowerCase().includes('criativo'))
  )

  const fieldKey = trackingField?.key || null
  console.log('Tracking field found:', trackingField?.name, 'key:', fieldKey)

  await setCachedData(supabase, cacheKey, fieldKey, TTL_CONFIG.stages)
  return fieldKey
}

// Get campaign tracking data from deals
async function getCampaignTrackingData(
  supabase: AnySupabaseClient,
  pipelineId: number,
  startDate: string,
  endDate: string,
  forceRefresh: boolean
): Promise<CampaignTrackingResult> {
  const cacheKey = `campaign_tracking_${pipelineId}_${startDate}_${endDate}`
  
  if (!forceRefresh) {
    const cached = await getCachedData(supabase, cacheKey)
    if (cached) {
      console.log('Using cached campaign tracking data')
      return cached.payload as CampaignTrackingResult
    }
  }

  // First, get the tracking field key
  const fieldKey = await getTrackingFieldKey(supabase, forceRefresh)
  
  if (!fieldKey) {
    console.log('Tracking field not found in Pipedrive')
    return {
      by_campaign: {},
      by_adset: {},
      by_creative: {},
      field_key: null
    }
  }

  // Get valid stage IDs for this pipeline
  const { all: pipelineStages } = await getStagesMap(supabase, pipelineId, forceRefresh)
  const validStageIds = new Set(pipelineStages.map(s => s.id))
  console.log(`Valid stage IDs for pipeline ${pipelineId} (period):`, Array.from(validStageIds))

  console.log('Fetching deals with tracking field:', fieldKey)

  // Fetch all deals in the pipeline (open and won) within the date range
  const allDeals: Array<{
    id: number
    add_time?: string
    stage_id?: number
    status?: string
    [key: string]: unknown
  }> = []
  
  let start = 0
  const limit = 500
  let hasMore = true
  
  while (hasMore) {
    const dealsResponse = await fetchFromPipedrive('/v1/deals', {
      pipeline_id: pipelineId.toString(),
      limit: limit.toString(),
      start: start.toString()
    }) as { 
      data?: Array<{
        id: number
        add_time?: string
        stage_id?: number
        status?: string
        [key: string]: unknown
      }>
      additional_data?: {
        pagination?: {
          more_items_in_collection?: boolean
        }
      }
    }

    const deals = dealsResponse?.data || []
    allDeals.push(...deals)
    
    hasMore = dealsResponse?.additional_data?.pagination?.more_items_in_collection || false
    start += limit
    
    if (start > 5000) break
  }

  console.log(`Total deals fetched: ${allDeals.length}`)

  // Filter to deals created in the period, after the base date, AND in valid stages for this pipeline
  const filteredDeals = allDeals.filter(deal => {
    if (!deal.add_time) return false
    const addDate = deal.add_time.split('T')[0]
    const stageId = deal.stage_id
    // Must be in a valid stage for this pipeline AND within the date range
    return stageId && validStageIds.has(stageId) && 
           addDate >= DEALS_CREATED_AFTER && 
           addDate >= startDate && 
           addDate <= endDate
  })

  console.log(`Deals in period (pipeline ${pipelineId}): ${filteredDeals.length}`)

  // Initialize result structures
  const byCampaign: Record<string, { total: number; by_stage: Record<number, number> }> = {}
  const byAdset: Record<string, { total: number; by_stage: Record<number, number> }> = {}
  const byCreative: Record<string, { total: number; by_stage: Record<number, number> }> = {}

  // Process each deal
  filteredDeals.forEach((deal, idx) => {
    const trackingValue = deal[fieldKey] as string | undefined
    const { campaign, adSet, creative } = parseTrackingField(trackingValue || '')
    const stageId = deal.stage_id || 0
    
    // Log first few deals with tracking values for debugging
    if (idx < 5 && trackingValue) {
      console.log(`Deal ${deal.id} tracking: "${trackingValue}" => campaign="${campaign}", adSet="${adSet}", creative="${creative}"`)
    }

    // Aggregate by campaign
    if (!byCampaign[campaign]) {
      byCampaign[campaign] = { total: 0, by_stage: {} }
    }
    byCampaign[campaign].total++
    byCampaign[campaign].by_stage[stageId] = (byCampaign[campaign].by_stage[stageId] || 0) + 1

    // Aggregate by ad set
    if (!byAdset[adSet]) {
      byAdset[adSet] = { total: 0, by_stage: {} }
    }
    byAdset[adSet].total++
    byAdset[adSet].by_stage[stageId] = (byAdset[adSet].by_stage[stageId] || 0) + 1

    // Aggregate by creative
    if (!byCreative[creative]) {
      byCreative[creative] = { total: 0, by_stage: {} }
    }
    byCreative[creative].total++
    byCreative[creative].by_stage[stageId] = (byCreative[creative].by_stage[stageId] || 0) + 1
  })

  // Sort each record by total descending
  const sortByTotal = (obj: Record<string, { total: number; by_stage: Record<number, number> }>) => {
    return Object.fromEntries(
      Object.entries(obj).sort((a, b) => b[1].total - a[1].total)
    )
  }

  const result: CampaignTrackingResult = {
    by_campaign: sortByTotal(byCampaign),
    by_adset: sortByTotal(byAdset),
    by_creative: sortByTotal(byCreative),
    field_key: fieldKey
  }

  console.log('Campaign tracking result:', {
    campaigns: Object.keys(result.by_campaign).length,
    adsets: Object.keys(result.by_adset).length,
    creatives: Object.keys(result.by_creative).length
  })

  await setCachedData(supabase, cacheKey, result, TTL_CONFIG.deals)
  return result
}

// Classify deal source based on title and labels
function classifyDealSource(
  deal: { title?: string; label?: string | number | null },
  baseSetimaLabelId: string | number | null
): LeadSource {
  // Priority 1: Landing Page - title contains "[Lead Site]" OR starts with "Lead Site"
  // Pattern 1: "[Lead Site]" - used in Brandspot (Pipeline 9)
  // Pattern 2: "Lead Site" at start - used in 3D (Pipeline 13)
  if (deal.title) {
    if (deal.title.includes('[Lead Site]') || deal.title.startsWith('Lead Site')) {
      return 'Landing Page'
    }
  }
  
  // Priority 2: Base Sétima - has the specific label
  if (baseSetimaLabelId && deal.label) {
    // Label can be a string or number ID
    const dealLabel = String(deal.label)
    if (dealLabel === String(baseSetimaLabelId)) {
      return 'Base Sétima'
    }
  }
  
  // Default: Lead Nativo
  return 'Lead Nativo'
}

// Get deal labels from Pipedrive
async function getDealLabels(
  supabase: AnySupabaseClient,
  forceRefresh: boolean
): Promise<Array<{ id: string | number; name: string; color: string }>> {
  const cacheKey = 'pipedrive_deal_labels'
  
  if (!forceRefresh) {
    const cached = await getCachedData(supabase, cacheKey)
    if (cached) {
      console.log('Using cached deal labels')
      return cached.payload as Array<{ id: string | number; name: string; color: string }>
    }
  }

  console.log('Fetching deal labels from Pipedrive')
  
  const response = await fetchFromPipedrive('/v1/dealFields') as {
    data?: Array<{
      key: string
      name: string
      options?: Array<{ id: string | number; label: string }>
    }>
  }

  const fields = response?.data || []
  
  // Find the label field
  const labelField = fields.find(f => f.key === 'label')
  const labels = labelField?.options?.map(opt => ({
    id: opt.id,
    name: opt.label,
    color: 'default'
  })) || []

  console.log('Deal labels found:', labels)

  await setCachedData(supabase, cacheKey, labels, TTL_CONFIG.stages)
  return labels
}

// Get lead source tracking data
async function getLeadSourceTrackingData(
  supabase: AnySupabaseClient,
  pipelineId: number,
  startDate: string,
  endDate: string,
  forceRefresh: boolean
): Promise<LeadSourceTrackingResult> {
  const cacheKey = `lead_source_tracking_${pipelineId}_${startDate}_${endDate}`
  
  if (!forceRefresh) {
    const cached = await getCachedData(supabase, cacheKey)
    if (cached) {
      console.log('Using cached lead source tracking data')
      return cached.payload as LeadSourceTrackingResult
    }
  }

  // Get deal labels to find "BASE SETIMA" label ID
  const labels = await getDealLabels(supabase, forceRefresh)
  const baseSetimaLabel = labels.find(l => 
    l.name.toUpperCase().includes('BASE SETIMA') || 
    l.name.toUpperCase().includes('BASE SÉTIMA')
  )
  const baseSetimaLabelId = baseSetimaLabel?.id || null

  console.log('Base Sétima label ID:', baseSetimaLabelId)

  // Fetch all deals in the pipeline within the date range
  const allDeals: Array<{
    id: number
    title?: string
    add_time?: string
    stage_id?: number
    status?: string
    label?: string | number | null
  }> = []
  
  let start = 0
  const limit = 500
  let hasMore = true
  
  while (hasMore) {
    const dealsResponse = await fetchFromPipedrive('/v1/deals', {
      pipeline_id: pipelineId.toString(),
      limit: limit.toString(),
      start: start.toString()
    }) as { 
      data?: Array<{
        id: number
        title?: string
        add_time?: string
        stage_id?: number
        status?: string
        label?: string | number | null
      }>
      additional_data?: {
        pagination?: {
          more_items_in_collection?: boolean
        }
      }
    }

    const deals = dealsResponse?.data || []
    allDeals.push(...deals)
    
    hasMore = dealsResponse?.additional_data?.pagination?.more_items_in_collection || false
    start += limit
    
    if (start > 5000) break
  }

  console.log(`Total deals fetched for lead source: ${allDeals.length}`)

  // Filter to deals created in the period and after the base date
  const filteredDeals = allDeals.filter(deal => {
    if (!deal.add_time) return false
    const addDate = deal.add_time.split('T')[0]
    return addDate >= DEALS_CREATED_AFTER && addDate >= startDate && addDate <= endDate
  })

  console.log(`Deals in period for lead source: ${filteredDeals.length}`)

  // Initialize result structure
  const bySource: Record<LeadSource, { total: number; by_stage: Record<number, number> }> = {
    'Landing Page': { total: 0, by_stage: {} },
    'Base Sétima': { total: 0, by_stage: {} },
    'Lead Nativo': { total: 0, by_stage: {} }
  }

  // Classify each deal
  filteredDeals.forEach(deal => {
    const source = classifyDealSource(deal, baseSetimaLabelId)
    const stageId = deal.stage_id || 0

    bySource[source].total++
    bySource[source].by_stage[stageId] = (bySource[source].by_stage[stageId] || 0) + 1
  })

  console.log('Lead source tracking result:', {
    landingPage: bySource['Landing Page'].total,
    baseSetima: bySource['Base Sétima'].total,
    leadNativo: bySource['Lead Nativo'].total
  })

  const result: LeadSourceTrackingResult = { by_source: bySource }

  await setCachedData(supabase, cacheKey, result, TTL_CONFIG.deals)
  return result
}

// Get campaign tracking SNAPSHOT data - all open deals regardless of date filter
async function getCampaignTrackingSnapshotData(
  supabase: AnySupabaseClient,
  pipelineId: number,
  forceRefresh: boolean
): Promise<CampaignTrackingResult> {
  const cacheKey = `campaign_tracking_snapshot_${pipelineId}`
  
  if (!forceRefresh) {
    const cached = await getCachedData(supabase, cacheKey)
    if (cached) {
      console.log('Using cached campaign tracking snapshot data')
      return cached.payload as CampaignTrackingResult
    }
  }

  // First, get the tracking field key
  const fieldKey = await getTrackingFieldKey(supabase, forceRefresh)
  
  if (!fieldKey) {
    console.log('Tracking field not found in Pipedrive (snapshot)')
    return {
      by_campaign: {},
      by_adset: {},
      by_creative: {},
      field_key: null
    }
  }

  // Get valid stage IDs for this pipeline
  const { all: pipelineStages } = await getStagesMap(supabase, pipelineId, forceRefresh)
  const validStageIds = new Set(pipelineStages.map(s => s.id))
  console.log(`Valid stage IDs for pipeline ${pipelineId}:`, Array.from(validStageIds))

  console.log('Fetching OPEN deals with tracking field for snapshot:', fieldKey)

  // Fetch ALL OPEN deals in the pipeline - no date filter for snapshot
  const allDeals: Array<{
    id: number
    add_time?: string
    stage_id?: number
    status?: string
    [key: string]: unknown
  }> = []
  
  let start = 0
  const limit = 500
  let hasMore = true
  
  while (hasMore) {
    const dealsResponse = await fetchFromPipedrive('/v1/deals', {
      pipeline_id: pipelineId.toString(),
      status: 'open', // Only open deals for snapshot
      limit: limit.toString(),
      start: start.toString()
    }) as { 
      data?: Array<{
        id: number
        add_time?: string
        stage_id?: number
        status?: string
        [key: string]: unknown
      }>
      additional_data?: {
        pagination?: {
          more_items_in_collection?: boolean
        }
      }
    }

    const deals = dealsResponse?.data || []
    allDeals.push(...deals)
    
    hasMore = dealsResponse?.additional_data?.pagination?.more_items_in_collection || false
    start += limit
    
    if (start > 5000) break
  }

  console.log(`Total OPEN deals fetched for campaign tracking snapshot: ${allDeals.length}`)

  // Filter to only deals in valid stages for this pipeline
  const filteredDeals = allDeals.filter(deal => {
    const stageId = deal.stage_id
    return stageId && validStageIds.has(stageId)
  })

  console.log(`Deals in pipeline ${pipelineId} stages: ${filteredDeals.length}`)

  // Initialize result structures
  const byCampaign: Record<string, { total: number; by_stage: Record<number, number> }> = {}
  const byAdset: Record<string, { total: number; by_stage: Record<number, number> }> = {}
  const byCreative: Record<string, { total: number; by_stage: Record<number, number> }> = {}

  // Process each deal - NO date filtering
  filteredDeals.forEach(deal => {
    const trackingValue = deal[fieldKey] as string | undefined
    const { campaign, adSet, creative } = parseTrackingField(trackingValue || '')
    const stageId = deal.stage_id || 0

    // Aggregate by campaign
    if (!byCampaign[campaign]) {
      byCampaign[campaign] = { total: 0, by_stage: {} }
    }
    byCampaign[campaign].total++
    byCampaign[campaign].by_stage[stageId] = (byCampaign[campaign].by_stage[stageId] || 0) + 1

    // Aggregate by ad set
    if (!byAdset[adSet]) {
      byAdset[adSet] = { total: 0, by_stage: {} }
    }
    byAdset[adSet].total++
    byAdset[adSet].by_stage[stageId] = (byAdset[adSet].by_stage[stageId] || 0) + 1

    // Aggregate by creative
    if (!byCreative[creative]) {
      byCreative[creative] = { total: 0, by_stage: {} }
    }
    byCreative[creative].total++
    byCreative[creative].by_stage[stageId] = (byCreative[creative].by_stage[stageId] || 0) + 1
  })

  // Sort each record by total descending
  const sortByTotal = (obj: Record<string, { total: number; by_stage: Record<number, number> }>) => {
    return Object.fromEntries(
      Object.entries(obj).sort((a, b) => b[1].total - a[1].total)
    )
  }

  const result: CampaignTrackingResult = {
    by_campaign: sortByTotal(byCampaign),
    by_adset: sortByTotal(byAdset),
    by_creative: sortByTotal(byCreative),
    field_key: fieldKey
  }

  console.log('Campaign tracking snapshot result:', {
    campaigns: Object.keys(result.by_campaign).length,
    adsets: Object.keys(result.by_adset).length,
    creatives: Object.keys(result.by_creative).length
  })

  await setCachedData(supabase, cacheKey, result, TTL_CONFIG.deals)
  return result
}

// Get lead source SNAPSHOT data - all open deals regardless of date filter
async function getLeadSourceSnapshotData(
  supabase: AnySupabaseClient,
  pipelineId: number,
  forceRefresh: boolean
): Promise<LeadSourceTrackingResult> {
  const cacheKey = `lead_source_snapshot_${pipelineId}`
  
  if (!forceRefresh) {
    const cached = await getCachedData(supabase, cacheKey)
    if (cached) {
      console.log('Using cached lead source snapshot data')
      return cached.payload as LeadSourceTrackingResult
    }
  }

  // Get deal labels to find "BASE SETIMA" label ID
  const labels = await getDealLabels(supabase, forceRefresh)
  const baseSetimaLabel = labels.find(l => 
    l.name.toUpperCase().includes('BASE SETIMA') || 
    l.name.toUpperCase().includes('BASE SÉTIMA')
  )
  const baseSetimaLabelId = baseSetimaLabel?.id || null

  console.log('Base Sétima label ID (snapshot):', baseSetimaLabelId)

  // Fetch ALL OPEN deals in the pipeline - no date filter for snapshot
  const allDeals: Array<{
    id: number
    title?: string
    add_time?: string
    stage_id?: number
    status?: string
    label?: string | number | null
  }> = []
  
  let start = 0
  const limit = 500
  let hasMore = true
  
  while (hasMore) {
    const dealsResponse = await fetchFromPipedrive('/v1/deals', {
      pipeline_id: pipelineId.toString(),
      status: 'open', // Only open deals for snapshot
      limit: limit.toString(),
      start: start.toString()
    }) as { 
      data?: Array<{
        id: number
        title?: string
        add_time?: string
        stage_id?: number
        status?: string
        label?: string | number | null
      }>
      additional_data?: {
        pagination?: {
          more_items_in_collection?: boolean
        }
      }
    }

    const deals = dealsResponse?.data || []
    allDeals.push(...deals)
    
    hasMore = dealsResponse?.additional_data?.pagination?.more_items_in_collection || false
    start += limit
    
    if (start > 5000) break
  }

  console.log(`Total OPEN deals fetched for lead source snapshot: ${allDeals.length}`)

  // Initialize result structure
  const bySource: Record<LeadSource, { total: number; by_stage: Record<number, number> }> = {
    'Landing Page': { total: 0, by_stage: {} },
    'Base Sétima': { total: 0, by_stage: {} },
    'Lead Nativo': { total: 0, by_stage: {} }
  }

  // Classify each deal - NO date filtering
  allDeals.forEach(deal => {
    const source = classifyDealSource(deal, baseSetimaLabelId)
    const stageId = deal.stage_id || 0

    bySource[source].total++
    bySource[source].by_stage[stageId] = (bySource[source].by_stage[stageId] || 0) + 1
  })

  console.log('Lead source snapshot result:', {
    landingPage: bySource['Landing Page'].total,
    baseSetima: bySource['Base Sétima'].total,
    leadNativo: bySource['Lead Nativo'].total
  })

  const result: LeadSourceTrackingResult = { by_source: bySource }

  await setCachedData(supabase, cacheKey, result, TTL_CONFIG.deals)
  return result
}

// Get lost deals with their loss reasons
async function getLostDealsReasons(
  supabase: AnySupabaseClient,
  pipelineId: number,
  startDate: string,
  endDate: string,
  forceRefresh: boolean
): Promise<LostReasonsResult> {
  const cacheKey = `lost_reasons_${pipelineId}_${startDate}_${endDate}`
  
  if (!forceRefresh) {
    const cached = await getCachedData(supabase, cacheKey)
    if (cached) {
      console.log('Using cached lost reasons')
      return cached.payload as LostReasonsResult
    }
  }

  console.log('Fetching lost deals reasons for period:', startDate, 'to', endDate)

  // Paginate through all lost deals - include stage_id for per-stage analysis
  const allLostDeals: Array<{ 
    id: number
    lost_time?: string
    lost_reason?: string
    stage_id?: number
  }> = []
  
  let start = 0
  const limit = 500
  let hasMore = true
  
  while (hasMore) {
    const lostDealsResponse = await fetchFromPipedrive('/v1/deals', {
      pipeline_id: pipelineId.toString(),
      status: 'lost',
      limit: limit.toString(),
      start: start.toString()
    }) as { 
      data?: Array<{ 
        id: number
        lost_time?: string
        lost_reason?: string
        stage_id?: number
      }>
      additional_data?: {
        pagination?: {
          more_items_in_collection?: boolean
        }
      }
    }

    const deals = lostDealsResponse?.data || []
    allLostDeals.push(...deals)
    
    hasMore = lostDealsResponse?.additional_data?.pagination?.more_items_in_collection || false
    start += limit
    
    // Safety limit
    if (start > 5000) break
  }

  console.log(`Total lost deals fetched: ${allLostDeals.length}`)
  
  // Log a sample to debug
  if (allLostDeals.length > 0) {
    console.log('Sample deal:', allLostDeals[0].lost_time, 'reason:', allLostDeals[0].lost_reason, 'stage_id:', allLostDeals[0].stage_id)
  }
  
  // Filter to period based on lost_time
  const lostInPeriod = allLostDeals.filter(deal => {
    if (!deal.lost_time) return false
    const lostDate = deal.lost_time.substring(0, 10)
    return lostDate >= startDate && lostDate <= endDate
  })

  console.log(`Lost deals in period: ${lostInPeriod.length}`)

  // Group by loss reason (total)
  const reasonCounts: Record<string, number> = {}
  
  // Group by stage -> reason
  const reasonsByStage: Record<number, Record<string, number>> = {}
  
  lostInPeriod.forEach(deal => {
    const reason = deal.lost_reason || 'Não informado'
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
    
    // Group by stage
    if (deal.stage_id) {
      if (!reasonsByStage[deal.stage_id]) {
        reasonsByStage[deal.stage_id] = {}
      }
      reasonsByStage[deal.stage_id][reason] = (reasonsByStage[deal.stage_id][reason] || 0) + 1
    }
  })

  // Sort total reasons by count descending
  const sortedReasons: Record<string, number> = {}
  Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([reason, count]) => {
      sortedReasons[reason] = count
    })

  // Sort reasons within each stage
  const sortedReasonsByStage: Record<number, Record<string, number>> = {}
  Object.entries(reasonsByStage).forEach(([stageId, reasons]) => {
    sortedReasonsByStage[Number(stageId)] = {}
    Object.entries(reasons)
      .sort((a, b) => b[1] - a[1])
      .forEach(([reason, count]) => {
        sortedReasonsByStage[Number(stageId)][reason] = count
      })
  })

  console.log('Lost reasons total:', sortedReasons)
  console.log('Lost reasons by stage:', sortedReasonsByStage)

  const result = {
    total: sortedReasons,
    by_stage: sortedReasonsByStage
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

    const { action, pipeline_id, start_date, end_date, force, stage_id, view_mode } = await req.json()
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

      case 'get_campaign_tracking': {
        // Get campaign tracking data from deals
        const trackingData = await getCampaignTrackingData(
          supabase, 
          pipeline_id, 
          start_date, 
          end_date, 
          forceRefresh
        )

        // Also get stages for reference
        const stagesResult = await getStagesMap(supabase, pipeline_id, forceRefresh)

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              ...trackingData,
              all_stages: stagesResult.all,
              fetched_at: new Date().toISOString()
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_campaign_tracking_snapshot': {
        // Get campaign tracking SNAPSHOT data - all open deals regardless of date
        const snapshotData = await getCampaignTrackingSnapshotData(
          supabase, 
          pipeline_id, 
          forceRefresh
        )

        // Also get stages for reference
        const stagesResult = await getStagesMap(supabase, pipeline_id, forceRefresh)

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              ...snapshotData,
              all_stages: stagesResult.all,
              fetched_at: new Date().toISOString()
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_lead_source_tracking': {
        // Get lead source tracking data from deals
        const sourceData = await getLeadSourceTrackingData(
          supabase, 
          pipeline_id, 
          start_date, 
          end_date, 
          forceRefresh
        )

        // Also get stages for reference
        const stagesResult = await getStagesMap(supabase, pipeline_id, forceRefresh)

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              ...sourceData,
              all_stages: stagesResult.all,
              fetched_at: new Date().toISOString()
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_lead_source_snapshot': {
        // Get lead source SNAPSHOT data - all open deals regardless of date
        const snapshotData = await getLeadSourceSnapshotData(
          supabase, 
          pipeline_id, 
          forceRefresh
        )

        // Also get stages for reference
        const stagesResult = await getStagesMap(supabase, pipeline_id, forceRefresh)

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              ...snapshotData,
              all_stages: stagesResult.all,
              fetched_at: new Date().toISOString()
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_stage_deals': {
        // Get list of deals in a specific stage
        // stage_id and view_mode come from the initial req.json() destructuring
        const stageId = stage_id
        const viewModeParam = view_mode
        const startDateParam = start_date
        const endDateParam = end_date

        if (!stageId) {
          throw new Error('stage_id is required')
        }

        console.log(`Fetching deals for stage ${stageId}, mode: ${viewModeParam}`)

        // Fetch deals from the stage
        const dealsResponse = await fetchFromPipedrive('/api/v2/deals', {
          pipeline_id: pipeline_id.toString(),
          stage_id: stageId.toString(),
          status: 'open',
          limit: '100'
        }) as { data?: Array<{
          id: number
          title: string
          person_name?: string
          org_name?: string
          add_time?: string
          status?: string
          value?: number
        }> }

        let deals = dealsResponse?.data || []

        // For period mode, filter by date range AND creation date filter
        if (viewModeParam === 'period' && startDateParam && endDateParam) {
          deals = deals.filter(deal => {
            if (!deal.add_time) return false
            const addDate = deal.add_time.split('T')[0]
            // Must be created after the global filter AND within the period
            return addDate >= DEALS_CREATED_AFTER && addDate >= startDateParam && addDate <= endDateParam
          })
        }

        // Sort by add_time descending
        deals.sort((a, b) => {
          const dateA = a.add_time ? new Date(a.add_time).getTime() : 0
          const dateB = b.add_time ? new Date(b.add_time).getTime() : 0
          return dateB - dateA
        })

        // Return simplified deal list
        const simplifiedDeals = deals.map(d => ({
          id: d.id,
          title: d.title,
          person_name: d.person_name || null,
          org_name: d.org_name || null,
          add_time: d.add_time,
          value: d.value || 0
        }))

        return new Response(
          JSON.stringify({
            success: true,
            data: simplifiedDeals
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
