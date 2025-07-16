
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Send } from "lucide-react";
import type { CentralAccountTransaction } from "@/lib/data";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const transactionTypes = {
  deposit: { label: "Depósito", icon: ArrowUp, color: "text-green-500", badge: "secondary" },
  withdrawal: { label: "Retiro", icon: ArrowDown, color: "text-red-500", badge: "destructive" },
  assignment: { label: "Asignación", icon: Send, color: "text-blue-500", badge: "default" },
};


export function RecentTransactions({ transactions }: { transactions: CentralAccountTransaction[] }) {
  if (transactions.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Movimientos Recientes</CardTitle>
                <CardDescription>No se han realizado transacciones en la cuenta central todavía.</CardDescription>
            </CardHeader>
        </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Movimientos Recientes</CardTitle>
        <CardDescription>Últimas transacciones realizadas en la cuenta de Capital Central.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descripción</TableHead>
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
                    <Badge variant={typeInfo.badge as any}>
                        <typeInfo.icon className={`mr-1 h-3 w-3`} />
                        {typeInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{tx.description}</TableCell>
                  <TableCell className="text-muted-foreground">{tx.userPerformed}</TableCell>
                  <TableCell className={`text-right font-semibold ${typeInfo.color}`}>
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
