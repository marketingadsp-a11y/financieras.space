

"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Loader2, Calculator } from "lucide-react";
import type { ConcentradoSemanal } from "@/lib/data";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";


const formSchema = z.object({
  fondoInicio: z.coerce.number().min(0).default(0),
  venta: z.coerce.number().min(0).default(0),
  recolectado: z.coerce.number().min(0).default(0),
  gastos: z.coerce.number().min(0).default(0),
  fondoSiguienteSemana: z.coerce.number().default(0),
  cajaChica: z.coerce.number().min(0).default(0),
  seguros: z.coerce.number().min(0).default(0),
  interesMensual: z.coerce.number().min(0).default(0),
  carteraVencida: z.coerce.number().min(0).default(0),
  capitalMensual: z.coerce.number().min(0).default(0),
  debe: z.coerce.number().min(0).default(0),
  saliente: z.coerce.number().min(0).default(0),
  falla: z.coerce.number().min(0).default(0),
  recuperado: z.coerce.number().min(0).default(0),
  adelantos: z.coerce.number().min(0).default(0),
  semanaExtra: z.coerce.number().min(0).default(0),
});

type FormValues = z.infer<typeof formSchema>;

type RegistroSemanalFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormValues) => Promise<void>;
  existingData: ConcentradoSemanal | null;
  week: { start: Date; end: Date } | null;
  isFondoInicioDisabled: boolean;
};

export function ConcentradoRegistroSemanalForm({ isOpen, onClose, onSubmit, existingData, week, isFondoInicioDisabled }: RegistroSemanalFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isInsuranceDialogOpen, setIsInsuranceDialogOpen] = React.useState(false);
  const [insuranceQuantity, setInsuranceQuantity] = React.useState<number | undefined>();
  const [insuranceType, setInsuranceType] = React.useState<string>('70');


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingData || {},
  });

  const watchedValues = form.watch();

  React.useEffect(() => {
    const fondoInicio = Number(watchedValues.fondoInicio) || 0;
    const venta = Number(watchedValues.venta) || 0;
    const recolectado = Number(watchedValues.recolectado) || 0;
    const gastos = Number(watchedValues.gastos) || 0;
    
    const calculatedFondoSiguiente = fondoInicio - venta + recolectado - gastos;
    
    // Only set value if it's different to avoid re-renders
    if (form.getValues('fondoSiguienteSemana') !== calculatedFondoSiguiente) {
        form.setValue('fondoSiguienteSemana', calculatedFondoSiguiente, { shouldValidate: true });
    }
  }, [watchedValues.fondoInicio, watchedValues.venta, watchedValues.recolectado, watchedValues.gastos, form]);


  React.useEffect(() => {
    if (isOpen) {
      form.reset(existingData || {
          fondoInicio: 0,
          venta: 0,
          recolectado: 0,
          gastos: 0,
          fondoSiguienteSemana: 0,
          cajaChica: 0,
          seguros: 0,
          interesMensual: 0,
          carteraVencida: 0,
          capitalMensual: 0,
          debe: 0,
          saliente: 0,
          falla: 0,
          recuperado: 0,
          adelantos: 0,
          semanaExtra: 0,
      });
    }
  }, [existingData, form, isOpen]);

  const handleFormSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    // Ensure all values are numbers before submitting
    const numericValues = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, Number(value) || 0])
    ) as FormValues;
    await onSubmit(numericValues);
    setIsSubmitting(false);
  };
  
  const handleCalculateInsurance = () => {
    if (insuranceQuantity && insuranceType) {
        const total = insuranceQuantity * parseInt(insuranceType, 10);
        form.setValue('seguros', total, { shouldValidate: true });
        setIsInsuranceDialogOpen(false);
        setInsuranceQuantity(undefined); // Reset for next time
    }
  };
  
  if (!week) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{existingData ? 'Editar' : 'Registrar'} Datos Semanales</DialogTitle>
            <DialogDescription>
              Para la semana del {format(week.start, "dd 'de' LLLL", { locale: es })} al {format(week.end, "dd 'de' LLLL", { locale: es })}.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)}>
              <ScrollArea className="h-[60vh] p-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-4">
                  {/* Column 1: Flujo Principal */}
                  <div className="space-y-4 bg-blue-500/10 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <FormField control={form.control} name="fondoInicio" render={({ field }) => (<FormItem><FormLabel>Fondo de Inicio</FormLabel><FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} disabled={isFondoInicioDisabled} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="venta" render={({ field }) => (<FormItem><FormLabel>Venta</FormLabel><FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="recolectado" render={({ field }) => (<FormItem><FormLabel>Recolectado</FormLabel><FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="gastos" render={({ field }) => (<FormItem><FormLabel>Gastos</FormLabel><FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="fondoSiguienteSemana" render={({ field }) => (<FormItem><FormLabel>Fondo Siguiente Semana</FormLabel><FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} disabled /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  {/* Column 2: Conceptos Financieros */}
                   <div className="space-y-4 bg-green-500/10 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <FormField control={form.control} name="cajaChica" render={({ field }) => (<FormItem><FormLabel>Caja Chica</FormLabel><FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField
                      control={form.control}
                      name="seguros"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Seguros</FormLabel>
                              <div className="flex items-center gap-2">
                                  <FormControl>
                                      <CurrencyInput value={field.value} onValueChange={field.onChange} disabled />
                                  </FormControl>
                                  <Button type="button" variant="outline" size="icon" onClick={() => setIsInsuranceDialogOpen(true)}>
                                      <Calculator className="h-4 w-4" />
                                  </Button>
                              </div>
                              <FormMessage />
                          </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="interesMensual" render={({ field }) => (<FormItem><FormLabel>Interés Mensual</FormLabel><FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="carteraVencida" render={({ field }) => (<FormItem><FormLabel>Cartera Vencida</FormLabel><FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="capitalMensual" render={({ field }) => (<FormItem><FormLabel>Capital Mensual</FormLabel><FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  {/* Column 3: Otros Conceptos */}
                  <div className="space-y-4 bg-yellow-500/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <FormField control={form.control} name="debe" render={({ field }) => (<FormItem><FormLabel>Debe</FormLabel><FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="saliente" render={({ field }) => (<FormItem><FormLabel>Saliente</FormLabel><FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="falla" render={({ field }) => (<FormItem><FormLabel>Falla</FormLabel><FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="recuperado" render={({ field }) => (<FormItem><FormLabel>Recuperado</FormLabel><FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="adelantos" render={({ field }) => (<FormItem><FormLabel>Adelantos</FormLabel><FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="semanaExtra" render={({ field }) => (<FormItem><FormLabel>Semana Extra</FormLabel><FormControl><CurrencyInput value={field.value} onValueChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="pt-4 mt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar Registro
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isInsuranceDialogOpen} onOpenChange={setIsInsuranceDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Calcular Monto de Seguros</DialogTitle>
                <DialogDescription>Ingresa la cantidad de seguros vendidos y selecciona el tipo.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="insurance-quantity">Cantidad de Seguros</Label>
                    <Input 
                        id="insurance-quantity"
                        type="number"
                        value={insuranceQuantity || ''}
                        onChange={(e) => setInsuranceQuantity(parseInt(e.target.value, 10) || undefined)}
                        placeholder="Ej. 3"
                        autoFocus
                    />
                </div>
                <div className="space-y-2">
                    <Label>Tipo de Seguro</Label>
                    <RadioGroup value={insuranceType} onValueChange={setInsuranceType} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="70" id="tipo-70" />
                            <Label htmlFor="tipo-70">$70</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="80" id="tipo-80" />
                            <Label htmlFor="tipo-80">$80</Label>
                        </div>
                    </RadioGroup>
                </div>
            </div>
            <DialogFooter>
                 <Button variant="outline" onClick={() => setIsInsuranceDialogOpen(false)}>Cancelar</Button>
                 <Button onClick={handleCalculateInsurance} disabled={!insuranceQuantity}>Calcular y Asignar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
