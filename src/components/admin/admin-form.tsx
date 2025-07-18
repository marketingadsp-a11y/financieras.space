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
import { useAuth } from "@/context/auth-context";
import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { getAdmins } from "@/services/admin-service";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  name: z.string().min(2, "El nombre es requerido."),
  username: z.string().min(2, "El nombre de usuario es requerido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional().or(z.literal('')),
  status: z.enum(["Activo", "Inactivo"]),
  prefix: z.string().min(1, "El prefijo es requerido."),
  linkedAdminIds: z.array(z.string()).optional(),
});


type AdminFormProps = {
  onSubmit: (data: any) => void;
  admin?: Admin | null;
};

export function AdminForm({ onSubmit, admin }: AdminFormProps) {
    const { user } = useAuth();
    const isEditing = !!admin;
    const isSuperAdmin = user?.isSuperAdmin;
    const [allAdmins, setAllAdmins] = React.useState<Admin[]>([]);
    
    React.useEffect(() => {
        if(isSuperAdmin) {
            getAdmins().then(setAllAdmins);
        }
    }, [isSuperAdmin]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(
          isEditing 
          ? formSchema.partial().omit({ username: true }) // Username cannot be changed after creation
          : formSchema.required({ password: true })
        ),
        defaultValues: {
            name: admin?.name || "",
            username: admin?.username || "",
            password: "",
            status: admin?.status || "Activo",
            prefix: admin?.prefix || user?.prefix || "",
            linkedAdminIds: admin?.linkedAdminIds || [],
        },
    });

    const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
        const dataToSend: any = {
            ...values,
            role: 'Administrador' as const
        }

        if (isEditing) {
            dataToSend.id = admin.id;
             if (!values.password) {
                delete dataToSend.password;
            }
        }
        
        onSubmit(dataToSend);
    };

    const otherAdmins = allAdmins.filter(a => a.id !== admin?.id);

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
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Usuario</FormLabel>
                           <div className="flex items-center">
                                <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600">
                                   {form.watch('prefix')}.
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
                    name="prefix"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Prefijo</FormLabel>
                            <FormControl>
                                <Input placeholder="ej. miempresa" {...field} disabled={!isSuperAdmin} />
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
                {isSuperAdmin && (
                  <FormField
                    control={form.control}
                    name="linkedAdminIds"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Ver Paneles de Otros Admins</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                              >
                                {field.value && field.value.length > 0
                                  ? `${field.value.length} admin(s) seleccionado(s)`
                                  : "Seleccionar admins..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Buscar admin..." />
                              <CommandList>
                                <CommandEmpty>No se encontraron admins.</CommandEmpty>
                                <CommandGroup>
                                  {otherAdmins.map((a) => (
                                    <CommandItem
                                      value={a.id}
                                      key={a.id}
                                      onSelect={() => {
                                        const currentValue = field.value || [];
                                        const newValue = currentValue.includes(a.id)
                                          ? currentValue.filter((id) => id !== a.id)
                                          : [...currentValue, a.id];
                                        field.onChange(newValue);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          (field.value || []).includes(a.id)
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {a.name} ({a.prefix})
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <div className="pt-2">
                            {field.value?.map(id => {
                                const linked = allAdmins.find(a => a.id === id);
                                return linked ? <Badge key={id} variant="secondary" className="mr-1">{linked.name}</Badge> : null;
                            })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
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
