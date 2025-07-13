
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Customer } from "@/lib/data";

const formSchema = z.object({
  name: z.string().min(3, "El nombre es requerido."),
  address: z.string().min(5, "La dirección es requerida."),
  phone: z.string().optional(),
  guarantor: z.string().optional(),
  guarantorPhone: z.string().optional(),
  loanAmount: z.coerce.number().positive("El monto debe ser positivo."),
  paymentAmount: z.coerce.number().min(0, "El monto de pago no puede ser negativo."),
  installmentsDue: z.coerce.number().min(0, "No puede ser negativo"),
  dueAmount: z.coerce.number().min(0, "El adeudo no puede ser negativo."),
});

type CustomerFormProps = {
  onSubmit: (data: any) => void;
  customer?: Customer | null;
};

export function CustomerForm({ onSubmit, customer }: CustomerFormProps) {
    const isEditing = !!customer;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: customer?.name || "",
            address: customer?.address || "",
            phone: customer?.phone || "",
            guarantor: customer?.guarantor || "",
            guarantorPhone: customer?.guarantorPhone || "",
            loanAmount: customer?.loanAmount || 0,
            paymentAmount: customer?.paymentAmount || 0,
            installmentsDue: customer?.installmentsDue || 0,
            dueAmount: customer?.dueAmount || customer?.loanAmount || 0,
        },
    });

    const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
        const dataToSend: any = { ...values };
        if (isEditing) {
            dataToSend.id = customer.id;
        }
        onSubmit(dataToSend);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input placeholder="Nombre del cliente" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Dirección</FormLabel><FormControl><Input placeholder="Dirección del cliente" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="Número de teléfono" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="guarantor" render={({ field }) => (<FormItem><FormLabel>Aval</FormLabel><FormControl><Input placeholder="Nombre del aval (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="guarantorPhone" render={({ field }) => (<FormItem><FormLabel>Teléfono del Aval</FormLabel><FormControl><Input placeholder="Teléfono del aval (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="loanAmount" render={({ field }) => (<FormItem><FormLabel>Monto Préstamo</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="paymentAmount" render={({ field }) => (<FormItem><FormLabel>Monto Pago</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="installmentsDue" render={({ field }) => (<FormItem><FormLabel>No. Vencidos</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="dueAmount" render={({ field }) => (<FormItem><FormLabel>Monto Adeudo</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <Button type="submit" className="w-full">
                    {isEditing ? 'Guardar Cambios' : 'Registrar Cliente'}
                </Button>
            </form>
        </Form>
    );
}
