
"use client";

import * as React from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InteresTable } from "./interes-table";
import { InteresForm } from "./interes-form";
import type { InterestRate } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getInterestRates, addInterestRate, updateInterestRate, deleteInterestRate } from "@/services/interest-rate-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

export function InteresManagement() {
  const { user } = useAuth();
  const [rates, setRates] = React.useState<InterestRate[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingRate, setEditingRate] = React.useState<InterestRate | null>(null);
  const { toast } = useToast();

  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getInterestRates(user.prefix);
      setRates(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las tasas de interés.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.prefix, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFormSubmit = async (rateData: Omit<InterestRate, 'id' | 'prefix'>) => {
    if (!user?.prefix) return;
    const data = { ...rateData, prefix: user.prefix };
    try {
      if (editingRate) {
        await updateInterestRate(editingRate.id, data);
        toast({ title: "Éxito", description: "Tasa de interés actualizada." });
      } else {
        await addInterestRate(data);
        toast({ title: "Éxito", description: "Tasa de interés creada." });
      }
      setIsFormOpen(false);
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la tasa de interés." });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInterestRate(id);
      toast({ title: "Éxito", description: "Tasa de interés eliminada." });
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la tasa de interés." });
    }
  };

  const handleEdit = (rate: InterestRate) => {
    setEditingRate(rate);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingRate(null);
    setIsFormOpen(true);
  }

  const handleOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingRate(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Tasas de Interés</CardTitle>
            <CardDescription>
              Crea, edita y elimina los tipos de interés que se usarán en los préstamos mensuales.
            </CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
               <Button size="sm" onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Tasa de Interés
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRate ? 'Editar' : 'Agregar'} Tasa de Interés</DialogTitle>
              </DialogHeader>
              <InteresForm
                onSubmit={handleFormSubmit}
                rate={editingRate}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            <span>Cargando tasas de interés...</span>
          </div>
        ) : (
          <InteresTable data={rates} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </CardContent>
    </Card>
  );
}
