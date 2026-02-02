import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Copy, 
  MessageSquare, 
  Mail, 
  Linkedin,
  UserPlus,
  Calendar,
  RefreshCcw,
  XCircle,
  Lightbulb,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Template {
  id: string;
  title: string;
  channel: 'whatsapp' | 'linkedin' | 'email';
  category: 'abordagem' | 'confirmacao' | 'followup' | 'perdido';
  content: string;
  guidance: {
    approach: string;
    tone: string;
    questions: string[];
    doNot: string[];
  };
}

const TEMPLATES: Template[] = [
  // WHATSAPP TEMPLATES
  {
    id: 'wa-abordagem-1',
    title: 'Primeira Abordagem',
    channel: 'whatsapp',
    category: 'abordagem',
    content: `Olá, [NOME]! Tudo bem?

Sou [SEU NOME] da [EMPRESA]. Vi que você demonstrou interesse em [ASSUNTO/PRODUTO].

Posso te ajudar com mais informações?`,
    guidance: {
      approach: 'Seja direto e cordial. Mencione a origem do contato para criar contexto.',
      tone: 'Amigável e profissional. Evite formalidade excessiva no WhatsApp.',
      questions: [
        'Qual é o principal desafio que você está enfrentando?',
        'O que te motivou a buscar essa solução?',
        'Você já utiliza alguma ferramenta similar?',
      ],
      doNot: [
        'Enviar mensagens longas demais',
        'Usar áudios na primeira mensagem',
        'Pressionar por resposta imediata',
      ],
    },
  },
  {
    id: 'wa-confirmacao-1',
    title: 'Confirmação de Reunião',
    channel: 'whatsapp',
    category: 'confirmacao',
    content: `Olá, [NOME]!

Confirmando nossa reunião para [DATA] às [HORÁRIO].

O link de acesso é: [LINK]

Alguma dúvida antes do nosso papo?`,
    guidance: {
      approach: 'Envie 24h antes e novamente 1h antes da reunião.',
      tone: 'Objetivo e prestativo. Mostre que está preparado.',
      questions: [
        'Há algo específico que gostaria de abordar na reunião?',
        'Teremos mais alguém participando?',
      ],
      doNot: [
        'Esquecer de incluir o link',
        'Enviar muito em cima da hora',
        'Parecer inseguro sobre o agendamento',
      ],
    },
  },
  {
    id: 'wa-followup-1',
    title: 'Follow-up Pós Reunião',
    channel: 'whatsapp',
    category: 'followup',
    content: `Oi, [NOME]!

Foi ótimo conversar com você hoje. Como combinamos, segue o resumo:

✅ [PONTO 1]
✅ [PONTO 2]
✅ Próximo passo: [AÇÃO]

Qualquer dúvida, estou por aqui!`,
    guidance: {
      approach: 'Envie no mesmo dia da reunião, preferencialmente dentro de 2 horas.',
      tone: 'Entusiasmado mas profissional. Reforce os acordos.',
      questions: [
        'Conseguiu validar internamente os pontos que discutimos?',
        'Precisa de algum material adicional?',
      ],
      doNot: [
        'Demorar mais de 24h para enviar',
        'Esquecer de recapitular os próximos passos',
        'Assumir que o deal está fechado',
      ],
    },
  },
  {
    id: 'wa-perdido-1',
    title: 'Recuperação de Lead',
    channel: 'whatsapp',
    category: 'perdido',
    content: `Oi, [NOME]! Tudo bem?

Faz um tempo que não conversamos. Entendo que o momento pode não ter sido ideal.

Gostaria de saber se algo mudou do seu lado ou se posso ajudar de alguma forma.`,
    guidance: {
      approach: 'Seja genuíno e sem pressão. Foque em reabrir o diálogo.',
      tone: 'Empático e não invasivo. Demonstre que respeita a decisão.',
      questions: [
        'O que fez você optar por não seguir naquele momento?',
        'Houve alguma mudança no cenário da empresa?',
      ],
      doNot: [
        'Parecer desesperado',
        'Criticar a decisão anterior',
        'Fazer promessas exageradas',
      ],
    },
  },
  // LINKEDIN TEMPLATES
  {
    id: 'li-abordagem-1',
    title: 'Conexão Inicial',
    channel: 'linkedin',
    category: 'abordagem',
    content: `Olá, [NOME]!

Vi seu perfil e achei interessante sua atuação em [ÁREA/EMPRESA]. 

Trabalho com [SUA ÁREA] e acredito que podemos trocar experiências.

Aceita conectar?`,
    guidance: {
      approach: 'Personalize mencionando algo específico do perfil da pessoa.',
      tone: 'Profissional mas humano. LinkedIn é mais formal que WhatsApp.',
      questions: [
        'Como está o cenário de [ÁREA] na sua empresa?',
        'Vocês já consideram soluções como [PRODUTO/SERVIÇO]?',
      ],
      doNot: [
        'Enviar pitch de vendas na primeira mensagem',
        'Usar mensagem genérica e copiada',
        'Adicionar sem mensagem personalizada',
      ],
    },
  },
  {
    id: 'li-confirmacao-1',
    title: 'Confirmação de Call',
    channel: 'linkedin',
    category: 'confirmacao',
    content: `Olá, [NOME]!

Confirmando nossa conversa para [DATA] às [HORÁRIO].

Enviarei o convite com o link por email.

Até lá!`,
    guidance: {
      approach: 'Use LinkedIn como canal secundário de confirmação.',
      tone: 'Breve e objetivo. LinkedIn não é o melhor canal para detalhes.',
      questions: [],
      doNot: [
        'Usar LinkedIn como canal principal de comunicação',
        'Enviar informações sensíveis',
      ],
    },
  },
  {
    id: 'li-followup-1',
    title: 'Nurturing Pós Conexão',
    channel: 'linkedin',
    category: 'followup',
    content: `Oi, [NOME]!

Obrigado por aceitar a conexão.

Vi que sua empresa atua com [ÁREA]. Temos ajudado empresas similares com [BENEFÍCIO].

Faz sentido conversarmos sobre isso?`,
    guidance: {
      approach: 'Aguarde 2-3 dias após a conexão aceita. Não seja imediatista.',
      tone: 'Consultivo. Mostre valor antes de pedir algo.',
      questions: [
        'Qual é o maior desafio em [ÁREA] hoje?',
        'Como vocês estão tratando [PROBLEMA COMUM]?',
      ],
      doNot: [
        'Enviar mensagem imediatamente após aceitar conexão',
        'Fazer pitch agressivo',
        'Enviar múltiplas mensagens sem resposta',
      ],
    },
  },
  {
    id: 'li-perdido-1',
    title: 'Reengajamento',
    channel: 'linkedin',
    category: 'perdido',
    content: `Olá, [NOME]!

Espero que esteja tudo bem.

Lembrei de você quando vi [CONTEÚDO/NOTÍCIA RELEVANTE]. Achei que poderia interessar.

Como estão as coisas por aí?`,
    guidance: {
      approach: 'Use conteúdo relevante como pretexto para retomar contato.',
      tone: 'Natural e descontraído. Pareça genuíno, não vendedor.',
      questions: [
        'Como foi o ano para a empresa?',
        'Vocês ainda estão avaliando soluções de [ÁREA]?',
      ],
      doNot: [
        'Parecer que só lembrou da pessoa para vender',
        'Usar conteúdo genérico como desculpa',
      ],
    },
  },
  // EMAIL TEMPLATES
  {
    id: 'email-abordagem-1',
    title: 'Email de Prospecção',
    channel: 'email',
    category: 'abordagem',
    content: `Assunto: [BENEFÍCIO] para [EMPRESA]

Olá, [NOME]!

Sou [SEU NOME] da [EMPRESA]. Ajudamos empresas de [SEGMENTO] a [RESULTADO].

Recentemente, trabalhamos com [CLIENTE SIMILAR] e conseguimos [RESULTADO ESPECÍFICO].

Faz sentido conversarmos sobre como podemos ajudar a [EMPRESA]?

Abraço,
[ASSINATURA]`,
    guidance: {
      approach: 'Personalize o assunto e mencione resultados específicos. Seja conciso.',
      tone: 'Profissional e direto. Email permite mais formalidade.',
      questions: [
        'Inclua uma pergunta que convide à resposta',
        'Foque em dores comuns do segmento',
      ],
      doNot: [
        'Escrever parágrafos longos',
        'Usar assuntos genéricos ou clickbait',
        'Anexar arquivos pesados na primeira mensagem',
      ],
    },
  },
  {
    id: 'email-confirmacao-1',
    title: 'Confirmação e Agenda',
    channel: 'email',
    category: 'confirmacao',
    content: `Assunto: Confirmação: Reunião [DATA] às [HORÁRIO]

Olá, [NOME]!

Confirmando nossa reunião:

📅 Data: [DATA]
⏰ Horário: [HORÁRIO]
🔗 Link: [LINK DA REUNIÃO]

Pauta proposta:
1. Entender seu cenário atual
2. Apresentar nossa solução
3. Discutir próximos passos

Até lá!

[ASSINATURA]`,
    guidance: {
      approach: 'Inclua todos os detalhes práticos e uma pauta clara.',
      tone: 'Organizado e profissional. Use formatação visual.',
      questions: [],
      doNot: [
        'Esquecer de incluir link ou detalhes importantes',
        'Enviar pauta muito extensa',
      ],
    },
  },
  {
    id: 'email-followup-1',
    title: 'Follow-up com Proposta',
    channel: 'email',
    category: 'followup',
    content: `Assunto: Proposta [EMPRESA] + [SUA EMPRESA]

Olá, [NOME]!

Como conversamos, segue a proposta detalhada.

Resumo:
✅ [ITEM 1]
✅ [ITEM 2]
✅ Investimento: [VALOR]
✅ Prazo: [PRAZO]

Fico à disposição para esclarecer qualquer ponto.

Podemos alinhar feedback até [DATA]?

[ASSINATURA]`,
    guidance: {
      approach: 'Envie no mesmo dia ou no dia seguinte à reunião.',
      tone: 'Profissional e organizado. Facilite a tomada de decisão.',
      questions: [
        'Há algo que precise ser ajustado na proposta?',
        'Precisa de aprovação de mais alguém?',
      ],
      doNot: [
        'Demorar para enviar',
        'Enviar proposta sem recapitular a conversa',
        'Não definir próximos passos claros',
      ],
    },
  },
  {
    id: 'email-perdido-1',
    title: 'Breakup Email',
    channel: 'email',
    category: 'perdido',
    content: `Assunto: Fechando o ciclo

Olá, [NOME]!

Tentei contato algumas vezes sem sucesso.

Entendo que prioridades mudam e talvez não seja o momento certo.

Vou pausar os contatos por agora, mas fico à disposição quando fizer sentido.

Desejo sucesso!

[ASSINATURA]`,
    guidance: {
      approach: 'Use após 3-4 tentativas sem resposta. Último recurso antes de pausar.',
      tone: 'Respeitoso e sem ressentimento. Deixe a porta aberta.',
      questions: [],
      doNot: [
        'Parecer passivo-agressivo',
        'Continuar enviando após o breakup',
        'Fazer cobranças sobre falta de resposta',
      ],
    },
  },
];

const CHANNEL_CONFIG = {
  whatsapp: { icon: MessageSquare, label: 'WhatsApp', color: 'bg-green-500/10 text-green-600 border-green-500/30' },
  linkedin: { icon: Linkedin, label: 'LinkedIn', color: 'bg-blue-600/10 text-blue-600 border-blue-600/30' },
  email: { icon: Mail, label: 'Email', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
};

const CATEGORY_CONFIG = {
  abordagem: { icon: UserPlus, label: 'Abordagem', color: 'bg-blue-500' },
  confirmacao: { icon: Calendar, label: 'Confirmação', color: 'bg-teal-500' },
  followup: { icon: RefreshCcw, label: 'Follow-up', color: 'bg-amber-500' },
  perdido: { icon: XCircle, label: 'Recuperação', color: 'bg-rose-500' },
};

export function StageTemplates() {
  const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'linkedin' | 'email'>('whatsapp');
  const [activeCategory, setActiveCategory] = useState<'abordagem' | 'confirmacao' | 'followup' | 'perdido'>('abordagem');

  const filteredTemplates = TEMPLATES.filter(
    t => t.channel === activeChannel && t.category === activeCategory
  );

  const copyTemplate = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Template copiado!');
  };

  return (
    <div className="space-y-6">
      {/* Channel Tabs */}
      <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as any)}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          {Object.entries(CHANNEL_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {config.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = activeCategory === key;
          return (
            <Button
              key={key}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(key as any)}
              className={cn(
                "flex items-center gap-2",
                isActive && config.color
              )}
            >
              <Icon className="h-4 w-4" />
              {config.label}
            </Button>
          );
        })}
      </div>

      {/* Templates */}
      <div className="space-y-4">
        {filteredTemplates.map((template) => (
          <TemplateCard key={template.id} template={template} onCopy={copyTemplate} />
        ))}

        {filteredTemplates.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium text-muted-foreground">Sem templates para esta combinação</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tente outra combinação de canal e categoria
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ template, onCopy }: { template: Template; onCopy: (content: string) => void }) {
  const [showGuidance, setShowGuidance] = useState(false);
  const channelConfig = CHANNEL_CONFIG[template.channel];
  const ChannelIcon = channelConfig.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ChannelIcon className="h-4 w-4" />
              {template.title}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={channelConfig.color}>
                {channelConfig.label}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => onCopy(template.content)}>
                <Copy className="h-4 w-4 mr-1" />
                Copiar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Content */}
          <pre className="text-sm whitespace-pre-wrap font-sans bg-muted/50 p-4 rounded-lg border">
            {template.content}
          </pre>

          {/* Guidance Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGuidance(!showGuidance)}
            className="w-full"
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            {showGuidance ? 'Ocultar orientações' : 'Ver orientações de uso'}
          </Button>

          {/* Guidance Content */}
          {showGuidance && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="grid md:grid-cols-2 gap-4"
            >
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <h4 className="text-xs font-medium text-blue-600 mb-1">Como Abordar</h4>
                  <p className="text-xs text-muted-foreground">{template.guidance.approach}</p>
                </div>

                <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <h4 className="text-xs font-medium text-purple-600 mb-1">Tom de Voz</h4>
                  <p className="text-xs text-muted-foreground">{template.guidance.tone}</p>
                </div>
              </div>

              <div className="space-y-3">
                {template.guidance.questions.length > 0 && (
                  <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                    <h4 className="text-xs font-medium text-green-600 mb-1">Perguntas para Fazer</h4>
                    <ul className="space-y-1">
                      {template.guidance.questions.map((q, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                          <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <h4 className="text-xs font-medium text-red-600 mb-1">O que NÃO fazer</h4>
                  <ul className="space-y-1">
                    {template.guidance.doNot.map((item, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                        <XCircle className="h-3 w-3 mt-0.5 text-red-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
