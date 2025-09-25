
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
import type { OficinaMensual } from "@/lib/data";

const formSchema = z.object({
  name: z.string().min(3, "El nombre de la oficina es requerido (mínimo 3 caracteres)."),
});

type OficinaFormProps = {
  onSubmit: (data: Omit<OficinaMensual, 'id' | 'prefix'>) => void;
  oficina?: OficinaMensual | null;
};

export function OficinaForm({ onSubmit, oficina }: OficinaFormProps) {
    const isEditing = !!oficina;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: oficina?.name || "",
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
                            <FormLabel>Nombre de la Oficina</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej. Oficina Matriz" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full">
                    {isEditing ? 'Guardar Cambios' : 'Crear Oficina'}
                </Button>
            </form>
        </Form>
    );
}
