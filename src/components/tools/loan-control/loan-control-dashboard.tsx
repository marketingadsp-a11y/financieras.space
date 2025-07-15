"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Building, Loader2, Upload, Download, FolderKanban, Banknote, DollarSign, Calendar as CalendarIcon } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import type { Plaza, StructuredCustomerData } from "@/lib/data";
import { getPlazas } from "@/services/plaza-service";
import { getPlazaStructure, importFullStructureFromData } from "@/services/loan-control-service";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

type PlazaWithStats = Plaza & {
  carteraCount: number;
};

const StatCard = ({ title, value, icon: Icon, isCurrency = false, variant = 'default' }: { title: string; value: number | string; icon: React.ElementType; isCurrency?: boolean; variant?: 'default' | 'destructive' }) => {
    const cardClasses = {
        default: "bg-card text-card-foreground",
        destructive: "bg-destructive/90 text-destructive-foreground",
    }
    const textClasses = {
        default: "text-primary",
        destructive: "text-destructive-foreground",
    }
    const iconClasses = {
        default: "text-muted-foreground",
        destructive: "text-destructive-foreground/70",
    }
    
    return (
        <Card className={cardClasses[variant]}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${iconClasses[variant]}`} />
            </CardHeader>
            <CardContent>
                <div className={`text-3xl font-bold ${textClasses[variant]}`}>
                    {isCurrency ? `$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}
                </div>
            </CardContent>
        </Card>
    );
};

const PlazaStatsCard = ({ plaza }: { plaza: PlazaWithStats }) => {
    return (
        <Card className="group flex flex-col transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1.5 hover:border-primary/30">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-lg">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building className="h-6 w-6" />
                        </span>
                        {plaza.name}
                    </CardTitle>
                    {plaza.prefix && <Badge variant="outline">{plaza.prefix}</Badge>}
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                 <div className="text-left">
                    <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
                    <p className="text-xl font-bold text-destructive">
                        ${plaza.pendingDebt.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                 <div>
                    <p className="text-sm font-medium text-muted-foreground">Carteras</p>
                    <p className="text-xl font-bold text-center">{plaza.carteraCount}</p>
                </div>
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full">
                   <Link href={`/tools/loan-control/plaza/${plaza.id}`}>
                        Administrar Plaza <ArrowRight className="ml-2 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
};

export function LoanControlDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plazas, setPlazas] = React.useState<PlazaWithStats[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [importMode, setImportMode] = React.useState<'add' | 'replace'>('add');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [startDate, setStartDate] = React.useState<Date | undefined>();
  const [endDate, setEndDate] = React.useState<Date | undefined>();


  const fetchUserPlazas = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const shouldFetchAll = user.isSuperAdmin || user.isToolAdmin;
        const plazasFromDb = await getPlazas({ 
            prefix: user.prefix, 
            fetchAll: shouldFetchAll,
            startDate,
            endDate
        });
        
        const plazasWithStats = await Promise.all(
            plazasFromDb.map(async (plaza) => {
                const structure = await getPlazaStructure(plaza.id);
                return {
                    ...plaza,
                    carteraCount: structure.carteras.length,
                };
            })
        );
        
        setPlazas(plazasWithStats);

    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las plazas.' });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast, startDate, endDate]);

  React.useEffect(() => {
    fetchUserPlazas();
  }, [fetchUserPlazas]);
  
  const handleDownloadTemplate = () => {
    const headers = ["Plaza", "Cartera", "Grupo", "Cliente", "Dirección", "Telefonos", "Colonia", "C.P.", "Aval", "Dirección Aval", "Telefonos Aval", "Colonia Aval", "C.P. Aval", "F. Prestamo", "Prestamo", "Saldo"];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "plantilla_importacion_completa.xlsx");
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user?.prefix) {
      if (!user?.prefix) toast({ variant: "destructive", title: "Error de autenticación", description: "No se pudo identificar tu prefijo de empresa." });
      return;
    }

    setIsImporting(true);
    let allFileContents: StructuredCustomerData[] = [];

    for (const file of Array.from(files)) {
      try {
        const data = await new Promise<string | ArrayBuffer | null>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result || null);
          reader.onerror = reject;
          reader.readAsBinaryString(file);
        });

        if (!data) continue;

        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const headers = jsonData[0].map((h: any) => String(h || '').trim().toUpperCase().replace(/\s+/g, '_').replace('C.P.','CP').replace('F._PRESTAMO', 'FECHA_PRESTAMO').replace('TELEFONOS','TELEFONO'));
        const structuredData: StructuredCustomerData[] = jsonData.slice(1).map((row: any[]) => {
          const customer: any = {};
          headers.forEach((header: string, index: number) => {
            const keyMap: Record<string, string> = {
                'PLAZA': 'plazaName', 'CARTERA': 'carteraName', 'RESPONSABLE': 'responsable', 'GRUPO': 'groupName',
                'CLIENTE': 'name', 'NOMBRE': 'name', 'DIRECCION': 'address', 'COLONIA': 'colonia',
                'CP': 'cp', 'TELEFONO': 'phone', 'AVAL': 'guarantor', 'TEL_AVAL': 'guarantorPhone',
                'DIRECCION_AVAL': 'direccionAval', 'COLONIA_AVAL': 'coloniaAval', 'CP_AVAL': 'cpAval',
                'PRESTAMO': 'loanAmount', 'PAGO': 'paymentAmount', 'VENCIDOS': 'installmentsDue',
                'SALDO': 'dueAmount', 'ADEUDO': 'dueAmount', 'FECHA_PRESTAMO': 'fechaPrestamo'
            };
            const key = keyMap[header];
            if (key) customer[key] = row[index];
          });
          return customer as StructuredCustomerData;
        });
        
        allFileContents.push(...structuredData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "No se pudo procesar el archivo.";
        toast({ variant: "destructive", title: `Error en archivo ${file.name}`, description: errorMessage });
        setIsImporting(false);
        if (event.target) event.target.value = '';
        return;
      }
    }

    try {
      const result = await importFullStructureFromData({ prefix: user.prefix, customers: allFileContents, mode: importMode });
      toast({
        title: "Importación Completada",
        description: `Se procesaron ${files.length} archivo(s), creando ${result.newPlazas} plazas, ${result.newCarteras} carteras, ${result.newGroups} grupos y ${result.totalCustomers} clientes.`
      });
      
      await fetchUserPlazas();
      
    } catch (importError) {
       const errorMessage = importError instanceof Error ? importError.message : "Ocurrió un error desconocido durante la escritura en la base de datos.";
       toast({ variant: "destructive", title: `Error de importación`, description: errorMessage });
    } finally {
      setIsImporting(false);
      setIsImportDialogOpen(false);
      if (event.target) event.target.value = '';
    }
  };

  const globalTotals = React.useMemo(() => {
    return plazas.reduce((acc, plaza) => {
      acc.saldoPendiente += plaza.pendingDebt;
      return acc;
    }, { saldoPendiente: 0 });
  }, [plazas]);

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Control de Préstamo</h1>
                <p className="text-muted-foreground">
                Selecciona una plaza o importa toda tu estructura desde un archivo de Excel.
                </p>
            </div>
             <div className="flex items-center gap-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".xlsx, .xls, .csv"
                    multiple
                />
                 <Button variant="outline" onClick={handleDownloadTemplate}>
                    <Download className="mr-2 h-4 w-4"/>
                    Descargar Plantilla
                </Button>
                <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                    <DialogTrigger asChild>
                         <Button variant="outline" disabled={isImporting}>
                            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                            {isImporting ? "Procesando..." : 'Importar Archivo'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Importar Estructura Completa</DialogTitle>
                            <DialogDescriptionComponent>
                                Selecciona el modo de importación y luego elige los archivos. Las columnas Plaza, Cartera y Grupo se crearán si no existen.
                            </DialogDescriptionComponent>
                        </DialogHeader>
                         <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Modo de Importación</Label>
                                <RadioGroup defaultValue="add" value={importMode} onValueChange={(value: 'add' | 'replace') => setImportMode(value)} className="flex items-center gap-6">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="add" id="r-add" /><Label htmlFor="r-add">Añadir a existentes</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="replace" id="r-replace" className="text-destructive">Reemplazar todo lo registrado</Label></div>
                                </RadioGroup>
                                {importMode === 'replace' && (
                                    <p className="text-xs text-destructive/80">
                                        ¡Cuidado! Esta opción borrará permanentemente todas las plazas, carteras, grupos y clientes de tu empresa ({user?.prefix}) antes de importar.
                                    </p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                                <Upload className="mr-2 h-4 w-4"/>
                                Seleccionar Archivos
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
            <StatCard title="Saldo Pendiente Global" value={globalTotals.saldoPendiente} icon={Banknote} isCurrency variant="destructive" />
        </div>

        <div className="space-y-4 p-4 border rounded-lg bg-card">
            <h4 className="font-medium text-sm">Filtrar Préstamos por Fecha de Otorgamiento</h4>
            <div className="flex flex-col sm:flex-row gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date-start"
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP", {locale: es}) : <span>Fecha de Inicio</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                    />
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
                        {endDate ? format(endDate, "PPP", {locale: es}) : <span>Fecha de Fin</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                 <Button onClick={() => {setStartDate(undefined); setEndDate(undefined);}} variant="ghost">Limpiar</Button>
            </div>
        </div>

        {isLoading ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span>Cargando plazas...</span>
            </div>
        ) : plazas.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plazas.map((plaza) => (
                    <PlazaStatsCard key={plaza.id} plaza={plaza} />
                ))}
            </div>
        ) : (
             <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                    <p>No hay plazas registradas.</p>
                    <p className="text-sm mt-1">Comienza agregando una en la sección de "Gestionar Plazas" o impórtalas desde un archivo.</p>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
