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
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground">
            Manage and automate your collection processes.
          </p>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Collection Workflow</CardTitle>
            <CardDescription>
              Standard workflow for delinquent accounts based on risk level.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-md"><BellRing className="h-5 w-5 text-primary" /></div>
                        <span className="font-semibold">Stage 1: Initial Reminders</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                  For low-risk accounts. Automated emails and SMS reminders are sent 1, 3, and 7 days after the due date. This stage is fully automated.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-md"><Phone className="h-5 w-5 text-primary" /></div>
                        <span className="font-semibold">Stage 2: Personal Follow-up</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                  For medium-risk accounts or if Stage 1 fails. A collection agent is assigned to make a personal call. Call scripts are provided based on customer history and risk assessment.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-md"><Gavel className="h-5 w-5 text-primary" /></div>
                        <span className="font-semibold">Stage 3: Legal Action</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                 For high-risk accounts or after repeated failed collection attempts. The case is forwarded to the legal department for formal proceedings. All communication history is compiled and attached.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Automated Reminders</CardTitle>
            <CardDescription>
              Enable or disable automated communication with customers.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center space-x-4 rounded-md border p-4">
                <Bot className="h-6 w-6 text-primary"/>
                <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                    Enable Automated System
                    </p>
                    <p className="text-sm text-muted-foreground">
                    Sends reminders based on payment schedules.
                    </p>
                </div>
                <AutomatedRemindersSwitch />
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, the system will automatically send pre-payment reminders, due date notifications, and initial overdue notices according to the defined workflows. This helps in proactively managing the portfolio and reducing delinquency.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
