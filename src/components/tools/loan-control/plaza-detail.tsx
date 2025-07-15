
"use client";

import * as React from "react";
import { getPlazaById } from "@/services/plaza-service";
import type { LoanControlCartera, Plaza } from "@/lib/data";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { addCartera, deleteCartera, getCarterasByPlaza, updateCartera } from "@/services/loan-control-service";
import { Loader2, PlusCircle, Folder, Edit, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CarteraForm } from "./cartera-form";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

export function PlazaDetail({ plazaId }: { plazaId: string }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [plaza, setPlaza] = React.useState<Plaza | null>(null);
    const [carteras, setCarteras] = React.useState<LoanControlCartera[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isFormOpen, setFormOpen] = React.useState(false);
    const [editingCartera, setEditingCartera] = React.useState<LoanControlCartera | null>(null);
    const [deleteConfirmationText, setDeleteConfirmationText] = React.useState('');
    const [carteraToDelete, setCarteraToDelete] = React.useState<LoanControlCartera | null>(null);


    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const [plazaData, carterasData] = await Promise.all([
                getPlazaById(plazaId),
                getCarterasByPlaza(plazaId)
            ]);
            setPlaza(plazaData);
            setCarteras(carterasData);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información de la plaza." });
        } finally {
            setIsLoading(false);
        }
    }, [plazaId, toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

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
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Plaza: {plaza.name}</h1>
                    <p className="text-muted-foreground">
                        Gestiona las carteras de esta plaza.
                    </p>
                </div>
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
            </div>
            
             {carteras.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {carteras.map(cartera => (
                        <Card key={cartera.id} className="flex flex-col group">
                             <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <Folder className="h-6 w-6 text-primary" />
                                        <CardTitle className="text-xl">{cartera.name}</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-1">
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
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground">Crea grupos dentro de esta cartera y asigna clientes.</p>
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
                        No hay carteras en esta plaza. ¡Crea la primera!
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
