import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Channel benchmarks for context
const CHANNEL_INFO = {
  landing: {
    label: 'Landing Page',
    description: 'Menor conversão clique→lead (~4-6%), porém leads mais qualificados',
    cvrExpected: '4-6%',
    qualityNote: 'Alta qualidade'
  },
  lead_nativo: {
    label: 'Lead Nativo',
    description: 'Alta conversão (~10-20%), qualidade depende do formulário',
    cvrExpected: '10-20%',
    qualityNote: 'Qualidade variável'
  },
  whatsapp: {
    label: 'WhatsApp',
    description: 'Maior conversão (~25-50%), requer qualificação ativa',
    cvrExpected: '25-50%',
    qualityNote: 'Baixa qualificação inicial'
  },
  outro: { label: 'Outro', description: 'Canal não especificado', cvrExpected: 'Variável', qualityNote: 'Indefinida' }
};

// FPS Segment benchmarks
const FPS_SEGMENTS: Record<string, { leadToMql: number; mqlToSql: number; sqlToOpp: number; oppToClose: number }> = {
  adtech: { leadToMql: 39, mqlToSql: 35, sqlToOpp: 40, oppToClose: 37 },
  automotive_saas: { leadToMql: 37, mqlToSql: 39, sqlToOpp: 44, oppToClose: 36 },
  crms: { leadToMql: 36, mqlToSql: 42, sqlToOpp: 48, oppToClose: 38 },
  chemical_pharmaceutical: { leadToMql: 47, mqlToSql: 46, sqlToOpp: 41, oppToClose: 39 },
  cybersecurity: { leadToMql: 44, mqlToSql: 38, sqlToOpp: 40, oppToClose: 39 },
  design: { leadToMql: 40, mqlToSql: 34, sqlToOpp: 45, oppToClose: 38 },
  edtech: { leadToMql: 46, mqlToSql: 35, sqlToOpp: 39, oppToClose: 40 },
  entertainment: { leadToMql: 41, mqlToSql: 39, sqlToOpp: 47, oppToClose: 43 },
  fintech: { leadToMql: 38, mqlToSql: 42, sqlToOpp: 48, oppToClose: 39 },
  hospitality: { leadToMql: 45, mqlToSql: 38, sqlToOpp: 38, oppToClose: 38 },
  industrial_iot: { leadToMql: 47, mqlToSql: 39, sqlToOpp: 42, oppToClose: 39 },
  insurance: { leadToMql: 40, mqlToSql: 28, sqlToOpp: 41, oppToClose: 37 },
  legaltech: { leadToMql: 41, mqlToSql: 40, sqlToOpp: 47, oppToClose: 42 },
  medtech: { leadToMql: 48, mqlToSql: 43, sqlToOpp: 41, oppToClose: 35 },
  project_management: { leadToMql: 46, mqlToSql: 37, sqlToOpp: 42, oppToClose: 35 },
  retail_ecommerce: { leadToMql: 41, mqlToSql: 36, sqlToOpp: 45, oppToClose: 39 },
  telecom: { leadToMql: 46, mqlToSql: 35, sqlToOpp: 41, oppToClose: 36 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      inputs, outputs, targets, impacts, rules, mode = 'compacto', 
      channel, formComplexity, investmentDensity, adjustedTargets,
      fpsSegment, fpsChannel, benchmarkMode, benchmarkProfile
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const maxActions = mode === 'compacto' ? 5 : 12;
    const channelData = CHANNEL_INFO[channel as keyof typeof CHANNEL_INFO] || CHANNEL_INFO.outro;
    
    // Build FPS benchmark context
    let benchmarkContext = '';
    if (benchmarkMode && (fpsSegment || fpsChannel)) {
      const segmentBench = fpsSegment ? FPS_SEGMENTS[fpsSegment] : null;
      if (segmentBench) {
        benchmarkContext = `
BENCHMARKS FPS (${fpsSegment}):
- Lead→MQL: ${segmentBench.leadToMql}%
- MQL→SQL: ${segmentBench.mqlToSql}%
- SQL→Reunião: ${segmentBench.sqlToOpp}%
- Reunião→Contrato: ${segmentBench.oppToClose}%
Compare as taxas atuais com estes benchmarks e indique se estão acima ou abaixo do mercado.`;
      }
    }

    const systemPrompt = `Você é um consultor Inside Sales especialista em funil B2B. Retorne APENAS JSON válido.

CONTEXTO DO CANAL: ${channelData.label} - ${channelData.description}
${benchmarkContext}

REGRAS:
- Ações: "Mídia" (CTR/CPC/CPL) ou "Processo" (conversões funil)
- Modo compacto: max 2 Mídia + 3 Processo
- Títulos: max 50 chars, next_step: max 80 chars
- Se etapa tem "baixa_amostra", não conclua sobre ela
- Inclua benchmark vs atual quando disponível

FORMATO JSON:
{
  "headline": "string (max 60 chars)",
  "confidence": "Baixa|Média|Alta",
  "context": {"segment":"${fpsSegment||''}","channel":"${fpsChannel||''}","benchmark_mode":${!!benchmarkMode}},
  "snapshot": [{"stage":"Lead→MQL","current":"29% (X/Y)","target":"25%","benchmark":"41%","gap_pp":4.0,"vs_bench_pp":-12,"eligible":true,"status":"OK"}],
  "bottlenecks": [{"stage":"string","reason":"string","impact_level":"Alto|Médio|Baixo"}],
  "actions": {"midia":[{"priority":"Alta","stage":"string","title":"string","next_step":"string","metric_to_watch":"string"}],"processo":[...]},
  "rules_used": ["rule_id"],
  "questions": ["string"]
}`;

    const userPrompt = `Funil: Leads ${inputs.leads||0}, MQL ${inputs.mql||0}, SQL ${inputs.sql||0}, Reuniões ${inputs.reunioes||0}, Contratos ${inputs.contratos||0}.

Taxas:
${impacts.map((i: any) => {
  const bench = benchmarkProfile?.[i.stageId === 'lead_to_mql' ? 'leadToMql' : i.stageId === 'mql_to_sql' ? 'mqlToSql' : i.stageId === 'sql_to_meeting' ? 'sqlToMeeting' : 'meetingToWin'];
  const benchStr = bench !== undefined ? ` [Bench: ${bench.toFixed(0)}%]` : '';
  return `${i.stageName}: ${i.current.rate?.toFixed(1)||0}% (meta ${i.target.rate}%)${benchStr} - ${i.status}`;
}).join('\n')}

Regras: ${rules.slice(0,6).map((r:any)=>`${r.stage}: ${r.action}`).join('; ')}

Gere JSON. Max ${maxActions} ações.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit - 429" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Payment required - 402" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid response");
    
    const analysis = JSON.parse(jsonMatch[0]);
    console.log("AI analysis with FPS benchmarks generated");
    
    return new Response(JSON.stringify(analysis), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Copilot v2 error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});