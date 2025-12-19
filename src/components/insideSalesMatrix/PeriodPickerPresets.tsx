import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface PeriodRange {
  startDate: Date;
  endDate: Date;
  preset: string;
}

interface PeriodPickerPresetsProps {
  value: PeriodRange | null;
  onChange: (range: PeriodRange) => void;
}

const PRESETS = [
  { id: 'last_7', label: 'Últimos 7 dias' },
  { id: 'last_30', label: 'Últimos 30 dias' },
  { id: 'this_month', label: 'Este mês' },
  { id: 'this_year', label: 'Este ano' },
  { id: 'custom', label: 'Personalizado' },
];

function getPresetDates(presetId: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  switch (presetId) {
    case 'last_7':
      return { startDate: subDays(now, 7), endDate: now };
    case 'last_30':
      return { startDate: subDays(now, 30), endDate: now };
    case 'this_month':
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    case 'this_year':
      return { startDate: startOfYear(now), endDate: endOfYear(now) };
    default:
      return { startDate: now, endDate: now };
  }
}

export function PeriodPickerPresets({
  value,
  onChange,
}: PeriodPickerPresetsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>(value?.startDate);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(value?.endDate);
  const [selectedPreset, setSelectedPreset] = useState(value?.preset || '');

  const displayLabel = useMemo(() => {
    if (!value) return 'Selecione o período';
    const startStr = format(value.startDate, 'dd MMM', { locale: ptBR });
    const endStr = format(value.endDate, 'dd MMM yyyy', { locale: ptBR });
    return `${startStr} – ${endStr}`;
  }, [value]);

  function handlePresetSelect(presetId: string) {
    if (presetId === 'custom') {
      setSelectedPreset('custom');
      return;
    }
    const dates = getPresetDates(presetId);
    setSelectedPreset(presetId);
    onChange({ ...dates, preset: presetId });
    setIsOpen(false);
  }

  function handleApplyCustom() {
    if (customStart && customEnd) {
      onChange({
        startDate: customStart,
        endDate: customEnd,
        preset: 'custom',
      });
      setIsOpen(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1">
        <CalendarDays className="h-3.5 w-3.5" />
        Período <span className="text-destructive">*</span>
      </Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between font-normal"
          >
            <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
              {displayLabel}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="space-y-3">
            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Badge
                  key={preset.id}
                  variant={selectedPreset === preset.id ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => handlePresetSelect(preset.id)}
                >
                  {preset.label}
                </Badge>
              ))}
            </div>

            {/* Custom date picker */}
            {selectedPreset === 'custom' && (
              <div className="space-y-3 pt-2 border-t">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Início</Label>
                    <Calendar
                      mode="single"
                      selected={customStart}
                      onSelect={setCustomStart}
                      className="rounded-md border p-0"
                      locale={ptBR}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fim</Label>
                    <Calendar
                      mode="single"
                      selected={customEnd}
                      onSelect={setCustomEnd}
                      className="rounded-md border p-0"
                      locale={ptBR}
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleApplyCustom}
                  disabled={!customStart || !customEnd}
                  className="w-full"
                >
                  Aplicar
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function formatPeriodLabel(range: PeriodRange | null): string {
  if (!range) return '';
  const startStr = format(range.startDate, 'dd', { locale: ptBR });
  const endStr = format(range.endDate, 'dd MMM yyyy', { locale: ptBR });
  return `${startStr}–${endStr}`;
}
