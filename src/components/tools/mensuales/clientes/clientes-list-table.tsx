
"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ClienteMensual, OficinaMensual } from "@/lib/data";
import { ArrowRight } from "lucide-react";

type ClientesListTableProps = {
  data: ClienteMensual[];
  oficinas: OficinaMensual[];
};

export function ClientesListTable({ data, oficinas }: ClientesListTableProps) {

  const oficinaMap = new Map(oficinas.map(o => [o.id, o.name]));

  const getStatusVariant = (status: ClienteMensual['status']) => {
      switch (status) {
          case 'vigente': return 'secondary';
          case 'vencido': return 'destructive';
          case 'liquidado': return 'default';
          default: return 'outline';
      }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID Cliente</TableHead>
            <TableHead>Nombre del Cliente</TableHead>
            <TableHead>Oficina</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Saldo Actual</TableHead>
            <TableHead><span className="sr-only">Acciones</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((cliente) => (
              <TableRow key={cliente.id}>
                <TableCell>
                    <Badge variant="outline" className="font-mono text-sm">{cliente.displayId}</Badge>
                </TableCell>
                <TableCell className="font-medium">{cliente.name}</TableCell>
                <TableCell>{oficinaMap.get(cliente.oficinaId) || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(cliente.status)} className="capitalize">
                    {cliente.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold">${cliente.currentBalance.toLocaleString('es-MX')}</TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={`/tools/mensuales/prestamo/${cliente.id}`}>
                            Ver Detalles <ArrowRight className="ml-2 h-4 w-4"/>
                        </Link>
                    </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No se encontraron clientes.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
