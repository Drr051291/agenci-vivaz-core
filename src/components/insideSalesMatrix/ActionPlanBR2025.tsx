import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, CheckCircle2, Circle, Clock, Megaphone, Settings2, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaybookAction } from "@/lib/insideSalesMatrix/actionPlaybook";

export interface ActionItemBR2025 {
  id: string;
  title: string;
  stage: string;
  type: 'midia' | 'processo';
  priority: 'Alta' | 'Média' | 'Baixa';
  status: 'A Fazer' | 'Em Andamento' | 'Concluído';
  metricToWatch?: string;
  nextStep?: string;
  owner?: string;
  dueDate?: string;
  source?: 'br2025' | 'matrix_rule' | 'ai' | 'manual';
}

interface ActionPlanBR2025Props {
  items: ActionItemBR2025[];
  onChange: (items: ActionItemBR2025[]) => void;
  dailyChecklist?: PlaybookAction[];
}

const priorityColors: Record<string, string> = {
  'Alta': 'bg-red-100 text-red-700 border-red-200',
  'Média': 'bg-amber-100 text-amber-700 border-amber-200',
  'Baixa': 'bg-slate-100 text-slate-600 border-slate-200',
};

const statusIcons: Record<string, React.ReactNode> = {
  'A Fazer': <Circle className="h-3.5 w-3.5" />,
  'Em Andamento': <Clock className="h-3.5 w-3.5 text-amber-500" />,
  'Concluído': <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
};

export function ActionPlanBR2025({ items, onChange, dailyChecklist = [] }: ActionPlanBR2025Props) {
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'midia' | 'processo'>('processo');
  const [activeTab, setActiveTab] = useState<'all' | 'midia' | 'processo'>('all');

  const addItem = () => {
    if (!newTitle.trim()) return;
    
    const item: ActionItemBR2025 = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      stage: 'Geral',
      type: newType,
      priority: 'Média',
      status: 'A Fazer',
      source: 'manual',
    };
    
    onChange([...items, item]);
    setNewTitle('');
  };

  const removeItem = (id: string) => {
    onChange(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, updates: Partial<ActionItemBR2025>) => {
    onChange(items.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const toggleStatus = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    const nextStatus: Record<string, ActionItemBR2025['status']> = {
      'A Fazer': 'Em Andamento',
      'Em Andamento': 'Concluído',
      'Concluído': 'A Fazer',
    };
    
    updateItem(id, { status: nextStatus[item.status] });
  };

  const filteredItems = activeTab === 'all' 
    ? items 
    : items.filter(i => i.type === activeTab);

  const midiaCount = items.filter(i => i.type === 'midia').length;
  const processoCount = items.filter(i => i.type === 'processo').length;
  const doneCount = items.filter(i => i.status === 'Concluído').length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Plano de Ação</CardTitle>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Badge variant="outline" className="h-4 px-1.5 text-[9px] gap-0.5">
              <Megaphone className="h-2.5 w-2.5" />
              {midiaCount}
            </Badge>
            <Badge variant="outline" className="h-4 px-1.5 text-[9px] gap-0.5">
              <Settings2 className="h-2.5 w-2.5" />
              {processoCount}
            </Badge>
            <Badge variant="outline" className="h-4 px-1.5 text-[9px] gap-0.5 text-emerald-600 border-emerald-200">
              <CheckCircle2 className="h-2.5 w-2.5" />
              {doneCount}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Daily Checklist */}
        {dailyChecklist.length > 0 && (
          <div className="p-2 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1.5">
              ✨ Checklist do Dia (Top 3)
            </p>
            <div className="space-y-1">
              {dailyChecklist.map((action, idx) => (
                <div key={action.id} className="flex items-center gap-2 text-xs">
                  <span className="text-primary font-bold">{idx + 1}.</span>
                  <span className="truncate flex-1">{action.title}</span>
                  <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1", 
                    action.type === 'midia' ? 'text-blue-600' : 'text-purple-600'
                  )}>
                    {action.type === 'midia' ? 'Mídia' : 'Proc'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3 h-7">
            <TabsTrigger value="all" className="text-xs">Todas ({items.length})</TabsTrigger>
            <TabsTrigger value="midia" className="text-xs">
              <Megaphone className="h-3 w-3 mr-1" />
              Mídia
            </TabsTrigger>
            <TabsTrigger value="processo" className="text-xs">
              <Settings2 className="h-3 w-3 mr-1" />
              Processo
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Add new item */}
        <div className="flex gap-1.5">
          <div className="flex-1 flex gap-1">
            <Input
              placeholder="Nova ação..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex gap-1">
            <Button
              variant={newType === 'midia' ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setNewType('midia')}
            >
              <Megaphone className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={newType === 'processo' ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setNewType('processo')}
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
            <Button onClick={addItem} size="sm" className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action items list */}
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhuma ação adicionada
            </p>
          ) : (
            filteredItems.map((item) => (
              <div 
                key={item.id} 
                className={cn(
                  "p-2 rounded-lg border bg-card text-xs transition-all",
                  item.status === 'Concluído' && "opacity-60"
                )}
              >
                <div className="flex items-start gap-2">
                  {/* Status toggle */}
                  <button
                    onClick={() => toggleStatus(item.id)}
                    className="mt-0.5 shrink-0"
                  >
                    {statusIcons[item.status]}
                  </button>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium leading-tight",
                      item.status === 'Concluído' && "line-through"
                    )}>
                      {item.title}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <Badge 
                        variant="outline" 
                        className={cn("text-[8px] h-3.5 px-1", priorityColors[item.priority])}
                      >
                        {item.priority}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={cn("text-[8px] h-3.5 px-1",
                          item.type === 'midia' 
                            ? 'text-blue-600 border-blue-200' 
                            : 'text-purple-600 border-purple-200'
                        )}
                      >
                        {item.type === 'midia' ? 'Mídia' : 'Processo'}
                      </Badge>
                      {item.stage && item.stage !== 'Geral' && (
                        <Badge variant="secondary" className="text-[8px] h-3.5 px-1">
                          {item.stage}
                        </Badge>
                      )}
                      {item.metricToWatch && (
                        <span className="text-[9px] text-muted-foreground">
                          📊 {item.metricToWatch}
                        </span>
                      )}
                    </div>
                    
                    {item.nextStep && (
                      <p className="text-[10px] text-muted-foreground mt-1 italic">
                        → {item.nextStep}
                      </p>
                    )}
                  </div>
                  
                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-50 hover:opacity-100 shrink-0"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        {items.length > 0 && (
          <div className="flex justify-between text-[10px] text-muted-foreground pt-2 border-t">
            <span>
              {doneCount} de {items.length} concluídas
            </span>
            <span>
              {Math.round((doneCount / items.length) * 100)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
