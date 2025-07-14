
"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { Loader2, Users, PlusCircle, User, Phone, MapPin, Hash, Calendar as CalendarIcon, DollarSign, ClipboardPaste, Trash2, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { getGrupoById, getCarteraById } from "@/services/loan-control-service";
import { getPlazaById } from "@/services/plaza-service";
import { getCustomersByLoanControlGroup, addCustomer, addMultipleCustomers, deleteCustomersByGroupId } from "@/services/customer-service";
import type { LoanControlGrupo, Customer, LoanControlCartera, Plaza } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogFooter } from "@/components/ui/dialog";
import { CustomerForm } from "@/components/tools/overdue-portfolio/customer-form";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";
import { format, addMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";


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

const CustomerInfoCard = ({ customer }: { customer: Customer }) => {
    
    const displayDate = customer.fechaPrestamo 
        ? addMinutes(new Date(customer.fechaPrestamo), new Date(customer.fechaPrestamo).getTimezoneOffset())
        : null;

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle>{customer.name}</CardTitle>
                    <Badge variant={customer.status === 'Pagado' ? 'secondary' : 'destructive'}>{customer.status}</Badge>
                </div>
                <CardDescription className="flex items-center gap-2 pt-1">
                    <MapPin className="h-4 w-4"/> {customer.address}, {customer.colonia}, {customer.cp}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <h4 className="font-semibold">Información del Cliente</h4>
                        <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/> <span>{customer.phone}</span></div>
                    </div>
                     <div className="space-y-2">
                        <h4 className="font-semibold">Información del Préstamo</h4>
                        <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-muted-foreground"/> <span>{displayDate ? format(displayDate, 'PPP', {locale: es}) : 'N/A'}</span></div>
                        <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground"/> <span>Préstamo: ${customer.loanAmount.toLocaleString()}</span></div>
                        <div className="flex items-center gap-2 font-bold text-destructive"><DollarSign className="h-4 w-4"/> <span>Saldo: ${customer.dueAmount.toLocaleString()}</span></div>
                    </div>
                </div>
                 <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="border-t">
                        <AccordionTrigger>Información del Aval</AccordionTrigger>
                        <AccordionContent>
                           <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2">
                                    <h4 className="font-semibold">Datos del Aval</h4>
                                    <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground"/> <span>{customer.guarantor || 'N/A'}</span></div>
                                    <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/> <span>{customer.guarantorPhone || 'N/A'}</span></div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-semibold">Dirección del Aval</h4>
                                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground"/> <span>{customer.direccionAval || 'N/A'}</span></div>
                                    <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground"/> <span>{customer.coloniaAval}, {customer.cpAval}</span></div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
            <CardFooter>
                <Button variant="outline" className="w-full">Administrar Cliente</Button>
            </CardFooter>
        </Card>
    )
}

export function LoanControlGrupoDetail({ grupoId, plazaId, carteraId }: { grupoId: string, plazaId: string, carteraId: string }) {
  const { user } = useAuth();
  const [grupo, setGrupo] = React.useState<LoanControlGrupo | null>(null);
  const [cartera, setCartera] = React.useState<LoanControlCartera | null>(null);
  const [plaza, setPlaza] = React.useState<Plaza | null>(null);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAddFormOpen, setIsAddFormOpen] = React.useState(false);
  const [isImportModalOpen, setImportModalOpen] = React.useState(false);
  const [isParsing, setIsParsing] = React.useState(false);
  const [importText, setImportText] = React.useState('');
  const [importMode, setImportMode] = React.useState<'add' | 'replace'>('add');
  const [deleteConfirmationText, setDeleteConfirmationText] = React.useState('');
  const { toast } = useToast();
  
  const [startDate, setStartDate] = React.useState<Date | undefined>();
  const [endDate, setEndDate] = React.useState<Date | undefined>();

  const fetchGrupoData = React.useCallback(async () => {
      try {
        setIsLoading(true);
        const [grupoData, customersData, carteraData, plazaData] = await Promise.all([
          getGrupoById(grupoId),
          getCustomersByLoanControlGroup(grupoId),
          getCarteraById(carteraId),
          getPlazaById(plazaId)
        ]);
        setGrupo(grupoData);
        setCustomers(customersData);
        setCartera(carteraData);
        setPlaza(plazaData);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información del grupo." });
      } finally {
        setIsLoading(false);
      }
  }, [grupoId, carteraId, plazaId, toast]);

  React.useEffect(() => {
    fetchGrupoData();
  }, [fetchGrupoData]);

  const handleAddFormSubmit = async (values: Omit<Customer, 'id' | 'plazaId' | 'status' | 'loanControlGroupId' | 'prefix'>) => {
    if (!user?.prefix) return;
    try {
        await addCustomer({
            ...values,
            plazaId,
            prefix: user.prefix,
            loanControlGroupId: grupoId,
            status: 'Pendiente',
            fechaPrestamo: values.fechaPrestamo ? new Date(values.fechaPrestamo) : new Date(),
        });
        toast({ title: "Éxito", description: "Cliente agregado al grupo." });
        setIsAddFormOpen(false);
        await fetchGrupoData();
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo agregar el cliente." });
    }
  };

  const handleImportSubmit = async () => {
    if (!importText.trim() || !user?.prefix) {
        toast({ variant: "destructive", title: "Error", description: "El área de texto no puede estar vacía y debe tener un prefijo de usuario." });
        return;
    }
    setIsParsing(true);
    try {
        const parsedData = await parseCustomers({ inputText: importText });
        if (!parsedData || parsedData.length === 0) {
            toast({ variant: "destructive", title: "Error de IA", description: "La IA no pudo procesar el texto. Verifica el formato." });
            return;
        }

        const customersToAdd = parsedData.map(c => ({...c, plazaId, loanControlGroupId: grupoId, status: 'Pendiente' as const}));
        
        await addMultipleCustomers(customersToAdd, plazaId, importMode, user.prefix, grupoId);

        toast({ title: "Éxito", description: `${customersToAdd.length} clientes importados a '${grupo?.name}' correctamente.` });
        await fetchGrupoData();
        setImportModalOpen(false);
        setImportText('');

    } catch (error) {
        toast({ variant: "destructive", title: "Error de Importación", description: "Ocurrió un error al importar los clientes." });
    } finally {
        setIsParsing(false);
    }
  };
  
  const handleDeleteAllCustomers = async () => {
    try {
      await deleteCustomersByGroupId(grupoId);
      toast({ title: "Éxito", description: "Todos los clientes de este grupo han sido eliminados." });
      await fetchGrupoData();
      setDeleteConfirmationText("");
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron eliminar los clientes del grupo." });
    }
  };
  
  const filteredCustomers = React.useMemo(() => {
    return customers.filter(customer => {
        if (!startDate && !endDate) return true;
        if (!customer.fechaPrestamo) return false;
        
        const customerDate = new Date(customer.fechaPrestamo);

        if (startDate && customerDate < startDate) {
            return false;
        }
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            if (customerDate > endOfDay) {
                return false;
            }
        }
        
        return true;
    });
  }, [customers, startDate, endDate]);

  const summary = React.useMemo(() => {
    return filteredCustomers.reduce((acc, customer) => {
        acc.totalPrestado += customer.loanAmount;
        acc.totalPendiente += customer.dueAmount;
        return acc;
    }, { totalPrestado: 0, totalPendiente: 0});
  }, [filteredCustomers]);
  
    const exportToExcel = () => {
        if (!grupo || !cartera || !plaza) {
            toast({ variant: "destructive", title: "Error", description: "Faltan datos para exportar." });
            return;
        }

        const header = [
            ["Grupo:", grupo.name],
            ["Cartera:", cartera.name],
            ["Plaza:", plaza.name],
            [], // Empty row for spacing
            ["Resumen del Grupo"],
            ["Total Prestado", summary.totalPrestado],
            ["Total Pendiente", summary.totalPendiente],
            [], // Empty row
            ["Detalle de Clientes"]
        ];

        const customersData = filteredCustomers.map(c => ({
            "Nombre": c.name,
            "Dirección": c.address,
            "Colonia": c.colonia,
            "CP": c.cp,
            "Teléfono": c.phone,
            "Aval": c.guarantor,
            "Teléfono Aval": c.guarantorPhone,
            "Dirección Aval": c.direccionAval,
            "Colonia Aval": c.coloniaAval,
            "CP Aval": c.cpAval,
            "Fecha Préstamo": c.fechaPrestamo ? format(addMinutes(new Date(c.fechaPrestamo), new Date(c.fechaPrestamo).getTimezoneOffset()), 'dd/MM/yyyy') : 'N/A',
            "Monto Préstamo": c.loanAmount,
            "Saldo": c.dueAmount,
            "Estado": c.status,
        }));
        
        const worksheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.sheet_add_aoa(worksheet, header, { origin: "A1" });
        XLSX.utils.sheet_add_json(worksheet, customersData, { origin: "A10", skipHeader: false });

        // Formatting columns
        worksheet["!cols"] = [
            { wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 8 }, { wch: 15 }, 
            { wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 8 }, 
            { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte de Grupo");

        XLSX.writeFile(workbook, `Reporte_Grupo_${grupo.name.replace(/\s/g, '_')}.xlsx`);
    };

  const expectedConfirmationText = `${grupo?.name} eliminar`;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando información del grupo...</span>
      </div>
    );
  }
  
  if (!grupo) {
     return <div className="text-center">No se encontró el grupo.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Grupo: {grupo.name}</h1>
        <p className="text-muted-foreground">
          Visualiza el resumen y el listado de clientes de este grupo.
        </p>
      </div>
      
       <div className="grid gap-4 md:grid-cols-2">
            <StatCard title="Total Prestado" value={summary.totalPrestado} isCurrency />
            <StatCard title="Total Pendiente" value={summary.totalPendiente} isCurrency />
       </div>

        <div className="flex flex-col md:flex-row gap-4 items-center p-4 border rounded-lg bg-card">
            <h4 className="font-medium text-sm whitespace-nowrap">Filtrar por Fecha de Préstamo:</h4>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
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
            </div>
        </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/>Clientes del Grupo</CardTitle>
                <CardDescription>
                    {filteredCustomers.length} cliente(s) en este grupo.
                </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
                <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Agregar Cliente
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Agregar Cliente a {grupo.name}</DialogTitle>
                        </DialogHeader>
                        <CustomerForm
                            onSubmit={handleAddFormSubmit}
                        />
                    </DialogContent>
                </Dialog>
                 <Dialog open={isImportModalOpen} onOpenChange={setImportModalOpen}>
                    <DialogTrigger asChild><Button variant="outline"><ClipboardPaste className="mr-2 h-4 w-4"/> Importar</Button></DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Importar Clientes a: {grupo.name}</DialogTitle>
                            <DialogDescriptionComponent>
                                Pega texto de una hoja de cálculo para añadir nuevos clientes. Las columnas deben estar separadas por tabulaciones.
                            </DialogDescriptionComponent>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Modo de Importación</Label>
                                <RadioGroup defaultValue="add" value={importMode} onValueChange={(value) => setImportMode(value as any)} className="flex items-center gap-6">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="add" id="r1" /><Label htmlFor="r1">Añadir a existentes</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="replace" id="r2" /><Label htmlFor="r2">Reemplazar clientes del grupo</Label></div>
                                </RadioGroup>
                            </div>
                            <Textarea placeholder="Pega aquí los datos..." className="min-h-[200px]" value={importText} onChange={(e) => setImportText(e.target.value)} />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setImportModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleImportSubmit} disabled={isParsing}>
                                {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardPaste className="mr-2 h-4 w-4"/>}
                                {isParsing ? 'Procesando...' : 'Importar'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={exportToExcel}><FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel</Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="mr-2 h-4 w-4"/> Limpiar Grupo</Button></AlertDialogTrigger>
                     <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción eliminará permanentemente a <strong>todos los {customers.length} clientes</strong> de este grupo. Para confirmar, escribe <strong className="text-foreground">{expectedConfirmationText}</strong>.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Input value={deleteConfirmationText} onChange={(e) => setDeleteConfirmationText(e.target.value)} placeholder={expectedConfirmationText} />
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeleteConfirmationText('')}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteAllCustomers} disabled={deleteConfirmationText !== expectedConfirmationText} className="bg-destructive hover:bg-destructive/90">
                                Sí, eliminar todo
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCustomers.length > 0 ? (
                filteredCustomers.map(customer => <CustomerInfoCard key={customer.id} customer={customer} />)
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    No hay clientes que coincidan con los filtros seleccionados.
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
