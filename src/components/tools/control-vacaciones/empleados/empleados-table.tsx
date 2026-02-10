
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
import type { EmpleadoVacaciones, VacationRule } from "@/lib/data";
import { format, intervalToDuration, differenceInYears } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

type EmpleadosTableProps = {
  data: EmpleadoVacaciones[];
  rules: VacationRule[];
  onEdit: (empleado: EmpleadoVacaciones) => void;
  onDelete: (id: string) => void;
};

export function EmpleadosTable({ data, rules, onEdit, onDelete }: EmpleadosTableProps) {

  const calculateAntiguedad = (fechaIngreso: Date) => {
    if (!fechaIngreso || !(fechaIngreso instanceof Date) || isNaN(fechaIngreso.getTime())) {
      return "Fecha inválida";
    }
    const duration = intervalToDuration({ start: new Date(fechaIngreso), end: new Date() });
    const years = duration.years || 0;
    const months = duration.months || 0;
    const days = duration.days || 0;
    
    let parts = [];
    if (years > 0) {
        parts.push(`${years} año${years !== 1 ? 's' : ''}`);
    }
    if (months > 0) {
        parts.push(`${months} mes${months !== 1 ? 'es' : ''}`);
    }
    if (days > 0 && years < 1) { // Only show days if less than a year
        parts.push(`${days} día${days !== 1 ? 's' : ''}`);
    }
    
    if (parts.length === 0) return 'Menos de un día';
    
    return parts.join(', ');
  };

  const getVacationDays = (fechaIngreso: Date) => {
      const yearsOfService = differenceInYears(new Date(), new Date(fechaIngreso));
      if (yearsOfService < 1) {
          return { disponible: 0, elegible: false };
      }

      const applicableRule = rules
          .filter(r => r.year <= yearsOfService)
          .sort((a, b) => b.year - a.year)[0];

      return {
          disponible: applicableRule ? applicableRule.days : 0,
          elegible: true
      };
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Fecha de Ingreso</TableHead>
            <TableHead>Antigüedad</TableHead>
            <TableHead>Cumpleaños</TableHead>
            <TableHead>Días Disponibles</TableHead>
            <TableHead>Días Restantes</TableHead>
            <TableHead className="text-right">Sueldo Semanal</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((empleado) => {
              const { disponible, elegible } = getVacationDays(empleado.fechaIngreso);
              const diasTomados = empleado.diasTomados || 0;
              const diasRestantes = disponible - diasTomados;
              
              return (
              <TableRow key={empleado.id}>
                <TableCell className="font-medium">{empleado.name}</TableCell>
                <TableCell>{format(new Date(empleado.fechaIngreso), "PPP", { locale: es })}</TableCell>
                <TableCell>{calculateAntiguedad(new Date(empleado.fechaIngreso))}</TableCell>
                <TableCell>
                  {empleado.birthday ? (
                    <div className="font-semibold p-1 rounded-md bg-gradient-to-tr from-green-100 to-green-200 text-green-800 dark:from-green-900/50 dark:to-green-800/50 dark:text-green-200">
                      {format(new Date(empleado.birthday), "dd 'de' LLLL", { locale: es })}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </TableCell>
                 <TableCell>
                  {elegible ? `${disponible} días` : <Badge variant="outline">No Elegible</Badge>}
                </TableCell>
                <TableCell>
                  {elegible ? `${diasRestantes} días` : '-'}
                </TableCell>
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
            )})
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No hay empleados registrados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
