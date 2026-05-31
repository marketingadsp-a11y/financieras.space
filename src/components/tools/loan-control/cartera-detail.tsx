
"use client";

import * as React from "react";
import Link from "next/link";
import { getGrupoById, getCarteraById, addGrupo, updateGrupo, deleteGrupo, getGruposByCartera } from "@/services/loan-control-service";
import type { LoanControlGrupo, LoanControlCartera, Plaza } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Edit, Trash2, ArrowRight, Search, Building, Folders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { getPlazaById } from "@/services/plaza-service";
import { usePathname } from "next/navigation";
import { GrupoForm } from "./grupo-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { NavPanel } from "./nav-panel";


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
                const plazaData = await getPlazaById(carteraData.plazaId);
                setPlaza(plazaData);
                const gruposData = await getGruposByCartera(carteraId);
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
        <div className="space-y-3">
            <NavPanel plazaId={plaza.id} />
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-gradient">Grupos de {cartera.name}</h1>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        Gestiona los grupos activos de esta cartera de la plaza {plaza.name}.
                    </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1.5">
                    <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-8 text-xs bg-gradient-to-r from-primary to-indigo-650 hover:from-primary/95 hover:to-indigo-650/95 text-white shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 hover:translate-y-[-1px] transition-all duration-300">
                                <Users className="mr-1.5 h-3.5 w-3.5" />
                                Crear Grupo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="glassmorphic border-white/20 dark:border-slate-800/40">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">{editingGrupo ? 'Editar' : 'Crear'} Grupo</DialogTitle>
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

            <div className="flex justify-start">
                <div className="relative glowing-border rounded-lg w-full max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-550" />
                    <Input
                        placeholder="Buscar grupo por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-8 text-xs w-full bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus-visible:ring-primary focus-visible:ring-1 focus-visible:ring-offset-0"
                    />
                </div>
            </div>

            {filteredGrupos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {filteredGrupos.map(grupo => (
                        <Card key={grupo.id} className="premium-card group overflow-hidden relative p-2">
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-indigo-500 opacity-80" />
                            <div className="flex items-center justify-between gap-2 min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-primary rounded-lg shrink-0">
                                        <Users className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <span className="text-xs font-bold leading-tight tracking-tight text-slate-800 dark:text-slate-100 truncate">{grupo.name}</span>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-650 dark:text-slate-400" onClick={() => openForm(grupo)}><Edit className="h-3.5 w-3.5" /></Button>
                                    <AlertDialog open={!!grupoToDelete && grupoToDelete.id === grupo.id} onOpenChange={(open) => !open && closeDeleteDialog()}>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:text-rose-650 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg" onClick={() => openDeleteDialog(grupo)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                        </AlertDialogTrigger>
                                         <AlertDialogContent className="glassmorphic border-white/20 dark:border-slate-800/40">
                                            <AlertDialogHeader>
                                                <AlertDialogTitleComponent className="text-lg font-bold text-slate-800 dark:text-slate-100">¿Estás seguro?</AlertDialogTitleComponent>
                                                <AlertDialogDescription className="text-sm text-muted-foreground">
                                                    Esta acción es irreversible y eliminará el grupo <strong>{grupo.name}</strong> y desasignará a sus clientes.
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
                                                    onClick={handleDeleteGrupo}
                                                    className="bg-destructive hover:bg-destructive/90 text-white"
                                                >
                                                    Eliminar
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <Button asChild variant="ghost" size="icon" className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10 rounded-lg">
                                        <Link href={`/tools/loan-control/grupo/${grupo.id}`}>
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="premium-card border-dashed bg-slate-50/20 dark:bg-slate-900/10">
                    <CardContent className="pt-8 pb-8 text-center text-sm text-muted-foreground">
                        No hay grupos {searchTerm ? 'que coincidan con la búsqueda' : 'en esta cartera. ¡Crea el primero!'}.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
