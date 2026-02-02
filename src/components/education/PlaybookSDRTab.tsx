import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
        <div className="flex items-center gap-3">
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

      {/* Process Funnel Visual */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Funil de Vendas SDR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {stages?.map((stage, index) => (
              <div key={stage.id} className="flex items-center flex-shrink-0">
                <button
                  onClick={() => setSelectedStage(selectedStage?.id === stage.id ? null : stage)}
                  className={cn(
                    "relative px-4 py-3 rounded-lg min-w-[120px] transition-all",
                    "bg-gradient-to-br text-white shadow-md",
                    STAGE_COLORS[index % STAGE_COLORS.length],
                    selectedStage?.id === stage.id && "ring-2 ring-offset-2 ring-primary scale-105",
                    "hover:scale-105 hover:shadow-lg"
                  )}
                >
                  <span className="font-semibold text-sm">{stage.name}</span>
                  <span className="block text-[10px] opacity-80 mt-0.5">
                    Etapa {index + 1}
                  </span>
                </button>
                {index < (stages?.length || 0) - 1 && (
                  <ArrowRight className="h-5 w-5 mx-2 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Stage Details */}
      {selectedStage && (
        <StageDetails
          stage={selectedStage}
          canEdit={canEdit}
          isEditing={editingStage === selectedStage.id}
          onEdit={() => setEditingStage(selectedStage.id)}
          onCancelEdit={() => setEditingStage(null)}
          checkedItems={checkedItems}
          onCheckItem={(label) => setCheckedItems(prev => ({ ...prev, [label]: !prev[label] }))}
        />
      )}

      {/* Glossary Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Definições de Etapas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {glossary?.map(term => (
              <div key={term.id} className="p-3 rounded-lg bg-muted/50 border">
                <h4 className="font-semibold text-sm capitalize">{term.key}</h4>
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
              </div>
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
    </div>
  );
}

// Stage Details Component
function StageDetails({
  stage,
  canEdit,
  isEditing,
  onEdit,
  onCancelEdit,
  checkedItems,
  onCheckItem,
}: {
  stage: SDRProcessStage;
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
    toast.success('Copiado!');
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full bg-gradient-to-br", STAGE_COLORS[stage.order_index - 1])} />
            {stage.name}
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
      <CardContent className="space-y-4">
        {/* Definition and Criteria */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1">
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
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Critérios de Entrada
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
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Critérios de Saída
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

        {/* Checklist */}
        {stage.checklist_json && stage.checklist_json.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <ClipboardList className="h-3 w-3" /> Checklist
            </h4>
            <div className="space-y-1">
              {stage.checklist_json.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onCheckItem(`${stage.id}-${idx}`)}
                  className="flex items-center gap-2 text-sm hover:bg-muted/50 p-1.5 rounded w-full text-left"
                >
                  {checkedItems[`${stage.id}-${idx}`] ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={cn(checkedItems[`${stage.id}-${idx}`] && "line-through text-muted-foreground")}>
                    {item.label}
                  </span>
                  {item.required && (
                    <Badge variant="outline" className="text-[10px] ml-auto">Obrigatório</Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Templates */}
        {stage.templates_json && stage.templates_json.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Templates
            </h4>
            <div className="grid gap-2">
              {stage.templates_json.map((template, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {template.type === 'email' && <Mail className="h-4 w-4 text-blue-500" />}
                      {template.type === 'whatsapp' && <Phone className="h-4 w-4 text-green-500" />}
                      <span className="font-medium text-sm">{template.title}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyTemplate(template.content)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">
                    {template.content}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Objections */}
        {stage.objections_json && stage.objections_json.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <HelpCircle className="h-3 w-3" /> Objeções e Respostas
            </h4>
            <Accordion type="single" collapsible className="w-full">
              {stage.objections_json.map((obj, idx) => (
                <AccordionItem key={idx} value={`obj-${idx}`} className="border rounded-lg mb-2 px-3">
                  <AccordionTrigger className="text-sm py-2 hover:no-underline">
                    <span className="text-left">❌ "{obj.objection}"</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-3">
                    ✅ {obj.response}
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
          <CardTitle className="text-sm font-medium">{section.title}</CardTitle>
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
