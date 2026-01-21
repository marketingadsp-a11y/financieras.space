"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { ConcentradoOficina, ConcentradoSemanal } from "@/lib/data";
import { getConcentradoOficinas, getAllConcentradoRegistros } from "@/services/concentrado-service";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, Calendar, DollarSign } from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// This function needs to be identical to the one in oficina-panel.tsx
function getWeeksForMonth(monthDate: Date): { start: Date; end: Date }[] {
    const year = monthDate.getUTCFullYear();
    const month = monthDate.getUTCMonth();
    
    let firstFridayDate = new Date(Date.UTC(year, month, 1, 12, 0, 0));
    while (firstFridayDate.getUTCDay() !== 5) {
        firstFridayDate.setUTCDate(firstFridayDate.getUTCDate() + 1);
    }

    const firstWeekStart = new Date(firstFridayDate);
    firstWeekStart.setUTCDate(firstFridayDate.getUTCDate() - 6);
    firstWeekStart.setUTCHours(0, 0, 0, 0);

    const weeks = [];
    for (let i = 0; i < 5; i++) {
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

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(value);
};


export function CajaChicaViewer() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [allRegistros, setAllRegistros] = React.useState<ConcentradoSemanal[]>([]);
    const [oficinas, setOficinas] = React.useState<ConcentradoOficina[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [currentMonth, setCurrentMonth] = React.useState(new Date());

    const fetchData = React.useCallback(async () => {
        if (!user?.prefix) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [oficinasData, registrosData] = await Promise.all([
                getConcentradoOficinas(user.prefix),
                getAllConcentradoRegistros(user.prefix),
            ]);
            setOficinas(oficinasData);
            setAllRegistros(registrosData);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos de caja chica." });
        } finally {
            setIsLoading(false);
        }
    }, [user?.prefix, toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

    const weeksOfMonth = React.useMemo(() => getWeeksForMonth(currentMonth), [currentMonth]);
    const oficinaMap = React.useMemo(() => new Map(oficinas.map(o => [o.id, o.name])), [oficinas]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span>Cargando historial de Caja Chica...</span>
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <CardTitle>Historial de Caja Chica</CardTitle>
                        <CardDescription>Detalle de los montos de caja chica registrados por semana y oficina.</CardDescription>
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
            </CardHeader>
            <CardContent>
                {weeksOfMonth.length > 0 ? (
                    <Accordion type="multiple" className="w-full space-y-4" defaultValue={['week-0']}>
                        {weeksOfMonth.map((week, index) => {
                            const registrosDeLaSemana = allRegistros.filter(r => {
                                 const registroDateUTC = new Date(r.weekStartDate).getTime();
                                 const weekStartUTC = new Date(week.start).getTime();
                                 return registroDateUTC === weekStartUTC;
                            });
                            
                            const totalSemana = registrosDeLaSemana.reduce((sum, r) => sum + (r.cajaChica || 0), 0);

                            return (
                                <AccordionItem key={index} value={`week-${index}`} className="border rounded-lg">
                                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                        <div className="flex justify-between items-center w-full">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-primary/10 rounded-lg"><Calendar className="h-6 w-6 text-primary"/></div>
                                                <div>
                                                    <p className="font-semibold text-base">Semana {index + 1}</p>
                                                    <p className="text-sm text-muted-foreground font-normal text-left">
                                                        Del {format(week.start, "dd/MM")} al {format(week.end, "dd/MM/yyyy")}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right pr-4">
                                                <p className="text-sm text-muted-foreground">Total de la Semana</p>
                                                <p className="text-lg font-bold text-primary">{formatCurrency(totalSemana)}</p>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-0">
                                         <div className="border-t">
                                            {registrosDeLaSemana.length > 0 ? (
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Oficina</TableHead>
                                                            <TableHead className="text-right">Monto Caja Chica</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {registrosDeLaSemana.sort((a,b) => (oficinaMap.get(a.oficinaId) || '').localeCompare(oficinaMap.get(b.oficinaId) || '')).map(registro => (
                                                            <TableRow key={registro.id}>
                                                                <TableCell className="font-medium">{oficinaMap.get(registro.oficinaId) || 'Oficina Desconocida'}</TableCell>
                                                                <TableCell className="text-right font-mono">{formatCurrency(registro.cajaChica || 0)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            ) : (
                                                <p className="text-sm text-muted-foreground text-center p-6">No hay registros de caja chica para esta semana.</p>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                    </Accordion>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>No hay semanas para mostrar en este mes.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
