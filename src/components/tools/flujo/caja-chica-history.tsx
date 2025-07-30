
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Send, Building } from "lucide-react";
import type { FlujoCentralTransaction } from "@/lib/data";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const transactionTypes = {
  transfer_in: { label: "Recepción", icon: ArrowDown, color: "text-green-500", badge: "secondary" },
  // Add other types if they exist in the future
};


export function CajaChicaHistory({ transactions }: { transactions: FlujoCentralTransaction[] }) {
  if (transactions.length === 0) {
    return null; // Don't render the card if there are no transactions
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Caja Chica</CardTitle>
        <CardDescription>Últimas transferencias recibidas de las sucursales.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Realizado Por</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map(tx => {
              const typeInfo = transactionTypes[tx.type];
              return (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">{format(tx.date, 'dd MMM, yyyy', { locale: es })}</TableCell>
                  <TableCell>
                    <Badge variant={typeInfo.badge as any} className="gap-1.5">
                        <typeInfo.icon className={`h-3 w-3`} />
                        {typeInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Building className="h-4 w-4" />
                        <span>{tx.sucursalName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{tx.userPerformed}</TableCell>
                  <TableCell className={cn("text-right font-semibold", typeInfo.color)}>
                    ${tx.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
