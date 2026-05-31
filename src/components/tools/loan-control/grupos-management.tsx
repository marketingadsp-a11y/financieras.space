
"use client";

import * as React from "react";
import { getCarterasByPlaza, getGruposByCartera, updateGrupo, deleteGrupo } from "@/services/loan-control-service";
import type { LoanControlCartera, LoanControlGrupo } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Folder, Users, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { GrupoForm } from "./grupo-form";
import { Input } from "@/components/ui/input";

type GrupoWithCartera = LoanControlGrupo & { carteraName: string };

export function GruposManagement({ plazaId }: { plazaId: string }) {
    const { toast } = useToast();
    const [grupos, setGrupos] = React.useState<GrupoWithCartera[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isFormOpen, setFormOpen] = React.useState(false);
    const [editingGrupo, setEditingGrupo] = React.useState<LoanControlGrupo | null>(null);
    const [deleteConfirmationText, setDeleteConfirmationText] = React.useState('');
    const [grupoToDelete, setGrupoToDelete] = React.useState<LoanControlGrupo | null>(null);

    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const carteras = await getCarterasByPlaza(plazaId);
            const gruposPromises = carteras.map(cartera => 
                getGruposByCartera(cartera.id).then(g => g.map(gr => ({ ...gr, carteraName: cartera.name })))
            );
            const allGruposNested = await Promise.all(gruposPromises);
            const allGruposFlat = allGruposNested.flat();
            setGrupos(allGruposFlat);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información de los grupos." });
        } finally {
            setIsLoading(false);
        }
    }, [plazaId, toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFormSubmit = async (values: Partial<Omit<LoanControlGrupo, 'id' | 'carteraId' | 'plazaId' | 'prefix'>>) => {
        if (!editingGrupo) return;
        setIsSubmitting(true);
        try {
            await updateGrupo(editingGrupo.id, values);
            toast({ title: "Éxito", description: "Grupo actualizado." });
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
    
    const groupedByCartera = grupos.reduce((acc, grupo) => {
        if (!acc[grupo.carteraId]) {
            acc[grupo.carteraId] = { carteraName: grupo.carteraName, grupos: [] };
        }
        acc[grupo.carteraId].grupos.push(grupo);
        return acc;
    }, {} as Record<string, { carteraName: string; grupos: LoanControlGrupo[] }>);

    const accordionItems = Object.entries(groupedByCartera);
    const expectedConfirmationText = grupoToDelete ? `${grupoToDelete.name} eliminar` : '';

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span>Cargando grupos...</span>
            </div>
        );
    }

    return (
        <Card className="premium-card bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-100 dark:border-slate-800/80">
            <CardHeader className="p-3 pb-2 border-b border-slate-100 dark:border-slate-800/40">
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">Gestión de Grupos de la Plaza</CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                    Administra todos los grupos de esta plaza, organizados por cartera asignada.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-3">
                {accordionItems.length > 0 ? (
                    <Accordion type="multiple" className="w-full space-y-2" defaultValue={Object.keys(groupedByCartera)}>
                        {accordionItems.map(([carteraId, { carteraName, grupos: carteraGrupos }]) => (
                            <AccordionItem key={carteraId} value={carteraId} className="border border-slate-100 dark:border-slate-800/60 rounded-lg overflow-hidden bg-white/50 dark:bg-slate-950/20 shadow-sm">
                                <AccordionTrigger className="px-3.5 py-2.5 text-xs hover:no-underline hover:bg-slate-50/50 dark:hover:bg-slate-900/20 text-slate-800 dark:text-slate-100 font-bold transition-all">
                                    <div className="flex items-center gap-2">
                                        <Folder className="h-4 w-4 text-indigo-500" />
                                        <span>Cartera: {carteraName} <span className="text-[10px] font-semibold text-muted-foreground ml-1">({carteraGrupos.length} grupos)</span></span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/15 dark:bg-slate-900/10">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                        {carteraGrupos.map(grupo => (
                                            <Card key={grupo.id} className="premium-card flex items-center justify-between p-2 group relative overflow-hidden">
                                                <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-gradient-to-b from-primary to-indigo-500 opacity-80" />
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-primary rounded-lg shrink-0">
                                                         <Users className="h-3.5 w-3.5 text-indigo-550" />
                                                     </div>
                                                     <p className="font-bold text-xs text-slate-800 dark:text-slate-100 leading-tight truncate">{grupo.name}</p>
                                                 </div>
                                                 <div className="flex items-center gap-0.5 shrink-0 opacity-60 hover:opacity-100 group-hover:opacity-100 transition-opacity duration-200">
                                                     <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-660 dark:text-slate-355" onClick={() => openForm(grupo)}><Edit className="h-3 w-3" /></Button>
                                                     <AlertDialog open={!!grupoToDelete && grupoToDelete.id === grupo.id} onOpenChange={(open) => !open && closeDeleteDialog()}>
                                                         <AlertDialogTrigger asChild>
                                                             <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg" onClick={() => openDeleteDialog(grupo)}><Trash2 className="h-3 w-3" /></Button>
                                                         </AlertDialogTrigger>
                                                         <AlertDialogContent className="glassmorphic border-white/20 dark:border-slate-800/40">
                                                             <AlertDialogHeader>
                                                                 <AlertDialogTitleComponent className="text-lg font-bold text-slate-800 dark:text-slate-100">¿Estás seguro?</AlertDialogTitleComponent>
                                                                 <AlertDialogDescription className="text-sm text-muted-foreground">
                                                                     Esta acción es irreversible y eliminará el grupo <strong>{grupo.name}</strong> y desasignará a sus clientes.
                                                                     Para confirmar, escribe <strong className="text-foreground">{expectedConfirmationText}</strong>.
                                                                 </AlertDialogDescription>
                                                             </AlertDialogHeader>
                                                             <Input value={deleteConfirmationText} onChange={(e) => setDeleteConfirmationText(e.target.value)} placeholder={expectedConfirmationText} className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus-visible:ring-rose-500 focus-visible:ring-1" autoFocus />
                                                             <AlertDialogFooter>
                                                                 <AlertDialogCancel className="border-slate-200 dark:border-slate-800">Cancelar</AlertDialogCancel>
                                                                 <AlertDialogAction disabled={deleteConfirmationText !== expectedConfirmationText} onClick={handleDeleteGrupo} className="bg-destructive hover:bg-destructive/90 text-white">Eliminar</AlertDialogAction>
                                                             </AlertDialogFooter>
                                                         </AlertDialogContent>
                                                     </AlertDialog>
                                                 </div>
                                            </Card>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <p className="text-sm font-medium">No hay grupos creados en esta plaza.</p>
                        <p className="text-xs text-slate-400 mt-1">Primero, crea carteras y luego añade grupos dentro de ellas en el panel de carteras.</p>
                    </div>
                )}

                 <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                    <DialogContent className="glassmorphic border-white/20 dark:border-slate-800/40">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">Editar Grupo</DialogTitle>
                        </DialogHeader>
                        <GrupoForm 
                            onSubmit={handleFormSubmit}
                            grupo={editingGrupo}
                            isSubmitting={isSubmitting}
                        />
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
