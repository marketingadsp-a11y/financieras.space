
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { ClienteMensual } from "@/lib/data";
import { Loader2, DollarSign } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";

const formSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor a cero."),
});

type PagoFormProps = {
  onSubmit: (amount: number) => Promise<void>;
  cliente: ClienteMensual | null;
};

export function PagoForm({ onSubmit, cliente }: PagoFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: undefined,
    },
  });

  const handleFormSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    await onSubmit(values.amount);
    setIsSubmitting(false);
    form.reset();
  };

  if (!cliente) return null;
  const isPaid = cliente.status === 'liquidado';

  return (
    <Form {...form}>
        <div className="space-y-2 rounded-lg border bg-muted/30 p-4 my-4">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monto Préstamo:</span>
                <span className="font-medium">${(cliente.loanAmount || 0).toLocaleString('es-MX')}</span>
            </div>
            <div className="flex justify-between text-lg">
                <span className="text-muted-foreground">Saldo Actual:</span>
                <span className="font-bold text-destructive">${(cliente.currentBalance || 0).toLocaleString('es-MX')}</span>
            </div>
             <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Interés Mensual a Cubrir:</span>
                <span className="font-medium">${(cliente.monthlyInterestCharge || 0).toLocaleString('es-MX')}</span>
            </div>
             <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Interés Acumulado:</span>
                <span className="font-medium text-amber-600">${(cliente.unpaidInterest || 0).toLocaleString('es-MX')}</span>
            </div>
        </div>

        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Monto del Abono</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <CurrencyInput 
                            placeholder="0.00" 
                            className="pl-9" 
                            value={field.value}
                            onValueChange={field.onChange}
                            autoFocus />
                        </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting || isPaid}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPaid ? 'Deuda Liquidada' : 'Registrar Abono'}
            </Button>
        </form>
    </Form>
  );
}
