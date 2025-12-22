import * as React from "react";
import { cn } from "@/lib/utils";

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  allowDecimals?: boolean;
  decimalPlaces?: number;
}

// Format number to Brazilian format
function formatValue(value: number, decimalPlaces: number = 0): string {
  if (!value && value !== 0) return '';
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}

// Parse formatted string to number
function parseFormattedValue(formatted: string): number {
  // Remove dots (thousand separators) and replace comma with dot
  const cleaned = formatted.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onChange, suffix, allowDecimals = false, decimalPlaces = 0, ...props }, ref) => {
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
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      const parsed = parseFormattedValue(displayValue);
      onChange(parsed);
      setDisplayValue(formatValue(parsed, allowDecimals ? decimalPlaces : 0));
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      
      // Allow only digits, comma, and dots
      const filtered = rawValue.replace(/[^\d.,]/g, '');
      setDisplayValue(filtered);
      
      const parsed = parseFormattedValue(filtered);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    };

    return (
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            suffix && "pr-10",
            className
          )}
          ref={ref}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
