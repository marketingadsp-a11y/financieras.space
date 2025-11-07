

"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { OficinaRegistro, OficinaSemanalRegistro } from "@/lib/data";
import { getOficinaById, getTodosRegistrosPorOficina, addOrUpdateRegistroSemanal } from "@/services/registro-oficina-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, Calendar, Edit, DollarSign, Lock } from "lucide-react";
import Link from "next/link";
import { startOfMonth, endOfMonth, addMonths, subMonths, format, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { RegistroSemanalForm } from "./registro-semanal-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getWeeksForMonth(monthDate: Date): { start: Date; end: Date }[] {
    const year = monthDate.getUTCFullYear();
    const month = monthDate.getUTCMonth();

    // 1. Get the 25th of the PREVIOUS month in UTC.
    const anchorDate = new Date(Date.UTC(year, month - 1, 25));

    // 2. Find the Saturday that starts the week containing our anchor date.
    // getUTCDay() is Sunday(0), Monday(1), ..., Saturday(6).
    const dayOfWeek = anchorDate.getUTCDay(); // 0 for Sun, 6 for Sat
    
    // Calculate how many days to go back to get to Saturday.
    const daysToSubtract = dayOfWeek === 6 ? 0 : dayOfWeek + 1;

    const firstWeekStart = new Date(anchorDate);
    firstWeekStart.setUTCDate(anchorDate.getUTCDate() - daysToSubtract);
    
    // Forcefully add one day as requested by the user to correct the persistent off-by-one error.
    firstWeekStart.setUTCDate(firstWeekStart.getUTCDate() + 1);


    // 3. Generate 4 consecutive 7-day weeks from that start date.
    const weeks = [];
    for (let i = 0; i < 4; i++) {
        const weekStart = new Date(firstWeekStart);
        weekStart.setUTCDate(firstWeekStart.getUTCDate() + (i * 7));

        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 6); // A week is 7 days long, so end is start + 6

        weeks.push({ start: weekStart, end: weekEnd });
    }

    return weeks;
}



const WeekCard = ({ 
    week, 
    weekIndex, 
    registro,
    onRegister
}: { 
    week: { start: Date, end: Date }, 
    weekIndex: number, 
    registro: OficinaSemanalRegistro | null,
    onRegister: (week: {start: Date, end: Date}, existingData?: OficinaSemanalRegistro | null) => void
}) => {
    const conceptos = [
        { label: "Recogido Seguros", value: registro?.recogidoSeguros },
        { label: "Cartera Vencida", value: registro?.carteraVencida },
        { label: "Interés Mensual", value: registro?.interesMensual },
        { label: "Capital Mensual", value: registro?.capitalMensual },
        { label: "Caja Chica", value: registro?.cajaChica },
    ];
    
    const totalSemanal = registro ? conceptos.reduce((sum, item) => sum + (item.value || 0), 0) : 0;
    
    const weekEndDate = new Date(week.end);
    weekEndDate.setUTCHours(23, 59, 59, 999);
    const hasWeekPassed = isPast(weekEndDate);


    return (
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Semana {weekIndex + 1}
                </div>
                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRegister(week, registro)}>
                    {hasWeekPassed ? <Lock className="h-4 w-4 text-amber-500" /> : <Edit className="h-4 w-4" />}
                </Button>
              </CardTitle>
              <CardDescription>
                Del {format(week.start, "dd 'de' LLLL", { locale: es })} al {format(week.end, "dd 'de' LLLL", { locale: es })}
              </CardDescription>
              {registro && (
                 <div className="pt-2">
                    <p className="text-sm font-semibold text-primary">Total Semana: ${totalSemanal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                 </div>
              )}
            </CardHeader>
            <CardContent>
                {registro ? (
                    <div className="space-y-2">
                        {conceptos.map(c => (
                            <div key={c.label} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                                <span>{c.label}:</span>
                                <span className="font-semibold">${(c.value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <p className="text-muted-foreground mb-4">No hay datos registrados para esta semana.</p>
                         <Button onClick={() => onRegister(week, null)}>Registrar Datos</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


export function OficinaRegistroPanel({ oficinaId }: { oficinaId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [oficina, setOficina] = React.useState<OficinaRegistro | null>(null);
  const [allRegistros, setAllRegistros] = React.useState<OficinaSemanalRegistro[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentMonth, setCurrentMonth] = React.useState(new Date(new Date().setUTCHours(12, 0, 0, 0)));

  // Form State
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedWeek, setSelectedWeek] = React.useState<{start: Date, end: Date} | null>(null);
  const [existingDataForForm, setExistingDataForForm] = React.useState<OficinaSemanalRegistro | null>(null);
  
  // Authorization State
  const [isAuthDialogOpen, setIsAuthDialogOpen] = React.useState(false);
  const [authCode, setAuthCode] = React.useState('');
  const [weekToAuthorize, setWeekToAuthorize] = React.useState<{week: {start: Date, end: Date}, data: OficinaSemanalRegistro | null} | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const oficinaData = await getOficinaById(oficinaId);
      setOficina(oficinaData);
      if (oficinaData) {
          const todosLosRegistros = await getTodosRegistrosPorOficina(oficinaId);
          setAllRegistros(todosLosRegistros);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la información de la oficina.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [oficinaId, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const weeks = getWeeksForMonth(currentMonth);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleRegisterClick = (week: {start: Date, end: Date}, existingData?: OficinaSemanalRegistro | null) => {
    const weekEndDate = new Date(week.end);
    weekEndDate.setUTCHours(23, 59, 59, 999);
    const hasWeekPassed = isPast(weekEndDate);
    
    if (hasWeekPassed) {
        setWeekToAuthorize({ week, data: existingData || null });
        setIsAuthDialogOpen(true);
    } else {
        setSelectedWeek(week);
        setExistingDataForForm(existingData || null);
        setIsFormOpen(true);
    }
  };
  
  const handleAuthorization = () => {
    if (authCode === '0120') {
        if (weekToAuthorize) {
            setSelectedWeek(weekToAuthorize.week);
            setExistingDataForForm(weekToAuthorize.data);
            setIsFormOpen(true);
        }
        closeAuthDialog();
    } else {
        toast({
            variant: "destructive",
            title: "Error de Autorización",
            description: "El código ingresado es incorrecto.",
        });
    }
  };

  const closeAuthDialog = () => {
    setIsAuthDialogOpen(false);
    setAuthCode('');
    setWeekToAuthorize(null);
  };
  
  const handleFormSubmit = async (data: Omit<OficinaSemanalRegistro, 'id' | 'prefix' | 'oficinaId' | 'weekStartDate' | 'updatedAt' | 'updatedBy'>) => {
    if (!user || !oficina || !selectedWeek) return;

    const registroData = {
        ...data,
        oficinaId: oficina.id,
        prefix: oficina.prefix,
        weekStartDate: selectedWeek.start,
        updatedAt: new Date(),
        updatedBy: user.name || user.username
    };

    try {
        await addOrUpdateRegistroSemanal(registroData);
        toast({ title: "Éxito", description: "Registro guardado correctamente."});
        setIsFormOpen(false);
        fetchData(); // Refetch all data after submission
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el registro." });
    }
  };
  
 const registrosDelMes = React.useMemo(() => {
    const monthWeeks = getWeeksForMonth(currentMonth);
    if (monthWeeks.length === 0) return [];
    
    const cycleStart = monthWeeks[0].start;
    const cycleEnd = monthWeeks[3].end;

    return allRegistros.filter(r => {
        if (!r.weekStartDate) return false;
        const registroDate = new Date(r.weekStartDate);
        // Compare just the date part in UTC to be safe
        const registroUTC = Date.UTC(registroDate.getUTCFullYear(), registroDate.getUTCMonth(), registroDate.getUTCDate());
        const startUTC = Date.UTC(cycleStart.getUTCFullYear(), cycleStart.getUTCMonth(), cycleStart.getUTCDate());
        const endUTC = Date.UTC(cycleEnd.getUTCFullYear(), cycleEnd.getUTCMonth(), cycleEnd.getUTCDate());
        return registroUTC >= startUTC && registroUTC <= endUTC;
    });
}, [allRegistros, currentMonth]);


  const monthlyTotals = React.useMemo(() => {
    return registrosDelMes.reduce((acc, registro) => {
        acc.recogidoSeguros += registro.recogidoSeguros || 0;
        acc.carteraVencida += registro.carteraVencida || 0;
        acc.interesMensual += registro.interesMensual || 0;
        acc.capitalMensual += registro.capitalMensual || 0;
        acc.cajaChica += registro.cajaChica || 0;
        return acc;
    }, {
        recogidoSeguros: 0,
        carteraVencida: 0,
        interesMensual: 0,
        capitalMensual: 0,
        cajaChica: 0,
    });
  }, [registrosDelMes]);
  
  const totalDelMes = Object.values(monthlyTotals).reduce((sum, value) => sum + value, 0);

  const currentMonthRange = React.useMemo(() => {
    if (weeks.length < 4) return "";
    const start = weeks[0].start;
    const end = weeks[3].end;
    const startMonth = format(start, "LLLL", { locale: es });
    const endMonth = format(end, "LLLL", { locale: es });
    
    if (startMonth === endMonth) {
        return `Del ${format(start, 'dd')} al ${format(end, "dd 'de' LLLL 'de' yyyy", { locale: es })}`;
    }
    return `Del ${format(start, "dd 'de' LLLL")} al ${format(end, "dd 'de' LLLL 'de' yyyy", { locale: es })}`;
  }, [weeks]);


  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando datos de la oficina...</span>
      </div>
    );
  }

  if (!oficina) {
      return (
          <div className="text-center">
              <h2 className="text-xl font-semibold">Oficina no encontrada</h2>
              <Button asChild variant="link"><Link href="/tools/registro-oficina">Volver al Dashboard</Link></Button>
          </div>
      )
  }

  return (
    <div className="space-y-6">
       <Button variant="outline" asChild>
            <Link href="/tools/registro-oficina">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
            </Link>
        </Button>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Registro para: {oficina.name}
          </h1>
          <p className="text-muted-foreground">
            Ingresa los datos semanales para los conceptos de la oficina.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold capitalize w-48 text-center">
                {format(currentMonth, "LLLL yyyy", { locale: es })}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      </div>

       <Card className="bg-primary/5">
        <CardHeader>
            <CardTitle>Resumen del Mes</CardTitle>
            <CardDescription>{currentMonthRange}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.entries(monthlyTotals).map(([key, value]) => (
                    <div key={key} className="p-4 rounded-lg bg-background shadow-sm">
                        <p className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                        <p className="text-2xl font-bold flex items-center gap-1"><DollarSign className="h-5 w-5 text-muted-foreground"/> {value.toLocaleString('es-MX')}</p>
                    </div>
                ))}
            </div>
             <div className="mt-4 p-4 rounded-lg bg-blue-500/10 text-blue-700 shadow-sm text-center">
                <p className="text-sm font-medium">TOTAL DEL MES</p>
                <div className="text-3xl font-bold flex items-center justify-center gap-1"><DollarSign className="h-6 w-6"/> {totalDelMes.toLocaleString('es-MX')}</div>
             </div>
        </CardContent>
       </Card>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {weeks.map((week, index) => {
            const registro = allRegistros.find(r => {
                if (!r.weekStartDate) return false;
                // Compare just the date part in UTC to be safe
                const rDateUTC = new Date(r.weekStartDate).setUTCHours(0,0,0,0);
                const weekStartUTC = new Date(week.start).setUTCHours(0,0,0,0);
                return rDateUTC === weekStartUTC;
            }) || null;
            return <WeekCard key={index} week={week} weekIndex={index} registro={registro} onRegister={handleRegisterClick} />
        })}
      </div>
      
       <RegistroSemanalForm
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSubmit={handleFormSubmit}
            existingData={existingDataForForm}
            week={selectedWeek}
        />

        <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Código de Autorización Requerido</DialogTitle>
                    <DialogDescription>
                        Estás intentando editar una semana que ya ha finalizado. Por favor, ingresa el código de autorización para continuar.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="auth-code">Código de Autorización</Label>
                    <Input 
                        id="auth-code"
                        type="password"
                        value={authCode}
                        onChange={(e) => setAuthCode(e.target.value)}
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={closeAuthDialog}>Cancelar</Button>
                    <Button onClick={handleAuthorization}>Autorizar y Editar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

    