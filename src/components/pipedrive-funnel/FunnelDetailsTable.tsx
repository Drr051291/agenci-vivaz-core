import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { StageInfo } from './types';
import { Skeleton } from '@/components/ui/skeleton';

interface FunnelDetailsTableProps {
  conversions: Record<string, number>;
  allStages?: StageInfo[];
  loading?: boolean;
}

// Simplify stage name for display
function simplifyName(name: string): string {
  const simplified = name.replace(/\s*\(.*?\)/g, '').trim();
  return simplified;
}

export function FunnelDetailsTable({ conversions, allStages = [], loading = false }: FunnelDetailsTableProps) {
  const [open, setOpen] = useState(false);

  // Build transitions dynamically from ALL stages
  const transitions = allStages.slice(0, -1).map((stage, index) => ({
    from: stage,
    to: allStages[index + 1],
    key: `${stage.id}_${allStages[index + 1].id}`,
  }));

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-between text-muted-foreground hover:text-foreground"
        >
          <span className="text-xs font-medium">Detalhes do período</span>
          <ChevronDown className={cn(
            'h-4 w-4 transition-transform',
            open && 'rotate-180'
          )} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-2">
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">Transição</TableHead>
                <TableHead className="text-xs text-right">Taxa de Conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transitions.map((transition) => {
                // Try multiple key formats
                const fromName = transition.from.name.toLowerCase().split(' ')[0].split('(')[0];
                const toName = transition.to.name.toLowerCase().split(' ')[0].split('(')[0];
                const namedKey = `${fromName}_to_${toName}`;
                const rate = conversions[transition.key] ?? conversions[namedKey] ?? 0;
                
                return (
                  <TableRow key={transition.key}>
                    <TableCell className="text-xs py-2">
                      {simplifyName(transition.from.name)} → {simplifyName(transition.to.name)}
                    </TableCell>
                    <TableCell className="text-xs text-right py-2 font-medium">
                      {loading ? (
                        <Skeleton className="h-4 w-12 ml-auto" />
                      ) : (
                        <span className={cn(
                          rate > 0 ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {rate.toFixed(1)}%
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {transitions.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={2} className="text-xs text-center text-muted-foreground py-4">
                    Nenhuma transição disponível
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex items-start gap-2 mt-3 p-3 bg-muted/30 rounded-lg">
          <Info className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Deals podem pular etapas; a conversão considera movimentações registradas no período selecionado. 
            Dados obtidos via API do Pipedrive.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
