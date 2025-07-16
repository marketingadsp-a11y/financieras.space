
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Sucursal } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(3, "El nombre de la sucursal es requerido."),
  manager: z.string().min(3, "El nombre del encargado es requerido."),
  logoUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
});


type SucursalFormProps = {
  onSubmit: (data: Omit<Sucursal, 'id' | 'prefix' | 'currentBalance'>) => void;
  sucursal?: Sucursal | null;
  isSubmitting?: boolean;
};

export function SucursalForm({ onSubmit, sucursal, isSubmitting }: SucursalFormProps) {
    const isEditing = !!sucursal;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: sucursal?.name || "",
            manager: sucursal?.manager || "",
            logoUrl: sucursal?.logoUrl || "",
        },
    });

    const watchLogoUrl = form.watch("logoUrl");
    const watchName = form.watch("name");

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
                                <Input placeholder="Ej. Sucursal Centro" {...field} />
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
                                <Input placeholder="Ej. Juan Pérez" {...field} />
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
                        <FormLabel>Logotipo (URL)</FormLabel>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20">
                            <AvatarImage src={watchLogoUrl} alt={watchName} />
                            <AvatarFallback><Building className="h-10 w-10 text-muted-foreground"/></AvatarFallback>
                            </Avatar>
                            <div className="flex-grow">
                                <FormControl>
                                    <Input placeholder="https://ejemplo.com/logo.png" {...field} />
                                </FormControl>
                                <FormDescription className="mt-2">
                                    Pega una URL a una imagen para el logotipo.
                                </FormDescription>
                            </div>
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isEditing ? 'Guardar Cambios' : 'Crear Sucursal'}
                </Button>
            </form>
        </Form>
    );
}

    