"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as React from "react";
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
import type { VacationRule } from "@/lib/data";

const formSchema = z.object({
  year: z.coerce.number().int().positive("El año debe ser un número positivo."),
  days: z.coerce.number().int().positive("Los días deben ser un número positivo."),
});

export type VacationRuleFormValues = z.infer<typeof formSchema>;

type VacationRuleFormProps = {
  onSubmit: (data: VacationRuleFormValues) => void;
  rule?: VacationRule | null;
  isSubmitting?: boolean;
};

export function VacationRuleForm({ onSubmit, rule, isSubmitting }: VacationRuleFormProps) {
    const isEditing = !!rule;

    const form = useForm<VacationRuleFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            year: rule?.year || undefined,
            days: rule?.days || undefined,
        },
    });
    
    React.useEffect(() => {
        if(rule) form.reset(rule);
    }, [rule, form]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Año de Antigüedad</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="Ej. 1" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="days"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Días de Vacaciones</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="Ej. 12" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {isEditing ? 'Guardar Cambios' : 'Crear Regla'}
                </Button>
            </form>
        </Form>
    );
}
