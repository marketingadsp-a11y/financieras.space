"use client";
 
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInYears } from "date-fns";
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
import type { EmpleadoVacaciones, VacationRule } from "@/lib/data";
import type { User as UserType } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
 
// Helper function to calculate the return date, skipping Sundays
function addWorkDays(startDate: Date, days: number): Date {
  let returnDate = new Date(startDate);
  let daysCounted = 0;
  
  if (days <= 0) return returnDate;
 
  // This loop finds the last day of leave
  while (daysCounted < days) {
    // Only count if it's not a Sunday
    if (returnDate.getDay() !== 0) { 
      daysCounted++;
    }
    // If we haven't found all leave days, move to the next day
    if (daysCounted < days) {
       returnDate.setDate(returnDate.getDate() + 1);
    }
  }
 
  // The return date is the day AFTER the last day of leave
  returnDate.setDate(returnDate.getDate() + 1);
 
  // If the return day happens to be a Sunday, skip to Monday
  if (returnDate.getDay() === 0) {
    returnDate.setDate(returnDate.getDate() + 1);
  }
 
  return returnDate;
}
 
 
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
    user: UserType | null;
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
    return addWorkDays(startDate, daysRequested);
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
      <DialogContent className="sm:max-w-4xl rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Registrar Permiso de Personal
          </DialogTitle>
          <DialogDescription className="text-xs mt-1">
            Completa los datos para registrar una ausencia o período vacacional para el empleado seleccionado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={handleSubmit(handleDialogSubmit)} className="grid md:grid-cols-2 gap-x-8 gap-y-6 pt-4 max-h-[70vh] overflow-y-auto pr-2 scroll-premium">
                
                {/* Columna Izquierda: Detalles del permiso */}
                <div className="space-y-5">
                    <div>
                        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">1. Seleccionar Empleado</h3>
                        <FormField control={control} name="employeeId" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel className="sr-only">Empleado</FormLabel>
                            <Popover open={openCombobox} onOpenChange={setOpenCombobox}><PopoverTrigger asChild>
                                <FormControl>
                                <Button variant="outline" role="combobox" className={cn("justify-between w-full h-10 text-xs font-semibold rounded-lg shadow-sm border-slate-200 dark:border-slate-800", !field.value && "text-muted-foreground font-normal")}>
                                    {field.value ? employees.find(e => e.id === field.value)?.name : "Selecciona un empleado de la lista"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-slate-500" />
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl overflow-hidden border shadow-lg"><Command>
                                <CommandInput placeholder="Buscar empleado por nombre..." className="text-xs h-9" />
                                <CommandList className="max-h-[220px] scroll-premium"><CommandEmpty className="py-4 text-center text-xs text-muted-foreground">No se encontró ningún empleado.</CommandEmpty><CommandGroup>
                                {employees.map((employee) => (
                                    <CommandItem value={employee.name} key={employee.id} onSelect={() => { setValue("employeeId", employee.id); setOpenCombobox(false); }} className="text-xs py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                                    <Check className={cn("mr-2 h-4 w-4 text-primary", employee.id === field.value ? "opacity-100" : "opacity-0")} />
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
                           <Separator className="opacity-60" />
                           <div>
                                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">2. Detalles del Permiso</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={control} name="daysRequested" render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs font-semibold text-slate-600 dark:text-slate-400">Días Solicitados</FormLabel>
                                        <FormControl><Input type="number" min="1" className="h-10 rounded-lg text-xs" {...field} /></FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )} />
                                    <FormField control={control} name="startDate" render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                          <FormLabel className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Fecha de Inicio</FormLabel>
                                          <Popover><PopoverTrigger asChild>
                                              <FormControl>
                                              <Button variant={"outline"} className={cn("justify-start text-left font-normal h-10 rounded-lg text-xs border-slate-200 dark:border-slate-800", !field.value && "text-muted-foreground")}>
                                                  <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />{field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                              </Button>
                                              </FormControl>
                                          </PopoverTrigger><PopoverContent className="w-auto p-0 rounded-xl overflow-hidden border shadow-lg" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} /></PopoverContent></Popover>
                                          <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                           <Separator className="opacity-60" />
                           <div>
                             <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">3. Tipo de Permiso</h3>
                             <FormField
                                control={control}
                                name="permissionType"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                                            <div className="relative">
                                                <RadioGroupItem value="vacaciones" id="tipo-vacaciones" className="peer sr-only" />
                                                <Label 
                                                  htmlFor="tipo-vacaciones" 
                                                  className={cn(
                                                    "flex h-full flex-col items-center justify-center rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-5 hover:bg-slate-50 dark:hover:bg-slate-900/80 cursor-pointer transition-all duration-300 hover:scale-[1.02]",
                                                    permissionType === 'vacaciones' 
                                                      ? "border-emerald-500 bg-emerald-500/[0.03] dark:bg-emerald-950/10 shadow-sm shadow-emerald-500/10 text-emerald-800 dark:text-emerald-300" 
                                                      : "text-slate-600 dark:text-slate-400"
                                                  )}
                                                >
                                                    <CalendarIcon className={cn("mb-3 h-7 w-7 transition-colors", permissionType === 'vacaciones' ? "text-emerald-500" : "text-slate-400")} />
                                                    <span className="mb-1 block font-bold text-xs text-center">A cuenta de vacaciones</span>
                                                    <span className="block text-[10px] opacity-85 text-center font-semibold">{availableDays} días disponibles</span>
                                                </Label>
                                            </div>
                                            <div className="relative">
                                                <RadioGroupItem value="sueldo" id="tipo-sueldo" className="peer sr-only" />
                                                <Label 
                                                  htmlFor="tipo-sueldo" 
                                                  className={cn(
                                                    "flex h-full flex-col items-center justify-center rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-5 hover:bg-slate-50 dark:hover:bg-slate-900/80 cursor-pointer transition-all duration-300 hover:scale-[1.02]",
                                                    permissionType === 'sueldo' 
                                                      ? "border-rose-500 bg-rose-500/[0.03] dark:bg-rose-950/10 shadow-sm shadow-rose-500/10 text-rose-800 dark:text-rose-300" 
                                                      : "text-slate-600 dark:text-slate-400"
                                                  )}
                                                >
                                                     <Wallet className={cn("mb-3 h-7 w-7 transition-colors", permissionType === 'sueldo' ? "text-rose-500" : "text-slate-400")} />
                                                    <span className="mb-1 block font-bold text-xs text-center">Con descuento a sueldo</span>
                                                    <span className="block text-[10px] opacity-85 text-center font-semibold">Se descontará del pago</span>
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
                 <div className="space-y-5">
                    {selectedEmployee && (
                        <>
                            <Card className="border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm hover:translate-y-0 hover:scale-100">
                                <CardHeader className="bg-slate-100/50 dark:bg-slate-900/50 py-3.5 px-5">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                        <User className="h-4 w-4 text-primary"/>
                                        Resumen del Empleado
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 space-y-3 text-xs">
                                    <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Sueldo Semanal:</span> <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">${selectedEmployee.sueldoSemanal.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Sueldo Diario:</span> <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">${(selectedEmployee.sueldoSemanal / 6).toLocaleString('es-MX', {minimumFractionDigits: 2})}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Vacaciones Restantes:</span> <Badge variant="outline" className={cn("font-bold text-xs px-2 py-0.5 rounded-full border shadow-sm", availableDays > 0 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" : "bg-slate-100 text-slate-500")}>{availableDays} {availableDays === 1 ? 'día' : 'días'}</Badge></div>
                                </CardContent>
                            </Card>
 
                            {permissionType === 'vacaciones' && availableDays < daysRequested && (
                                <Alert variant="destructive" className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20 dark:border-amber-500/30 rounded-xl">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    <AlertTitle className="font-bold text-sm">Días insuficientes</AlertTitle>
                                    <AlertDescription className="text-xs mt-1 leading-relaxed">
                                       El empleado no tiene días de vacaciones suficientes. Los días adicionales solicitados se acumularán como saldo negativo contra sus futuros períodos.
                                    </AlertDescription>
                                </Alert>
                            )}
                            
                            <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:translate-y-0 hover:scale-100">
                                <CardHeader className="py-4 px-5 border-b">
                                    <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">Resumen y Autorización</CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 space-y-4">
                                     <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <span className="text-xs font-semibold text-slate-500">Fecha de Regreso:</span>
                                        <span className="font-bold text-sm text-primary">{returnDate ? format(returnDate, "PPP", {locale: es}) : 'N/A'}</span>
                                    </div>
                                    {permissionType === 'sueldo' && (
                                        <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/15 flex justify-between items-center">
                                            <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">Descuento a Sueldo:</span>
                                            <span className="font-mono font-bold text-base text-rose-600 dark:text-rose-400">${deduction.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
                                        </div>
                                    )}
                                    <FormField control={control} name="authorizer" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-slate-600 dark:text-slate-400">Autorizado por</FormLabel>
                                            <FormControl><Input className="rounded-lg h-9 text-xs" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>
                        </>
                     )}
                </div>
 
                <DialogFooter className="md:col-span-2 pt-4 border-t sticky bottom-0 bg-background/95 pb-2">
                    <Button type="button" variant="outline" className="rounded-lg text-xs" onClick={() => handleOpenChange(false)}>Cancelar</Button>
                    <Button 
                        type="submit" 
                        disabled={isSubmitting || !selectedEmployee} 
                        className="rounded-lg text-xs bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-white"
                    >
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
