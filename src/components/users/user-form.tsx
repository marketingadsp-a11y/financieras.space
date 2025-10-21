

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
import type { PlazaUser, Plaza, Permission, Tool, Admin, LoanControlPermission, FlujoPermission, OverduePortfolioPermission } from "@/lib/data";
import { PERMISSIONS, LOAN_CONTROL_PERMISSIONS, FLUJO_PERMISSIONS, OVERDUE_PORTFOLIO_PERMISSIONS } from "@/lib/data";
import { Trash2 } from "lucide-react";

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
});


const editFormSchema = baseFormSchema.partial().omit({ username: true });
const createFormSchema = baseFormSchema.extend({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});


type UserFormProps = {
  onSubmit: (data: Omit<PlazaUser, 'id'>) => void;
  user?: PlazaUser | null;
  allPlazas: Plaza[];
  prefix?: string;
  admins?: Admin[];
  adminTools: Tool[];
  isSuperAdminView?: boolean;
};

const allPlazaPermissions = Object.entries(PERMISSIONS) as [Permission, string][];
const allLoanControlPermissions = Object.entries(LOAN_CONTROL_PERMISSIONS) as [LoanControlPermission, string][];
const allFlujoPermissions = Object.entries(FLUJO_PERMISSIONS) as [FlujoPermission, string][];
const allOverduePortfolioPermissions = Object.entries(OVERDUE_PORTFOLIO_PERMISSIONS) as [OverduePortfolioPermission, string][];


export function UserForm({ onSubmit, user, allPlazas, prefix, admins, adminTools, isSuperAdminView = false }: UserFormProps) {
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
        },
    });

    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "plazaAccess"
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
    const assignedPlazaIds = fields.map(field => field.plazaId);
    const availablePlazas = plazasForSelectedPrefix.filter(p => !assignedPlazaIds.includes(p.id));
    
    const showOverduePortfolioManagement = watchAccessibleTools.includes('cartera-vencida');
    const showLoanControlManagement = watchAccessibleTools.includes('loan-control');
    const showFlujoManagement = watchAccessibleTools.includes('flujo');

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


                
              </ScrollArea>
              <div className="pt-6">
                <Button type="submit" className="w-full">
                    {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
                </Button>
              </div>
            </form>
        </Form>
    );
}
