
"use client";

import * as React from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Loader2, Users, PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowRight, ClipboardPaste, FileSpreadsheet, FileText, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getCarteraById, getGruposByCartera, addGrupo, updateGrupo, deleteGrupo, importGruposAndCustomersFromPaste } from "@/services/loan-control-service";
import { getCustomersByLoanControlGroup } from "@/services/customer-service";
import type { LoanControlCartera, LoanControlGrupo, Customer } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { GrupoForm } from "./grupo-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/auth-context";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getPlazaById } from "@/services/plaza-service";

type GrupoWithStats = LoanControlGrupo & {
    customerCount: number;
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

export function LoanControlCarteraDetail({ carteraId, plazaId }: { carteraId: string, plazaId: string }) {
  const { user } = useAuth();
  const [cartera, setCartera] = React.useState<LoanControlCartera | null>(null);
  const [plazaName, setPlazaName] = React.useState('');
  const [grupos, setGrupos] = React.useState<GrupoWithStats[]>([]);
  const [allCustomers, setAllCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingGrupo, setEditingGrupo] = React.useState<LoanControlGrupo | null>(null);
  const [isImportModalOpen, setImportModalOpen] = React.useState(false);
  const [importText, setImportText] = React.useState('');
  const [importMode, setImportMode] = React.useState<'add' | 'replace'>('add');
  const [isProcessingImport, setIsProcessingImport] = React.useState(false);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);


  const fetchGruposAndCustomers = React.useCallback(async () => {
      try {
        setIsLoading(true);
        const [carteraData, gruposData, plazaData] = await Promise.all([
             getCarteraById(carteraId),
             getGruposByCartera(carteraId),
             getPlazaById(plazaId),
        ]);

        setCartera(carteraData);
        setPlazaName(plazaData?.name || '');
        
        const customerPromises = gruposData.map(grupo => getCustomersByLoanControlGroup(grupo.id));
        const customersByGroup = await Promise.all(customerPromises);
        
        const allCustomersFlat = customersByGroup.flat();
        setAllCustomers(allCustomersFlat);

        const gruposWithStats = gruposData.map((grupo, index) => ({
            ...grupo,
            customerCount: customersByGroup[index].length
        }));
        setGrupos(gruposWithStats);

      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información de la cartera." });
      } finally {
          setIsLoading(false);
      }
  }, [carteraId, plazaId, toast]);

  React.useEffect(() => {
    fetchGruposAndCustomers();
  }, [fetchGruposAndCustomers]);

  const handleFormSubmit = async (values: Omit<LoanControlGrupo, 'id' | 'carteraId' | 'plazaId' | 'prefix'>) => {
    if (!user?.prefix) return;
    try {
        if (editingGrupo) {
            await updateGrupo(editingGrupo.id, { name: values.name });
            toast({ title: "Éxito", description: "Grupo actualizado." });
        } else {
            await addGrupo({ ...values, carteraId, plazaId, prefix: user.prefix });
            toast({ title: "Éxito", description: "Grupo creado." });
        }
        setIsFormOpen(false);
        setEditingGrupo(null);
        await fetchGruposAndCustomers();
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el grupo." });
    }
  };

  const handleEditClick = (grupo: LoanControlGrupo) => {
    setEditingGrupo(grupo);
    setIsFormOpen(true);
  };
  
  const handleDeleteClick = async (id: string) => {
    try {
        await deleteGrupo(id);
        toast({ title: "Éxito", description: "Grupo eliminado." });
        await fetchGruposAndCustomers();
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el grupo." });
    }
  }

  const handleImportSubmit = async (textToImport: string) => {
      if (!textToImport.trim() || !user?.prefix || !cartera) return;
      setIsProcessingImport(true);
      try {
        const result = await importGruposAndCustomersFromPaste({
            carteraId: cartera.id,
            plazaId: cartera.plazaId,
            prefix: user.prefix,
            pasteData: textToImport,
            mode: importMode,
        });

        toast({
            title: "Importación Completa",
            description: `Se crearon ${result.newGroups} grupos nuevos y se importaron ${result.totalCustomers} clientes.`,
        });

        await fetchGruposAndCustomers();
        setImportModalOpen(false);
        setImportText('');

      } catch (error) {
        toast({ variant: "destructive", title: "Error de Importación", description: `Ocurrió un error: ${error instanceof Error ? error.message : 'Error desconocido'}` });
      } finally {
          setIsProcessingImport(false);
      }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = e.target?.result;
        if (!data) return;
        try {
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const textData = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
            
            // Now we have the text, we can use the existing import logic
            setImportMode('add'); // Reset mode for file import
            handleImportSubmit(textData);

        } catch (error) {
            toast({ variant: "destructive", title: "Error al leer archivo", description: "El archivo no es un formato de Excel válido."})
        }
    };
    reader.onerror = () => {
        toast({ variant: "destructive", title: "Error", description: "No se pudo leer el archivo."})
    }
    reader.readAsArrayBuffer(file);
    
    // Reset file input value to allow re-uploading the same file
    if (event.target) {
      event.target.value = '';
    }
  };
  
  const summary = React.useMemo(() => {
    return allCustomers.reduce((acc, customer) => {
        acc.totalPrestado += customer.loanAmount;
        acc.totalPendiente += customer.dueAmount;
        return acc;
    }, { totalPrestado: 0, totalPendiente: 0});
  }, [allCustomers]);
  
    const exportToExcel = () => {
        if (!cartera) return;

        const header = [
            ["Cartera:", cartera.name],
            ["Plaza:", plazaName],
            ["Responsable:", cartera.responsable],
            [],
            ["Resumen de Cartera"],
            ["Total Prestado", summary.totalPrestado],
            ["Total Pendiente", summary.totalPendiente],
            [],
            ["Detalle de Grupos"]
        ];

        const groupsData = grupos.map(g => ({
            "Nombre del Grupo": g.name,
            "No. de Clientes": g.customerCount
        }));
        
        const worksheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.sheet_add_aoa(worksheet, header, { origin: "A1" });
        XLSX.utils.sheet_add_json(worksheet, groupsData, { origin: "A10", skipHeader: false });

        worksheet["!cols"] = [{ wch: 30 }, { wch: 20 }];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Resumen de Cartera");
        XLSX.writeFile(workbook, `Resumen_Cartera_${cartera.name.replace(/\s/g, '_')}.xlsx`);
    };

    const exportToPDF = () => {
        if (!cartera) return;
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text(`Cartera: ${cartera.name}`, 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Plaza: ${plazaName} | Responsable: ${cartera.responsable}`, 14, 26);
        
        autoTable(doc, {
            body: [
                ['Total Prestado', `$${summary.totalPrestado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`],
                ['Total Pendiente', `$${summary.totalPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`],
            ],
            startY: 32,
            theme: 'plain',
            styles: { fontSize: 11, fontStyle: 'bold' },
        });

        autoTable(doc, {
            head: [['Nombre del Grupo', 'No. de Clientes']],
            body: grupos.map(g => [g.name, g.customerCount]),
            startY: (doc as any).lastAutoTable.finalY + 2,
            headStyles: { fillColor: [41, 128, 185] },
        });

        doc.save(`Resumen_Cartera_${cartera.name.replace(/\s/g, '_')}.pdf`);
    };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando información...</span>
      </div>
    );
  }
  
  if (!cartera) {
     return <div className="text-center">No se encontró la cartera.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cartera: {cartera.name}</h1>
        <p className="text-muted-foreground">
          Gestiona los grupos de clientes de esta cartera. Responsable: <span className="font-medium">{cartera.responsable}</span>
        </p>
      </div>

       <div className="grid gap-4 md:grid-cols-2">
            <StatCard title="Total Prestado" value={summary.totalPrestado} isCurrency />
            <StatCard title="Total Pendiente" value={summary.totalPendiente} isCurrency />
       </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/>Grupos</CardTitle>
                <CardDescription>
                    Organiza tus clientes en diferentes grupos dentro de la cartera.
                </CardDescription>
            </div>
             <div className="flex items-center gap-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".xlsx, .xls, .csv"
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isProcessingImport}>
                    {isProcessingImport ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                    {isProcessingImport ? 'Procesando...' : 'Importar Archivo'}
                </Button>
                <Dialog open={isImportModalOpen} onOpenChange={setImportModalOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline"><ClipboardPaste className="mr-2 h-4 w-4"/> Importar por Texto</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Importar Grupos y Clientes</DialogTitle>
                            <DialogDescriptionComponent>
                                Pega los datos de Excel aquí. La IA identificará clientes y grupos. Si un grupo no existe, se creará automáticamente.
                            </DialogDescriptionComponent>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Modo de Importación</Label>
                                <RadioGroup defaultValue="add" value={importMode} onValueChange={(value) => setImportMode(value as 'add' | 'replace')} className="flex items-center gap-6">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="add" id="r-add" /><Label htmlFor="r-add">Agregar a existentes</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="replace" id="r-replace" /><Label htmlFor="r-replace">Reemplazar grupos importados</Label></div>
                                </RadioGroup>
                            </div>
                            <Label htmlFor="import-textarea">Datos de Clientes y Grupos</Label>
                            <Textarea 
                                id="import-textarea"
                                placeholder="Pega aquí los datos..." 
                                className="min-h-[250px] font-mono text-xs" 
                                value={importText} 
                                onChange={(e) => setImportText(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setImportModalOpen(false)}>Cancelar</Button>
                            <Button onClick={() => handleImportSubmit(importText)} disabled={isProcessingImport}>
                                {isProcessingImport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardPaste className="mr-2 h-4 w-4"/>}
                                {isProcessingImport ? 'Procesando...' : 'Importar'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={exportToExcel}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button>
                <Button variant="outline" onClick={exportToPDF}><FileText className="mr-2 h-4 w-4" /> PDF</Button>
                <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if(!open) setEditingGrupo(null);}}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Agregar Grupo
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingGrupo ? "Editar" : "Agregar"} Grupo</DialogTitle>
                        </DialogHeader>
                        <GrupoForm
                            onSubmit={handleFormSubmit}
                            grupo={editingGrupo}
                        />
                    </DialogContent>
                </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del Grupo</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupos.length > 0 ? (
                  grupos.map((grupo) => (
                    <TableRow key={grupo.id}>
                      <TableCell className="font-medium">{grupo.name}</TableCell>
                      <TableCell>{grupo.customerCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                            <Button asChild size="sm" variant="outline">
                                <Link href={{pathname: `/tools/loan-control/grupo/${grupo.id}`, query: {plazaId, carteraId}}}>
                                    Gestionar Clientes <ArrowRight className="ml-2 h-4 w-4"/>
                                </Link>
                            </Button>
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
                                        <DropdownMenuItem onSelect={() => handleEditClick(grupo)}>
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
                                        Esta acción eliminará el grupo y desvinculará a los clientes asociados. Esta acción no se puede deshacer.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteClick(grupo.id)}>Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No hay grupos registrados para esta cartera.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
