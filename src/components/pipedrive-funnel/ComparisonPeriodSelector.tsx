import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { GitCompareArrows, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ComparisonPreset, 
  ComparisonConfig, 
  DateRange, 
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
  const [calendarOpen, setCalendarOpen] = useState(false);

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
      setCalendarOpen(true);
      onConfigChange({
        ...config,
        preset: 'custom',
      });
      return;
    }

    onConfigChange({
      ...config,
      preset,
      customRange: undefined,
    });
  };

  const handleCalendarSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      onConfigChange({
        ...config,
        preset: 'custom',
        customRange: { start: range.from, end: range.to },
      });
      setCalendarOpen(false);
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
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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
          
          {/* Calendar popover for custom dates */}
          <PopoverTrigger asChild>
            <span className="hidden" />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={config.customRange?.start}
              selected={config.customRange ? { 
                from: config.customRange.start, 
                to: config.customRange.end 
              } : undefined}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
