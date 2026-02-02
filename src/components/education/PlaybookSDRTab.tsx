import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  ChevronRight,
  Copy,
  MessageSquare,
  Mail,
  Phone,
  Edit2,
  Save,
  X,
  Info,
  Target,
  ArrowRight,
  ClipboardList,
  FileText,
  HelpCircle,
  Filter,
  Calculator,
  Monitor,
  BookOpen,
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
import { FunnelExplainer } from './FunnelExplainer';
import { PipedriveExamples } from './PipedriveExamples';
import { EmbeddedPerformanceMatrix } from './EmbeddedPerformanceMatrix';

interface PlaybookSDRTabProps {
  clientId?: string;
  clientName?: string;
  clients?: { id: string; company_name: string }[];
}

const STAGE_COLORS = [
  'from-blue-500 to-blue-600',
  'from-cyan-500 to-cyan-600',
  'from-teal-500 to-teal-600',
  'from-emerald-500 to-emerald-600',
  'from-green-500 to-green-600',
];

const STAGE_BG_COLORS = [
  'bg-blue-500/10 border-blue-500/30',
  'bg-cyan-500/10 border-cyan-500/30',
  'bg-teal-500/10 border-teal-500/30',
  'bg-emerald-500/10 border-emerald-500/30',
  'bg-green-500/10 border-green-500/30',
];

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

  const isLoading = sectionsLoading || stagesLoading || glossaryLoading;

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

      {/* Section Navigation */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="examples" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Exemplos CRM
          </TabsTrigger>
          <TabsTrigger value="simulator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Simulador
          </TabsTrigger>
          <TabsTrigger value="stages" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Etapas
          </TabsTrigger>
        </TabsList>

        {/* Overview Section */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Interactive Funnel Explainer */}
          <FunnelExplainer />

          {/* Glossary Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Definições de Etapas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {glossary?.map(term => (
                  <motion.div 
                    key={term.id} 
                    className="p-3 rounded-lg bg-muted/50 border hover:border-primary/30 transition-all"
                    whileHover={{ scale: 1.02 }}
                  >
                    <h4 className="font-semibold text-sm capitalize flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {term.key}
                    </h4>
                    <div className="text-xs text-muted-foreground mt-1 prose prose-sm">
                      <ReactMarkdown>{term.definition_md || ''}</ReactMarkdown>
                    </div>
                    {term.rules_md && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="text-[10px] text-primary font-medium">Regras específicas:</span>
                        <div className="text-xs text-muted-foreground prose prose-sm">
                          <ReactMarkdown>{term.rules_md}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Playbook Sections */}
          <div className="space-y-4">
            {sections?.map(section => (
              <PlaybookSectionCard
                key={section.id}
                section={section}
                canEdit={canEdit}
                isEditing={editingSection === section.id}
                onEdit={() => setEditingSection(section.id)}
                onCancelEdit={() => setEditingSection(null)}
              />
            ))}
          </div>
        </TabsContent>

        {/* Examples Section */}
        <TabsContent value="examples" className="mt-6">
          <PipedriveExamples />
        </TabsContent>

        {/* Simulator Section */}
        <TabsContent value="simulator" className="mt-6">
          <EmbeddedPerformanceMatrix />
        </TabsContent>

        {/* Stages Section */}
        <TabsContent value="stages" className="mt-6 space-y-6">
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
                {stages?.map((stage, index) => (
                  <div key={stage.id} className="flex items-center flex-shrink-0">
                    <motion.button
                      onClick={() => setSelectedStage(selectedStage?.id === stage.id ? null : stage)}
                      className={cn(
                        "relative px-4 py-3 rounded-lg min-w-[120px] transition-all",
                        "bg-gradient-to-br text-white shadow-md",
                        STAGE_COLORS[index % STAGE_COLORS.length],
                        selectedStage?.id === stage.id && "ring-2 ring-offset-2 ring-primary scale-105",
                        "hover:scale-105 hover:shadow-lg cursor-pointer"
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="font-semibold text-sm">{stage.name}</span>
                      <span className="block text-[10px] opacity-80 mt-0.5">
                        Etapa {index + 1}
                      </span>
                    </motion.button>
                    {index < (stages?.length || 0) - 1 && (
                      <ArrowRight className="h-5 w-5 mx-2 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                ))}
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
                  Clique em uma etapa acima para ver detalhes, checklist e templates
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Stage Details Component
function StageDetails({
  stage,
  stageIndex,
  canEdit,
  isEditing,
  onEdit,
  onCancelEdit,
  checkedItems,
  onCheckItem,
}: {
  stage: SDRProcessStage;
  stageIndex: number;
  canEdit: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  checkedItems: Record<string, boolean>;
  onCheckItem: (label: string) => void;
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

  const copyTemplate = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copiado para a área de transferência!');
  };

  const completedCount = stage.checklist_json?.filter((_, idx) => 
    checkedItems[`${stage.id}-${idx}`]
  ).length || 0;
  const totalCount = stage.checklist_json?.length || 0;

  return (
    <Card className={cn("border-2", STAGE_BG_COLORS[stageIndex % STAGE_BG_COLORS.length])}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full bg-gradient-to-br", STAGE_COLORS[stageIndex % STAGE_COLORS.length])} />
            {stage.name}
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
        {stage.checklist_json && stage.checklist_json.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <ClipboardList className="h-3 w-3" /> Checklist
              </h4>
              <Badge variant={completedCount === totalCount ? "default" : "secondary"}>
                {completedCount}/{totalCount} concluídos
              </Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {stage.checklist_json.map((item, idx) => (
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

        {/* Templates */}
        {stage.templates_json && stage.templates_json.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Templates
            </h4>
            <div className="grid md:grid-cols-2 gap-3">
              {stage.templates_json.map((template, idx) => (
                <motion.div 
                  key={idx} 
                  className="p-4 rounded-lg bg-background/50 border hover:border-primary/30 transition-all"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {template.type === 'email' && <Mail className="h-4 w-4 text-blue-500" />}
                      {template.type === 'whatsapp' && <Phone className="h-4 w-4 text-green-500" />}
                      <span className="font-medium text-sm">{template.title}</span>
                      <Badge variant="secondary" className="text-[10px]">{template.type}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyTemplate(template.content)}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans bg-muted/50 p-3 rounded-md max-h-32 overflow-y-auto">
                    {template.content}
                  </pre>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Objections */}
        {stage.objections_json && stage.objections_json.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <HelpCircle className="h-3 w-3" /> Objeções e Respostas
            </h4>
            <Accordion type="single" collapsible className="w-full">
              {stage.objections_json.map((obj, idx) => (
                <AccordionItem key={idx} value={`obj-${idx}`} className="border rounded-lg mb-2 px-3 bg-background/50">
                  <AccordionTrigger className="text-sm py-3 hover:no-underline">
                    <span className="text-left flex items-center gap-2">
                      <span className="text-red-500">❌</span>
                      "{obj.objection}"
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm pb-3">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                      <span className="text-green-500 mt-0.5">✅</span>
                      <span>{obj.response}</span>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Playbook Section Card
function PlaybookSectionCard({
  section,
  canEdit,
  isEditing,
  onEdit,
  onCancelEdit,
}: {
  section: SDRPlaybookSection;
  canEdit: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
}) {
  const updateSection = useUpdatePlaybookSection();
  const [content, setContent] = useState(section.content_md || '');

  const handleSave = () => {
    updateSection.mutate({
      id: section.id,
      content_md: content,
    }, { onSuccess: onCancelEdit });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
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
      <CardContent>
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
            <ReactMarkdown>{section.content_md || 'Sem conteúdo.'}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
