
"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
};

export function ClientesTable({ data, oficinas }: ClientesTableProps) {

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
            <TableHead>Cliente</TableHead>
            <TableHead>Oficina</TableHead>
            <TableHead>Monto Prestado</TableHead>
            <TableHead>Saldo Actual</TableHead>
            <TableHead>Día de Pago</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead><span className="sr-only">Acciones</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((cliente) => (
              <TableRow key={cliente.id}>
                <TableCell className="font-medium">{cliente.name}</TableCell>
                <TableCell>{oficinaMap.get(cliente.oficinaId) || 'N/A'}</TableCell>
                <TableCell>${cliente.loanAmount.toLocaleString('es-MX')}</TableCell>
                <TableCell className="font-semibold">${cliente.currentBalance.toLocaleString('es-MX')}</TableCell>
                <TableCell>{cliente.paymentDay}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(cliente.status)} className="capitalize">
                    {cliente.status}
                  </Badge>
                </TableCell>
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
              <TableCell colSpan={7} className="h-24 text-center">
                No hay préstamos registrados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
