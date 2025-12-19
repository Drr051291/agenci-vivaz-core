import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, GripVertical, Megaphone, Users, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionItemV2 {
  id: string;
  title: string;
  stage: string;
  type: 'midia' | 'processo';
  priority: 'Alta' | 'Média' | 'Baixa';
  status: 'A Fazer' | 'Em Andamento' | 'Concluído';
  metricFocus?: string;
  nextStep?: string;
}

interface ActionPlanV2Props {
  items: ActionItemV2[];
  onChange: (items: ActionItemV2[]) => void;
}

const priorityColors = {
  Alta: 'bg-red-500/10 text-red-600 border-red-500/20',
  Média: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  Baixa: 'bg-green-500/10 text-green-600 border-green-500/20',
};

export function ActionPlanV2({ items, onChange }: ActionPlanV2Props) {
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'midia' | 'processo'>('processo');
  const [activeTab, setActiveTab] = useState<'all' | 'midia' | 'processo'>('all');

  const addItem = () => {
    if (!newTitle.trim()) return;
    const newItem: ActionItemV2 = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      stage: '',
      type: newType,
      priority: 'Média',
      status: 'A Fazer',
    };
    onChange([...items, newItem]);
    setNewTitle('');
  };

  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ActionItemV2, value: string) => {
    onChange(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const toggleStatus = (id: string) => {
    const statusFlow: Record<ActionItemV2['status'], ActionItemV2['status']> = {
      'A Fazer': 'Em Andamento',
      'Em Andamento': 'Concluído',
      'Concluído': 'A Fazer',
    };
    const item = items.find(i => i.id === id);
    if (item) {
      updateItem(id, 'status', statusFlow[item.status]);
    }
  };

  // Filter items by tab
  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return items;
    return items.filter(i => i.type === activeTab);
  }, [items, activeTab]);

  // Daily checklist - top 3 high priority items not done
  const dailyChecklist = useMemo(() => {
    return items
      .filter(i => i.status !== 'Concluído' && i.priority === 'Alta')
      .slice(0, 3);
  }, [items]);

  const midiaCount = items.filter(i => i.type === 'midia').length;
  const processoCount = items.filter(i => i.type === 'processo').length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Plano de Ação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Daily checklist */}
        {dailyChecklist.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <CheckSquare className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">Checklist do dia</span>
            </div>
            <div className="space-y-1.5">
              {dailyChecklist.map(item => (
                <div key={item.id} className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={item.status === 'Concluído'}
                    onCheckedChange={() => toggleStatus(item.id)}
                  />
                  <span className="flex-1 truncate">{item.title}</span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1">
                    {item.type === 'midia' ? 'Mídia' : 'Processo'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="h-8 w-full">
            <TabsTrigger value="all" className="flex-1 text-xs h-7">
              Todos ({items.length})
            </TabsTrigger>
            <TabsTrigger value="midia" className="flex-1 text-xs h-7 gap-1">
              <Megaphone className="h-3 w-3" />
              Mídia ({midiaCount})
            </TabsTrigger>
            <TabsTrigger value="processo" className="flex-1 text-xs h-7 gap-1">
              <Users className="h-3 w-3" />
              Processo ({processoCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-3 space-y-2">
            {/* Add new item */}
            <div className="flex gap-2">
              <div className="flex-1 flex gap-1.5">
                <Select value={newType} onValueChange={(v: 'midia' | 'processo') => setNewType(v)}>
                  <SelectTrigger className="w-24 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="midia">
                      <span className="flex items-center gap-1">
                        <Megaphone className="h-3 w-3" /> Mídia
                      </span>
                    </SelectItem>
                    <SelectItem value="processo">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> Processo
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Adicionar ação..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addItem()}
                  className="flex-1 h-9"
                />
              </div>
              <Button size="sm" onClick={addItem} disabled={!newTitle.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Items list */}
            {filteredItems.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {activeTab === 'all' 
                  ? 'Nenhuma ação adicionada. Use o diagnóstico ou adicione manualmente.'
                  : `Nenhuma ação de ${activeTab === 'midia' ? 'Mídia' : 'Processo'} adicionada.`
                }
              </p>
            ) : (
              <div className="space-y-1.5">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-start gap-2 p-2 rounded-lg border bg-card",
                      item.status === 'Concluído' && "opacity-50"
                    )}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/30 cursor-grab shrink-0 mt-0.5" />
                    
                    <Checkbox
                      checked={item.status === 'Concluído'}
                      onCheckedChange={() => toggleStatus(item.id)}
                      className="mt-0.5"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge variant="outline" className={cn(
                          "text-[9px] px-1 py-0 h-4 gap-0.5",
                          item.type === 'midia' ? "border-blue-500/30 text-blue-600" : "border-purple-500/30 text-purple-600"
                        )}>
                          {item.type === 'midia' ? <Megaphone className="h-2.5 w-2.5" /> : <Users className="h-2.5 w-2.5" />}
                          {item.type === 'midia' ? 'Mídia' : 'Processo'}
                        </Badge>
                        {item.stage && (
                          <span className="text-[10px] text-muted-foreground">{item.stage}</span>
                        )}
                      </div>
                      <p className={cn(
                        "text-sm leading-tight",
                        item.status === 'Concluído' && "line-through"
                      )}>
                        {item.title}
                      </p>
                      {item.metricFocus && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Métrica: {item.metricFocus}
                        </p>
                      )}
                      {item.nextStep && (
                        <p className="text-[10px] text-primary mt-0.5">
                          → {item.nextStep}
                        </p>
                      )}
                    </div>

                    <Select
                      value={item.priority}
                      onValueChange={(v) => updateItem(item.id, 'priority', v)}
                    >
                      <SelectTrigger className="h-6 w-16 text-[10px] border-0 bg-transparent p-0">
                        <Badge variant="outline" className={cn("text-[9px] px-1.5", priorityColors[item.priority])}>
                          {item.priority}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alta">Alta</SelectItem>
                        <SelectItem value="Média">Média</SelectItem>
                        <SelectItem value="Baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeItem(item.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {items.length > 0 && (
          <div className="flex justify-between text-[10px] text-muted-foreground pt-2 border-t">
            <span>{items.filter(i => i.status === 'Concluído').length}/{items.length} concluídas</span>
            <span>{items.filter(i => i.priority === 'Alta' && i.status !== 'Concluído').length} alta prioridade pendentes</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
