
"use client";

import * as React from "react";
import { getCarteraById, getGruposByCartera, addGrupo, updateGrupo, deleteGrupo, getAssignedCustomersByGrupo } from "@/services/loan-control-service";
import type { LoanControlCartera, LoanControlGrupo, Customer, Plaza } from "@/lib/data";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Users, Edit, Trash2, ArrowRight, DollarSign, Folder, LayoutGrid, Building, Folders, FileSpreadsheet, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { GrupoForm } from "./grupo-form";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { getPlazaById } from "@/services/plaza-service";
import { usePathname } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

type GrupoWithStats = LoanControlGrupo & {
    customerCount: number;
    totalLoaned: number;
    totalDue: number;
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

export function CarteraDetail({ carteraId }: { carteraId: string }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [cartera, setCartera] = React.useState<LoanControlCartera | null>(null);
    const [plaza, setPlaza] = React.useState<Plaza | null>(null);
    const [grupos, setGrupos] = React.useState<GrupoWithStats[]>([]);
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

                const gruposWithStats = await Promise.all(gruposData.map(async (grupo) => {
                    const customers = await getAssignedCustomersByGrupo(grupo.id);
                    const stats = customers.reduce((acc, customer) => {
                        acc.totalLoaned += customer.loanAmount || 0;
                        acc.totalDue += customer.dueAmount || 0;
                        return acc;
                    }, { totalLoaned: 0, totalDue: 0 });

                    return {
                        ...grupo,
                        customerCount: customers.length,
                        totalLoaned: stats.totalLoaned,
                        totalDue: stats.totalDue
                    };
                }));
                setGrupos(gruposWithStats);
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

    const carteraSummary = React.useMemo(() => {
        return filteredGrupos.reduce((acc, grupo) => {
            acc.totalLoaned += grupo.totalLoaned;
            acc.totalDue += grupo.totalDue;
            return acc;
        }, { totalLoaned: 0, totalDue: 0 });
    }, [filteredGrupos]);

    const exportToPDF = () => {
        if (!cartera || filteredGrupos.length === 0) return;
        const doc = new jsPDF();
        const dateString = format(new Date(), 'dd/MM/yyyy');
        doc.text(`Resumen de Grupos en Cartera: ${cartera.name}`, 14, 16);
        doc.text(`Plaza: ${plaza?.name}`, 14, 22);
        doc.text(`Fecha de Exportación: ${dateString}`, 14, 28);
        autoTable(doc, {
            startY: 35,
            head: [['Grupo', 'Clientes', 'Total Prestado', 'Total Pendiente']],
            body: filteredGrupos.map(g => [
                g.name,
                g.customerCount,
                `$${g.totalLoaned.toLocaleString('es-MX')}`,
                `$${g.totalDue.toLocaleString('es-MX')}`
            ]),
        });
        const fileName = `Resumen_Grupos_${cartera.name.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        doc.save(fileName);
    };

    const exportToExcel = () => {
        if (!cartera || filteredGrupos.length === 0) return;
        const dataToExport = filteredGrupos.map(g => ({
            'Grupo': g.name,
            'Clientes': g.customerCount,
            'Total Prestado': g.totalLoaned,
            'Total Pendiente': g.totalDue,
        }));
        
        const dateString = format(new Date(), 'PPP', { locale: es });
        const worksheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.sheet_add_aoa(worksheet, [['Resumen de Grupos']], { origin: 'A1' });
        XLSX.utils.sheet_add_aoa(worksheet, [[`Cartera: ${cartera.name}`]], { origin: 'A2' });
        XLSX.utils.sheet_add_aoa(worksheet, [[`Plaza: ${plaza?.name}`]], { origin: 'A3' });
        XLSX.utils.sheet_add_aoa(worksheet, [[`Fecha de Exportación: ${dateString}`]], { origin: 'A4' });

        XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: 'A6' });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Grupos");
        const fileName = `Resumen_Grupos_${cartera.name.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        XLSX.writeFile(workbook, fileName);
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
                                <PlusCircle className="mr-2 h-4 w-4" />
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
                    <Button variant="outline" size="sm" onClick={exportToExcel} disabled={filteredGrupos.length === 0}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToPDF} disabled={filteredGrupos.length === 0}>
                        <FileText className="mr-2 h-4 w-4" /> Exportar PDF
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard title="Total Prestado (Filtrado)" value={carteraSummary.totalLoaned} />
                <StatCard title="Total Pendiente (Filtrado)" value={carteraSummary.totalDue} />
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
                                                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
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
                                        <CardDescription>{grupo.customerCount} cliente(s)</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-4">
                                        <div className="border-t pt-4 space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Prestado</span>
                                                <span className="font-medium">${grupo.totalLoaned.toLocaleString('es-MX')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Pendiente</span>
                                                <span className="font-medium text-destructive">${grupo.totalDue.toLocaleString('es-MX')}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button asChild className="w-full">
                                            <Link href={`/tools/loan-control/grupo/${grupo.id}`}>
                                                Administrar Grupo
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
