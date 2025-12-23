import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  allowDecimals?: boolean;
  decimalPlaces?: number;
}

// Format number to Brazilian currency format (1.234,56)
function formatToBRL(value: number, decimalPlaces: number = 2): string {
  if (value === 0) return '';
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}

// Parse cents to number
function centsToNumber(cents: number, decimalPlaces: number): number {
  return cents / Math.pow(10, decimalPlaces);
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, prefix = "R$", allowDecimals = true, decimalPlaces = 2, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    // Update display value when external value changes
    React.useEffect(() => {
      if (value === 0) {
        setDisplayValue('');
      } else {
        setDisplayValue(formatToBRL(value, allowDecimals ? decimalPlaces : 0));
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

      // Convert to cents (integer)
      const cents = parseInt(digits, 10);
      
      // Convert cents to actual number
      const actualDecimalPlaces = allowDecimals ? decimalPlaces : 0;
      const numberValue = centsToNumber(cents, actualDecimalPlaces);
      
      // Format for display
      const formatted = formatToBRL(numberValue, actualDecimalPlaces);
      
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
        setDisplayValue(formatToBRL(value, allowDecimals ? decimalPlaces : 0));
      }
      props.onBlur?.(e);
    };

    return (
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode="numeric"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            prefix && "pl-10",
            className
          )}
          ref={inputRef}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="0,00"
          {...props}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
