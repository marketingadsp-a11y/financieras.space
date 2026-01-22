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
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Loader2, ChevronLeft, ChevronRight, History } from "lucide-react";
import { getConcentradoOficinas, getAllConcentradoRegistros } from "@/services/concentrado-service";
import type { ConcentradoOficina, ConcentradoSemanal } from "@/lib/data";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths, subMonths, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OficinaPanel } from "./oficina-panel";

type MonthlySummaryRow = {
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

// Helper function to get all weeks where the Friday falls within the given month.
function getWeeksForMonth(monthDate: Date): { start: Date; end: Date }[] {
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
    for (let i = 0; i < 5; i++) { // Check up to 5 weeks to cover all possibilities
        const weekStart = new Date(firstWeekStart);
        weekStart.setUTCDate(firstWeekStart.getUTCDate() + (i * 7));

        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
        weekEnd.setUTCHours(23, 59, 59, 999);
        
        // Include the week if its Friday is in the current month
        if (weekEnd.getUTCMonth() === month) {
            weeks.push({ start: weekStart, end: weekEnd });
        } else if (weeks.length > 0) {
            // If we have pushed weeks and the next one is in a new month, we are done.
            break;
        }
    }
    return weeks;
}


export function ResumenPanel() {
  const [summaries, setSummaries] = React.useState<MonthlySummaryRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [selectedOficinaId, setSelectedOficinaId] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);

    const weeksOfMonth = getWeeksForMonth(currentMonth);
    if (weeksOfMonth.length === 0) {
        setSummaries([]);
        setIsLoading(false);
        return;
    }
    const monthCycleStart = weeksOfMonth[0].start;
    const monthCycleEnd = weeksOfMonth[weeksOfMonth.length - 1].end;
    
    try {
        const [oficinas, allRegistros] = await Promise.all([
            getConcentradoOficinas(user.prefix),
            getAllConcentradoRegistros(user.prefix)
        ]);

        const monthlySummaries = oficinas.map(oficina => {
            const registrosDelMes = allRegistros.filter(r => {
                const registroDate = new Date(r.weekStartDate);
                return registroDate >= monthCycleStart && registroDate <= monthCycleEnd && r.oficinaId === oficina.id;
            });
            
            const firstWeekRecord = registrosDelMes.sort((a,b) => a.weekStartDate.getTime() - b.weekStartDate.getTime())[0];
            const lastWeekRecord = registrosDelMes.sort((a,b) => b.weekStartDate.getTime() - a.weekStartDate.getTime())[0];

            const summary = registrosDelMes.reduce((acc, r) => {
                acc.venta += r.venta || 0;
                acc.cajaChica += r.cajaChica || 0;
                acc.recolectado += r.recolectado || 0;
                acc.gastos += r.gastos || 0;
                acc.seguros += r.seguros || 0;
                acc.interesMensual += r.interesMensual || 0;
                acc.carteraVencida += r.carteraVencida || 0;
                return acc;
            }, {
                venta: 0,
                cajaChica: 0,
                recolectado: 0,
                gastos: 0,
                seguros: 0,
                interesMensual: 0,
                carteraVencida: 0,
            });

            return {
                oficinaId: oficina.id,
                oficinaName: oficina.name,
                fondoInicio: firstWeekRecord?.fondoInicio || 0,
                fondoSiguienteSemana: lastWeekRecord?.fondoSiguienteSemana || 0,
                ...summary
            };
        });

        setSummaries(monthlySummaries);

    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudieron cargar los datos del resumen mensual."
        });
    } finally {
        setIsLoading(false);
    }
  }, [user?.prefix, toast, currentMonth]);


  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handlePreviousMonth = () => setCurrentMonth(prevDate => subMonths(prevDate, 1));
  const handleNextMonth = () => setCurrentMonth(prevDate => addMonths(prevDate, 1));
  const handleCurrentMonth = () => setCurrentMonth(new Date());

  const isNextMonthDisabled = isSameMonth(currentMonth, new Date());

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
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Resumen Mensual</h1>
                <p className="text-muted-foreground">Concentrado de todas las oficinas por mes.</p>
            </div>
            <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-primary capitalize">{format(currentMonth, "LLLL yyyy", { locale: es })}</p>
                <div className="flex items-center gap-1">
                    <Button onClick={handlePreviousMonth} variant="outline" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4"/></Button>
                    <Button onClick={handleCurrentMonth} variant="outline" size="icon" className="h-8 w-8" disabled={isNextMonthDisabled}><History className="h-4 w-4"/></Button>
                    <Button onClick={handleNextMonth} variant="outline" size="icon" className="h-8 w-8" disabled={isNextMonthDisabled}><ChevronRight className="h-4 w-4"/></Button>
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span>Cargando datos del resumen...</span>
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
                                    No hay datos registrados en ninguna oficina para este mes.
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
    </Card>
  );
}
