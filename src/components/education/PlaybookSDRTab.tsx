import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  Circle,
  Copy,
  MessageSquare,
  Mail,
  Phone,
  Edit2,
  Save,
  X,
  Target,
  ArrowRight,
  ClipboardList,
  FileText,
  Filter,
  Calculator,
  Monitor,
  BookOpen,
  ExternalLink,
  Users,
  UserCheck,
  Handshake,
  Trophy,
  Timer,
  Search,
  Send,
  Linkedin,
  Calendar,
  PhoneCall,
} from 'lucide-react';
import {
  usePlaybookSections,
  useProcessStages,
  useGlossary,
  useCanEditEducation,
  useUpdatePlaybookSection,
  useUpdateProcessStage,
  SDRProcessStage,
  SDRPlaybookSection,
} from '@/hooks/useEducation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { FunnelExplainer, FUNNEL_STAGES } from './FunnelExplainer';
import { PipedriveExamples } from './PipedriveExamples';
import { EmbeddedPerformanceMatrix } from './EmbeddedPerformanceMatrix';
import { StageTemplates } from './StageTemplates';
import { ContactCadenceFlow } from './ContactCadenceFlow';

interface PlaybookSDRTabProps {
  clientId?: string;
  clientName?: string;
  clients?: { id: string; company_name: string }[];
}

const STAGE_ICONS = [Users, UserCheck, Phone, Handshake, Trophy];

// Stage name mapping based on client
const getStageDisplayName = (stageName: string, clientName?: string) => {
  const isSétima = clientName?.toLowerCase().includes('sétima') || clientName?.toLowerCase().includes('setima');
  if (stageName.toLowerCase() === 'sql' && isSétima) {
    return 'Enviar Invite';
  }
  return stageName;
};

export function PlaybookSDRTab({ clientId, clientName, clients }: PlaybookSDRTabProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clientId || null);
  const effectiveClientId = clientId || selectedClientId;
  
  const { data: sections, isLoading: sectionsLoading } = usePlaybookSections(effectiveClientId || undefined);
  const { data: stages, isLoading: stagesLoading } = useProcessStages(effectiveClientId || undefined);
  const { data: glossary, isLoading: glossaryLoading } = useGlossary(effectiveClientId || undefined);
  const canEdit = useCanEditEducation();
  
  const [selectedStage, setSelectedStage] = useState<SDRProcessStage | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('overview');
  
  const stagesTabRef = useRef<HTMLDivElement>(null);

  const isLoading = sectionsLoading || stagesLoading || glossaryLoading;
  
  // Check if Sétima client
  const isSétima = clientName?.toLowerCase().includes('sétima') || clientName?.toLowerCase().includes('setima');

  // Handle navigation from funnel or glossary to stages
  const handleNavigateToStage = (stageId: string) => {
    setActiveSection('stages');
    
    const stageMapping: Record<string, number> = {
      'lead': 0,
      'mql': 1,
      'sql': 2,
      'oportunidade': 3,
      'contrato': 4,
    };
    
    const stageIndex = stageMapping[stageId];
    if (stages && stages[stageIndex]) {
      setSelectedStage(stages[stageIndex]);
    }
    
    setTimeout(() => {
      stagesTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Order glossary terms to match funnel order
  const orderedGlossary = glossary?.sort((a, b) => {
    const order = ['lead', 'mql', 'sql', 'oportunidade', 'contrato'];
    const aIndex = order.findIndex(o => a.key.toLowerCase().includes(o));
    const bIndex = order.findIndex(o => b.key.toLowerCase().includes(o));
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client Selector (only show if not inside a client detail) */}
      {!clientId && clients && clients.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
          <span className="text-sm text-muted-foreground">Visualizando:</span>
          <Select
            value={selectedClientId || 'global'}
            onValueChange={(v) => setSelectedClientId(v === 'global' ? null : v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Global" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global (Padrão)</SelectItem>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>{client.company_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedClientId && (
            <Badge variant="secondary">
              Conteúdo específico do cliente sobrescreve o global
            </Badge>
          )}
        </div>
      )}

      {/* Section Navigation - Updated with Templates and Cadence modules */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        <TabsList className={cn("grid w-full", isSétima ? "grid-cols-6" : "grid-cols-5")}>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="crm" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">CRM</span>
          </TabsTrigger>
          <TabsTrigger value="simulator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Simulador</span>
          </TabsTrigger>
          <TabsTrigger value="stages" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Etapas</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          {isSétima && (
            <TabsTrigger value="cadence" className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <span className="hidden sm:inline">Cadência</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Section - Visual Summary */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Visual Introduction */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative bg-gradient-to-br from-primary/5 via-background to-muted/30 p-6">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Playbook SDR</h2>
                      <p className="text-sm text-muted-foreground">Guia completo do processo de vendas</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Este playbook documenta todo o processo de pré-vendas, desde a entrada do lead até a conversão em cliente.
                    Navegue pelas seções para entender cada etapa do funil, as responsabilidades do SDR e os processos de qualificação.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards - Three main pillars */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Funnel Card */}
            <Card 
              interactive
              onClick={() => setActiveSection('stages')}
              className="group"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-muted">
                    <Filter className="h-5 w-5 text-primary" />
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-semibold mb-1">Funil de Vendas</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Jornada do lead da entrada até a conversão em cliente
                </p>
                <div className="flex items-center gap-1">
                  {['Lead', 'MQL', isSétima ? 'Invite' : 'SQL', 'Opp', 'Contrato'].map((s, i) => (
                    <div key={s} className="flex items-center">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s}</span>
                      {i < 4 && <ArrowRight className="h-3 w-3 text-border mx-0.5" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SDR Attributions Card - Simplified */}
            <Card className="group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-muted">
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold mb-1">Atribuições do SDR</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Responsável por qualificar leads e agendar reuniões para o time de vendas
                </p>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    Qualificar leads rapidamente
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    Registrar interações no CRM
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    Agendar reuniões qualificadas
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Cadence Card - Links to module */}
            {isSétima ? (
              <Card 
                interactive
                onClick={() => setActiveSection('cadence')}
                className="group"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-muted">
                      <Timer className="h-5 w-5 text-primary" />
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="font-semibold mb-1">Cadência de Contato</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Fluxo de 5 dias úteis para conversão de MQLs
                  </p>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((day) => (
                      <div 
                        key={day}
                        className={cn(
                          "w-7 h-7 rounded flex items-center justify-center text-xs font-medium",
                          day === 1 || day === 2 || day === 5 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}
                      >
                        D{day}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-primary mt-3 font-medium">
                    Ver fluxo completo →
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-muted">
                      <Timer className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <h3 className="font-semibold mb-1">Tempo de Resposta</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Velocidade é essencial na qualificação de leads
                  </p>
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-2xl font-bold text-primary">5 min</p>
                    <p className="text-xs text-muted-foreground">Tempo ideal de resposta</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Interactive Funnel Explainer */}
          <FunnelExplainer onStageClick={handleNavigateToStage} />

          {/* Glossary Section - Clickable Cards */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Definições de Etapas
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Clique em cada etapa para ver detalhes e checklists
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {FUNNEL_STAGES.map((stage, index) => {
                  const Icon = STAGE_ICONS[index];
                  const matchingGlossary = orderedGlossary?.find(
                    g => g.key.toLowerCase().includes(stage.id)
                  );
                  const displayName = getStageDisplayName(stage.name, clientName);
                  
                  return (
                    <motion.button
                      key={stage.id}
                      onClick={() => handleNavigateToStage(stage.id)}
                      className={cn(
                        "p-4 rounded-lg border text-left transition-all",
                        "hover:shadow-md hover:border-primary/40 cursor-pointer group",
                        "bg-card"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-muted">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h4 className="font-semibold text-sm mb-1">{displayName}</h4>
                      {stage.fullName && (
                        <p className="text-[10px] text-muted-foreground mb-2">{stage.fullName}</p>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {matchingGlossary?.definition_md || stage.description}
                      </p>
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <span className="text-[10px] text-primary font-medium">
                          Ver detalhes →
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Playbook Sections - Atribuições without cadence text */}
          <div className="space-y-4">
            {sections?.map(section => (
              <PlaybookSectionCard
                key={section.id}
                section={section}
                canEdit={canEdit}
                isEditing={editingSection === section.id}
                onEdit={() => setEditingSection(section.id)}
                onCancelEdit={() => setEditingSection(null)}
                showCadenceCard={isSétima && section.title?.toLowerCase().includes('atribuiç')}
                onNavigateToCadence={() => setActiveSection('cadence')}
              />
            ))}
          </div>
        </TabsContent>

        {/* CRM Section */}
        <TabsContent value="crm" className="mt-6">
          <PipedriveExamples />
        </TabsContent>

        {/* Simulator Section */}
        <TabsContent value="simulator" className="mt-6">
          <EmbeddedPerformanceMatrix />
        </TabsContent>

        {/* Stages Section - Refactored */}
        <TabsContent value="stages" className="mt-6 space-y-6" ref={stagesTabRef}>
          {/* Interactive Process Funnel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Etapas do Processo de Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between overflow-x-auto pb-4">
                {stages?.map((stage, index) => {
                  const displayName = getStageDisplayName(stage.name, clientName);
                  return (
                    <div key={stage.id} className="flex items-center flex-shrink-0">
                      <motion.button
                        onClick={() => setSelectedStage(selectedStage?.id === stage.id ? null : stage)}
                        className={cn(
                          "relative px-4 py-3 rounded-lg min-w-[120px] transition-all",
                          "bg-card border-2 shadow-sm",
                          selectedStage?.id === stage.id 
                            ? "border-primary ring-1 ring-primary/20" 
                            : "border-border hover:border-primary/40",
                          "hover:shadow-md cursor-pointer"
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {React.createElement(STAGE_ICONS[index], { className: "h-4 w-4 text-primary" })}
                          <span className="font-semibold text-sm">{displayName}</span>
                        </div>
                        <span className="block text-[10px] text-muted-foreground">
                          Etapa {index + 1}
                        </span>
                      </motion.button>
                      {index < (stages?.length || 0) - 1 && (
                        <ArrowRight className="h-5 w-5 mx-2 text-border flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Stage Details */}
          <AnimatePresence>
            {selectedStage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <StageDetails
                  stage={selectedStage}
                  stageIndex={stages?.findIndex(s => s.id === selectedStage.id) || 0}
                  canEdit={canEdit}
                  isEditing={editingStage === selectedStage.id}
                  onEdit={() => setEditingStage(selectedStage.id)}
                  onCancelEdit={() => setEditingStage(null)}
                  checkedItems={checkedItems}
                  onCheckItem={(label) => setCheckedItems(prev => ({ ...prev, [label]: !prev[label] }))}
                  clientName={clientName}
                  onNavigateToCadence={() => setActiveSection('cadence')}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {!selectedStage && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-medium text-muted-foreground">Selecione uma etapa</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em uma etapa acima para ver detalhes e checklist
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Templates Module - New Separate Section */}
        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Banco de Templates
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Templates para WhatsApp, LinkedIn e Email organizados por tipo de interação
              </p>
            </CardHeader>
            <CardContent>
              <StageTemplates />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cadence Module - New Separate Section (Sétima only) */}
        {isSétima && (
          <TabsContent value="cadence" className="mt-6">
            <ContactCadenceFlow clientName={clientName} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// Stage Details Component - Refactored with stage-specific content
function StageDetails({
  stage,
  stageIndex,
  canEdit,
  isEditing,
  onEdit,
  onCancelEdit,
  checkedItems,
  onCheckItem,
  clientName,
  onNavigateToCadence,
}: {
  stage: SDRProcessStage;
  stageIndex: number;
  canEdit: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  checkedItems: Record<string, boolean>;
  onCheckItem: (label: string) => void;
  clientName?: string;
  onNavigateToCadence?: () => void;
}) {
  const updateStage = useUpdateProcessStage();
  const [editForm, setEditForm] = useState({
    definition_md: stage.definition_md || '',
    entry_criteria_md: stage.entry_criteria_md || '',
    exit_criteria_md: stage.exit_criteria_md || '',
  });

  const handleSave = () => {
    updateStage.mutate({
      id: stage.id,
      ...editForm,
    }, { onSuccess: onCancelEdit });
  };

  const isSétima = clientName?.toLowerCase().includes('sétima') || clientName?.toLowerCase().includes('setima');
  const stageId = stage.name?.toLowerCase();
  const isLeadStage = stageId === 'lead';
  const isMQLStage = stageId === 'mql';
  const isSQLStage = stageId === 'sql';
  const isOpportunityStage = stageId === 'oportunidade';

  const completedCount = stage.checklist_json?.filter((_, idx) => 
    checkedItems[`${stage.id}-${idx}`]
  ).length || 0;
  const totalCount = stage.checklist_json?.length || 0;

  const displayName = getStageDisplayName(stage.name, clientName);

  // Custom checklist for Lead stage - Research focused
  const leadChecklist = [
    { label: 'Pesquisar site da empresa', required: true },
    { label: 'Verificar perfil da empresa no LinkedIn', required: true },
    { label: 'Entender o que a empresa faz/vende', required: true },
    { label: 'Identificar tamanho da empresa (funcionários, receita)', required: true },
    { label: 'Verificar se atende critérios de MQL', required: true },
    { label: 'Registrar informações no CRM', required: true },
  ];

  // Custom checklist for MQL stage
  const mqlChecklist = [
    { label: 'Lead atende critérios de qualificação', required: true },
    { label: 'Iniciar cadência de contato', required: true },
    { label: 'Primeira tentativa de ligação', required: true },
    { label: 'Registrar resultado no CRM', required: true },
  ];

  // Custom checklist for SQL (Enviar Invite) stage
  const sqlChecklist = [
    { label: 'Conseguiu contato com o lead', required: true },
    { label: 'Lead demonstrou interesse', required: true },
    { label: 'Enviar convite para reunião', required: true },
    { label: 'Confirmar agendamento', required: true },
    { label: 'Registrar no CRM', required: true },
  ];

  // Custom opportunity checklist based on client type
  const getOpportunityChecklist = () => {
    if (clientName?.toLowerCase().includes('brandspot')) {
      return [
        { label: 'Visita ao showroom agendada', required: true },
        { label: 'Visita confirmada pelo lead', required: true },
        { label: 'Preparar materiais para apresentação', required: false },
        { label: 'Registrar no CRM', required: true },
      ];
    } else if (clientName?.toLowerCase().includes('3d')) {
      return [
        { label: 'Orçamento elaborado', required: true },
        { label: 'Orçamento enviado ao lead', required: true },
        { label: 'Follow-up agendado', required: false },
        { label: 'Registrar no CRM', required: true },
      ];
    }
    return stage.checklist_json || [];
  };

  const activeChecklist = isLeadStage ? leadChecklist 
    : isMQLStage ? mqlChecklist 
    : isSQLStage ? sqlChecklist 
    : isOpportunityStage && isSétima ? getOpportunityChecklist()
    : stage.checklist_json || [];

  return (
    <Card className="border bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {React.createElement(STAGE_ICONS[stageIndex], { className: "h-4 w-4 text-primary" })}
            {displayName}
            <Badge variant="secondary" className="ml-2">Etapa {stageIndex + 1}</Badge>
          </CardTitle>
          {canEdit && !isEditing && (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-1" />
              Editar
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateStage.isPending}>
                <Save className="h-4 w-4 mr-1" />
                Salvar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stage-specific content for Lead */}
        {isLeadStage && (
          <div className="p-4 rounded-lg bg-muted/30 border">
            <div className="flex items-start gap-3">
              <Search className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Etapa de Pesquisa e Entendimento</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Nesta etapa, o objetivo é entender a empresa do lead: o que faz, tamanho, segmento e se atende aos critérios mínimos para ser considerado um MQL.
                  Pesquise o site, LinkedIn e outras fontes para qualificar o lead.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stage-specific content for MQL - Link to Cadence */}
        {isMQLStage && isSétima && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <Timer className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-sm">Início da Cadência de Contato</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Quando o lead é qualificado como MQL, inicia-se a cadência de contato de 5 dias úteis.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={onNavigateToCadence}
                >
                  <Timer className="h-4 w-4 mr-2" />
                  Ver Cadência Completa
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Stage-specific content for SQL (Enviar Invite) */}
        {isSQLStage && isSétima && (
          <div className="p-4 rounded-lg bg-muted/30 border">
            <div className="flex items-start gap-3">
              <Send className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Envio de Convite para Reunião</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Lead foi contatado com sucesso e demonstrou interesse. É hora de enviar o convite para a reunião de apresentação.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stage-specific content for Opportunity - Sétima clients */}
        {isOpportunityStage && isSétima && (
          <div className="p-4 rounded-lg bg-muted/30 border">
            <div className="flex items-start gap-3">
              <Handshake className="h-5 w-5 text-primary mt-0.5" />
              <div className="w-full">
                <h4 className="font-medium text-sm">Critérios de Entrada por Unidade de Negócio</h4>
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <div className="p-3 rounded-lg bg-background border">
                    <Badge variant="outline" className="mb-2">Brandspot</Badge>
                    <p className="text-xs text-muted-foreground">
                      Visita agendada e confirmada no showroom
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-background border">
                    <Badge variant="outline" className="mb-2">3D</Badge>
                    <p className="text-xs text-muted-foreground">
                      Orçamento enviado ao lead
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Definition and Criteria */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2 p-3 rounded-lg bg-background/50 border">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <FileText className="h-3 w-3" /> Definição
            </h4>
            {isEditing ? (
              <Textarea
                value={editForm.definition_md}
                onChange={(e) => setEditForm(f => ({ ...f, definition_md: e.target.value }))}
                rows={4}
                className="text-sm"
              />
            ) : (
              <div className="text-sm prose prose-sm">
                <ReactMarkdown>{stage.definition_md || '-'}</ReactMarkdown>
              </div>
            )}
          </div>
          <div className="space-y-2 p-3 rounded-lg bg-background/50 border">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              ✓ Critérios de Entrada
            </h4>
            {isEditing ? (
              <Textarea
                value={editForm.entry_criteria_md}
                onChange={(e) => setEditForm(f => ({ ...f, entry_criteria_md: e.target.value }))}
                rows={4}
                className="text-sm"
              />
            ) : (
              <div className="text-sm prose prose-sm">
                <ReactMarkdown>{stage.entry_criteria_md || '-'}</ReactMarkdown>
              </div>
            )}
          </div>
          <div className="space-y-2 p-3 rounded-lg bg-background/50 border">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              → Critérios de Saída
            </h4>
            {isEditing ? (
              <Textarea
                value={editForm.exit_criteria_md}
                onChange={(e) => setEditForm(f => ({ ...f, exit_criteria_md: e.target.value }))}
                rows={4}
                className="text-sm"
              />
            ) : (
              <div className="text-sm prose prose-sm">
                <ReactMarkdown>{stage.exit_criteria_md || '-'}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {/* Checklist with Progress */}
        {activeChecklist.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <ClipboardList className="h-3 w-3" /> Checklist
              </h4>
              <Badge variant={completedCount === activeChecklist.length ? "default" : "secondary"}>
                {Object.keys(checkedItems).filter(k => k.startsWith(stage.id) && checkedItems[k]).length}/{activeChecklist.length} concluídos
              </Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {activeChecklist.map((item, idx) => (
                <motion.button
                  key={idx}
                  onClick={() => onCheckItem(`${stage.id}-${idx}`)}
                  className={cn(
                    "flex items-center gap-2 text-sm p-3 rounded-lg w-full text-left transition-all",
                    checkedItems[`${stage.id}-${idx}`] 
                      ? "bg-green-500/10 border border-green-500/30" 
                      : "bg-background/50 border hover:bg-muted/50"
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  {checkedItems[`${stage.id}-${idx}`] ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={cn(checkedItems[`${stage.id}-${idx}`] && "line-through text-muted-foreground")}>
                    {item.label}
                  </span>
                  {item.required && (
                    <Badge variant="outline" className="text-[10px] ml-auto">Obrigatório</Badge>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Playbook Section Card - Updated to optionally show cadence card
function PlaybookSectionCard({
  section,
  canEdit,
  isEditing,
  onEdit,
  onCancelEdit,
  showCadenceCard,
  onNavigateToCadence,
}: {
  section: SDRPlaybookSection;
  canEdit: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  showCadenceCard?: boolean;
  onNavigateToCadence?: () => void;
}) {
  const updateSection = useUpdatePlaybookSection();
  const [content, setContent] = useState(section.content_md || '');

  const handleSave = () => {
    updateSection.mutate({
      id: section.id,
      content_md: content,
    }, { onSuccess: onCancelEdit });
  };

  // Filter out cadence text from content if showing cadence card
  const filteredContent = showCadenceCard 
    ? content.split(/cadência/i)[0].trim()
    : content;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {section.title}
          </CardTitle>
          {canEdit && !isEditing && (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateSection.isPending}>
                <Save className="h-4 w-4 mr-1" />
                Publicar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="font-mono text-sm"
            placeholder="Conteúdo em Markdown..."
          />
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{filteredContent || 'Sem conteúdo.'}</ReactMarkdown>
          </div>
        )}

        {/* Cadence Card Link */}
        {showCadenceCard && onNavigateToCadence && (
          <Card 
            interactive 
            onClick={onNavigateToCadence}
            className="bg-muted/30"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Timer className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Cadência de Contato</h4>
                    <p className="text-xs text-muted-foreground">Fluxo visual de 5 dias úteis para MQLs</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
