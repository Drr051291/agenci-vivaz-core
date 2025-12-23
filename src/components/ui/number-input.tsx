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
  if (value === 0) return '';
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}

// Convert cents/units to number
function unitsToNumber(units: number, decimalPlaces: number): number {
  return units / Math.pow(10, decimalPlaces);
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onChange, suffix, allowDecimals = false, decimalPlaces = 0, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    // Update display value when external value changes
    React.useEffect(() => {
      if (value === 0) {
        setDisplayValue('');
      } else {
        setDisplayValue(formatValue(value, allowDecimals ? decimalPlaces : 0));
      }
    }, [value, allowDecimals, decimalPlaces]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, arrows
      if (
        e.key === 'Backspace' ||
        e.key === 'Delete' ||
        e.key === 'Tab' ||
        e.key === 'Escape' ||
        e.key === 'Enter' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'Home' ||
        e.key === 'End' ||
        (e.ctrlKey && (e.key === 'a' || e.key === 'c' || e.key === 'v' || e.key === 'x'))
      ) {
        return;
      }

      // Allow only digits
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      
      // Extract only digits
      const digits = rawValue.replace(/\D/g, '');
      
      if (digits === '' || digits === '0') {
        setDisplayValue('');
        onChange(0);
        return;
      }

      // Convert to units (integer)
      const units = parseInt(digits, 10);
      
      // Convert units to actual number based on decimal places
      const actualDecimalPlaces = allowDecimals ? decimalPlaces : 0;
      const numberValue = unitsToNumber(units, actualDecimalPlaces);
      
      // Format for display
      const formatted = formatValue(numberValue, actualDecimalPlaces);
      
      setDisplayValue(formatted);
      onChange(numberValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Select all on focus for easy replacement
      setTimeout(() => {
        e.target.select();
      }, 0);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Ensure proper formatting on blur
      if (value === 0) {
        setDisplayValue('');
      } else {
        setDisplayValue(formatValue(value, allowDecimals ? decimalPlaces : 0));
      }
      props.onBlur?.(e);
    };

    return (
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            suffix && "pr-10",
            className
          )}
          ref={inputRef}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="0"
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
