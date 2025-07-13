import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export function ToolsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Herramientas de Administrador</CardTitle>
        <CardDescription>
          Aquí se mostrarán las herramientas disponibles para los administradores.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
          <Wrench className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Próximamente se añadirán nuevas herramientas.</p>
        </div>
      </CardContent>
    </Card>
  );
}
