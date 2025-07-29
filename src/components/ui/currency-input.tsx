"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string | undefined;
  onValueChange: (value: number | undefined) => void;
}

// Helper to parse the string back to a number
const parse = (value: string): number | undefined => {
  const cleanValue = value.replace(/,/g, "");
  if (cleanValue === "" || cleanValue === ".") return undefined;
  const numberValue = parseFloat(cleanValue);
  return isNaN(numberValue) ? undefined : numberValue;
};

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>("");

    React.useEffect(() => {
      if (value !== undefined && value !== null) {
        const numericValue = typeof value === 'string' ? parse(value) : value;
        if (numericValue !== undefined) {
           const formatted = new Intl.NumberFormat('en-US').format(numericValue);
           // Handle case where user is typing a decimal
           if (String(value).endsWith('.') || (String(value).includes('.') && String(value).split('.')[1].length === 1)) {
               setDisplayValue(String(value));
           } else {
               setDisplayValue(new Intl.NumberFormat('en-US', {
                   minimumFractionDigits: 2,
                   maximumFractionDigits: 2
               }).format(numericValue));
           }
        } else {
            setDisplayValue("");
        }
      } else {
        setDisplayValue("");
      }
    }, [value]);


    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputVal = event.target.value.replace(/[^0-9.]/g, '');
        const numericValue = parse(inputVal);
        setDisplayValue(inputVal); 
        onValueChange(numericValue);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        const numericValue = parse(event.target.value);
        if (numericValue !== undefined) {
            const formatted = new Intl.NumberFormat("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(numericValue);
            setDisplayValue(formatted);
        } else {
            setDisplayValue('');
        }
        if (props.onBlur) {
            props.onBlur(event);
        }
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