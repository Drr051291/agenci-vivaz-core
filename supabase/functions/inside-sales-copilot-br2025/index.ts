import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// BR 2025 Benchmarks embedded
const BR2025_BENCHMARKS = {
  conversaoGeral: { B2B: 2.50, B2C: 3.28 },
  segmentos: {
    consultoria: { conversao: 1.55, ciclo: 90, notas: 'LP superior vs Lead Nativo' },
    ti_software_b2b: { conversao: 2.06, ciclo: 60, notas: 'CRM integrado ~70%' },
    industria_fabricacao: { conversao: 3.81, ciclo: 90, notas: 'Leads qualificados naturalmente' },
    servicos_juridicos: { conversao: 5.9, ciclo: 30, notas: 'Topo de funil forte' },
    servicos_profissionais_saas: { conversao: 11, ciclo: 45, notas: 'SDR qualifica bem' },
  },
  midia: {
    linkedin_ads: { cpl: '150-400', leadToSql: '20-35%' },
    google_ads: { cpl: '80-250', conversaoB2C: 5.18 },
    meta_ads: { cpl: '50-95', notas: 'Exige nutrição' },
  },
  insideSales: { speedToLead: 5, showRate: 80, cicloMedio: 69 },
  whatsapp: { comCrm: 3.12, semCrm: 2.52 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inputs, outputs, impacts, rules, br2025Context, mode = 'compacto' } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { mercado, segmento, canal, captura, whatsappCrm } = br2025Context || {};
    
    // Build benchmark context
    const benchContext = [];
    if (mercado) benchContext.push(`Mercado: ${mercado} (BR 2025: ${BR2025_BENCHMARKS.conversaoGeral[mercado as keyof typeof BR2025_BENCHMARKS.conversaoGeral]}%)`);
    if (segmento && BR2025_BENCHMARKS.segmentos[segmento as keyof typeof BR2025_BENCHMARKS.segmentos]) {
      const seg = BR2025_BENCHMARKS.segmentos[segmento as keyof typeof BR2025_BENCHMARKS.segmentos];
      benchContext.push(`Segmento: conversão ${seg.conversao}%, ciclo ${seg.ciclo} dias. ${seg.notas}`);
    }
    if (canal && BR2025_BENCHMARKS.midia[canal as keyof typeof BR2025_BENCHMARKS.midia]) {
      const ch = BR2025_BENCHMARKS.midia[canal as keyof typeof BR2025_BENCHMARKS.midia];
      benchContext.push(`Canal: CPL R$ ${ch.cpl}`);
    }
    if (whatsappCrm !== undefined) {
      benchContext.push(`WhatsApp CRM: ${whatsappCrm ? 'Sim (3.12%)' : 'Não (2.52%)'}`);
    }

    const systemPrompt = `Você é consultor de Inside Sales BR 2025. Analise o funil e gere plano de ação estruturado.

CONTEXTO BR 2025:
${benchContext.join('\n') || 'Sem contexto específico'}
- Speed-to-lead ideal: <${BR2025_BENCHMARKS.insideSales.speedToLead} min
- Show rate saudável: >${BR2025_BENCHMARKS.insideSales.showRate}%
- Ciclo alto ticket: ${BR2025_BENCHMARKS.insideSales.cicloMedio} dias

REGRAS ESTRITAS:
1. Retorne APENAS JSON válido
2. Ações divididas em "midia" (array) e "processo" (array) - SEMPRE arrays
3. Máx 2 ações mídia + 3 processo
4. Títulos: máx 50 chars
5. next_step: máx 80 chars, ação específica
6. Ignore etapas com status "baixa_amostra" ou "sem_dados"
7. Base recomendações nos benchmarks BR 2025

ESTRUTURA JSON:
{
  "headline": "string (máx 60 chars)",
  "confidence": "Alta|Média|Baixa",
  "bench_context": {
    "mercado": "${mercado || 'N/A'}",
    "segmento": "${segmento || 'N/A'}",
    "canal": "${canal || 'N/A'}",
    "captura": "${captura || 'N/A'}",
    "whatsapp_crm": ${whatsappCrm ?? null}
  },
  "snapshot": [
    {"stage":"Lead→MQL","current":"X%","target":"Y%","benchmark":"Z%","gap_pp":number,"eligible":boolean,"status":"OK|Atenção|Crítico"}
  ],
  "bottlenecks": [
    {"stage":"string","why":"1 frase","bench_hint":"referência BR 2025"}
  ],
  "actions": {
    "midia": [
      {"priority":"Alta|Média","stage":"string","title":"string","next_step":"string","metric_to_watch":"string"}
    ],
    "processo": [
      {"priority":"Alta|Média","stage":"string","title":"string","next_step":"string","metric_to_watch":"string"}
    ]
  },
  "questions": ["string (máx 3)"]
}`;

    const userPrompt = `FUNIL:
- Leads: ${inputs.leads || 0}
- MQL: ${inputs.mql || 0}
- SQL: ${inputs.sql || 0}
- Contratos: ${inputs.contratos || 0}
- Investimento: R$ ${inputs.investimento || 0}
${inputs.ttft ? `- TTFT: ${inputs.ttft} min` : ''}

TAXAS vs METAS:
${impacts.map((i: any) => 
  `• ${i.stageName}: ${i.current.rate?.toFixed(1) || '—'}% (meta: ${i.target.rate}%) — ${i.status}${i.isEligible ? '' : ' [INELEGÍVEL]'}`
).join('\n')}

Gere o JSON de análise BR 2025.`;

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
        return new Response(JSON.stringify({ error: "Rate limit excedido." }), { 
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados." }), { 
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      throw new Error(`AI API error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Invalid AI response:", content.substring(0, 200));
      throw new Error("Resposta da IA inválida");
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    // Ensure actions are arrays
    if (analysis.actions) {
      if (!Array.isArray(analysis.actions.midia)) {
        analysis.actions.midia = analysis.actions.midia ? [analysis.actions.midia] : [];
      }
      if (!Array.isArray(analysis.actions.processo)) {
        analysis.actions.processo = analysis.actions.processo ? [analysis.actions.processo] : [];
      }
    }
    
    console.log("BR 2025 analysis generated:", mercado, segmento);
    
    return new Response(JSON.stringify(analysis), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (error: unknown) {
    console.error("Copilot BR2025 error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro ao processar" 
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
