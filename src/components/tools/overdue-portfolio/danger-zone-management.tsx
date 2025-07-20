
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Loader2, Building } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getPlazas } from "@/services/plaza-service";
import { deleteCustomersByPlaza, deleteAllCustomersByPrefix } from "@/services/customer-service";
import type { Plaza } from "@/lib/data";
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
} from "@/components/ui/alert-dialog";

export function DangerZoneManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [plazas, setPlazas] = React.useState<Plaza[]>([]);
  const [isLoadingPlazas, setIsLoadingPlazas] = React.useState(true);

  const [allDataConfirmation, setAllDataConfirmation] = React.useState("");
  const [isDeletingAll, setIsDeletingAll] = React.useState(false);

  const [selectedPlaza, setSelectedPlaza] = React.useState("");
  const [isDeletingPlaza, setIsDeletingPlaza] = React.useState(false);
  const [plazaConfirmation, setPlazaConfirmation] = React.useState("");

  React.useEffect(() => {
    if (user?.prefix) {
        setIsLoadingPlazas(true);
        getPlazas({ prefix: user.prefix }).then(setPlazas).catch(() => {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las plazas.'})
        }).finally(() => setIsLoadingPlazas(false));
    }
  }, [user?.prefix, toast]);

  const expectedAllDataText = `ELIMINAR ${user?.prefix}`;
  const selectedPlazaName = plazas.find(s => s.id === selectedPlaza)?.name;
  const expectedPlazaText = selectedPlazaName ? `BORRAR ${selectedPlazaName}` : '';

  const handleDeleteAllData = async () => {
    if (!user?.prefix) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo identificar el prefijo." });
      return;
    }
    setIsDeletingAll(true);
    try {
      await deleteAllCustomersByPrefix(user.prefix);
      toast({ title: "Éxito", description: "Todos los clientes de Cartera Vencida han sido eliminados." });
      setAllDataConfirmation("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo completar la operación." });
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDeletePlazaData = async () => {
    if (!selectedPlaza) return;
    setIsDeletingPlaza(true);
    try {
        await deleteCustomersByPlaza(selectedPlaza);
        toast({ title: "Éxito", description: `Todos los clientes de la plaza ${selectedPlazaName} han sido eliminados.` });
        setPlazaConfirmation("");
        setSelectedPlaza("");
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo eliminar los clientes de la plaza." });
    } finally {
        setIsDeletingPlaza(false);
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
                  <CardTitle>Zona de Peligro - Cartera Vencida</CardTitle>
                  <CardDescription>
                  Acciones irreversibles para la gestión de datos. Úsalas con extrema precaución.
                  </CardDescription>
              </div>
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Eliminar Clientes de una Plaza</CardTitle>
          <CardDescription>Esta acción eliminará todos los clientes de una plaza específica, pero no eliminará la plaza en sí.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plaza-select">Selecciona la plaza</Label>
            <Select value={selectedPlaza} onValueChange={setSelectedPlaza} disabled={isLoadingPlazas}>
              <SelectTrigger id="plaza-select" className="max-w-xs">
                <SelectValue placeholder={isLoadingPlazas ? "Cargando..." : "Elige una plaza..."} />
              </SelectTrigger>
              <SelectContent>
                {plazas.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {selectedPlaza && (
            <div className="space-y-2">
              <Label>Para confirmar, escribe <strong className="text-foreground">{expectedPlazaText}</strong></Label>
              <Input
                value={plazaConfirmation}
                onChange={(e) => setPlazaConfirmation(e.target.value)}
                placeholder={expectedPlazaText}
              />
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            variant="destructive"
            onClick={handleDeletePlazaData}
            disabled={isDeletingPlaza || plazaConfirmation !== expectedPlazaText}
          >
            {isDeletingPlaza ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
            {isDeletingPlaza ? "Eliminando..." : `Eliminar clientes de ${selectedPlazaName || 'plaza'}`}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Eliminar Todos los Clientes</CardTitle>
            <CardDescription>
                Esta acción eliminará permanentemente todos los clientes de la herramienta Cartera Vencida para el prefijo <strong>{user?.prefix}</strong>. Esto no afecta a las plazas en sí.
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
                {isDeletingAll ? "Eliminando..." : "Sí, entiendo, eliminar todos los clientes"}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
