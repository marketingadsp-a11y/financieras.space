
"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardDescription, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { deleteAllMensualesData } from "@/services/mensuales-service";
import { Label } from "@/components/ui/label";

export function MensualesDangerZone() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [confirmationTexts, setConfirmationTexts] = React.useState({
    clientes: "",
    oficinas: "",
    interes: "",
  });

  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);

  const handleDelete = async (dataType: 'clientes' | 'oficinas' | 'interes') => {
    if (!user?.prefix) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo identificar el prefijo." });
      return;
    }
    
    setIsDeleting(dataType);
    try {
      await deleteAllMensualesData(user.prefix, dataType);
      toast({ title: "Éxito", description: `Todos los datos de ${dataType} han sido eliminados.` });
      setConfirmationTexts(prev => ({ ...prev, [dataType]: ""}));
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo completar la operación." });
    } finally {
      setIsDeleting(null);
    }
  };

  const getExpectedText = (type: string) => `ELIMINAR ${type.toUpperCase()}`;

  return (
    <div className="space-y-6">
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-start gap-4">
              <div className="p-2 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-destructive"/>
              </div>
              <div>
                  <CardTitle>Zona de Peligro - Préstamos Mensuales</CardTitle>
                  <CardDescription>
                    Acciones irreversibles para eliminar datos de forma masiva. Úsalas con extrema precaución.
                  </CardDescription>
              </div>
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Eliminar Todos los Préstamos</CardTitle>
          <CardDescription>Esta acción eliminará todos los clientes, préstamos y sus historiales de movimientos, pero conservará las oficinas y tasas de interés.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
            <Label htmlFor="delete-clientes">Para confirmar, escribe <strong className="text-foreground">{getExpectedText('clientes')}</strong></Label>
            <Input id="delete-clientes" value={confirmationTexts.clientes} onChange={(e) => setConfirmationTexts(p => ({...p, clientes: e.target.value}))} placeholder={getExpectedText('clientes')} />
        </CardContent>
        <CardFooter>
            <Button variant="destructive" onClick={() => handleDelete('clientes')} disabled={isDeleting === 'clientes' || confirmationTexts.clientes !== getExpectedText('clientes')}>
                 {isDeleting === 'clientes' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                 Eliminar Préstamos
            </Button>
        </CardFooter>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Eliminar Todas las Oficinas</CardTitle>
          <CardDescription>Esta acción eliminará todas las oficinas. <strong className="text-destructive">ATENCIÓN:</strong> Esto también eliminará todos los préstamos asociados a ellas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
            <Label htmlFor="delete-oficinas">Para confirmar, escribe <strong className="text-foreground">{getExpectedText('oficinas')}</strong></Label>
            <Input id="delete-oficinas" value={confirmationTexts.oficinas} onChange={(e) => setConfirmationTexts(p => ({...p, oficinas: e.target.value}))} placeholder={getExpectedText('oficinas')} />
        </CardContent>
        <CardFooter>
            <Button variant="destructive" onClick={() => handleDelete('oficinas')} disabled={isDeleting === 'oficinas' || confirmationTexts.oficinas !== getExpectedText('oficinas')}>
                 {isDeleting === 'oficinas' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                 Eliminar Oficinas
            </Button>
        </CardFooter>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Eliminar Todas las Tasas de Interés</CardTitle>
          <CardDescription>Esta acción eliminará todas las tasas de interés que has configurado. Los préstamos existentes no se verán afectados, pero no podrás crear nuevos hasta que agregues una nueva tasa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
            <Label htmlFor="delete-interes">Para confirmar, escribe <strong className="text-foreground">{getExpectedText('interes')}</strong></Label>
            <Input id="delete-interes" value={confirmationTexts.interes} onChange={(e) => setConfirmationTexts(p => ({...p, interes: e.target.value}))} placeholder={getExpectedText('interes')} />
        </CardContent>
        <CardFooter>
            <Button variant="destructive" onClick={() => handleDelete('interes')} disabled={isDeleting === 'interes' || confirmationTexts.interes !== getExpectedText('interes')}>
                 {isDeleting === 'interes' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                 Eliminar Tasas de Interés
            </Button>
        </CardFooter>
      </Card>

    </div>
  );
}
