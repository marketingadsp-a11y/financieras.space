"use client";

import * as React from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlazasTable } from "@/components/tools/overdue-portfolio/plazas-table";
import { PlazaForm } from "@/components/tools/overdue-portfolio/plaza-form";
import type { Plaza } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getPlazas, addPlaza, updatePlaza, deletePlaza } from "@/services/plaza-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

export function PlazasManagement() {
  const { user } = useAuth();
  const [plazas, setPlazas] = React.useState<Plaza[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingPlaza, setEditingPlaza] = React.useState<Plaza | null>(null);
  const { toast } = useToast();

  const fetchPlazas = React.useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const shouldFetchAll = user.isSuperAdmin || user.isToolAdmin;
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
      // Admins use their own prefix. SuperAdmins might create for others, but for now, let's stick to their prefix if they have one.
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
