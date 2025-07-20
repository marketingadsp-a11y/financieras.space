
"use client";

import * as React from "react";
import Link from "next/link";
import { getAssignedCustomersByGrupo, getGrupoById, getCarteraById, addGrupo, updateGrupo, deleteGrupo } from "@/services/loan-control-service";
import { addMultipleCustomers } from "@/services/customer-service";
import type { Customer, LoanControlGrupo, LoanControlCartera, Plaza } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, Users, Pencil, Phone, Home, Calendar, User, FileText, FileSpreadsheet, Download, ClipboardPaste, CalendarIcon as CalendarIconLucide, FilterX, BadgeInfo, LayoutGrid, Building, Folders, Edit, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDescriptionComponent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { parseCustomers } from "@/ai/flows/customer-parser-flow";
import { useAuth } from "@/context/auth-context";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { getPlazaById } from "@/services/plaza-service";
import { usePathname } from "next/navigation";
import { GrupoForm } from "./grupo-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent } from "@/components/ui/alert-dialog";


const NavPanel = ({ plazaId }: { plazaId: string }) => {
    const pathname = usePathname();
    const basePath = `/tools/loan-control`;
    
    const navItems = [
        { href: basePath, label: 'Control General', icon: LayoutGrid, active: pathname === basePath },
        { href: `${basePath}/plaza/${plazaId}`, label: 'Gestionar Plazas', icon: Building, active: pathname.startsWith(`${basePath}/plaza`) },
        { href: `${basePath}/plaza/${plazaId}/grupos`, label: 'Gestionar Grupos', icon: Users, active: pathname.startsWith(`${basePath}/plaza`) && pathname.endsWith('grupos') },
    ];

    return (
        <Card>
            <CardContent className="p-2">
                <div className="flex flex-wrap items-center justify-center gap-2">
                    {navItems.map(item => (
                         <Button key={item.label} variant={item.active ? 'default' : 'ghost'} asChild className="flex-1 min-w-[150px] transition-all duration-200">
                             <Link href={item.href}>
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.label}
                            </Link>
                         </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

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
        <Card className="flex flex-col group transition-all hover:shadow-lg hover:-translate-y-1">
            <CardHeader className="flex-row gap-4 items-start">
                 <div className="p-3 bg-primary/10 rounded-lg mt-1">
                    <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{customer.name}</CardTitle>
                        <Badge variant={customer.dueAmount > 0 ? "destructive" : "secondary"} className="ml-2 shrink-0">
                            {customer.dueAmount > 0 ? "Pendiente" : "Pagado"}
                        </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground pt-2">
                        <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0"/> {customer.phone || 'N/A'}</p>
                        <p className="flex items-start gap-2"><Home className="h-4 w-4 mt-0.5 shrink-0"/> <span>{customer.address}, {customer.colonia}, C.P. {customer.cp}</span></p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                 <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-muted-foreground"><BadgeInfo className="h-4 w-4"/>Información del Préstamo</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="flex items-center gap-2 col-span-2">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Fecha Préstamo</p>
                                <p className="font-medium">{customer.fechaPrestamo ? format(new Date(customer.fechaPrestamo), "PPP", { locale: es }) : 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Monto Préstamo</p>
                                <p className="font-medium">${(customer.loanAmount || 0).toLocaleString('es-MX')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <DollarSign className="h-4 w-4 text-destructive shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
                                <p className="font-bold text-lg text-destructive">${(customer.dueAmount || 0).toLocaleString('es-MX')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex gap-2 border-t pt-4">
                <Button variant="outline" className="w-full" onClick={() => onEdit(customer)}><Pencil className="mr-2"/>Editar</Button>
                <Button className="w-full" onClick={() => onPayment(customer)} disabled={customer.dueAmount <= 0}><DollarSign className="mr-2"/>Abonar</Button>
            </CardFooter>
        </Card>
    )
}

export function CarteraDetail({ carteraId }: { carteraId: string }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [cartera, setCartera] = React.useState<LoanControlCartera | null>(null);
    const [plaza, setPlaza] = React.useState<Plaza | null>(null);
    const [grupos, setGrupos] = React.useState<LoanControlGrupo[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isFormOpen, setFormOpen] = React.useState(false);
    const [editingGrupo, setEditingGrupo] = React.useState<LoanControlGrupo | null>(null);
    const [deleteConfirmationText, setDeleteConfirmationText] = React.useState('');
    const [grupoToDelete, setGrupoToDelete] = React.useState<LoanControlGrupo | null>(null);
    const [searchTerm, setSearchTerm] = React.useState("");

    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const carteraData = await getCarteraById(carteraId);
            setCartera(carteraData);
            
            if (carteraData) {
                const [plazaData, gruposData] = await Promise.all([
                    getPlazaById(carteraData.plazaId),
                    getGruposByCartera(carteraId)
                ]);
                setPlaza(plazaData);
                setGrupos(gruposData);
            }

        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información de la cartera." });
        } finally {
            setIsLoading(false);
        }
    }, [carteraId, toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredGrupos = React.useMemo(() => {
        return grupos.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [grupos, searchTerm]);

    const handleFormSubmit = async (values: Omit<LoanControlGrupo, 'id' | 'carteraId' | 'plazaId' | 'prefix'>) => {
        if (!user?.prefix || !cartera) return;
        setIsSubmitting(true);
        try {
            if (editingGrupo) {
                await updateGrupo(editingGrupo.id, values);
                toast({ title: "Éxito", description: "Grupo actualizado." });
            } else {
                const dataToSave = { ...values, carteraId, plazaId: cartera.plazaId, prefix: user.prefix };
                await addGrupo(dataToSave);
                toast({ title: "Éxito", description: "Grupo creado." });
            }
            closeForm();
            fetchData();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el grupo." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteGrupo = async () => {
        if (!grupoToDelete) return;
        try {
            await deleteGrupo(grupoToDelete.id);
            toast({ title: "Éxito", description: "Grupo eliminado." });
            setGrupoToDelete(null);
            setDeleteConfirmationText('');
            fetchData();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el grupo." });
        }
    };

    const openForm = (grupo: LoanControlGrupo | null = null) => {
        setEditingGrupo(grupo);
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingGrupo(null);
    };
    
    const openDeleteDialog = (grupo: LoanControlGrupo) => {
        setGrupoToDelete(grupo);
    };
    
    const closeDeleteDialog = () => {
        setGrupoToDelete(null);
        setDeleteConfirmationText('');
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span>Cargando grupos...</span>
            </div>
        );
    }
    
    if (!cartera || !plaza) {
        return <p>Cartera o plaza no encontrada.</p>
    }
    
    const expectedConfirmationText = grupoToDelete ? `${grupoToDelete.name} eliminar` : '';

    return (
        <div className="space-y-6">
            <NavPanel plazaId={plaza.id} />
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Grupos de {cartera.name}</h1>
                    <p className="text-muted-foreground">
                        Gestiona los grupos de esta cartera de la plaza {plaza.name}.
                    </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                    <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Users className="mr-2 h-4 w-4" />
                                Crear Grupo
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingGrupo ? 'Editar' : 'Crear'} Grupo</DialogTitle>
                            </DialogHeader>
                            <GrupoForm 
                                onSubmit={handleFormSubmit}
                                grupo={editingGrupo}
                                isSubmitting={isSubmitting}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar grupo por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-full md:w-1/3"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredGrupos.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredGrupos.map(grupo => (
                                <Card key={grupo.id} className="flex flex-col group transition-all hover:shadow-lg hover:-translate-y-1">
                                     <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div className="p-3 bg-primary/10 rounded-lg">
                                                <Users className="h-6 w-6 text-primary" />
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(grupo)}><Edit className="h-4 w-4" /></Button>
                                                <AlertDialog open={!!grupoToDelete && grupoToDelete.id === grupo.id} onOpenChange={(open) => !open && closeDeleteDialog()}>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openDeleteDialog(grupo)}><Trash2 className="h-4 w-4" /></Button>
                                                    </AlertDialogTrigger>
                                                     <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitleComponent>¿Estás seguro?</AlertDialogTitleComponent>
                                                            <AlertDialogDescription>
                                                                Esta acción es irreversible y eliminará el grupo y desasignará a sus clientes.
                                                                Para confirmar, escribe <strong className="text-foreground">{expectedConfirmationText}</strong>.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <Input
                                                          value={deleteConfirmationText}
                                                          onChange={(e) => setDeleteConfirmationText(e.target.value)}
                                                          placeholder={expectedConfirmationText}
                                                          autoFocus
                                                        />
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                disabled={deleteConfirmationText !== expectedConfirmationText}
                                                                onClick={handleDeleteGrupo}
                                                                className="bg-destructive hover:bg-destructive/90"
                                                            >
                                                                Eliminar
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                        <CardTitle className="text-xl mt-4">{grupo.name}</CardTitle>
                                    </CardHeader>
                                    <CardFooter>
                                        <Button asChild className="w-full">
                                            <Link href={`/tools/loan-control/grupo/${grupo.id}`}>
                                                Administrar Clientes
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="pt-6 text-center text-muted-foreground">
                                No hay grupos {searchTerm ? 'que coincidan con la búsqueda' : 'en esta cartera. ¡Crea el primero!'}.
                            </CardContent>
                        </Card>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
