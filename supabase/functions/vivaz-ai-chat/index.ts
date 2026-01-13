import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
  clientId: string;
  sessionId?: string;
  message: string;
  quickAction?: 'relatorio_mensal' | 'analisar_gargalos' | 'sugestao_melhoria';
  contextOptions?: {
    includePerformanceMatrix: boolean;
    includeMeetings: boolean;
    meetingCount?: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing env vars");
      return new Response(JSON.stringify({ error: "Configuração incompleta" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { clientId, sessionId, message, quickAction, contextOptions } = await req.json() as ChatRequest;

    if (!clientId || !message) {
      return new Response(JSON.stringify({ error: "clientId e message são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch client info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, company_name, segment, sales_channels, notes')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error("Client not found:", clientError);
      return new Response(JSON.stringify({ error: "Cliente não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context from various sources
    const contextParts: string[] = [];
    const sources: { type: string; name: string; reference?: string }[] = [];

    // Add client basic info
    contextParts.push(`## Cliente: ${client.company_name}
- Segmento: ${client.segment || 'Não especificado'}
- Canais de Venda: ${client.sales_channels?.join(', ') || 'Não especificado'}
- Notas: ${client.notes || 'Nenhuma'}`);
    sources.push({ type: 'system', name: 'Dados do Cliente' });

    // Fetch Performance Matrix data if requested
    if (contextOptions?.includePerformanceMatrix !== false) {
      const { data: perfEntries } = await supabase
        .from('performance_matrix_diagnostics')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (perfEntries && perfEntries.length > 0) {
        const latestPerf = perfEntries[0];
        const inputs = latestPerf.inputs as Record<string, number | undefined>;
        const outputs = latestPerf.outputs as Record<string, number | undefined>;
        
        contextParts.push(`## Matriz de Performance (${latestPerf.name || 'Última análise'})
**Setor:** ${latestPerf.setor}

**Dados do Funil:**
- Leads: ${inputs?.leads || 'N/A'}
- MQL: ${inputs?.mql || 'N/A'}
- SQL: ${inputs?.sql || 'N/A'}
- Oportunidades: ${inputs?.oportunidades || 'N/A'}
- Contratos: ${inputs?.contratos || 'N/A'}
- Investimento: R$ ${inputs?.investimento?.toLocaleString('pt-BR') || 'N/A'}
- Receita: R$ ${inputs?.receita?.toLocaleString('pt-BR') || 'N/A'}
- Ticket Médio: R$ ${inputs?.ticketMedio?.toLocaleString('pt-BR') || 'N/A'}

**Métricas Calculadas:**
- CPL: R$ ${typeof outputs?.cpl === 'number' ? outputs.cpl.toFixed(2) : 'N/A'}
- CAC: R$ ${typeof outputs?.cac === 'number' ? outputs.cac.toFixed(2) : 'N/A'}
- ROI: ${typeof outputs?.roi === 'number' ? outputs.roi.toFixed(1) + '%' : 'N/A'}
- Conversão Global: ${typeof outputs?.conversaoGlobal === 'number' ? outputs.conversaoGlobal.toFixed(2) + '%' : 'N/A'}
- Velocidade de Vendas: ${typeof outputs?.velocidadeVendas === 'number' ? 'R$ ' + outputs.velocidadeVendas.toFixed(2) + '/dia' : 'N/A'}`);

        sources.push({ type: 'system_metric', name: 'Matriz de Performance', reference: latestPerf.id });
      }
    }

    // Fetch meetings if requested
    if (contextOptions?.includeMeetings !== false) {
      const meetingCount = contextOptions?.meetingCount || 5;
      const { data: meetings } = await supabase
        .from('meeting_minutes')
        .select('id, title, meeting_date, content, action_items, next_period_priority')
        .eq('client_id', clientId)
        .order('meeting_date', { ascending: false })
        .limit(meetingCount);

      if (meetings && meetings.length > 0) {
        const meetingsSummary = meetings.map((m) => {
          const actionItems = m.action_items?.length ? `\n  - Ações: ${m.action_items.slice(0, 3).join('; ')}` : '';
          const priority = m.next_period_priority ? `\n  - Prioridade: ${m.next_period_priority}` : '';
          return `• ${m.title} (${new Date(m.meeting_date).toLocaleDateString('pt-BR')})${actionItems}${priority}`;
        }).join('\n');

        contextParts.push(`## Últimas Reuniões
${meetingsSummary}`);
        sources.push({ type: 'meeting', name: 'Reuniões', reference: `${meetings.length} reuniões` });
      }
    }

    // Fetch knowledge base entries
    const { data: kbEntries } = await supabase
      .from('ai_knowledge_base')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    // Extract agent context if exists
    let agentContextData: Record<string, string> | null = null;
    
    if (kbEntries && kbEntries.length > 0) {
      for (const entry of kbEntries) {
        // Check if this is the agent context entry
        if (entry.source_type === 'agent_context') {
          agentContextData = entry.metadata as Record<string, string>;
          continue; // Don't add to regular context parts
        }
        
        // Truncate content to avoid token limits
        const content = entry.content_text.length > 2000 
          ? entry.content_text.substring(0, 2000) + '...'
          : entry.content_text;
        
        contextParts.push(`## ${entry.source_name} (${entry.source_type})
${content}`);
        sources.push({ type: entry.source_type, name: entry.source_name, reference: entry.source_reference || undefined });
      }
    }

    // Fetch previous messages if session exists
    let conversationHistory: { role: string; content: string }[] = [];
    if (sessionId) {
      const { data: messages } = await supabase
        .from('ai_chat_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (messages) {
        conversationHistory = messages.map(m => ({ role: m.role, content: m.content }));
      }
    }

    // Build quick action prompts
    let actionPrompt = '';
    if (quickAction === 'relatorio_mensal') {
      actionPrompt = `AÇÃO: Gere um relatório mensal executivo resumindo:
1. Performance do funil de vendas
2. Principais insights das reuniões recentes
3. Métricas-chave (CPL, CAC, ROI)
4. Recomendações para o próximo período

Use formatação Markdown com tabelas quando apropriado.`;
    } else if (quickAction === 'analisar_gargalos') {
      actionPrompt = `AÇÃO: Analise os gargalos do funil de vendas:
1. Identifique as etapas com menor conversão
2. Compare com benchmarks do setor
3. Sugira ações específicas para cada gargalo
4. Priorize as ações por impacto potencial`;
    } else if (quickAction === 'sugestao_melhoria') {
      actionPrompt = `AÇÃO: Com base nos dados disponíveis, sugira melhorias:
1. Otimizações de conversão
2. Ajustes em scripts ou processos
3. Oportunidades de aumento de ticket
4. Ações de curto prazo (próximos 30 dias)`;
    }

    // Build agent personality based on context
    let agentPersonality = `Você é o Vivaz AI, um consultor sênior de marketing e vendas especializado em Inside Sales, E-commerce e Performance Digital.

PERSONALIDADE:
- Direto e prático, focado em ações concretas
- Usa dados para embasar recomendações
- Menciona fontes quando possível (ex: "Com base na reunião de 12/01...")
- Estrutura respostas com Markdown (títulos, bullets, tabelas)`;

    // Customize based on agent context
    if (agentContextData) {
      const businessStage = agentContextData.businessStage || 'growing';
      const agentTone = agentContextData.agentTone || 'strategic';
      const mainGoals = agentContextData.mainGoals;
      const challenges = agentContextData.challenges;
      const customInstructions = agentContextData.customInstructions;
      
      const stageDescriptions: Record<string, string> = {
        'validating': 'A empresa está em fase de validação, testando product-market fit. Foque em aprendizado rápido e iterações.',
        'growing': 'A empresa está em crescimento, buscando escalar aquisição. Foque em otimização de canais e escalabilidade.',
        'scaling': 'A empresa está em fase de escala, otimizando operações. Foque em eficiência, automação e processos.',
        'mature': 'A empresa está madura, focando em retenção e LTV. Priorize estratégias de fidelização e upsell.',
      };
      
      const toneDescriptions: Record<string, string> = {
        'strategic': 'Tenha uma abordagem estratégica e de longo prazo. Conecte recomendações a objetivos maiores.',
        'tactical': 'Seja tático e prático. Foque em ações imediatas e resultados de curto prazo.',
        'analytical': 'Seja altamente analítico. Use números, tabelas e comparações sempre que possível.',
        'creative': 'Seja criativo e inovador. Sugira abordagens não convencionais e experimentos.',
      };
      
      agentPersonality += `

CONTEXTO ESTRATÉGICO DO CLIENTE:
- Estágio do Negócio: ${stageDescriptions[businessStage] || stageDescriptions['growing']}
- Tom das Respostas: ${toneDescriptions[agentTone] || toneDescriptions['strategic']}`;

      if (mainGoals) {
        agentPersonality += `
- Objetivos Principais: ${mainGoals}`;
      }
      if (challenges) {
        agentPersonality += `
- Desafios Atuais: ${challenges}`;
      }
      if (customInstructions) {
        agentPersonality += `

INSTRUÇÕES ADICIONAIS:
${customInstructions}`;
      }
    }

    const systemPrompt = `${agentPersonality}

CONTEXTO DO CLIENTE:
${contextParts.join('\n\n')}

REGRAS:
1. Se não houver dados suficientes, peça ao usuário para carregar informações específicas
2. Cite as fontes ao fazer afirmações baseadas em dados
3. Use tabelas Markdown para comparações numéricas
4. Mantenha respostas objetivas e acionáveis
5. Para métricas, sempre contextualize com benchmarks quando possível

${actionPrompt}`;

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: message }
    ];

    // Call Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${LOVABLE_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      console.error(`AI API error: ${status}`);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns minutos." }), { 
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

    // Return streaming response with sources encoded in Base64 to avoid non-ASCII issues in headers
    const sourcesBase64 = btoa(encodeURIComponent(JSON.stringify(sources)));
    return new Response(response.body, { 
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/event-stream",
        "X-AI-Sources": sourcesBase64,
      } 
    });

  } catch (error: unknown) {
    console.error("Vivaz AI Chat error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro ao processar" 
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
