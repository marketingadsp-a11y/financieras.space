
"use client";

import * as React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  DollarSign,
  Users,
  UserCheck,
  Search,
  PlusCircle,
  Upload,
  Trash2,
  MoreHorizontal,
  FileText,
  FileSpreadsheet,
  Loader2,
  ClipboardPaste,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription as DialogDescriptionComponent,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CustomerForm } from "@/components/tools/overdue-portfolio/customer-form";
import type { Plaza, Customer } from "@/lib/data";
import { getPlazaById } from "@/services/plaza-service";
import { getCustomersByPlaza, addCustomer, deleteCustomersByPlaza, addMultipleCustomers } from "@/services/customer-service";
import { useToast } from "@/hooks/use-toast";
import { CustomerCard } from "@/components/tools/overdue-portfolio/customer-card";
import { CustomerEditDialog } from "@/components/tools/overdue-portfolio/customer-edit-dialog";
import { parseCustomers } from "@/ai/flows/customer-parser-flow";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";


const StatCard = ({ title, value, icon: Icon, description, isCurrency = false, variant = 'default' }) => {
    const cardClasses = {
        default: "bg-card text-card-foreground",
        destructive: "bg-destructive/90 text-destructive-foreground",
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
                <div className="text-2xl font-bold">
                    {isCurrency ? `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}
                </div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );
};

export function PlazaDetail({ plazaId }: { plazaId: string }) {
  const [plaza, setPlaza] = React.useState<Plaza | null>(null);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAddFormOpen, setIsAddFormOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const { toast } = useToast();

  const [isImportModalOpen, setImportModalOpen] = React.useState(false);
  const [importText, setImportText] = React.useState('');
  const [importMode, setImportMode] = React.useState<'add' | 'replace'>('add');
  const [isParsing, setIsParsing] = React.useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = React.useState('');
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [dialogMode, setDialogMode] = React.useState<'edit' | 'payment'>('edit');


  const fetchPlazaAndCustomers = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const plazaData = await getPlazaById(plazaId);
      if (plazaData) {
        setPlaza(plazaData);
        const customerData = await getCustomersByPlaza(plazaId);
        setCustomers(customerData);
      } else {
        toast({ variant: "destructive", title: "Error", description: "No se encontró la plaza especificada." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información." });
    } finally {
      setIsLoading(false);
    }
  }, [plazaId, toast]);

  React.useEffect(() => {
    fetchPlazaAndCustomers();
  }, [fetchPlazaAndCustomers]);

  const handleAddSubmit = async (customerData: Omit<Customer, 'id' | 'plazaId' | 'status'>) => {
    try {
        const newCustomerData = { ...customerData, plazaId, status: 'Pendiente' as const };
        await addCustomer(newCustomerData);
        toast({ title: "Éxito", description: "Cliente agregado correctamente." });
        await fetchPlazaAndCustomers();
        setIsAddFormOpen(false);
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el cliente." });
    }
  };
  
  const handleEditClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDialogMode('edit');
  };
  
  const handlePaymentClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDialogMode('payment');
  };

  const closeDialog = () => {
    setSelectedCustomer(null);
  }

  const handleDeleteAllCustomers = async () => {
    try {
      await deleteCustomersByPlaza(plazaId);
      toast({ title: "Éxito", description: "Todos los clientes de la plaza han sido eliminados." });
      await fetchPlazaAndCustomers();
      setDeleteConfirmationText("");
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron eliminar los clientes." });
    }
  };
  
  const handleImport = async () => {
    if (!importText.trim()) {
        toast({ variant: "destructive", title: "Error", description: "El área de texto no puede estar vacía." });
        return;
    }
    setIsParsing(true);
    try {
        const parsedData = await parseCustomers({ inputText: importText });
        if (!parsedData || parsedData.length === 0) {
            toast({ variant: "destructive", title: "Error de IA", description: "La IA no pudo procesar el texto. Verifica el formato." });
            return;
        }

        const customersToAdd = parsedData.map(c => ({...c, plazaId, status: 'Pendiente' as const}));
        
        await addMultipleCustomers(customersToAdd, plazaId, importMode);

        toast({ title: "Éxito", description: `${customersToAdd.length} clientes importados correctamente.` });
        await fetchPlazaAndCustomers();
        setImportModalOpen(false);
        setImportText('');

    } catch (error) {
        toast({ variant: "destructive", title: "Error de Importación", description: "Ocurrió un error al importar los clientes." });
        console.error(error);
    } finally {
        setIsParsing(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Clientes de la Plaza: ${plaza?.name}`, 14, 16);
    autoTable(doc, {
      head: [['Nombre', 'Dirección', 'Teléfono', 'Aval', 'Préstamo', 'Adeudo']],
      body: sortedCustomers.map(c => [
        c.name,
        c.address,
        c.phone,
        c.guarantor,
        `$${c.loanAmount.toLocaleString('es-MX')}`,
        `$${c.dueAmount.toLocaleString('es-MX')}`
      ]),
      startY: 20,
    });
    doc.save(`clientes_${plaza?.name?.replace(/\s/g, '_')}.pdf`);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(sortedCustomers.map(c => ({
      Nombre: c.name,
      Dirección: c.address,
      Teléfono: c.phone,
      Aval: c.guarantor,
      'Monto Préstamo': c.loanAmount,
      'Monto Adeudo': c.dueAmount,
      Estado: c.status,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
    XLSX.writeFile(workbook, `clientes_${plaza?.name?.replace(/\s/g, '_')}.xlsx`);
  };


  const sortedCustomers = React.useMemo(() => {
    const filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Separate paid from unpaid
    const paid = filtered.filter(c => c.status === 'Pagado');
    const unpaid = filtered.filter(c => c.status !== 'Pagado');

    // Sort unpaid by name, then append paid sorted by name
    return [
        ...unpaid.sort((a, b) => a.name.localeCompare(b.name)),
        ...paid.sort((a, b) => a.name.localeCompare(b.name))
    ];
  }, [customers, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando información de la plaza...</span>
      </div>
    );
  }

  if (!plaza) {
    return <div className="text-center">No se pudo cargar la información de la plaza.</div>;
  }
  
  const totalClients = customers.length;
  const recoveredClients = customers.filter(c => c.status === 'Pagado').length;
  const pendingDebt = customers.reduce((acc, c) => c.dueAmount > 0 ? acc + c.dueAmount : acc, 0);
  const expectedConfirmationText = `${plaza.name} eliminar`;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Plaza: {plaza.name}</h1>
      
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Deuda Pendiente" value={pendingDebt} icon={DollarSign} isCurrency variant="destructive" />
        <StatCard title="Total de Clientes" value={totalClients} icon={Users} />
        <StatCard title="Recuperados" value={recoveredClients} icon={UserCheck} description={`de ${totalClients} clientes`} />
      </div>

      <Card>
        <CardHeader>
           <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div>
              <CardTitle>Clientes de {plaza.name}</CardTitle>
              <CardDescription>{totalClients} cliente(s) en esta plaza.</CardDescription>
            </div>
            
            <div className="flex flex-col md:flex-row gap-2 items-center w-full md:w-auto">
                <div className="relative w-full md:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar cliente..." 
                      className="pl-9 w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
                        <DialogTrigger asChild>
                           <Button>
                                <PlusCircle className="mr-2 h-4 w-4" /> Registrar
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Registrar Cliente</DialogTitle>
                            </DialogHeader>
                            <CustomerForm
                                onSubmit={handleAddSubmit}
                            />
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isImportModalOpen} onOpenChange={setImportModalOpen}>
                      <DialogTrigger asChild>
                          <Button variant="outline">
                              <Upload className="mr-2 h-4 w-4" /> Importar
                          </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-2xl">
                          <DialogHeader>
                              <DialogTitle>Importar Clientes</DialogTitle>
                              <DialogDescriptionComponent>
                                Pega texto de una hoja de cálculo para añadir nuevos clientes. Las columnas deben estar separadas por tabulaciones.
                                La IA intentará reconocer las columnas comunes como: FECHA, NOMBRE, DIRECCION, TELEFONO, AVAL, PRESTAMO, ADEUDO.
                              </DialogDescriptionComponent>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label>Modo de Importación</Label>
                                 <RadioGroup defaultValue="add" value={importMode} onValueChange={(value) => setImportMode(value as any)}>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="add" id="r1" />
                                    <Label htmlFor="r1">Añadir a existentes</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="replace" id="r2" />
                                    <Label htmlFor="r2">Reemplazar todos los clientes de esta plaza</Label>
                                  </div>
                                </RadioGroup>
                              </div>
                              <Textarea 
                                placeholder="Pega aquí los datos de tu hoja de cálculo..." 
                                className="min-h-[200px]"
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                              />
                          </div>
                          <DialogFooter>
                              <Button variant="outline" onClick={() => setImportModalOpen(false)}>Cancelar</Button>
                              <Button onClick={handleImport} disabled={isParsing}>
                                  {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardPaste className="mr-2 h-4 w-4"/>}
                                  {isParsing ? 'Procesando...' : 'Importar desde Texto'}
                              </Button>
                          </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                           </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuLabel>Más Opciones</DropdownMenuLabel>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem onSelect={exportToExcel}>
                              <FileSpreadsheet className="mr-2 h-4 w-4" />
                              Exportar a Excel
                           </DropdownMenuItem>
                           <DropdownMenuItem onSelect={exportToPDF}>
                             <FileText className="mr-2 h-4 w-4" />
                              Exportar a PDF
                           </DropdownMenuItem>
                            <DropdownMenuSeparator />
                           <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar Todos los Clientes
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción es irreversible y eliminará permanentemente a todos los <strong>{customers.length}</strong> clientes de la plaza <strong>'{plaza.name}'</strong>.
                              Para confirmar, escribe <strong className="text-foreground">{expectedConfirmationText}</strong> a continuación.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <Input
                            id="delete-confirm"
                            value={deleteConfirmationText}
                            onChange={(e) => setDeleteConfirmationText(e.target.value)}
                            placeholder={expectedConfirmationText}
                            autoComplete="off"
                            autoFocus
                           />
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeleteConfirmationText('')}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleDeleteAllCustomers} 
                              disabled={deleteConfirmationText !== expectedConfirmationText}
                              className="bg-destructive hover:bg-destructive/90">
                              Sí, eliminar todo
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
           </div>
        </CardHeader>
        <CardContent>
          {sortedCustomers.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedCustomers.map(customer => (
                <CustomerCard key={customer.id} customer={customer} onEdit={handleEditClick} onPayment={handlePaymentClick} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p>No se encontraron clientes.</p>
              {customers.length === 0 && <p className="text-sm mt-2">Puedes registrar uno nuevo o importarlos masivamente.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerEditDialog
        customer={selectedCustomer}
        isOpen={!!selectedCustomer}
        onClose={closeDialog}
        onSuccess={fetchPlazaAndCustomers}
        mode={dialogMode}
      />
    </div>
  );
}
