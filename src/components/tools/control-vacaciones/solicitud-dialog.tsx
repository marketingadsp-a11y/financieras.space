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
import { Calendar as CalendarIcon, Loader2, Check, ChevronsUpDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { EmpleadoVacaciones, VacationRule, User } from "@/lib/data";
import { cn } from "@/lib/utils";

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
      return dailySalary * daysRequested;
    }
    return 0;
  }, [selectedEmployee, daysRequested, permissionType]);
  
  const returnDate = React.useMemo(() => {
    if (!startDate || !daysRequested || daysRequested <= 0) return null;
    const resultDate = new Date(startDate);
    resultDate.setDate(resultDate.getDate() + Number(daysRequested));
    return resultDate;
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Registrar Permiso de Vacaciones</DialogTitle>
          <DialogDescription>
            Completa los datos para registrar un nuevo permiso para un empleado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={handleSubmit(handleDialogSubmit)} className="space-y-6 pt-4 max-h-[70vh] overflow-y-auto pr-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <FormField control={control} name="employeeId" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Empleado</FormLabel>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}><PopoverTrigger asChild>
                        <FormControl>
                        <Button variant="outline" role="combobox" className={cn("justify-between", !field.value && "text-muted-foreground")}>
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
                <FormField control={control} name="daysRequested" render={({ field }) => (<FormItem><FormLabel>Días Solicitados</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="startDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Fecha del Permiso</FormLabel>
                    <Popover><PopoverTrigger asChild>
                        <FormControl>
                        <Button variant={"outline"} className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                        </Button>
                        </FormControl>
                    </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                    <FormMessage />
                    </FormItem>)} />
                </div>
                
                {selectedEmployee && (
                <div className="space-y-4">
                    <FormField
                        control={control}
                        name="permissionType"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                            <FormLabel>Tipo de Permiso</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-2">
                                <FormItem className="flex items-center space-x-3 space-y-0 p-4 border rounded-md has-[:checked]:border-primary">
                                    <FormControl><RadioGroupItem value="vacaciones" /></FormControl>
                                    <FormLabel className="font-normal w-full">A cuenta de vacaciones ({availableDays} días disponibles)</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0 p-4 border rounded-md has-[:checked]:border-primary">
                                    <FormControl><RadioGroupItem value="sueldo" /></FormControl>
                                    <FormLabel className="font-normal w-full">Con descuento a sueldo</FormLabel>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />

                    {permissionType === 'vacaciones' && daysRequested > availableDays && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Días insuficientes</AlertTitle>
                        <AlertDescription>
                            El empleado no tiene suficientes días de vacaciones disponibles. Si continúas, el registro podría resultar en un balance negativo de días.
                        </AlertDescription>
                    </Alert>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
                        <div><p className="text-sm font-semibold">Fecha de Regreso</p><p className="text-lg">{returnDate ? format(returnDate, "PPP", {locale: es}) : 'N/A'}</p></div>
                        <div><p className="text-sm font-semibold">Descuento</p><p className="text-lg">${deduction.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p></div>
                        <FormField control={control} name="authorizer" render={({ field }) => (<FormItem><FormLabel>Autorizado por</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </div>
                )}
                <DialogFooter className="pt-4 sticky bottom-0 bg-background">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
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
