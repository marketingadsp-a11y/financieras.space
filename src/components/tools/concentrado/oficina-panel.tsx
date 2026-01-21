"use client";

import * as React from "react";
import Link from "next/link";
import { format, subMonths, addMonths, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { getConcentradoOficinaById, getRegistrosByOficina, addOrUpdateRegistroSemanal, deleteRegistrosByMonth } from "@/services/concentrado-service";
import type { ConcentradoOficina, ConcentradoSemanal } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, Edit, Calendar as CalendarIcon, DollarSign, Lock, FileText } from "lucide-react";
import { ConcentradoRegistroSemanalForm } from "./registro-semanal-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


function getWeeksForMonth(monthDate: Date): { start: Date; end: Date }[] {
    const year = monthDate.getUTCFullYear();
    const month = monthDate.getUTCMonth();
    
    // Find the date of the first Friday of the month
    let firstFridayDate = new Date(Date.UTC(year, month, 1, 12, 0, 0));
    while (firstFridayDate.getUTCDay() !== 5) { // 5 = Friday
        firstFridayDate.setUTCDate(firstFridayDate.getUTCDate() + 1);
    }

    // The cycle starts on the Saturday of the week containing the first Friday.
    const firstWeekStart = new Date(firstFridayDate);
    firstWeekStart.setUTCDate(firstFridayDate.getUTCDate() - 6);
    firstWeekStart.setUTCHours(0, 0, 0, 0);

    const weeks = [];
    let currentWeekStart = firstWeekStart;

    // Generate weeks as long as their Friday falls within the current month
    for (let i = 0; i < 5; i++) { // Limit to 5 weeks to prevent infinite loops
        const weekStart = new Date(currentWeekStart);
        weekStart.setUTCDate(currentWeekStart.getUTCDate() + (i * 7));

        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
        weekEnd.setUTCHours(23, 59, 59, 999);

        if (weekEnd.getUTCMonth() === month) {
            weeks.push({ start: weekStart, end: weekEnd });
        } else {
            // If the first week we check is already in the next month, something is wrong,
            // but if we have weeks and the next is in another month, we are done.
            if (weeks.length > 0) {
                break;
            }
        }
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
    
    const conceptos = [
        { label: "Fondo de Inicio", value: registro?.fondoInicio },
        { label: "Venta", value: registro?.venta },
        { label: "Recolectado", value: registro?.recolectado },
        { label: "Gastos", value: registro?.gastos },
        { label: "Fondo Siguiente Semana", value: registro?.fondoSiguienteSemana },
        { label: "Caja Chica", value: registro?.cajaChica },
        { label: "Seguros", value: registro?.seguros },
        { label: "Interés Mensual", value: registro?.interesMensual },
        { label: "Cartera Vencida", value: registro?.carteraVencida },
        { label: "Debe", value: registro?.debe },
        { label: "Saliente", value: registro?.saliente },
        { label: "Falla", value: registro?.falla },
        { label: "Recuperado", value: registro?.recuperado },
        { label: "Adelantos", value: registro?.adelantos },
        { label: "Semana Extra", value: registro?.semanaExtra },
    ];
    
    const totalSemanal = registro ? conceptos.reduce((sum, item) => sum + (item.value || 0), 0) : 0;
    
    const weekEndDate = new Date(week.end);
    weekEndDate.setUTCHours(23, 59, 59, 999);
    const hasWeekPassed = isPast(weekEndDate);

    return (
        <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    Semana {weekIndex + 1}
                </div>
                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRegister(week, registro)}>
                    {hasWeekPassed && registro ? <Lock className="h-4 w-4 text-amber-500" /> : <Edit className="h-4 w-4" />}
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
            <CardContent className="flex-grow">
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
                    <div className="text-center py-6 h-full flex flex-col justify-center items-center">
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
  const [allRegistros, setAllRegistros] = React.useState<ConcentradoSemanal[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentMonth, setCurrentMonth] = React.useState(new Date(new Date().setUTCHours(12, 0, 0, 0)));
  
  // Form State
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedWeek, setSelectedWeek] = React.useState<{start: Date, end: Date} | null>(null);
  const [existingDataForForm, setExistingDataForForm] = React.useState<ConcentradoSemanal | null>(null);

  // Authorization State
  const [isAuthDialogOpen, setIsAuthDialogOpen] = React.useState(false);
  const [authCode, setAuthCode] = React.useState('');
  const [weekToAuthorize, setWeekToAuthorize] = React.useState<{week: {start: Date, end: Date}, data: ConcentradoSemanal | null} | null>(null);
  
  // Month Deletion State
  const [isDeleteMonthAuthOpen, setIsDeleteMonthAuthOpen] = React.useState(false);
  const [isDeletingMonth, setIsDeletingMonth] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [oficinaData, registrosData] = await Promise.all([
          getConcentradoOficinaById(oficinaId),
          getRegistrosByOficina(oficinaId)
      ]);
      setOficina(oficinaData);
      setAllRegistros(registrosData);
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
    const weekEndDate = new Date(week.end);
    weekEndDate.setUTCHours(23, 59, 59, 999);
    const hasWeekPassed = isPast(weekEndDate);
    
    if (hasWeekPassed && existingData) { // Only require auth if editing a past week
        setWeekToAuthorize({ week, data: existingData });
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
  
  const handleDeleteMonth = async () => {
    if (authCode !== '0120') {
        toast({ variant: "destructive", title: "Error", description: "El código de autorización es incorrecto." });
        return;
    }
    setIsDeletingMonth(true);
    try {
        await deleteRegistrosByMonth(oficinaId, currentMonth);
        toast({ title: "Éxito", description: `Todos los registros para ${format(currentMonth, "LLLL yyyy", {locale: es})} han sido eliminados.`});
        fetchData();
        setIsDeleteMonthAuthOpen(false);
        setAuthCode('');
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudieron eliminar los registros del mes." });
    } finally {
        setIsDeletingMonth(false);
    }
  }
  
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
                <h1 className="text-3xl font-bold tracking-tight">Panel: {oficina?.name}</h1>
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
                const registro = allRegistros.find(r => {
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
        
         <Dialog open={isDeleteMonthAuthOpen} onOpenChange={setIsDeleteMonthAuthOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirmar Eliminación de Datos del Mes</DialogTitle>
                    <DialogDescription>
                       Esta acción es irreversible. Se eliminarán todos los registros de <strong className="capitalize">{format(currentMonth, "LLLL yyyy", { locale: es })}</strong>. Ingresa el código para confirmar.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="auth-code-delete">Código de Autorización</Label>
                    <Input 
                        id="auth-code-delete"
                        type="password"
                        value={authCode}
                        onChange={(e) => setAuthCode(e.target.value)}
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { setIsDeleteMonthAuthOpen(false); setAuthCode(''); }}>Cancelar</Button>
                    <Button variant="destructive" onClick={handleDeleteMonth} disabled={isDeletingMonth}>
                         {isDeletingMonth && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Eliminar Datos del Mes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
