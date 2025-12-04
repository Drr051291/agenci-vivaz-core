// Tipos de atividades no infinitivo (ações)
export interface ActivityField {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface ActivityType {
  id: string;
  label: string;
  category: string;
  icon?: string;
  fields: ActivityField[];
  defaultStatus: string;
}

export const ACTIVITY_TYPES: ActivityType[] = [
  // Meta Ads
  {
    id: "criar_campanha_meta",
    label: "Criar campanha Meta Ads",
    category: "meta_ads",
    fields: [
      { key: "objetivo", label: "Objetivo", type: "select", required: true, options: [
        { value: "conversao", label: "Conversão" },
        { value: "trafego", label: "Tráfego" },
        { value: "engajamento", label: "Engajamento" },
        { value: "alcance", label: "Alcance" },
        { value: "leads", label: "Geração de Leads" },
        { value: "vendas", label: "Vendas" },
      ]},
      { key: "orcamento", label: "Orçamento Diário (R$)", type: "number", placeholder: "Ex: 50" },
      { key: "publico", label: "Público-alvo", type: "text", placeholder: "Ex: Mulheres 25-45 anos" },
    ],
    defaultStatus: "planejamento",
  },
  {
    id: "otimizar_campanha_meta",
    label: "Otimizar campanha Meta Ads",
    category: "meta_ads",
    fields: [
      { key: "campanha", label: "Nome da Campanha", type: "text", required: true },
      { key: "acao", label: "Tipo de Otimização", type: "select", options: [
        { value: "publico", label: "Ajustar Público" },
        { value: "criativo", label: "Trocar Criativo" },
        { value: "lance", label: "Ajustar Lance" },
        { value: "orcamento", label: "Ajustar Orçamento" },
      ]},
    ],
    defaultStatus: "em_analise",
  },
  // Google Ads
  {
    id: "criar_campanha_google",
    label: "Criar campanha Google Ads",
    category: "google_ads",
    fields: [
      { key: "tipo", label: "Tipo de Campanha", type: "select", required: true, options: [
        { value: "search", label: "Pesquisa" },
        { value: "display", label: "Display" },
        { value: "shopping", label: "Shopping" },
        { value: "video", label: "Vídeo (YouTube)" },
        { value: "pmax", label: "Performance Max" },
      ]},
      { key: "orcamento", label: "Orçamento Diário (R$)", type: "number", placeholder: "Ex: 100" },
      { key: "palavras_chave", label: "Palavras-chave principais", type: "textarea", placeholder: "Uma por linha" },
    ],
    defaultStatus: "planejamento",
  },
  {
    id: "otimizar_campanha_google",
    label: "Otimizar campanha Google Ads",
    category: "google_ads",
    fields: [
      { key: "campanha", label: "Nome da Campanha", type: "text", required: true },
      { key: "acao", label: "Tipo de Otimização", type: "select", options: [
        { value: "palavras", label: "Ajustar Palavras-chave" },
        { value: "lance", label: "Ajustar Lances" },
        { value: "anuncios", label: "Melhorar Anúncios" },
        { value: "extensoes", label: "Adicionar Extensões" },
      ]},
    ],
    defaultStatus: "em_analise",
  },
  // Email Marketing
  {
    id: "criar_email_marketing",
    label: "Criar email marketing",
    category: "email_marketing",
    fields: [
      { key: "tipo", label: "Tipo de Email", type: "select", required: true, options: [
        { value: "promocional", label: "Promocional" },
        { value: "newsletter", label: "Newsletter" },
        { value: "lancamento", label: "Lançamento" },
        { value: "nurturing", label: "Nutrição" },
        { value: "reativacao", label: "Reativação" },
      ]},
      { key: "assunto", label: "Assunto", type: "text", placeholder: "Linha de assunto do email" },
      { key: "lista", label: "Lista/Segmento", type: "text", placeholder: "Ex: Clientes ativos" },
    ],
    defaultStatus: "planejamento",
  },
  // Criativo
  {
    id: "criar_arte",
    label: "Criar arte/criativo",
    category: "criativo",
    fields: [
      { key: "formato", label: "Formato", type: "select", required: true, options: [
        { value: "feed", label: "Feed (1080x1080)" },
        { value: "stories", label: "Stories (1080x1920)" },
        { value: "carrossel", label: "Carrossel" },
        { value: "banner", label: "Banner" },
        { value: "video", label: "Vídeo" },
      ]},
      { key: "quantidade", label: "Quantidade", type: "number", placeholder: "Ex: 3" },
      { key: "briefing", label: "Briefing", type: "textarea", placeholder: "Descreva o que precisa" },
    ],
    defaultStatus: "briefing",
  },
  {
    id: "criar_video",
    label: "Criar vídeo",
    category: "criativo",
    fields: [
      { key: "duracao", label: "Duração", type: "select", options: [
        { value: "15s", label: "15 segundos" },
        { value: "30s", label: "30 segundos" },
        { value: "60s", label: "1 minuto" },
        { value: "outro", label: "Outro" },
      ]},
      { key: "formato", label: "Formato", type: "select", options: [
        { value: "reels", label: "Reels/Stories" },
        { value: "feed", label: "Feed" },
        { value: "youtube", label: "YouTube" },
      ]},
      { key: "briefing", label: "Briefing", type: "textarea", placeholder: "Descreva o vídeo" },
    ],
    defaultStatus: "briefing",
  },
  // Landing Page
  {
    id: "criar_landing_page",
    label: "Criar landing page",
    category: "landing_page",
    fields: [
      { key: "objetivo", label: "Objetivo", type: "select", required: true, options: [
        { value: "captura", label: "Captura de Leads" },
        { value: "vendas", label: "Vendas" },
        { value: "agendamento", label: "Agendamento" },
        { value: "download", label: "Download" },
      ]},
      { key: "url", label: "URL desejada", type: "text", placeholder: "Ex: /oferta-especial" },
    ],
    defaultStatus: "briefing",
  },
  // Setup/Configurações
  {
    id: "setup_ferramentas",
    label: "Setup de ferramentas",
    category: "ajuste",
    fields: [
      { key: "ferramenta", label: "Ferramenta", type: "select", required: true, options: [
        { value: "meta_pixel", label: "Meta Pixel" },
        { value: "google_tag", label: "Google Tag Manager" },
        { value: "ga4", label: "Google Analytics 4" },
        { value: "conversoes_api", label: "API de Conversões" },
        { value: "crm", label: "Integração CRM" },
        { value: "outro", label: "Outro" },
      ]},
      { key: "descricao", label: "Descrição", type: "textarea", placeholder: "O que precisa ser configurado" },
    ],
    defaultStatus: "solicitado",
  },
  {
    id: "configurar_tracking",
    label: "Configurar tracking/pixels",
    category: "ajuste",
    fields: [
      { key: "plataforma", label: "Plataforma", type: "select", options: [
        { value: "meta", label: "Meta (Facebook/Instagram)" },
        { value: "google", label: "Google" },
        { value: "tiktok", label: "TikTok" },
        { value: "linkedin", label: "LinkedIn" },
      ]},
      { key: "eventos", label: "Eventos a rastrear", type: "textarea", placeholder: "Ex: Compra, Lead, Visualização" },
    ],
    defaultStatus: "solicitado",
  },
  // SEO
  {
    id: "otimizar_seo",
    label: "Otimizar SEO",
    category: "seo",
    fields: [
      { key: "tipo", label: "Tipo", type: "select", options: [
        { value: "onpage", label: "On-Page" },
        { value: "tecnico", label: "Técnico" },
        { value: "conteudo", label: "Conteúdo" },
        { value: "local", label: "SEO Local" },
      ]},
      { key: "paginas", label: "Páginas", type: "textarea", placeholder: "URLs das páginas" },
    ],
    defaultStatus: "analise",
  },
  // Conteúdo
  {
    id: "criar_conteudo",
    label: "Criar conteúdo",
    category: "conteudo",
    fields: [
      { key: "tipo", label: "Tipo", type: "select", required: true, options: [
        { value: "post", label: "Post de Feed" },
        { value: "stories", label: "Stories" },
        { value: "blog", label: "Artigo de Blog" },
        { value: "roteiro", label: "Roteiro de Vídeo" },
      ]},
      { key: "quantidade", label: "Quantidade", type: "number", placeholder: "Ex: 5" },
      { key: "tema", label: "Tema/Pauta", type: "text", placeholder: "Sobre o que?" },
    ],
    defaultStatus: "briefing",
  },
  // Ajustes gerais
  {
    id: "solicitar_ajuste",
    label: "Solicitar ajuste",
    category: "ajuste",
    fields: [
      { key: "descricao", label: "O que precisa ajustar?", type: "textarea", required: true, placeholder: "Descreva o ajuste necessário" },
    ],
    defaultStatus: "solicitado",
  },
  // Outros
  {
    id: "outra_atividade",
    label: "Outra atividade",
    category: "outros",
    fields: [
      { key: "titulo", label: "Título", type: "text", required: true, placeholder: "Descreva a atividade" },
      { key: "descricao", label: "Descrição", type: "textarea", placeholder: "Detalhes" },
    ],
    defaultStatus: "pendente",
  },
];

// Agrupar por categoria para exibição
export const getActivityTypesByCategory = () => {
  const grouped: Record<string, ActivityType[]> = {};
  ACTIVITY_TYPES.forEach(type => {
    if (!grouped[type.category]) {
      grouped[type.category] = [];
    }
    grouped[type.category].push(type);
  });
  return grouped;
};

export const getActivityTypeById = (id: string) => {
  return ACTIVITY_TYPES.find(t => t.id === id);
};

// Categorias para label
export const CATEGORY_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  email_marketing: "Email Marketing",
  criativo: "Criativo",
  landing_page: "Landing Page",
  seo: "SEO",
  conteudo: "Conteúdo",
  ajuste: "Ajustes/Setup",
  outros: "Outros",
};
