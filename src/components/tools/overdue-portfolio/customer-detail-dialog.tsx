
"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { Customer, Payment } from "@/lib/data";
import { addPayment } from "@/services/customer-service";
import { getPaymentsByCustomer } from "@/services/payment-service";
import { Loader2, DollarSign, Info } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: undefined,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      const fetchPayments = async () => {
        setIsLoading(true);
        try {
          const paymentHistory = await getPaymentsByCustomer(customer.id);
          setPayments(paymentHistory);
        } catch (error) {
          toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el historial de pagos." });
        } finally {
          setIsLoading(false);
        }
      };
      fetchPayments();
      form.reset();
    }
  }, [isOpen, customer.id, toast, form]);

  const handlePaymentSubmit = async (values: z.infer<typeof paymentSchema>) => {
    setIsLoading(true);
    try {
      await addPayment(customer.id, customer.plazaId, values.amount);
      toast({ title: "Éxito", description: "Abono registrado correctamente." });
      onPaymentSuccess();
      onClose(); // Close dialog on success
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "No se pudo registrar el abono.";
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const isPaid = customer.status === 'Pagado';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{customer.name}</DialogTitle>
          <DialogDescription>
            {customer.address}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="payment" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payment" disabled={isPaid}>Registrar Abono</TabsTrigger>
            <TabsTrigger value="history">Historial de Pagos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="payment">
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
                  <Button type="submit" disabled={isLoading || isPaid} className="w-full">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isPaid ? 'Deuda Liquidada' : 'Registrar Abono'}
                  </Button>
                </form>
              </Form>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <ScrollArea className="h-80 w-full p-1">
              {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
              ) : payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Abono</TableHead>
                      <TableHead className="text-right">Adeudo Anterior</TableHead>
                      <TableHead className="text-right">Adeudo Nuevo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{format(new Date(payment.date), "dd/MMM/yyyy", { locale: es })}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(payment.previousDueAmount)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(payment.newDueAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                  <Info className="h-8 w-8 mb-2"/>
                  <p>No se han registrado pagos para este cliente.</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
