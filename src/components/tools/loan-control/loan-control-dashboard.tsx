
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import type { Plaza } from "@/lib/data";
import { getPlazas } from "@/services/plaza-service";
import { Loader2, Building, ArrowRight, Upload, FileUp, DollarSign, Target, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { processAndImportLoanData } from "@/ai/flows/full-loan-data-parser-flow";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";


const PlazaCard = ({ plaza }: { plaza: Plaza }) => {
    return (
        <Card className="flex flex-col group hover:border-primary transition-all">
            <CardHeader>
                <div className="flex items-center gap-3">
                     <div className="p-2 bg-primary/10 rounded-lg w-fit">
                        <Building className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">{plaza.name}</CardTitle>
                        <CardDescription className="text-xs">Prefijo: {plaza.prefix}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                <div className="space-y-1">
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-3 w-3 text-green-500"/> PRESTADO</span>
                    </div>
                    <p className="text-xl font-bold">${(plaza.totalLoanAmount || 0).toLocaleString('es-MX')}</p>
                </div>
                 <div className="space-y-1">
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><TrendingDown className="h-3 w-3 text-red-500"/> PENDIENTE</span>
                    </div>
                    <p className="text-xl font-bold text-destructive">${(plaza.pendingDebt || 0).toLocaleString('es-MX')}</p>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between items-baseline">
                         <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Target className="h-3 w-3 text-blue-500"/> RECUPERACIÓN</span>
                        <span className="text-xs font-bold">{plaza.recoveryRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={plaza.recoveryRate} className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-blue-600" />
                </div>
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full" size="sm">
                    <Link href={`/tools/loan-control/plaza/${plaza.id}`}>
                        Administrar
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
};

const StatCard = ({ title, value }: { title: string; value: number; }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
            ${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </CardContent>
    </Card>
);


export function LoanControlDashboard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [plazas, setPlazas] = React.useState<Plaza[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isImportModalOpen, setImportModalOpen] = React.useState(false);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [importMode, setImportMode] = React.useState<'add' | 'replace'>('add');
    const [isImporting, setIsImporting] = React.useState(false);


    const fetchPlazasForUser = React.useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const shouldFetchAll = user.isSuperAdmin || user.isToolAdmin;
            const plazasFromDb = await getPlazas({ prefix: user.prefix, fetchAll: shouldFetchAll });
            setPlazas(plazasFromDb);
        } catch (error) {
            console.error("Failed to fetch plazas", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las plazas.' });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

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
    
    const summary = React.useMemo(() => {
        return plazas.reduce((acc, plaza) => {
            acc.totalLoaned += plaza.totalLoanAmount || 0;
            acc.totalDue += plaza.pendingDebt || 0;
            return acc;
        }, { totalLoaned: 0, totalDue: 0 });
    }, [plazas]);


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span>Cargando plazas...</span>
            </div>
        );
    }
  
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Control de Préstamo</h1>
                    <p className="text-muted-foreground">
                        Selecciona una plaza para organizar clientes en carteras y grupos.
                    </p>
                </div>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard title="Total Prestado (Todas las Plazas)" value={summary.totalLoaned} />
                <StatCard title="Total Pendiente (Todas las Plazas)" value={summary.totalDue} />
            </div>

            {plazas.length > 0 ? (
                 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {plazas.map(plaza => (
                        <PlazaCard key={plaza.id} plaza={plaza} />
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">No hay plazas disponibles. Un administrador debe crear una primero o puedes importarlas masivamente.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
