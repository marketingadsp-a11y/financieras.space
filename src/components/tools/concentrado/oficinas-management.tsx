"use client";

import * as React from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OficinasTable } from "./oficinas-table";
import { OficinaForm } from "./oficina-form";
import type { ConcentradoOficina } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getConcentradoOficinas, addConcentradoOficina, updateConcentradoOficina, deleteConcentradoOficina } from "@/services/concentrado-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

export function OficinasManagement() {
  const { user } = useAuth();
  const [oficinas, setOficinas] = React.useState<ConcentradoOficina[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingOficina, setEditingOficina] = React.useState<ConcentradoOficina | null>(null);
  const { toast } = useToast();

  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getConcentradoOficinas(user.prefix);
      setOficinas(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las oficinas.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.prefix, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFormSubmit = async (oficinaData: Omit<ConcentradoOficina, 'id' | 'prefix'>) => {
    if (!user?.prefix) return;

    const data = { ...oficinaData, prefix: user.prefix };

    try {
      if (editingOficina) {
        await updateConcentradoOficina(editingOficina.id, data);
        toast({ title: "Éxito", description: "Oficina actualizada." });
      } else {
        await addConcentradoOficina(data);
        toast({ title: "Éxito", description: "Oficina creada." });
      }
      setIsFormOpen(false);
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la oficina." });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteConcentradoOficina(id);
      toast({ title: "Éxito", description: "Oficina eliminada." });
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la oficina." });
    }
  };

  const handleEdit = (oficina: ConcentradoOficina) => {
    setEditingOficina(oficina);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingOficina(null);
    setIsFormOpen(true);
  }

  const handleOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingOficina(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Oficinas</CardTitle>
            <CardDescription>
              Crea, edita y elimina las oficinas para el concentrado.
            </CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
               <Button size="sm" onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Oficina
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingOficina ? 'Editar' : 'Agregar'} Oficina</DialogTitle>
              </DialogHeader>
              <OficinaForm
                onSubmit={handleFormSubmit}
                oficina={editingOficina}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            <span>Cargando oficinas...</span>
          </div>
        ) : (
          <OficinasTable data={oficinas} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </CardContent>
    </Card>
  );
}
