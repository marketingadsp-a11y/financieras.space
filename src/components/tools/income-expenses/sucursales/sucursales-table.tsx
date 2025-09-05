
"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Trash2, Building, DollarSign, PiggyBank, Briefcase, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Sucursal } from "@/lib/data";
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
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type SucursalTableProps = {
    data: Sucursal[];
    onEdit: (sucursal: Sucursal) => void;
    onDelete: (id: string) => void;
    onAdjustBalance: (sucursal: Sucursal) => void;
}

export function SucursalesTable({ data, onEdit, onDelete, onAdjustBalance }: SucursalTableProps) {
  const [filter, setFilter] = React.useState("");
  
  const filteredData = data.filter((s) =>
    s.name.toLowerCase().includes(filter.toLowerCase()) ||
    s.manager.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <>
      <div className="flex items-center pb-4">
        <Input
          placeholder="Buscar por nombre o encargado..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Encargado</TableHead>
              <TableHead>Caja Chica</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((sucursal) => (
                <TableRow key={sucursal.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={sucursal.logoUrl} alt={sucursal.name} />
                            <AvatarFallback><Building className="h-4 w-4"/></AvatarFallback>
                        </Avatar>
                        <span>{sucursal.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{sucursal.manager}</TableCell>
                  <TableCell>
                      <div className="flex items-center gap-2 font-semibold">
                        <PiggyBank className="h-4 w-4 text-muted-foreground"/>
                        {(sucursal.currentBalance || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
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
                              <DropdownMenuItem onSelect={() => onEdit(sucursal)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar Datos
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => onAdjustBalance(sucursal)}>
                                <Settings2 className="mr-2 h-4 w-4" /> Ajustar Saldo
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar Sucursal
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente la sucursal. El balance de la sucursal NO se devolverá al capital central.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDelete(sucursal.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No se encontraron sucursales.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
