
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, differenceInYears } from "date-fns";
import { es } from "date-fns/locale";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Calendar as CalendarIcon, Loader2, Check, ChevronsUpDown, CalendarDays, Wallet, User, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getEmpleados, getVacationRules, addVacationRequest, getVacationRequests } from "@/services/vacaciones-service";
import type { EmpleadoVacaciones, VacationRule, VacationRequest } from "@/lib/data";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  employeeId: z.string().min(1, "Debes seleccionar un empleado."),
  daysRequested: z.coerce.number().min(1, "Debe solicitar al menos 1 día."),
  startDate: z.date({ required_error: "La fecha de inicio es requerida." }),
  authorizer: z.string().min(3, "El nombre del autorizador es requerido."),
});
type FormValues = z.infer<typeof formSchema>;

export function ControlVacacionesDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = React.useState<EmpleadoVacaciones[]>([]);
  const [rules, setRules] = React.useState<VacationRule[]>([]);
  const [requests, setRequests] = React.useState<VacationRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [openCombobox, setOpenCombobox] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) return;
    setIsLoading(true);
    try {
        const [empData, rulesData, reqData] = await Promise.all([
            getEmpleados(user.prefix),
            getVacationRules(user.prefix),
            getVacationRequests(user.prefix),
        ]);
        setEmployees(empData);
        setRules(rulesData);
        setRequests(reqData);
    } catch(e) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos necesarios.' });
    } finally {
        setIsLoading(false);
    }
  }, [user?.prefix, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

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
  const selectedEmployee = React.useMemo(() => employees.find(e => e.id === employeeId), [employees, employeeId]);
  
  const availableDays = React.useMemo(() => {
      if (!selectedEmployee) return 0;
      const yearsOfService = differenceInYears(new Date(), new Date(selectedEmployee.fechaIngreso));
      if (yearsOfService < 1) return 0;
      const applicableRule = rules.filter(r => r.year <= yearsOfService).sort((a, b) => b.year - a.year)[0];
      const totalDays = applicableRule ? applicableRule.days : 0;
      return totalDays - (selectedEmployee.diasTomados || 0);
  }, [selectedEmployee, rules]);

  const permissionInfo = React.useMemo(() => {
    if (!selectedEmployee || !daysRequested || daysRequested <= 0) return { type: null, deduction: 0 };
    if (daysRequested <= availableDays) return { type: 'vacaciones', deduction: 0 };
    const dailySalary = selectedEmployee.sueldoSemanal / 6;
    return { type: 'sueldo', deduction: dailySalary * daysRequested };
  }, [selectedEmployee, daysRequested, availableDays]);
  
  const returnDate = React.useMemo(() => startDate && daysRequested > 0 ? addDays(startDate, daysRequested) : null, [startDate, daysRequested]);
  
  const onSubmit = async (data: FormValues) => {
    if (!user?.prefix || !selectedEmployee || !returnDate || !permissionInfo.type) {
        toast({ variant: 'destructive', title: 'Error', description: 'Faltan datos para registrar la solicitud.' });
        return;
    }
    setIsSubmitting(true);
    try {
        await addVacationRequest({
            prefix: user.prefix,
            employeeId: selectedEmployee.id,
            employeeName: selectedEmployee.name,
            daysRequested: data.daysRequested,
            startDate: data.startDate,
            returnDate,
            type: permissionInfo.type as 'vacaciones' | 'sueldo',
            authorizer: data.authorizer,
            deductedAmount: permissionInfo.deduction,
        });
        toast({ title: 'Éxito', description: 'Solicitud de vacaciones registrada.'});
        reset({ daysRequested: 1, authorizer: user.name || "" });
        fetchData(); // Refresh all data
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || 'No se pudo registrar la solicitud.' });
    } finally {
        setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Solicitudes</CardTitle>
          <CardDescription>
            Registra un nuevo permiso de vacaciones para un empleado.
          </CardDescription>
        </CardHeader>
        <CardContent>
           {isLoading ? (
             <div className="flex justify-center items-center h-40"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Cargando datos...</div>
           ) : (
             <Form {...form}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
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
                        <PopoverContent className="w-full p-0"><Command>
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
                    <FormField control={control} name="authorizer" render={({ field }) => (<FormItem><FormLabel>Autorizado por</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>

                  {selectedEmployee && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/30">
                        <div><p className="text-sm font-semibold">Días Disponibles</p><p className="text-lg">{availableDays} días</p></div>
                        <div><p className="text-sm font-semibold">Fecha de Regreso</p><p className="text-lg">{returnDate ? format(returnDate, "PPP", {locale: es}) : 'N/A'}</p></div>
                        <div><p className="text-sm font-semibold">Tipo de Permiso</p><p className="text-lg capitalize">{permissionInfo.type || 'N/A'}</p></div>
                        <div><p className="text-sm font-semibold">Descuento</p><p className="text-lg">${permissionInfo.deduction.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p></div>
                    </div>
                  )}

                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Registrar Permiso
                  </Button>
                </form>
             </Form>
           )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Historial de Solicitudes</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Fecha Permiso</TableHead>
                        <TableHead>Días</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Autorizado Por</TableHead>
                        <TableHead>Descuento</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests.length > 0 ? requests.map(req => (
                        <TableRow key={req.id}>
                            <TableCell className="font-medium">{req.employeeName}</TableCell>
                            <TableCell>{format(req.startDate, "PPP", { locale: es })}</TableCell>
                            <TableCell>{req.daysRequested}</TableCell>
                            <TableCell><Badge variant={req.type === 'vacaciones' ? 'secondary' : 'destructive'} className="capitalize">{req.type}</Badge></TableCell>
                            <TableCell>{req.authorizer}</TableCell>
                            <TableCell>${(req.deductedAmount || 0).toLocaleString()}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">Aún no hay solicitudes registradas.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
