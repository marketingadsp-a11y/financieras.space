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
import { Switch } from "@/components/ui/switch";
import type { Admin } from "@/lib/data";

const formSchema = z.object({
  name: z.string().min(2, "El nombre es requerido."),
  email: z.string().email("El correo electrónico no es válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional().or(z.literal('')),
  status: z.enum(["Activo", "Inactivo"]),
});

type FormValues = Omit<Admin, 'id' | 'role'>;

type AdminFormProps = {
  onSubmit: (data: any) => void;
  admin?: Admin | null;
};

export function AdminForm({ onSubmit, admin }: AdminFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: admin?.name || "",
      email: admin?.email || "",
      password: "",
      status: admin?.status || "Activo",
    },
  });
  
  const isEditing = !!admin;

  const handleFormSubmit = (values: FormValues) => {
    const dataToSend: any = {
      ...values,
      role: 'Administrador' as const
    }

    if (isEditing) {
      dataToSend.id = admin.id;
    }
    
    if (!values.password) {
      delete dataToSend.password;
    } else {
      // In a real app, you'd hash the password here before sending.
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
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Nombre completo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="ejemplo@correo.com" {...field} />
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
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Estado</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value === "Activo"}
                  onCheckedChange={(checked) => field.onChange(checked ? "Activo" : "Inactivo")}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {isEditing ? 'Guardar Cambios' : 'Crear Administrador'}
        </Button>
      </form>
    </Form>
  );
}
