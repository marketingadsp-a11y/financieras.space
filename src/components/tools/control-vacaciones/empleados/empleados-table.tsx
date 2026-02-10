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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { EmpleadoVacaciones } from "@/lib/data";
import { format, intervalToDuration } from "date-fns";
import { es } from "date-fns/locale";

type EmpleadosTableProps = {
  data: EmpleadoVacaciones[];
  onEdit: (empleado: EmpleadoVacaciones) => void;
  onDelete: (id: string) => void;
};

export function EmpleadosTable({ data, onEdit, onDelete }: EmpleadosTableProps) {

  const calculateAntiguedad = (fechaIngreso: Date) => {
    if (!fechaIngreso || !(fechaIngreso instanceof Date) || isNaN(fechaIngreso.getTime())) {
      return "Fecha inválida";
    }
    const duration = intervalToDuration({ start: new Date(fechaIngreso), end: new Date() });
    const years = duration.years || 0;
    const months = duration.months || 0;
    const days = duration.days || 0;
    
    const totalMonths = years * 12 + months;

    let parts = [];
    if (totalMonths > 0) {
        parts.push(`${totalMonths} mes${totalMonths !== 1 ? 'es' : ''}`);
    }
    if (days > 0) {
        parts.push(`${days} día${days !== 1 ? 's' : ''}`);
    }
    
    return parts.length > 0 ? parts.join(' y ') : 'Menos de un día';
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Fecha de Ingreso</TableHead>
            <TableHead>Antigüedad</TableHead>
            <TableHead className="text-right">Sueldo Semanal</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((empleado) => (
              <TableRow key={empleado.id}>
                <TableCell className="font-medium">{empleado.name}</TableCell>
                <TableCell>{format(new Date(empleado.fechaIngreso), "PPP", { locale: es })}</TableCell>
                <TableCell>{calculateAntiguedad(new Date(empleado.fechaIngreso))}</TableCell>
                <TableCell className="text-right font-mono">${(empleado.sueldoSemanal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-right">
                    <AlertDialog>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Alternar menú</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => onEdit(empleado)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                        </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción eliminará permanentemente al empleado.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(empleado.id)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No hay empleados registrados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
