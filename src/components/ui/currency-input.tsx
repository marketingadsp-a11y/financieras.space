
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
    
    // Function to format a number into a currency string (e.g., 1000 -> "1,000.00")
    const formatValue = (num: number | undefined): string => {
        if (num === undefined || num === null || isNaN(num)) return '';
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    };

    // Function to parse a string into a number (e.g., "1,000.00" -> 1000)
    const parseValue = (str: string): number | undefined => {
      const sanitized = str.replace(/[^0-9.]/g, '');
      const num = parseFloat(sanitized);
      return isNaN(num) ? undefined : num;
    };
    
    const [displayValue, setDisplayValue] = React.useState(() => formatValue(propValue));

    // When the prop value changes (e.g., from form reset), update the display value
    React.useEffect(() => {
        const numericPropValue = typeof propValue === 'string' ? parseValue(propValue) : propValue;
        const numericDisplayValue = parseValue(displayValue);

        if (numericPropValue !== numericDisplayValue) {
            setDisplayValue(formatValue(numericPropValue));
        }
    }, [propValue]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const numericValue = parseValue(input);

      // Format the display value with commas as user types
      if (input.endsWith('.') || input.endsWith('.0') || input.endsWith('.00') || !input.includes('.')) {
          const parts = input.split('.');
          const integerPart = parts[0].replace(/,/g, '');
          const formattedInteger = new Intl.NumberFormat('en-US').format(Number(integerPart) || 0).replace(/,/g, '');
          if(Number(integerPart) === 0 && input !== "0" && input !== ".") {
             setDisplayValue(input.replace(/,/g, ''));
          } else {
             setDisplayValue(new Intl.NumberFormat('en-US').format(Number(integerPart)).replace(/,/g, ',') + (parts[1] !== undefined ? `.${parts[1]}`: ''));
          }
      } else {
          setDisplayValue(input);
      }
      
      onValueChange(numericValue);
    };
    
    const handleBlur = () => {
        const numericValue = parseValue(displayValue);
        setDisplayValue(formatValue(numericValue));
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
