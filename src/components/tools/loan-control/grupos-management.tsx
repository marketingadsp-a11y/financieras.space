
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
        <Card>
            <CardHeader>
                <CardTitle>Gestión de Grupos de la Plaza</CardTitle>
                <CardDescription>
                    Administra todos los grupos de esta plaza, organizados por cartera.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {accordionItems.length > 0 ? (
                    <Accordion type="multiple" className="w-full space-y-4" defaultValue={Object.keys(groupedByCartera)}>
                        {accordionItems.map(([carteraId, { carteraName, grupos: carteraGrupos }]) => (
                            <AccordionItem key={carteraId} value={carteraId} className="border rounded-lg">
                                <AccordionTrigger className="px-4 py-3 text-lg hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <Folder className="h-5 w-5 text-muted-foreground" />
                                        <span>Cartera: {carteraName} ({carteraGrupos.length} grupos)</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 border-t">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {carteraGrupos.map(grupo => (
                                            <Card key={grupo.id} className="group flex flex-col justify-between">
                                                <CardHeader className="flex-row items-start justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-5 w-5 text-primary" />
                                                        <p className="font-semibold">{grupo.name}</p>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openForm(grupo)}><Edit className="h-4 w-4" /></Button>
                                                        <AlertDialog open={!!grupoToDelete && grupoToDelete.id === grupo.id} onOpenChange={(open) => !open && closeDeleteDialog()}>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => openDeleteDialog(grupo)}><Trash2 className="h-4 w-4" /></Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitleComponent>¿Estás seguro?</AlertDialogTitleComponent>
                                                                    <AlertDialogDescription>
                                                                        Esta acción es irreversible y eliminará el grupo y desasignará a sus clientes.
                                                                        Para confirmar, escribe <strong className="text-foreground">{expectedConfirmationText}</strong>.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <Input value={deleteConfirmationText} onChange={(e) => setDeleteConfirmationText(e.target.value)} placeholder={expectedConfirmationText} autoFocus />
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction disabled={deleteConfirmationText !== expectedConfirmationText} onClick={handleDeleteGrupo} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </CardHeader>
                                            </Card>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>No hay grupos en esta plaza.</p>
                        <p className="text-sm">Primero, crea carteras y luego grupos dentro de ellas.</p>
                    </div>
                )}

                 <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Editar Grupo</DialogTitle>
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
