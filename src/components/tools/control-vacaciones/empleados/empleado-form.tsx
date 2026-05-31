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
  birthday: z.date().optional(),
  sueldoSemanal: z.coerce.number().min(0, "El sueldo debe ser un número positivo."),
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
            birthday: empleado?.birthday ? new Date(empleado.birthday) : undefined,
            sueldoSemanal: empleado?.sueldoSemanal || 0,
        },
    });
    
    React.useEffect(() => {
        if(empleado) {
            form.reset({
                ...empleado,
                fechaIngreso: new Date(empleado.fechaIngreso),
                birthday: empleado.birthday ? new Date(empleado.birthday) : undefined,
            });
        } else {
            form.reset({
                name: "",
                fechaIngreso: new Date(),
                birthday: undefined,
                sueldoSemanal: 0,
            });
        }
    }, [empleado, form]);
 
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold text-slate-600 dark:text-slate-400">Nombre del Empleado</FormLabel>
                            <FormControl>
                                <Input placeholder="Nombre completo" className="h-10 rounded-lg text-xs border-slate-200 dark:border-slate-800 shadow-sm" {...field} />
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
                            <FormLabel className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Fecha de Ingreso</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal h-10 rounded-lg text-xs border-slate-200 dark:border-slate-800 shadow-sm", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50 text-slate-500" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-xl overflow-hidden border shadow-lg" align="start">
                                    <Calendar 
                                        mode="single" 
                                        selected={field.value} 
                                        onSelect={field.onChange} 
                                        captionLayout="dropdown-buttons"
                                        fromYear={new Date().getFullYear() - 50}
                                        toYear={new Date().getFullYear()}
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
                    name="birthday"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Fecha de Cumpleaños</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal h-10 rounded-lg text-xs border-slate-200 dark:border-slate-800 shadow-sm", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50 text-slate-500" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-xl overflow-hidden border shadow-lg" align="start">
                                    <Calendar 
                                        mode="single" 
                                        selected={field.value} 
                                        onSelect={field.onChange} 
                                        captionLayout="dropdown-buttons"
                                        fromYear={new Date().getFullYear() - 100}
                                        toYear={new Date().getFullYear()}
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
                            <FormLabel className="text-xs font-bold text-slate-600 dark:text-slate-400">Sueldo Semanal</FormLabel>
                            <FormControl>
                                <CurrencyInput
                                    placeholder="0.00"
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    className="h-10 rounded-lg text-xs border-slate-200 dark:border-slate-800 shadow-sm"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-lg text-xs h-10 font-bold mt-4" 
                    disabled={isSubmitting}
                >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {isEditing ? 'Guardar Cambios' : 'Registrar Empleado'}
                </Button>
            </form>
        </Form>
    );
}
