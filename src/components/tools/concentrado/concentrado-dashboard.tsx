"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, ChevronLeft, ChevronRight, History, DollarSign, Lock, LockOpen } from "lucide-react";
import { getConcentradoOficinas, getRegistrosByOficina, getAllConcentradoRegistros, getWeeklyClosures, setWeeklyClosure } from "@/services/concentrado-service";
import type { ConcentradoOficina, ConcentradoSemanal, ConcentradoWeeklyClosure } from "@/lib/data";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitleComponent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { OficinaPanel } from "./oficina-panel";

type SummaryRow = {
  oficinaId: string;
  oficinaName: string;
  fondoInicio: number;
  venta: number;
  cajaChica: number;
  recolectado: number;
  gastos: number;
  fondoSiguienteSemana: number;
  seguros: number;
  interesMensual: number;
  carteraVencida: number;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(value);
};

// Helper function to get week boundaries (Saturday to Friday)
const getWeekBoundaries = (date: Date): { start: Date; end: Date } => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    const dayOfWeek = d.getUTCDay(); // Sunday = 0, ..., Saturday = 6
    const diffToSaturday = (dayOfWeek + 1) % 7;
    const startDate = new Date(d.getTime());
    startDate.setUTCDate(d.getUTCDate() - diffToSaturday);
    
    const endDate = new Date(startDate.getTime());
    endDate.setUTCDate(startDate.getUTCDate() + 6);
    endDate.setUTCHours(23, 59, 59, 999);
    return { start: startDate, end: endDate };
};

// Gets all weeks that have their Friday within the given month.
function getMonthWeeks(monthDate: Date): { start: Date; end: Date }[] {
    const year = monthDate.getUTCFullYear();
    const month = monthDate.getUTCMonth();
    
    let firstFridayDate = new Date(Date.UTC(year, month, 1, 12, 0, 0));
    while (firstFridayDate.getUTCDay() !== 5) { // 5 = Friday
        firstFridayDate.setUTCDate(firstFridayDate.getUTCDate() + 1);
    }

    const firstWeekStart = new Date(firstFridayDate);
    firstWeekStart.setUTCDate(firstFridayDate.getUTCDate() - 6);
    firstWeekStart.setUTCHours(0, 0, 0, 0);

    const weeks = [];
    for (let i = 0; i < 5; i++) { // Limit to 5 weeks to prevent infinite loops
        const weekStart = new Date(firstWeekStart);
        weekStart.setUTCDate(firstWeekStart.getUTCDate() + (i * 7));

        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
        weekEnd.setUTCHours(23, 59, 59, 999);
        
        if (weekEnd.getUTCMonth() === month) {
            weeks.push({ start: weekStart, end: weekEnd });
        } else if (weeks.length > 0) { 
            break;
        }
    }
    return weeks;
}


export function ConcentradoDashboard() {
  const [summaries, setSummaries] = React.useState<SummaryRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [totalCajaChicaMes, setTotalCajaChicaMes] = React.useState(0);
  const [selectedOficinaId, setSelectedOficinaId] = React.useState<string | null>(null);
  const [weeklyClosures, setWeeklyClosures] = React.useState<ConcentradoWeeklyClosure[]>([]);


  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);

    const { start: weekStart, end: weekEnd } = getWeekBoundaries(selectedDate);
    
    const now = new Date();
    const weeksInCurrentMonth = getMonthWeeks(now);
    const currentMonthStart = weeksInCurrentMonth.length > 0 ? weeksInCurrentMonth[0].start : startOfMonth(now);
    const currentMonthEnd = weeksInCurrentMonth.length > 0 ? weeksInCurrentMonth[weeksInCurrentMonth.length - 1].end : endOfMonth(now);
    
    try {
        const [oficinas, allRegistros, closures] = await Promise.all([
            getConcentradoOficinas(user.prefix),
            getAllConcentradoRegistros(user.prefix),
            getWeeklyClosures(user.prefix)
        ]);

        setWeeklyClosures(closures);

        const monthlyCajaChicaTotal = allRegistros
            .filter(r => {
                const registroDate = new Date(r.weekStartDate);
                return registroDate >= currentMonthStart && registroDate <= currentMonthEnd;
            })
            .reduce((sum, r) => sum + (r.cajaChica || 0), 0);
        
        setTotalCajaChicaMes(monthlyCajaChicaTotal);
        
        const weeklySummaries = oficinas.map(oficina => {
            const registrosDeLaOficina = allRegistros.filter(r => r.oficinaId === oficina.id);
            
            const registrosDeLaSemana = registrosDeLaOficina.filter(r => {
                const registroDate = new Date(r.weekStartDate);
                return registroDate.getTime() >= weekStart.getTime() && registroDate.getTime() <= weekEnd.getTime();
            });

            const summary = registrosDeLaSemana.reduce((acc, r) => {
                acc.fondoInicio += r.fondoInicio || 0;
                acc.venta += r.venta || 0;
                acc.cajaChica += r.cajaChica || 0;
                acc.recolectado += r.recolectado || 0;
                acc.gastos += r.gastos || 0;
                acc.fondoSiguienteSemana += r.fondoSiguienteSemana || 0;
                acc.seguros += r.seguros || 0;
                acc.interesMensual += r.interesMensual || 0;
                acc.carteraVencida += r.carteraVencida || 0;
                return acc;
            }, {
                fondoInicio: 0,
                venta: 0,
                cajaChica: 0,
                recolectado: 0,
                gastos: 0,
                fondoSiguienteSemana: 0,
                seguros: 0,
                interesMensual: 0,
                carteraVencida: 0,
            });

            return {
                oficinaId: oficina.id,
                oficinaName: oficina.name,
                ...summary
            };
        });

        setSummaries(weeklySummaries);

    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudieron cargar los datos del concentrado."
        });
    } finally {
        setIsLoading(false);
    }
}, [user?.prefix, toast, selectedDate]);


  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handlePreviousWeek = () => setSelectedDate(prevDate => addDays(prevDate, -7));
  const handleNextWeek = () => setSelectedDate(prevDate => addDays(prevDate, 7));
  const handleCurrentWeek = () => setSelectedDate(new Date());

  const { start: weekStart, end: weekEnd } = getWeekBoundaries(selectedDate);
  const weekDateRange = `Semana del ${format(weekStart, "dd 'de' LLLL", { locale: es })} al ${format(weekEnd, "dd 'de' LLLL 'de' yyyy", { locale: es })}`;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 6 });
  const isNextWeekDisabled = isSameDay(startOfWeek(selectedDate, { weekStartsOn: 6 }), startOfCurrentWeek) || selectedDate > today;

  const handleCloseWeek = async () => {
    if (!user?.prefix) return;
    try {
        await setWeeklyClosure(user.prefix, weekStart, true);
        toast({ title: "Semana Cerrada", description: "Ya no se podrán registrar nuevos datos para esta semana sin autorización." });
        fetchData();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cerrar la semana.' });
    }
  };

  const isCurrentWeekClosed = React.useMemo(() => {
    return weeklyClosures.some(c => 
        c.isClosed &&
        new Date(c.weekStartDate).getTime() === weekStart.getTime()
    );
  }, [weeklyClosures, weekStart]);


  const totals = React.useMemo(() => {
    return summaries.reduce((acc, s) => {
        acc.fondoInicio += s.fondoInicio;
        acc.venta += s.venta;
        acc.cajaChica += s.cajaChica;
        acc.recolectado += s.recolectado;
        acc.gastos += s.gastos;
        acc.fondoSiguienteSemana += s.fondoSiguienteSemana;
        acc.seguros += s.seguros;
        acc.interesMensual += s.interesMensual;
        acc.carteraVencida += s.carteraVencida;
        return acc;
    }, {
        fondoInicio: 0,
        venta: 0,
        cajaChica: 0,
        recolectado: 0,
        gastos: 0,
        fondoSiguienteSemana: 0,
        seguros: 0,
        interesMensual: 0,
        carteraVencida: 0,
    });
  }, [summaries]);

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                 <CardHeader>
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Acciones de la Semana</h2>
                         {isCurrentWeekClosed ? (
                            <Badge variant="destructive"><Lock className="mr-2 h-4 w-4"/>Cerrada</Badge>
                         ) : (
                            <Badge variant="secondary"><LockOpen className="mr-2 h-4 w-4"/>Abierta</Badge>
                         )}
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Cierra la semana para prevenir modificaciones accidentales en los registros. Para editar una semana cerrada, se requerirá un código de autorización.</p>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                disabled={isCurrentWeekClosed}
                                className="bg-gradient-to-r from-[hsl(var(--sidebar-background))] to-[hsl(var(--sidebar-accent))] text-sidebar-foreground hover:from-[hsl(var(--sidebar-accent))] hover:to-[hsl(var(--sidebar-background))]"
                            >
                                <Lock className="mr-2 h-4 w-4" /> Cerrar Semana Actual
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitleComponent>¿Confirmar Cierre de Semana?</AlertDialogTitleComponent>
                                <AlertDialogDescription>
                                    Esta acción bloqueará la edición de registros para la semana <strong>{weekDateRange}</strong> en todas las oficinas. ¿Deseas continuar?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCloseWeek}>Sí, Cerrar Semana</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
            <div className="lg:col-span-1 flex justify-end">
                <Card className="w-full bg-gradient-to-r from-[hsl(var(--sidebar-background))] to-[hsl(var(--sidebar-accent))] text-sidebar-foreground">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Caja Chica (Mes Actual)
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-sidebar-foreground/70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {formatCurrency(totalCajaChicaMes)}
                        </div>
                        <p className="text-xs text-sidebar-foreground/70">
                            Suma de la caja chica de todas las oficinas en el mes en curso.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
        <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div />
                <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-primary text-right">{weekDateRange}</p>
                    <div className="flex items-center gap-1">
                        <Button onClick={handlePreviousWeek} variant="outline" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4"/></Button>
                        <Button onClick={handleCurrentWeek} variant="outline" size="icon" className="h-8 w-8" disabled={isNextWeekDisabled}><History className="h-4 w-4"/></Button>
                        <Button onClick={handleNextWeek} variant="outline" size="icon" className="h-8 w-8" disabled={isNextWeekDisabled}><ChevronRight className="h-4 w-4"/></Button>
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                    <span>Cargando datos del concentrado...</span>
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-semibold border-r">Oficina</TableHead>
                                <TableHead className="text-right font-semibold border-r">Fondo Inicio</TableHead>
                                <TableHead className="text-right font-semibold border-r">Venta</TableHead>
                                <TableHead className="text-right font-semibold border-r">Caja Chica</TableHead>
                                <TableHead className="text-right font-semibold border-r">Recolectado</TableHead>
                                <TableHead className="text-right font-semibold border-r">Gastos</TableHead>
                                <TableHead className="text-right font-semibold border-r">Fondo Sig. Semana</TableHead>
                                <TableHead className="text-right font-semibold border-r">Seguros</TableHead>
                                <TableHead className="text-right font-semibold border-r">Interés Mensual</TableHead>
                                <TableHead className="text-right font-semibold">Cartera Vencida</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {summaries.length > 0 ? (
                                summaries.map(summary => (
                                    <TableRow key={summary.oficinaId}>
                                        <TableCell className="font-medium border-r">
                                            <Button variant="link" onClick={() => setSelectedOficinaId(summary.oficinaId)} className="p-0 h-auto text-left justify-start">
                                                {summary.oficinaName}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-right border-r">{formatCurrency(summary.fondoInicio)}</TableCell>
                                        <TableCell className="text-right border-r">{formatCurrency(summary.venta)}</TableCell>
                                        <TableCell className="text-right border-r">{formatCurrency(summary.cajaChica)}</TableCell>
                                        <TableCell className="text-right border-r">{formatCurrency(summary.recolectado)}</TableCell>
                                        <TableCell className="text-right border-r">{formatCurrency(summary.gastos)}</TableCell>
                                        <TableCell className="text-right border-r">{formatCurrency(summary.fondoSiguienteSemana)}</TableCell>
                                        <TableCell className="text-right border-r">{formatCurrency(summary.seguros)}</TableCell>
                                        <TableCell className="text-right border-r">{formatCurrency(summary.interesMensual)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(summary.carteraVencida)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-24 text-center">
                                        No hay datos registrados en ninguna oficina para esta semana.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="font-bold bg-gradient-to-r from-[hsl(var(--sidebar-background))] to-[hsl(var(--sidebar-accent))] text-sidebar-foreground hover:from-[hsl(var(--sidebar-accent))] hover:to-[hsl(var(--sidebar-background))]">
                                <TableCell className="border-r border-sidebar-border">TOTALES</TableCell>
                                <TableCell className="text-right border-r border-sidebar-border">{formatCurrency(totals.fondoInicio)}</TableCell>
                                <TableCell className="text-right border-r border-sidebar-border">{formatCurrency(totals.venta)}</TableCell>
                                <TableCell className="text-right border-r border-sidebar-border">{formatCurrency(totals.cajaChica)}</TableCell>
                                <TableCell className="text-right border-r border-sidebar-border">{formatCurrency(totals.recolectado)}</TableCell>
                                <TableCell className="text-right border-r border-sidebar-border">{formatCurrency(totals.gastos)}</TableCell>
                                <TableCell className="text-right border-r border-sidebar-border">{formatCurrency(totals.fondoSiguienteSemana)}</TableCell>
                                <TableCell className="text-right border-r border-sidebar-border">{formatCurrency(totals.seguros)}</TableCell>
                                <TableCell className="text-right border-r border-sidebar-border">{formatCurrency(totals.interesMensual)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.carteraVencida)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            )}
        </CardContent>
        </Card>
        
        <Dialog open={!!selectedOficinaId} onOpenChange={(isOpen) => !isOpen && setSelectedOficinaId(null)}>
            <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
                 <DialogHeader>
                    <DialogTitle>Panel de Oficina: {summaries.find(s => s.oficinaId === selectedOficinaId)?.oficinaName}</DialogTitle>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto -mx-6 px-6">
                    {selectedOficinaId && <OficinaPanel oficinaId={selectedOficinaId} />}
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
