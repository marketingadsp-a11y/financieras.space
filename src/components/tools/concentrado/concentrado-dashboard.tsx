"use client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export function ConcentradoDashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Herramienta "Concentrado"</CardTitle>
        <CardDescription>
          Esta herramienta está en construcción. Aquí se llevará el concentrado de las oficinas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center items-center h-64">
        <div className="text-center text-muted-foreground">
            <Wrench className="h-16 w-16 mx-auto" />
            <p className="mt-4">Poco a poco iremos construyendo esta sección.</p>
        </div>
      </CardContent>
    </Card>
  );
}
