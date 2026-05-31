"use client";

import * as React from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, subWeeks, addWeeks } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";

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
import { Loader2, PlusCircle, Cake, Gift, ChevronLeft, ChevronRight, User, MoreHorizontal, Trash2, CalendarDays, ChevronDown, ChevronUp, History, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getEmpleados, getVacationRules, addVacationRequest, getVacationRequests, deleteVacationRequest, getVacationSettings, type VacationSettings, generateBirthdayMessage, generateAICard, getGeneratedCards, type GeneratedCard } from "@/services/vacaciones-service";
import type { EmpleadoVacaciones, VacationRule, VacationRequest } from "@/lib/data";
import { SolicitudDialog } from "./solicitud-dialog";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";


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
        <Card className="premium-card hover:translate-y-0 hover:scale-100 border border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 pb-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                            <CalendarDays className="h-5 w-5 text-primary" />
                            Calendario Semanal de Permisos
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs">
                            {format(weekStart, "d 'de' LLLL", { locale: es })} - {format(weekEnd, "d 'de' LLLL 'de' yyyy", { locale: es })}
                        </CardDescription>
                    </div>
                     <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 p-1 rounded-lg border shadow-sm">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 dark:text-slate-300" onClick={handlePrevWeek}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200" onClick={() => setCurrentDate(new Date())}>Hoy</Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 dark:text-slate-300" onClick={handleNextWeek}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-7 border-collapse">
                    {days.map((day, idx) => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const dayRequests = requestsByDay[dayKey] || [];
                        const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                        return (
                            <div 
                                key={day.toString()} 
                                className={cn(
                                    "p-3 border-r border-b border-slate-100 dark:border-slate-800/60 min-h-[140px] flex flex-col transition-all duration-200", 
                                    isToday && "bg-primary/[0.03] dark:bg-primary/[0.06] relative after:absolute after:top-0 after:left-0 after:right-0 after:h-1 after:bg-primary",
                                    idx === 6 && "border-r-0"
                                )}
                            >
                                <div className="flex justify-between items-center mb-2">
                                     <span className={cn(
                                         "text-sm font-semibold flex items-center justify-center w-7 h-7 rounded-full text-slate-700 dark:text-slate-300", 
                                         isToday && "bg-primary text-white font-bold shadow-sm shadow-primary/30"
                                     )}>
                                         {format(day, 'd')}
                                     </span>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider">
                                        {format(day, 'eee', { locale: es })}
                                    </span>
                                </div>
                                <div className="space-y-1.5 flex-grow overflow-y-auto scroll-premium">
                                    {dayRequests.length > 0 ? (
                                        dayRequests.map(req => (
                                            <div 
                                                key={req.id} 
                                                className={cn(
                                                    "p-2 rounded-lg text-xs border shadow-sm transition-all duration-200 hover:scale-[1.03] hover:shadow-md flex flex-col gap-0.5", 
                                                    req.type === 'vacaciones' 
                                                        ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-500/30' 
                                                        : 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/20 dark:border-rose-500/30'
                                                )}
                                            >
                                                <p className="font-semibold truncate flex items-center gap-1">
                                                    <User className="h-3 w-3 opacity-75" />
                                                    {req.employeeName}
                                                </p>
                                                <span className="text-[9px] opacity-75 font-medium">
                                                    {req.type === 'vacaciones' ? 'Vacaciones' : 'Dcto. Sueldo'}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                                            <span className="text-[9px] text-muted-foreground/50 italic">Libre</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    );
};




const generatePermitPDF = (
    employee: EmpleadoVacaciones,
    request: {
        daysRequested: number;
        startDate: Date;
        returnDate: Date;
        type: 'vacaciones' | 'sueldo';
        authorizer: string;
        deductedAmount?: number;
    }
) => {
    const doc = new jsPDF();

    // 1. Header with Border
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.5);
    doc.rect(14, 15, 182, 267); // Page border

    // Header title
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(14, 15, 182, 25, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text("FORMATO DE SOLICITUD Y AUTORIZACIÓN DE AUSENCIA", 22, 31);
    
    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text("Control de Vacaciones y Permisos de Personal", 22, 36);

    // Date
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy')}`, 155, 31);

    // Y position offset
    let y = 55;

    // Helper to draw section title
    const drawSectionTitle = (title: string) => {
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(20, y, 170, 7, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(title, 24, y + 5);
        y += 12;
    };

    // 2. Employee Info
    drawSectionTitle("DATOS DEL EMPLEADO");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105); // slate-600
    
    doc.text("Nombre Completo:", 24, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(employee.name, 60, y);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Prefijo / Región:", 24, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(employee.prefix.toUpperCase(), 60, y + 8);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Fecha de Ingreso:", 24, y + 16);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(format(new Date(employee.fechaIngreso), 'dd/MM/yyyy'), 60, y + 16);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Sueldo Semanal:", 24, y + 24);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(`$${employee.sueldoSemanal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 60, y + 24);

    y += 35;

    // 3. Request Details
    drawSectionTitle("DETALLES DE LA AUSENCIA");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    
    doc.text("Tipo de Permiso:", 24, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    const typeLabel = request.type === 'vacaciones' ? "A Cuenta de Vacaciones" : "Con Descuento a Sueldo (Permiso sin goce)";
    doc.text(typeLabel, 60, y);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Días Solicitados:", 24, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(`${request.daysRequested} ${request.daysRequested === 1 ? 'día' : 'días'}`, 60, y + 8);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Fecha de Inicio:", 24, y + 16);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(format(new Date(request.startDate), "PPP", { locale: es }), 60, y + 16);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Fecha de Regreso:", 24, y + 24);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(format(new Date(request.returnDate), "PPP", { locale: es }), 60, y + 24);

    if (request.type === 'sueldo') {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(153, 27, 27); // red-800
        doc.text("Deducción Estimada:", 24, y + 32);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(153, 27, 27);
        doc.text(`$${(request.deductedAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 60, y + 32);
    }

    y += 42;

    // 4. Agreement / Legal text
    drawSectionTitle("DECLARACIÓN DE CONFORMIDAD");
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85); // slate-700
    
    let agreementText = "";
    if (request.type === 'vacaciones') {
        agreementText = "Por medio del presente, el empleado declara estar de acuerdo en que el período solicitado se tome a cuenta de sus días de vacaciones acumulados de conformidad con la ley aplicable y las políticas internas de la empresa.";
    } else {
        agreementText = "Por medio del presente, el empleado declara su conformidad en que los días de ausencia solicitados no sean pagados, autorizando expresamente el descuento proporcional correspondiente en su próximo pago de nómina.";
    }
    
    const splitText = doc.splitTextToSize(agreementText, 168);
    doc.text(splitText, 22, y);

    y += 40;

    // 5. Signature Section
    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(0.5);
    
    // Employee signature line
    doc.line(25, y, 95, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("FIRMA DE CONFORMIDAD", 40, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text("Empleado", 55, y + 9);
    
    // Authorizer signature line
    doc.line(115, y, 185, y);
    doc.setFont("helvetica", "bold");
    doc.text("FIRMA DE AUTORIZACIÓN", 128, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text("Coordinador / Autorizador", 125, y + 9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text(request.authorizer, 115, y + 14, { align: 'left', maxWidth: 70 });

    const fileName = `Formato_Permiso_${employee.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(fileName);
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
  const [showPastHistory, setShowPastHistory] = React.useState(false);
  const [settings, setSettings] = React.useState<VacationSettings | null>(null);
  const [selectedBirthdayEmp, setSelectedBirthdayEmp] = React.useState<EmpleadoVacaciones | null>(null);
  const [aiImageUrl, setAiImageUrl] = React.useState<string>("");
  const [isGeneratingCard, setIsGeneratingCard] = React.useState(false);
  const [isDownloadingCard, setIsDownloadingCard] = React.useState(false);

  const [generatedCards, setGeneratedCards] = React.useState<GeneratedCard[]>([]);
  const lastLoadedEmpRef = React.useRef<string | null>(null);

  const handleRegenerate = React.useCallback(async () => {
    if (!selectedBirthdayEmp || !user?.prefix) return;
    setIsGeneratingCard(true);
    setAiImageUrl("");
    try {
      const defaultPrompt = settings?.cardPrompt || "Genera una tarjeta de felicitación alegre de cumpleaños para nuestro colaborador {name}. El diseño debe ser muy alegre, con mucho confeti y globos festivos sobre un fondo de tono claro y colorido (evita tonos oscuros). Integra el logotipo y la mascota adjuntos de forma de celebración.";
      const generatedUrl = await generateAICard(selectedBirthdayEmp.name, settings, defaultPrompt);
      setAiImageUrl(generatedUrl);
      
      // Actualizar listado local de tarjetas
      const cardsData = await getGeneratedCards(user.prefix);
      setGeneratedCards(cardsData);
      
      toast({ title: "Tarjeta generada", description: "La tarjeta de felicitación fue diseñada con éxito por Nano Banana 2." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al generar tarjeta", description: err.message || "Ocurrió un error inesperado con la IA." });
    } finally {
      setIsGeneratingCard(false);
    }
  }, [selectedBirthdayEmp, settings, user?.prefix, toast]);

  React.useEffect(() => {
    if (!selectedBirthdayEmp) {
      lastLoadedEmpRef.current = null;
      setAiImageUrl("");
      setIsGeneratingCard(false);
      return;
    }
    
    if (lastLoadedEmpRef.current === selectedBirthdayEmp.id) {
      return;
    }
    lastLoadedEmpRef.current = selectedBirthdayEmp.id;
    
    const existingCard = generatedCards.find(
      (c) => c.employeeName.toLowerCase() === selectedBirthdayEmp.name.toLowerCase()
    );
    
    if (existingCard) {
      setAiImageUrl(existingCard.imageUrl);
      setIsGeneratingCard(false);
    } else {
      handleRegenerate();
    }
  }, [selectedBirthdayEmp, generatedCards, handleRegenerate]);


  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
        setIsLoading(false);
        return;
    };
    setIsLoading(true);
    try {
        const [empData, rulesData, reqData, settingsData, cardsData] = await Promise.all([
            getEmpleados(user.prefix),
            getVacationRules(user.prefix),
            getVacationRequests(user.prefix),
            getVacationSettings(user.prefix),
            getGeneratedCards(user.prefix)
        ]);
        setEmployees(empData);
        setRules(rulesData);
        setRequests(reqData);
        setSettings(settingsData);
        setGeneratedCards(cardsData);
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
        const newRequest = {
            prefix: user.prefix,
            employeeId: selectedEmployee.id,
            employeeName: selectedEmployee.name,
            daysRequested: data.daysRequested,
            startDate: data.startDate,
            returnDate,
            type: data.permissionType,
            authorizer: data.authorizer,
            deductedAmount: deduction,
        };

        await addVacationRequest(newRequest);
        toast({ title: 'Éxito', description: 'Solicitud de vacaciones registrada.'});
        setIsDialogOpen(false);
        fetchData(); // Refresh all data

        // Generate and display PDF
        try {
            generatePermitPDF(selectedEmployee, newRequest);
        } catch (pdfErr) {
            console.error("Failed to generate permit PDF", pdfErr);
            toast({ variant: 'destructive', title: 'Error al generar PDF', description: 'El permiso se guardó pero no se pudo descargar el documento.' });
        }
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

  const { activeAndFutureRequests, pastRequests } = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeFuture = requests.filter(req => {
        const retDate = new Date(req.returnDate);
        retDate.setHours(0, 0, 0, 0);
        return retDate.getTime() >= today.getTime();
    });

    const past = requests.filter(req => {
        const retDate = new Date(req.returnDate);
        retDate.setHours(0, 0, 0, 0);
        return retDate.getTime() < today.getTime();
    });

    return { activeAndFutureRequests: activeFuture, pastRequests: past };
  }, [requests]);




  const handleDownloadAICard = () => {
    if (!selectedBirthdayEmp || !aiImageUrl) return;
    setIsDownloadingCard(true);
    try {
      const link = document.createElement("a");
      link.href = aiImageUrl;
      link.download = `Feliz_Cumpleanos_${selectedBirthdayEmp.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Tarjeta descargada", description: "La tarjeta se ha descargado correctamente." });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo realizar la descarga." });
    } finally {
      setIsDownloadingCard(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Tool Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gradient">
            Control de Vacaciones
          </h1>
        </div>
        <Button 
          onClick={() => setIsDialogOpen(true)} 
          className="bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Registrar Permiso
        </Button>
      </div>
 
      {/* Birthdays Section */}
      <Card className="premium-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Cake className="h-5 w-5 text-primary" />
            Cumpleaños del Mes
          </CardTitle>
          <CardDescription className="text-xs">
            Celebra y felicita a tus colaboradores en su día especial.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          {/* Today's Birthdays */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Cumpleaños de Hoy</h3>
            {todayBirthdays.length > 0 ? (
              <div className="space-y-4">
                {todayBirthdays.map(emp => {
                  const existingCard = generatedCards.find(
                    c => c.employeeName.toLowerCase() === emp.name.toLowerCase()
                  );
                  return (
                    <div key={emp.id} className="relative p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent dark:from-amber-500/20 dark:via-yellow-500/10 dark:to-transparent border border-amber-500/20 dark:border-amber-500/30 text-center overflow-hidden shadow-inner group transition-all duration-300">
                      <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-400/20 rounded-full blur-xl group-hover:scale-150 transition-all duration-500" />
                      
                      {existingCard ? (
                        <div className="relative aspect-square max-w-[200px] mx-auto rounded-xl overflow-hidden mb-3 border border-amber-500/30 bg-slate-50/50 dark:bg-slate-950/10 flex items-center justify-center">
                          <img src={existingCard.imageUrl} alt={`Tarjeta de ${emp.name}`} className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <Cake className="mx-auto h-14 w-14 text-amber-500 mb-3 animate-bounce" style={{ animationDuration: '3s' }} />
                      )}
                      
                      <p className="text-xl font-extrabold text-amber-800 dark:text-amber-300 tracking-tight">{emp.name}</p>
                      <p className="text-sm font-semibold text-amber-700/80 dark:text-amber-400/80 mt-1">¡Felicidades en su día!</p>
                      <Badge variant="outline" className="mt-3 border-amber-500/30 text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/30">
                        {format(new Date(emp.birthday!), "dd 'de' LLLL", { locale: es })}
                      </Badge>
                      <div className="mt-4">
                        <Button 
                          onClick={() => {
                            setSelectedBirthdayEmp(emp);
                          }}
                          className="h-8 text-xs bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-md shadow-amber-500/10 transition-all duration-300 rounded-xl"
                        >
                          <Gift className="mr-1.5 h-3.5 w-3.5 animate-pulse" /> {existingCard ? "Ver Tarjeta" : "Generar Tarjeta"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 text-muted-foreground text-center">
                <Cake className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-600">No hay cumpleaños hoy.</p>
              </div>
            )}
          </div>
 
          {/* Upcoming Birthdays */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Próximos Cumpleaños</h3>
            {isLoading ? (
                <div className="flex justify-center items-center h-32"><Loader2 className="h-6 w-6 text-primary animate-spin"/></div>
            ) : upcomingBirthdays.length > 0 ? (
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 scroll-premium">
                {upcomingBirthdays.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-200 shadow-sm hover:shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center border border-indigo-100/50 dark:border-indigo-950/50">
                        <Gift className="h-4 w-4 text-indigo-500" />
                      </div>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs truncate max-w-[160px] sm:max-w-none">{emp.name}</span>
                    </div>
                    <Badge variant="secondary" className="font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 dark:bg-indigo-500/20 text-[10px]">
                      {format(new Date(emp.birthday!), "dd 'de' LLLL", { locale: es })}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 text-muted-foreground text-center">
                <Gift className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-600">No hay más cumpleaños este mes.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Calendar Component */}
      <WeeklyCalendarView requests={requests} employees={employees} />
 
      {/* Permits History Card */}
      <Card className="premium-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Historial de Solicitudes Activas y Próximas
          </CardTitle>
          <CardDescription className="text-xs">
            Visualiza los permisos vigentes o programados para este mes y futuros meses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           {isLoading ? (
             <div className="flex flex-col justify-center items-center h-40 gap-2">
               <Loader2 className="h-8 w-8 text-primary animate-spin"/>
               <span className="text-xs text-muted-foreground font-medium">Cargando datos del historial...</span>
             </div>
           ) : (
             <>
               <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                 <Table>
                    <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
                        <TableRow>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs">Empleado</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs">Fecha Permiso</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs">Fecha de Regreso</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs">Días</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs">Tipo</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs">Autorizado Por</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs">Descuento</TableHead>
                            <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300 text-xs">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {activeAndFutureRequests.length > 0 ? activeAndFutureRequests.map(req => (
                            <TableRow key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                <TableCell className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{req.employeeName}</TableCell>
                                <TableCell className="text-xs text-slate-600 dark:text-slate-400">{format(req.startDate, "PPP", { locale: es })}</TableCell>
                                <TableCell className="text-xs text-slate-600 dark:text-slate-400">{format(req.returnDate, "PPP", { locale: es })}</TableCell>
                                <TableCell className="text-xs font-semibold">{req.daysRequested} {req.daysRequested === 1 ? 'día' : 'días'}</TableCell>
                                <TableCell>
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                          "capitalize text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm",
                                          req.type === 'vacaciones' 
                                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' 
                                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                                      )}
                                    >
                                        {req.type === 'vacaciones' ? 'Vacaciones' : 'Sueldo'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-slate-600 dark:text-slate-400">{req.authorizer}</TableCell>
                                <TableCell className={cn("text-xs font-semibold font-mono", (req.deductedAmount || 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
                                    {(req.deductedAmount || 0) > 0 ? `$${(req.deductedAmount || 0).toLocaleString()}` : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><MoreHorizontal className="h-4 w-4"/></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-36">
                                            <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground">Acciones</DropdownMenuLabel>
                                            <DropdownMenuItem onSelect={() => setRequestToDelete(req)} className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/20 cursor-pointer">
                                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground italic">No hay solicitudes activas o próximas programadas.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                 </Table>
               </div>

               {/* Collapsible Section for Past History */}
               {pastRequests.length > 0 && (
                 <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/30 dark:bg-slate-950/10">
                   <button
                     type="button"
                     onClick={() => setShowPastHistory(!showPastHistory)}
                     className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors text-left"
                   >
                     <div className="flex items-center gap-2">
                       <History className="h-4 w-4 text-slate-500" />
                       <div>
                         <p className="text-sm font-bold text-slate-700 dark:text-slate-350">Historial de Meses Anteriores</p>
                         <p className="text-[10px] text-muted-foreground mt-0.5">Ver solicitudes antiguas finalizadas ({pastRequests.length})</p>
                       </div>
                     </div>
                     {showPastHistory ? (
                       <ChevronUp className="h-4 w-4 text-slate-500" />
                     ) : (
                       <ChevronDown className="h-4 w-4 text-slate-500" />
                     )}
                   </button>
                   
                   {showPastHistory && (
                     <div className="border-t border-slate-100 dark:border-slate-800 p-1 bg-white dark:bg-slate-900">
                       <Table>
                         <TableHeader className="bg-slate-50/50 dark:bg-slate-900/30">
                             <TableRow>
                                 <TableHead className="font-bold text-slate-600 dark:text-slate-400 text-xs">Empleado</TableHead>
                                 <TableHead className="font-bold text-slate-600 dark:text-slate-400 text-xs">Fecha Permiso</TableHead>
                                 <TableHead className="font-bold text-slate-600 dark:text-slate-400 text-xs">Fecha de Regreso</TableHead>
                                 <TableHead className="font-bold text-slate-600 dark:text-slate-400 text-xs">Días</TableHead>
                                 <TableHead className="font-bold text-slate-600 dark:text-slate-400 text-xs">Tipo</TableHead>
                                 <TableHead className="font-bold text-slate-600 dark:text-slate-400 text-xs">Autorizado Por</TableHead>
                                 <TableHead className="font-bold text-slate-600 dark:text-slate-400 text-xs">Descuento</TableHead>
                                 <TableHead className="text-right font-bold text-slate-600 dark:text-slate-400 text-xs">Acciones</TableHead>
                             </TableRow>
                         </TableHeader>
                         <TableBody>
                             {pastRequests.map(req => (
                                 <TableRow key={req.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/20 transition-colors opacity-75 hover:opacity-100">
                                     <TableCell className="font-semibold text-slate-700 dark:text-slate-350 text-xs">{req.employeeName}</TableCell>
                                     <TableCell className="text-xs text-slate-500 dark:text-slate-500">{format(req.startDate, "PPP", { locale: es })}</TableCell>
                                     <TableCell className="text-xs text-slate-500 dark:text-slate-500">{format(req.returnDate, "PPP", { locale: es })}</TableCell>
                                     <TableCell className="text-xs font-semibold text-slate-600 dark:text-slate-400">{req.daysRequested} {req.daysRequested === 1 ? 'día' : 'días'}</TableCell>
                                     <TableCell>
                                         <Badge 
                                           variant="outline" 
                                           className={cn(
                                               "capitalize text-[9px] font-semibold px-2 py-0.5 rounded-full opacity-80 border shadow-xs",
                                               req.type === 'vacaciones' 
                                                   ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-450 border-emerald-500/10' 
                                                   : 'bg-rose-500/5 text-rose-600 dark:text-rose-450 border-rose-500/10'
                                           )}
                                         >
                                             {req.type === 'vacaciones' ? 'Vacaciones' : 'Sueldo'}
                                         </Badge>
                                     </TableCell>
                                     <TableCell className="text-xs text-slate-500 dark:text-slate-500">{req.authorizer}</TableCell>
                                     <TableCell className={cn("text-xs font-semibold font-mono text-slate-500", (req.deductedAmount || 0) > 0 && "text-rose-600/80")}>
                                         {(req.deductedAmount || 0) > 0 ? `$${(req.deductedAmount || 0).toLocaleString()}` : '-'}
                                     </TableCell>
                                     <TableCell className="text-right">
                                         <DropdownMenu>
                                             <DropdownMenuTrigger asChild>
                                                 <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><MoreHorizontal className="h-3.5 w-3.5"/></Button>
                                             </DropdownMenuTrigger>
                                             <DropdownMenuContent align="end" className="w-36">
                                                 <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground">Acciones</DropdownMenuLabel>
                                                 <DropdownMenuItem onSelect={() => setRequestToDelete(req)} className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/20 cursor-pointer">
                                                     <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                 </DropdownMenuItem>
                                             </DropdownMenuContent>
                                         </DropdownMenu>
                                     </TableCell>
                                 </TableRow>
                             ))}
                         </TableBody>
                       </Table>
                     </div>
                   )}
                 </div>
               )}
             </>
           )}
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!requestToDelete} onOpenChange={(open) => !open && setRequestToDelete(null)}>
        <AlertDialogContent className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-xl max-w-md">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-lg font-bold">¿Estás seguro de eliminar?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground mt-2">
                    Esta acción eliminará la solicitud de permiso para <strong className="text-slate-800 dark:text-slate-200">{requestToDelete?.employeeName}</strong> de forma permanente. Si fue un permiso de vacaciones, los días correspondientes se devolverán automáticamente al saldo del empleado.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 gap-2">
                <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteRequest} className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white">Eliminar</AlertDialogAction>
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

      {/* Birthday Card Customizer Dialog */}
      <Dialog open={!!selectedBirthdayEmp} onOpenChange={(open) => !open && setSelectedBirthdayEmp(null)}>
        <DialogContent className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg max-w-xl w-[90vw] p-6 flex flex-col items-center">
          <DialogHeader className="w-full border-b pb-3 mb-4 text-center">
            <DialogTitle className="text-xl font-bold flex items-center justify-center gap-2 text-slate-800 dark:text-slate-100">
              <Gift className="h-5 w-5 text-amber-500" />
              Tarjeta de Felicitación de {selectedBirthdayEmp?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Diseño generado automáticamente por la Inteligencia Artificial de Nano Banana 2.
            </DialogDescription>
          </DialogHeader>

          {/* Preview Container */}
          <div className="w-full flex justify-center items-center border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 rounded-2xl overflow-hidden shadow-xl p-2 min-h-[300px] max-h-[70vh]">
            {isGeneratingCard ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 animate-pulse">
                  Nano Banana 2 está creando tu tarjeta...
                </span>
              </div>
            ) : aiImageUrl ? (
              <img src={aiImageUrl} alt="Tarjeta generada por IA" className="max-w-full max-h-[60vh] object-contain rounded-xl" />
            ) : (
              <div className="p-6 text-center space-y-3">
                <div className="mx-auto w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                  <Gift className="h-7 w-7 text-rose-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-rose-700 dark:text-rose-450">Error de generación</p>
                  <p className="text-[10px] text-muted-foreground max-w-xs leading-relaxed">
                    No se pudo generar la tarjeta automáticamente. Intenta cerrar y abrir el panel de nuevo.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 w-full flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={isGeneratingCard || isDownloadingCard}
              className="h-9 px-4 text-xs rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900/50 dark:text-amber-450 dark:hover:bg-amber-950/20 flex items-center gap-1.5 font-bold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isGeneratingCard ? 'animate-spin' : ''}`} />
              Regenerar
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedBirthdayEmp(null)}
                className="h-9 px-4 text-xs rounded-xl"
              >
                Cerrar
              </Button>
              <Button
                onClick={handleDownloadAICard}
                disabled={isGeneratingCard || isDownloadingCard || !aiImageUrl}
                className="h-9 px-6 text-xs bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-md rounded-xl flex items-center gap-2"
              >
                {isDownloadingCard ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Descargando...
                  </>
                ) : (
                  <>
                    <Gift className="h-3.5 w-3.5" /> Descargar Tarjeta
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
