
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { deleteAllIncomeExpensesData } from "@/services/income-expenses-service";

export function DangerZoneManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [confirmationText, setConfirmationText] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  const expectedConfirmationText = `ELIMINAR ${user?.prefix}`;

  const handleDeleteAllData = async () => {
    if (!user?.prefix) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo identificar el prefijo de la empresa." });
      return;
    }
    if (confirmationText !== expectedConfirmationText) {
      toast({ variant: "destructive", title: "Error", description: "El texto de confirmación no coincide." });
      return;
    }
    
    setIsDeleting(true);
    try {
      await deleteAllIncomeExpensesData(user.prefix);
      toast({ title: "Éxito", description: "Todos los datos de Gastos e Ingresos han sido eliminados." });
      setConfirmationText("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo completar la operación." });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <div className="flex items-start gap-4">
            <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-destructive"/>
            </div>
            <div>
                <CardTitle>Zona de Peligro</CardTitle>
                <CardDescription>
                Acciones irreversibles para la gestión de datos de esta herramienta. Úsalas con extrema precaución.
                </CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 rounded-lg border border-destructive/50 bg-destructive/5 p-6">
            <h3 className="font-semibold text-lg text-destructive">Eliminar Todos los Datos</h3>
            <p className="text-sm text-muted-foreground">
                Esta acción eliminará permanentemente todos los datos asociados a la herramienta de <strong>Gastos e Ingresos</strong> para el prefijo <strong>{user?.prefix}</strong>. Esto incluye la cuenta central, todas las sucursales y todos los registros de transacciones. Esta acción no se puede deshacer.
            </p>
            <div className="space-y-2">
                <label htmlFor="confirm-delete" className="text-sm font-medium">
                    Para confirmar, escribe <strong className="text-destructive">{expectedConfirmationText}</strong> a continuación:
                </label>
                <Input
                    id="confirm-delete"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder={expectedConfirmationText}
                    className="border-destructive focus-visible:ring-destructive"
                />
            </div>
        </div>
      </CardContent>
      <CardFooter>
          <Button 
            variant="destructive"
            onClick={handleDeleteAllData}
            disabled={isDeleting || confirmationText !== expectedConfirmationText}
          >
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
            {isDeleting ? "Eliminando..." : "Sí, entiendo las consecuencias, eliminar todo"}
          </Button>
      </CardFooter>
    </Card>
  );
}
