import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Loader2, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TASK_CATEGORIES } from "@/lib/taskCategories";
import { parseLocalDate } from "@/lib/dateUtils";

interface Profile {
  id: string;
  full_name: string;
}

interface QuickCreateTaskFormProps {
  profiles: Profile[];
  onSubmit: (data: {
    title: string;
    assigned_to?: string | null;
    due_date?: string | null;
    priority: string;
    category: string;
    owner_type: "vivaz" | "client";
  }) => Promise<void> | void;
  onCancel?: () => void;
  defaultStatus?: string;
}

export function QuickCreateTaskForm({ profiles, onSubmit, onCancel }: QuickCreateTaskFormProps) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("outros");
  const [ownerType, setOwnerType] = useState<"vivaz" | "client">("vivaz");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSubmit({
      title: title.trim(),
      assigned_to: assignee || null,
      due_date: dueDate || null,
      priority,
      category,
      owner_type: ownerType,
    });
    setSaving(false);
    setTitle("");
    setAssignee("");
    setDueDate("");
  };

  return (
    <div className="space-y-2.5 p-3 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Nova atividade</h4>
        {onCancel && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="O que precisa ser feito?"
        className="h-8 text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim() && !saving) handleSubmit();
        }}
      />

      <div className="grid grid-cols-2 gap-2">
        <Select value={ownerType} onValueChange={(v) => setOwnerType(v as "vivaz" | "client")}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vivaz">Vivaz</SelectItem>
            <SelectItem value="client">Cliente</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select value={assignee || "__none__"} onValueChange={(v) => setAssignee(v === "__none__" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sem responsável</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TASK_CATEGORIES).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full h-8 justify-start text-xs font-normal">
            <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
            {dueDate ? format(parseLocalDate(dueDate), "dd 'de' MMM, yyyy", { locale: ptBR }) : "Definir prazo (opcional)"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dueDate ? parseLocalDate(dueDate) : undefined}
            onSelect={(d) => {
              if (d) setDueDate(format(d, "yyyy-MM-dd"));
            }}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <Button onClick={handleSubmit} disabled={saving || !title.trim()} size="sm" className="w-full h-8">
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="h-3.5 w-3.5 mr-1.5" />Criar atividade</>}
      </Button>
    </div>
  );
}
