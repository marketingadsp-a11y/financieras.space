
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
import type { InterestRate } from "@/lib/data";

const formSchema = z.object({
  value: z.coerce.number().positive("La tasa debe ser un número positivo."),
});

type InteresFormProps = {
  onSubmit: (data: Omit<InterestRate, 'id' | 'prefix'>) => void;
  rate?: InterestRate | null;
};

export function InteresForm({ onSubmit, rate }: InteresFormProps) {
    const isEditing = !!rate;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            value: rate?.value || undefined,
        },
    });

    const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
        onSubmit(values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Valor del Interés (%)</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.1" placeholder="Ej. 5" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full">
                    {isEditing ? 'Guardar Cambios' : 'Crear Tasa de Interés'}
                </Button>
            </form>
        </Form>
    );
}
