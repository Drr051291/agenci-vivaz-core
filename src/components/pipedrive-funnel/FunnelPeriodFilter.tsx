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
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PeriodPreset, DateRange } from './types';

interface FunnelPeriodFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

const PRESETS: { value: PeriodPreset; label: string; days?: number }[] = [
  { value: '7d', label: 'Últimos 7 dias', days: 7 },
  { value: '30d', label: 'Últimos 30 dias', days: 30 },
  { value: '90d', label: 'Últimos 90 dias', days: 90 },
  { value: 'custom', label: 'Personalizado' },
];

export function FunnelPeriodFilter({
  dateRange,
  onDateRangeChange,
}: FunnelPeriodFilterProps) {
  const [activePreset, setActivePreset] = useState<PeriodPreset>('30d');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handlePresetClick = (preset: PeriodPreset, days?: number) => {
    setActivePreset(preset);
    
    if (preset === 'custom') {
      setCalendarOpen(true);
      return;
    }

    if (days) {
      const end = new Date();
      const start = subDays(end, days);
      onDateRangeChange({ start, end });
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
            onClick={() => handlePresetClick(preset.value, preset.days)}
          >
            {preset.label}
          </Button>
        )
      ))}
    </div>
  );
}
