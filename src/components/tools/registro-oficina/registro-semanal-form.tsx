

"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Loader2 } from "lucide-react";
import type { OficinaSemanalRegistro } from "@/lib/data";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const formSchema = z.object({
  recogidoSeguros: z.coerce.number().min(0, "Debe ser un valor positivo.").default(0),
  carteraVencida: z.coerce.number().min(0, "Debe ser un valor positivo.").default(0),
  interesMensual: z.coerce.number().min(0, "Debe ser un valor positivo.").default(0),
  capitalMensual: z.coerce.number().min(0, "Debe ser un valor positivo.").default(0),
  cajaChica: z.coerce.number().min(0, "Debe ser un valor positivo.").default(0),
});

type FormValues = z.infer<typeof formSchema>;

type RegistroSemanalFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormValues) => Promise<void>;
  existingData: OficinaSemanalRegistro | null;
  week: { start: Date; end: Date } | null;
};

export function RegistroSemanalForm({ isOpen, onClose, onSubmit, existingData, week }: RegistroSemanalFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recogidoSeguros: existingData?.recogidoSeguros || 0,
      carteraVencida: existingData?.carteraVencida || 0,
      interesMensual: existingData?.interesMensual || 0,
      capitalMensual: existingData?.capitalMensual || 0,
      cajaChica: existingData?.cajaChica || 0,
    },
  });

  React.useEffect(() => {
    if (existingData) {
      form.reset(existingData);
    } else {
      form.reset({
        recogidoSeguros: 0,
        carteraVencida: 0,
        interesMensual: 0,
        capitalMensual: 0,
        cajaChica: 0,
      });
    }
  }, [existingData, form, isOpen]);

  const handleFormSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    await onSubmit(values);
    setIsSubmitting(false);
  };
  
  if (!week) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingData ? 'Editar' : 'Registrar'} Datos Semanales</DialogTitle>
          <DialogDescription>
            Para la semana del {format(week.start, "dd 'de' LLLL", { locale: es })} al {format(week.end, "dd 'de' LLLL", { locale: es })}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="recogidoSeguros" render={({ field }) => (<FormItem><FormLabel>Recogido Seguros</FormLabel><FormControl><CurrencyInput {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="carteraVencida" render={({ field }) => (<FormItem><FormLabel>Cartera Vencida</FormLabel><FormControl><CurrencyInput {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="interesMensual" render={({ field }) => (<FormItem><FormLabel>Interés Mensual</FormLabel><FormControl><CurrencyInput {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="capitalMensual" render={({ field }) => (<FormItem><FormLabel>Capital Mensual</FormLabel><FormControl><CurrencyInput {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="cajaChica" render={({ field }) => (<FormItem><FormLabel>Caja Chica</FormLabel><FormControl><CurrencyInput {...field} /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Registro
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
