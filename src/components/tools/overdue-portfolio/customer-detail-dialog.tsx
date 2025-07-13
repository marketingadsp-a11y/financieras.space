
"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { Customer } from "@/lib/data";
import { addPayment } from "@/services/customer-service";
import { Loader2, DollarSign } from "lucide-react";

type CustomerDetailDialogProps = {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
};

const paymentSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor a cero."),
});

export function CustomerDetailDialog({ customer, isOpen, onClose, onPaymentSuccess }: CustomerDetailDialogProps) {
  const [isSubmittingPayment, setIsSubmittingPayment] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: undefined,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const handlePaymentSubmit = async (values: z.infer<typeof paymentSchema>) => {
    setIsSubmittingPayment(true);
    try {
      await addPayment(customer.id, values.amount);
      toast({ title: "Éxito", description: "Abono registrado correctamente." });
      onPaymentSuccess();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "No se pudo registrar el abono.";
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const isPaid = customer.status === 'Pagado';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Abono a {customer.name}</DialogTitle>
          <DialogDescription>
            {customer.address}
          </DialogDescription>
        </DialogHeader>
        <div className="p-4">
          <div className="mb-6 space-y-2 rounded-lg border bg-muted/30 p-4">
              <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monto Préstamo:</span>
                  <span className="font-medium">{formatCurrency(customer.loanAmount)}</span>
              </div>
              <div className="flex justify-between text-lg">
                  <span className="text-muted-foreground">Adeudo Actual:</span>
                  <span className="font-bold text-destructive">{formatCurrency(customer.dueAmount)}</span>
              </div>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handlePaymentSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto a Abonar</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="number" step="0.01" placeholder="0.00" className="pl-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmittingPayment || isPaid} className="w-full">
                {isSubmittingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPaid ? 'Deuda Liquidada' : 'Registrar Abono'}
              </Button>
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
