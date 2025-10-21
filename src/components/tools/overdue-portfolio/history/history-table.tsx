
"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { HistoryLog } from "@/lib/data";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { DollarSign, UserPlus, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

type HistoryTableProps = {
  data: HistoryLog[];
  type: 'payment' | 'action';
};

const actionIcons: { [key: string]: React.ElementType } = {
  create: UserPlus,
  update: Edit,
  delete: Trash2,
  payment: DollarSign,
};

const actionLabels: { [key: string]: string } = {
  create: 'Creación',
  update: 'Actualización',
  delete: 'Eliminación',
  payment: 'Abono',
};

const actionVariants: { [key: string]: "default" | "secondary" | "destructive" } = {
    create: 'default',
    update: 'secondary',
    delete: 'destructive',
};

export function HistoryTable({ data, type }: HistoryTableProps) {
  const [filter, setFilter] = React.useState("");

  const filteredData = data.filter((log) => {
    const searchTerm = filter.toLowerCase();
    return (
      log.userName.toLowerCase().includes(searchTerm) ||
      log.details.toLowerCase().includes(searchTerm) ||
      (log.customerName && log.customerName.toLowerCase().includes(searchTerm)) ||
      (type === 'payment' && log.amount?.toString().includes(searchTerm))
    );
  });
  
  const getActionInfo = (logType: string) => {
    return {
      Icon: actionIcons[logType] || UserPlus,
      label: actionLabels[logType] || logType,
      variant: actionVariants[logType] || 'default'
    }
  }

  return (
    <>
      <div className="flex items-center pb-4">
        <Input
          placeholder="Buscar en el historial..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>{type === 'payment' ? 'Cliente Afectado' : 'Tipo de Acción'}</TableHead>
              <TableHead>{type === 'payment' ? 'Detalles del Cliente' : 'Detalles'}</TableHead>
              {type === 'payment' && <TableHead className="text-right">Monto</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((log) => {
                const { Icon, label, variant } = getActionInfo(log.type);
                return (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: es })}</TableCell>
                  <TableCell className="font-medium">{log.userName}</TableCell>
                  <TableCell>
                    {type === 'payment' ? (
                       log.customerName || 'N/A'
                    ) : (
                        <Badge variant={variant} className="gap-2">
                            <Icon className="h-3 w-3" />
                            {label}
                        </Badge>
                    )}
                  </TableCell>
                   <TableCell className="text-sm text-muted-foreground">
                    {type === 'payment' ? (
                        <div className="flex flex-col">
                            <span>Plaza: {log.plazaName || 'N/A'}</span>
                            <span>Promotor: {log.promoter || 'N/A'}</span>
                            <span>Grupo: {log.group || 'N/A'}</span>
                        </div>
                    ) : (
                        log.details
                    )}
                  </TableCell>
                  {type === 'payment' && (
                    <TableCell className="text-right font-semibold text-green-600">
                        ${(log.amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                  )}
                </TableRow>
              )})
            ) : (
              <TableRow>
                <TableCell colSpan={type === 'payment' ? 5 : 4} className="h-24 text-center">
                  No se encontraron registros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
