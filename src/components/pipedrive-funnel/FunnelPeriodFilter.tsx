import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { CalendarIcon, ChevronDown, Check } from 'lucide-react';
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
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({ 
    from: dateRange.start, 
    to: dateRange.end 
  });

  const displayLabel = useMemo(() => {
    if (activePreset === 'custom') {
      return `${format(dateRange.start, 'dd/MM/yy', { locale: ptBR })} - ${format(dateRange.end, 'dd/MM/yy', { locale: ptBR })}`;
    }
    const preset = PRESETS.find(p => p.value === activePreset);
    return preset?.label || 'Selecione';
  }, [activePreset, dateRange]);

  const handlePresetClick = (preset: PresetConfig) => {
    if (preset.value === 'custom') {
      setIsOpen(false);
      setTempRange({ from: dateRange.start, to: dateRange.end });
      setShowCustomDialog(true);
      return;
    }

    setActivePreset(preset.value);
    onPresetChange?.(preset.value);
    
    if (preset.getRange) {
      const range = preset.getRange();
      onDateRangeChange(range, preset.value);
    }
    setIsOpen(false);
  };

  const handleApplyCustomRange = () => {
    if (tempRange.from && tempRange.to) {
      onDateRangeChange({ start: tempRange.from, end: tempRange.to }, 'custom');
      setActivePreset('custom');
      onPresetChange?.('custom');
      setShowCustomDialog(false);
    }
  };

  const handleCalendarSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range) {
      setTempRange(range);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Período:</span>
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs gap-1.5 min-w-[160px] justify-between"
            >
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {displayLabel}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-1" align="start" sideOffset={4}>
            <div className="flex flex-col">
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors text-left",
                    "hover:bg-muted",
                    activePreset === preset.value && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <span>{preset.label}</span>
                  {activePreset === preset.value && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Custom Date Range Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Selecionar período personalizado</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="flex justify-center border rounded-lg p-2">
              <Calendar
                mode="range"
                defaultMonth={tempRange.from || dateRange.start}
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
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
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