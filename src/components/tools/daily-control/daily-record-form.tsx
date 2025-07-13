
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { DailyRecordType } from "@/lib/data";
import { expenseCategories } from "@/lib/data";
import { DollarSign, Loader2 } from "lucide-react";

const formSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor a cero."),
  description: z.string().min(3, "La descripción es requerida."),
  category: z.string().optional(),
});


type DailyRecordFormProps = {
  onSubmit: (data: any) => void;
  mode: DailyRecordType;
  isSubmitting: boolean;
};

export function DailyRecordForm({ onSubmit, mode, isSubmitting }: DailyRecordFormProps) {

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema.refine(data => mode !== 'spent' || !!data.category, {
            message: "La categoría es requerida para los gastos.",
            path: ["category"],
        })),
        defaultValues: {
            amount: undefined,
            description: "",
            category: undefined,
        },
    });

    const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
        const dataToSend: any = { ...values, type: mode };
        onSubmit(dataToSend);
        form.reset();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Monto</FormLabel>
                             <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="0.00" className="pl-9" {...field} autoFocus />
                              </FormControl>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Ej. Abono cliente, Préstamo nuevo, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {mode === 'spent' && (
                     <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Categoría de Gasto</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una categoría" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {expenseCategories.map(cat => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Registrar Movimiento
                </Button>
            </form>
        </Form>
    );
}
