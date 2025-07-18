
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
import { useToast } from "@/hooks/use-toast";
import type { Customer } from "@/lib/data";
import { addPayment as addPaymentService, updateCustomer } from "@/services/customer-service";
import { addPayment as addLoanPayment } from "@/services/loan-control-service";
import { Loader2, DollarSign } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";

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
  colonia: z.string().optional(),
  cp: z.string().optional(),
  phone: z.string().optional(),
  guarantor: z.string().optional(),
  guarantorPhone: z.string().optional(),
  direccionAval: z.string().optional(),
  coloniaAval: z.string().optional(),
  cpAval: z.string().optional(),
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
  const { toast } = useToast();

  const customerForm = useForm<z.infer<typeof customerFormSchema>>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {},
  });

  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: undefined },
  });

  React.useEffect(() => {
    if (isOpen && customer) {
      customerForm.reset({
        name: customer.name,
        address: customer.address,
        colonia: customer.colonia || "",
        cp: customer.cp || "",
        phone: customer.phone || "",
        guarantor: customer.guarantor || "",
        guarantorPhone: customer.guarantorPhone || "",
        direccionAval: customer.direccionAval || "",
        coloniaAval: customer.coloniaAval || "",
        cpAval: customer.cpAval || "",
        loanAmount: customer.loanAmount,
        paymentAmount: customer.paymentAmount,
        installmentsDue: customer.installmentsDue,
        dueAmount: customer.dueAmount,
      });
      paymentForm.reset({ amount: undefined });
    }
  }, [isOpen, customer, customerForm, paymentForm]);


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
      const paymentFunction = customer.loanControlGroupId ? addLoanPayment : addPaymentService;
      await paymentFunction(customer.id, values.amount);
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
  
  if (!customer) return null;
  const isPaid = (customer.dueAmount || 0) <= 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Editar Cliente' : 'Registrar Abono'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? `Editando los datos de ${customer.name}` : `Cliente: ${customer.name}`}
          </DialogDescription>
        </DialogHeader>
        
        <div>
          {mode === 'edit' ? (
            <Form {...customerForm}>
              <form onSubmit={customerForm.handleSubmit(handleCustomerUpdate)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={customerForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={customerForm.control} name="address" render={({ field }) => (<FormItem><FormLabel>Dirección</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={customerForm.control} name="colonia" render={({ field }) => (<FormItem><FormLabel>Colonia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={customerForm.control} name="cp" render={({ field }) => (<FormItem><FormLabel>Código Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={customerForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={customerForm.control} name="guarantor" render={({ field }) => (<FormItem><FormLabel>Nombre del Aval</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={customerForm.control} name="direccionAval" render={({ field }) => (<FormItem><FormLabel>Dirección del Aval</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={customerForm.control} name="coloniaAval" render={({ field }) => (<FormItem><FormLabel>Colonia del Aval</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={customerForm.control} name="cpAval" render={({ field }) => (<FormItem><FormLabel>C.P. del Aval</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={customerForm.control} name="guarantorPhone" render={({ field }) => (<FormItem><FormLabel>Teléfono del Aval</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={customerForm.control} name="loanAmount" render={({ field }) => (<FormItem><FormLabel>Monto Préstamo</FormLabel><FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={customerForm.control} name="paymentAmount" render={({ field }) => (<FormItem><FormLabel>Monto Pago</FormLabel><FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={customerForm.control} name="installmentsDue" render={({ field }) => (<FormItem><FormLabel>No. Vencidos</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={customerForm.control} name="dueAmount" render={({ field }) => (<FormItem><FormLabel>Adeudo Actual</FormLabel><FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} disabled /></FormControl><FormMessage /></FormItem>)} />
                </div>

                <DialogFooter className="pt-4 sticky bottom-0 bg-background">
                  <Button variant="outline" onClick={onClose} type="button">Cancelar</Button>
                  <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Guardar Cambios
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <div className="space-y-6 py-4">
                <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monto Préstamo:</span><span className="font-medium">${(customer.loanAmount || 0).toLocaleString('es-MX')}</span></div>
                    <div className="flex justify-between text-lg"><span className="text-muted-foreground">Adeudo Actual:</span><span className="font-bold text-destructive">${(customer.dueAmount || 0).toLocaleString('es-MX')}</span></div>
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
                              <CurrencyInput 
                                placeholder="0.00" 
                                className="pl-9" 
                                value={field.value}
                                onValueChange={field.onChange}
                                autoFocus />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                       <Button variant="outline" onClick={onClose} type="button">Cancelar</Button>
                       <Button type="submit" disabled={isSubmitting || isPaid}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {isPaid ? 'Deuda Liquidada' : 'Registrar Abono'}
                       </Button>
                    </DialogFooter>
                  </form>
                </Form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
