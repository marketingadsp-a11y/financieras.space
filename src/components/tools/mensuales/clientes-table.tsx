
"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Trash2, DollarSign } from "lucide-react";
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
            <TableHead>Oficina</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Monto Prestado</TableHead>
            <TableHead>Interés Mensual</TableHead>
            <TableHead>Día de Pago</TableHead>
            <TableHead>Nuevo Saldo</TableHead>
            <TableHead><span className="sr-only">Acciones</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((cliente) => (
              <TableRow key={cliente.id}>
                <TableCell>{oficinaMap.get(cliente.oficinaId) || 'N/A'}</TableCell>
                <TableCell className="font-medium">{cliente.name}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(cliente.status)} className="capitalize">
                    {cliente.status}
                  </Badge>
                </TableCell>
                <TableCell>${cliente.loanAmount.toLocaleString('es-MX')}</TableCell>
                <TableCell>${cliente.monthlyInterestCharge.toLocaleString('es-MX')}</TableCell>
                <TableCell>{cliente.paymentDay}</TableCell>
                <TableCell className="font-semibold">${cliente.currentBalance.toLocaleString('es-MX')}</TableCell>
                <TableCell>
                    <div className="flex justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Alternar menú</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => onPaymentClick(cliente)} disabled={cliente.status === 'liquidado'}>
                                    <DollarSign className="mr-2 h-4 w-4" /> Abonar
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Pencil className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No hay préstamos registrados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
