// Categorias pré-definidas de atividades
export const TASK_CATEGORIES = {
  campanhas: "Campanhas",
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  criativo: "Criativo",
  landing_page: "Landing Page",
  ajuste: "Ajuste",
  seo: "SEO",
  email_marketing: "Email Marketing",
  conteudo: "Conteúdo",
  outros: "Outros",
} as const;

export type TaskCategory = keyof typeof TASK_CATEGORIES;

// Status personalizados por categoria (sempre começando com Pendente)
export const CATEGORY_STATUS = {
  campanhas: [
    { value: "pendente", label: "Pendente" },
    { value: "planejamento", label: "Planejamento" },
    { value: "configuracao", label: "Configuração" },
    { value: "ativa", label: "Ativa" },
    { value: "pausada", label: "Pausada" },
    { value: "encerrada", label: "Encerrada" },
  ],
  meta_ads: [
    { value: "pendente", label: "Pendente" },
    { value: "planejamento", label: "Planejamento" },
    { value: "criacao", label: "Criação" },
    { value: "aguardando_aprovacao", label: "Aguardando Aprovação" },
    { value: "ativa", label: "Ativa" },
    { value: "pausada", label: "Pausada" },
    { value: "finalizada", label: "Finalizada" },
  ],
  google_ads: [
    { value: "pendente", label: "Pendente" },
    { value: "planejamento", label: "Planejamento" },
    { value: "criacao", label: "Criação" },
    { value: "aguardando_aprovacao", label: "Aguardando Aprovação" },
    { value: "ativa", label: "Ativa" },
    { value: "pausada", label: "Pausada" },
    { value: "finalizada", label: "Finalizada" },
  ],
  criativo: [
    { value: "pendente", label: "Pendente" },
    { value: "briefing", label: "Briefing" },
    { value: "criacao", label: "Criação" },
    { value: "revisao", label: "Revisão" },
    { value: "ajustes", label: "Ajustes" },
    { value: "aprovado", label: "Aprovado" },
    { value: "entregue", label: "Entregue" },
  ],
  landing_page: [
    { value: "pendente", label: "Pendente" },
    { value: "briefing", label: "Briefing" },
    { value: "desenvolvimento", label: "Desenvolvimento" },
    { value: "revisao", label: "Revisão" },
    { value: "ajustes", label: "Ajustes" },
    { value: "publicada", label: "Publicada" },
  ],
  ajuste: [
    { value: "pendente", label: "Pendente" },
    { value: "solicitado", label: "Solicitado" },
    { value: "em_analise", label: "Em Análise" },
    { value: "em_execucao", label: "Em Execução" },
    { value: "concluido", label: "Concluído" },
  ],
  seo: [
    { value: "pendente", label: "Pendente" },
    { value: "analise", label: "Análise" },
    { value: "planejamento", label: "Planejamento" },
    { value: "execucao", label: "Execução" },
    { value: "monitoramento", label: "Monitoramento" },
    { value: "concluido", label: "Concluído" },
  ],
  email_marketing: [
    { value: "pendente", label: "Pendente" },
    { value: "planejamento", label: "Planejamento" },
    { value: "criacao", label: "Criação" },
    { value: "revisao", label: "Revisão" },
    { value: "agendado", label: "Agendado" },
    { value: "enviado", label: "Enviado" },
  ],
  conteudo: [
    { value: "pendente", label: "Pendente" },
    { value: "briefing", label: "Briefing" },
    { value: "producao", label: "Produção" },
    { value: "revisao", label: "Revisão" },
    { value: "aprovado", label: "Aprovado" },
    { value: "publicado", label: "Publicado" },
  ],
  outros: [
    { value: "pendente", label: "Pendente" },
    { value: "em_andamento", label: "Em Andamento" },
    { value: "concluido", label: "Concluído" },
  ],
} as const;

export const getCategoryStatuses = (category: TaskCategory) => {
  return CATEGORY_STATUS[category] || CATEGORY_STATUS.outros;
};

export const getStatusLabel = (category: TaskCategory, status: string) => {
  const statuses = getCategoryStatuses(category);
  return statuses.find(s => s.value === status)?.label || status;
};

export const getStatusColor = (status: string) => {
  // Cores baseadas em palavras-chave no status
  if (status.includes("aprovado") || status.includes("concluido") || status.includes("entregue") || status.includes("publicado") || status.includes("enviado")) {
    return "bg-green-500/10 text-green-600 border-green-500/20";
  }
  if (status.includes("revisao") || status.includes("aguardando") || status.includes("analise")) {
    return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
  }
  if (status.includes("ativa") || status.includes("execucao") || status.includes("criacao") || status.includes("desenvolvimento") || status.includes("producao")) {
    return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  }
  if (status.includes("pausada") || status.includes("encerrada") || status.includes("finalizada")) {
    return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  }
  return "bg-purple-500/10 text-purple-600 border-purple-500/20";
};

export const getPriorityColor = (priority: string) => {
  const colors = {
    low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    urgent: "bg-red-500/10 text-red-600 border-red-500/20",
  };
  return colors[priority as keyof typeof colors] || colors.medium;
};

export const getPriorityLabel = (priority: string) => {
  const labels = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    urgent: "Urgente",
  };
  return labels[priority as keyof typeof labels] || priority;
};