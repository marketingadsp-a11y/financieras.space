
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { OficinaRegistro, OficinaSemanalRegistro } from "@/lib/data";
import { getOficinaById, getTodosRegistrosPorOficina, addOrUpdateRegistroSemanal } from "@/services/registro-oficina-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, Calendar, Edit, DollarSign } from "lucide-react";
import Link from "next/link";
import { startOfMonth, endOfMonth, addMonths, subMonths, format, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { RegistroSemanalForm } from "./registro-semanal-form";

// This function now operates exclusively in UTC to avoid timezone issues.
function getWeeksForMonth(month: Date): { start: Date; end: Date }[] {
    const weeks = [];
    const year = month.getUTCFullYear();
    const monthIndex = month.getUTCMonth();
    
    // Day of the week for the first day of the month (0=Sun, 1=Mon, ..., 6=Sat)
    const firstDayOfWeek = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay(); 
    
    // Calculate the date of the first Saturday of the month.
    // If the 1st is a Saturday, diff is 0. If it's a Sunday, diff is 6.
    const diffToSaturday = (6 - firstDayOfWeek + 7) % 7;
    let firstSaturday = new Date(Date.UTC(year, monthIndex, 1 + diffToSaturday));

    // If the first Saturday is after the 7th, it means the "first week" according
    // to this logic actually started in the previous month. So we go back one week.
    if (firstSaturday.getUTCDate() > 7) {
        firstSaturday.setUTCDate(firstSaturday.getUTCDate() - 7);
    }

    let currentWeekStart = firstSaturday;

    for (let i = 0; i < 4; i++) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setUTCDate(currentWeekStart.getUTCDate() + 6);
        weeks.push({ start: new Date(currentWeekStart), end: weekEnd });
        currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + 7);
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

    return (
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Semana {weekIndex + 1}
                </div>
                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRegister(week, registro)}>
                    <Edit className="h-4 w-4" />
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


  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedWeek, setSelectedWeek] = React.useState<{start: Date, end: Date} | null>(null);
  const [existingDataForForm, setExistingDataForForm] = React.useState<OficinaSemanalRegistro | null>(null);


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
    setSelectedWeek(week);
    setExistingDataForForm(existingData || null);
    setIsFormOpen(true);
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
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      return allRegistros.filter(r => {
        if (!r.weekStartDate) return false;
        // Convert the weekStartDate (which is already a Date object) to be safe.
        const registroDate = new Date(r.weekStartDate);
        if (isNaN(registroDate.getTime())) return false;
        return isWithinInterval(registroDate, { start: monthStart, end: monthEnd });
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
      <Card>
        <CardHeader>
          <CardTitle>Oficina no encontrada</CardTitle>
          <CardDescription>
            La oficina que buscas no existe o fue eliminada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/tools/registro-oficina">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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
        </CardContent>
       </Card>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {weeks.map((week, index) => {
            const registro = allRegistros.find(r => r.weekStartDate && new Date(r.weekStartDate).getTime() === week.start.getTime()) || null;
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
    </div>
  );
}
