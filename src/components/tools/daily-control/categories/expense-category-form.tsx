
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { icons } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ExpenseCategory } from "@/lib/data";

const formSchema = z.object({
  name: z.string().min(2, "El nombre de la categoría es requerido."),
  icon: z.string().min(1, "El ícono es requerido."),
});

type ExpenseCategoryFormProps = {
  onSubmit: (data: Omit<ExpenseCategory, 'id'>) => void;
  category?: ExpenseCategory | null;
};

const iconNames = [
    'Fuel', 'Car', 'Wrench', 'UtensilsCrossed', 'Home', 'Phone',
    'HeartHandshake', 'HandCoins', 'Landmark', 'Briefcase',
    'PiggyBank', 'Receipt', 'Plane', 'ShoppingBasket', 'Shirt'
] as (keyof typeof icons)[];

const LucideIcon = ({ name, className }: { name: keyof typeof icons, className?: string }) => {
    const IconComponent = icons[name];
    if (!IconComponent) return null;
    return <IconComponent className={className} />;
};

export function ExpenseCategoryForm({ onSubmit, category }: ExpenseCategoryFormProps) {
    const isEditing = !!category;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: category?.name || "",
            icon: category?.icon || "",
        },
    });

    const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
        const dataToSend: any = { ...values };
        if (isEditing) {
            dataToSend.id = category.id;
        }
        onSubmit(dataToSend);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre de la Categoría</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej. Gasolina, Comida, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="icon"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Ícono</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un ícono" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <ScrollArea className="h-72">
                                        {iconNames.map(iconName => (
                                            <SelectItem key={iconName} value={iconName}>
                                                <div className="flex items-center gap-2">
                                                    <LucideIcon name={iconName} className="h-4 w-4" />
                                                    <span>{iconName}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </ScrollArea>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full">
                    {isEditing ? 'Guardar Cambios' : 'Crear Categoría'}
                </Button>
            </form>
        </Form>
    );
}
