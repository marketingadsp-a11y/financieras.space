
"use client";

import * as React from "react";
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
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign, ArrowDown, ArrowUp, icons } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import type { ExpenseCategory } from "@/lib/data";
import { getExpenseCategories } from "@/services/expense-category-service";
import { useAuth } from "@/context/auth-context";


type SucursalTransactionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: 'expense' | 'deposit';
    amount: number;
    description: string;
    category?: string;
    executive?: string;
  }) => Promise<boolean>;
  currentBalance: number;
};

const formSchema = z.object({
    type: z.enum(['deposit', 'expense']),
    category: z.string().optional(),
    amount: z.coerce.number().positive("El monto debe ser un número positivo."),
    executive: z.string().optional(),
    description: z.string().optional(),
}).refine(data => data.type !== 'expense' || !!data.category, {
    message: "La categoría es requerida para los gastos.",
    path: ["category"],
});

type FormValues = z.infer<typeof formSchema>;


const LucideIcon = ({ name, className }: { name: keyof typeof icons, className?: string }) => {
    const IconComponent = icons[name];
    if (!IconComponent) return null;
    return <IconComponent className={className} />;
};


export function SucursalTransactionDialog({ isOpen, onClose, onSubmit }: SucursalTransactionDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [categories, setCategories] = React.useState<ExpenseCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = React.useState(false);
  const { user } = useAuth();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        type: 'expense',
        amount: undefined,
    }
  });

  const watchType = form.watch('type');

  React.useEffect(() => {
    if (watchType === 'expense' && user?.prefix) {
      setIsLoadingCategories(true);
      getExpenseCategories(user.prefix)
        .then(setCategories)
        .catch(() => console.error("Failed to load categories"))
        .finally(() => setIsLoadingCategories(false));
    }
  }, [watchType, user?.prefix]);


  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    const finalDescription = `${values.executive ? `[${values.executive}] ` : ''}${values.description || ''}`.trim();

    const success = await onSubmit({
        type: values.type,
        amount: values.amount,
        description: finalDescription,
        category: values.category,
        executive: values.executive
    });

    setIsSubmitting(false);

    if (success) {
      handleClose();
    }
  };
  
  const handleClose = () => {
    form.reset({ type: 'expense', amount: undefined, category: undefined, description: undefined, executive: undefined });
    onClose();
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Nueva Transacción</DialogTitle>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
                
                {/* Step 1: Type */}
                <div className="space-y-2">
                    <Label>1. Elige el tipo de movimiento</Label>
                    <div className="grid grid-cols-2 gap-4">
                       <div 
                         onClick={() => form.setValue('type', 'expense')}
                         className={cn(
                             "flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors",
                             watchType === 'expense' ? "border-destructive bg-destructive/10 text-destructive" : "hover:bg-muted/50"
                         )}
                       >
                            <ArrowDown className="h-6 w-6"/>
                            <span className="font-semibold">Gasto</span>
                       </div>
                       <div 
                         onClick={() => form.setValue('type', 'deposit')}
                         className={cn(
                             "flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors",
                             watchType === 'deposit' ? "border-green-500 bg-green-500/10 text-green-600" : "hover:bg-muted/50"
                         )}
                       >
                            <ArrowUp className="h-6 w-6"/>
                            <span className="font-semibold">Ingreso</span>
                       </div>
                    </div>
                </div>

                {/* Step 2: Category (only for expenses) */}
                {watchType === 'expense' && (
                    <div className="space-y-2">
                         <Label>2. Selecciona una categoría</Label>
                         <FormField 
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="grid grid-cols-3 gap-2">
                                        {isLoadingCategories ? (
                                            <p className="col-span-3 text-sm text-muted-foreground">Cargando categorías...</p>
                                        ) : categories.length > 0 ? (
                                            categories.map(cat => (
                                                 <div 
                                                    key={cat.id}
                                                    onClick={() => field.onChange(cat.name)}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-3 cursor-pointer transition-colors text-center h-20",
                                                        field.value === cat.name ? "border-primary bg-primary/10" : "hover:bg-muted/50"
                                                    )}
                                                >
                                                    <LucideIcon name={cat.icon as keyof typeof icons} className="h-6 w-6 text-primary/80"/>
                                                    <span className="text-xs font-medium">{cat.name}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="col-span-3 text-sm text-muted-foreground">No hay categorías de gasto. Créalas en la sección de gestión.</p>
                                        )}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                         />
                    </div>
                )}
                
                {/* Step 3: Amount, Executive, and Description */}
                <div className="space-y-4">
                    <Label>3. Ingresa los detalles</Label>
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="pl-10 h-12 text-lg"
                                            {...field}
                                            autoFocus
                                        />
                                    </FormControl>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="executive"
                        render={({ field }) => (
                             <FormItem>
                                 <FormControl>
                                    <Input placeholder="Movimiento de (Ejecutivo/Ruta)" {...field} />
                                 </FormControl>
                                 <FormMessage />
                             </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                             <FormItem>
                                 <FormControl>
                                     <Textarea placeholder="Descripción (Opcional)" {...field} />
                                 </FormControl>
                                 <FormMessage />
                             </FormItem>
                        )}
                    />
                </div>
                
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={handleClose}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Movimiento
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
