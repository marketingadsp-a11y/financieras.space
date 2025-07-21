
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent } from "@/components/ui/alert-dialog";
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
