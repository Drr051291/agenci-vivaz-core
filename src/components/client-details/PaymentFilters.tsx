import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PaymentFiltersProps {
  onFilterChange: (filters: PaymentFilterState) => void;
}

export interface PaymentFilterState {
  status: string;
  startDate?: Date;
  endDate?: Date;
}

export function PaymentFilters({ onFilterChange }: PaymentFiltersProps) {
  const [status, setStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const handleStatusChange = (value: string) => {
    setStatus(value);
    onFilterChange({ status: value, startDate, endDate });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    onFilterChange({ status, startDate: date, endDate });
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    onFilterChange({ status, startDate, endDate: date });
  };

  const clearFilters = () => {
    setStatus("all");
    setStartDate(undefined);
    setEndDate(undefined);
    onFilterChange({ status: "all", startDate: undefined, endDate: undefined });
  };

  const hasActiveFilters = status !== "all" || startDate || endDate;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Filtros:</span>
      </div>

      {/* Filtro de Status */}
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Status</SelectItem>
          <SelectItem value="PENDING">Pendente</SelectItem>
          <SelectItem value="CONFIRMED">Confirmado</SelectItem>
          <SelectItem value="RECEIVED">Recebido</SelectItem>
          <SelectItem value="OVERDUE">Vencido</SelectItem>
          <SelectItem value="REFUNDED">Reembolsado</SelectItem>
        </SelectContent>
      </Select>

      {/* Data Início */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[160px] justify-start text-left font-normal",
              !startDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Data início"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={handleStartDateChange}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
            disabled={(date) => endDate ? date > endDate : false}
          />
        </PopoverContent>
      </Popover>

      {/* Data Fim */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[160px] justify-start text-left font-normal",
              !endDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Data fim"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={handleEndDateChange}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
            disabled={(date) => startDate ? date < startDate : false}
          />
        </PopoverContent>
      </Popover>

      {/* Limpar Filtros */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9"
        >
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}

      {/* Indicadores de Filtros Ativos */}
      <div className="flex gap-2 flex-wrap">
        {status !== "all" && (
          <Badge variant="secondary" className="gap-1">
            Status: {status}
          </Badge>
        )}
        {startDate && (
          <Badge variant="secondary" className="gap-1">
            De: {format(startDate, "dd/MM/yyyy", { locale: ptBR })}
          </Badge>
        )}
        {endDate && (
          <Badge variant="secondary" className="gap-1">
            Até: {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
          </Badge>
        )}
      </div>
    </div>
  );
}
