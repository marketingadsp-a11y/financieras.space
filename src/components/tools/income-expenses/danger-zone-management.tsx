
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Loader2, Building } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { deleteAllIncomeExpensesData, deleteSucursalData, getSucursales } from "@/services/income-expenses-service";
import type { Sucursal } from "@/lib/data";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DangerZoneManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allDataConfirmation, setAllDataConfirmation] = React.useState("");
  const [isDeletingAll, setIsDeletingAll] = React.useState(false);

  const [sucursales, setSucursales] = React.useState<Sucursal[]>([]);
  const [selectedSucursal, setSelectedSucursal] = React.useState("");
  const [isDeletingSucursal, setIsDeletingSucursal] = React.useState(false);
  const [sucursalConfirmation, setSucursalConfirmation] = React.useState("");

  React.useEffect(() => {
    if (user?.prefix) {
      getSucursales(user.prefix).then(setSucursales).catch(() => {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las sucursales.'})
      });
    }
  }, [user?.prefix, toast]);

  const expectedAllDataText = `ELIMINAR ${user?.prefix}`;
  const selectedSucursalName = sucursales.find(s => s.id === selectedSucursal)?.name;
  const expectedSucursalText = selectedSucursalName ? `BORRAR ${selectedSucursalName}` : '';

  const handleDeleteAllData = async () => {
    if (!user?.prefix) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo identificar el prefijo." });
      return;
    }
    setIsDeletingAll(true);
    try {
      await deleteAllIncomeExpensesData(user.prefix);
      toast({ title: "Éxito", description: "Todos los datos de Gastos e Ingresos han sido eliminados." });
      setAllDataConfirmation("");
      setSucursales([]);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo completar la operación." });
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDeleteSucursalData = async () => {
    if (!selectedSucursal) return;
    setIsDeletingSucursal(true);
    try {
        await deleteSucursalData(selectedSucursal);
        toast({ title: "Éxito", description: `Todos los datos de la sucursal ${selectedSucursalName} han sido eliminados.` });
        setSucursalConfirmation("");
        setSelectedSucursal("");
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo eliminar los datos de la sucursal." });
    } finally {
        setIsDeletingSucursal(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-start gap-4">
              <div className="p-2 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-destructive"/>
              </div>
              <div>
                  <CardTitle>Zona de Peligro</CardTitle>
                  <CardDescription>
                  Acciones irreversibles para la gestión de datos. Úsalas con extrema precaución.
                  </CardDescription>
              </div>
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Eliminar Datos de una Sucursal</CardTitle>
          <CardDescription>Esta acción eliminará todos los registros de transacciones de una sucursal específica, pero no eliminará la sucursal en sí. Su balance volverá a cero.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sucursal-select">Selecciona la sucursal</Label>
            <Select value={selectedSucursal} onValueChange={setSelectedSucursal}>
              <SelectTrigger id="sucursal-select" className="max-w-xs">
                <SelectValue placeholder="Elige una sucursal..." />
              </SelectTrigger>
              <SelectContent>
                {sucursales.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {selectedSucursal && (
            <div className="space-y-2">
              <Label>Para confirmar, escribe <strong className="text-foreground">{expectedSucursalText}</strong></Label>
              <Input
                value={sucursalConfirmation}
                onChange={(e) => setSucursalConfirmation(e.target.value)}
                placeholder={expectedSucursalText}
              />
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            variant="destructive"
            onClick={handleDeleteSucursalData}
            disabled={isDeletingSucursal || sucursalConfirmation !== expectedSucursalText}
          >
            {isDeletingSucursal ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
            {isDeletingSucursal ? "Eliminando..." : `Eliminar datos de ${selectedSucursalName || 'sucursal'}`}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Eliminar Todos los Datos</CardTitle>
            <CardDescription>
                Esta acción eliminará permanentemente todos los datos de Gastos e Ingresos para el prefijo <strong>{user?.prefix}</strong>. Esto incluye la cuenta central, todas las sucursales y todos los registros.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
            <Label htmlFor="confirm-delete-all">
                Para confirmar, escribe <strong className="text-foreground">{expectedAllDataText}</strong> a continuación:
            </Label>
            <Input
                id="confirm-delete-all"
                value={allDataConfirmation}
                onChange={(e) => setAllDataConfirmation(e.target.value)}
                placeholder={expectedAllDataText}
            />
        </CardContent>
        <CardFooter>
            <Button 
                variant="destructive"
                onClick={handleDeleteAllData}
                disabled={isDeletingAll || allDataConfirmation !== expectedAllDataText}
            >
                {isDeletingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                {isDeletingAll ? "Eliminando..." : "Sí, entiendo, eliminar todo"}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
