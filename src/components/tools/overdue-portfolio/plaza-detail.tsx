
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
  Mail,
  FilterX,
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
import type { Plaza, Customer, CompanyProfile } from "@/lib/data";
import { getPlazaById } from "@/services/plaza-service";
import { getCustomersByPlaza, addCustomer, deleteCustomersByPlaza, addMultipleCustomers, deleteCustomer, deleteCustomersByPromoter } from "@/services/customer-service";
import { useToast } from "@/hooks/use-toast";
import { CustomerCard } from "@/components/tools/overdue-portfolio/customer-card";
import { CustomerEditDialog } from "@/components/tools/overdue-portfolio/customer-edit-dialog";
import { parseCustomers } from "@/ai/flows/customer-parser-flow";
import { sendSmsAsEmail } from "@/ai/flows/send-sms-as-email-flow";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getCompanyProfileByPrefix } from "@/services/company-profile-service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const StatCard = ({ title, value, icon: Icon, description, isCurrency = false, variant = 'default' }: { title: string; value: number; icon: React.ElementType, description?: string, isCurrency?: boolean, variant?: 'default' | 'destructive' }) => {
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
                    {isCurrency ? `$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}
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
  const { user, hasPermission } = useAuth();
  
  const [companyProfile, setCompanyProfile] = React.useState<CompanyProfile | null>(null);
  const [isImportModalOpen, setImportModalOpen] = React.useState(false);
  const [importText, setImportText] = React.useState('');
  const [importMode, setImportMode] = React.useState<'add' | 'replace'>('add');
  const [isParsing, setIsParsing] = React.useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = React.useState('');
  const [promoterDeleteConfirmationText, setPromoterDeleteConfirmationText] = React.useState('');
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [dialogMode, setDialogMode] = React.useState<'edit' | 'payment'>('edit');
  
  const [selectedGroup, setSelectedGroup] = React.useState<string>("");
  const [selectedPromoter, setSelectedPromoter] = React.useState<string>("");

  const fetchPlazaAndCustomers = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const plazaData = await getPlazaById(plazaId);
      
      if(user?.prefix){
        const profile = await getCompanyProfileByPrefix(user.prefix);
        setCompanyProfile(profile);
      }
      
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
  }, [plazaId, toast, user?.prefix]);

  React.useEffect(() => {
    fetchPlazaAndCustomers();
  }, [fetchPlazaAndCustomers]);

  const handleAddSubmit = async (customerData: Omit<Customer, 'id' | 'plazaId' | 'status' | 'toolContext' | 'prefix'>) => {
    if (!user?.prefix) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo identificar al administrador.'});
      return;
    }
    try {
        const newCustomerData = { ...customerData, plazaId, status: 'Pendiente' as const, prefix: user.prefix, toolContext: 'overdue-portfolio' as const };
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
  
  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
  };
  
  const handleSendSms = async (customer: Customer) => {
    toast({ title: 'Enviando SMS...', description: `Enviando a ${customer.name}.`, variant: 'default' });
    try {
      const result = await sendSmsAsEmail({ customer });
      if (result.success) {
        toast({ variant: 'success', title: 'Éxito', description: result.message });
      } else {
        toast({ variant: 'destructive', title: 'Error al enviar', description: result.message });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error inesperado', description: e.message || 'Ocurrió un error al enviar el SMS.' });
    }
  };


  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      await deleteCustomer(customerToDelete.id);
      toast({ title: "Éxito", description: "Cliente eliminado correctamente." });
      setCustomerToDelete(null);
      await fetchPlazaAndCustomers();
    } catch (error) {
       toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el cliente." });
    }
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

  const handleDeleteByPromoter = async () => {
    if (!selectedPromoter) return;
    try {
        await deleteCustomersByPromoter(plazaId, selectedPromoter);
        toast({ title: "Éxito", description: `Clientes de ${selectedPromoter} eliminados.` });
        await fetchPlazaAndCustomers();
        setSelectedPromoter(""); // Reset filter
        setPromoterDeleteConfirmationText("");
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudieron eliminar los clientes del promotor." });
    }
  }
  
  const handleImport = async () => {
    if (!importText.trim()) {
        toast({ variant: "destructive", title: "Error", description: "El área de texto no puede estar vacía." });
        return;
    }
    if (!user?.prefix) {
        toast({ variant: "destructive", title: "Error", description: "No tienes un prefijo asignado para importar clientes." });
        return;
    }
    setIsParsing(true);
    try {
        const parsedData = await parseCustomers({ inputText: importText });
        if (!parsedData || parsedData.length === 0) {
            toast({ variant: "destructive", title: "Error de IA", description: "El flujo de IA no pudo procesar el texto. Verifica el formato." });
            return;
        }

        const customersToAdd = parsedData.map(c => ({...c, plazaId, status: 'Pendiente' as const, toolContext: 'overdue-portfolio' as const}));
        
        await addMultipleCustomers(customersToAdd, importMode, user.prefix, plazaId);

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
    const dateString = format(new Date(), 'dd/MM/yyyy');
    doc.text(`Clientes de la Plaza: ${plaza?.name}`, 14, 16);
    doc.text(`Fecha de Exportación: ${dateString}`, 14, 22);
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
      startY: 30,
    });
    const fileName = `clientes_${plaza?.name?.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  };

  const exportToExcel = () => {
    const dateString = format(new Date(), 'PPP', { locale: es });
    const dataToExport = sortedCustomers.map(c => ({
      Promotor: c.promoter,
      Grupo: c.groupName,
      Nombre: c.name,
      Dirección: c.address,
      Teléfono: c.phone,
      Aval: c.guarantor,
      'Monto Préstamo': c.loanAmount,
      'Monto Adeudo': c.dueAmount,
      Estado: c.status,
    }));
    
    const worksheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(worksheet, [['Reporte de Clientes']], { origin: 'A1' });
    XLSX.utils.sheet_add_aoa(worksheet, [[`Plaza: ${plaza?.name}`]], { origin: 'A2' });
    XLSX.utils.sheet_add_aoa(worksheet, [[`Fecha de Exportación: ${dateString}`]], { origin: 'A3' });

    XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: 'A5' });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
    const fileName = `clientes_${plaza?.name?.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const filteredCustomers = React.useMemo(() => {
    return customers
      .filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.address.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(customer => !selectedPromoter || customer.promoter === selectedPromoter)
      .filter(customer => !selectedGroup || customer.groupName === selectedGroup);
  }, [customers, searchTerm, selectedPromoter, selectedGroup]);

  const sortedCustomers = React.useMemo(() => {
    // Separate paid from unpaid
    const paid = filteredCustomers.filter(c => c.status === 'Pagado');
    const unpaid = filteredCustomers.filter(c => c.status !== 'Pagado');
    
    // Sort logic: by group, then by name
    const sortFunction = (a: Customer, b: Customer) => {
        const groupA = a.groupName || 'zzzz'; // Put customers without group at the end
        const groupB = b.groupName || 'zzzz';
        if (groupA < groupB) return -1;
        if (groupA > groupB) return 1;
        return a.name.localeCompare(b.name);
    };

    return [
        ...unpaid.sort(sortFunction),
        ...paid.sort(sortFunction)
    ];
  }, [filteredCustomers]);
  
  const summaryStats = React.useMemo(() => {
    const listToSummarize = (searchTerm || selectedPromoter || selectedGroup) ? sortedCustomers : customers;
    
    return listToSummarize.reduce((acc, customer) => {
        acc.totalClients += 1;
        acc.pendingDebt += customer.dueAmount;
        if (customer.dueAmount <= 0) {
            acc.recoveredClients += 1;
        }
        return acc;
    }, { totalClients: 0, recoveredClients: 0, pendingDebt: 0 });
  }, [sortedCustomers, customers, searchTerm, selectedPromoter, selectedGroup]);
  
  const canRegister = hasPermission(plazaId, 'CAN_REGISTER');
  const canImport = hasPermission(plazaId, 'CAN_IMPORT');
  const canExport = hasPermission(plazaId, 'CAN_EXPORT');
  const canDeleteAll = hasPermission(plazaId, 'CAN_DELETE_ALL');

  const promoterColors = React.useMemo(() => {
    const colors = new Map<string, string>();
    const uniquePromoters = [...new Set(customers.map(c => c.promoter).filter(Boolean) as string[])];
    
    uniquePromoters.forEach(name => {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const h = hash % 360;
      colors.set(name, `hsl(${h}, 60%, 80%)`);
    });

    return colors;
  }, [customers]);

   const groupColors = React.useMemo(() => {
    const colors = new Map<string, string>();
    const uniqueGroups = [...new Set(customers.map(c => c.groupName).filter(Boolean) as string[])];
    
    uniqueGroups.forEach(name => {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 7) - hash); // Slightly different hash
      }
      const h = hash % 360;
      colors.set(name, `hsl(${h}, 70%, 85%)`); // Different saturation/lightness
    });

    return colors;
  }, [customers]);
  
  const uniquePromoters = React.useMemo(() => {
    return [...new Set(customers.map(c => c.promoter).filter(Boolean) as string[])].sort();
  }, [customers]);
  
  const uniqueGroups = React.useMemo(() => {
    return [...new Set(customers.map(c => c.groupName).filter(Boolean) as string[])].sort();
  }, [customers]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedPromoter("");
    setSelectedGroup("");
  };


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
  
  const expectedConfirmationText = `${plaza.name} eliminar`;
  const expectedPromoterDeleteText = `ELIMINAR ${selectedPromoter}`;
  
  const generateWhatsAppLink = (customer: Customer) => {
    if (!companyProfile?.whatsappLinkTemplate || !customer.phone) return "";
    let link = companyProfile.whatsappLinkTemplate;
    link = link.replace(/{NOMBRE}/g, encodeURIComponent(customer.name));
    link = link.replace(/{TELEFONO}/g, customer.phone.replace(/\D/g, ''));
    link = link.replace(/{DEBE}/g, encodeURIComponent(customer.dueAmount.toLocaleString('es-MX')));
    return link;
  };


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Plaza: {plaza.name}</h1>
      
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Deuda Pendiente (Filtro)" value={summaryStats.pendingDebt} icon={DollarSign} isCurrency variant="destructive" />
        <StatCard title="Total de Clientes (Filtro)" value={summaryStats.totalClients} icon={Users} />
        <StatCard title="Recuperados (Filtro)" value={summaryStats.recoveredClients} icon={UserCheck} description={`de ${summaryStats.totalClients} clientes`} />
      </div>

      <Card>
        <CardHeader>
           <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div>
              <CardTitle>Clientes de {plaza.name}</CardTitle>
              <CardDescription>{customers.length} cliente(s) en esta plaza.</CardDescription>
            </div>
            
            <div className="flex flex-col md:flex-row gap-2 items-center w-full md:w-auto">
                <div className="flex gap-2 w-full md:w-auto">
                    {canRegister && (
                      <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
                          <DialogTrigger asChild>
                            <Button>
                                  <PlusCircle className="mr-2 h-4 w-4" /> Registrar
                              </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-4xl">
                              <DialogHeader>
                                  <DialogTitle>Registrar Cliente</DialogTitle>
                              </DialogHeader>
                              <CustomerForm
                                  onSubmit={handleAddSubmit}
                              />
                          </DialogContent>
                      </Dialog>
                    )}

                    {canImport && (
                      <Dialog open={isImportModalOpen} onOpenChange={setImportModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Upload className="mr-2 h-4 w-4" /> Importar
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Importar Clientes desde Texto</DialogTitle>
                                <DialogDescriptionComponent>
                                  Pega texto de una hoja de cálculo. Las columnas deben estar separadas por tabulaciones y contener encabezados como: PROMOTOR, GRUPO, FECHA, NOMBRE, etc.
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
                                      <Label htmlFor="r2">Reemplazar todos los clientes</Label>
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
                    )}
                    
                    {(canExport || canDeleteAll) && (
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Más Opciones</DropdownMenuLabel>
                            {canExport && <DropdownMenuSeparator />}
                            {canExport && (
                              <>
                                <DropdownMenuItem onSelect={exportToExcel}>
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    Exportar a Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={exportToPDF}>
                                  <FileText className="mr-2 h-4 w-4" />
                                    Exportar a PDF
                                </DropdownMenuItem>
                              </>
                            )}
                            {canDeleteAll && <DropdownMenuSeparator />}
                            {canDeleteAll && (
                              <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar Todos los Clientes
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                            )}
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
                    )}
                </div>
            </div>
           </div>
        </CardHeader>
        <CardContent>
           <div className="flex flex-col md:flex-row gap-2 mb-6">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar por nombre o dirección..." 
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={selectedPromoter} onValueChange={(value) => setSelectedPromoter(value === 'all' ? '' : value)}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Filtrar por Promotor" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los Promotores</SelectItem>
                        {uniquePromoters.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={selectedGroup} onValueChange={(value) => setSelectedGroup(value === 'all' ? '' : value)}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="Filtrar por Grupo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los Grupos</SelectItem>
                        {uniqueGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Button variant="ghost" onClick={clearFilters}>
                    <FilterX className="mr-2 h-4 w-4" />
                    Limpiar
                </Button>
                {selectedPromoter && (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar {sortedCustomers.length} cliente(s)
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Estás a punto de eliminar a <strong>{sortedCustomers.length}</strong> cliente(s) del promotor <strong>{selectedPromoter}</strong>. Esta acción no se puede deshacer.
                                    Para confirmar, escribe <strong className="text-foreground">{expectedPromoterDeleteText}</strong>.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                             <Input
                              value={promoterDeleteConfirmationText}
                              onChange={(e) => setPromoterDeleteConfirmationText(e.target.value)}
                              placeholder={expectedPromoterDeleteText}
                              autoFocus
                            />
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setPromoterDeleteConfirmationText('')}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDeleteByPromoter}
                                    disabled={promoterDeleteConfirmationText !== expectedPromoterDeleteText}
                                    className="bg-destructive hover:bg-destructive/90"
                                >
                                    Sí, eliminar clientes
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
          <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedCustomers.map(customer => (
                <CustomerCard 
                  key={customer.id} 
                  customer={customer} 
                  onEdit={handleEditClick} 
                  onPayment={handlePaymentClick} 
                  onDelete={handleDeleteClick}
                  onSendSms={handleSendSms}
                  promoterColor={customer.promoter ? promoterColors.get(customer.promoter) : undefined}
                  groupColor={customer.groupName ? groupColors.get(customer.groupName) : undefined}
                  whatsappLink={generateWhatsAppLink(customer)}
                />
              ))}
            </div>
             <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmas la eliminación?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminará permanentemente al cliente: <strong className="text-foreground">{customerToDelete?.name}</strong>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteCustomer}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {sortedCustomers.length === 0 && (
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

    