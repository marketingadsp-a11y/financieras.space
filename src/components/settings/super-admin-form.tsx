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
import type { SuperAdmin } from "@/lib/data";

const formSchema = z.object({
  username: z.string().min(2, "El nombre de usuario es requerido."),
  password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres.").optional().or(z.literal('')),
});


type SuperAdminFormProps = {
  onSubmit: (data: any) => void;
  superAdmin?: SuperAdmin | null;
};

export function SuperAdminForm({ onSubmit, superAdmin }: SuperAdminFormProps) {
    const isEditing = !!superAdmin;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(
          isEditing 
          ? formSchema 
          : formSchema.required({ password: true })
        ),
        defaultValues: {
            username: superAdmin?.username || "",
            password: "",
        },
    });

    const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
        const dataToSend: any = { ...values };

        if (isEditing) {
            dataToSend.id = superAdmin.id;
             if (!values.password) {
                delete dataToSend.password;
            }
        }
        
        onSubmit(dataToSend);
    };


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Usuario</FormLabel>
                            <FormControl>
                                <Input placeholder="Nombre de usuario" {...field} disabled={isEditing}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder={isEditing ? "Dejar en blanco para no cambiar" : "••••••••"} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full">
                    {isEditing ? 'Guardar Cambios' : 'Crear Super Administrador'}
                </Button>
            </form>
        </Form>
    );
}
