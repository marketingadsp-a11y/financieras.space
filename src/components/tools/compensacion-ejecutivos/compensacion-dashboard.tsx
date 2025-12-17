"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { DollarSign } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";

const NOMINA_BASE = 4000;
const BONO_MAXIMO = 3000;

const bonosConfig = {
  falloMenor: { label: "Fallo menor al 2%", percentage: 0.50 },
  recopilador: { label: "Recopilador", percentage: 0.15 },
  ubicacion: { label: "Ubicación", percentage: 0.15 },
  reporteSabado: { label: "Reporte del Sábado", percentage: 0.20 },
};

export function CompensacionDashboard() {

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">Compensación de Ejecutivos</CardTitle>
          <CardDescription>
            Calculadora para la nómina final de un ejecutivo basada en su nómina base y bonos de rendimiento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8 p-6 bg-muted/30 rounded-lg">
            <div>
              <Label className="text-lg font-semibold">Nómina Base</Label>
              <div className="relative mt-2">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="text"
                    readOnly
                    value={NOMINA_BASE.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                    className="pl-10 text-2xl font-bold h-12 bg-background"
                />
              </div>
            </div>
             <div>
              <Label className="text-lg font-semibold">Bono Máximo Alcanzable</Label>
              <div className="relative mt-2">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="text"
                    readOnly
                    value={BONO_MAXIMO.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                    className="pl-10 text-2xl font-bold h-12 bg-background"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
             <h3 className="text-xl font-semibold">Calculadora de Bonos</h3>
              {Object.entries(bonosConfig).map(([key, bono]) => (
                <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Checkbox id={key} />
                    <Label htmlFor={key} className="text-base font-medium cursor-pointer">
                      {bono.label}
                    </Label>
                  </div>
                  <div className="text-right">
                      <p className="text-lg font-semibold text-primary">
                        ${(BONO_MAXIMO * bono.percentage).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ({bono.percentage * 100}%)
                      </p>
                  </div>
                </div>
              ))}
          </div>
          
          <Separator />

           <div className="p-6 bg-primary/10 rounded-lg">
                <p className="text-lg font-semibold text-center text-primary-foreground">Nómina Final</p>
                <p className="text-5xl font-bold text-center text-primary mt-2">
                    ${(NOMINA_BASE).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                </p>
           </div>
          
        </CardContent>
      </Card>
    </div>
  );
}
