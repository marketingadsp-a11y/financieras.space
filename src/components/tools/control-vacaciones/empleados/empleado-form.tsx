"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";

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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { EmpleadoVacaciones } from "@/lib/data";
import { CurrencyInput } from "@/components/ui/currency-input";

const formSchema = z.object({
  name: z.string().min(3, "El nombre del empleado es requerido."),
  fechaIngreso: z.date({
    required_error: "La fecha de ingreso es requerida.",
  }),
  sueldoSemanal: z.coerce.number().positive("El sueldo debe ser un número positivo."),
});

export type EmpleadoFormValues = z.infer<typeof formSchema>;

type EmpleadoFormProps = {
  onSubmit: (data: EmpleadoFormValues) => void;
  empleado?: EmpleadoVacaciones | null;
  isSubmitting?: boolean;
};

export function EmpleadoForm({ onSubmit, empleado, isSubmitting }: EmpleadoFormProps) {
    const isEditing = !!empleado;

    const form = useForm<EmpleadoFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: empleado?.name || "",
            fechaIngreso: empleado?.fechaIngreso ? new Date(empleado.fechaIngreso) : new Date(),
            sueldoSemanal: empleado?.sueldoSemanal || undefined,
        },
    });
    
    React.useEffect(() => {
        if(empleado) {
            form.reset({
                ...empleado,
                fechaIngreso: new Date(empleado.fechaIngreso)
            });
        }
    }, [empleado, form]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre del Empleado</FormLabel>
                            <FormControl>
                                <Input placeholder="Nombre completo" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="fechaIngreso"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Fecha de Ingreso</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar 
                                        mode="single" 
                                        selected={field.value} 
                                        onSelect={field.onChange} 
                                        disabled={(date) => date > new Date()} 
                                        initialFocus 
                                        locale={es}
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="sueldoSemanal"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sueldo Semanal</FormLabel>
                            <FormControl>
                                <CurrencyInput
                                    placeholder="0.00"
                                    value={field.value}
                                    onValueChange={field.onChange}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {isEditing ? 'Guardar Cambios' : 'Registrar Empleado'}
                </Button>
            </form>
        </Form>
    );
}
