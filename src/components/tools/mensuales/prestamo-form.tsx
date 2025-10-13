

"use client";

import * as React from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ClienteMensual, OficinaMensual, InterestRate } from "@/lib/data";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDescriptionComponent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loader2, AlertTriangle, BadgeInfo } from "lucide-react";
import { searchClientesByName } from "@/services/mensuales-service";
import { useAuth } from "@/context/auth-context";

const formSchema = z.object({
  oficinaId: z.string().min(1, "Debes seleccionar una oficina."),
  interestRateId: z.string().min(1, "Debes seleccionar una tasa de interés."),
  name: z.string().min(3, "El nombre del cliente es requerido."),
  loanAmount: z.coerce.number().positive("El monto debe ser mayor a cero."),
  paymentDay: z.coerce.number().int().min(1).max(31, "El día debe estar entre 1 y 31."),
  displayId: z.string().optional(), // This will be handled by the service
});

type PrestamoFormProps = {
  onSubmit: (data: Omit<ClienteMensual, 'id' | 'prefix' | 'currentBalance' | 'status' | 'interestRateValue'>) => Promise<void>;
  oficinas: OficinaMensual[];
  interestRates: InterestRate[];
  cliente?: ClienteMensual | null;
};

export function PrestamoForm({ onSubmit, oficinas, interestRates, cliente }: PrestamoFormProps) {
  const isEditing = !!cliente;
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [duplicateClients, setDuplicateClients] = React.useState<ClienteMensual[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      oficinaId: cliente?.oficinaId || "",
      interestRateId: cliente?.interestRateId || "",
      name: cliente?.name || "",
      loanAmount: cliente?.loanAmount || undefined,
      paymentDay: cliente?.paymentDay || new Date().getDate(),
    },
  });

  const watchName = form.watch("name");
  
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (watchName && watchName.length > 3 && !isEditing) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        if (user?.prefix) {
            const results = await searchClientesByName(watchName, user.prefix);
            setDuplicateClients(results);
        }
        setIsSearching(false);
      }, 500); // 500ms debounce
    } else {
      setDuplicateClients([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [watchName, user?.prefix, isEditing]);


  const handleFormSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    const dataToSubmit = { ...values };

    // If there's a duplicate and we're creating, use the full name from the first duplicate found.
    if (!isEditing && duplicateClients.length > 0) {
        dataToSubmit.name = duplicateClients[0].name;
    }
    
    await onSubmit(dataToSubmit as any); // The displayId will be generated in the service
    setIsSubmitting(false);
  };
  
  const hasActiveLoan = duplicateClients.some(c => c.status === 'vigente');
  const oficinaMap = new Map(oficinas.map(o => [o.id, o.name]));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="oficinaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Oficina</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una oficina" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {oficinas.length > 0 ? (
                      oficinas.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground">No hay oficinas creadas.</div>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="interestRateId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tasa de Interés Mensual</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una tasa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {interestRates.length > 0 ? (
                      interestRates.map(r => <SelectItem key={r.id} value={r.id}>{r.value}%</SelectItem>)
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground">No hay tasas creadas.</div>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Cliente</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input placeholder="John Doe" {...field} disabled={isEditing} />
                  {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {duplicateClients.length > 0 && (
            <Alert variant={hasActiveLoan ? "destructive" : "default"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{hasActiveLoan ? '¡Cliente con Préstamo Vigente!' : 'Cliente Encontrado'}</AlertTitle>
                <AlertDescription>
                   Se encontraron coincidencias para este nombre:
                   <ul className="list-disc pl-5 mt-2 space-y-1">
                    {duplicateClients.map(c => (
                        <li key={c.id} className="text-xs">
                           <span className="font-bold">{c.name}</span> - {oficinaMap.get(c.oficinaId) || 'N/A'} - Saldo: <span className="font-bold">${c.currentBalance.toLocaleString()}</span> ({c.status})
                        </li>
                    ))}
                   </ul>
                </AlertDescription>
            </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="loanAmount"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Monto Prestado</FormLabel>
                <FormControl>
                    <CurrencyInput placeholder="1,000.00" value={field.value} onValueChange={field.onChange} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
                control={form.control}
                name="paymentDay"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Día de Pago (1-31)</FormLabel>
                    <FormControl>
                        <Input type="number" min="1" max="31" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
        </div>
        
        {hasActiveLoan ? (
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button type="button" className="w-full" variant="destructive">
                         <BadgeInfo className="mr-2 h-4 w-4"/> Confirmar y Registrar
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar Nuevo Préstamo?</AlertDialogTitle>
                        <AlertDialogDescriptionComponent>
                           El cliente <strong>{duplicateClients[0]?.name || watchName}</strong> ya tiene al menos un préstamo vigente. ¿Estás seguro de que quieres registrar un segundo préstamo?
                        </AlertDialogDescriptionComponent>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => form.handleSubmit(handleFormSubmit)()} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sí, registrar nuevo préstamo
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        ) : (
             <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Guardar Cambios' : 'Registrar Préstamo'}
            </Button>
        )}
      </form>
    </Form>
  );
}
