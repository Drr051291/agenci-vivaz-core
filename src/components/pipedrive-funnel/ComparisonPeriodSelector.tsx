import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { GitCompareArrows } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ComparisonPreset, 
  ComparisonConfig, 
  PeriodPreset 
} from './types';
import { getAutoComparisonDescription } from './comparisonUtils';

interface ComparisonPeriodSelectorProps {
  config: ComparisonConfig;
  onConfigChange: (config: ComparisonConfig) => void;
  periodPreset: PeriodPreset;
  className?: string;
}

interface PresetOption {
  value: ComparisonPreset;
  label: string;
  description?: string;
}

export function ComparisonPeriodSelector({
  config,
  onConfigChange,
  periodPreset,
  className,
}: ComparisonPeriodSelectorProps) {
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({});

  const autoDescription = getAutoComparisonDescription(periodPreset);

  const presetOptions: PresetOption[] = [
    { value: 'auto', label: 'Automático', description: autoDescription },
    { value: 'previousMonth', label: 'Mês anterior' },
    { value: 'previousQuarter', label: 'Trimestre passado' },
    { value: 'sameLastYear', label: 'Mesmo período ano passado' },
    { value: 'custom', label: 'Personalizado...' },
  ];

  const handleToggle = (enabled: boolean) => {
    onConfigChange({
      ...config,
      enabled,
      preset: enabled ? 'auto' : 'off',
    });
  };

  const handlePresetChange = (value: string) => {
    const preset = value as ComparisonPreset;
    
    if (preset === 'custom') {
      setTempRange({ 
        from: config.customRange?.start, 
        to: config.customRange?.end 
      });
      setShowCustomDialog(true);
      return;
    }

    onConfigChange({
      ...config,
      preset,
      customRange: undefined,
    });
  };

  const handleCalendarSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range) {
      setTempRange(range);
    }
  };

  const handleApplyCustomRange = () => {
    if (tempRange.from && tempRange.to) {
      onConfigChange({
        ...config,
        preset: 'custom',
        customRange: { start: tempRange.from, end: tempRange.to },
      });
      setShowCustomDialog(false);
    }
  };

  const displayLabel = () => {
    if (!config.enabled) return 'Desligado';
    
    const preset = presetOptions.find(p => p.value === config.preset);
    
    if (config.preset === 'auto') {
      return `Auto (${autoDescription})`;
    }
    
    if (config.preset === 'custom' && config.customRange) {
      return `${format(config.customRange.start, 'dd/MM', { locale: ptBR })} - ${format(config.customRange.end, 'dd/MM', { locale: ptBR })}`;
    }
    
    return preset?.label || 'Selecione';
  };

  return (
    <>
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex items-center gap-1.5">
          <Switch 
            id="comparison-toggle"
            checked={config.enabled}
            onCheckedChange={handleToggle}
            className="h-4 w-7"
          />
          <Label 
            htmlFor="comparison-toggle" 
            className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"
          >
            <GitCompareArrows className="h-3 w-3" />
            Comparar
          </Label>
        </div>

        {config.enabled && (
          <Select 
            value={config.preset} 
            onValueChange={handlePresetChange}
            disabled={!config.enabled}
          >
            <SelectTrigger className="w-[180px] h-7 text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <SelectValue placeholder="Período">
                  {displayLabel()}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent>
              {presetOptions.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value} 
                  className="text-xs"
                >
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="text-[10px] text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Custom Date Range Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Período de comparação personalizado</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="flex justify-center border rounded-lg p-2">
              <Calendar
                mode="range"
                defaultMonth={tempRange.from}
                selected={tempRange.from && tempRange.to ? { from: tempRange.from, to: tempRange.to } : tempRange.from ? { from: tempRange.from, to: undefined } : undefined}
                onSelect={handleCalendarSelect}
                numberOfMonths={2}
                locale={ptBR}
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4",
                  day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer",
                }}
                className="p-3 pointer-events-auto"
              />
            </div>
            
            {/* Selected range display */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Início:</span>
                  <span className="font-medium">
                    {tempRange.from 
                      ? format(tempRange.from, 'dd MMM yyyy', { locale: ptBR })
                      : '—'}
                  </span>
                </div>
                <div className="text-muted-foreground">→</div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Fim:</span>
                  <span className="font-medium">
                    {tempRange.to 
                      ? format(tempRange.to, 'dd MMM yyyy', { locale: ptBR })
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleApplyCustomRange}
              disabled={!tempRange.from || !tempRange.to}
            >
              Aplicar período
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
