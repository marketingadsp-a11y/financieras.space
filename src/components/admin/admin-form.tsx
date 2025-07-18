
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
import type { Admin } from "@/lib/data";
import { getCustomizedTools } from "@/lib/data";
import { useAuth } from "@/context/auth-context";
import { Check, ChevronsUpDown, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { getAdmins } from "@/services/admin-service";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";


const linkedAdminAccessSchema = z.object({
  adminId: z.string().min(1),
  adminName: z.string(),
  allowedTools: z.array(z.string()).min(1, "Debe seleccionar al menos una herramienta."),
});

const formSchema = z.object({
  name: z.string().min(2, "El nombre es requerido."),
  username: z.string().min(2, "El nombre de usuario es requerido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional().or(z.literal('')),
  status: z.enum(["Activo", "Inactivo"]),
  prefix: z.string().min(1, "El prefijo es requerido."),
  linkedAdmins: z.array(linkedAdminAccessSchema).optional(),
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
    const [open, setOpen] = React.useState(false);
    const customTools = getCustomizedTools();

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
            linkedAdmins: admin?.linkedAdmins || [],
        },
    });

    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "linkedAdmins"
    });
    
    React.useEffect(() => {
        if(isSuperAdmin) {
            getAdmins().then(setAllAdmins);
        }
    }, [isSuperAdmin]);


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
    const assignedAdminIds = fields.map(field => field.adminId);
    const availableAdmins = otherAdmins.filter(a => !assignedAdminIds.includes(a.id));

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <ScrollArea className="h-[70vh] p-1">
                <div className="space-y-4 pr-4">
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
                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-medium">Asignar Paneles de Otros Admins</h3>
                                <p className="text-sm text-muted-foreground">Permite a este usuario ver herramientas de otros administradores.</p>
                                <FormMessage>{(form.formState.errors.linkedAdmins as any)?.root?.message}</FormMessage>
                            </div>
                            <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={open}
                                    className="w-[200px] justify-between"
                                >
                                    Asignar admin...
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar admin..." />
                                    <CommandList>
                                        <CommandEmpty>No hay más admins.</CommandEmpty>
                                        <CommandGroup>
                                            {availableAdmins.map((a) => {
                                                const adminLabel = `${a.name} (${a.prefix})`;
                                                return (
                                                    <CommandItem
                                                        key={a.id}
                                                        value={adminLabel}
                                                        onSelect={() => {
                                                            append({ adminId: a.id, adminName: adminLabel, allowedTools: [] });
                                                            setOpen(false)
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", assignedAdminIds.includes(a.id) ? "opacity-100" : "opacity-0")} />
                                                        {adminLabel}
                                                    </CommandItem>
                                                )
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        
                        <Accordion type="multiple" className="w-full space-y-2" defaultValue={fields.map((_, i) => `item-${i}`)}>
                            {fields.map((field, index) => {
                                return (
                                <AccordionItem key={field.id} value={`item-${index}`} className="border rounded-md px-4 bg-muted/20">
                                    <div className="flex items-center">
                                    <AccordionTrigger className="flex-1 text-base">{field.adminName}</AccordionTrigger>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                    </div>
                                    <AccordionContent>
                                        <FormField
                                        control={form.control}
                                        name={`linkedAdmins.${index}.allowedTools`}
                                        render={() => (
                                            <FormItem>
                                            <div className="mb-4">
                                                <FormLabel className="text-base">Permisos de Herramientas para {field.adminName}</FormLabel>
                                                <FormDescription>Selecciona las herramientas que este usuario podrá ver de este panel.</FormDescription>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                            {customTools.map((tool) => (
                                                <FormField
                                                key={tool.id}
                                                control={form.control}
                                                name={`linkedAdmins.${index}.allowedTools`}
                                                render={({ field: permissionField }) => (
                                                    <FormItem key={tool.id} className="flex flex-row items-start space-x-3 space-y-0">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={permissionField.value?.includes(tool.id)}
                                                                onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? permissionField.onChange([...(permissionField.value || []), tool.id])
                                                                    : permissionField.onChange((permissionField.value || []).filter(value => value !== tool.id))
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">{tool.name}</FormLabel>
                                                    </FormItem>
                                                )}
                                                />
                                            ))}
                                            </div>
                                            <FormMessage>{form.formState.errors.linkedAdmins?.[index]?.allowedTools?.message}</FormMessage>
                                            </FormItem>
                                        )}
                                        />
                                    </AccordionContent>
                                </AccordionItem>
                                )}
                            )}
                        </Accordion>
                    </div>
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
                </div>
                </ScrollArea>
                <Button type="submit" className="w-full">
                    {isEditing ? 'Guardar Cambios' : 'Crear Administrador'}
                </Button>
            </form>
        </Form>
    );
}
