
"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/context/auth-context";
import type { Plaza } from "@/lib/data";
import { getPlazas } from "@/services/plaza-service";
import { Loader2, Building, ArrowRight, Upload, FileUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { importFullLoanData } from "@/services/loan-control-service";


const PlazaCard = ({ plaza }: { plaza: Plaza }) => (
    <Card className="flex flex-col group hover:border-primary transition-all">
        <CardHeader>
            <div className="flex items-center gap-4">
                 <div className="p-3 bg-primary/10 rounded-lg w-fit">
                    <Building className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div>
                    <CardTitle>{plaza.name}</CardTitle>
                    <CardDescription>Prefijo: {plaza.prefix}</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground">Gestiona carteras, grupos y asigna clientes a esta plaza.</p>
        </CardContent>
        <CardFooter>
            <Button asChild className="w-full">
                <Link href={`/tools/loan-control/plaza/${plaza.id}`}>
                    Administrar Plaza
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </CardFooter>
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
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet, {
                        raw: false, // This will format dates
                        defval: "", // default value for empty cells
                    });

                    // Map excel headers to our expected keys (case-insensitive)
                    const mappedData = json.map((row: any) => {
                        const newRow: any = {};
                        for (const key in row) {
                            const lowerKey = key.toLowerCase().trim();
                            if (lowerKey.includes('plaza')) newRow.plazaName = row[key];
                            else if (lowerKey.includes('cartera')) newRow.carteraName = row[key];
                            else if (lowerKey.includes('responsable')) newRow.responsable = row[key];
                            else if (lowerKey.includes('grupo')) newRow.groupName = row[key];
                            else if (lowerKey.includes('nombre')) newRow.name = row[key];
                            else if (lowerKey.includes('dirección') || lowerKey.includes('direccion')) newRow.address = row[key];
                            else if (lowerKey.includes('colonia')) newRow.colonia = row[key];
                            else if (lowerKey.includes('cp') || lowerKey.includes('c.p')) newRow.cp = String(row[key]);
                            else if (lowerKey.includes('teléfono') || lowerKey.includes('telefono')) newRow.phone = String(row[key]);
                            else if (lowerKey.includes('aval') && !lowerKey.includes('dir') && !lowerKey.includes('tel')) newRow.guarantor = row[key];
                            else if (lowerKey.includes('tel aval')) newRow.guarantorPhone = String(row[key]);
                            else if (lowerKey.includes('dir aval')) newRow.direccionAval = row[key];
                            else if (lowerKey.includes('col aval')) newRow.coloniaAval = row[key];
                            else if (lowerKey.includes('cp aval')) newRow.cpAval = String(row[key]);
                            else if (lowerKey.includes('prestamo')) newRow.loanAmount = parseFloat(String(row[key]).replace(/[^0-9.-]+/g,""));
                            else if (lowerKey.includes('pago')) newRow.paymentAmount = parseFloat(String(row[key]).replace(/[^0-9.-]+/g,""));
                            else if (lowerKey.includes('vencidos')) newRow.installmentsDue = parseInt(row[key], 10);
                            else if (lowerKey.includes('adeudo')) newRow.dueAmount = parseFloat(String(row[key]).replace(/[^0-9.-]+/g,""));
                            else if (lowerKey.includes('fecha')) newRow.fechaPrestamo = row[key];
                        }
                        return newRow;
                    });
                    
                    await importFullLoanData(mappedData as any, importMode, user.prefix);
                    
                    toast({ title: "Éxito", description: `Se procesaron ${json.length} filas del archivo.` });
                    await fetchPlazasForUser();
                    setImportModalOpen(false);
                } catch(readError) {
                     toast({ variant: "destructive", title: "Error de Lectura", description: "No se pudo procesar el archivo Excel. Asegúrate que el formato sea correcto." });
                } finally {
                    setIsImporting(false);
                }
            };
            reader.readAsBinaryString(selectedFile);

        } catch (error) {
            toast({ variant: "destructive", title: "Error de Importación", description: "Ocurrió un error al importar los datos." });
            setIsImporting(false);
        }
    };


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

            {plazas.length > 0 ? (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
