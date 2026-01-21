
"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { getConcentradoOficinas, getRegistrosByOficina } from "@/services/concentrado-service";
import type { ConcentradoOficina, ConcentradoSemanal } from "@/lib/data";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";

type SummaryRow = {
  oficinaId: string;
  oficinaName: string;
  fondoInicio: number;
  venta: number;
  cajaChica: number;
  recolectado: number;
  gastos: number;
  fondoSiguienteSemana: number;
  seguros: number;
  interesMensual: number;
  carteraVencida: number;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(value);
};

export function ConcentradoDashboard() {
  const [summaries, setSummaries] = React.useState<SummaryRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchData = async () => {
        if (!user?.prefix) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const oficinas = await getConcentradoOficinas(user.prefix);
            
            const summaryPromises = oficinas.map(async (oficina) => {
                const registros = await getRegistrosByOficina(oficina.id);
                
                const summary = registros.reduce((acc, r) => {
                    acc.fondoInicio += r.fondoInicio || 0;
                    acc.venta += r.venta || 0;
                    acc.cajaChica += r.cajaChica || 0;
                    acc.recolectado += r.recolectado || 0;
                    acc.gastos += r.gastos || 0;
                    acc.fondoSiguienteSemana += r.fondoSiguienteSemana || 0;
                    acc.seguros += r.seguros || 0;
                    acc.interesMensual += r.interesMensual || 0;
                    acc.carteraVencida += r.carteraVencida || 0;
                    return acc;
                }, {
                    fondoInicio: 0,
                    venta: 0,
                    cajaChica: 0,
                    recolectado: 0,
                    gastos: 0,
                    fondoSiguienteSemana: 0,
                    seguros: 0,
                    interesMensual: 0,
                    carteraVencida: 0,
                });

                return {
                    oficinaId: oficina.id,
                    oficinaName: oficina.name,
                    ...summary
                };
            });

            const results = await Promise.all(summaryPromises);
            setSummaries(results);

        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudieron cargar los datos del concentrado."
            });
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [user?.prefix, toast]);

  const totals = React.useMemo(() => {
    return summaries.reduce((acc, s) => {
        acc.fondoInicio += s.fondoInicio;
        acc.venta += s.venta;
        acc.cajaChica += s.cajaChica;
        acc.recolectado += s.recolectado;
        acc.gastos += s.gastos;
        acc.fondoSiguienteSemana += s.fondoSiguienteSemana;
        acc.seguros += s.seguros;
        acc.interesMensual += s.interesMensual;
        acc.carteraVencida += s.carteraVencida;
        return acc;
    }, {
        fondoInicio: 0,
        venta: 0,
        cajaChica: 0,
        recolectado: 0,
        gastos: 0,
        fondoSiguienteSemana: 0,
        seguros: 0,
        interesMensual: 0,
        carteraVencida: 0,
    });
  }, [summaries]);

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            <span>Cargando datos del concentrado...</span>
        </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Concentrado de Oficinas</CardTitle>
        <CardDescription>
          Resumen de todos los registros acumulados de las oficinas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="font-semibold">Oficina</TableHead>
                        <TableHead className="text-right font-semibold">Fondo Inicio</TableHead>
                        <TableHead className="text-right font-semibold">Venta</TableHead>
                        <TableHead className="text-right font-semibold">Caja Chica</TableHead>
                        <TableHead className="text-right font-semibold">Recolectado</TableHead>
                        <TableHead className="text-right font-semibold">Gastos</TableHead>
                        <TableHead className="text-right font-semibold">Fondo Sig. Semana</TableHead>
                        <TableHead className="text-right font-semibold">Seguros</TableHead>
                        <TableHead className="text-right font-semibold">Interés Mensual</TableHead>
                        <TableHead className="text-right font-semibold">Cartera Vencida</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {summaries.length > 0 ? (
                        summaries.map(summary => (
                            <TableRow key={summary.oficinaId}>
                                <TableCell className="font-medium">{summary.oficinaName}</TableCell>
                                <TableCell className="text-right">{formatCurrency(summary.fondoInicio)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(summary.venta)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(summary.cajaChica)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(summary.recolectado)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(summary.gastos)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(summary.fondoSiguienteSemana)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(summary.seguros)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(summary.interesMensual)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(summary.carteraVencida)}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={10} className="h-24 text-center">
                                No hay datos registrados en ninguna oficina.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                 <TableFooter>
                    <TableRow className="font-bold bg-muted/50">
                        <TableCell>TOTALES</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.fondoInicio)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.venta)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.cajaChica)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.recolectado)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.gastos)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.fondoSiguienteSemana)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.seguros)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.interesMensual)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.carteraVencida)}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
