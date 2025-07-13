
"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
import { useToast } from "@/hooks/use-toast";
import type { Customer, Payment } from "@/lib/data";
import { addPayment, updateCustomer } from "@/services/customer-service";
import { getPaymentsByCustomer } from "@/services/payment-service";
import { Loader2, DollarSign, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";

type CustomerEditDialogProps = {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'edit' | 'payment';
};

const customerFormSchema = z.object({
  name: z.string().min(3, "El nombre es requerido."),
  address: z.string().min(5, "La dirección es requerida."),
  phone: z.string().optional(),
  guarantor: z.string().optional(),
  guarantorPhone: z.string().optional(),
  loanAmount: z.coerce.number().positive("El monto debe ser positivo."),
  paymentAmount: z.coerce.number().min(0, "El monto de pago debe ser positivo."),
  installmentsDue: z.coerce.number().min(0, "Debe ser un número positivo."),
  dueAmount: z.coerce.number().min(0, "El adeudo no puede ser negativo."),
});

const paymentSchema = z.object({
  amount: z.coerce.number().positive("El monto a abonar debe ser mayor a cero."),
});

export function CustomerEditDialog({ customer, isOpen, onClose, onSuccess, mode }: CustomerEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);

  const { toast } = useToast();

  const customerForm = useForm<z.infer<typeof customerFormSchema>>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {},
  });

  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: undefined },
  });
  
  const fetchPayments = React.useCallback(async (customerId: string) => {
    setIsLoadingHistory(true);
    try {
      const paymentHistory = await getPaymentsByCustomer(customerId);
      setPayments(paymentHistory);
    } catch (error) {
       toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el historial de pagos." });
       setPayments([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [toast]);


  React.useEffect(() => {
    if (isOpen && customer) {
      customerForm.reset({
        name: customer.name,
        address: customer.address,
        phone: customer.phone || "",
        guarantor: customer.guarantor || "",
        guarantorPhone: customer.guarantorPhone || "",
        loanAmount: customer.loanAmount,
        paymentAmount: customer.paymentAmount,
        installmentsDue: customer.installmentsDue,
        dueAmount: customer.dueAmount,
      });
      paymentForm.reset({ amount: undefined });
      fetchPayments(customer.id);
    }
  }, [isOpen, customer, customerForm, paymentForm, fetchPayments]);


  const handleCustomerUpdate = async (values: z.infer<typeof customerFormSchema>) => {
    if (!customer) return;
    setIsSubmitting(true);
    try {
      await updateCustomer(customer.id, values);
      toast({ title: "Éxito", description: "Cliente actualizado." });
      onSuccess();
      onClose();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el cliente." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (values: z.infer<typeof paymentSchema>) => {
    if (!customer) return;
    setIsSubmitting(true);
    try {
      await addPayment(customer.id, values.amount);
      toast({ title: "Éxito", description: "Abono registrado." });
      onSuccess();
      onClose(); 
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "No se pudo registrar el abono.";
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const exportHistory = () => {
    if(!customer || payments.length === 0) return;
    const doc = new jsPDF();
    doc.text(`Historial de Pagos - ${customer.name}`, 14, 16);
    doc.text(`Dirección: ${customer.address}`, 14, 22);
    autoTable(doc, {
      head: [['Fecha', 'Monto']],
      body: payments.map(p => [
        new Date(p.date).toLocaleString('es-MX'),
        `$${p.amount.toLocaleString('es-MX')}`,
      ]),
      startY: 30,
    });
    doc.save(`historial_${customer.name?.replace(/\s/g, '_')}.pdf`);
  };

  if (!customer) return null;
  const isPaid = customer.status === 'Pagado';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Ver / Editar Cliente' : 'Registrar Abono'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? `Editando los datos de ${customer.name}` : `Cliente: ${customer.name}`}
          </DialogDescription>
        </DialogHeader>

        {mode === 'edit' ? (
          <Form {...customerForm}>
            <form onSubmit={customerForm.handleSubmit(handleCustomerUpdate)} className="space-y-4 px-1 py-4">
              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={customerForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={customerForm.control} name="address" render={({ field }) => (<FormItem><FormLabel>Dirección</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={customerForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={customerForm.control} name="guarantor" render={({ field }) => (<FormItem><FormLabel>Nombre del Aval</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={customerForm.control} name="guarantorPhone" render={({ field }) => (<FormItem><FormLabel>Teléfono del Aval</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={customerForm.control} name="loanAmount" render={({ field }) => (<FormItem><FormLabel>Monto del Préstamo ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={customerForm.control} name="paymentAmount" render={({ field }) => (<FormItem><FormLabel>Monto de Pago ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={customerForm.control} name="installmentsDue" render={({ field }) => (<FormItem><FormLabel>No. Vencidos</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={customerForm.control} name="dueAmount" render={({ field }) => (<FormItem><FormLabel>Adeudo Actual ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} disabled /></FormControl><FormMessage /></FormItem>)} />
              </div>

               <DialogFooter className="pt-4 !justify-between">
                <Button variant="ghost" onClick={exportHistory} type="button" disabled={payments.length === 0}>
                    <FileText className="mr-2"/> Exportar Historial
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onClose} type="button">Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Cambios
                    </Button>
                </div>
               </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="p-4">
              <div className="mb-6 space-y-2 rounded-lg border bg-muted/30 p-4">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monto Préstamo:</span><span className="font-medium">${customer.loanAmount.toLocaleString('es-MX')}</span></div>
                  <div className="flex justify-between text-lg"><span className="text-muted-foreground">Adeudo Actual:</span><span className="font-bold text-destructive">${customer.dueAmount.toLocaleString('es-MX')}</span></div>
              </div>
              <Form {...paymentForm}>
                <form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)} className="space-y-4">
                  <FormField
                    control={paymentForm.control}
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
                  <Button type="submit" disabled={isSubmitting || isPaid} className="w-full">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isPaid ? 'Deuda Liquidada' : 'Registrar Abono'}
                  </Button>
                </form>
              </Form>
          </div>
        )}

        <Separator />
        
        {/* Payment History */}
        <div className="px-1 space-y-4">
          <h3 className="text-lg font-semibold">Historial de Pagos</h3>
           {isLoadingHistory ? (
            <div className="flex justify-center items-center h-24">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" /> <span>Cargando historial...</span>
            </div>
           ) : payments.length > 0 ? (
                <div className="rounded-md border max-h-60 overflow-y-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {payments.map((payment) => (
                            <TableRow key={payment.id}>
                                <TableCell>{new Date(payment.date).toLocaleString('es-MX')}</TableCell>
                                <TableCell className="text-right font-medium text-green-600">${payment.amount.toLocaleString('es-MX')}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No se han registrado pagos para este cliente.</p>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
