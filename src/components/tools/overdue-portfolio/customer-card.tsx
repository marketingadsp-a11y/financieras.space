
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Pencil, User, Phone } from "lucide-react";
import type { Customer } from "@/lib/data";

type CustomerCardProps = {
  customer: Customer;
  onEdit: (customer: Customer) => void;
};

export function CustomerCard({ customer, onEdit }: CustomerCardProps) {
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

  return (
    <Card className="flex flex-col">
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
            <p className="font-bold text-destructive">${customer.dueAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center pt-0">
          <Button variant="outline" className="w-full mr-2" onClick={() => onEdit(customer)}>
              <Pencil className="mr-2 h-4 w-4"/> Editar
          </Button>
          <Button className="w-full">
              <DollarSign className="mr-2 h-4 w-4"/> Abonar
          </Button>
      </CardFooter>
    </Card>
  );
}
