

"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as React from "react";
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
import type { ToolAdmin, Sucursal, Admin, Tool } from "@/lib/data";
import { getCustomizedTools } from "@/lib/data";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";


const sucursalAccessSchema = z.object({
  sucursalId: z.string().min(1),
  permissions: z.array(z.string()).min(1, "Debe seleccionar al menos un permiso."),
});


const formSchema = z.object({
  name: z.string().min(2, "El nombre es requerido."),
  username: z.string().min(2, "El nombre de usuario es requerido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional().or(z.literal('')),
  status: z.enum(["Activo", "Inactivo"]),
  prefix: z.string().min(1, "El prefijo es requerido"),
  toolId: z.string().min(1, "Debe seleccionar una herramienta."),
  sucursalAccess: z.array(sucursalAccessSchema).optional(),
});


type ToolAdminFormProps = {
  onSubmit: (data: any) => void;
  admin?: ToolAdmin | null;
  sucursales: Sucursal[];
  admins?: Admin[];
};

export function ToolAdminForm({ onSubmit, admin, sucursales, admins }: ToolAdminFormProps) {
    const isEditing = !!admin;
    const { user } = useAuth();
    const isSuperAdminView = !!admins; // SuperAdmin view will pass down the list of admins
    const allTools = getCustomizedTools();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(
          isEditing 
          ? formSchema.partial()
          : formSchema.required({ password: true, prefix: true })
        ),
        defaultValues: {
            name: admin?.name || "",
            username: admin?.username || "",
            password: "",
            status: admin?.status || "Activo",
            prefix: admin?.prefix || user?.prefix || "",
            toolId: admin?.toolId || undefined,
            sucursalAccess: admin?.sucursalAccess || [],
        },
    });

    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "sucursalAccess"
    });
    
    const watchPrefix = form.watch("prefix");
    const watchToolId = form.watch("toolId");

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
    
    const sucursalesForSelectedPrefix = sucursales.filter(s => s.prefix === watchPrefix);
    const assignedSucursalIds = fields.map(field => field.sucursalId);
    const availableSucursales = sucursalesForSelectedPrefix.filter(s => !assignedSucursalIds.includes(s.id));
    
    const showSucursalManagement = watchToolId === 'income-expenses';

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
                    
                     {isSuperAdminView && admins ? (
                         <FormField
                            control={form.control}
                            name="prefix"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Empresa (Prefijo)</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditing}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una empresa" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {admins.map(admin => (
                                        <SelectItem key={admin.id} value={admin.prefix!}>{admin.prefix}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    ) : (
                         <FormField
                            control={form.control}
                            name="prefix"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Empresa (Prefijo)</FormLabel>
                                <FormControl>
                                    <Input {...field} disabled />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Usuario</FormLabel>
                                <div className="flex items-center">
                                    <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600">
                                    {watchPrefix}.
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
                    <FormField
                        control={form.control}
                        name="toolId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Herramienta</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Selecciona una herramienta" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {allTools.map(tool => (
                                            <SelectItem key={tool.id} value={tool.id}>{tool.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                   
                    {showSucursalManagement && (
                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-medium">Asignar Sucursales (Gastos/Ingresos)</h3>
                                    <p className="text-sm text-muted-foreground">Asigna las sucursales que podrá ver el usuario.</p>
                                    <FormMessage>{(form.formState.errors.sucursalAccess as any)?.root?.message}</FormMessage>
                                </div>
                                <Select onValueChange={(sucursalId) => {
                                    append({ sucursalId: sucursalId, permissions: [] });
                                }} value="">
                                    <SelectTrigger className="w-[200px]" disabled={!watchPrefix}>
                                        <SelectValue placeholder={!watchPrefix ? "Elige una empresa" : "Asignar sucursal..."} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableSucursales.length > 0 ? (
                                            availableSucursales.map(sucursal => (
                                                <SelectItem key={sucursal.id} value={sucursal.id}>{sucursal.name}</SelectItem>
                                            ))
                                        ) : (
                                            <div className="p-2 text-sm text-muted-foreground">No hay más sucursales para asignar.</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <Accordion type="multiple" className="w-full space-y-2" defaultValue={fields.map((_, i) => `item-${i}`)}>
                                {fields.map((field, index) => {
                                    const sucursalName = sucursales.find(s => s.id === field.sucursalId)?.name;
                                    return (
                                    <AccordionItem key={field.id} value={`item-${index}`} className="border rounded-md px-4 bg-muted/20">
                                        <div className="flex items-center">
                                        <AccordionTrigger className="flex-1 text-base">{sucursalName}</AccordionTrigger>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                        </div>
                                        <AccordionContent>
                                            <p className="text-sm text-muted-foreground mb-4">Esta función aún no está implementada.</p>
                                        </AccordionContent>
                                    </AccordionItem>
                                    )}
                                )}
                            </Accordion>
                            {sucursalesForSelectedPrefix.length === 0 && watchPrefix && (
                                <p className="text-sm text-muted-foreground text-center p-4 border rounded-md">No hay sucursales creadas para esta empresa.</p>
                            )}
                        </div>
                    )}
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
