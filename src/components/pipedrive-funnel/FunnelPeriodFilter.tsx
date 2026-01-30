import { useState, useMemo } from 'react';
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
import { cn } from '@/lib/utils';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PeriodPreset, DateRange } from './types';

interface FunnelPeriodFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
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
  { value: 'custom', label: 'Personalizado' },
];

export function FunnelPeriodFilter({
  dateRange,
  onDateRangeChange,
}: FunnelPeriodFilterProps) {
  const [activePreset, setActivePreset] = useState<PeriodPreset>('thisMonth');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const displayLabel = useMemo(() => {
    if (activePreset === 'custom') {
      return `${format(dateRange.start, 'dd/MM', { locale: ptBR })} - ${format(dateRange.end, 'dd/MM/yy', { locale: ptBR })}`;
    }
    const preset = PRESETS.find(p => p.value === activePreset);
    return preset?.label || 'Selecione';
  }, [activePreset, dateRange]);

  const handlePresetChange = (value: string) => {
    const preset = PRESETS.find(p => p.value === value);
    if (!preset) return;

    setActivePreset(preset.value);
    
    if (preset.value === 'custom') {
      setCalendarOpen(true);
      return;
    }

    if (preset.getRange) {
      const range = preset.getRange();
      onDateRangeChange(range);
    }
  };

  const handleCalendarSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      onDateRangeChange({ start: range.from, end: range.to });
      setActivePreset('custom');
      setCalendarOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Período:</span>
      
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <Select value={activePreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Selecione o período">
                {displayLabel}
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value} className="text-xs">
                {preset.label}
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
            defaultMonth={dateRange.start}
            selected={{ from: dateRange.start, to: dateRange.end }}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
