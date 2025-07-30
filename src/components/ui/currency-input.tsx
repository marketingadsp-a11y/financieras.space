
"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | undefined;
  onValueChange: (value: number | undefined) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value: propValue, onValueChange, className, ...props }, ref) => {
    
    // Function to parse a string into a number (e.g., "1,000.00" -> 1000)
    const parseValue = (str: string): number | undefined => {
      const sanitized = str.replace(/,/g, '');
      const num = parseFloat(sanitized);
      return isNaN(num) ? undefined : num;
    };
    
    // Function to format value with commas for display
    const formatForDisplay = (num: number | undefined): string => {
        if (num === undefined || num === null || isNaN(num)) return '';
        return new Intl.NumberFormat('en-US').format(num);
    }
    
    const [displayValue, setDisplayValue] = React.useState<string>(formatForDisplay(propValue));

    // When the prop value changes (e.g., from form reset), update the display value
    React.useEffect(() => {
        const numericPropValue = propValue;
        const numericDisplayValue = parseValue(displayValue);

        if (numericPropValue !== numericDisplayValue) {
            setDisplayValue(formatForDisplay(numericPropValue));
        }
    }, [propValue]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const numericValue = parseValue(input);
      setDisplayValue(input.replace(/[^0-9.]/g, ''));
      onValueChange(numericValue);
    };
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const numericValue = parseValue(e.target.value);
        setDisplayValue(formatForDisplay(numericValue));
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        className={cn("font-mono", className)}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
