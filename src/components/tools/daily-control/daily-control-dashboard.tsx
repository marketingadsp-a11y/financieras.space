
"use client";

import * as React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Calendar as CalendarIcon,
  PlusCircle,
  ArrowDown,
  ArrowUp,
  CreditCard,
  DollarSign,
  Loader2,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { es } from 'date-fns/locale';

import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import type { DailyRecordEntry, DailyRecordType, Plaza } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { DailyRecordForm } from "./daily-record-form";
import { getPlazas } from "@/services/plaza-service";
import { getDailyRecord, addDailyRecordEntry } from "@/services/daily-record-service";


const StatCard = ({ title, value, icon: Icon, variant = 'default' }: { title: string; value: number; icon: React.ElementType; variant?: 'default' | 'destructive' | 'success' }) => {
  const variants = {
    default: 'text-primary',
    destructive: 'text-red-500',
    success: 'text-green-600'
  }
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4 text-muted-foreground", variants[variant])} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", variants[variant])}>
            ${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </CardContent>
    </Card>
  );
};


export function DailyControlDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [plazas, setPlazas] = React.useState<Plaza[]>([]);
  const [selectedPlaza, setSelectedPlaza] = React.useState<string>('');
  const [entries, setEntries] = React.useState<DailyRecordEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isFormOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<DailyRecordType>('collected');

  const fetchPlazasForUser = React.useCallback(async () => {
    if (!user) return;
    const shouldFetchAll = user.isSuperAdmin || user.isToolAdmin;
    try {
        const plazasFromDb = await getPlazas({ prefix: user.prefix, fetchAll: shouldFetchAll });
        setPlazas(plazasFromDb);
        if (plazasFromDb.length > 0) {
            setSelectedPlaza(plazasFromDb[0].id);
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las plazas.' });
    }
  }, [user, toast]);
  
  React.useEffect(() => {
    fetchPlazasForUser();
  }, [fetchPlazasForUser]);

  const fetchDailyData = React.useCallback(async () => {
    if (!selectedPlaza || !date) {
        setEntries([]);
        setIsLoading(false);
        return;
    };
    setIsLoading(true);
    try {
        const record = await getDailyRecord(selectedPlaza, date);
        setEntries(record?.entries || []);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los registros del día.' });
        setEntries([]);
    } finally {
        setIsLoading(false);
    }
  }, [selectedPlaza, date, toast]);

  React.useEffect(() => {
    fetchDailyData();
  }, [fetchDailyData]);
  
  const handleOpenForm = (mode: DailyRecordType) => {
    if (!selectedPlaza) {
        toast({ variant: 'destructive', title: 'Selecciona una plaza', description: 'Debes seleccionar una plaza para poder registrar movimientos.' });
        return;
    }
    setFormMode(mode);
    setFormOpen(true);
  };

  const handleSubmitEntry = async (data: Omit<DailyRecordEntry, 'id' | 'plazaId' | 'date'>) => {
    if (!selectedPlaza || !date || !user?.prefix) {
        toast({ variant: 'destructive', title: 'Error', description: 'Faltan datos para registrar el movimiento (plaza, fecha o prefijo).' });
        return;
    }
    setIsSubmitting(true);
    try {
        await addDailyRecordEntry(selectedPlaza, user.prefix, date, data);
        toast({ title: 'Éxito', description: 'Movimiento registrado correctamente.' });
        setFormOpen(false);
        fetchDailyData(); // Refresh data for the day
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar el movimiento.' });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const exportToPDF = () => {
    if (!plazaName || !date || entries.length === 0) {
      toast({ variant: "destructive", title: "No hay datos para exportar", description: "Selecciona un día con movimientos para generar el PDF." });
      return;
    }

    const doc = new jsPDF();
    const formattedDate = format(date, "PPP", { locale: es });
    doc.text(`Movimientos de la Plaza: ${plazaName}`, 14, 16);
    doc.text(`Fecha: ${formattedDate}`, 14, 22);

    autoTable(doc, {
      head: [['Tipo', 'Descripción', 'Categoría', 'Monto']],
      body: entries.map(e => {
        const config = typeConfig[e.type];
        return [
          config.label,
          e.description,
          e.category?.replace(/_/g, ' ') || 'N/A',
          `$${e.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
        ]
      }),
      startY: 30,
      headStyles: { fillColor: [41, 128, 185] },
      styles: { halign: 'left' },
      columnStyles: { 3: { halign: 'right' } }
    });
    
    const totalsY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text('Totales del día:', 14, totalsY);
    autoTable(doc, {
      body: [
        ['Total Cobrado', `$${totals.collected.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`],
        ['Total Prestado', `$${totals.loaned.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`],
        ['Total Gastado', `$${totals.spent.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`],
      ],
      startY: totalsY + 4,
      theme: 'plain',
      columnStyles: { 1: { halign: 'right' } }
    });

    doc.save(`control_diario_${plazaName.replace(/\s/g, '_')}_${format(date, 'yyyy-MM-dd')}.pdf`);
  };


  const totals = React.useMemo(() => {
    return entries.reduce((acc, entry) => {
      if (entry.type === 'collected') acc.collected += entry.amount;
      if (entry.type === 'loaned') acc.loaned += entry.amount;
      if (entry.type === 'spent') acc.spent += entry.amount;
      return acc;
    }, { collected: 0, loaned: 0, spent: 0 });
  }, [entries]);

  const typeConfig = {
    collected: { icon: ArrowDown, color: "text-green-600", label: "Cobrado" },
    loaned: { icon: ArrowUp, color: "text-blue-600", label: "Prestado" },
    spent: { icon: CreditCard, color: "text-red-600", label: "Gasto" },
  }
  
  const plazaName = plazas.find(p => p.id === selectedPlaza)?.name || 'Desconocida';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Control Diario</h1>
            <p className="text-muted-foreground">
            Registra y consulta los movimientos financieros de tus plazas.
            </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedPlaza} onValueChange={setSelectedPlaza} disabled={plazas.length === 0}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Selecciona una plaza" />
                </SelectTrigger>
                <SelectContent>
                    {plazas.length > 0 ? plazas.map(plaza => (
                        <SelectItem key={plaza.id} value={plaza.id}>{plaza.name}</SelectItem>
                    )) : <div className="p-4 text-sm text-muted-foreground">No hay plazas disponibles.</div>}
                </SelectContent>
            </Select>
            <Popover>
            <PopoverTrigger asChild>
                <Button
                variant={"outline"}
                className={cn(
                    "w-full sm:w-[240px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                )}
                >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                locale={es}
                />
            </PopoverContent>
            </Popover>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Cobrado" value={totals.collected} icon={DollarSign} variant="success" />
        <StatCard title="Total Prestado" value={totals.loaned} icon={ArrowUp} variant="default" />
        <StatCard title="Total Gastado" value={totals.spent} icon={ArrowDown} variant="destructive" />
      </div>

      <Card>
        <CardHeader>
           <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
            <div>
              <CardTitle>Movimientos del Día: {plazaName}</CardTitle>
              <CardDescription>Resumen de todos los registros del día seleccionado. Hay {entries.length} movimiento(s).</CardDescription>
            </div>
            
            <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                <Button variant="outline" size="sm" onClick={exportToPDF} disabled={entries.length === 0}>
                    <FileText className="mr-2 h-4 w-4" /> Exportar PDF
                </Button>
                <Button size="sm" onClick={() => handleOpenForm('collected')}>
                    <PlusCircle className="mr-2"/> Cobro
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleOpenForm('loaned')}>
                    <PlusCircle className="mr-2"/> Préstamo
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleOpenForm('spent')}>
                    <PlusCircle className="mr-2"/> Gasto
                </Button>
            </div>
           </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </TableCell>
                    </TableRow>
                ) : entries.length > 0 ? (
                    entries.map(entry => {
                        const config = typeConfig[entry.type];
                        return (
                            <TableRow key={entry.id}>
                                <TableCell>
                                    <div className={cn("flex items-center gap-2 font-medium", config.color)}>
                                        <config.icon className="h-4 w-4" />
                                        {config.label}
                                    </div>
                                </TableCell>
                                <TableCell>{entry.description}</TableCell>
                                <TableCell className="capitalize">{entry.category?.replace(/_/g, ' ') || 'N/A'}</TableCell>
                                <TableCell className={cn("text-right font-mono", config.color)}>
                                   ${entry.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </TableCell>
                            </TableRow>
                        )
                    })
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          {selectedPlaza ? 'No hay registros para este día.' : 'Por favor, selecciona una plaza.'}
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Registrar Movimiento en {plazaName}</DialogTitle>
                <DialogDescription>
                    Añade un nuevo registro de tipo '{typeConfig[formMode].label}' para el día {date ? format(date, "PPP", { locale: es }) : ''}.
                </DialogDescription>
            </DialogHeader>
            <DailyRecordForm 
                mode={formMode} 
                onSubmit={handleSubmitEntry}
                isSubmitting={isSubmitting}
            />
        </DialogContent>
      </Dialog>
    </div>
  );
}
