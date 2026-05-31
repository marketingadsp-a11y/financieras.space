"use client";
 
import * as React from "react";
import { MoreHorizontal, Pencil, Trash2, Cake, Calendar, ShieldAlert, Award } from "lucide-react";
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
import { cn } from "@/lib/utils";
 
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
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
          <TableRow>
            <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs">Nombre</TableHead>
            <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs">Fecha de Ingreso</TableHead>
            <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs">Antigüedad</TableHead>
            <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs">Cumpleaños</TableHead>
            <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs">Días Disponibles</TableHead>
            <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs">Días Restantes</TableHead>
            <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300 text-xs">Sueldo Semanal</TableHead>
            <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300 text-xs">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((empleado) => {
              const { disponible, elegible } = getVacationDays(empleado.fechaIngreso);
              const diasTomados = empleado.diasTomados || 0;
              const diasRestantes = disponible - diasTomados;
              
              return (
              <TableRow key={empleado.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                <TableCell className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{empleado.name}</TableCell>
                <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 opacity-60" />
                    {format(new Date(empleado.fechaIngreso), "PPP", { locale: es })}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {calculateAntiguedad(new Date(empleado.fechaIngreso))}
                </TableCell>
                <TableCell>
                  {empleado.birthday ? (
                    <Badge variant="outline" className="text-[10px] font-bold py-0.5 px-2 bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/25 flex items-center gap-1 w-fit">
                      <Cake className="h-3 w-3" />
                      {format(new Date(empleado.birthday), "dd 'de' LLLL", { locale: es })}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground/60 italic">No registrado</span>
                  )}
                </TableCell>
                 <TableCell className="text-xs">
                  {elegible ? (
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Award className="h-3.5 w-3.5 text-primary opacity-80" />
                      {disponible} {disponible === 1 ? 'día' : 'días'}
                    </span>
                  ) : (
                    <Badge variant="outline" className="text-[9px] font-semibold bg-slate-100 text-slate-500 border-slate-200 shadow-none dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-750">
                      No Elegible
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {elegible ? (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 border shadow-sm",
                        diasRestantes > 2 
                          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300" 
                          : diasRestantes >= 0
                            ? "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300"
                            : "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300"
                      )}
                    >
                      {diasRestantes <= 0 ? (
                        <span className="flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          {diasRestantes} días
                        </span>
                      ) : (
                        `${diasRestantes} días`
                      )}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold font-mono text-xs text-slate-700 dark:text-slate-300">
                  ${(empleado.sueldoSemanal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right">
                    <AlertDialog>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Alternar menú</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground">Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => onEdit(empleado)} className="text-xs cursor-pointer">
                                <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                            </DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/20 text-xs cursor-pointer" onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                        </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-xl max-w-md">
                          <AlertDialogHeader>
                              <AlertDialogTitle className="text-lg font-bold">¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription className="text-sm text-muted-foreground mt-2">
                                  Esta acción eliminará permanentemente al empleado <strong className="text-slate-800 dark:text-slate-200">{empleado.name}</strong> y todos sus registros asociados.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="mt-4 gap-2">
                              <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDelete(empleado.id)} className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white">Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </TableCell>
              </TableRow>
            )})
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground italic">
                No hay empleados registrados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
