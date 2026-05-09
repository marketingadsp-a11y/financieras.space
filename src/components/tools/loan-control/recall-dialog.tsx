"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, RefreshCcw } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { Plaza } from "@/lib/data";
import { performRecall } from "@/services/loan-control-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

const formSchema = z.object({
  plazaId: z.string().min(1, "Debes seleccionar una plaza."),
  operation: z.enum(["sum", "subtract"]),
  multiple: z.coerce.number().positive("El múltiplo debe ser un número positivo."),
  totalAmount: z.coerce.number().positive("El monto total debe ser un número positivo."),
});

type FormValues = z.infer<typeof formSchema>;

export function RecallDialog({
  isOpen,
  onClose,
  plazas,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  plazas: Plaza[];
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      operation: "subtract",
      multiple: 500,
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user?.name) return;
    setIsSubmitting(true);
    try {
      const result = await performRecall(
        values.plazaId,
        values.operation,
        values.multiple,
        values.totalAmount,
        user.name
      );

      if (result.success) {
        toast({
          title: "Recall Exitoso",
          description: `Se ajustó un total de $${result.totalApplied.toLocaleString()} entre ${result.customersAffected} clientes.`,
        });
        onSuccess();
        onClose();
        form.reset();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error en Recall",
        description: error.message || "Ocurrió un error al realizar el ajuste masivo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 text-primary" />
            Función Recall (Ajuste Masivo)
          </DialogTitle>
          <DialogDescription>
            Realiza ajustes proporcionales a los montos de préstamos y adeudos de una plaza completa.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="plazaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plaza a Afectar</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una plaza" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {plazas.map((plaza) => (
                        <SelectItem key={plaza.id} value={plaza.id}>
                          {plaza.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="operation"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Operación</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="subtract" />
                        </FormControl>
                        <FormLabel className="font-normal">Restar</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="sum" />
                        </FormControl>
                        <FormLabel className="font-normal">Sumar</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="multiple"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Múltiplo</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="500"
                      />
                    </FormControl>
                    <FormDescription>Cantidad a ajustar por cliente.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto Total Objetivo</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="50,000"
                      />
                    </FormControl>
                    <FormDescription>Total a restar/sumar de la plaza.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Ejecutar Recall"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
