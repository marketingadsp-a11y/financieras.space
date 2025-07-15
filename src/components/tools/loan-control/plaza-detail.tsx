
"use client";

import * as React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { getPlazaById } from "@/services/plaza-service";
import type { LoanControlCartera, Plaza } from "@/lib/data";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { addCartera, deleteCartera, getCarterasByPlaza, getGruposByCartera, updateCartera, getAssignedCustomersByGrupo } from "@/services/loan-control-service";
import { Loader2, PlusCircle, Folder, Edit, Trash2, ArrowRight, DollarSign, Users, Briefcase, LayoutGrid, Building, Folders, FileSpreadsheet, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CarteraForm } from "./cartera-form";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";


const NavPanel = ({ plazaId }: { plazaId: string }) => {
    const pathname = usePathname();
    const basePath = `/tools/loan-control`;
    
    const navItems = [
        { href: basePath, label: 'Control General', icon: LayoutGrid, active: pathname === basePath },
        { href: `${basePath}/plaza/${plazaId}`, label: 'Gestionar Plazas', icon: Building, active: pathname.startsWith(`${basePath}/plaza`) },
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

type CarteraWithStats = LoanControlCartera & {
    grupoCount: number;
    totalLoaned: number;
    totalDue: number;
};

export function PlazaDetail({ plazaId }: { plazaId: string }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [plaza, setPlaza] = React.useState<Plaza | null>(null);
    const [carteras, setCarteras] = React.useState<CarteraWithStats[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isFormOpen, setFormOpen] = React.useState(false);
    const [editingCartera, setEditingCartera] = React.useState<LoanControlCartera | null>(null);
    const [deleteConfirmationText, setDeleteConfirmationText] = React.useState('');
    const [carteraToDelete, setCarteraToDelete] = React.useState<LoanControlCartera | null>(null);
    const [searchTerm, setSearchTerm] = React.useState("");


    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const plazaData = await getPlazaById(plazaId);
            setPlaza(plazaData);

            if (plazaData) {
                const carterasData = await getCarterasByPlaza(plazaId);
                const carterasWithStats = await Promise.all(carterasData.map(async (cartera) => {
                    const grupos = await getGruposByCartera(cartera.id);
                    let totalLoaned = 0;
                    let totalDue = 0;

                    for (const grupo of grupos) {
                        const customers = await getAssignedCustomersByGrupo(grupo.id);
                        totalLoaned += customers.reduce((acc, c) => acc + (c.loanAmount || 0), 0);
                        totalDue += customers.reduce((acc, c) => acc + (c.dueAmount || 0), 0);
                    }

                    return {
                        ...cartera,
                        grupoCount: grupos.length,
                        totalLoaned,
                        totalDue,
                    };
                }));
                setCarteras(carterasWithStats);
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información de la plaza." });
        } finally {
            setIsLoading(false);
        }
    }, [plazaId, toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const filteredCarteras = React.useMemo(() => {
        return carteras.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [carteras, searchTerm]);

    const handleFormSubmit = async (values: Omit<LoanControlCartera, 'id' | 'plazaId' | 'prefix'>) => {
        if (!user?.prefix) return;
        setIsSubmitting(true);
        try {
            if (editingCartera) {
                await updateCartera(editingCartera.id, values);
                toast({ title: "Éxito", description: "Cartera actualizada." });
            } else {
                const dataToSave = { ...values, plazaId, prefix: user.prefix };
                await addCartera(dataToSave);
                toast({ title: "Éxito", description: "Cartera creada." });
            }
            closeForm();
            fetchData();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la cartera." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteCartera = async () => {
        if (!carteraToDelete) return;
        try {
            await deleteCartera(carteraToDelete.id);
            toast({ title: "Éxito", description: "Cartera eliminada." });
            setCarteraToDelete(null);
            setDeleteConfirmationText('');
            fetchData();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la cartera." });
        }
    };
    
    const openForm = (cartera: LoanControlCartera | null = null) => {
        setEditingCartera(cartera);
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingCartera(null);
    };
    
    const openDeleteDialog = (cartera: LoanControlCartera) => {
        setCarteraToDelete(cartera);
    };
    
    const closeDeleteDialog = () => {
        setCarteraToDelete(null);
        setDeleteConfirmationText('');
    };

    const exportToPDF = () => {
        if (!plaza || filteredCarteras.length === 0) return;
        const doc = new jsPDF();
        doc.text(`Resumen de Carteras: ${plaza.name}`, 14, 16);
        autoTable(doc, {
            startY: 25,
            head: [['Cartera', 'Grupos', 'Total Prestado', 'Total Pendiente']],
            body: filteredCarteras.map(c => [
                c.name,
                c.grupoCount,
                `$${c.totalLoaned.toLocaleString('es-MX')}`,
                `$${c.totalDue.toLocaleString('es-MX')}`
            ]),
        });
        doc.save(`Resumen_Carteras_${plaza.name.replace(/\s/g, '_')}.pdf`);
    };

    const exportToExcel = () => {
        if (!plaza || filteredCarteras.length === 0) return;
        const dataToExport = filteredCarteras.map(c => ({
            'Cartera': c.name,
            'Grupos': c.grupoCount,
            'Total Prestado': c.totalLoaned,
            'Total Pendiente': c.totalDue
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Carteras");
        XLSX.writeFile(workbook, `Resumen_Carteras_${plaza.name.replace(/\s/g, '_')}.xlsx`);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span>Cargando carteras...</span>
            </div>
        );
    }
    
    if (!plaza) {
        return <p>Plaza no encontrada.</p>
    }

    const expectedConfirmationText = carteraToDelete ? `${carteraToDelete.name} eliminar` : '';

    return (
        <div className="space-y-6">
             <NavPanel plazaId={plaza.id} />
             <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Carteras de {plaza.name}</h1>
                    <p className="text-muted-foreground">
                        Gestiona las carteras de esta plaza.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Crear Cartera
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingCartera ? 'Editar' : 'Crear'} Cartera</DialogTitle>
                            </DialogHeader>
                            <CarteraForm 
                                onSubmit={handleFormSubmit}
                                cartera={editingCartera}
                                isSubmitting={isSubmitting}
                            />
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm" onClick={exportToExcel} disabled={filteredCarteras.length === 0}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToPDF} disabled={filteredCarteras.length === 0}>
                        <FileText className="mr-2 h-4 w-4" /> Exportar PDF
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar cartera por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-full md:w-1/3"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredCarteras.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredCarteras.map(cartera => (
                                <Card key={cartera.id} className="flex flex-col group transition-all hover:shadow-lg hover:-translate-y-1">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div className="p-3 bg-primary/10 rounded-lg w-fit">
                                                <Briefcase className="h-6 w-6 text-primary" />
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(cartera)}><Edit className="h-4 w-4" /></Button>
                                                <AlertDialog open={!!carteraToDelete && carteraToDelete.id === cartera.id} onOpenChange={(open) => !open && closeDeleteDialog()}>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openDeleteDialog(cartera)}><Trash2 className="h-4 w-4" /></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta acción es irreversible y eliminará la cartera, sus grupos y desasignará a sus clientes.
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
                                                                onClick={handleDeleteCartera}
                                                                className="bg-destructive hover:bg-destructive/90"
                                                            >
                                                                Eliminar
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                         <CardTitle className="text-xl mt-4">{cartera.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-4">
                                       <div className="border-t pt-4 space-y-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Grupos</span>
                                                <span className="font-bold text-lg">{cartera.grupoCount}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Prestado</span>
                                                <span className="font-medium">${cartera.totalLoaned.toLocaleString('es-MX')}</span>
                                            </div>
                                             <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Pendiente</span>
                                                <span className="font-medium text-destructive">${cartera.totalDue.toLocaleString('es-MX')}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button asChild className="w-full">
                                            <Link href={`/tools/loan-control/cartera/${cartera.id}`}>
                                                Administrar Cartera
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
                                No hay carteras {searchTerm ? 'que coincidan con la búsqueda' : 'en esta plaza. ¡Crea la primera!'}.
                            </CardContent>
                        </Card>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
