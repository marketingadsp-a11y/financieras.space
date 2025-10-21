
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getHistoryLogs } from "@/services/history-service";
import type { HistoryLog, Plaza } from "@/lib/data";
import { getPlazas } from "@/services/plaza-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, DollarSign, CalendarIcon, FilterX } from "lucide-react";
import { HistoryTable } from "./history-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function HistoryPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = React.useState<HistoryLog[]>([]);
  const [plazas, setPlazas] = React.useState<Plaza[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Filter states
  const [selectedPlaza, setSelectedPlaza] = React.useState<string>("all");
  const [selectedPromoter, setSelectedPromoter] = React.useState<string>("all");
  const [selectedGroup, setSelectedGroup] = React.useState<string>("all");
  const [startDate, setStartDate] = React.useState<Date | undefined>();
  const [endDate, setEndDate] = React.useState<Date | undefined>();

  const fetchHistoryData = React.useCallback(async () => {
    if (!user?.prefix) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [logsData, plazasData] = await Promise.all([
        getHistoryLogs(user.prefix, 'overdue-portfolio'),
        getPlazas({ prefix: user.prefix, fetchAll: user.isSuperAdmin, toolContext: 'overdue-portfolio' })
      ]);
      setLogs(logsData);
      setPlazas(plazasData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los registros de historial.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.prefix, user?.isSuperAdmin, toast]);

  React.useEffect(() => {
    fetchHistoryData();
  }, [fetchHistoryData]);

  const paymentLogs = logs.filter(log => log.type === 'payment');
  const actionLogs = logs.filter(log => ['create', 'update', 'delete'].includes(log.type));

  const uniquePromoters = React.useMemo(() => [...new Set(paymentLogs.map(log => log.promoter).filter(Boolean) as string[])].sort(), [paymentLogs]);
  const uniqueGroups = React.useMemo(() => [...new Set(paymentLogs.map(log => log.group).filter(Boolean) as string[])].sort(), [paymentLogs]);
  
  const filteredPaymentLogs = React.useMemo(() => {
    return paymentLogs.filter(log => {
        if (selectedPlaza !== 'all' && log.plazaName !== plazas.find(p => p.id === selectedPlaza)?.name) return false;
        if (selectedPromoter !== 'all' && log.promoter !== selectedPromoter) return false;
        if (selectedGroup !== 'all' && log.group !== selectedGroup) return false;
        
        const logDate = new Date(log.timestamp);
        if (startDate && logDate < startDate) return false;
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            if (logDate > endOfDay) return false;
        }

        return true;
    });
  }, [paymentLogs, selectedPlaza, selectedPromoter, selectedGroup, startDate, endDate, plazas]);

  const totalAbonosRecibidos = React.useMemo(() => {
    return filteredPaymentLogs.reduce((acc, log) => acc + (log.amount || 0), 0);
  }, [filteredPaymentLogs]);

  const clearFilters = () => {
    setSelectedPlaza("all");
    setSelectedPromoter("all");
    setSelectedGroup("all");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando historial...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Actividad</CardTitle>
        <CardDescription>
          Registro de todos los abonos y acciones realizadas en la herramienta de Cartera Vencida.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="abonos">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="abonos">Abonos</TabsTrigger>
            <TabsTrigger value="acciones">Acciones</TabsTrigger>
          </TabsList>
          <TabsContent value="abonos" className="mt-4">
             <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Filtros y Resumen de Abonos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Select value={selectedPlaza} onValueChange={setSelectedPlaza}>
                                    <SelectTrigger><SelectValue placeholder="Filtrar por Plaza" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las Plazas</SelectItem>
                                        {plazas.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedPromoter} onValueChange={setSelectedPromoter}>
                                    <SelectTrigger><SelectValue placeholder="Filtrar por Promotor" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los Promotores</SelectItem>
                                        {uniquePromoters.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                 <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                                    <SelectTrigger><SelectValue placeholder="Filtrar por Grupo" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los Grupos</SelectItem>
                                        {uniqueGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-[280px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {startDate ? format(startDate, "PPP", { locale: es }) : <span>Fecha de inicio</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
                                </Popover>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-[280px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {endDate ? format(endDate, "PPP", { locale: es }) : <span>Fecha de fin</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
                                </Popover>
                                <Button variant="ghost" onClick={clearFilters}><FilterX className="mr-2 h-4 w-4"/>Limpiar</Button>
                            </div>
                        </div>
                        <Card className="bg-green-500/10 text-green-700 md:col-span-1">
                             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Abonos Recibidos (Filtrado)</CardTitle>
                                <DollarSign className="h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    ${totalAbonosRecibidos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
             </Card>
            <HistoryTable data={filteredPaymentLogs} type="payment" />
          </TabsContent>
          <TabsContent value="acciones" className="mt-4">
            <HistoryTable data={actionLogs} type="action" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
