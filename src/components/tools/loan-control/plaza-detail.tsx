
"use client";

import * as React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { getPlazaById } from "@/services/plaza-service";
import type { LoanControlCartera, Plaza } from "@/lib/data";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { addCartera, deleteCartera, getCarterasByPlaza, getGruposByCartera, updateCartera, getAssignedCustomersByGrupo, getLoanControlPlazaDetailData } from "@/services/loan-control-service";
import { Loader2, PlusCircle, Folder, Edit, Trash2, ArrowRight, DollarSign, Users, Briefcase, FileSpreadsheet, FileText, Search, Target, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CarteraForm } from "./cartera-form";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { usePathname } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { NavPanel } from "./nav-panel";

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
            const { plaza: plazaData, carteras: carterasData } = await getLoanControlPlazaDetailData(plazaId);
            if (plazaData) {
                setPlaza(plazaData);
                setCarteras(carterasData);
            } else {
                toast({ variant: "destructive", title: "Error", description: "No se encontró la plaza especificada." });
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
        const dateString = format(new Date(), 'dd/MM/yyyy');
        doc.text(`Resumen de Carteras: ${plaza.name}`, 14, 16);
        doc.text(`Fecha de Exportación: ${dateString}`, 14, 22);
        autoTable(doc, {
            startY: 30,
            head: [['Cartera', 'Grupos', 'Total Prestado', 'Total Pendiente']],
            body: filteredCarteras.map(c => [
                c.name,
                c.grupoCount,
                `$${c.totalLoaned.toLocaleString('es-MX')}`,
                `$${c.totalDue.toLocaleString('es-MX')}`
            ]),
        });
        const fileName = `Resumen_Carteras_${plaza.name.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        doc.save(fileName);
    };

    const exportToExcel = () => {
        if (!plaza || filteredCarteras.length === 0) return;
        const dataToExport = filteredCarteras.map(c => ({
            'Cartera': c.name,
            'Grupos': c.grupoCount,
            'Total Prestado': c.totalLoaned,
            'Total Pendiente': c.totalDue
        }));
        
        const dateString = format(new Date(), 'PPP', { locale: es });
        const worksheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.sheet_add_aoa(worksheet, [['Resumen de Carteras']], { origin: 'A1' });
        XLSX.utils.sheet_add_aoa(worksheet, [[`Plaza: ${plaza.name}`]], { origin: 'A2' });
        XLSX.utils.sheet_add_aoa(worksheet, [[`Fecha de Exportación: ${dateString}`]], { origin: 'A3' });

        XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: 'A5' });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Carteras");
        const fileName = `Resumen_Carteras_${plaza.name.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        XLSX.writeFile(workbook, fileName);
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
        <div className="space-y-3">
             <NavPanel plazaId={plaza.id} />
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-gradient">Carteras de {plaza.name}</h1>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        Gestiona y organiza las carteras activas asignadas a esta plaza.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-8 text-xs bg-gradient-to-r from-primary to-indigo-650 hover:from-primary/95 hover:to-indigo-650/95 text-white shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 hover:translate-y-[-1px] transition-all duration-300">
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                                Crear Cartera
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="glassmorphic border-white/20 dark:border-slate-800/40">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">{editingCartera ? 'Editar' : 'Crear'} Cartera</DialogTitle>
                            </DialogHeader>
                            <CarteraForm 
                                onSubmit={handleFormSubmit}
                                cartera={editingCartera}
                                isSubmitting={isSubmitting}
                            />
                        </DialogContent>
                    </Dialog>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={exportToExcel} 
                        disabled={filteredCarteras.length === 0}
                        className="h-8 text-xs border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                    >
                        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Excel
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={exportToPDF} 
                        disabled={filteredCarteras.length === 0}
                        className="h-8 text-xs border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                    >
                        <FileText className="mr-1.5 h-3.5 w-3.5 text-rose-600 dark:text-rose-455" /> PDF
                    </Button>
                </div>
            </div>

            <div className="flex justify-start">
                <div className="relative glowing-border rounded-lg w-full max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-550" />
                    <Input
                        placeholder="Buscar cartera por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-8 text-xs w-full bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus-visible:ring-primary focus-visible:ring-1 focus-visible:ring-offset-0"
                    />
                </div>
            </div>

            {filteredCarteras.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredCarteras.map(cartera => (
                        <Card key={cartera.id} className="premium-card flex flex-col group overflow-hidden relative">
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-indigo-500 opacity-80" />
                            <CardHeader className="p-3 pb-1.5">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-primary rounded-lg shrink-0">
                                            <Briefcase className="h-3.5 w-3.5 text-primary transition-transform duration-300 group-hover:scale-110" />
                                        </div>
                                        <CardTitle className="text-xs font-bold leading-tight tracking-tight text-slate-800 dark:text-slate-100 truncate">{cartera.name}</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-355" onClick={() => openForm(cartera)}><Edit className="h-3.5 w-3.5" /></Button>
                                        <AlertDialog open={!!carteraToDelete && carteraToDelete.id === cartera.id} onOpenChange={(open) => !open && closeDeleteDialog()}>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg" onClick={() => openDeleteDialog(cartera)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="glassmorphic border-white/20 dark:border-slate-800/40">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">¿Estás seguro?</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-sm text-muted-foreground">
                                                        Esta acción es irreversible y eliminará la cartera <strong>{cartera.name}</strong>, sus grupos y desasignará a sus clientes.
                                                        Para confirmar, escribe <strong className="text-foreground">{expectedConfirmationText}</strong>.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <Input
                                                  value={deleteConfirmationText}
                                                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                                                  placeholder={expectedConfirmationText}
                                                  className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus-visible:ring-rose-500 focus-visible:ring-1"
                                                  autoFocus
                                                />
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="border-slate-200 dark:border-slate-800">Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        disabled={deleteConfirmationText !== expectedConfirmationText}
                                                        onClick={handleDeleteCartera}
                                                        className="bg-destructive hover:bg-destructive/90 text-white"
                                                    >
                                                        Eliminar
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow px-3 pb-3 pt-0">
                                 <div className="grid grid-cols-3 gap-1 bg-slate-50/50 dark:bg-slate-900/40 p-1.5 rounded-lg border border-slate-100/50 dark:border-slate-800/50 text-[10px]">
                                     <div className="text-center">
                                         <span className="text-[8px] font-bold text-slate-500 tracking-wider block">GRUPOS</span>
                                         <span className="font-extrabold text-slate-800 dark:text-slate-200">{cartera.grupoCount}</span>
                                     </div>
                                     <div className="text-center border-l border-slate-200/50 dark:border-slate-700/50">
                                         <span className="text-[8px] font-bold text-slate-500 tracking-wider block">PRESTADO</span>
                                         <span className="font-extrabold text-slate-800 dark:text-slate-200">${cartera.totalLoaned.toLocaleString('es-MX')}</span>
                                     </div>
                                     <div className="text-center border-l border-slate-200/50 dark:border-slate-700/50">
                                         <span className="text-[8px] font-bold text-slate-500 tracking-wider block">PENDIENTE</span>
                                         <span className="font-extrabold text-rose-600 dark:text-rose-400">${cartera.totalDue.toLocaleString('es-MX')}</span>
                                     </div>
                                 </div>
                            </CardContent>
                            <CardFooter className="p-1.5 border-t bg-slate-50/30 dark:bg-slate-900/10 px-3">
                                <Button asChild className="w-full hover:bg-primary/5 hover:text-primary transition-all duration-300 rounded-lg h-7 text-[10px]" variant="ghost" size="sm">
                                    <Link href={`/tools/loan-control/cartera/${cartera.id}`} className="flex justify-between items-center w-full">
                                        <span className="font-bold">Administrar Cartera</span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="premium-card border-dashed bg-slate-50/20 dark:bg-slate-900/10">
                    <CardContent className="pt-8 pb-8 text-center text-sm text-muted-foreground">
                        No hay carteras {searchTerm ? 'que coincidan con la búsqueda' : 'en esta plaza. ¡Crea la primera!'}.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
