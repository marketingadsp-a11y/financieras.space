"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Workflow } from "lucide-react";

export function FlujoDashboard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg w-fit">
                <Workflow className="h-8 w-8 text-primary" />
            </div>
            <div>
                <CardTitle>Herramienta de Flujo</CardTitle>
                <CardDescription>
                Bienvenido a la nueva herramienta de Flujo. Aquí podrás visualizar y gestionar tus procesos.
                </CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-10 text-muted-foreground">
          <p>El desarrollo de esta herramienta está en curso.</p>
        </div>
      </CardContent>
    </Card>
  );
}
