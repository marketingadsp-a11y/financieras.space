
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
import { Input } from "@/components/ui/input";
import type { LoanControlCartera } from "@/lib/data";

const formSchema = z.object({
  name: z.string().min(2, "El nombre de la cartera es requerido."),
});

type CarteraFormProps = {
  onSubmit: (data: any) => void;
  cartera?: LoanControlCartera | null;
  isSubmitting?: boolean;
};

export function CarteraForm({ onSubmit, cartera, isSubmitting = false }: CarteraFormProps) {
    const isEditing = !!cartera;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: cartera?.name || "",
        },
    });

    const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
        const dataToSend: any = { ...values };
        if (isEditing) {
            dataToSend.id = cartera.id;
        }
        onSubmit(dataToSend);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre de la Cartera</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej. Cartera A" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isEditing ? 'Guardar Cambios' : 'Crear Cartera'}
                </Button>
            </form>
        </Form>
    );
}
