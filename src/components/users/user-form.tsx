

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
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PlazaUser, Plaza, Permission, Tool, Admin, LoanControlPermission, FlujoPermission, OverduePortfolioPermission, RegistroOficinaPermission, OficinaRegistro } from "@/lib/data";
import { PERMISSIONS, LOAN_CONTROL_PERMISSIONS, FLUJO_PERMISSIONS, OVERDUE_PORTFOLIO_PERMISSIONS, REGISTRO_OFICINA_PERMISSIONS } from "@/lib/data";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";

const plazaAccessSchema = z.object({
  plazaId: z.string().min(1),
  plazaName: z.string().min(1),
  permissions: z.array(z.string()),
});

const loanControlPermissionsSchema = z.object({
    permissions: z.array(z.string()),
});

const flujoPermissionsSchema = z.object({
    permissions: z.array(z.string()),
});

const overduePortfolioPermissionsSchema = z.object({
    permissions: z.array(z.string()),
});

const registroOficinaAccessSchema = z.object({
  oficinaId: z.string().min(1),
  permissions: z.array(z.string()).min(1, "Debe seleccionar al menos un permiso."),
});

const baseFormSchema = z.object({
  name: z.string().min(2, "El nombre es requerido."),
  username: z.string().min(2, "El nombre de usuario es requerido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional().or(z.literal('')),
  prefix: z.string().min(1, "El prefijo de la empresa es requerido."),
  status: z.enum(["Activo", "Inactivo"]),
  accessibleTools: z.array(z.string()).min(1, "Debe asignar acceso a al menos una herramienta."),
  plazaAccess: z.array(plazaAccessSchema),
  loanControlPermissions: loanControlPermissionsSchema.optional(),
  flujoPermissions: flujoPermissionsSchema.optional(),
  overduePortfolioPermissions: overduePortfolioPermissionsSchema.optional(),
  registroOficinaAccess: z.array(registroOficinaAccessSchema).optional(),
});


const editFormSchema = baseFormSchema.partial().omit({ username: true });
const createFormSchema = baseFormSchema.extend({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});


type UserFormProps = {
  onSubmit: (data: Omit<PlazaUser, 'id'>) => void;
  user?: PlazaUser | null;
  allPlazas: Plaza[];
  allOficinas: OficinaRegistro[];
  prefix?: string;
  admins?: Admin[];
  adminTools: Tool[];
  isSuperAdminView?: boolean;
};

const allPlazaPermissions = Object.entries(PERMISSIONS) as [Permission, string][];
const allLoanControlPermissions = Object.entries(LOAN_CONTROL_PERMISSIONS) as [LoanControlPermission, string][];
const allFlujoPermissions = Object.entries(FLUJO_PERMISSIONS) as [FlujoPermission, string][];
const allOverduePortfolioPermissions = Object.entries(OVERDUE_PORTFOLIO_PERMISSIONS) as [OverduePortfolioPermission, string][];
const allRegistroOficinaPermissions = Object.entries(REGISTRO_OFICINA_PERMISSIONS) as [RegistroOficinaPermission, string][];


export function UserForm({ onSubmit, user, allPlazas, allOficinas, prefix, admins, adminTools, isSuperAdminView = false }: UserFormProps) {
    const isEditing = !!user;

    const form = useForm<z.infer<typeof baseFormSchema>>({
        resolver: zodResolver(
             isEditing
            ? editFormSchema
            : createFormSchema
        ),
        defaultValues: {
            name: user?.name || "",
            username: user?.username || "",
            password: "",
            prefix: user?.prefix || prefix || "",
            status: user?.status || "Activo",
            accessibleTools: user?.accessibleTools || [],
            plazaAccess: user?.plazaAccess || [],
            loanControlPermissions: user?.loanControlPermissions || { permissions: [] },
            flujoPermissions: user?.flujoPermissions || { permissions: [] },
            overduePortfolioPermissions: user?.overduePortfolioPermissions || { permissions: [] },
            registroOficinaAccess: user?.registroOficinaAccess || [],
        },
    });

    const { fields: plazaAccessFields, append: appendPlaza, remove: removePlaza } = useFieldArray({
      control: form.control,
      name: "plazaAccess"
    });
    
    const { fields: oficinaAccessFields, append: appendOficina, remove: removeOficina } = useFieldArray({
      control: form.control,
      name: "registroOficinaAccess"
    });
    
    const watchAccessibleTools = form.watch("accessibleTools", user?.accessibleTools || []);
    const watchPrefix = form.watch("prefix", user?.prefix || prefix || "");

    const handleFormSubmit = (values: z.infer<typeof baseFormSchema>) => {
        const dataToSend: any = { ...values };
        if (isEditing) {
            dataToSend.id = user.id;
            if (!values.password) {
                delete dataToSend.password;
            }
        }
        onSubmit(dataToSend);
    };
    
    const plazasForSelectedPrefix = allPlazas.filter(p => p.prefix === watchPrefix);
    const assignedPlazaIds = plazaAccessFields.map(field => field.plazaId);
    const availablePlazas = plazasForSelectedPrefix.filter(p => !assignedPlazaIds.includes(p.id));

    const oficinasForSelectedPrefix = allOficinas.filter(o => o.prefix === watchPrefix);
    const assignedOficinaIds = oficinaAccessFields.map(field => field.oficinaId);
    const availableOficinas = oficinasForSelectedPrefix.filter(o => !assignedOficinaIds.includes(o.id));
    
    const showOverduePortfolioManagement = watchAccessibleTools.includes('cartera-vencida');
    const showLoanControlManagement = watchAccessibleTools.includes('loan-control');
    const showFlujoManagement = watchAccessibleTools.includes('flujo');
    const showRegistroOficinaManagement = watchAccessibleTools.includes('registro-oficina');

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <ScrollArea className="h-[60vh] pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Nombre completo" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
                    <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Contraseña</FormLabel><FormControl><Input type="password" placeholder={isEditing ? "Dejar en blanco para no cambiar" : "••••••••"} {...field} /></FormControl><FormMessage /></FormItem>)} />
                    
                    {isSuperAdminView && admins && (
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
                    )}

                    <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-auto mb-2">
                          <FormLabel>Estado</FormLabel>
                          <FormControl><Switch checked={field.value === "Activo"} onCheckedChange={(checked) => field.onChange(checked ? "Activo" : "Inactivo")} /></FormControl>
                        </FormItem>
                    )} />
                </div>
                
                <div className="space-y-4 pt-4">
                    <h3 className="text-lg font-medium">Asignar Herramientas</h3>
                     <FormField
                        control={form.control}
                        name="accessibleTools"
                        render={() => (
                            <FormItem>
                            <FormDescription>Selecciona las herramientas a las que este usuario tendrá acceso.</FormDescription>
                            <div className="grid grid-cols-2 gap-4">
                                {adminTools.map((tool) => (
                                    <FormField
                                    key={tool.id}
                                    control={form.control}
                                    name="accessibleTools"
                                    render={({ field }) => {
                                        return (
                                        <FormItem key={tool.id} className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                                            <FormControl>
                                            <Checkbox
                                                checked={field.value?.includes(tool.id)}
                                                onCheckedChange={(checked) => {
                                                return checked
                                                    ? field.onChange([...(field.value || []), tool.id])
                                                    : field.onChange(
                                                        (field.value || []).filter(
                                                        (value) => value !== tool.id
                                                        )
                                                    )
                                                }}
                                            />
                                            </FormControl>
                                            <FormLabel className="font-normal flex-1 cursor-pointer">
                                                <p className="font-semibold">{tool.name}</p>
                                                <p className="text-xs text-muted-foreground">{tool.description}</p>
                                            </FormLabel>
                                        </FormItem>
                                        )
                                    }}
                                    />
                                ))}
                            </div>
                            <FormMessage>{form.formState.errors.accessibleTools?.message}</FormMessage>
                        </FormItem>
                        )}
                    />
                </div>

                {showOverduePortfolioManagement && (
                    <div className="space-y-4 pt-4">
                        <h3 className="text-lg font-medium">Permisos para Cartera Vencida</h3>
                        <FormField
                            control={form.control}
                            name="overduePortfolioPermissions.permissions"
                            render={() => (
                                <FormItem>
                                <FormDescription>Selecciona las acciones que este usuario podrá realizar en "Cartera Vencida".</FormDescription>
                                <div className="grid grid-cols-2 gap-4">
                                    {allOverduePortfolioPermissions.map(([key, label]) => (
                                        <FormField
                                        key={key}
                                        control={form.control}
                                        name="overduePortfolioPermissions.permissions"
                                        render={({ field }) => (
                                            <FormItem key={key} className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(key)}
                                                        onCheckedChange={(checked) => {
                                                            const newValue = field.value || [];
                                                            return checked
                                                                ? field.onChange([...newValue, key])
                                                                : field.onChange(newValue.filter(value => value !== key));
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal flex-1 cursor-pointer">{label}</FormLabel>
                                            </FormItem>
                                        )}
                                        />
                                    ))}
                                </div>
                                <FormMessage>{form.formState.errors.overduePortfolioPermissions?.message || (form.formState.errors.overduePortfolioPermissions as any)?.root?.message}</FormMessage>
                                </FormItem>
                            )}
                        />
                    </div>
                )}


                {showLoanControlManagement && (
                    <div className="space-y-4 pt-4">
                         <h3 className="text-lg font-medium">Permisos para Control de Préstamo</h3>
                         <FormField
                            control={form.control}
                            name="loanControlPermissions.permissions"
                            render={() => (
                                <FormItem>
                                <FormDescription>Selecciona las acciones que este usuario podrá realizar en la herramienta "Control de Préstamo".</FormDescription>
                                <div className="grid grid-cols-2 gap-4">
                                    {allLoanControlPermissions.map(([key, label]) => (
                                        <FormField
                                        key={key}
                                        control={form.control}
                                        name="loanControlPermissions.permissions"
                                        render={({ field }) => (
                                            <FormItem key={key} className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(key)}
                                                        onCheckedChange={(checked) => {
                                                            const newValue = field.value || [];
                                                            return checked
                                                                ? field.onChange([...newValue, key])
                                                                : field.onChange(newValue.filter(value => value !== key));
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal flex-1 cursor-pointer">{label}</FormLabel>
                                            </FormItem>
                                        )}
                                        />
                                    ))}
                                </div>
                                <FormMessage>{form.formState.errors.loanControlPermissions?.message || (form.formState.errors.loanControlPermissions as any)?.root?.message}</FormMessage>
                                </FormItem>
                            )}
                         />
                    </div>
                )}

                {showFlujoManagement && (
                    <div className="space-y-4 pt-4">
                         <h3 className="text-lg font-medium">Permisos para Flujo</h3>
                         <FormField
                            control={form.control}
                            name="flujoPermissions.permissions"
                            render={() => (
                                <FormItem>
                                <FormDescription>Selecciona las acciones que este usuario podrá realizar en la herramienta "Flujo".</FormDescription>
                                <div className="grid grid-cols-2 gap-4">
                                    {allFlujoPermissions.map(([key, label]) => (
                                        <FormField
                                        key={key}
                                        control={form.control}
                                        name="flujoPermissions.permissions"
                                        render={({ field }) => (
                                            <FormItem key={key} className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(key)}
                                                        onCheckedChange={(checked) => {
                                                            const newValue = field.value || [];
                                                            return checked
                                                                ? field.onChange([...newValue, key])
                                                                : field.onChange(newValue.filter(value => value !== key));
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal flex-1 cursor-pointer">{label}</FormLabel>
                                            </FormItem>
                                        )}
                                        />
                                    ))}
                                </div>
                                <FormMessage>{form.formState.errors.flujoPermissions?.message || (form.formState.errors.flujoPermissions as any)?.root?.message}</FormMessage>
                                </FormItem>
                            )}
                         />
                    </div>
                )}
                
                {showRegistroOficinaManagement && (
                     <div className="space-y-4 pt-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-medium">Acceso para Registro de Oficina</h3>
                                <p className="text-sm text-muted-foreground">Asigna las oficinas y los permisos que tendrá el usuario.</p>
                                <FormMessage>{(form.formState.errors.registroOficinaAccess as any)?.root?.message}</FormMessage>
                            </div>
                            <Select onValueChange={(oficinaId) => {
                                const oficina = allOficinas.find(o => o.id === oficinaId);
                                if (oficina) {
                                    appendOficina({ oficinaId, permissions: [] });
                                }
                            }} value="">
                                <SelectTrigger className="w-[200px]" disabled={!watchPrefix}>
                                    <SelectValue placeholder={!watchPrefix ? "Elige una empresa" : "Asignar oficina..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableOficinas.length > 0 ? (
                                        availableOficinas.map(oficina => (
                                            <SelectItem key={oficina.id} value={oficina.id}>{oficina.name}</SelectItem>
                                        ))
                                    ) : (
                                        <div className="p-2 text-sm text-muted-foreground">No hay más oficinas para asignar.</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <Accordion type="multiple" className="w-full space-y-2" defaultValue={oficinaAccessFields.map((_, i) => `item-${i}`)}>
                            {oficinaAccessFields.map((field, index) => {
                                const oficinaName = allOficinas.find(s => s.id === field.oficinaId)?.name;
                                return (
                                <AccordionItem key={field.id} value={`item-${index}`} className="border rounded-md px-4 bg-muted/20">
                                    <div className="flex items-center">
                                    <AccordionTrigger className="flex-1 text-base">{oficinaName}</AccordionTrigger>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeOficina(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                    </div>
                                    <AccordionContent>
                                        <FormField
                                        control={form.control}
                                        name={`registroOficinaAccess.${index}.permissions`}
                                        render={() => (
                                            <FormItem>
                                            <div className="mb-4">
                                                <FormLabel className="text-base">Permisos para {oficinaName}</FormLabel>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                            {allRegistroOficinaPermissions.map(([key, label]) => (
                                                <FormField
                                                key={key}
                                                control={form.control}
                                                name={`registroOficinaAccess.${index}.permissions`}
                                                render={({ field: permissionField }) => {
                                                    return (
                                                    <FormItem
                                                        key={key}
                                                        className="flex flex-row items-start space-x-3 space-y-0"
                                                    >
                                                        <FormControl>
                                                        <Checkbox
                                                            checked={permissionField.value?.includes(key)}
                                                            onCheckedChange={(checked) => {
                                                            return checked
                                                                ? permissionField.onChange([...(permissionField.value || []), key])
                                                                : permissionField.onChange(
                                                                    (permissionField.value || []).filter(
                                                                    (value) => value !== key
                                                                    )
                                                                )
                                                            }}
                                                        />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">
                                                        {label}
                                                        </FormLabel>
                                                    </FormItem>
                                                    )
                                                }}
                                                />
                                            ))}
                                            </div>
                                            <FormMessage>{form.formState.errors.registroOficinaAccess?.[index]?.permissions?.message}</FormMessage>
                                            </FormItem>
                                        )}
                                        />
                                    </AccordionContent>
                                </AccordionItem>
                                )}
                            )}
                        </Accordion>
                         {oficinasForSelectedPrefix.length === 0 && watchPrefix && (
                            <p className="text-sm text-muted-foreground text-center p-4 border rounded-md">No hay oficinas creadas para esta empresa. Crea una en la sección de oficinas primero para poder asignarla.</p>
                        )}
                    </div>
                )}
                
              </ScrollArea>
              <div className="pt-6 border-t">
                <Button type="submit" className="w-full">
                    {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
                </Button>
              </div>
            </form>
        </Form>
    );
}
