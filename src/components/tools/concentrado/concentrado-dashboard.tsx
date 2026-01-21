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
import { Loader2, ChevronLeft, ChevronRight, History } from "lucide-react";
import { getConcentradoOficinas, getRegistrosByOficina } from "@/services/concentrado-service";
import type { ConcentradoOficina, ConcentradoSemanal } from "@/lib/data";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";

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

export function ConcentradoDashboard() {
  const [summaries, setSummaries] = React.useState<SummaryRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  const fetchData = React.useCallback(async () => {
        if (!user?.prefix) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        const { start, end } = getWeekBoundaries(selectedDate);
        
        try {
            const oficinas = await getConcentradoOficinas(user.prefix);
            
            const summaryPromises = oficinas.map(async (oficina) => {
                const registros = await getRegistrosByOficina(oficina.id);
                
                // Filter registros for the selected week
                const registrosDeLaSemana = registros.filter(r => {
                    const registroDate = new Date(r.weekStartDate);
                    return registroDate >= start && registroDate <= end;
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

            const results = await Promise.all(summaryPromises);
            setSummaries(results);

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
                <CardTitle>Concentrado de Oficinas</CardTitle>
                <CardDescription>
                Resumen de todos los registros de las oficinas para la semana seleccionada.
                </CardDescription>
            </div>
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
                                    <TableCell className="font-medium border-r">{summary.oficinaName}</TableCell>
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
  );
}
