
"use client";

import * as React from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { DollarSign, Users, UserCheck, Percent, Building, ArrowRight, Loader2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { Plaza, Customer } from "@/lib/data";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { getPlazas } from "@/services/plaza-service";
import { getAllCustomersByPrefixAndTool, addMultipleCustomers } from "@/services/customer-service";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { parseCustomersFromExcel } from "@/ai/flows/customer-parser-flow";

const StatCard = ({ title, value, icon: Icon, isCurrency = false, description }: { title: string; value: number | string; icon: React.ElementType, isCurrency?: boolean, description?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">
                {isCurrency ? `$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}
            </div>
             {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);

const DestructiveStatCard = ({ title, value, icon: Icon, isCurrency = false }) => (
     <Card className="bg-destructive/90 text-destructive-foreground">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-destructive-foreground/70" />
        </CardHeader>
        <CardContent>
            <div className="text-3xl font-bold">
                {isCurrency ? `$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}
            </div>
        </CardContent>
    </Card>
)

const PlazaCard = ({ plaza }: { plaza: Plaza }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="h-5 w-5 text-muted-foreground" />
                {plaza.name}
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <p className="text-sm text-muted-foreground">Deuda Pendiente</p>
                <p className="text-2xl font-bold text-destructive">
                    ${plaza.pendingDebt.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
            </div>
            <div>
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Tasa de Recuperación</span>
                    <span>{plaza.recoveryRate.toFixed(1)}%</span>
                </div>
                <Progress value={plaza.recoveryRate} aria-label={`${plaza.recoveryRate}% de recuperación`} />
            </div>
            <Button asChild className="w-full">
               <Link href={`/tools/overdue-portfolio/plaza/${plaza.id}`}>
                    Ver Detalles <ArrowRight className="ml-2" />
                </Link>
            </Button>
        </CardContent>
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
                const fileContent = e.target?.result as string;
                const base64Content = fileContent.split(',')[1];

                const parsedCustomers = await parseCustomersFromExcel({
                    fileContentBase64: base64Content,
                    prefix: user.prefix!,
                });

                if (parsedCustomers.length === 0) {
                    toast({ variant: "destructive", title: "Error de IA", description: "La IA no pudo procesar el archivo o no encontró clientes." });
                } else {
                    await addMultipleCustomers(parsedCustomers, importMode, user.prefix!);
                    toast({ title: "Éxito", description: `${parsedCustomers.length} clientes importados.` });
                    await fetchData(); // Refresh data
                    setImportModalOpen(false);
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
