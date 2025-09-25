
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ClienteMensual, OficinaMensual, InterestRate } from "@/lib/data";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  oficinaId: z.string().min(1, "Debes seleccionar una oficina."),
  interestRateId: z.string().min(1, "Debes seleccionar una tasa de interés."),
  name: z.string().min(3, "El nombre del cliente es requerido."),
  loanAmount: z.coerce.number().positive("El monto debe ser mayor a cero."),
  paymentDay: z.coerce.number().int().min(1).max(31, "El día debe estar entre 1 y 31."),
});

type PrestamoFormProps = {
  onSubmit: (data: Omit<ClienteMensual, 'id' | 'prefix' | 'currentBalance' | 'status' | 'interestRateValue'>) => Promise<void>;
  oficinas: OficinaMensual[];
  interestRates: InterestRate[];
  cliente?: ClienteMensual | null;
};

export function PrestamoForm({ onSubmit, oficinas, interestRates, cliente }: PrestamoFormProps) {
  const isEditing = !!cliente;
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      oficinaId: cliente?.oficinaId || "",
      interestRateId: cliente?.interestRateId || "",
      name: cliente?.name || "",
      loanAmount: cliente?.loanAmount || undefined,
      paymentDay: cliente?.paymentDay || 1,
    },
  });

  const handleFormSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    await onSubmit(values);
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="oficinaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Oficina</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una oficina" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {oficinas.length > 0 ? (
                      oficinas.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground">No hay oficinas creadas.</div>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="interestRateId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tasa de Interés Mensual</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una tasa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {interestRates.length > 0 ? (
                      interestRates.map(r => <SelectItem key={r.id} value={r.id}>{r.value}%</SelectItem>)
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground">No hay tasas creadas.</div>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Cliente</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="loanAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto Prestado</FormLabel>
              <FormControl>
                <CurrencyInput placeholder="1,000.00" value={field.value} onValueChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="paymentDay"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Día de Pago (1-31)</FormLabel>
              <FormControl>
                <Input type="number" min="1" max="31" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Guardar Cambios' : 'Registrar Préstamo'}
        </Button>
      </form>
    </Form>
  );
}
