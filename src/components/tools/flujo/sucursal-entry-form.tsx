
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
import { Loader2, TrendingDown, TrendingUp, Receipt } from "lucide-react";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  fondo: z.coerce.number().min(0).default(0),
  debeEntregar: z.coerce.number().min(0).default(0),
  falla: z.coerce.number().min(0).default(0),
  recuperado: z.coerce.number().min(0).default(0),
  entrantes: z.coerce.number().min(0).default(0),
  salientes: z.coerce.number().min(0).default(0),
  venta: z.coerce.number().min(0).default(0),
});

type SucursalEntryFormProps = {
  onSubmit: (data: Omit<FlujoEntry, 'id' | 'sucursalId' | 'date'>) => Promise<void>;
  isSubmitting?: boolean;
};

export function FlujoSucursalEntryForm({ onSubmit, isSubmitting }: SucursalEntryFormProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fondo: 0,
            debeEntregar: 0,
            falla: 0,
            recuperado: 0,
            entrantes: 0,
            salientes: 0,
            venta: 0,
        },
    });

    const [totalCobrado, setTotalCobrado] = React.useState(0);
    const formValues = form.watch();

    React.useEffect(() => {
        const fondo = Number(formValues.fondo || 0);
        const debeEntregar = Number(formValues.debeEntregar || 0);
        const falla = Number(formValues.falla || 0);
        const recuperado = Number(formValues.recuperado || 0);
        const entrantes = Number(formValues.entrantes || 0);
        const salientes = Number(formValues.salientes || 0);
        const venta = Number(formValues.venta || 0);
        
        const calculatedTotal = fondo + debeEntregar - falla + recuperado + entrantes - salientes - venta;
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
            venta: values.venta || 0,
            totalCobrado: totalCobrado,
        };
        await onSubmit(dataToSubmit);
        form.reset();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* SUMAN Section */}
                     <div className="p-4 rounded-lg bg-green-500/10">
                         <TrendingUp className="h-6 w-6 mb-4 text-green-800 dark:text-green-300" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="fondo" render={({ field }) => (<FormItem><FormLabel>Fondo (+)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="debeEntregar" render={({ field }) => (<FormItem><FormLabel>Debe Entregar (+)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="recuperado" render={({ field }) => (<FormItem><FormLabel>Recuperado (+)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="entrantes" render={({ field }) => (<FormItem><FormLabel>Entrantes (+)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    </div>

                    {/* RESTAN Section */}
                    <div className="p-4 rounded-lg bg-red-500/10 space-y-4">
                        <TrendingDown className="h-6 w-6 text-red-800 dark:text-red-300" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <FormField control={form.control} name="falla" render={({ field }) => (<FormItem><FormLabel>Falla (-)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="salientes" render={({ field }) => (<FormItem><FormLabel>Salientes (-)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                         <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                            <div className="flex items-center gap-2 mb-2">
                                <Receipt className="h-5 w-5 text-orange-600" />
                                <h4 className="font-semibold text-orange-700">Venta</h4>
                            </div>
                            <FormField control={form.control} name="venta" render={({ field }) => (<FormItem><FormLabel className="sr-only">Venta (-)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                         </div>
                    </div>
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
