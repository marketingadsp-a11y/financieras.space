
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";

export function RegistroOficinaDashboard() {
  const { user } = useAuth();
  
  // This is a placeholder. We will build the main dashboard here.
  
  if (!user) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Cargando...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard de Registro de Oficina</CardTitle>
        <CardDescription>
          Aquí se mostrará el resumen de los registros semanales y mensuales.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>En construcción...</p>
      </CardContent>
    </Card>
  );
}
