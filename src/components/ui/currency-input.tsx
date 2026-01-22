
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
    const [displayValue, setDisplayValue] = React.useState<string>("");
    const [isFocused, setIsFocused] = React.useState(false);

    const format = (num: number | undefined) => {
        if (num === undefined || num === null) return "";
        return num.toLocaleString('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const parse = (str: string): number | undefined => {
        const cleaned = str.replace(/[^0-9.]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? undefined : num;
    };

    React.useEffect(() => {
        if (!isFocused) {
            setDisplayValue(format(propValue));
        }
    }, [propValue, isFocused]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        if (propValue === 0) {
            setDisplayValue('');
        } else if (propValue !== undefined && propValue !== null) {
            setDisplayValue(String(propValue));
        }
        e.target.select();
        props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        const currentVal = parse(displayValue);
        const finalValue = currentVal === undefined ? 0 : currentVal;

        if (propValue !== finalValue) {
            onValueChange(finalValue);
        }
        
        setDisplayValue(format(finalValue));

        props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const decimalParts = rawValue.split('.');
        if (decimalParts.length > 2) {
             return;
        }

        setDisplayValue(rawValue);
        const numericValue = parse(rawValue);
        onValueChange(numericValue);
    };


    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        className={cn("font-mono", className)}
        value={displayValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
