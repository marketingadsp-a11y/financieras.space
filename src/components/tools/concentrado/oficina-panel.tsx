"use client";

import * as React from "react";
import Link from "next/link";
import { format, subMonths, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { getConcentradoOficinaById, getRegistrosByOficina, addOrUpdateRegistroSemanal } from "@/services/concentrado-service";
import type { ConcentradoOficina, ConcentradoSemanal } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, Edit, Calendar as CalendarIcon, DollarSign } from "lucide-react";
import { ConcentradoRegistroSemanalForm } from "./registro-semanal-form";

function getWeeksForMonth(monthDate: Date): { start: Date; end: Date }[] {
    const year = monthDate.getUTCFullYear();
    const month = monthDate.getUTCMonth();
    
    const anchorDate = new Date(Date.UTC(year, month - 1, 25, 12, 0, 0));

    let cycleStart = new Date(anchorDate);
    const dayOfWeek = cycleStart.getUTCDay(); 
    
    const daysToSubtract = (dayOfWeek + 1) % 7;
    cycleStart.setUTCDate(cycleStart.getUTCDate() - daysToSubtract);
    
    const weeks = [];
    for (let i = 0; i < 4; i++) {
        const weekStart = new Date(cycleStart);
        weekStart.setUTCDate(cycleStart.getUTCDate() + (i * 7));

        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
        weekEnd.setUTCHours(23, 59, 59, 999);

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
    registro: ConcentradoSemanal | null,
    onRegister: (week: {start: Date, end: Date}, existingData?: ConcentradoSemanal | null) => void
}) => {
    
    const totalSemanal = registro 
        ? Object.values(registro).reduce((sum, value) => (typeof value === 'number' ? sum + value : sum), 0)
        : 0;

    return (
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    Semana {weekIndex + 1}
                </div>
                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRegister(week, registro)}>
                    <Edit className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                Del {format(week.start, "dd 'de' LLLL", { locale: es })} al {format(week.end, "dd 'de' LLLL", { locale: es })}
              </CardDescription>
            </CardHeader>
            <CardContent>
                {registro ? (
                    <div className="space-y-2">
                       <div className="text-center p-2 rounded-lg bg-primary/10">
                            <p className="text-sm font-semibold text-primary">TOTAL SEMANA</p>
                            <p className="text-2xl font-bold text-primary">${totalSemanal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                       </div>
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <p className="text-muted-foreground mb-4">No hay datos registrados.</p>
                         <Button onClick={() => onRegister(week, null)}>Registrar Datos</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


export function OficinaPanel({ oficinaId }: { oficinaId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [oficina, setOficina] = React.useState<ConcentradoOficina | null>(null);
  const [registros, setRegistros] = React.useState<ConcentradoSemanal[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentMonth, setCurrentMonth] = React.useState(new Date(new Date().setUTCHours(12, 0, 0, 0)));
  
  // Form State
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedWeek, setSelectedWeek] = React.useState<{start: Date, end: Date} | null>(null);
  const [existingDataForForm, setExistingDataForForm] = React.useState<ConcentradoSemanal | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [oficinaData, registrosData] = await Promise.all([
          getConcentradoOficinaById(oficinaId),
          getRegistrosByOficina(oficinaId)
      ]);
      setOficina(oficinaData);
      setRegistros(registrosData);
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
  
  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  
  const handleRegisterClick = (week: {start: Date, end: Date}, existingData?: ConcentradoSemanal | null) => {
    setSelectedWeek(week);
    setExistingDataForForm(existingData || null);
    setIsFormOpen(true);
  };
  
  const handleFormSubmit = async (data: Omit<ConcentradoSemanal, 'id' | 'prefix' | 'oficinaId' | 'weekStartDate' | 'updatedAt' | 'updatedBy'>) => {
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
        fetchData();
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el registro." });
    }
  };
  
  const weeks = getWeeksForMonth(currentMonth);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando oficina...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <Button variant="outline" asChild>
            <Link href="/tools/concentrado/oficinas">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Oficinas
            </Link>
        </Button>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Panel de Oficina: {oficina?.name}</h1>
                <p className="text-muted-foreground">
                    Registra los datos semanales para esta oficina.
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
      
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {weeks.map((week, index) => {
                const registro = registros.find(r => {
                    const registroDateUTC = new Date(r.weekStartDate).getTime();
                    const weekStartUTC = new Date(week.start).getTime();
                    return registroDateUTC === weekStartUTC;
                }) || null;
                
                return <WeekCard key={index} week={week} weekIndex={index} registro={registro} onRegister={handleRegisterClick} />
            })}
        </div>
        
        <ConcentradoRegistroSemanalForm
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSubmit={handleFormSubmit}
            existingData={existingDataForForm}
            week={selectedWeek}
        />
    </div>
  );
}
