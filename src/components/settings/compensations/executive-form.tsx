
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as React from "react";
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

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
import { Loader2 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(3, "El nombre del ejecutivo es requerido."),
  plaza: z.string().min(2, "La plaza es requerida."),
  fechaIngreso: z.date({
    required_error: "La fecha de ingreso es requerida.",
  }),
});

export type ExecutiveFormValues = z.infer<typeof formSchema>;
type Executive = { id: string; name: string; plaza: string, fechaIngreso: Date; }

type ExecutiveFormProps = {
  onSubmit: (data: ExecutiveFormValues) => void;
  executive?: Executive | null;
  isSubmitting?: boolean;
};

export function ExecutiveForm({ onSubmit, executive, isSubmitting }: ExecutiveFormProps) {
    const isEditing = !!executive;

    const form = useForm<ExecutiveFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: executive?.name || "",
            plaza: executive?.plaza || "",
            fechaIngreso: executive?.fechaIngreso || new Date(),
        },
    });

    React.useEffect(() => {
        if(executive) {
            form.reset({
                ...executive,
                fechaIngreso: new Date(executive.fechaIngreso) // ensure it's a Date object
            });
        }
    }, [executive, form]);


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nombre del Ejecutivo</FormLabel>
                        <FormControl><Input placeholder="Nombre completo" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="plaza" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Plaza</FormLabel>
                        <FormControl><Input placeholder="Ej. Plaza Central" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="fechaIngreso" render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Fecha de Ingreso</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Selecciona una fecha</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )} />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {isEditing ? 'Guardar Cambios' : 'Crear Ejecutivo'}
                </Button>
            </form>
        </Form>
    );
}
