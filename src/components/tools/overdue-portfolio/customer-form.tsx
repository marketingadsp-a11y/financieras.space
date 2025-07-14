
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const formSchema = z.object({
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
  paymentAmount: z.coerce.number().min(0, "El monto de pago no puede ser negativo."),
  installmentsDue: z.coerce.number().min(0, "No puede ser negativo"),
  dueAmount: z.coerce.number().min(0, "El adeudo no puede ser negativo."),
  fechaPrestamo: z.date().optional(),
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
            colonia: customer?.colonia || "",
            cp: customer?.cp || "",
            phone: customer?.phone || "",
            guarantor: customer?.guarantor || "",
            guarantorPhone: customer?.guarantorPhone || "",
            direccionAval: customer?.direccionAval || "",
            coloniaAval: customer?.coloniaAval || "",
            cpAval: customer?.cpAval || "",
            loanAmount: customer?.loanAmount || undefined,
            paymentAmount: customer?.paymentAmount || 0,
            installmentsDue: customer?.installmentsDue || 0,
            dueAmount: customer?.dueAmount || customer?.loanAmount || undefined,
            fechaPrestamo: customer?.fechaPrestamo ? new Date(customer.fechaPrestamo) : new Date(),
        },
    });
    
    // Watch loanAmount to auto-update dueAmount
    const loanAmount = form.watch("loanAmount");
    React.useEffect(() => {
        if (loanAmount && !form.getValues("dueAmount")) {
            form.setValue("dueAmount", loanAmount);
        }
    }, [loanAmount, form]);


    const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
        const dataToSend: any = { ...values };
        if (isEditing) {
            dataToSend.id = customer.id;
        }
        onSubmit(dataToSend);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-4 p-4 border rounded-lg">
                        <h4 className="font-semibold text-lg">Información del Cliente</h4>
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input placeholder="Nombre del cliente" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Dirección</FormLabel><FormControl><Input placeholder="Calle y número" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="colonia" render={({ field }) => (<FormItem><FormLabel>Colonia</FormLabel><FormControl><Input placeholder="Colonia" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="cp" render={({ field }) => (<FormItem><FormLabel>Código Postal</FormLabel><FormControl><Input placeholder="C.P." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="Número de teléfono" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                     <div className="space-y-4 p-4 border rounded-lg">
                        <h4 className="font-semibold text-lg">Información del Aval</h4>
                        <FormField control={form.control} name="guarantor" render={({ field }) => (<FormItem><FormLabel>Nombre del Aval</FormLabel><FormControl><Input placeholder="Nombre (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="direccionAval" render={({ field }) => (<FormItem><FormLabel>Dirección del Aval</FormLabel><FormControl><Input placeholder="Calle y número (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="coloniaAval" render={({ field }) => (<FormItem><FormLabel>Colonia del Aval</FormLabel><FormControl><Input placeholder="Colonia (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="cpAval" render={({ field }) => (<FormItem><FormLabel>C.P. del Aval</FormLabel><FormControl><Input placeholder="C.P. (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="guarantorPhone" render={({ field }) => (<FormItem><FormLabel>Teléfono del Aval</FormLabel><FormControl><Input placeholder="Teléfono (opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <div className="space-y-4 p-4 border rounded-lg">
                         <h4 className="font-semibold text-lg">Información del Préstamo</h4>
                        <FormField control={form.control} name="fechaPrestamo" render={({ field }) => (
                             <FormItem className="flex flex-col"><FormLabel>Fecha de Préstamo</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                                        {field.value ? (format(field.value, "PPP", { locale: es })) : (<span>Selecciona fecha</span>)}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                                    </PopoverContent>
                                </Popover>
                             <FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="loanAmount" render={({ field }) => (<FormItem><FormLabel>Monto Préstamo</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="paymentAmount" render={({ field }) => (<FormItem><FormLabel>Monto Pago</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="installmentsDue" render={({ field }) => (<FormItem><FormLabel>No. Vencidos</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="dueAmount" render={({ field }) => (<FormItem><FormLabel>Monto Adeudo</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </div>
                <Button type="submit" className="w-full">
                    {isEditing ? 'Guardar Cambios' : 'Registrar Cliente'}
                </Button>
            </form>
        </Form>
    );
}
