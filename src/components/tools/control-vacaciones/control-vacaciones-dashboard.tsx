"use client";

import * as React from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, subWeeks, addWeeks } from "date-fns";
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
import { Loader2, PlusCircle, Cake, Gift, ChevronLeft, ChevronRight, User, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getEmpleados, getVacationRules, addVacationRequest, getVacationRequests, deleteVacationRequest } from "@/services/vacaciones-service";
import type { EmpleadoVacaciones, VacationRule, VacationRequest } from "@/lib/data";
import { SolicitudDialog } from "./solicitud-dialog";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


// New Weekly Calendar Component
const WeeklyCalendarView = ({ requests, employees }: { requests: VacationRequest[], employees: EmpleadoVacaciones[] }) => {
    const [currentDate, setCurrentDate] = React.useState(new Date());

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 }); // Sunday
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const requestsByDay: { [key: string]: VacationRequest[] } = {};

    days.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        requestsByDay[dayKey] = requests.filter(req => {
            // The returnDate is the day they are back, so the interval ends the day before.
            const interval = { start: req.startDate, end: subDays(req.returnDate, 1) };
            return isWithinInterval(day, interval);
        });
    });

    const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Calendario Semanal de Permisos</CardTitle>
                        <CardDescription>
                            {format(weekStart, "d 'de' LLLL", { locale: es })} - {format(weekEnd, "d 'de' LLLL 'de' yyyy", { locale: es })}
                        </CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={handlePrevWeek}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Hoy</Button>
                        <Button variant="outline" size="icon" onClick={handleNextWeek}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-7 border-t border-l">
                    {days.map(day => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const dayRequests = requestsByDay[dayKey] || [];
                        const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                        return (
                            <div key={day.toString()} className={cn("p-2 border-r border-b min-h-[120px] flex flex-col", isToday && "bg-blue-50 dark:bg-blue-900/20")}>
                                <div className="flex justify-between items-baseline">
                                     <span className={cn("font-semibold", isToday && "text-blue-600")}>{format(day, 'd')}</span>
                                    <span className="text-xs text-muted-foreground">{format(day, 'eee', { locale: es })}</span>
                                </div>
                                <div className="mt-2 space-y-1 flex-grow">
                                    {dayRequests.map(req => (
                                        <div key={req.id} className={cn("p-1.5 rounded-md text-xs", req.type === 'vacaciones' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>
                                            <p className="font-semibold truncate flex items-center gap-1.5">
                                                <User className="h-3 w-3" />
                                                {req.employeeName}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    );
};


export function ControlVacacionesDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = React.useState<EmpleadoVacaciones[]>([]);
  const [rules, setRules] = React.useState<VacationRule[]>([]);
  const [requests, setRequests] = React.useState<VacationRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [requestToDelete, setRequestToDelete] = React.useState<VacationRequest | null>(null);


  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
        setIsLoading(false);
        return;
    };
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
  
  const onSubmit = async (data: FormValues, returnDate: Date, deduction: number) => {
    const selectedEmployee = employees.find(e => e.id === data.employeeId);
    if (!user?.prefix || !selectedEmployee) {
        toast({ variant: 'destructive', title: 'Error', description: 'Faltan datos para registrar la solicitud.' });
        return;
    }
    
    try {
        await addVacationRequest({
            prefix: user.prefix,
            employeeId: selectedEmployee.id,
            employeeName: selectedEmployee.name,
            daysRequested: data.daysRequested,
            startDate: data.startDate,
            returnDate,
            type: data.permissionType,
            authorizer: data.authorizer,
            deductedAmount: deduction,
        });
        toast({ title: 'Éxito', description: 'Solicitud de vacaciones registrada.'});
        setIsDialogOpen(false);
        fetchData(); // Refresh all data
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || 'No se pudo registrar la solicitud.' });
    }
  };

  const handleDeleteRequest = async () => {
    if (!requestToDelete) return;
    try {
        await deleteVacationRequest(requestToDelete.id);
        toast({ title: "Éxito", description: "Solicitud eliminada correctamente." });
        setRequestToDelete(null);
        fetchData();
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || 'No se pudo eliminar la solicitud.' });
    }
  }
  
  type FormValues = {
      employeeId: string;
      daysRequested: number;
      startDate: Date;
      authorizer: string;
      permissionType: 'vacaciones' | 'sueldo';
  };

  const { todayBirthdays, upcomingBirthdays } = React.useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    const todayBdays: EmpleadoVacaciones[] = [];
    const upcomingBdays: EmpleadoVacaciones[] = [];

    employees.forEach(emp => {
      if (emp.birthday) {
        const birthday = new Date(emp.birthday);
        const birthMonth = birthday.getMonth();
        const birthDay = birthday.getDate();

        if (birthMonth === currentMonth && birthDay === currentDay) {
          todayBdays.push(emp);
        } else if (birthMonth === currentMonth && birthDay > currentDay) {
          upcomingBdays.push(emp);
        }
      }
    });

    // Sort upcoming birthdays by date
    upcomingBdays.sort((a, b) => new Date(a.birthday!).getDate() - new Date(b.birthday!).getDate());

    return { todayBirthdays: todayBdays, upcomingBirthdays: upcomingBdays };
  }, [employees]);


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cumpleaños del Mes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold mb-4">Cumpleaños de Hoy</h3>
            {todayBirthdays.length > 0 ? (
              <div className="space-y-4">
                {todayBirthdays.map(emp => (
                  <div key={emp.id} className="p-6 rounded-lg bg-gradient-to-br from-yellow-100 to-amber-200 dark:from-yellow-900/50 dark:to-amber-800/50 text-center">
                    <Cake className="mx-auto h-16 w-16 text-amber-500 mb-4" />
                    <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">{emp.name}</p>
                    <p className="text-lg text-muted-foreground">{format(new Date(emp.birthday!), "dd 'de' LLLL", { locale: es })}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <p>No hay cumpleaños hoy.</p>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Próximos Cumpleaños</h3>
            {isLoading ? (
                <div className="flex justify-center items-center h-40"><Loader2 className="mr-2 h-4 w-4 animate-spin"/></div>
            ) : upcomingBirthdays.length > 0 ? (
              <div className="space-y-2">
                {upcomingBirthdays.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Gift className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{emp.name}</span>
                    </div>
                    <span className="font-semibold">{format(new Date(emp.birthday!), "dd 'de' LLLL", { locale: es })}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <p>No hay más cumpleaños este mes.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <WeeklyCalendarView requests={requests} employees={employees} />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Historial de Solicitudes</CardTitle>
            <Button onClick={() => setIsDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4"/>
                Registrar Permiso
            </Button>
          </div>
          <CardDescription>
            Visualiza todos los permisos de vacaciones que has registrado.
          </CardDescription>
        </CardHeader>
        <CardContent>
           {isLoading ? (
             <div className="flex justify-center items-center h-40"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Cargando datos...</div>
           ) : (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Fecha Permiso</TableHead>
                        <TableHead>Fecha de Regreso</TableHead>
                        <TableHead>Días</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Autorizado Por</TableHead>
                        <TableHead>Descuento</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests.length > 0 ? requests.map(req => (
                        <TableRow key={req.id}>
                            <TableCell className="font-medium">{req.employeeName}</TableCell>
                            <TableCell>{format(req.startDate, "PPP", { locale: es })}</TableCell>
                            <TableCell>{format(req.returnDate, "PPP", { locale: es })}</TableCell>
                            <TableCell>{req.daysRequested}</TableCell>
                            <TableCell><Badge variant={req.type === 'vacaciones' ? 'secondary' : 'destructive'} className="capitalize">{req.type === 'vacaciones' ? 'Vacaciones' : 'Sueldo'}</Badge></TableCell>
                            <TableCell>{req.authorizer}</TableCell>
                            <TableCell>${(req.deductedAmount || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                        <DropdownMenuItem onSelect={() => setRequestToDelete(req)} className="text-destructive focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">Aún no hay solicitudes registradas.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
           )}
        </CardContent>
      </Card>
      
      <AlertDialog open={!!requestToDelete} onOpenChange={(open) => !open && setRequestToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción eliminará la solicitud de permiso para <strong>{requestToDelete?.employeeName}</strong>. Si fue un permiso de vacaciones, los días se devolverán al empleado.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteRequest}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

      <SolicitudDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={onSubmit}
        user={user}
        employees={employees}
        rules={rules}
      />
    </div>
  );
}
