"use client";

import * as React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useAuth } from "@/context/auth-context";
import type { Plaza, LoanControlPermission } from "@/lib/data";
import { getPlazas, updatePlaza } from "@/services/plaza-service";
import { clearDataByPrefix } from "@/services/loan-control-service";
import { Loader2, Building, ArrowRight, Upload, FileUp, DollarSign, Target, TrendingUp, TrendingDown, CalendarIcon, FilterX, MoreHorizontal, Trash2, Search, FileSpreadsheet, FileText, Edit, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { processAndImportLoanData } from "@/ai/flows/full-loan-data-parser-flow";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { PlazaEditDialog } from "./plaza-edit-dialog";
import { RecallDialog } from "./recall-dialog";


const PlazaCard = ({ plaza, onEdit, canEdit }: { plaza: Plaza, onEdit: (plaza: Plaza) => void, canEdit: boolean }) => {
    return (
        <Card className="group flex flex-col transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1.5 p-2">
            <CardHeader className="p-1">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg w-fit">
                            <Building className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-semibold leading-tight">{plaza.name}</CardTitle>
                            <CardDescription className="text-xs">Prefijo: {plaza.prefix}</CardDescription>
                        </div>
                    </div>
                    {canEdit && (
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 group-hover:opacity-100">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => onEdit(plaza)}>
                                    <Edit className="mr-2 h-4 w-4" /> Editar Nombre
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-2 px-3 pb-3">
                 <div className="space-y-1">
                     <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-3 w-3 text-green-500"/> PRESTADO</span>
                    <p className="text-base font-bold">${(plaza.totalLoanAmount || 0).toLocaleString('es-MX')}</p>
                </div>
                 <div className="space-y-1">
                     <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><TrendingDown className="h-3 w-3 text-red-500"/> PENDIENTE</span>
                    <p className="text-base font-bold text-destructive">${(plaza.pendingDebt || 0).toLocaleString('es-MX')}</p>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between items-baseline">
                         <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Target className="h-3 w-3 text-blue-500"/> RECUPERACIÓN</span>
                        <span className="text-xs font-bold">{plaza.recoveryRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={plaza.recoveryRate} className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-blue-600" />
                </div>
            </CardContent>
            <CardFooter className="p-2 border-t">
                <Button asChild className="w-full" variant="ghost" size="sm">
                    <Link href={`/tools/loan-control/plaza/${plaza.id}`}>
                        Administrar
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
};

const StatCard = ({ title, value }: { title: string; value: number | undefined; }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
            ${(value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </CardContent>
    </Card>
);


export function LoanControlDashboard() {
    const { user, hasPermission } = useAuth();
    const { toast } = useToast();
    const [plazas, setPlazas] = React.useState<Plaza[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isImportModalOpen, setImportModalOpen] = React.useState(false);
    const [isRecallModalOpen, setRecallModalOpen] = React.useState(false);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [importMode, setImportMode] = React.useState<'add' | 'replace'>('add');
    const [isImporting, setIsImporting] = React.useState(false);
    const [startDate, setStartDate] = React.useState<Date | undefined>();
    const [endDate, setEndDate] = React.useState<Date | undefined>();
    const [searchTerm, setSearchTerm] = React.useState("");
    const [deleteConfirmationText, setDeleteConfirmationText] = React.useState('');
    const [editingPlaza, setEditingPlaza] = React.useState<Plaza | null>(null);

    const [summary, setSummary] = React.useState({ 
        totalDebt: 0, 
        totalClients: 0, 
        recoveredClients: 0, 
        recoveryRate: 0, 
        totalLoaned: 0 
    });


    const fetchPlazasForUser = React.useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const shouldFetchAll = user.isSuperAdmin || user.isToolAdmin;
            const plazasFromDb = await getPlazas({ prefix: user.prefix, fetchAll: shouldFetchAll, startDate, endDate, toolContext: 'loan-control' });
            setPlazas(plazasFromDb);

            // Update summary stats based on current filters
            const totalLoaned = plazasFromDb.reduce((acc, p) => acc + (p.totalLoanAmount || 0), 0);
            const totalDebt = plazasFromDb.reduce((acc, p) => acc + (p.pendingDebt || 0), 0);
            setSummary(prev => ({ ...prev, totalLoaned, totalDebt }));

        } catch (error) {
            console.error("Failed to fetch plazas", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las plazas.' });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast, startDate, endDate]);

    React.useEffect(() => {
        fetchPlazasForUser();
    }, [fetchPlazasForUser]);
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!selectedFile) {
            toast({ variant: "destructive", title: "Error", description: "Por favor, selecciona un archivo de Excel." });
            return;
        }
        if (!user?.prefix) {
            toast({ variant: "destructive", title: "Error", description: "No tienes un prefijo asignado para importar datos." });
            return;
        }
        setIsImporting(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const fileContent = e.target?.result as string;
                const base64Content = fileContent.split(',')[1];

                const result = await processAndImportLoanData({
                    fileContentBase64: base64Content,
                    importMode,
                    prefix: user.prefix!,
                });

                if (result.success) {
                    toast({ title: "Éxito", description: result.message });
                    await fetchPlazasForUser();
                    setImportModalOpen(false);
                } else {
                    toast({ variant: "destructive", title: "Error de Importación", description: result.message });
                }
                 setIsImporting(false);
            };
            reader.onerror = () => {
                toast({ variant: "destructive", title: "Error de Archivo", description: "No se pudo leer el archivo seleccionado." });
                setIsImporting(false);
            }
            reader.readAsDataURL(selectedFile);

        } catch (error) {
            toast({ variant: "destructive", title: "Error de Importación", description: "Ocurrió un error inesperado al iniciar la importación." });
            setIsImporting(false);
        }
    };
    
    const handleDeleteAllData = async () => {
        if (!user?.prefix) return;
        try {
            await clearDataByPrefix(user.prefix);
            toast({
                title: "Éxito",
                description: "Todos los datos de Control de Préstamo han sido eliminados.",
            });
            await fetchPlazasForUser();
            setDeleteConfirmationText('');
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudieron eliminar los datos.",
            });
        }
    };

    const handleUpdatePlaza = async (id: string, newName: string) => {
        try {
            await updatePlaza(id, { name: newName });
            toast({ title: "Éxito", description: "Nombre de la plaza actualizado."});
            setEditingPlaza(null);
            fetchPlazasForUser(); // Refresh data
            return true;
        } catch (error) {
             toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la plaza."});
             return false;
        }
    };

    const filteredPlazas = React.useMemo(() => {
        return plazas.filter(plaza => 
            plaza.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [plazas, searchTerm]);

    const filteredSummary = React.useMemo(() => {
        return filteredPlazas.reduce((acc, plaza) => {
            acc.totalLoaned += plaza.totalLoanAmount || 0;
            acc.totalDue += plaza.pendingDebt || 0;
            return acc;
        }, { totalLoaned: 0, totalDue: 0 });
    }, [filteredPlazas]);
    
    const clearFilters = () => {
        setStartDate(undefined);
        setEndDate(undefined);
        setSearchTerm("");
    }
    
    const getDateRangeString = () => {
        if (startDate && endDate) return `Del ${format(startDate, 'dd/MM/yyyy')} al ${format(endDate, 'dd/MM/yyyy')}`;
        if (startDate) return `Desde ${format(startDate, 'dd/MM/yyyy')}`;
        if (endDate) return `Hasta ${format(endDate, 'dd/MM/yyyy')}`;
        return 'Todas las fechas';
    }

    const exportToPDF = () => {
        if (filteredPlazas.length === 0) return;
        const doc = new jsPDF();
        doc.text("Resumen de Plazas - Control de Préstamo", 14, 16);
        doc.text(`Rango de Fechas: ${getDateRangeString()}`, 14, 22);
        doc.text(`Total Prestado (Filtrado): $${filteredSummary.totalLoaned.toLocaleString('es-MX')}`, 14, 28);
        doc.text(`Total Pendiente (Filtrado): $${filteredSummary.totalDue.toLocaleString('es-MX')}`, 14, 34);

        autoTable(doc, {
            startY: 40,
            head: [['Plaza', 'Prefijo', 'Total Prestado', 'Deuda Pendiente', 'Recuperación (%)']],
            body: filteredPlazas.map(p => [
                p.name,
                p.prefix || 'N/A',
                `$${(p.totalLoanAmount || 0).toLocaleString('es-MX')}`,
                `$${(p.pendingDebt || 0).toLocaleString('es-MX')}`,
                `${p.recoveryRate.toFixed(1)}%`
            ]),
        });
        const fileName = `Resumen_Plazas_Control_Prestamo_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        doc.save(fileName);
    };

    const exportToExcel = () => {
        if (filteredPlazas.length === 0) return;
        const dataToExport = filteredPlazas.map(p => ({
            'Plaza': p.name,
            'Prefijo': p.prefix,
            'Total Prestado': p.totalLoanAmount,
            'Deuda Pendiente': p.pendingDebt,
            'Tasa de Recuperación (%)': p.recoveryRate,
        }));
        
        const worksheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.sheet_add_aoa(worksheet, [['Resumen de Plazas - Control de Préstamo']], { origin: 'A1' });
        XLSX.utils.sheet_add_aoa(worksheet, [[`Rango de Fechas: ${getDateRangeString()}`]], { origin: 'A2' });

        XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: 'A4' });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Resumen de Plazas");
        const fileName = `Resumen_Plazas_Control_Prestamo_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    const canEditPlazaNames = hasPermission('loan-control', 'CAN_EDIT_PLAZA_NAMES');
    const canDeleteAllData = hasPermission('loan-control', 'CAN_DELETE_ALL_DATA');
    const isFortunaAdmin = user?.prefix === 'fortuna' && user?.username === 'admin';

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span>Cargando plazas...</span>
            </div>
        );
    }
    
    const expectedConfirmationText = "ELIMINAR TODO";
  
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Control de Préstamo</h1>
                    <p className="text-muted-foreground">
                        Selecciona una plaza para organizar clientes en carteras y grupos.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                     {isFortunaAdmin && (
                        <Button variant="outline" onClick={() => setRecallModalOpen(true)}>
                            <RefreshCcw className="mr-2 h-4 w-4" /> Recall
                        </Button>
                     )}
                     <Dialog open={isImportModalOpen} onOpenChange={setImportModalOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Upload className="mr-2 h-4 w-4" /> Importar desde Excel
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl">
                            <DialogHeader>
                                <DialogTitle>Importación Masiva (Plaza {'>'} Cartera {'>'} Grupo {'>'} Cliente)</DialogTitle>
                                <DialogDescriptionComponent>
                                  Selecciona un archivo de Excel (`.xlsx`, `.xls`) para una importación completa.
                                  Las columnas deben tener encabezados como: Plaza, Cartera, Grupo, Nombre, Prestamo, etc.
                                </DialogDescriptionComponent>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                  <Label>Modo de Importación</Label>
                                  <RadioGroup defaultValue="add" value={importMode} onValueChange={(value) => setImportMode(value as any)} className="flex items-center gap-6">
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="add" id="r1" />
                                      <Label htmlFor="r1">Añadir a existentes</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="replace" id="r2" />
                                      <Label htmlFor="r2">Reemplazar todos los datos de este prefijo</Label>
                                    </div>
                                  </RadioGroup>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="excel-file">Archivo de Excel</Label>
                                    <Input 
                                        id="excel-file"
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setImportModalOpen(false)}>Cancelar</Button>
                                <Button onClick={handleImport} disabled={isImporting || !selectedFile}>
                                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4"/>}
                                    {isImporting ? 'Importando...' : 'Importar Archivo'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    <Button variant="outline" size="sm" onClick={exportToExcel} disabled={filteredPlazas.length === 0}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToPDF} disabled={filteredPlazas.length === 0}>
                        <FileText className="mr-2 h-4 w-4" /> Exportar PDF
                    </Button>
                    {canDeleteAllData && (
                         <AlertDialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Más Opciones</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={e => e.preventDefault()}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar Todos los Datos
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitleComponent>¿Estás absolutamente seguro?</AlertDialogTitleComponent>
                                    <AlertDialogDescription>
                                        Esta acción es irreversible y eliminará permanentemente <strong>TODAS</strong> las plazas, carteras, grupos y clientes de Control de Préstamo para el prefijo <strong>{user?.prefix}</strong>.
                                        Para confirmar, escribe <strong className="text-foreground">{expectedConfirmationText}</strong>.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <Input
                                value={deleteConfirmationText}
                                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                                placeholder={expectedConfirmationText}
                                autoFocus
                                />
                                <AlertDialogFooterComponent>
                                <AlertDialogCancel onClick={() => setDeleteConfirmationText('')}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDeleteAllData}
                                    disabled={deleteConfirmationText !== expectedConfirmationText}
                                    className="bg-destructive hover:bg-destructive/90"
                                >
                                    Sí, eliminar todo
                                </AlertDialogAction>
                                </AlertDialogFooterComponent>
                            </AlertDialogContent>
                            </AlertDialog>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard title="Total Prestado (Filtrado)" value={filteredSummary.totalLoaned} />
                <StatCard title="Total Pendiente (Filtrado)" value={filteredSummary.totalDue} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                    <CardDescription>
                        Filtra la información por nombre de plaza y/o rango de fechas de préstamo.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-2 items-center">
                    <div className="relative flex-grow w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre de plaza..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-full"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                id="date-start"
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, "PPP", {locale: es}) : <span>Fecha de inicio</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                id="date-end"
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate ? format(endDate, "PPP", {locale: es}) : <span>Fecha de fin</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <Button variant="ghost" onClick={clearFilters}>
                            <FilterX className="mr-2 h-4 w-4" />
                            Limpiar
                        </Button>
                    </div>
                </CardContent>
            </Card>


            {filteredPlazas.length > 0 ? (
                 <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                    {filteredPlazas.map(plaza => (
                        <PlazaCard key={plaza.id} plaza={plaza} onEdit={setEditingPlaza} canEdit={canEditPlazaNames}/>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">
                            {plazas.length > 0 ? "No se encontraron plazas que coincidan con los filtros." : "No hay plazas disponibles. Un administrador debe crear una primero o puedes importarlas masivamente."}
                        </p>
                    </CardContent>
                </Card>
            )}

            <PlazaEditDialog
                plaza={editingPlaza}
                isOpen={!!editingPlaza}
                onClose={() => setEditingPlaza(null)}
                onSave={handleUpdatePlaza}
            />

            {isFortunaAdmin && (
                <RecallDialog
                    isOpen={isRecallModalOpen}
                    onClose={() => setRecallModalOpen(false)}
                    plazas={plazas}
                    onSuccess={fetchPlazasForUser}
                />
            )}
        </div>
    );
}
