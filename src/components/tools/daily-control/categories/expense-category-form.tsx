
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
import type { ExpenseCategory } from "@/lib/data";

const formSchema = z.object({
  name: z.string().min(2, "El nombre de la categoría es requerido."),
});

type ExpenseCategoryFormProps = {
  onSubmit: (data: Omit<ExpenseCategory, 'id'>) => void;
  category?: ExpenseCategory | null;
};

export function ExpenseCategoryForm({ onSubmit, category }: ExpenseCategoryFormProps) {
    const isEditing = !!category;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: category?.name || "",
        },
    });

    const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
        const dataToSend: any = { ...values };
        if (isEditing) {
            dataToSend.id = category.id;
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
                            <FormLabel>Nombre de la Categoría</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej. Gasolina, Comida, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full">
                    {isEditing ? 'Guardar Cambios' : 'Crear Categoría'}
                </Button>
            </form>
        </Form>
    );
}
