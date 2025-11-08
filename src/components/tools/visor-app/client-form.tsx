
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
import type { VisorClient } from "@/lib/data";
import React from "react";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(3, "El nombre del cliente es requerido."),
  qrCodeValue: z.string().optional(),
});

type ClientFormProps = {
  onSubmit: (data: { name: string; qrCodeValue?: string }) => void;
  client?: VisorClient | null;
  isSubmitting?: boolean;
};

export function ClientForm({ onSubmit, client, isSubmitting }: ClientFormProps) {
    const isEditing = !!client;
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { 
            name: "",
            qrCodeValue: ""
        },
    });
    
    React.useEffect(() => {
        if (client) {
            form.reset({
                name: client.name,
                qrCodeValue: client.qrCodeValue,
            });
        } else {
            form.reset({
                name: "",
                qrCodeValue: "",
            });
        }
    }, [client, form]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre del Cliente</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej. Contacto de Cliente" {...field} autoFocus />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="qrCodeValue"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Valor del Código QR (Opcional)</FormLabel>
                            <FormControl>
                                <Input placeholder="Dejar en blanco para generar automáticamente" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {isEditing ? 'Guardar Cambios' : 'Crear Cliente'}
                </Button>
            </form>
        </Form>
    );
}
