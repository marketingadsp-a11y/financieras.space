"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export function ControlVacacionesDashboard() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Control de Vacaciones</CardTitle>
          <CardDescription>
            Herramienta en construcción para gestionar las vacaciones de los empleados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <CalendarDays className="h-16 w-16 mb-4" />
            <h3 className="text-xl font-semibold">Próximamente</h3>
            <p>Esta herramienta está en desarrollo. ¡Vuelve pronto!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
