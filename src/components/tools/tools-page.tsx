
"use client";

import * as React from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { DollarSign, Users, UserCheck, Percent, Building, ArrowRight, Loader2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { Plaza, Customer } from "@/lib/data";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { getPlazas, addPlaza } from "@/services/plaza-service";
import { getAllCustomersByPrefixAndTool, addMultipleCustomers } from "@/services/customer-service";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const StatCard = ({ title, value, icon: Icon, isCurrency = false, description }: { title: string; value: number | string; icon: React.ElementType, isCurrency?: boolean, description?: string }) => (
    <Card className="premium-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold tracking-tight text-slate-500 dark:text-slate-400">{title}</CardTitle>
            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                <Icon className="h-4 w-4 text-primary" />
            </div>
        </CardHeader>
        <CardContent className="pt-2">
            <div className="text-2xl font-bold tracking-tight text-gradient bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                {isCurrency ? `$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}
            </div>
             {description && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">{description}</p>}
        </CardContent>
    </Card>
);

const DestructiveStatCard = ({ title, value, icon: Icon, isCurrency = false }: { title: string; value: number | string; icon: React.ElementType; isCurrency?: boolean }) => (
     <Card className="premium-card bg-gradient-to-br from-rose-500 to-red-600 text-white border-none shadow-lg shadow-rose-500/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold tracking-tight text-rose-100">{title}</CardTitle>
            <div className="p-1.5 bg-white/20 rounded-md backdrop-blur-sm">
                <Icon className="h-4 w-4 text-white" />
            </div>
        </CardHeader>
        <CardContent className="pt-2">
            <div className="text-3xl font-extrabold tracking-tight">
                {isCurrency ? `$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}
            </div>
        </CardContent>
    </Card>
);

const PlazaCard = ({ plaza }: { plaza: Plaza }) => (
    <Card className="premium-card flex flex-col justify-between overflow-hidden group">
        <CardHeader className="p-4">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-primary rounded-lg w-fit transition-transform duration-300 group-hover:scale-110">
                    <Building className="h-6 w-6" />
                </div>
                <div>
                    <CardTitle className="text-base font-semibold leading-tight">{plaza.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">Prefijo: {plaza.prefix || 'N/A'}</p>
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-grow space-y-4 px-4 pb-4">
             <div className="space-y-1">
                 <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Deuda Pendiente</span>
                <p className="text-xl font-bold text-red-500 dark:text-red-400">${(plaza.pendingDebt || 0).toLocaleString('es-MX')}</p>
            </div>
            <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                     <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tasa de Recuperación</span>
                    <span className="text-sm font-bold text-emerald-500 dark:text-emerald-400">{plaza.recoveryRate.toFixed(1)}%</span>
                </div>
                <Progress value={plaza.recoveryRate} className="h-2 bg-slate-100 dark:bg-slate-800" />
            </div>
        </CardContent>
        <CardFooter className="p-2 border-t bg-slate-50/50 dark:bg-slate-900/50">
            <Button asChild className="w-full" variant="ghost" size="sm">
                <Link href={`/tools/overdue-portfolio/plaza/${plaza.id}`}>
                    Administrar Plaza
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
            </Button>
        </CardFooter>
    </Card>
);


export function ToolsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [plazas, setPlazas] = React.useState<Plaza[]>([]);
    const [summary, setSummary] = React.useState({ totalDebt: 0, totalClients: 0, recoveredClients: 0, recoveryRate: 0 });
    const [isLoading, setIsLoading] = React.useState(true);
    const [isImportModalOpen, setImportModalOpen] = React.useState(false);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [importMode, setImportMode] = React.useState<'add' | 'replace'>('add');
    const [isImporting, setIsImporting] = React.useState(false);
    const toolContext = 'overdue-portfolio';

    const fetchData = React.useCallback(async () => {
        if (!user || !user.prefix) return;
        try {
            setIsLoading(true);
            const shouldFetchAll = user.isSuperAdmin || user.isToolAdmin;
            const [plazasFromDb, allCustomers] = await Promise.all([
                getPlazas({ prefix: user.prefix, fetchAll: shouldFetchAll, toolContext }),
                getAllCustomersByPrefixAndTool(user.prefix, toolContext)
            ]);

            setPlazas(plazasFromDb);

            const totalClients = allCustomers.length;
            const recoveredClients = allCustomers.filter(c => c.dueAmount === 0).length;
            const totalDebt = allCustomers.reduce((acc, c) => acc + (c.dueAmount || 0), 0);
            const recoveryRate = totalClients > 0 ? (recoveredClients / totalClients) * 100 : 0;
            
            setSummary({
                totalDebt,
                totalClients,
                recoveredClients,
                recoveryRate
            });

        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudieron cargar los datos del resumen.",
            });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    React.useEffect(() => {
        if (user && !user.isSuperAdmin && !user.isToolAdmin && !user.accessibleTools?.includes('cartera-vencida')) {
            router.push('/');
        } else {
            fetchData();
        }
    }, [user, router, fetchData]);
    
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
                const fileContent = e.target?.result;
                if (!fileContent) {
                    setIsImporting(false);
                    return toast({ variant: "destructive", title: "Error", description: "No se pudo leer el archivo." });
                }

                const workbook = XLSX.read(fileContent, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" }) as any[];

                if (!json || json.length === 0) {
                    setIsImporting(false);
                    return toast({ variant: "destructive", title: "Error", description: "El archivo de Excel está vacío o no se pudo leer." });
                }

                // Get existing plazas to avoid creating duplicates
                const existingPlazas = await getPlazas({ prefix: user.prefix, fetchAll: false, toolContext });
                const plazaMap: Record<string, string> = {}; // Maps plaza name to plaza ID
                existingPlazas.forEach(p => { plazaMap[p.name.toLowerCase()] = p.id; });

                const parsedCustomers: Omit<Customer, 'id'>[] = [];

                for (const row of json) {
                    let plazaId = '';
                    const plazaName = row.PLAZA || row.Plaza || '';

                    if (plazaName) {
                        if (plazaMap[plazaName.toLowerCase()]) {
                            plazaId = plazaMap[plazaName.toLowerCase()];
                        } else {
                            const newPlaza = await addPlaza({ name: plazaName, prefix: user.prefix, toolContext });
                            plazaId = newPlaza.id;
                            plazaMap[plazaName.toLowerCase()] = newPlaza.id;
                        }
                    } else {
                        continue; // Skip rows without a plaza
                    }
                    
                    const parseNumeric = (val: any) => {
                        if (val === null || val === undefined) return 0;
                        const num = parseFloat(String(val).replace(/[^0-9.-]+/g,""));
                        return isNaN(num) ? 0 : num;
                    };
                    
                    const parseDate = (val: any): Date | undefined => {
                        if (!val) return undefined;
                        if (val instanceof Date) return val;
                        try {
                            const parsed = new Date(val);
                            if (isNaN(parsed.getTime())) return undefined;
                            return parsed;
                        } catch {
                            return undefined;
                        }
                    };

                    const loanAmount = parseNumeric(row.PRESTAMO || row.Prestamo);

                    parsedCustomers.push({
                        plazaId,
                        prefix: user.prefix,
                        toolContext,
                        status: 'Pendiente', // Will be updated by addMultipleCustomers
                        name: row.NOMBRE || row.Nombre || '',
                        address: row.DIRECCION || row.Direccion || '',
                        phone: String(row.TELEFONO || row.Telefono || ''),
                        guarantor: String(row.AVAL || row.Aval || ''),
                        guarantorPhone: String(row['TEL. AVAL'] || row.TelAval || ''),
                        loanAmount: loanAmount,
                        paymentAmount: parseNumeric(row.PAGO || row.Pago),
                        installmentsDue: parseInt(String(row['NO.VENC.'] || row.NoVenc || 0), 10),
                        dueAmount: parseNumeric(row.ADEUDO || row.Adeudo || loanAmount),
                        fechaPrestamo: parseDate(row.FECHA || row.Fecha),
                    });
                }
                
                await addMultipleCustomers(parsedCustomers, importMode, user.prefix!);
                toast({ title: "Éxito", description: `${parsedCustomers.length} clientes importados.` });
                await fetchData(); // Refresh data
                setImportModalOpen(false);
                setIsImporting(false);
            };
            reader.onerror = () => {
                toast({ variant: "destructive", title: "Error de Archivo", description: "No se pudo leer el archivo seleccionado." });
                setIsImporting(false);
            }
            reader.readAsArrayBuffer(selectedFile);

        } catch (error) {
            toast({ variant: "destructive", title: "Error de Importación", description: "Ocurrió un error inesperado al iniciar la importación." });
            setIsImporting(false);
        }
    };

    if (user && !user.isSuperAdmin && !user.isToolAdmin && !user.accessibleTools?.includes('cartera-vencida')) {
        return (
            <div className="flex h-full items-center justify-center">
                <p>No tienes acceso a esta herramienta.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Resumen General</h1>
                    <p className="text-muted-foreground">Vista general de la cartera de clientes.</p>
                </div>
                 <Dialog open={isImportModalOpen} onOpenChange={setImportModalOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Upload className="mr-2 h-4 w-4" /> Importar desde Excel
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Importación Masiva</DialogTitle>
                            <DialogDescription>
                              Selecciona un archivo de Excel (`.xlsx`, `.xls`) con tus clientes. 
                              Las columnas deben tener encabezados como: FECHA, PLAZA, NOMBRE, ADEUDO, etc.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                              <Label>Modo de Importación</Label>
                              <RadioGroup defaultValue="add" value={importMode} onValueChange={(value) => setImportMode(value as any)} className="flex items-center gap-6">
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="add" id="r-add" />
                                  <Label htmlFor="r-add">Añadir a existentes</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="replace" id="r-replace" />
                                  <Label htmlFor="r-replace">Reemplazar todos los datos</Label>
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
                                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4"/>}
                                {isImporting ? 'Importando...' : 'Importar Archivo'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                  </Dialog>
            </div>

            {/* --- SECCIÓN DE RESUMEN GENERAL --- */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <DestructiveStatCard title="Deuda Total" value={summary.totalDebt} icon={DollarSign} isCurrency />
                <StatCard title="Clientes Totales" value={summary.totalClients} icon={Users} />
                <StatCard title="Clientes Recuperados" value={summary.recoveredClients} icon={UserCheck} description={`de ${summary.totalClients} clientes`} />
                <StatCard title="Tasa de Recuperación" value={`${summary.recoveryRate.toFixed(1)}%`} icon={Percent} />
            </div>

            {/* --- SECCIÓN DE CARTERA POR PLAZA --- */}
            <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Cartera por Plaza</h2>
            </div>
            {isLoading ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                    <span>Cargando plazas...</span>
                </div>
            ) : plazas.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {plazas.map((plaza) => (
                        <PlazaCard key={plaza.id} plaza={plaza} />
                    ))}
                </div>
            ) : (
                 <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">No hay plazas registradas. Comienza agregando una en la sección de "Gestionar Plazas".</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
