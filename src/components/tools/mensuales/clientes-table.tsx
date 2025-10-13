

"use client";

import * as React from "react";
import Link from "next/link";
import { MoreHorizontal, DollarSign, History, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { ClienteMensual, OficinaMensual } from "@/lib/data";

type ClientesTableProps = {
  data: ClienteMensual[];
  oficinas: OficinaMensual[];
  onPaymentClick: (cliente: ClienteMensual) => void;
};

export function ClientesTable({ data, oficinas, onPaymentClick }: ClientesTableProps) {

  const oficinaMap = new Map(oficinas.map(o => [o.id, o.name]));

  const getStatusVariant = (status: ClienteMensual['status']) => {
      switch (status) {
          case 'vigente': return 'vigente';
          case 'vencido': return 'vencido';
          case 'liquidado': return 'default';
          default: return 'outline';
      }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Oficina</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Interés Pendiente</TableHead>
            <TableHead>Monto Prestado</TableHead>
            <TableHead>Interés Mensual</TableHead>
            <TableHead>Día de Pago</TableHead>
            <TableHead>Nuevo Saldo</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((cliente) => {
              const monthlyInterest = (cliente.currentBalance * cliente.interestRateValue) / 100;
              return (
              <TableRow key={cliente.id}>
                <TableCell>{oficinaMap.get(cliente.oficinaId) || 'N/A'}</TableCell>
                <TableCell className="font-medium">{cliente.name}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(cliente.status) as any} className="capitalize">
                    {cliente.status}
                  </Badge>
                </TableCell>
                <TableCell>
                    {(cliente.unpaidInterest || 0) > 0 ? (
                        <Badge variant="destructive">${cliente.unpaidInterest.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Badge>
                    ) : (
                        <Badge variant="secondary">Cubierto</Badge>
                    )}
                </TableCell>
                <TableCell>${cliente.loanAmount.toLocaleString('es-MX')}</TableCell>
                <TableCell>${monthlyInterest.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                <TableCell>{cliente.paymentDay}</TableCell>
                <TableCell className="font-semibold">${cliente.currentBalance.toLocaleString('es-MX')}</TableCell>
                <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => onPaymentClick(cliente)}
                          disabled={cliente.status === 'liquidado'}
                          className="bg-blue-800 text-white hover:bg-blue-900"
                        >
                          <DollarSign className="mr-2 h-4 w-4" /> Abonar
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={`/tools/mensuales/prestamo/${cliente.id}`}>
                                Ver Detalles <ArrowRight className="ml-2 h-4 w-4"/>
                            </Link>
                        </Button>
                    </div>
                </TableCell>
              </TableRow>
            )})
          ) : (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No hay préstamos registrados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
