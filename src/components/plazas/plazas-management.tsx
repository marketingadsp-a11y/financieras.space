
"use client";

import * as React from "react";
import { PlusCircle, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlazasTable } from "@/components/plazas/plazas-table";
import { PlazaForm } from "@/components/plazas/plaza-form";
import type { Plaza } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getPlazas, addPlaza, updatePlaza, deletePlaza, deleteAllPlazasByPrefix } from "@/services/plaza-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";

export function PlazasManagement() {
  const { user } = useAuth();
  const [plazas, setPlazas] = React.useState<Plaza[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingPlaza, setEditingPlaza] = React.useState<Plaza | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = React.useState('');
  const { toast } = useToast();

  const fetchPlazas = React.useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const shouldFetchAll = user.isSuperAdmin;
      const plazasFromDb = await getPlazas({ prefix: user.prefix, fetchAll: shouldFetchAll });
      setPlazas(plazasFromDb);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las plazas.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    fetchPlazas();
  }, [fetchPlazas]);

  const handleAddPlaza = async (newPlaza: Omit<Plaza, 'id' | 'pendingDebt' | 'recoveryRate'>) => {
    try {
      const plazaData = { ...newPlaza, prefix: user?.prefix };
      await addPlaza(plazaData);
      await fetchPlazas();
      setIsFormOpen(false);
       toast({
        title: "Éxito",
        description: "Plaza agregada correctamente.",
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo agregar la plaza.",
      });
    }
  };

  const handleUpdatePlaza = async (updatedPlaza: Pick<Plaza, 'id' | 'name'>) => {
    try {
      await updatePlaza(updatedPlaza.id, { name: updatedPlaza.name });
      await fetchPlazas();
      setEditingPlaza(null);
      setIsFormOpen(false);
      toast({
        title: "Éxito",
        description: "Plaza actualizada correctamente.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la plaza.",
      });
    }
  };

  const handleDeletePlaza = async (plazaId: string) => {
     try {
      await deletePlaza(plazaId);
      await fetchPlazas();
      toast({
        title: "Éxito",
        description: "Plaza eliminada correctamente.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la plaza.",
      });
    }
  };

  const handleDeleteAllPlazas = async () => {
    if (!user?.prefix) return;
    try {
      await deleteAllPlazasByPrefix(user.prefix);
      toast({
        title: "Éxito",
        description: "Todas las plazas y sus clientes asociados han sido eliminados.",
      });
      await fetchPlazas();
      setDeleteConfirmationText('');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron eliminar las plazas.",
      });
    }
  };
  
  const handleEditClick = (plaza: Plaza) => {
      setEditingPlaza(plaza);
      setIsFormOpen(true);
  }

  const handleOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingPlaza(null);
    }
  }

  const expectedConfirmationText = "ELIMINAR TODO";

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Plazas</CardTitle>
            <CardDescription>
              Crea, edita y elimina las plazas de la cartera vencida.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Agregar Plaza
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingPlaza ? 'Editar' : 'Agregar'} Plaza</DialogTitle>
                </DialogHeader>
                <PlazaForm
                  onSubmit={editingPlaza ? handleUpdatePlaza : handleAddPlaza}
                  plaza={editingPlaza}
                />
              </DialogContent>
            </Dialog>
            
            <AlertDialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Más Opciones</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={e => e.preventDefault()}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar Todas las Plazas
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitleComponent>¿Estás absolutamente seguro?</AlertDialogTitleComponent>
                  <AlertDialogDescription>
                    Esta acción es irreversible y eliminará permanentemente <strong>TODAS</strong> las plazas y <strong>TODOS</strong> sus clientes asociados para el prefijo <strong>{user?.prefix}</strong>.
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
                  <AlertDialogCancel onClick={() => setDeleteConfirmationText('')}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAllPlazas}
                    disabled={deleteConfirmationText !== expectedConfirmationText}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Sí, eliminar todo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            <span>Cargando plazas...</span>
          </div>
        ) : (
          <PlazasTable data={plazas} onEdit={handleEditClick} onDelete={handleDeletePlaza} />
        )}
      </CardContent>
    </Card>
  );
}
