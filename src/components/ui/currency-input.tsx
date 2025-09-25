
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
    const inputRef = React.useRef<HTMLInputElement>(null);

    const formatValue = (num: number | undefined): string => {
        if (num === undefined || num === null) return "";
        return num.toLocaleString('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const [displayValue, setDisplayValue] = React.useState<string>(formatValue(propValue));

    React.useEffect(() => {
        setDisplayValue(formatValue(propValue));
    }, [propValue]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, selectionStart } = e.target;
        
        // Remove all non-digit characters except the decimal point
        const rawValue = value.replace(/[^0-9.]/g, '');
        const parts = rawValue.split('.');
        
        // Ensure there's only one decimal point
        const numericString = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : parts[0];

        // How many separators were there before?
        const separatorsBefore = (displayValue.match(/,/g) || []).length;
        
        const numericValue = parseFloat(numericString);
        onValueChange(isNaN(numericValue) ? undefined : numericValue);

        const newFormattedValue = numericValue.toLocaleString('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        // How many separators are there now?
        const separatorsAfter = (newFormattedValue.match(/,/g) || []).length;
        const separatorDiff = separatorsAfter - separatorsBefore;

        // Adjust cursor position
        const newCursorPosition = (selectionStart || 0) + separatorDiff;
        
        // We need to set the state and then adjust the cursor in a useEffect
        // because the input's value isn't updated in the DOM immediately.
        setDisplayValue(newFormattedValue);
        
        // Using a timeout to set cursor position after the re-render
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
            }
        }, 0);
    };

    return (
      <Input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        className={cn("font-mono", className)}
        value={displayValue}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
