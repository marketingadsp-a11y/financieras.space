
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as React from "react";
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
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(3, "El nombre del bono es requerido."),
  percentage: z.coerce.number().min(0, "El porcentaje no puede ser negativo.").max(100, "El porcentaje no puede ser mayor a 100."),
});

export type BonusFormValues = z.infer<typeof formSchema>;
type Bonus = { id: string; name: string; percentage: number; }

type BonusFormProps = {
  onSubmit: (data: BonusFormValues) => void;
  bonus?: Bonus | null;
  isSubmitting?: boolean;
};

export function BonusForm({ onSubmit, bonus, isSubmitting }: BonusFormProps) {
    const isEditing = !!bonus;

    const form = useForm<BonusFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: bonus?.name || "",
            percentage: bonus?.percentage || 0,
        },
    });
    
    React.useEffect(() => {
        if(bonus) form.reset(bonus);
    }, [bonus, form]);


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre del Bono</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej. Bono de puntualidad" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="percentage"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Porcentaje del Bono</FormLabel>
                            <div className="relative">
                                <Input type="number" placeholder="Ej. 10" {...field} />
                                <span className="absolute inset-y-0 right-3 flex items-center text-muted-foreground">%</span>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {isEditing ? 'Guardar Cambios' : 'Crear Bono'}
                </Button>
            </form>
        </Form>
    );
}
