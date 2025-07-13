
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Pencil, User, Phone } from "lucide-react";
import type { Customer } from "@/lib/data";
import { cn } from "@/lib/utils";

type CustomerCardProps = {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onPayment: (customer: Customer) => void;
};

export function CustomerCard({ customer, onEdit, onPayment }: CustomerCardProps) {
  const getStatusBadgeVariant = (status: Customer['status']) => {
    switch (status) {
      case 'Pendiente':
        return 'destructive';
      case 'Pagado':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const isPaid = customer.status === 'Pagado';

  return (
    <Card className={cn("flex flex-col", isPaid && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800")}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-bold">{customer.name}</CardTitle>
          <Badge variant={getStatusBadgeVariant(customer.status)} className="capitalize">
            {customer.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground pt-1">{customer.address}</p>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        <div className="space-y-2 text-sm">
          <div className="flex items-center">
            <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{customer.phone || 'No disponible'}</span>
          </div>
          <div className="flex items-center">
            <User className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{customer.guarantor || 'Sin aval'}</span>
          </div>
        </div>
        <div className="flex justify-between items-end border-t pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Préstamo</p>
            <p className="font-semibold">${customer.loanAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Adeudo</p>
            <p className={cn("font-bold", customer.dueAmount > 0 ? "text-destructive" : "")}>
              ${customer.dueAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center pt-0 space-x-2">
          <Button variant="outline" size="sm" className="w-full" onClick={() => onEdit(customer)}>
              <Pencil className="mr-2 h-4 w-4"/> Editar
          </Button>
          <Button size="sm" className="w-full" onClick={() => onPayment(customer)} disabled={isPaid}>
              <DollarSign className="mr-2 h-4 w-4"/> Abonar
          </Button>
      </CardFooter>
    </Card>
  );
}
