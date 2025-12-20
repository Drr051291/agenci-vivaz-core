import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Channel benchmarks for context
const CHANNEL_INFO = {
  landing: {
    label: 'Landing Page',
    description: 'Menor conversão clique→lead (~4-6%), porém leads mais qualificados devido à fricção do processo',
    cvrExpected: '4-6%',
    cplNote: 'CPL ~30% maior que média',
    qualityNote: 'Alta qualidade - usuário demonstra interesse ativo'
  },
  lead_nativo: {
    label: 'Lead Nativo (Formulário na plataforma)',
    description: 'Alta conversão (~10-20%), qualidade depende da complexidade do formulário',
    cvrExpected: '10-20%',
    cplNote: 'CPL ~30% menor que landing',
    qualityNote: 'Qualidade variável - poucas perguntas = mais leads, menor qualificação'
  },
  whatsapp: {
    label: 'WhatsApp (Click-to-Chat)',
    description: 'Maior conversão inicial (~25-50%), mas requer qualificação ativa via atendimento',
    cvrExpected: '25-50%',
    cplNote: 'CPL ~50% menor',
    qualityNote: 'Baixa qualificação inicial - necessita automação/SDR para filtrar'
  },
  outro: {
    label: 'Outro',
    description: 'Canal não especificado',
    cvrExpected: 'Variável',
    cplNote: 'Benchmark padrão',
    qualityNote: 'Qualidade indefinida'
  }
};

const FORM_COMPLEXITY_INFO = {
  poucas: 'Formulário simples (nome, email, telefone) - Volume alto, qualificação baixa (~15% Lead→MQL)',
  muitas: 'Formulário extenso (+5 campos) - Volume menor, qualificação média (~25% Lead→MQL)',
  certas: 'Formulário qualificador (budget, decisor, timeline) - Volume baixo, alta qualificação (~35% Lead→MQL)'
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inputs, outputs, targets, impacts, rules, mode = 'compacto', channel, formComplexity, investmentDensity, adjustedTargets } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const maxActions = mode === 'compacto' ? 5 : 12;
    
    // Build channel context
    const channelData = CHANNEL_INFO[channel as keyof typeof CHANNEL_INFO] || CHANNEL_INFO.outro;
    const formContext = channel === 'lead_nativo' && formComplexity 
      ? `\nComplexidade do formulário: ${FORM_COMPLEXITY_INFO[formComplexity as keyof typeof FORM_COMPLEXITY_INFO]}`
      : '';
    
    // Investment density context
    const densityContext = investmentDensity 
      ? `\nDensidade do investimento: R$ ${investmentDensity.dailyInvestment?.toFixed(0) || 0}/dia (${investmentDensity.level || 'indefinido'})${investmentDensity.warning ? ` - ${investmentDensity.warning}` : ''}`
      : '';

    const systemPrompt = `Você é um consultor Inside Sales especialista em mídia paga e funil de vendas B2B. Retorne APENAS JSON válido (sem texto extra).

CONTEXTO DO CANAL DE CONVERSÃO:
Canal: ${channelData.label}
Característica: ${channelData.description}
CVR clique→lead esperado: ${channelData.cvrExpected}
CPL: ${channelData.cplNote}
Qualidade: ${channelData.qualityNote}${formContext}${densityContext}

REGRAS DE ANÁLISE:
- Considere as características do canal ao avaliar as taxas de conversão
- Para Landing Page: foque em otimização de página e CTAs
- Para Lead Nativo: recomende ajustes nas perguntas do formulário se Lead→MQL estiver baixo
- Para WhatsApp: sugira automações e scripts de qualificação
- Ações devem ser classificadas: "Mídia" (CTR/CPC/CPL/CVR) ou "Processo" (conversões MQL→SQL→Reunião→Contrato)
- No modo compacto: max 2 Mídia + 3 Processo
- Seja conciso: títulos max 50 chars, next_step max 80 chars
- Priorize gargalos com maior gap considerando o benchmark do canal

FORMATO:
{
  "headline": "string (max 60 chars)",
  "confidence": "Baixa|Média|Alta",
  "snapshot": [{"stage":"Lead→MQL","current":"29%","target":"25%","gap_pp":4.0,"status":"OK"}],
  "top_bottlenecks": [{"stage":"string","why":"string (curto)","impact":"Alto|Médio|Baixo","gap_pp":-5.0}],
  "actions": [{"type":"Mídia|Processo","stage":"string","title":"string","next_step":"string","metric_to_watch":"string","priority":"Alta|Média|Baixa"}],
  "questions": ["string","string","string"]
}`;

    // Include adjusted targets if available
    const targetsInfo = adjustedTargets 
      ? `\nMetas ajustadas para o canal: CVR clique→lead: ${adjustedTargets.cvrClickLead?.value || 'N/A'}%, CPL: R$ ${adjustedTargets.cpl?.value?.toFixed(2) || 'N/A'}`
      : '';

    const userPrompt = `Funil: Leads ${inputs.leads||0}, MQL ${inputs.mql||0}, SQL ${inputs.sql||0}, Reuniões ${inputs.reunioes||0}, Contratos ${inputs.contratos||0}. Investimento: R$${inputs.investimento||0}.${targetsInfo}

Taxas vs metas (ajustadas para o canal ${channelData.label}):
${impacts.map((i: any) => `${i.stageName}: ${i.current.rate?.toFixed(1)||0}% (meta ${i.target.rate}%) - ${i.status}`).join('\n')}

Regras: ${rules.slice(0,8).map((r:any)=>`${r.stage}: ${r.action}`).join('; ')}

Gere o JSON. Max ${maxActions} ações total.`;

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
    console.log("AI analysis generated successfully");
    
    return new Response(JSON.stringify(analysis), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Copilot v2 error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
