"use client";
 
import * as React from "react";
import { MoreHorizontal, Pencil, Trash2, ShieldCheck, Award } from "lucide-react";
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
import type { VacationRule } from "@/lib/data";
 
type VacationRulesTableProps = {
  data: VacationRule[];
  onEdit: (rule: VacationRule) => void;
  onDelete: (id: string) => void;
};
 
export function VacationRulesTable({ data, onEdit, onDelete }: VacationRulesTableProps) {
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
          <TableRow>
            <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs">Años de Antigüedad</TableHead>
            <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-xs">Días de Vacaciones</TableHead>
            <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300 text-xs">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.sort((a,b) => a.year - b.year).map((rule) => (
              <TableRow key={rule.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                <TableCell className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-500 opacity-80" />
                    {rule.year} {rule.year === 1 ? 'año' : 'años'}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-primary opacity-80" />
                    {rule.days} {rule.days === 1 ? 'día' : 'días'}
                  </span>
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
                            <DropdownMenuItem onSelect={() => onEdit(rule)} className="text-xs cursor-pointer">
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
                                Esta acción eliminará permanentemente la regla de vacaciones para antigüedad de <strong className="text-slate-800 dark:text-slate-200">{rule.year} {rule.year === 1 ? 'año' : 'años'}</strong>.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-4 gap-2">
                            <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(rule.id)} className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center text-xs text-muted-foreground italic">
                No hay reglas de vacaciones registradas.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
