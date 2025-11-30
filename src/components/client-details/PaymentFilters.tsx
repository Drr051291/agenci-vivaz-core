import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
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
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));

  // Pré-selecionar mês atual ao montar componente
  useEffect(() => {
    onFilterChange({ status: "all", startDate, endDate });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = (value: string) => {
    setStatus(value);
    onFilterChange({ status: value, startDate, endDate });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      setStartDate(date);
      onFilterChange({ status, startDate: date, endDate });
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      setEndDate(date);
      onFilterChange({ status, startDate, endDate: date });
    }
  };

  const setCurrentMonth = () => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    setStartDate(start);
    setEndDate(end);
    onFilterChange({ status, startDate: start, endDate: end });
  };

  const setLastMonth = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const start = startOfMonth(lastMonth);
    const end = endOfMonth(lastMonth);
    setStartDate(start);
    setEndDate(end);
    onFilterChange({ status, startDate: start, endDate: end });
  };

  const setLast3Months = () => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const start = startOfMonth(threeMonthsAgo);
    const end = endOfMonth(now);
    setStartDate(start);
    setEndDate(end);
    onFilterChange({ status, startDate: start, endDate: end });
  };

  const clearFilters = () => {
    setStatus("all");
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    setStartDate(start);
    setEndDate(end);
    onFilterChange({ status: "all", startDate: start, endDate: end });
  };

  const hasActiveFilters = status !== "all";

  return (
    <div className="space-y-3">
      {/* Filtros de Período */}
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
                "w-[160px] justify-start text-left font-normal"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(startDate, "dd/MM/yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={handleStartDateChange}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
              disabled={(date) => date > endDate}
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
                "w-[160px] justify-start text-left font-normal"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={handleEndDateChange}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
              disabled={(date) => date < startDate}
            />
          </PopoverContent>
        </Popover>

        {/* Badge visual do período */}
        <Badge variant="secondary" className="ml-2">
          {format(startDate, "dd MMM", { locale: ptBR })} -{" "}
          {format(endDate, "dd MMM yyyy", { locale: ptBR })}
        </Badge>
      </div>

      {/* Filtros de Status */}
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
        {status !== "all" && (
          <Badge variant="secondary" className="gap-1">
            Status: {status}
          </Badge>
        )}
      </div>
    </div>
  );
}
