
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
import type { FlujoSucursal } from "@/lib/data";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(3, "El nombre de la sucursal es requerido."),
  manager: z.string().min(3, "El nombre del encargado es requerido."),
});

type SucursalFormProps = {
  onSubmit: (data: Omit<FlujoSucursal, 'id' | 'prefix' | 'currentBalance'>) => void;
  sucursal?: FlujoSucursal | null;
  isSubmitting?: boolean;
};

export function FlujoSucursalForm({ onSubmit, sucursal, isSubmitting }: SucursalFormProps) {
    const isEditing = !!sucursal;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: sucursal?.name || "",
            manager: sucursal?.manager || "",
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
                            <FormLabel>Nombre de la Sucursal</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej. Sucursal Principal" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="manager"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre del Encargado</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej. Responsable de Sucursal" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {isEditing ? 'Guardar Cambios' : 'Crear Sucursal'}
                </Button>
            </form>
        </Form>
    );
}
