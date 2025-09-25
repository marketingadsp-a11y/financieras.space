
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
    
    // The internal state of the input, as a string.
    const [displayValue, setDisplayValue] = React.useState<string>("");

    // This effect updates the display value whenever the external `propValue` changes.
    // This is crucial for form resets or when the component is controlled from the outside.
    React.useEffect(() => {
        // Format the incoming number prop into a string for display.
        // If the value is undefined or null, show an empty string.
        setDisplayValue(propValue ? String(propValue) : '');
    }, [propValue]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      // Allow only numbers and a single decimal point.
      const sanitized = input.replace(/[^0-9.]/g, '');
      setDisplayValue(sanitized);

      // Convert the sanitized string to a number for the `onValueChange` callback.
      const numericValue = parseFloat(sanitized);
      onValueChange(isNaN(numericValue) ? undefined : numericValue);
    };
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const numericValue = parseFloat(e.target.value);
        if (!isNaN(numericValue)) {
            // Format with commas and decimal points for display when not focused.
             setDisplayValue(numericValue.toLocaleString('es-MX', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).replace(/,/g, ''));
        }
    };
    
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        // When focusing, remove formatting to allow easy editing.
        const numericValue = parseFloat(e.target.value.replace(/,/g, ''));
        if (!isNaN(numericValue)) {
            setDisplayValue(String(numericValue));
        }
    }


    return (
      <Input
        ref={ref}
        type="text" // Use text to allow for commas in display
        inputMode="decimal"
        className={cn("font-mono", className)}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };

