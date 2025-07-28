
"use client";

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
import type { FlujoEntry } from "@/lib/data";
import { Loader2 } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";

const formSchema = z.object({
  fondo: z.coerce.number().min(0, "El valor debe ser positivo.").default(0),
  debeEntregar: z.coerce.number().min(0, "El valor debe ser positivo.").default(0),
  falla: z.coerce.number().min(0, "El valor debe ser positivo.").default(0),
  recuperado: z.coerce.number().min(0, "El valor debe ser positivo.").default(0),
  salientes: z.coerce.number().min(0, "El valor debe ser positivo.").default(0),
  entrantes: z.coerce.number().min(0, "El valor debe ser positivo.").default(0),
});

type SucursalEntryFormProps = {
  onSubmit: (data: Omit<FlujoEntry, 'id' | 'sucursalId' | 'date'>) => Promise<void>;
  isSubmitting?: boolean;
};

export function FlujoSucursalEntryForm({ onSubmit, isSubmitting }: SucursalEntryFormProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fondo: undefined,
            debeEntregar: undefined,
            falla: undefined,
            recuperado: undefined,
            salientes: undefined,
            entrantes: undefined,
        },
    });

    const handleFormSubmit = async (values: z.infer<typeof formSchema>) => {
        const totalCobrado = (values.fondo ?? 0) + (values.debeEntregar ?? 0) - (values.falla ?? 0) + (values.recuperado ?? 0) - (values.salientes ?? 0) + (values.entrantes ?? 0);
        await onSubmit({ ...values, totalCobrado });
        form.reset();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField control={form.control} name="fondo" render={({ field }) => (<FormItem><FormLabel>Fondo</FormLabel><FormControl><CurrencyInput {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="debeEntregar" render={({ field }) => (<FormItem><FormLabel>Debe Entregar</FormLabel><FormControl><CurrencyInput {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="falla" render={({ field }) => (<FormItem><FormLabel>Falla</FormLabel><FormControl><CurrencyInput {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="recuperado" render={({ field }) => (<FormItem><FormLabel>Recuperado</FormLabel><FormControl><CurrencyInput {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="salientes" render={({ field }) => (<FormItem><FormLabel>Salientes</FormLabel><FormControl><CurrencyInput {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="entrantes" render={({ field }) => (<FormItem><FormLabel>Entrantes</FormLabel><FormControl><CurrencyInput {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Guardar Registro
                </Button>
            </form>
        </Form>
    );
}
