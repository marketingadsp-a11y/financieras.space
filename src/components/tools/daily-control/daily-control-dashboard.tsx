
"use client";

import * as React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Calendar as CalendarIcon,
  PlusCircle,
  ArrowDown,
  ArrowUp,
  CreditCard,
  DollarSign,
  Loader2,
  FileText,
  FileSpreadsheet,
  Download,
  PiggyBank,
  TrendingUp,
  TrendingDown
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
import { addDailyRecordEntry, getDailyRecord, getAllDailyRecordsByPlaza } from "@/services/daily-record-service";


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

const ActionCard = ({ title, description, icon: Icon, onClick, className }: { title: string; description: string; icon: React.ElementType; onClick: () => void; className?: string }) => (
    <Card 
        onClick={onClick}
        className={cn("group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/50", className)}>
        <CardHeader>
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg w-fit">
                    <Icon className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div>
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
            </div>
        </CardHeader>
    </Card>
);


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
  const [entryDate, setEntryDate] = React.useState(new Date());
  const [isExportingAll, setIsExportingAll] = React.useState(false);

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
        const allEntries = record?.entries || [];
        allEntries.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setEntries(allEntries);
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
    setEntryDate(date || new Date()); // Default to the selected date or today
    setFormMode(mode);
    setFormOpen(true);
  };

  const handleSubmitEntry = async (data: Omit<DailyRecordEntry, 'id' | 'plazaId' | 'date'>) => {
    if (!selectedPlaza || !entryDate || !user?.prefix) {
        toast({ variant: 'destructive', title: 'Error', description: 'Faltan datos para registrar el movimiento (plaza, fecha o prefijo).' });
        return;
    }
    setIsSubmitting(true);
    try {
        await addDailyRecordEntry(selectedPlaza, user.prefix, entryDate, data);
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
      toast({ variant: "destructive", title: "No hay datos para exportar", description: "Selecciona una fecha con movimientos para generar el PDF." });
      return;
    }

    const doc = new jsPDF();
    const formattedDate = format(date, "PPP", { locale: es });
    
    doc.text(`Movimientos de la Plaza: ${plazaName}`, 14, 16);
    doc.text(`Fecha: ${formattedDate}`, 14, 22);

    autoTable(doc, {
      head: [['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Monto']],
      body: entries.map(e => {
        const config = typeConfig[e.type];
        return [
          format(new Date(e.date), 'dd/MM/yyyy'),
          config.label,
          e.description,
          e.category?.replace(/_/g, ' ') || 'N/A',
          `$${e.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
        ]
      }),
      startY: 30,
      headStyles: { fillColor: [41, 128, 185] },
      styles: { halign: 'left' },
      columnStyles: { 4: { halign: 'right' } }
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

  const exportToExcel = () => {
    if (!plazaName || !date || entries.length === 0) {
      toast({ variant: "destructive", title: "No hay datos para exportar", description: "Selecciona una fecha con movimientos para generar el Excel." });
      return;
    }

    const dataToExport = entries.map(e => {
        const config = typeConfig[e.type];
        return {
            Fecha: format(new Date(e.date), 'dd/MM/yyyy'),
            Tipo: config.label,
            Descripción: e.description,
            Categoría: e.category?.replace(/_/g, ' ') || 'N/A',
            Monto: e.amount
        }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Movimientos");

    // Add totals
    XLSX.utils.sheet_add_aoa(worksheet, [[]], {origin: -1}); // Add a blank row
    XLSX.utils.sheet_add_aoa(worksheet, [['Totales del Día']], {origin: -1});
    XLSX.utils.sheet_add_aoa(worksheet, [['Total Cobrado', totals.collected]], {origin: -1});
    XLSX.utils.sheet_add_aoa(worksheet, [['Total Prestado', totals.loaned]], {origin: -1});
    XLSX.utils.sheet_add_aoa(worksheet, [['Total Gastado', totals.spent]], {origin: -1});

    XLSX.writeFile(workbook, `control_diario_${plazaName.replace(/\s/g, '_')}_${format(date, 'yyyy-MM-dd')}.xlsx`);
  }

  const handleExportAll = async () => {
    if (!selectedPlaza) {
      toast({ variant: "destructive", title: "Selecciona una plaza", description: "Debes seleccionar una plaza para exportar su historial." });
      return;
    }
    setIsExportingAll(true);
    try {
      const allEntries = await getAllDailyRecordsByPlaza(selectedPlaza);
      if (allEntries.length === 0) {
        toast({ title: "Sin datos", description: "No hay movimientos registrados para esta plaza." });
        return;
      }
      
      allEntries.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const dataToExport = allEntries.map(e => {
          const config = typeConfig[e.type];
          return {
              Fecha: format(new Date(e.date), 'dd/MM/yyyy'),
              Tipo: config.label,
              Descripción: e.description,
              Categoría: e.category?.replace(/_/g, ' ') || 'N/A',
              Monto: e.amount
          }
      });
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Historial Completo");
      XLSX.writeFile(workbook, `historial_completo_${plazaName.replace(/\s/g, '_')}.xlsx`);

    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo exportar el historial." });
    } finally {
      setIsExportingAll(false);
    }
  }


  const totals = React.useMemo(() => {
    return entries.reduce((acc, entry) => {
      if (entry.type === 'collected') acc.collected += entry.amount;
      if (entry.type === 'loaned') acc.loaned += entry.amount;
      if (entry.type === 'spent') acc.spent += entry.amount;
      return acc;
    }, { collected: 0, loaned: 0, spent: 0 });
  }, [entries]);

  const typeConfig = {
    collected: { icon: TrendingDown, color: "text-green-600", label: "Cobrado" },
    loaned: { icon: TrendingUp, color: "text-blue-600", label: "Prestado" },
    spent: { icon: PiggyBank, color: "text-red-600", label: "Gastado" },
  }
  
  const plazaName = plazas.find(p => p.id === selectedPlaza)?.name || 'Desconocida';
  const entryDateLabel = entryDate ? format(entryDate, "PPP", { locale: es }) : 'la fecha seleccionada';


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
                    "w-full sm:w-auto justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                )}
                >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? (
                    format(date, "PPP", { locale: es })
                ) : (
                    <span>Selecciona una fecha</span>
                )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                initialFocus
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={es}
                />
            </PopoverContent>
            </Popover>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ActionCard 
            title="Registrar Cobrado"
            description="Abonos de clientes y entradas."
            icon={TrendingDown}
            onClick={() => handleOpenForm('collected')}
            className="border-green-500/50 hover:border-green-500"
        />
        <ActionCard 
            title="Registrar Préstamo"
            description="Nuevos créditos otorgados."
            icon={TrendingUp}
            onClick={() => handleOpenForm('loaned')}
            className="border-blue-500/50 hover:border-blue-500"
        />
        <ActionCard 
            title="Registrar Gasto"
            description="Salidas de dinero operativo."
            icon={PiggyBank}
            onClick={() => handleOpenForm('spent')}
            className="border-red-500/50 hover:border-red-500"
        />
      </div>

      <Card>
        <CardHeader>
           <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
            <div>
              <CardTitle>Movimientos del día: {plazaName}</CardTitle>
              <CardDescription>Resumen de todos los registros para el {date ? format(date, "PPP", { locale: es }) : 'día seleccionado'}. Hay {entries.length} movimiento(s).</CardDescription>
            </div>
            
            <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                <Button variant="outline" size="sm" onClick={handleExportAll} disabled={isExportingAll || !selectedPlaza}>
                    {isExportingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                    {isExportingAll ? 'Exportando...' : 'Exportar Todo (Excel)'}
                </Button>
                <Button variant="outline" size="sm" onClick={exportToExcel} disabled={entries.length === 0}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
                </Button>
                <Button variant="outline" size="sm" onClick={exportToPDF} disabled={entries.length === 0}>
                    <FileText className="mr-2 h-4 w-4" /> Exportar PDF
                </Button>
            </div>
           </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <StatCard title="Total Cobrado" value={totals.collected} icon={DollarSign} variant="success" />
            <StatCard title="Total Prestado" value={totals.loaned} icon={ArrowUp} variant="default" />
            <StatCard title="Total Gastado" value={totals.spent} icon={ArrowDown} variant="destructive" />
          </div>
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </TableCell>
                    </TableRow>
                ) : entries.length > 0 ? (
                    entries.map(entry => {
                        const config = typeConfig[entry.type];
                        return (
                            <TableRow key={entry.id}>
                                <TableCell className="font-medium">{format(new Date(entry.date), "dd/MM/yyyy")}</TableCell>
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
                        <TableCell colSpan={5} className="h-24 text-center">
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
                    Añade un nuevo registro de tipo '{typeConfig[formMode].label}' para el día {entryDateLabel}.
                </DialogDescription>
            </DialogHeader>
            <DailyRecordForm 
                mode={formMode} 
                onSubmit={handleSubmitEntry}
                isSubmitting={isSubmitting}
                entryDate={entryDate}
                onEntryDateChange={setEntryDate}
            />
        </DialogContent>
      </Dialog>
    </div>
  );
}
