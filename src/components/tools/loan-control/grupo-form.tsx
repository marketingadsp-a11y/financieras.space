
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
import type { LoanControlGrupo } from "@/lib/data";

const formSchema = z.object({
  name: z.string().min(3, "El nombre del grupo es requerido (mínimo 3 caracteres)."),
});

type GrupoFormProps = {
  onSubmit: (data: Omit<LoanControlGrupo, 'id' | 'plazaId' | 'prefix' | 'carteraId'>) => void;
  grupo?: LoanControlGrupo | null;
};

export function GrupoForm({ onSubmit, grupo }: GrupoFormProps) {
    const isEditing = !!grupo;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: grupo?.name || "",
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
                            <FormLabel>Nombre del Grupo</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej. Grupo Lunes" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full">
                    {isEditing ? 'Guardar Cambios' : 'Crear Grupo'}
                </Button>
            </form>
        </Form>
    );
}
