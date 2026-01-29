import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, endOfDay } from 'date-fns';
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

  const handlePresetClick = (preset: PresetConfig) => {
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
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground mr-1">Período:</span>
      
      {PRESETS.map((preset) => (
        preset.value === 'custom' ? (
          <Popover key={preset.value} open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={activePreset === 'custom' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
              >
                <CalendarIcon className="h-3 w-3 mr-1" />
                {activePreset === 'custom' 
                  ? `${format(dateRange.start, 'dd/MM', { locale: ptBR })} - ${format(dateRange.end, 'dd/MM', { locale: ptBR })}`
                  : preset.label
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
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
        ) : (
          <Button
            key={preset.value}
            variant={activePreset === preset.value ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => handlePresetClick(preset)}
          >
            {preset.label}
          </Button>
        )
      ))}
    </div>
  );
}
