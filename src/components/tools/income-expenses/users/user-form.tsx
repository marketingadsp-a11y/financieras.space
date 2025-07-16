
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ToolAdmin, Sucursal } from "@/lib/data";

const formSchema = z.object({
  name: z.string().min(2, "El nombre es requerido."),
  username: z.string().min(2, "El nombre de usuario es requerido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional().or(z.literal('')),
  status: z.enum(["Activo", "Inactivo"]),
  sucursalAccess: z.array(z.string()).optional(),
});


type ToolAdminFormProps = {
  onSubmit: (data: any) => void;
  admin?: ToolAdmin | null;
  prefix?: string;
  sucursales: Sucursal[];
};

export function ToolAdminForm({ onSubmit, admin, prefix, sucursales }: ToolAdminFormProps) {
    const isEditing = !!admin;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(
          isEditing 
          ? formSchema.partial()
          : formSchema.required({ password: true })
        ),
        defaultValues: {
            name: admin?.name || "",
            username: admin?.username || "",
            password: "",
            status: admin?.status || "Activo",
            sucursalAccess: admin?.sucursalAccess || [],
        },
    });

    const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
        const dataToSend: any = { ...values };

        if (isEditing) {
            dataToSend.id = admin.id;
             if (!values.password) {
                delete dataToSend.password;
            }
        }
        
        onSubmit(dataToSend);
    };


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-4">
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
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Usuario</FormLabel>
                                <div className="flex items-center">
                                    <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600">
                                    {prefix}.
                                    </span>
                                    <FormControl>
                                        <Input placeholder="nombre.usuario" {...field} className="rounded-l-none" disabled={isEditing}/>
                                    </FormControl>
                                </div>
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

                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-lg font-medium">Asignar Sucursales</h3>
                        <FormField
                            control={form.control}
                            name="sucursalAccess"
                            render={() => (
                                <FormItem>
                                    <FormDescription>Selecciona las sucursales a las que este usuario tendrá acceso.</FormDescription>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {sucursales.map((sucursal) => (
                                            <FormField
                                                key={sucursal.id}
                                                control={form.control}
                                                name="sucursalAccess"
                                                render={({ field }) => (
                                                    <FormItem key={sucursal.id} className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border p-3">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value?.includes(sucursal.id)}
                                                                onCheckedChange={(checked) => {
                                                                    return checked
                                                                        ? field.onChange([...(field.value || []), sucursal.id])
                                                                        : field.onChange(
                                                                            (field.value || []).filter(value => value !== sucursal.id)
                                                                        );
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="font-normal cursor-pointer">{sucursal.name}</FormLabel>
                                                    </FormItem>
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         {sucursales.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center p-4 border rounded-md">No hay sucursales creadas. Crea una sucursal primero para poder asignarla.</p>
                        )}
                    </div>
                  </div>
                </ScrollArea>
                <div className="pt-4 border-t">
                    <Button type="submit" className="w-full">
                        {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
