
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
  name: z.string().min(3, "El nombre de la cartera es requerido (mínimo 3 caracteres)."),
  responsable: z.string().min(3, "El nombre del responsable es requerido (mínimo 3 caracteres)."),
});

type CarteraFormProps = {
  onSubmit: (data: Omit<LoanControlCartera, 'id' | 'plazaId' | 'prefix'>) => void;
  cartera?: LoanControlCartera | null;
};

export function CarteraForm({ onSubmit, cartera }: CarteraFormProps) {
    const isEditing = !!cartera;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: cartera?.name || "",
            responsable: cartera?.responsable || "",
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
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre de la Cartera</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej. Cartera de Cobranza Semanal" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="responsable"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Responsable</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej. Juan Pérez" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full">
                    {isEditing ? 'Guardar Cambios' : 'Crear Cartera'}
                </Button>
            </form>
        </Form>
    );
}
