import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Link2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LinkExistingTaskPopoverProps {
  clientId: string;
  excludeIds: string[];
  onLink: (taskId: string, taskTitle: string) => Promise<void> | void;
}

interface TaskOption {
  id: string;
  title: string;
  status: string;
  category: string | null;
}

export function LinkExistingTaskPopover({ clientId, excludeIds, onLink }: LinkExistingTaskPopoverProps) {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !clientId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tasks")
        .select("id, title, status, category")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(100);
      setTasks((data || []).filter((t) => !excludeIds.includes(t.id)));
      setLoading(false);
    };
    fetch();
  }, [open, clientId, excludeIds]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Link2 className="h-3.5 w-3.5 mr-1.5" />
          Vincular existente
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Command>
          <CommandInput placeholder="Buscar atividade..." />
          <CommandList>
            {loading ? (
              <div className="p-4 flex justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <CommandEmpty>Nenhuma atividade encontrada</CommandEmpty>
                <CommandGroup>
                  {tasks.map((t) => (
                    <CommandItem
                      key={t.id}
                      value={`${t.title} ${t.id}`}
                      onSelect={async () => {
                        await onLink(t.id, t.title);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate flex-1">{t.title}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {t.status}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
