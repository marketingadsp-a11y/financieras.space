
"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string | undefined;
  onValueChange: (value: number | undefined) => void;
}

// Helper to format the number
const format = (value: number | undefined): string => {
  if (value === undefined || value === null) return "";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

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
        // When the external value changes, update the display value
        const numericValue = typeof value === 'string' ? parse(value) : value;
        setDisplayValue(format(numericValue));
    }, [value]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputVal = event.target.value;
        const numericValue = parse(inputVal);

        // Allow user to type, even if it's not a valid number temporarily
        setDisplayValue(inputVal);

        // Propagate the numeric value up
        onValueChange(numericValue);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        // On blur, format the displayed value correctly
        const numericValue = parse(event.target.value);
        setDisplayValue(format(numericValue));
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
