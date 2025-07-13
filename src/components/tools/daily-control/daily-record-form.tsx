
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DailyRecordType, ExpenseCategory } from "@/lib/data";
import { useAuth } from "@/context/auth-context";
import { getExpenseCategories } from "@/services/expense-category-service";
import { DollarSign, Loader2, CalendarIcon } from "lucide-react";

const formSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor a cero."),
  description: z.string().min(3, "La descripción es requerida."),
  category: z.string().optional(),
});


type DailyRecordFormProps = {
  onSubmit: (data: any) => void;
  mode: DailyRecordType;
  isSubmitting: boolean;
  entryDate: Date;
  onEntryDateChange: (date: Date) => void;
};

export function DailyRecordForm({ onSubmit, mode, isSubmitting, entryDate, onEntryDateChange }: DailyRecordFormProps) {
    const { user } = useAuth();
    const [categories, setCategories] = React.useState<ExpenseCategory[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = React.useState(false);

    React.useEffect(() => {
        const fetchCategories = async () => {
            if (mode === 'spent' && user?.prefix) {
                setIsLoadingCategories(true);
                try {
                    const fetchedCategories = await getExpenseCategories(user.prefix);
                    setCategories(fetchedCategories);
                } catch (error) {
                    console.error("Failed to fetch expense categories", error);
                } finally {
                    setIsLoadingCategories(false);
                }
            }
        };
        fetchCategories();
    }, [mode, user?.prefix]);


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
                <FormItem>
                    <FormLabel>Fecha del Movimiento</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-full pl-3 text-left font-normal",
                                !entryDate && "text-muted-foreground"
                                )}
                            >
                                {entryDate ? (
                                format(entryDate, "PPP", { locale: es })
                                ) : (
                                <span>Selecciona una fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            mode="single"
                            selected={entryDate}
                            onSelect={(date) => date && onEntryDateChange(date)}
                            disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>

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
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingCategories}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={isLoadingCategories ? "Cargando..." : "Selecciona una categoría"} />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.name}>
                                            {cat.name}
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
