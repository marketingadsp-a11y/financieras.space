
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Pencil, User, Phone, UserSquare, MessageCircle, Trash2, Send, Mail } from "lucide-react";
import type { Customer } from "@/lib/data";
import { cn } from "@/lib/utils";

type CustomerCardProps = {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onPayment: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  promoterColor?: string;
  whatsappLink?: string;
};

export function CustomerCard({ customer, onEdit, onPayment, onDelete, promoterColor, whatsappLink }: CustomerCardProps) {
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

  // Helper to determine text color (black or white) based on background hex/hsl color
  const getTextColorForBackground = (color: string): string => {
    if (!color) return '#18181b'; // Default dark text
    
    // Simple check for HSL format
    if (color.startsWith('hsl')) {
      try {
        const lightness = parseInt(color.split(',')[2]?.replace('%', '').trim() || '0');
        return lightness > 60 ? '#000000' : '#ffffff';
      } catch {
        return '#18181b';
      }
    }
    return '#18181b'; // Default for non-hsl
  };
  
  const handleWhatsAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!whatsappLink) {
      e.preventDefault();
    }
  };

  return (
    <Card className={cn("flex flex-col overflow-hidden group", isPaid && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800")}>
      {customer.promoter && (
        <div style={{ backgroundColor: promoterColor, color: getTextColorForBackground(promoterColor || '') }} className="p-2 text-center font-semibold text-sm">
          {customer.promoter}
        </div>
      )}
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle className="text-base font-bold pr-2">{customer.name}</CardTitle>
            <div className="flex items-center flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive" onClick={() => onDelete(customer)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
                <Badge variant={getStatusBadgeVariant(customer.status)} className="capitalize ml-1">
                    {customer.status}
                </Badge>
            </div>
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
      <CardFooter className="flex flex-col items-center pt-0 space-y-2">
          <div className="flex w-full space-x-2">
            <Button variant="outline" size="sm" className="w-full" onClick={() => onEdit(customer)}>
                <Pencil className="mr-2 h-4 w-4"/> Editar
            </Button>
            <Button size="sm" className="w-full" onClick={() => onPayment(customer)} disabled={isPaid}>
                <DollarSign className="mr-2 h-4 w-4"/> Abonar
            </Button>
          </div>
           <Button variant="outline" size="sm" className="w-full border-green-600 text-green-700 hover:bg-green-100 hover:text-green-800" asChild>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" onClick={handleWhatsAppClick} aria-disabled={!whatsappLink}>
                <MessageCircle className="mr-2 h-4 w-4"/> Enviar WhatsApp
              </a>
          </Button>
      </CardFooter>
    </Card>
  );
}
