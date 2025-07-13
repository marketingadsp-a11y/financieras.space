"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { assessCustomerRisk } from "@/ai/flows/customer-risk-assessment";
import type { CustomerRiskOutput } from "@/ai/flows/customer-risk-assessment";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Zap, AlertTriangle, ShieldCheck, ListChecks, Info, FileText, Banknote } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  customerData: z.string().min(20, "Por favor, proporcione datos más detallados del cliente para una mejor evaluación."),
  loanDetails: z.string().min(20, "Por favor, proporcione información más detallada del préstamo para una mejor evaluación."),
});

type FormValues = z.infer<typeof formSchema>;

function ResultCard({ icon: Icon, title, content, variant = 'default' }: { icon: React.ElementType, title: string, content: React.ReactNode, variant?: "warning" | "success" | "info" | "default" }) {
  
  const getVariantClasses = () => {
    switch(variant) {
      case 'warning': return 'bg-yellow-100/80 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'success': return 'bg-green-100/80 text-green-600 dark:bg-green-900/20 dark:text-green-400';
      case 'info': return 'bg-blue-100/80 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-muted text-primary';
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <div className={`p-2 rounded-lg ${getVariantClasses()}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <div className="text-sm text-muted-foreground mt-2">{content}</div>
        </div>
      </CardHeader>
    </Card>
  )
}

export function RiskAssessmentForm() {
  const [result, setResult] = useState<CustomerRiskOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerData: "El cliente tiene un ingreso estable de $60,000/año, un puntaje de crédito de 680 y ha omitido un pago en los últimos 12 meses. Edad: 35, Empleado por 3 años.",
      loanDetails: "Préstamo personal de $10,000 con una tasa de interés del 12% a 36 meses. Pago mensual: $332.14. Quedan 5 pagos.",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const assessmentResult = await assessCustomerRisk(values);
      setResult(assessmentResult);
    } catch (e) {
      setError("Ocurrió un error al evaluar el riesgo. Por favor, verifique su conexión o los datos proporcionados e intente de nuevo.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  const getRiskLevelInfo = (level: string) => {
    const lowerLevel = level.toLowerCase();
    if (lowerLevel.includes('alto') || lowerLevel.includes('high')) return { icon: AlertTriangle, variant: 'warning' as const, badgeVariant: 'destructive' as const };
    if (lowerLevel.includes('medio') || lowerLevel.includes('medium')) return { icon: Info, variant: 'info' as const, badgeVariant: 'default' as const };
    if (lowerLevel.includes('bajo') || lowerLevel.includes('low')) return { icon: ShieldCheck, variant: 'success' as const, badgeVariant: 'secondary' as const };
    return { icon: Info, variant: 'info' as const, badgeVariant: 'outline' as const };
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Ingrese la Información del Cliente</CardTitle>
          <CardDescription>
            Proporcione datos completos para una evaluación precisa. Hemos añadido algunos datos de ejemplo para que pueda empezar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="customerData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><FileText className="h-4 w-4" /> Datos del Cliente</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ej., Historial financiero, comportamiento de pago, información demográfica..."
                        className="min-h-[150px] font-mono text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="loanDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Banknote className="h-4 w-4" /> Detalles del Préstamo</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ej., Monto del préstamo, tasa de interés, calendario de pagos..."
                        className="min-h-[100px] font-mono text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Evaluando...</>
                ) : (
                  <><Zap className="mr-2 h-4 w-4" /> Evaluar Riesgo</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <div className="md:col-span-1 space-y-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8 rounded-lg border-2 border-dashed">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">La IA está analizando los datos...</p>
          </div>
        )}
        {error && <div className="text-destructive bg-destructive/10 p-4 rounded-md">{error}</div>}
        {result && (
            <div className="space-y-4 animate-in fade-in-50">
                <Card>
                  <CardHeader>
                    <CardTitle>Resultado de la Evaluación</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ResultCard
                        icon={getRiskLevelInfo(result.riskLevel).icon}
                        title="Nivel de Riesgo"
                        content={
                          <div className="flex items-center gap-2">
                             <Badge variant={getRiskLevelInfo(result.riskLevel).badgeVariant} className={result.riskLevel.toLowerCase().includes('medio') ? "bg-yellow-400 text-yellow-900" : ""}>{result.riskLevel}</Badge>
                             <span className="font-bold">{result.riskScore}/100</span>
                          </div>
                        }
                        variant={getRiskLevelInfo(result.riskLevel).variant}
                    />
                    <ResultCard
                        icon={Info}
                        title="Factores de Riesgo Clave"
                        content={result.riskFactors}
                        variant="info"
                    />
                    <ResultCard
                        icon={ListChecks}
                        title="Acciones Recomendadas"
                        content={result.recommendedActions}
                        variant="success"
                    />
                  </CardContent>
                </Card>
            </div>
        )}
        {!isLoading && !result && !error && (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 rounded-lg border-2 border-dashed bg-muted/40">
                <Zap className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground text-center">Los resultados de la evaluación aparecerán aquí después del envío.</p>
            </div>
        )}
      </div>
    </div>
  );
}
