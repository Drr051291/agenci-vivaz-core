import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inputs, outputs, targets, impacts, rules } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um consultor especialista em Inside Sales e funis de vendas B2B.
Analise os dados do funil e gere um diagnóstico estruturado em JSON.

REGRAS:
- Seja conciso e prático
- Foque em ações imediatas
- Use os dados fornecidos, não invente métricas
- Priorize etapas com maior gap vs meta
- Referencie as regras da matriz quando aplicável

FORMATO DE RESPOSTA (JSON estrito):
{
  "headline": "frase curta resumindo situação",
  "summary_bullets": ["ponto 1", "ponto 2", "ponto 3"],
  "stage_analysis": [
    {
      "stage": "Lead→MQL | MQL→SQL | SQL→Reunião | Reunião→Contrato",
      "current": { "rate": number, "counts": "x/y" },
      "target": { "rate": number },
      "gap_pp": number,
      "impact_estimate": { "extra_contracts": number, "notes": "curto" },
      "bottleneck_reason": ["razão curta"],
      "recommended_actions": [{ "title": "ação", "why": "curto", "how": ["passo"], "metric_to_watch": "métrica" }]
    }
  ],
  "week_plan": [
    { "title": "ação", "stage": "etapa", "priority": "Alta|Média|Baixa", "steps": ["passo"], "expected_result": "curto" }
  ],
  "questions_to_fill_gaps": ["pergunta 1", "pergunta 2"]
}`;

    const userPrompt = `Dados do funil:
- Leads: ${inputs.leads || 0}
- MQL: ${inputs.mql || 0}
- SQL: ${inputs.sql || 0}
- Reuniões: ${inputs.reunioes || 0}
- Contratos: ${inputs.contratos || 0}
- Investimento: R$ ${inputs.investimento || 0}

Taxas atuais vs metas:
${impacts.map((i: any) => `- ${i.stageName}: ${i.current.rate?.toFixed(1) || 0}% (meta: ${i.target.rate}%) - Status: ${i.status}`).join('\n')}

Regras da matriz aplicáveis:
${rules.slice(0, 10).map((r: any) => `- ${r.stage}: ${r.situation} → ${r.action}`).join('\n')}

Gere o diagnóstico em JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required - 402" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid AI response format");
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Copilot error:", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
