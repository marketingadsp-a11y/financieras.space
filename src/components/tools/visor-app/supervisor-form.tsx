
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
import type { VisorSupervisor } from "@/lib/data";

const formSchema = z.object({
  name: z.string().min(3, "El nombre del supervisor es requerido."),
  accessCode: z.string().regex(/^\d{4}$/, "El código debe ser de 4 dígitos numéricos."),
  logoUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
});

type SupervisorFormProps = {
  onSubmit: (data: Omit<VisorSupervisor, 'id' | 'prefix'>) => void;
  supervisor?: VisorSupervisor | null;
};

export function SupervisorForm({ onSubmit, supervisor }: SupervisorFormProps) {
    const isEditing = !!supervisor;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: supervisor?.name || "",
            accessCode: supervisor?.accessCode || "",
            logoUrl: supervisor?.logoUrl || "",
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
                            <FormLabel>Nombre del Supervisor</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej. Juan Pérez" {...field} autoFocus />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="accessCode"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Código de Acceso (4 dígitos)</FormLabel>
                            <FormControl>
                                <Input type="text" maxLength={4} placeholder="Ej. 1234" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>URL del Logotipo (Opcional)</FormLabel>
                            <FormControl>
                                <Input placeholder="https://ejemplo.com/logo.png" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full">
                    {isEditing ? 'Guardar Cambios' : 'Crear Supervisor'}
                </Button>
            </form>
        </Form>
    );
}
