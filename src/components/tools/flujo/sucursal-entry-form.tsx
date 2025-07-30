
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
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  fondo: z.coerce.number().min(0).optional(),
  debeEntregar: z.coerce.number().min(0).optional(),
  falla: z.coerce.number().min(0).optional(),
  recuperado: z.coerce.number().min(0).optional(),
  salientes: z.coerce.number().min(0).optional(),
  entrantes: z.coerce.number().min(0).optional(),
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

    const [totalCobrado, setTotalCobrado] = React.useState(0);
    const formValues = form.watch();

    React.useEffect(() => {
        const fondo = formValues.fondo || 0;
        const debeEntregar = formValues.debeEntregar || 0;
        const falla = formValues.falla || 0;
        const recuperado = formValues.recuperado || 0;
        const salientes = formValues.salientes || 0;
        const entrantes = formValues.entrantes || 0;
        
        const calculatedTotal = fondo + debeEntregar - falla + recuperado - salientes + entrantes;
        setTotalCobrado(calculatedTotal);
    }, [formValues]);


    const handleFormSubmit = async (values: z.infer<typeof formSchema>) => {
        const dataToSubmit = {
            fondo: values.fondo || 0,
            debeEntregar: values.debeEntregar || 0,
            falla: values.falla || 0,
            recuperado: values.recuperado || 0,
            salientes: values.salientes || 0,
            entrantes: values.entrantes || 0,
            totalCobrado: totalCobrado,
        };
        await onSubmit(dataToSubmit);
        form.reset();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField control={form.control} name="fondo" render={({ field }) => (<FormItem><FormLabel>Fondo</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="debeEntregar" render={({ field }) => (<FormItem><FormLabel>Debe Entregar</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="falla" render={({ field }) => (<FormItem><FormLabel>Falla</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="recuperado" render={({ field }) => (<FormItem><FormLabel>Recuperado</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="salientes" render={({ field }) => (<FormItem><FormLabel>Salientes</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="entrantes" render={({ field }) => (<FormItem><FormLabel>Entrantes</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                
                 <Card className="bg-muted/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Cálculo del Total Cobrado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-primary">${totalCobrado.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
                    </CardContent>
                </Card>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Guardar Registro
                </Button>
            </form>
        </Form>
    );
}
