import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AutomatedRemindersSwitch } from "@/components/workflows/automated-reminders-switch";
import { BellRing, Bot, Phone, Gavel } from 'lucide-react';

export default function WorkflowsPage() {
  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Flujos de Trabajo</h1>
          <p className="text-muted-foreground">
            Gestione y automatice sus procesos de cobro.
          </p>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Flujo de Trabajo de Cobranza</CardTitle>
            <CardDescription>
              Flujo de trabajo estándar para cuentas morosas según el nivel de riesgo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-md"><BellRing className="h-5 w-5 text-primary" /></div>
                        <span className="font-semibold">Etapa 1: Recordatorios Iniciales</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                  Para cuentas de bajo riesgo. Se envían correos electrónicos y recordatorios por SMS 1, 3 y 7 días después de la fecha de vencimiento. Esta etapa está totalmente automatizada.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-md"><Phone className="h-5 w-5 text-primary" /></div>
                        <span className="font-semibold">Etapa 2: Seguimiento Personal</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                  Para cuentas de riesgo medio o si la Etapa 1 falla. Se asigna un agente de cobranza para realizar una llamada personal. Se proporcionan guiones de llamada basados en el historial del cliente y la evaluación de riesgos.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-md"><Gavel className="h-5 w-5 text-primary" /></div>
                        <span className="font-semibold">Etapa 3: Acción Legal</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                 Para cuentas de alto riesgo o después de repetidos intentos de cobro fallidos. El caso se remite al departamento legal para los procedimientos formales. Se compila y adjunta todo el historial de comunicaciones.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Recordatorios Automatizados</CardTitle>
            <CardDescription>
              Habilite o deshabilite la comunicación automatizada con los clientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center space-x-4 rounded-md border p-4">
                <Bot className="h-6 w-6 text-primary"/>
                <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                    Habilitar Sistema Automatizado
                    </p>
                    <p className="text-sm text-muted-foreground">
                    Envía recordatorios basados en los calendarios de pago.
                    </p>
                </div>
                <AutomatedRemindersSwitch />
            </div>
            <p className="text-xs text-muted-foreground">
              Cuando está habilitado, el sistema enviará automáticamente recordatorios de prepago, notificaciones de fecha de vencimiento y avisos iniciales de atraso de acuerdo con los flujos de trabajo definidos. Esto ayuda a gestionar proactivamente la cartera y a reducir la morosidad.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
