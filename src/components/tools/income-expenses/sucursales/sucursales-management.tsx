
"use client";

import * as React from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SucursalesTable } from "./sucursales-table";
import { SucursalForm } from "./sucursal-form";
import { AdjustBalanceDialog } from "./adjust-balance-dialog";
import type { Sucursal } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getSucursales, addSucursal, updateSucursal, deleteSucursal, adjustSucursalBalance } from "@/services/income-expenses-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

export function SucursalesManagement() {
  const { user } = useAuth();
  const [sucursales, setSucursales] = React.useState<Sucursal[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = React.useState(false);
  const [editingSucursal, setEditingSucursal] = React.useState<Sucursal | null>(null);
  const [adjustingSucursal, setAdjustingSucursal] = React.useState<Sucursal | null>(null);
  const { toast } = useToast();

  const fetchSucursales = React.useCallback(async () => {
    if (!user?.prefix) {
        setIsLoading(false);
        return;
    };
    try {
      setIsLoading(true);
      const data = await getSucursales(user.prefix);
      setSucursales(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las sucursales.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.prefix, toast]);

  React.useEffect(() => {
    fetchSucursales();
  }, [fetchSucursales]);

  const handleSubmit = async (formData: Omit<Sucursal, 'id' | 'prefix' | 'currentBalance'>) => {
    if (!user?.prefix) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se puede identificar el prefijo del administrador.'})
        return;
    };
    
    try {
      if (editingSucursal) {
        await updateSucursal(editingSucursal.id, formData);
        toast({ title: "Éxito", description: "Sucursal actualizada correctamente." });
      } else {
        await addSucursal({ ...formData, prefix: user.prefix });
        toast({ title: "Éxito", description: "Sucursal agregada correctamente." });
      }
      await fetchSucursales();
      handleOpenChange(false);
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la sucursal.",
      });
    }
  };

  const handleDelete = async (sucursalId: string) => {
     try {
      await deleteSucursal(sucursalId);
      await fetchSucursales();
      toast({
        title: "Éxito",
        description: "Sucursal eliminada correctamente.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo eliminar la sucursal.",
      });
    }
  };

  const handleAdjustBalance = async (sucursalId: string, newBalance: number) => {
    try {
      await adjustSucursalBalance(sucursalId, newBalance);
      toast({ title: "Éxito", description: "Balance de la sucursal ajustado."});
      await fetchSucursales();
      return true;
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo ajustar el balance." });
      return false;
    }
  };
  
  const handleEditClick = (sucursal: Sucursal) => {
      setEditingSucursal(sucursal);
      setIsFormOpen(true);
  }

  const handleAdjustClick = (sucursal: Sucursal) => {
      setAdjustingSucursal(sucursal);
      setIsAdjustDialogOpen(true);
  }

  const handleOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingSucursal(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Sucursales</CardTitle>
            <CardDescription>
              Crea, edita y elimina las sucursales para la asignación de capital.
            </CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Sucursal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSucursal ? 'Editar' : 'Agregar'} Sucursal</DialogTitle>
              </DialogHeader>
              <SucursalForm
                onSubmit={handleSubmit}
                sucursal={editingSucursal}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            <span>Cargando sucursales...</span>
          </div>
        ) : (
          <SucursalesTable 
            data={sucursales} 
            onEdit={handleEditClick} 
            onDelete={handleDelete}
            onAdjustBalance={handleAdjustClick}
          />
        )}
      </CardContent>
      
      <AdjustBalanceDialog 
        sucursal={adjustingSucursal}
        isOpen={isAdjustDialogOpen}
        onClose={() => setIsAdjustDialogOpen(false)}
        onSave={handleAdjustBalance}
      />
    </Card>
  );
}
