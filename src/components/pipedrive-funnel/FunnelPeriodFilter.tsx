import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PeriodPreset, DateRange } from './types';

interface FunnelPeriodFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange, preset?: PeriodPreset) => void;
  onPresetChange?: (preset: PeriodPreset) => void;
}

interface PresetConfig {
  value: PeriodPreset;
  label: string;
  getRange?: () => { start: Date; end: Date };
}

const PRESETS: PresetConfig[] = [
  { 
    value: 'today', 
    label: 'Hoje',
    getRange: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) })
  },
  { 
    value: 'yesterday', 
    label: 'Ontem',
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    }
  },
  { 
    value: 'thisWeek', 
    label: 'Esta semana',
    getRange: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 0 }), end: endOfWeek(new Date(), { weekStartsOn: 0 }) })
  },
  { 
    value: 'last7Days', 
    label: 'Últimos 7 dias',
    getRange: () => ({ start: startOfDay(subDays(new Date(), 6)), end: endOfDay(new Date()) })
  },
  { 
    value: 'last14Days', 
    label: 'Últimos 14 dias',
    getRange: () => ({ start: startOfDay(subDays(new Date(), 13)), end: endOfDay(new Date()) })
  },
  { 
    value: 'last30Days', 
    label: 'Últimos 30 dias',
    getRange: () => ({ start: startOfDay(subDays(new Date(), 29)), end: endOfDay(new Date()) })
  },
  { 
    value: 'last90Days', 
    label: 'Últimos 90 dias',
    getRange: () => ({ start: startOfDay(subDays(new Date(), 89)), end: endOfDay(new Date()) })
  },
  { 
    value: 'thisMonth', 
    label: 'Este mês',
    getRange: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })
  },
  { 
    value: 'lastMonth', 
    label: 'Mês passado',
    getRange: () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
  },
  { 
    value: 'thisYear', 
    label: 'Este ano',
    getRange: () => ({ start: startOfYear(new Date()), end: endOfYear(new Date()) })
  },
  { 
    value: 'lastYear', 
    label: 'Ano passado',
    getRange: () => {
      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
    }
  },
  { value: 'custom', label: 'Personalizado' },
];

export function FunnelPeriodFilter({
  dateRange,
  onDateRangeChange,
  onPresetChange,
}: FunnelPeriodFilterProps) {
  const [activePreset, setActivePreset] = useState<PeriodPreset>('thisMonth');
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({ 
    from: dateRange.start, 
    to: dateRange.end 
  });

  const displayLabel = useMemo(() => {
    if (activePreset === 'custom') {
      return `${format(dateRange.start, 'dd/MM', { locale: ptBR })} - ${format(dateRange.end, 'dd/MM/yy', { locale: ptBR })}`;
    }
    const preset = PRESETS.find(p => p.value === activePreset);
    return preset?.label || 'Selecione';
  }, [activePreset, dateRange]);

  const handlePresetClick = (preset: PresetConfig) => {
    setActivePreset(preset.value);
    onPresetChange?.(preset.value);
    
    if (preset.value === 'custom') {
      // Keep popover open for custom selection
      setTempRange({ from: dateRange.start, to: dateRange.end });
      return;
    }

    if (preset.getRange) {
      const range = preset.getRange();
      onDateRangeChange(range, preset.value);
      setIsOpen(false);
    }
  };

  const handleCalendarSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range) {
      setTempRange(range);
    }
  };

  const handleApplyCustomRange = () => {
    if (tempRange.from && tempRange.to) {
      onDateRangeChange({ start: tempRange.from, end: tempRange.to }, 'custom');
      setActivePreset('custom');
      setIsOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Período:</span>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs gap-1.5 min-w-[160px] justify-start"
          >
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
            {displayLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
          <div className="flex">
            {/* Presets sidebar */}
            <div className="border-r bg-muted/30 p-2 space-y-1 min-w-[140px]">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-2 py-1">
                Atalhos
              </p>
              {PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={activePreset === preset.value ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    "w-full justify-start text-xs h-7",
                    activePreset === preset.value && "bg-primary/10 text-primary font-medium"
                  )}
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            
            {/* Calendar area */}
            <div className="p-3">
              <Calendar
                mode="range"
                defaultMonth={dateRange.start}
                selected={tempRange.from && tempRange.to ? { from: tempRange.from, to: tempRange.to } : undefined}
                onSelect={handleCalendarSelect}
                numberOfMonths={2}
                locale={ptBR}
                className="pointer-events-auto"
              />
              
              {/* Footer with apply button */}
              <div className="flex items-center justify-between border-t pt-3 mt-3">
                <div className="text-xs text-muted-foreground">
                  {tempRange.from && tempRange.to ? (
                    <>
                      <span className="font-medium">{format(tempRange.from, 'dd MMM yyyy', { locale: ptBR })}</span>
                      <span className="mx-1">→</span>
                      <span className="font-medium">{format(tempRange.to, 'dd MMM yyyy', { locale: ptBR })}</span>
                    </>
                  ) : tempRange.from ? (
                    <span>Selecione a data final</span>
                  ) : (
                    <span>Selecione o período</span>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={handleApplyCustomRange}
                  disabled={!tempRange.from || !tempRange.to}
                  className="h-7 text-xs"
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
