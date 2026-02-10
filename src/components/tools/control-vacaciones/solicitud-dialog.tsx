
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, differenceInYears } from "date-fns";
import { es } from "date-fns/locale";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
  } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar as CalendarIcon, Loader2, Check, ChevronsUpDown, AlertTriangle, User, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { EmpleadoVacaciones, VacationRule, User } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  employeeId: z.string().min(1, "Debes seleccionar un empleado."),
  daysRequested: z.coerce.number().min(1, "Debe solicitar al menos 1 día."),
  startDate: z.date({ required_error: "La fecha de inicio es requerida." }),
  authorizer: z.string().min(3, "El nombre del autorizador es requerido."),
  permissionType: z.enum(['vacaciones', 'sueldo'], {
    required_error: "Debes seleccionar un tipo de permiso."
  }),
});
type FormValues = z.infer<typeof formSchema>;

interface SolicitudDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: FormValues, returnDate: Date, deduction: number) => Promise<void>;
    user: User | null;
    employees: EmpleadoVacaciones[];
    rules: VacationRule[];
}

export function SolicitudDialog({ isOpen, onOpenChange, onSubmit, user, employees, rules }: SolicitudDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [openCombobox, setOpenCombobox] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      daysRequested: 1,
      authorizer: user?.name || "",
    },
  });

  const { watch, control, setValue, handleSubmit, reset } = form;
  const employeeId = watch("employeeId");
  const daysRequested = watch("daysRequested");
  const startDate = watch("startDate");
  const permissionType = watch("permissionType");

  const selectedEmployee = React.useMemo(() => employees.find(e => e.id === employeeId), [employees, employeeId]);
  
  const availableDays = React.useMemo(() => {
      if (!selectedEmployee) return 0;
      const yearsOfService = differenceInYears(new Date(), new Date(selectedEmployee.fechaIngreso));
      if (yearsOfService < 1) return 0;
      const applicableRule = rules.filter(r => r.year <= yearsOfService).sort((a, b) => b.year - a.year)[0];
      const totalDays = applicableRule ? applicableRule.days : 0;
      return totalDays - (selectedEmployee.diasTomados || 0);
  }, [selectedEmployee, rules]);

  const deduction = React.useMemo(() => {
    if (permissionType === 'sueldo' && selectedEmployee && daysRequested > 0) {
      const dailySalary = selectedEmployee.sueldoSemanal / 6;
      return Math.floor(dailySalary * daysRequested);
    }
    return 0;
  }, [selectedEmployee, daysRequested, permissionType]);
  
  const returnDate = React.useMemo(() => {
    if (!startDate || !daysRequested || daysRequested <= 0) return null;
    return addDays(new Date(startDate), daysRequested);
  }, [startDate, daysRequested]);
  
  const handleDialogSubmit = async (data: FormValues) => {
    if (!returnDate) return;
    setIsSubmitting(true);
    await onSubmit(data, returnDate, deduction);
    setIsSubmitting(false);
    reset({ employeeId: undefined, startDate: undefined, daysRequested: 1, authorizer: user?.name || "" });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        reset({ employeeId: undefined, startDate: undefined, daysRequested: 1, authorizer: user?.name || "" });
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Registrar Permiso</DialogTitle>
          <DialogDescription>
            Completa los datos para registrar un nuevo permiso para un empleado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={handleSubmit(handleDialogSubmit)} className="grid md:grid-cols-2 gap-x-8 gap-y-6 pt-4 max-h-[75vh] overflow-y-auto pr-4">
                
                {/* Columna Izquierda: Detalles del permiso */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">1. Seleccionar Empleado</h3>
                        <FormField control={control} name="employeeId" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel className="sr-only">Empleado</FormLabel>
                            <Popover open={openCombobox} onOpenChange={setOpenCombobox}><PopoverTrigger asChild>
                                <FormControl>
                                <Button variant="outline" role="combobox" className={cn("justify-between w-full", !field.value && "text-muted-foreground")}>
                                    {field.value ? employees.find(e => e.id === field.value)?.name : "Selecciona un empleado"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
                                <CommandInput placeholder="Buscar empleado..." />
                                <CommandList><CommandEmpty>No se encontró el empleado.</CommandEmpty><CommandGroup>
                                {employees.map((employee) => (
                                    <CommandItem value={employee.name} key={employee.id} onSelect={() => { setValue("employeeId", employee.id); setOpenCombobox(false); }}>
                                    <Check className={cn("mr-2 h-4 w-4", employee.id === field.value ? "opacity-100" : "opacity-0")} />
                                    {employee.name}
                                    </CommandItem>
                                ))}
                                </CommandGroup></CommandList>
                            </Command></PopoverContent></Popover>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                     {selectedEmployee && (
                        <>
                           <Separator />
                           <div>
                                <h3 className="text-lg font-semibold mb-2">2. Detalles del Permiso</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={control} name="daysRequested" render={({ field }) => (<FormItem><FormLabel>Días Solicitados</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={control} name="startDate" render={({ field }) => (
                                        <FormItem className="flex flex-col"><FormLabel>Fecha de Inicio</FormLabel>
                                        <Popover><PopoverTrigger asChild>
                                            <FormControl>
                                            <Button variant={"outline"} className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona fecha</span>}
                                            </Button>
                                            </FormControl>
                                        </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                                        <FormMessage />
                                        </FormItem>)} />
                                </div>
                            </div>
                           <Separator />
                           <div>
                             <h3 className="text-lg font-semibold mb-2">3. Tipo de Permiso</h3>
                             <FormField
                                control={control}
                                name="permissionType"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                                            <div className="relative">
                                                <RadioGroupItem value="vacaciones" id="tipo-vacaciones" className="peer sr-only" disabled={availableDays <= 0} />
                                                <Label htmlFor="tipo-vacaciones" className="flex h-full flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-600 [&:has([data-state=checked])]:border-green-600 cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                                                    <CalendarIcon className="mb-3 h-6 w-6 text-green-600" />
                                                    <span className="mb-1 block font-semibold">A cuenta de vacaciones</span>
                                                    <span className="block text-sm text-muted-foreground">{availableDays} días disponibles</span>
                                                </Label>
                                            </div>
                                            <div className="relative">
                                                <RadioGroupItem value="sueldo" id="tipo-sueldo" className="peer sr-only" />
                                                <Label htmlFor="tipo-sueldo" className="flex h-full flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-destructive [&:has([data-state=checked])]:border-destructive cursor-pointer">
                                                     <Wallet className="mb-3 h-6 w-6 text-destructive" />
                                                    <span className="mb-1 block font-semibold">Con descuento a sueldo</span>
                                                    <span className="block text-sm text-muted-foreground">Se descontará del pago.</span>
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                           </div>
                        </>
                     )}
                </div>

                {/* Columna Derecha: Resumen */}
                 <div className="space-y-6">
                    {selectedEmployee && (
                        <>
                            <Card className="bg-muted/30">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <User className="h-5 w-5"/>
                                        Resumen del Empleado
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="flex justify-between"><span>Sueldo Semanal:</span> <span className="font-medium">${selectedEmployee.sueldoSemanal.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span>Sueldo Diario:</span> <span className="font-medium">${(selectedEmployee.sueldoSemanal / 6).toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span>Días de Vacaciones Restantes:</span> <span className="font-medium">{availableDays}</span></div>
                                </CardContent>
                            </Card>

                            {permissionType === 'vacaciones' && daysRequested > availableDays && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Días insuficientes</AlertTitle>
                                    <AlertDescription>
                                        El empleado no tiene suficientes días de vacaciones. El registro resultará en un balance negativo.
                                    </AlertDescription>
                                </Alert>
                            )}
                            
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">4. Resumen y Autorización</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="flex justify-between items-center text-lg">
                                        <span className="text-muted-foreground">Fecha de Regreso:</span>
                                        <span className="font-bold text-primary">{returnDate ? format(returnDate, "PPP", {locale: es}) : 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-lg">
                                        <span className="text-muted-foreground">Descuento a Sueldo:</span>
                                        <span className="font-bold text-destructive">${deduction.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
                                    </div>
                                    <FormField control={control} name="authorizer" render={({ field }) => (<FormItem><FormLabel>Autorizado por</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>

                <DialogFooter className="md:col-span-2 pt-4 sticky bottom-0 bg-background/95 pb-2">
                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting || !selectedEmployee}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Registrar Permiso
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
