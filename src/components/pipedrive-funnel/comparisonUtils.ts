import { 
  subDays, 
  subWeeks, 
  subMonths, 
  subQuarters, 
  subYears, 
  startOfMonth, 
  endOfMonth, 
  startOfQuarter, 
  endOfQuarter,
  differenceInDays,
  format
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange, PeriodPreset, ComparisonPreset, ComparisonConfig } from './types';

/**
 * Calculates the automatic comparison range based on the current range and preset
 */
export function getAutoComparisonRange(
  currentRange: DateRange, 
  periodPreset: PeriodPreset
): DateRange {
  const { start, end } = currentRange;
  
  switch (periodPreset) {
    case 'today':
      return { 
        start: subDays(start, 1), 
        end: subDays(end, 1) 
      };
    
    case 'thisWeek':
      return { 
        start: subWeeks(start, 1), 
        end: subWeeks(end, 1) 
      };
    
    case 'last7Days':
      return { 
        start: subDays(start, 7), 
        end: subDays(end, 7) 
      };
    
    case 'last14Days':
      return { 
        start: subDays(start, 14), 
        end: subDays(end, 14) 
      };
    
    case 'thisMonth':
      // Compare same period of previous month (day 1 to day X)
      // e.g., if today is Feb 5 and range is Feb 1-5, compare with Jan 1-5
      const daysInPeriod = differenceInDays(end, start);
      const prevMonthStart = subMonths(start, 1);
      return { 
        start: startOfMonth(prevMonthStart), 
        end: subDays(subMonths(end, 1), 0) // Same day of previous month
      };
    
    case 'lastMonth':
      const twoMonthsAgoStart = subMonths(start, 1);
      return { 
        start: startOfMonth(twoMonthsAgoStart), 
        end: endOfMonth(twoMonthsAgoStart) 
      };
    
    case 'thisYear':
      return { 
        start: subYears(start, 1), 
        end: subYears(end, 1) 
      };
    
    case 'custom':
    default:
      // For custom periods, use the same duration immediately before
      const durationDays = differenceInDays(end, start) + 1;
      return { 
        start: subDays(start, durationDays), 
        end: subDays(start, 1) 
      };
  }
}

/**
 * Gets the comparison range based on comparison config
 */
export function getComparisonRange(
  currentRange: DateRange,
  periodPreset: PeriodPreset,
  comparisonConfig: ComparisonConfig
): DateRange | null {
  if (!comparisonConfig.enabled || comparisonConfig.preset === 'off') {
    return null;
  }
  
  switch (comparisonConfig.preset) {
    case 'auto':
      return getAutoComparisonRange(currentRange, periodPreset);
    
    case 'previousMonth':
      const prevMonthStart = subMonths(currentRange.start, 1);
      return {
        start: startOfMonth(prevMonthStart),
        end: endOfMonth(prevMonthStart)
      };
    
    case 'previousQuarter':
      const prevQuarterStart = subQuarters(currentRange.start, 1);
      return {
        start: startOfQuarter(prevQuarterStart),
        end: endOfQuarter(prevQuarterStart)
      };
    
    case 'sameLastYear':
      return {
        start: subYears(currentRange.start, 1),
        end: subYears(currentRange.end, 1)
      };
    
    case 'custom':
      return comparisonConfig.customRange || null;
    
    default:
      return null;
  }
}

/**
 * Calculates percentage variation between two values
 * Returns null if previous is 0 (cannot calculate)
 */
export function calculateVariation(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? 100 : null; // 100% increase if from 0, or N/A
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Calculates variation in percentage points (for conversion rates)
 * E.g., 42% - 45% = -3pp
 */
export function calculatePointsVariation(currentRate: number, previousRate: number): number {
  return currentRate - previousRate;
}

/**
 * Determines the trend based on variation
 */
export function getTrend(
  variation: number | null, 
  threshold: number = 2
): 'up' | 'down' | 'stable' {
  if (variation === null) return 'stable';
  if (variation > threshold) return 'up';
  if (variation < -threshold) return 'down';
  return 'stable';
}

/**
 * Formats variation for display
 */
export function formatVariation(variation: number | null, isPercentagePoints = false): string {
  if (variation === null) return '—';
  
  const sign = variation > 0 ? '+' : '';
  const suffix = isPercentagePoints ? 'pp' : '%';
  
  // For small values, show more precision
  const formatted = Math.abs(variation) < 1 && variation !== 0
    ? variation.toFixed(1)
    : Math.round(variation).toString();
  
  return `${sign}${formatted}${suffix}`;
}

/**
 * Gets the comparison period label for display
 */
export function getComparisonLabel(
  periodPreset: PeriodPreset,
  comparisonPreset: ComparisonPreset,
  comparisonRange?: DateRange | null
): string {
  switch (comparisonPreset) {
    case 'off':
      return '';
    
    case 'auto':
      switch (periodPreset) {
        case 'today':
          return 'vs ontem';
        case 'thisWeek':
          return 'vs semana passada';
        case 'last7Days':
          return 'vs 7 dias anteriores';
        case 'last14Days':
          return 'vs 14 dias anteriores';
        case 'thisMonth':
          return 'vs mês passado';
        case 'lastMonth':
          return 'vs mês anterior';
        case 'thisYear':
          return 'vs ano passado';
        case 'custom':
        default:
          return 'vs período anterior';
      }
    
    case 'previousMonth':
      return 'vs mês passado';
    
    case 'previousQuarter':
      return 'vs trimestre passado';
    
    case 'sameLastYear':
      return 'vs mesmo período ano anterior';
    
    case 'custom':
      if (comparisonRange) {
        return `vs ${format(comparisonRange.start, 'dd/MM', { locale: ptBR })} - ${format(comparisonRange.end, 'dd/MM', { locale: ptBR })}`;
      }
      return 'vs período personalizado';
    
    default:
      return '';
  }
}

/**
 * Gets the auto comparison description for the selector
 */
export function getAutoComparisonDescription(periodPreset: PeriodPreset): string {
  switch (periodPreset) {
    case 'today':
      return 'Ontem';
    case 'thisWeek':
      return 'Semana passada';
    case 'last7Days':
      return '7 dias anteriores';
    case 'last14Days':
      return '14 dias anteriores';
    case 'thisMonth':
      return 'Mês passado';
    case 'lastMonth':
      return 'Mês retrasado';
    case 'thisYear':
      return 'Ano passado';
    case 'custom':
    default:
      return 'Mesmo intervalo anterior';
  }
}
