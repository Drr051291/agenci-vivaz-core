import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Benchmarks por segmento de negócio (pesquisa consolidada 2024/2025)
const SEGMENTO_BENCHMARKS: Record<string, { 
  leadToMql: { min: number; max: number; medio: number }; 
  mqlToSql: { min: number; max: number; medio: number }; 
  sqlToContrato: { min: number; max: number; medio: number };
  cicloVendasDias: number;
  notas: string;
}> = {
  b2b_software: {
    leadToMql: { min: 25, max: 45, medio: 35 },
    mqlToSql: { min: 30, max: 50, medio: 40 },
    sqlToContrato: { min: 15, max: 30, medio: 22 },
    cicloVendasDias: 60,
    notas: 'Conversões dependem de trial/demo. Ciclo mais longo para enterprise.',
  },
  b2b_servicos: {
    leadToMql: { min: 20, max: 40, medio: 30 },
    mqlToSql: { min: 25, max: 45, medio: 35 },
    sqlToContrato: { min: 20, max: 35, medio: 27 },
    cicloVendasDias: 30,
    notas: 'Relacionamento e confiança são críticos. Propostas customizadas.',
  },
  b2b_consultoria: {
    leadToMql: { min: 30, max: 50, medio: 40 },
    mqlToSql: { min: 35, max: 55, medio: 45 },
    sqlToContrato: { min: 25, max: 40, medio: 32 },
    cicloVendasDias: 90,
    notas: 'Alto ticket, decisão complexa. Requer múltiplos stakeholders.',
  },
  b2b_industria: {
    leadToMql: { min: 35, max: 55, medio: 45 },
    mqlToSql: { min: 30, max: 50, medio: 40 },
    sqlToContrato: { min: 20, max: 35, medio: 28 },
    cicloVendasDias: 90,
    notas: 'Leads mais qualificados naturalmente. Decisão técnica + comercial.',
  },
  b2c_varejo: {
    leadToMql: { min: 15, max: 30, medio: 22 },
    mqlToSql: { min: 40, max: 65, medio: 52 },
    sqlToContrato: { min: 30, max: 50, medio: 40 },
    cicloVendasDias: 3,
    notas: 'Volume alto, decisão rápida. Foco em abandono e remarketing.',
  },
  b2c_servicos: {
    leadToMql: { min: 20, max: 40, medio: 30 },
    mqlToSql: { min: 35, max: 55, medio: 45 },
    sqlToContrato: { min: 35, max: 55, medio: 45 },
    cicloVendasDias: 7,
    notas: 'Decisão emocional. Urgência e conveniência são fatores-chave.',
  },
  b2c_educacao: {
    leadToMql: { min: 25, max: 50, medio: 38 },
    mqlToSql: { min: 30, max: 50, medio: 40 },
    sqlToContrato: { min: 20, max: 40, medio: 30 },
    cicloVendasDias: 21,
    notas: 'Sazonalidade forte. Proof of concept via conteúdo gratuito.',
  },
  b2b_saude: {
    leadToMql: { min: 35, max: 55, medio: 45 },
    mqlToSql: { min: 35, max: 50, medio: 42 },
    sqlToContrato: { min: 25, max: 40, medio: 32 },
    cicloVendasDias: 150,
    notas: 'Regulamentação afeta ciclo. Decisão por comitês técnicos.',
  },
  b2b_financeiro: {
    leadToMql: { min: 28, max: 48, medio: 38 },
    mqlToSql: { min: 35, max: 55, medio: 45 },
    sqlToContrato: { min: 25, max: 42, medio: 33 },
    cicloVendasDias: 60,
    notas: 'Compliance e segurança são críticos. Múltiplos decisores.',
  },
};

const SEGMENTO_LABELS: Record<string, string> = {
  b2b_software: 'B2B Software / SaaS',
  b2b_servicos: 'B2B Serviços',
  b2b_consultoria: 'B2B Consultoria',
  b2b_industria: 'B2B Indústria',
  b2c_varejo: 'B2C Varejo / E-commerce',
  b2c_servicos: 'B2C Serviços',
  b2c_educacao: 'B2C Educação',
  b2b_saude: 'B2B Saúde / Medtech',
  b2b_financeiro: 'B2B Financeiro / Fintech',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      inputs, outputs, targets, impacts, rules, mode = 'compacto', 
      segmentoNegocio, adjustedTargets,
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const maxActions = mode === 'compacto' ? 5 : 10;
    
    // Build benchmark context
    let benchmarkContext = '';
    const segmentoBench = segmentoNegocio ? SEGMENTO_BENCHMARKS[segmentoNegocio] : null;
    const segmentoLabel = segmentoNegocio ? SEGMENTO_LABELS[segmentoNegocio] : 'Não especificado';
    
    if (segmentoBench) {
      benchmarkContext = `
SEGMENTO: ${segmentoLabel}
BENCHMARKS DE MERCADO (faixas típicas):
- Lead→MQL: ${segmentoBench.leadToMql.min}-${segmentoBench.leadToMql.max}% (médio: ${segmentoBench.leadToMql.medio}%)
- MQL→SQL: ${segmentoBench.mqlToSql.min}-${segmentoBench.mqlToSql.max}% (médio: ${segmentoBench.mqlToSql.medio}%)
- SQL→Contrato: ${segmentoBench.sqlToContrato.min}-${segmentoBench.sqlToContrato.max}% (médio: ${segmentoBench.sqlToContrato.medio}%)
- Ciclo de vendas típico: ${segmentoBench.cicloVendasDias} dias
- Observações: ${segmentoBench.notas}

Compare as taxas atuais com esses benchmarks. Indique se estão dentro da faixa, acima ou abaixo.`;
    }

    const systemPrompt = `Você é um consultor especialista em Inside Sales e funis B2B/B2C. 
Analise os dados do funil (Leads → MQL → SQL → Contrato) e forneça diagnóstico e ações.

RETORNE APENAS JSON VÁLIDO, sem texto adicional.
${benchmarkContext}

REGRAS ESTRITAS:
1. Ações divididas em: "midia" (CTR/CPC/CPL/qualidade de tráfego) e "processo" (conversões do funil, SDR, follow-up)
2. Máximo ${maxActions} ações no total (2 mídia + 3 processo em modo compacto)
3. Títulos: máx 50 caracteres
4. next_step: máx 80 caracteres, ação específica e mensurável
5. Se etapa tem status "baixa_amostra" ou "sem_dados", NÃO conclua sobre ela
6. Base suas recomendações nas regras da matriz e nos benchmarks do segmento
7. Priorize ações com maior impacto potencial em contratos

ESTRUTURA DE RESPOSTA JSON:
{
  "headline": "string (máx 60 chars, conclusão principal)",
  "confidence": "Baixa|Média|Alta",
  "context": { "segmento": "${segmentoLabel}" },
  "snapshot": [
    { "stage": "Lead→MQL", "current": "29% (X/Y)", "target": "30%", "benchmark_range": "25-45%", "gap_pp": -1, "eligible": true, "status": "OK|Atenção|Crítico" }
  ],
  "bottlenecks": [
    { "stage": "string", "reason": "string (1 frase)", "impact_level": "Alto|Médio|Baixo" }
  ],
  "actions": {
    "midia": [
      { "priority": "Alta|Média", "stage": "Lead→MQL", "title": "string", "next_step": "string", "metric_to_watch": "CPL|CTR|CPC" }
    ],
    "processo": [
      { "priority": "Alta|Média", "stage": "MQL→SQL", "title": "string", "next_step": "string", "metric_to_watch": "MQL→SQL (%)" }
    ]
  },
  "rules_used": ["rule_id_1"],
  "questions": ["Pergunta de qualificação 1", "Pergunta 2"]
}`;

    const userPrompt = `FUNIL (Leads → MQL → SQL → Contrato):
- Leads: ${inputs.leads || 0}
- MQL: ${inputs.mql || 0}
- SQL: ${inputs.sql || 0}
- Contratos: ${inputs.contratos || 0}
- Investimento: R$ ${inputs.investimento || 0}

TAXAS ATUAIS vs METAS:
${impacts.map((i: any) => {
  const bench = segmentoBench ? (
    i.stageId === 'lead_to_mql' ? `${segmentoBench.leadToMql.min}-${segmentoBench.leadToMql.max}%` :
    i.stageId === 'mql_to_sql' ? `${segmentoBench.mqlToSql.min}-${segmentoBench.mqlToSql.max}%` :
    i.stageId === 'sql_to_win' ? `${segmentoBench.sqlToContrato.min}-${segmentoBench.sqlToContrato.max}%` : ''
  ) : '';
  const benchStr = bench ? ` [Benchmark: ${bench}]` : '';
  return `• ${i.stageName}: ${i.current.rate?.toFixed(1) || '—'}% (meta: ${i.target.rate}%)${benchStr} — Status: ${i.status}`;
}).join('\n')}

REGRAS DISPONÍVEIS:
${rules.slice(0, 8).map((r: any) => `- ${r.stage}: ${r.action}`).join('\n')}

Gere o JSON de análise. Máximo ${maxActions} ações.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      console.error(`AI API error: ${status}`);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns segundos." }), { 
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { 
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      throw new Error(`AI API error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Invalid AI response - no JSON found:", content.substring(0, 200));
      throw new Error("Resposta da IA inválida");
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    console.log("AI analysis generated for segment:", segmentoLabel);
    
    return new Response(JSON.stringify(analysis), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (error: unknown) {
    console.error("Copilot v2 error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro ao processar análise" 
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
