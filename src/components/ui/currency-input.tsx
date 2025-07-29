
"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string | undefined;
  onValueChange: (value: number | undefined) => void;
}

// Helper to parse a formatted string into a number
const parseFormattedValue = (value: string): number | undefined => {
  if (!value) return undefined;
  const sanitized = value.replace(/[^0-9.]/g, '');
  const numberValue = parseFloat(sanitized);
  return isNaN(numberValue) ? undefined : numberValue;
};

// Helper to format a number into a currency string
const formatToCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null || isNaN(value)) return '';
    return new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};


const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value: propValue, onValueChange, className, onBlur, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState<string>(() => {
        if (propValue === undefined || propValue === null) return '';
        const numValue = typeof propValue === 'string' ? parseFormattedValue(propValue) : propValue;
        return String(numValue ?? '');
    });

    // Update internal state only when the prop from the form changes
    React.useEffect(() => {
        const numValue = typeof propValue === 'string' ? parseFormattedValue(propValue) : propValue;
        const formatted = numValue !== undefined ? String(numValue) : '';
        if (parseFormattedValue(internalValue) !== numValue) {
             setInternalValue(formatted);
        }
    }, [propValue]);


    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = event.target.value;
        const sanitized = rawValue.replace(/[^0-9.]/g, '');
        
        // Allow only one decimal point
        const parts = sanitized.split('.');
        if (parts.length > 2) {
            return; 
        }

        setInternalValue(sanitized);
        onValueChange(parseFormattedValue(sanitized));
    };

    const handleInputBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        const numericValue = parseFormattedValue(internalValue);
        const formatted = formatToCurrency(numericValue);
        setInternalValue(formatted);
        
        // Propagate the blur event if a handler is provided
        if (onBlur) {
            onBlur(event);
        }
    };
    
     const handleInputFocus = (event: React.FocusEvent<HTMLInputElement>) => {
        const numericValue = parseFormattedValue(internalValue);
        if (numericValue !== undefined) {
            setInternalValue(String(numericValue));
        }
    };

    return (
      <Input
        ref={ref}
        type="text" // Use text to allow for formatting characters
        inputMode="decimal" // Hint for mobile keyboards
        className={cn("font-mono", className)}
        value={internalValue}
        onChange={handleChange}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
