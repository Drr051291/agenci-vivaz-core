import { useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface FinancialPeriodFilterProps {
  startDate: Date;
  endDate: Date;
  onPeriodChange: (startDate: Date, endDate: Date) => void;
}

export function FinancialPeriodFilter({
  startDate,
  endDate,
  onPeriodChange,
}: FinancialPeriodFilterProps) {
  const [localStartDate, setLocalStartDate] = useState<Date>(startDate);
  const [localEndDate, setLocalEndDate] = useState<Date>(endDate);

  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      setLocalStartDate(date);
      onPeriodChange(date, localEndDate);
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      setLocalEndDate(date);
      onPeriodChange(localStartDate, date);
    }
  };

  const setCurrentMonth = () => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    setLocalStartDate(start);
    setLocalEndDate(end);
    onPeriodChange(start, end);
  };

  const setLastMonth = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const start = startOfMonth(lastMonth);
    const end = endOfMonth(lastMonth);
    setLocalStartDate(start);
    setLocalEndDate(end);
    onPeriodChange(start, end);
  };

  const setLast3Months = () => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const start = startOfMonth(threeMonthsAgo);
    const end = endOfMonth(now);
    setLocalStartDate(start);
    setLocalEndDate(end);
    onPeriodChange(start, end);
  };

  return (
    <div className="flex flex-wrap gap-3 items-center border rounded-lg p-3 bg-muted/30">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Período:</span>
      </div>

      {/* Botões de Atalho */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={setCurrentMonth}
          className="h-8"
        >
          Mês Atual
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={setLastMonth}
          className="h-8"
        >
          Mês Passado
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={setLast3Months}
          className="h-8"
        >
          Últimos 3 Meses
        </Button>
      </div>

      {/* Data Início */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[160px] justify-start text-left font-normal",
              !localStartDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(localStartDate, "dd/MM/yyyy", { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={localStartDate}
            onSelect={handleStartDateChange}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
            disabled={(date) => date > localEndDate}
          />
        </PopoverContent>
      </Popover>

      <span className="text-sm text-muted-foreground">até</span>

      {/* Data Fim */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[160px] justify-start text-left font-normal",
              !localEndDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(localEndDate, "dd/MM/yyyy", { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={localEndDate}
            onSelect={handleEndDateChange}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
            disabled={(date) => date < localStartDate}
          />
        </PopoverContent>
      </Popover>

      {/* Indicador visual */}
      <Badge variant="secondary" className="ml-2">
        {format(localStartDate, "dd MMM", { locale: ptBR })} -{" "}
        {format(localEndDate, "dd MMM yyyy", { locale: ptBR })}
      </Badge>
    </div>
  );
}
