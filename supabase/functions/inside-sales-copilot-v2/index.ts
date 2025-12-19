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
    const { inputs, outputs, targets, impacts, rules, mode = 'compacto' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const maxActions = mode === 'compacto' ? 5 : 12;

    const systemPrompt = `Você é um consultor Inside Sales. Retorne APENAS JSON válido (sem texto extra).

REGRAS:
- Ações devem ser classificadas: "Mídia" (CTR/CPC/CPL/CVR) ou "Processo" (conversões MQL→SQL→Reunião→Contrato)
- No modo compacto: max 2 Mídia + 3 Processo
- Seja conciso: títulos max 50 chars, next_step max 80 chars
- Priorize gargalos com maior gap

FORMATO:
{
  "headline": "string (max 60 chars)",
  "confidence": "Baixa|Média|Alta",
  "snapshot": [{"stage":"Lead→MQL","current":"29%","target":"25%","gap_pp":4.0,"status":"OK"}],
  "top_bottlenecks": [{"stage":"string","why":"string (curto)","impact":"Alto|Médio|Baixo","gap_pp":-5.0}],
  "actions": [{"type":"Mídia|Processo","stage":"string","title":"string","next_step":"string","metric_to_watch":"string","priority":"Alta|Média|Baixa"}],
  "questions": ["string","string","string"]
}`;

    const userPrompt = `Funil: Leads ${inputs.leads||0}, MQL ${inputs.mql||0}, SQL ${inputs.sql||0}, Reuniões ${inputs.reunioes||0}, Contratos ${inputs.contratos||0}. Investimento: R$${inputs.investimento||0}.

Taxas vs metas:
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
