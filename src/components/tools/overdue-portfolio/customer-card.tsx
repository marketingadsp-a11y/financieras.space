

"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Pencil, User, Phone, MessageCircle, Trash2, Mail } from "lucide-react";
import type { Customer } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

type CustomerCardProps = {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onPayment: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onSendSms: (customer: Customer) => void;
  promoterColor?: string;
  groupColor?: string;
  whatsappLink?: string;
};

export function CustomerCard({ customer, onEdit, onPayment, onDelete, onSendSms, promoterColor, groupColor, whatsappLink }: CustomerCardProps) {
  const { hasPermission } = useAuth();
  
  const canSendWhatsapp = hasPermission('cartera-vencida', 'CAN_SEND_WHATSAPP');
  const canSendSms = hasPermission('cartera-vencida', 'CAN_SEND_SMS');
  const canEdit = hasPermission('cartera-vencida', 'CAN_EDIT_CUSTOMER');
  const canPay = hasPermission('cartera-vencida', 'CAN_PROCESS_PAYMENTS');
  const canDelete = hasPermission('cartera-vencida', 'CAN_DELETE_CUSTOMER');

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
       <div className="flex">
          {customer.groupName && (
             <div style={{ backgroundColor: groupColor, color: getTextColorForBackground(groupColor || '') }} className="px-3 py-1 text-center font-semibold text-xs flex-grow">
              {customer.groupName}
            </div>
          )}
          {customer.promoter && (
            <div style={{ backgroundColor: promoterColor, color: getTextColorForBackground(promoterColor || '') }} className="px-3 py-1 text-center font-semibold text-xs flex-grow">
              {customer.promoter}
            </div>
          )}
      </div>
      <CardHeader className="p-4 relative">
        <div className="absolute top-2 right-2">
            <Badge variant={getStatusBadgeVariant(customer.status)} className="capitalize shrink-0 group-hover:opacity-0 transition-opacity">
                {customer.status}
            </Badge>
            {canDelete && (
             <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive absolute top-0 right-0" onClick={() => onDelete(customer)}>
                <Trash2 className="h-4 w-4" />
            </Button>
            )}
        </div>
        <CardTitle className="text-base font-bold line-clamp-2 pr-12">{customer.name}</CardTitle>
        <p className="text-sm text-muted-foreground pt-1">{customer.address}</p>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3 flex-grow">
        <div className="space-y-1 text-sm">
          <div className="flex items-center">
            <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{customer.phone || 'No disponible'}</span>
          </div>
          <div className="flex items-center">
            <User className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{customer.guarantor || 'Sin aval'}</span>
          </div>
        </div>
        <div className="flex justify-between items-end border-t pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Préstamo</p>
            <p className="font-semibold">${customer.loanAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Adeudo</p>
            <p className={cn("font-bold text-base", customer.dueAmount > 0 ? "text-destructive" : "")}>
              ${customer.dueAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-center p-3 pt-0 space-y-2 bg-muted/30">
          {(canEdit || canPay) && (
            <div className="flex w-full space-x-2">
              {canEdit && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => onEdit(customer)}>
                    <Pencil className="mr-2 h-4 w-4"/> Editar
                </Button>
              )}
              {canPay && (
                <Button size="sm" className="w-full" onClick={() => onPayment(customer)} disabled={isPaid}>
                    <DollarSign className="mr-2 h-4 w-4"/> Abonar
                </Button>
              )}
            </div>
          )}
          {canSendWhatsapp && (
            <Button variant="outline" size="sm" className="w-full border-green-600 text-green-700 hover:bg-green-100 hover:text-green-800" asChild>
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" onClick={handleWhatsAppClick} aria-disabled={!whatsappLink}>
                  <MessageCircle className="mr-2 h-4 w-4"/> Enviar WhatsApp
                </a>
            </Button>
          )}
          {canSendSms && (
            <Button variant="outline" size="sm" className="w-full border-blue-600 text-blue-700 hover:bg-blue-100 hover:text-blue-800" onClick={() => onSendSms(customer)} disabled={!customer.phone}>
                  <Mail className="mr-2 h-4 w-4"/> Enviar SMS
            </Button>
          )}
      </CardFooter>
    </Card>
  );
}
