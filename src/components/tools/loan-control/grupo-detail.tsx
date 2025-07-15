
"use client";

import * as React from "react";
import { getAssignedCustomersByGrupo, getGrupoById, updateCustomer, addPayment } from "@/services/loan-control-service";
import type { Customer, LoanControlGrupo } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, Users, Pencil, Phone, Home, Calendar, User, FileText, FileSpreadsheet, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { CustomerEditDialog } from "@/components/tools/overdue-portfolio/customer-edit-dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";

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

const CustomerInfoCard = ({ customer, onEdit, onPayment }: { customer: Customer; onEdit: (c: Customer) => void; onPayment: (c: Customer) => void; }) => {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{customer.name}</CardTitle>
                     <Badge variant={customer.dueAmount > 0 ? "destructive" : "secondary"}>
                        {customer.dueAmount > 0 ? "Pendiente" : "Pagado"}
                    </Badge>
                </div>
                <CardDescription className="flex items-center gap-2 pt-1">
                    <Home className="h-4 w-4"/> {customer.address}, {customer.colonia}, C.P. {customer.cp}
                </CardDescription>
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4"/> {customer.phone}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-2">Información del Aval</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                         <p className="flex items-center gap-2"><User className="h-4 w-4"/> <strong>Nombre:</strong> {customer.guarantor || 'N/A'}</p>
                         <p className="flex items-center gap-2"><Home className="h-4 w-4"/> <strong>Dirección:</strong> {customer.direccionAval || 'N/A'}, {customer.coloniaAval}, C.P. {customer.cpAval}</p>
                         <p className="flex items-center gap-2"><Phone className="h-4 w-4"/> <strong>Teléfono:</strong> {customer.guarantorPhone || 'N/A'}</p>
                    </div>
                </div>
                <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-2">Información del Préstamo</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Fecha Préstamo</p>
                                <p className="font-medium">{customer.fechaPrestamo ? format(new Date(customer.fechaPrestamo), "PPP", { locale: es }) : 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Monto Préstamo</p>
                                <p className="font-medium">${customer.loanAmount.toLocaleString('es-MX')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                             <DollarSign className="h-4 w-4 text-destructive" />
                            <div>
                                <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
                                <p className="font-bold text-lg text-destructive">${customer.dueAmount.toLocaleString('es-MX')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex gap-2">
                <Button variant="outline" className="w-full" onClick={() => onEdit(customer)}><Pencil className="mr-2"/>Editar</Button>
                <Button className="w-full" onClick={() => onPayment(customer)} disabled={customer.dueAmount <= 0}><DollarSign className="mr-2"/>Abonar</Button>
            </CardFooter>
        </Card>
    )
}

export function GrupoDetail({ grupoId }: { grupoId: string }) {
    const { toast } = useToast();
    const [grupo, setGrupo] = React.useState<LoanControlGrupo | null>(null);
    const [customers, setCustomers] = React.useState<Customer[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
    const [dialogMode, setDialogMode] = React.useState<'edit' | 'payment'>('edit');
    const [searchTerm, setSearchTerm] = React.useState("");

    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const [grupoData, customersData] = await Promise.all([
                getGrupoById(grupoId),
                getAssignedCustomersByGrupo(grupoId)
            ]);
            setGrupo(grupoData);
            setCustomers(customersData);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información del grupo." });
        } finally {
            setIsLoading(false);
        }
    }, [grupoId, toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenDialog = (customer: Customer, mode: 'edit' | 'payment') => {
        setSelectedCustomer(customer);
        setDialogMode(mode);
    };
    
    const handleCloseDialog = () => {
        setSelectedCustomer(null);
    };
    
    const handleSuccess = () => {
        fetchData(); // Refresh data on success
    };
    
    const exportToPDF = () => {
        if (!grupo || filteredCustomers.length === 0) return;
        const doc = new jsPDF();
        doc.text(`Resumen del Grupo: ${grupo.name}`, 14, 16);
        doc.text(`Total Prestado: $${summary.totalLoaned.toLocaleString('es-MX')}`, 14, 22);
        doc.text(`Total Pendiente: $${summary.totalDue.toLocaleString('es-MX')}`, 14, 28);

        autoTable(doc, {
            startY: 35,
            head: [['Nombre', 'Dirección', 'Teléfono', 'Aval', 'Préstamo', 'Saldo']],
            body: filteredCustomers.map(c => [
                c.name,
                c.address,
                c.phone,
                c.guarantor,
                `$${c.loanAmount.toLocaleString('es-MX')}`,
                `$${c.dueAmount.toLocaleString('es-MX')}`
            ]),
        });
        doc.save(`Resumen_Grupo_${grupo.name.replace(/\s/g, '_')}.pdf`);
    };

    const exportToExcel = () => {
        if (!grupo || filteredCustomers.length === 0) return;
        const dataToExport = filteredCustomers.map(c => ({
            'Nombre': c.name,
            'Dirección': c.address,
            'Colonia': c.colonia,
            'CP': c.cp,
            'Teléfono': c.phone,
            'Aval': c.guarantor,
            'Dirección Aval': c.direccionAval,
            'Colonia Aval': c.coloniaAval,
            'CP Aval': c.cpAval,
            'Teléfono Aval': c.guarantorPhone,
            'Fecha Préstamo': c.fechaPrestamo ? format(new Date(c.fechaPrestamo), 'yyyy-MM-dd') : 'N/A',
            'Monto Prestado': c.loanAmount,
            'Saldo Pendiente': c.dueAmount
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
        XLSX.writeFile(workbook, `Resumen_Grupo_${grupo.name.replace(/\s/g, '_')}.xlsx`);
    };

    const summary = React.useMemo(() => {
        return customers.reduce((acc, customer) => {
            acc.totalLoaned += customer.loanAmount;
            acc.totalDue += customer.dueAmount;
            return acc;
        }, { totalLoaned: 0, totalDue: 0 });
    }, [customers]);
    
    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span>Cargando clientes del grupo...</span>
            </div>
        );
    }

    if (!grupo) {
        return <p>Grupo no encontrado.</p>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Panel del Grupo: {grupo.name}</h1>
                    <p className="text-muted-foreground">
                        Resumen financiero y listado de clientes de este grupo.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                     <Button variant="outline" onClick={exportToExcel} disabled={filteredCustomers.length === 0}><FileSpreadsheet className="mr-2"/>Exportar Excel</Button>
                     <Button variant="outline" onClick={exportToPDF} disabled={filteredCustomers.length === 0}><FileText className="mr-2"/>Exportar PDF</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard title="Total Prestado" value={summary.totalLoaned} />
                <StatCard title="Total Pendiente" value={summary.totalDue} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Clientes del Grupo ({filteredCustomers.length})</CardTitle>
                    <CardDescription>
                        Visualiza y gestiona los clientes asignados a este grupo.
                    </CardDescription>
                     <Input
                        placeholder="Buscar cliente por nombre o dirección..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm mt-2"
                    />
                </CardHeader>
                <CardContent>
                    {filteredCustomers.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredCustomers.map(customer => (
                                <CustomerInfoCard 
                                    key={customer.id} 
                                    customer={customer} 
                                    onEdit={(c) => handleOpenDialog(c, 'edit')} 
                                    onPayment={(c) => handleOpenDialog(c, 'payment')} 
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <Users className="mx-auto h-12 w-12" />
                            <h3 className="mt-4 text-lg font-semibold">No se encontraron clientes</h3>
                            <p className="mt-1 text-sm">
                                {searchTerm ? "Prueba con otro término de búsqueda." : "No hay clientes asignados a este grupo."}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <CustomerEditDialog
                isOpen={!!selectedCustomer}
                customer={selectedCustomer}
                mode={dialogMode}
                onClose={handleCloseDialog}
                onSuccess={handleSuccess}
            />
        </div>
    );
}

    