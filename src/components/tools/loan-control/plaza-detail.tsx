
"use client";

import * as React from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { saveAs } from 'file-saver';
import { getPlazaById } from "@/services/plaza-service";
import type { Plaza, LoanControlCartera, StructuredCustomerData } from "@/lib/data";
import { Loader2, FolderKanban, ArrowRight, PlusCircle, MoreHorizontal, Pencil, Trash2, User, Upload, Download, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCarterasByPlaza, addCartera, deleteCartera, updateCartera, getGroupsAndCustomersByCartera, importStructuredData } from "@/services/loan-control-service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription as DialogDescriptionComponent } from "@/components/ui/dialog";
import { CarteraForm } from "./cartera-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Input } from "../ui/input";


type CarteraWithStats = LoanControlCartera & {
    stats: {
        totalPrestado: number;
        totalPendiente: number;
        customerCount: number;
        groupCount: number;
    }
};

const StatCard = ({ title, value, isCurrency = false }: { title: string; value: number; isCurrency?: boolean }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
            {isCurrency ? `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}
        </div>
      </CardContent>
    </Card>
);


const CarteraCard = ({ cartera, onEdit, onDelete }: { cartera: CarteraWithStats, onEdit: (cartera: LoanControlCartera) => void, onDelete: (id: string) => void }) => (
    <Card className="flex flex-col">
        <CardHeader>
            <div className="flex justify-between items-start">
                 <CardTitle className="flex items-center gap-2 text-lg">
                    <FolderKanban className="h-5 w-5 text-muted-foreground" />
                    {cartera.name}
                </CardTitle>
                 <AlertDialog>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Alternar menú</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => onEdit(cartera)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                        </DropdownMenuContent>
                    </DropdownMenu>
                     <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                            Esta acción eliminará la cartera y desvinculará a los grupos asociados. Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(cartera.id)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <CardDescription className="flex items-center gap-2 pt-1 text-sm">
                <User className="h-4 w-4" /> {cartera.responsable}
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 flex-grow">
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg bg-muted p-2">
                    <p className="text-muted-foreground text-xs font-medium">GRUPOS</p>
                    <p className="font-bold text-lg">{cartera.stats.groupCount}</p>
                </div>
                 <div className="rounded-lg bg-muted p-2">
                    <p className="text-muted-foreground text-xs font-medium">CLIENTES</p>
                    <p className="font-bold text-lg">{cartera.stats.customerCount}</p>
                </div>
            </div>
            <div className="space-y-2">
                 <div>
                    <p className="text-xs text-muted-foreground">Total Prestado</p>
                    <p className="font-semibold text-base">${cartera.stats.totalPrestado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
                    <p className={cn("font-bold text-base", cartera.stats.totalPendiente > 0 ? "text-destructive" : "")}>
                       ${cartera.stats.totalPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

        </CardContent>
        <CardFooter>
            <Button asChild className="w-full">
               <Link href={{
                  pathname: `/tools/loan-control/cartera/${cartera.id}`,
                  query: { plazaId: cartera.plazaId }
               }}>
                    Administrar Grupos <ArrowRight className="ml-2" />
                </Link>
            </Button>
        </CardFooter>
    </Card>
);

export function LoanControlPlazaDetail({ plazaId }: { plazaId: string }) {
  const { user } = useAuth();
  const [plaza, setPlaza] = React.useState<Plaza | null>(null);
  const [carteras, setCarteras] = React.useState<CarteraWithStats[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [importMode, setImportMode] = React.useState<'add' | 'replace'>('add');
  const [editingCartera, setEditingCartera] = React.useState<LoanControlCartera | null>(null);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchCarterasWithStats = React.useCallback(async () => {
    try {
      const carterasData = await getCarterasByPlaza(plazaId);
      const carterasWithStatsPromises = carterasData.map(async (cartera) => {
          const { groups, customers } = await getGroupsAndCustomersByCartera(cartera.id);
          
          const stats = customers.reduce((acc, customer) => {
              acc.totalPrestado += customer.loanAmount;
              acc.totalPendiente += customer.dueAmount;
              return acc;
          }, { totalPrestado: 0, totalPendiente: 0 });
          
          return {
              ...cartera,
              stats: {
                  ...stats,
                  customerCount: customers.length,
                  groupCount: groups.length
              }
          };
      });
      const carterasWithStats = await Promise.all(carterasWithStatsPromises);
      setCarteras(carterasWithStats);
    } catch (error) {
      console.error("Error fetching carteras with stats:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la lista de carteras." });
    }
  }, [plazaId, toast]);

  const fetchInitialData = React.useCallback(async () => {
      setIsLoading(true);
      try {
        const plazaData = await getPlazaById(plazaId);
        setPlaza(plazaData);
        await fetchCarterasWithStats();
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información de la plaza." });
      } finally {
        setIsLoading(false);
      }
    }, [plazaId, toast, fetchCarterasWithStats]);

  React.useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);
  
  const handleFormSubmit = async (values: Omit<LoanControlCartera, 'id' | 'plazaId' | 'prefix'>) => {
    if (!user?.prefix) return;

    try {
        const dataToSave = {
            name: values.name,
            responsable: values.responsable,
        };
        if (editingCartera) {
            await updateCartera(editingCartera.id, dataToSave);
            toast({ title: "Éxito", description: "Cartera actualizada." });
        } else {
            await addCartera({ ...dataToSave, plazaId, prefix: user.prefix });
            toast({ title: "Éxito", description: "Cartera creada." });
        }
        
        setIsFormOpen(false);
        setEditingCartera(null);
        await fetchCarterasWithStats();
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la cartera." });
    }
  };
  
  const handleEditClick = (cartera: LoanControlCartera) => {
    setEditingCartera(cartera);
    setIsFormOpen(true);
  };
  
  const handleDeleteClick = async (id: string) => {
    try {
        await deleteCartera(id);
        toast({ title: "Éxito", description: "Cartera eliminada." });
        await fetchCarterasWithStats();
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la cartera." });
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user?.prefix) {
      if (!user?.prefix) toast({ variant: "destructive", title: "Error de autenticación", description: "No se pudo identificar tu prefijo de empresa." });
      return;
    }

    setIsImporting(true);
    let totalCustomersImported = 0;
    let totalCarterasCreated = 0;
    let totalGroupsCreated = 0;
    
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
            
            const headers = jsonData[0].map((h:any) => String(h).trim().toUpperCase().replace(/\s+/g, '_').replace('C.P.','CP').replace('F._PRESTAMO', 'FECHA_PRESTAMO').replace('TELEFONOS','TELEFONO'));
            const structuredData: StructuredCustomerData[] = jsonData.slice(1).map(row => {
                const customer: any = {};
                headers.forEach((header: string, index: number) => {
                    const keyMap: Record<string, string> = {
                        'CARTERA': 'carteraName', 'RESPONSABLE': 'responsable', 'GRUPO': 'groupName',
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

            const result = await importStructuredData({ plazaId, prefix: user.prefix, customers: structuredData, mode: importMode });
            totalCustomersImported += result.totalCustomers;
            totalCarterasCreated += result.newCarteras;
            totalGroupsCreated += result.newGroups;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "No se pudo procesar el archivo.";
            toast({ variant: "destructive", title: `Error en archivo ${file.name}`, description: errorMessage });
            // Stop processing if one file fails
            setIsImporting(false);
            if (event.target) event.target.value = '';
            return;
        }
    }
    
    toast({
        title: "Importación Completada",
        description: `Se procesaron ${files.length} archivo(s), creando ${totalCarterasCreated} carteras, ${totalGroupsCreated} grupos y ${totalCustomersImported} clientes.`
    });
    
    await fetchInitialData();
    setIsImporting(false);
    setIsImportDialogOpen(false);
    if (event.target) event.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const headers = ["Cartera", "Grupo", "Cliente", "Dirección", "Telefonos", "Colonia", "C.P.", "Aval", "Dirección Aval", "Telefonos Aval", "Colonia Aval", "C.P. Aval", "F. Prestamo", "Prestamo", "Saldo"];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "plantilla_importacion.xlsx");
  };

  const plazaTotals = React.useMemo(() => {
    return carteras.reduce((acc, cartera) => {
        acc.totalPrestado += cartera.stats.totalPrestado;
        acc.totalPendiente += cartera.stats.totalPendiente;
        return acc;
    }, { totalPrestado: 0, totalPendiente: 0});
  }, [carteras]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando información...</span>
      </div>
    );
  }

  if (!plaza) {
    return <div className="text-center">No se encontró la plaza.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plaza: {plaza.name}</h1>
        <p className="text-muted-foreground">
          Gestiona las carteras de esta plaza. Cada cartera puede contener múltiples grupos de clientes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
            <StatCard title="Total Prestado en Plaza" value={plazaTotals.totalPrestado} isCurrency />
            <StatCard title="Saldo Pendiente en Plaza" value={plazaTotals.totalPendiente} isCurrency />
      </div>

      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Carteras</CardTitle>
                    <CardDescription>
                        Organiza tus clientes en diferentes carteras.
                    </CardDescription>
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
                                <DialogTitle>Importar Clientes desde Archivo</DialogTitle>
                                <DialogDescriptionComponent>
                                    Selecciona el modo de importación y luego elige los archivos.
                                </DialogDescriptionComponent>
                            </DialogHeader>
                             <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>Modo de Importación</Label>
                                    <RadioGroup defaultValue="add" value={importMode} onValueChange={(value: 'add' | 'replace') => setImportMode(value)} className="flex items-center gap-6">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="add" id="r-add" /><Label htmlFor="r-add">Añadir a existentes</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="replace" id="r-replace" /><Label htmlFor="r-replace" className="text-destructive">Reemplazar clientes de la plaza</Label></div>
                                    </RadioGroup>
                                    {importMode === 'replace' && (
                                        <p className="text-xs text-destructive/80">
                                            ¡Cuidado! Esta opción borrará permanentemente todos los clientes de esta plaza antes de importar.
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
                    <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if(!open) setEditingCartera(null);}}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" /> Agregar Cartera
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingCartera ? "Editar" : "Agregar"} Cartera</DialogTitle>
                            </DialogHeader>
                            <CarteraForm
                                onSubmit={handleFormSubmit}
                                cartera={editingCartera}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            {carteras.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {carteras.map((cartera) => (
                        <CarteraCard key={cartera.id} cartera={cartera} onEdit={handleEditClick} onDelete={handleDeleteClick} />
                    ))}
                </div>
            ) : (
                <p className="text-muted-foreground text-center py-8">
                    No hay carteras registradas para esta plaza. Haz clic en "Agregar Cartera" para empezar.
                </p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
