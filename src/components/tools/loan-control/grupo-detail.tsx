
"use client";

import * as React from "react";
import Link from "next/link";
import { getAssignedCustomersByGrupo, getGrupoById, getCarteraById } from "@/services/loan-control-service";
import { addMultipleCustomers } from "@/services/customer-service";
import type { Customer, LoanControlGrupo, LoanControlCartera, Plaza } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, Users, Pencil, Phone, Home, Calendar, User, FileText, FileSpreadsheet, Download, ClipboardPaste, CalendarIcon as CalendarIconLucide, FilterX, BadgeInfo, TrendingUp, TrendingDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { CustomerEditDialog } from "@/components/tools/overdue-portfolio/customer-edit-dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDescriptionComponent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { parseCustomers } from "@/ai/flows/customer-parser-flow";
import { useAuth } from "@/context/auth-context";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { getPlazaById } from "@/services/plaza-service";
import { NavPanel } from "./nav-panel";


const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
};

const StatCard = ({ title, value, icon: Icon, colorClass }: { title: string; value: number; icon: React.ElementType; colorClass: string }) => (
    <Card className="premium-card overflow-hidden relative p-3">
      <div className={cn("absolute top-0 left-0 w-1.5 h-full", colorClass)} />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
          <p className="text-lg font-black tracking-tight text-slate-855 dark:text-slate-150 mt-0.5">
              ${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground opacity-70" />
        </div>
      </div>
    </Card>
);

const CustomerInfoCard = ({ customer, onEdit, onPayment }: { customer: Customer; onEdit: (c: Customer) => void; onPayment: (c: Customer) => void; }) => {
    const isPaid = customer.dueAmount <= 0;
    return (
        <Card className="premium-card flex flex-col group overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-indigo-500 opacity-80" />
            <CardHeader className="flex flex-row gap-2.5 items-center p-3 pb-1.5">
                 <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/15 to-indigo-650/15 flex items-center justify-center text-primary dark:text-indigo-400 font-extrabold text-[10px] border border-primary/20 dark:border-primary/10 select-none shrink-0">
                    {getInitials(customer.name)}
                </div>
                <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-center gap-1.5">
                        <CardTitle className="text-xs font-bold text-slate-855 dark:text-slate-150 leading-tight tracking-tight truncate" title={customer.name}>{customer.name}</CardTitle>
                        <div className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold tracking-wide border uppercase shrink-0",
                            isPaid 
                                ? "bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-900/30"
                                : "bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455 border-rose-100/50 dark:border-rose-900/30"
                        )}>
                            <span className={cn(
                                "h-1 w-1 rounded-full",
                                isPaid ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
                            )} />
                            <span>{isPaid ? "Pagado" : "Pendiente"}</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow px-3 pb-2 pt-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    {customer.phone && (
                        <p className="flex items-center gap-1 font-medium truncate shrink-0">
                            <Phone className="h-3 w-3 text-slate-400 dark:text-slate-550 shrink-0"/> 
                            <span>{customer.phone}</span>
                        </p>
                    )}
                    <p className="flex items-center gap-1 truncate max-w-[180px]">
                        <Home className="h-3 w-3 text-slate-400 dark:text-slate-550 shrink-0"/> 
                        <span className="truncate" title={customer.address}>{customer.address}</span>
                    </p>
                </div>
                <div className="grid grid-cols-3 gap-1 bg-slate-50/50 dark:bg-slate-900/40 p-1.5 rounded-lg border border-slate-100/50 dark:border-slate-800/50 text-[10px]">
                    <div className="text-center">
                        <span className="text-[8px] font-bold text-slate-500 tracking-wider block">PRÉSTAMO</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">${(customer.loanAmount || 0).toLocaleString('es-MX')}</span>
                    </div>
                    <div className="text-center border-l border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-[8px] font-bold text-slate-500 tracking-wider block">SALDO</span>
                        <span className={cn("font-extrabold", isPaid ? "text-slate-800 dark:text-slate-200" : "text-rose-600 dark:text-rose-455")}>
                            ${(customer.dueAmount || 0).toLocaleString('es-MX')}
                        </span>
                    </div>
                    <div className="text-center border-l border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-[8px] font-bold text-slate-500 tracking-wider block">FECHA</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {customer.fechaPrestamo ? format(new Date(customer.fechaPrestamo), "dd/MM/yy") : 'N/A'}
                        </span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex gap-1.5 border-t bg-slate-50/30 dark:bg-slate-900/10 p-1.5 px-3">
                <Button variant="outline" className="w-full border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-[10px] font-bold rounded-lg h-7 flex items-center justify-center gap-1 transition-all duration-200" onClick={() => onEdit(customer)}><Pencil className="h-3 w-3"/>Editar</Button>
                <Button className="w-full bg-gradient-to-r from-primary to-indigo-650 hover:from-primary/95 hover:to-indigo-650/95 text-white text-[10px] font-bold rounded-lg h-7 flex items-center justify-center gap-1 transition-all duration-355 shadow-md shadow-primary/5 hover:shadow-lg hover:shadow-primary/15 disabled:from-slate-150 disabled:to-slate-150 dark:disabled:from-slate-850 dark:disabled:to-slate-850 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:border-none disabled:shadow-none disabled:cursor-not-allowed" onClick={() => onPayment(customer)} disabled={isPaid}><DollarSign className="h-3 w-3"/>Abonar</Button>
            </CardFooter>
        </Card>
    );
};

export function GrupoDetail({ grupoId }: { grupoId: string }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [grupo, setGrupo] = React.useState<LoanControlGrupo | null>(null);
    const [cartera, setCartera] = React.useState<LoanControlCartera | null>(null);
    const [plaza, setPlaza] = React.useState<Plaza | null>(null);
    const [customers, setCustomers] = React.useState<Customer[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
    const [dialogMode, setDialogMode] = React.useState<'edit' | 'payment'>('edit');
    const [searchTerm, setSearchTerm] = React.useState("");
    const [isImportModalOpen, setImportModalOpen] = React.useState(false);
    const [importText, setImportText] = React.useState('');
    const [isParsing, setIsParsing] = React.useState(false);
    const [importMode, setImportMode] = React.useState<'add' | 'replace'>('add');
    const [startDate, setStartDate] = React.useState<Date | undefined>();
    const [endDate, setEndDate] = React.useState<Date | undefined>();


    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const grupoData = await getGrupoById(grupoId);
            setGrupo(grupoData);

            if (grupoData) {
                const [carteraData, customersData] = await Promise.all([
                    getCarteraById(grupoData.carteraId),
                    getAssignedCustomersByGrupo(grupoId)
                ]);
                setCartera(carteraData);
                setCustomers(customersData);

                if (carteraData) {
                    const plazaData = await getPlazaById(carteraData.plazaId);
                    setPlaza(plazaData);
                }
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información del grupo." });
        } finally {
            setIsLoading(false);
        }
    }, [grupoId, toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenDialog = (customer: Customer, mode: 'edit' | 'payment') => {
        setSelectedCustomer(customer);
        setDialogMode(mode);
    };
    
    const handleCloseDialog = () => {
        setSelectedCustomer(null);
    };
    
    const handleSuccess = () => {
        fetchData(); // Refresh data on success
    };

    const handleImport = async () => {
        if (!importText.trim()) {
            toast({ variant: "destructive", title: "Error", description: "El área de texto no puede estar vacía." });
            return;
        }
        if (!user?.prefix || !grupo) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo determinar el prefijo o el grupo." });
            return;
        }
        setIsParsing(true);
        try {
            const parsedData = await parseCustomers({ inputText: importText });
            if (!parsedData || parsedData.length === 0) {
                toast({ variant: "destructive", title: "Error de IA", description: "La IA no pudo procesar el texto. Verifica el formato." });
                return;
            }

            const customersToAdd = parsedData.map(c => ({...c, plazaId: grupo.plazaId, status: 'Pendiente' as const, loanControlGroupId: grupoId})) as any;
            
            await addMultipleCustomers(customersToAdd, importMode, user.prefix, grupo.plazaId, grupoId);

            toast({ title: "Éxito", description: `${customersToAdd.length} clientes importados y asignados a este grupo.` });
            await fetchData();
            setImportModalOpen(false);
            setImportText('');

        } catch (error) {
            toast({ variant: "destructive", title: "Error de Importación", description: "Ocurrió un error al importar los clientes." });
            console.error(error);
        } finally {
            setIsParsing(false);
        }
    };
    
    const filteredCustomers = React.useMemo(() => {
        return customers
            .filter(c => 
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.address.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .filter(c => {
                if (!c.fechaPrestamo) return true; // Keep customers without a date
                const loanDate = new Date(c.fechaPrestamo);
                if (startDate && loanDate < startDate) return false;
                if (endDate) {
                    const endOfDay = new Date(endDate);
                    endOfDay.setHours(23, 59, 59, 999);
                    if (loanDate > endOfDay) return false;
                }
                return true;
            });
    }, [customers, searchTerm, startDate, endDate]);

    const summary = React.useMemo(() => {
        return filteredCustomers.reduce((acc, customer) => {
            acc.totalLoaned += (customer.loanAmount || 0);
            acc.totalDue += (customer.dueAmount || 0);
            return acc;
        }, { totalLoaned: 0, totalDue: 0 });
    }, [filteredCustomers]);
    
    const clearFilters = () => {
        setSearchTerm("");
        setStartDate(undefined);
        setEndDate(undefined);
    };

    const getDateRangeString = () => {
        if (startDate && endDate) return `Del ${format(startDate, 'dd/MM/yyyy')} al ${format(endDate, 'dd/MM/yyyy')}`;
        if (startDate) return `Desde ${format(startDate, 'dd/MM/yyyy')}`;
        if (endDate) return `Hasta ${format(endDate, 'dd/MM/yyyy')}`;
        return 'Todas las fechas';
    }

    const exportToPDF = () => {
        if (!grupo || filteredCustomers.length === 0) return;
        const doc = new jsPDF();
        doc.text(`Resumen del Grupo: ${grupo.name}`, 14, 16);
        doc.text(`Rango de Fechas: ${getDateRangeString()}`, 14, 22);
        doc.text(`Total Prestado: $${summary.totalLoaned.toLocaleString('es-MX')}`, 14, 28);
        doc.text(`Total Pendiente: $${summary.totalDue.toLocaleString('es-MX')}`, 14, 34);

        autoTable(doc, {
            startY: 40,
            head: [['Nombre', 'Dirección', 'Teléfono', 'Aval', 'Préstamo', 'Saldo']],
            body: filteredCustomers.map(c => [
                c.name,
                c.address,
                c.phone,
                c.guarantor,
                `$${(c.loanAmount || 0).toLocaleString('es-MX')}`,
                `$${(c.dueAmount || 0).toLocaleString('es-MX')}`
            ]),
        });
        const fileName = `Resumen_Grupo_${grupo.name.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        doc.save(fileName);
    };

    const exportToExcel = () => {
        if (!grupo || filteredCustomers.length === 0) return;
        const dataToExport = filteredCustomers.map(c => ({
            'Nombre': c.name,
            'Dirección': c.address,
            'Teléfono': c.phone,
            'Aval': c.guarantor,
            'Teléfono Aval': c.guarantorPhone,
            'Fecha Préstamo': c.fechaPrestamo ? format(new Date(c.fechaPrestamo), 'yyyy-MM-dd') : 'N/A',
            'Monto Prestado': c.loanAmount,
            'Saldo Pendiente': c.dueAmount
        }));
        
        const worksheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.sheet_add_aoa(worksheet, [['Resumen de Clientes del Grupo']], { origin: 'A1' });
        XLSX.utils.sheet_add_aoa(worksheet, [[`Grupo: ${grupo.name}`]], { origin: 'A2' });
        XLSX.utils.sheet_add_aoa(worksheet, [[`Rango de Fechas: ${getDateRangeString()}`]], { origin: 'A3' });

        XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: 'A5' });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
        const fileName = `Resumen_Grupo_${grupo.name.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span>Cargando clientes del grupo...</span>
            </div>
        );
    }

    if (!grupo || !cartera || !plaza) {
        return <p>Información no encontrada.</p>
    }

    return (
        <div className="space-y-3">
            <NavPanel plazaId={plaza.id} />
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-gradient">Grupo: {grupo.name}</h1>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        Resumen financiero y listado de clientes en la cartera <span className="font-semibold text-slate-850 dark:text-slate-200">{cartera.name}</span> / plaza <span className="font-semibold text-slate-850 dark:text-slate-200">{plaza.name}</span>.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={exportToExcel} 
                        disabled={filteredCustomers.length === 0}
                        className="h-8 text-xs border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                    >
                        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-455" /> Excel
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={exportToPDF} 
                        disabled={filteredCustomers.length === 0}
                        className="h-8 text-xs border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                    >
                        <FileText className="mr-1.5 h-3.5 w-3.5 text-rose-600 dark:text-rose-455" /> PDF
                    </Button>
                    <Dialog open={isImportModalOpen} onOpenChange={setImportModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-8 text-xs bg-gradient-to-r from-primary to-indigo-650 hover:from-primary/95 hover:to-indigo-650/95 text-white shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 hover:translate-y-[-1px] transition-all duration-300">
                                <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" /> Importar Clientes
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl glassmorphic border-white/20 dark:border-slate-800/40">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">Importar Clientes a "{grupo.name}"</DialogTitle>
                                <DialogDescriptionComponent className="text-xs text-muted-foreground mt-2">
                                Pega datos estructurados desde una hoja de cálculo. La IA los procesará y agregará automáticamente a este grupo.
                                </DialogDescriptionComponent>
                            </DialogHeader>
                            <div className="grid gap-5 py-4">
                                <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-xl border border-slate-150/40 dark:border-slate-800/40">
                                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-355 tracking-wide">MODO DE IMPORTACIÓN</Label>
                                    <RadioGroup defaultValue="add" value={importMode} onValueChange={(value) => setImportMode(value as any)} className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        <div className="flex items-center space-x-2 bg-white dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 flex-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
                                            <RadioGroupItem value="add" id="r-add" className="text-primary border-slate-300 dark:border-slate-700" />
                                            <Label htmlFor="r-add" className="text-xs font-medium cursor-pointer">Añadir a existentes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2 bg-white dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 flex-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
                                            <RadioGroupItem value="replace" id="r-replace" className="text-rose-500 border-slate-300 dark:border-slate-700" />
                                            <Label htmlFor="r-replace" className="text-xs font-medium cursor-pointer text-rose-650 dark:text-rose-455">Reemplazar clientes</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="import-textarea" className="text-xs font-bold text-slate-700 dark:text-slate-355 tracking-wide">DATOS DE CLIENTES</Label>
                                    <Textarea 
                                        id="import-textarea"
                                        placeholder="Pega aquí los datos (ej. Nombre, Dirección, Teléfono, Préstamo, etc.)...." 
                                        className="min-h-[180px] bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus-visible:ring-primary focus-visible:ring-1"
                                        value={importText}
                                        onChange={(e) => setImportText(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="outline" onClick={() => setImportModalOpen(false)} className="border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900">Cancelar</Button>
                                <Button 
                                    onClick={handleImport} 
                                    disabled={isParsing || !importText.trim()}
                                    className="bg-gradient-to-r from-primary to-indigo-650 text-white"
                                >
                                    {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardPaste className="mr-2 h-4 w-4"/>}
                                    {isParsing ? 'Procesando...' : 'Importar'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <StatCard title="Total Prestado (Filtro)" value={summary.totalLoaned} icon={TrendingUp} colorClass="bg-gradient-to-b from-indigo-500 to-indigo-650" />
                <StatCard title="Total Pendiente (Filtro)" value={summary.totalDue} icon={TrendingDown} colorClass="bg-gradient-to-b from-rose-500 to-rose-600" />
            </div>

            <Card className="premium-card bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-100 dark:border-slate-800/80 p-3">
                <div className="flex flex-col lg:flex-row gap-2 items-center">
                    <div className="relative flex-grow w-full glowing-border rounded-lg">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-550" />
                        <Input
                            placeholder="Buscar cliente por nombre o dirección..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 h-8 text-xs w-full bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus-visible:ring-primary focus-visible:ring-1 focus-visible:ring-offset-0"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                id="date-start"
                                variant={"outline"}
                                className={cn("w-full sm:w-[130px] h-8 justify-start text-left font-medium bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-[11px]", !startDate && "text-muted-foreground")}
                                >
                                <CalendarIconLucide className="mr-1.5 h-3.5 w-3.5 text-slate-455 dark:text-slate-500" />
                                {startDate ? format(startDate, "dd/MM/yyyy") : <span>Fecha inicio</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 glassmorphic border-slate-100 dark:border-slate-850" align="start">
                                <CalendarComponent mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                id="date-end"
                                variant={"outline"}
                                className={cn("w-full sm:w-[130px] h-8 justify-start text-left font-medium bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-[11px]", !endDate && "text-muted-foreground")}
                                >
                                <CalendarIconLucide className="mr-1.5 h-3.5 w-3.5 text-slate-455 dark:text-slate-500" />
                                {endDate ? format(endDate, "dd/MM/yyyy") : <span>Fecha fin</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 glassmorphic border-slate-100 dark:border-slate-850" align="start">
                                <CalendarComponent mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                         <Button 
                            variant="ghost" 
                            onClick={clearFilters}
                            className="h-8 text-xs text-slate-500 hover:text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 px-2.5 transition-all duration-200 shrink-0"
                        >
                            <FilterX className="mr-1.5 h-3.5 w-3.5" />
                            Limpiar
                        </Button>
                    </div>
                </div>
            </Card>

            <div>
                {filteredCustomers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {filteredCustomers.map(customer => (
                            <CustomerInfoCard 
                                key={customer.id} 
                                customer={customer} 
                                onEdit={(c) => handleOpenDialog(c, 'edit')} 
                                onPayment={(c) => handleOpenDialog(c, 'payment')} 
                            />
                        ))}
                    </div>
                ) : (
                    <Card className="premium-card border-dashed bg-slate-50/20 dark:bg-slate-900/10">
                        <CardContent className="pt-10 pb-10">
                            <div className="text-center text-muted-foreground">
                                <Users className="mx-auto h-10 w-10 opacity-40 text-primary" />
                                <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-205">No se encontraron clientes</h3>
                                <p className="mt-1 text-sm">
                                    {searchTerm || startDate || endDate ? "Prueba con otro término de búsqueda o ajusta el rango de fechas." : "No hay clientes asignados a este grupo."}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
            
            <CustomerEditDialog
                isOpen={!!selectedCustomer}
                customer={selectedCustomer}
                mode={dialogMode}
                onClose={handleCloseDialog}
                onSuccess={handleSuccess}
            />
        </div>
    );
}
