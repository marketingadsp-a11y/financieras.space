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
  name: z.string().min(2, "El nombre del grupo es requerido."),
});

type GrupoFormProps = {
  onSubmit: (data: any) => void;
  grupo?: LoanControlGrupo | null;
  isSubmitting?: boolean;
};

export function GrupoForm({ onSubmit, grupo, isSubmitting = false }: GrupoFormProps) {
    const isEditing = !!grupo;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: grupo?.name || "",
        },
    });

    const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
        const dataToSend: any = { ...values };
        if (isEditing) {
            dataToSend.id = grupo.id;
        }
        onSubmit(dataToSend);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Nombre del Grupo</FormLabel>
                            <FormControl>
                                <Input 
                                    placeholder="Ej. Grupo 1" 
                                    {...field} 
                                    className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus-visible:ring-primary focus-visible:ring-1 focus-visible:ring-offset-0"
                                />
                            </FormControl>
                            <FormMessage className="text-xs text-rose-500" />
                        </FormItem>
                    )}
                />
                <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-indigo-650 hover:from-primary/95 hover:to-indigo-650/95 text-white mt-2 transition-all duration-355 hover:shadow-md hover:shadow-primary/10" 
                    disabled={isSubmitting}
                >
                    {isEditing ? 'Guardar Cambios' : 'Crear Grupo'}
                </Button>
            </form>
        </Form>
    );
}
