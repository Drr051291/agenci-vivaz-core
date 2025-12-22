import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  allowDecimals?: boolean;
  decimalPlaces?: number;
}

// Parse formatted string to number
function parseFormattedValue(formatted: string): number {
  // Remove everything except digits and comma (decimal separator in pt-BR)
  const cleaned = formatted.replace(/[^\d,]/g, '');
  // Replace comma with dot for parsing
  const normalized = cleaned.replace(',', '.');
  return parseFloat(normalized) || 0;
}

// Format number to Brazilian currency format
function formatValue(value: number, decimalPlaces: number = 2): string {
  if (!value && value !== 0) return '';
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, prefix = "R$", allowDecimals = true, decimalPlaces = 2, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>('');
    const [isFocused, setIsFocused] = React.useState(false);

    // Update display value when external value changes (and not focused)
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatValue(value, allowDecimals ? decimalPlaces : 0));
      }
    }, [value, isFocused, allowDecimals, decimalPlaces]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Show raw number on focus for easier editing
      if (value) {
        setDisplayValue(formatValue(value, allowDecimals ? decimalPlaces : 0));
      }
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      // Format on blur
      const parsed = parseFormattedValue(displayValue);
      onChange(parsed);
      setDisplayValue(formatValue(parsed, allowDecimals ? decimalPlaces : 0));
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      
      // Allow only digits, comma, and dots
      const filtered = rawValue.replace(/[^\d.,]/g, '');
      
      // Handle real-time formatting
      setDisplayValue(filtered);
      
      // Parse and update value
      const parsed = parseFormattedValue(filtered);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    };

    return (
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode="decimal"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            prefix && "pl-10",
            className
          )}
          ref={ref}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
