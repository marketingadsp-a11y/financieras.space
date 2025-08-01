
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Send, TrendingDown, MoreHorizontal, Trash2 } from "lucide-react";
import type { FlujoCentralTransaction } from "@/lib/data";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const transactionTypes = {
  transfer_in: { label: "Recepción", icon: ArrowDown, color: "text-green-500", badge: "secondary" },
  withdrawal: { label: "Retiro", icon: TrendingDown, color: "text-red-500", badge: "destructive" },
};


export function CajaChicaHistory({ transactions, onDelete }: { transactions: FlujoCentralTransaction[], onDelete: (txId: string) => Promise<void> }) {
  if (transactions.length === 0) {
    return null; // Don't render the card if there are no transactions
  }
  
  const handleDelete = async (txId: string) => {
      await onDelete(txId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Caja Chica</CardTitle>
        <CardDescription>Últimas transacciones recibidas de las sucursales y retiros realizados.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origen/Descripción</TableHead>
              <TableHead>Realizado Por</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="w-[50px]"><span className="sr-only">Acciones</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map(tx => {
              const typeInfo = transactionTypes[tx.type];
              return (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">{format(tx.date, 'dd MMM, yyyy, p', { locale: es })}</TableCell>
                  <TableCell>
                    <Badge variant={typeInfo.badge as any} className="gap-1.5">
                        <typeInfo.icon className={`h-3 w-3`} />
                        {typeInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        {tx.type === 'transfer_in' ? (
                            <>
                                <Send className="h-4 w-4" />
                                <span>Desde: {tx.sucursalName}</span>
                            </>
                        ) : (
                            <span>{tx.description}</span>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{tx.userPerformed}</TableCell>
                  <TableCell className={cn("text-right font-semibold", typeInfo.color)}>
                     {tx.type === 'withdrawal' ? '-' : ''}${tx.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
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
                                    Esta acción es irreversible y revertirá la transacción. El balance de la sucursal (si aplica) y de la caja chica se ajustarán.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(tx.id)}>Sí, eliminar transacción</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
