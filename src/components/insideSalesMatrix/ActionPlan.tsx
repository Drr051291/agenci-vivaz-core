import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, GripVertical } from "lucide-react";

export interface ActionItem {
  id: string;
  title: string;
  stage: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  status: 'A Fazer' | 'Em Andamento' | 'Concluído';
}

interface ActionPlanProps {
  items: ActionItem[];
  onChange: (items: ActionItem[]) => void;
}

const priorityColors = {
  Alta: 'bg-red-500/10 text-red-600 border-red-500/20',
  Média: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  Baixa: 'bg-green-500/10 text-green-600 border-green-500/20',
};

export function ActionPlan({ items, onChange }: ActionPlanProps) {
  const [newTitle, setNewTitle] = useState('');

  const addItem = () => {
    if (!newTitle.trim()) return;
    const newItem: ActionItem = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      stage: '',
      priority: 'Média',
      status: 'A Fazer',
    };
    onChange([...items, newItem]);
    setNewTitle('');
  };

  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ActionItem, value: string) => {
    onChange(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const toggleStatus = (id: string) => {
    const statusFlow: Record<ActionItem['status'], ActionItem['status']> = {
      'A Fazer': 'Em Andamento',
      'Em Andamento': 'Concluído',
      'Concluído': 'A Fazer',
    };
    const item = items.find(i => i.id === id);
    if (item) {
      updateItem(id, 'status', statusFlow[item.status]);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Plano de Ação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add new item */}
        <div className="flex gap-2">
          <Input
            placeholder="Adicionar ação..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            className="flex-1 h-9"
          />
          <Button size="sm" onClick={addItem} disabled={!newTitle.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Items list */}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma ação adicionada. Clique em "+" no diagnóstico ou adicione manualmente.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-2 p-2 rounded-lg border bg-card ${
                  item.status === 'Concluído' ? 'opacity-50' : ''
                }`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab shrink-0" />
                
                <Checkbox
                  checked={item.status === 'Concluído'}
                  onCheckedChange={() => toggleStatus(item.id)}
                />

                <div className="flex-1 min-w-0">
                  <Input
                    value={item.title}
                    onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                    className={`h-7 border-0 p-0 text-sm focus-visible:ring-0 ${
                      item.status === 'Concluído' ? 'line-through' : ''
                    }`}
                  />
                  {item.stage && (
                    <span className="text-xs text-muted-foreground">{item.stage}</span>
                  )}
                </div>

                <Select
                  value={item.priority}
                  onValueChange={(v) => updateItem(item.id, 'priority', v)}
                >
                  <SelectTrigger className="h-7 w-20 text-xs border-0 bg-transparent">
                    <Badge variant="outline" className={`text-[10px] ${priorityColors[item.priority]}`}>
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
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(item.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>{items.filter(i => i.status === 'Concluído').length}/{items.length} concluídas</span>
            <span>{items.filter(i => i.priority === 'Alta').length} prioridade alta</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
