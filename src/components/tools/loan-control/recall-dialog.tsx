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
import { Loader2, RefreshCcw, ShieldAlert } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { Plaza } from "@/lib/data";
import { performRecall } from "@/services/loan-control-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
  const [isUnlocked, setIsUnlocked] = React.useState(false);
  const [unlockPass, setUnlockPass] = React.useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      operation: "subtract",
      multiple: 500,
    },
  });

  React.useEffect(() => {
    if (!isOpen) {
      setIsUnlocked(false);
      setUnlockPass("");
    }
  }, [isOpen]);

  const handleUnlock = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (unlockPass === "Lacrimosa_12") {
      setIsUnlocked(true);
      toast({ title: "Módulo Habilitado", description: "Acceso concedido a las funciones Recall." });
    } else {
      toast({
        variant: "destructive",
        title: "Error de Acceso",
        description: "La contraseña ingresada es incorrecta.",
      });
      setUnlockPass("");
    }
  };

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
          description: `Se ajustó un total de $${result.totalApplied.toLocaleString("es-MX")} entre ${result.customersAffected} clientes.`,
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
        {!isUnlocked ? (
          <form onSubmit={handleUnlock} className="space-y-5">
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full border border-rose-500/25 bg-rose-500/10">
                <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              </div>
              <DialogTitle className="text-center text-lg text-rose-600 dark:text-rose-400">
                Autorización Requerida
              </DialogTitle>
              <DialogDescription className="text-center">
                Ingresa la clave de seguridad para habilitar ajustes masivos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="auth-pass" className="text-xs font-semibold text-foreground">
                Contraseña de autorización
              </Label>
              <Input
                id="auth-pass"
                type="password"
                placeholder="••••••••"
                value={unlockPass}
                onChange={(e) => setUnlockPass(e.target.value)}
                autoFocus
                className="text-center font-mono tracking-widest"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" className="flex-1 lc-pressable" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white lc-pressable"
              >
                Confirmar Identidad
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCcw className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Función Recall (Ajuste Masivo)
              </DialogTitle>
              <DialogDescription>
                Realiza ajustes proporcionales a los montos de préstamos y adeudos de una plaza completa.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="plazaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Plaza a Afectar</FormLabel>
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
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-semibold">Operación</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-2 gap-2.5"
                        >
                          <Label
                            htmlFor="recall-subtract"
                            className={cn(
                              "flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium cursor-pointer transition-colors",
                              field.value === "subtract"
                                ? "border-foreground/40 bg-muted/60 text-foreground"
                                : "border-border hover:bg-muted/30"
                            )}
                          >
                            <RadioGroupItem value="subtract" id="recall-subtract" />
                            <span>Restar</span>
                          </Label>
                          <Label
                            htmlFor="recall-sum"
                            className={cn(
                              "flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium cursor-pointer transition-colors",
                              field.value === "sum"
                                ? "border-foreground/40 bg-muted/60 text-foreground"
                                : "border-border hover:bg-muted/30"
                            )}
                          >
                            <RadioGroupItem value="sum" id="recall-sum" />
                            <span>Sumar</span>
                          </Label>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="multiple"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Múltiplo</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="500"
                            className="tabular-nums"
                          />
                        </FormControl>
                        <FormDescription className="text-[11px]">Ajuste por cliente.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="totalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Monto Total Objetivo</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="50,000"
                            className="tabular-nums"
                          />
                        </FormControl>
                        <FormDescription className="text-[11px]">Total en la plaza.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="lc-pressable">
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 lc-pressable"
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                    {isSubmitting ? "Procesando..." : "Ejecutar Recall"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
