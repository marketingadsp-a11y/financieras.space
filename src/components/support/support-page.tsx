"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { LifeBuoy, Loader2, Send, Ticket } from "lucide-react";
import { getAppSettings, type SupportInfo } from "@/services/app-settings-service";
import { addSupportTicket } from "@/services/support-ticket-service";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const supportFormSchema = z.object({
    description: z.string().min(10, "La descripción debe tener al menos 10 caracteres.").max(500, "La descripción no puede exceder los 500 caracteres."),
    contactPhone: z.string().min(10, "Por favor, ingresa un número de teléfono válido de 10 dígitos."),
});

type SupportFormValues = z.infer<typeof supportFormSchema>;

const SupportRequestDialog = ({ open, onOpenChange, onSuccess }: { open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<SupportFormValues>({
        resolver: zodResolver(supportFormSchema),
        defaultValues: {
            description: "",
            contactPhone: "",
        },
    });

    const onSubmit = async (values: SupportFormValues) => {
        if (!user) {
            toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para enviar un ticket." });
            return;
        }
        setIsSubmitting(true);
        try {
            await addSupportTicket({
                userId: user.id,
                userName: user.name,
                userPrefix: user.prefix || 'N/A',
                ...values,
            });
            toast({ variant: "success", title: "Solicitud Enviada", description: "Tu ticket de soporte ha sido enviado. Nos pondremos en contacto contigo pronto." });
            onSuccess();
            form.reset();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo enviar la solicitud de soporte." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Solicitar Soporte Técnico</DialogTitle>
                    <DialogDescription>
                        Describe tu problema o solicitud y proporciona un número de contacto. Nuestro equipo lo revisará a la brevedad.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción de la Solicitud</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Ej: No puedo acceder a la herramienta de cartera vencida..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="contactPhone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Número de Teléfono de Contacto</FormLabel>
                                    <FormControl>
                                        <Input type="tel" placeholder="Tu número de teléfono" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>}
                                Enviar Solicitud
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}


export function SupportPage() {
    const [supportInfo, setSupportInfo] = React.useState<SupportInfo | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);

    React.useEffect(() => {
        const fetchSupportInfo = async () => {
            setIsLoading(true);
            try {
                const settings = await getAppSettings();
                setSupportInfo(settings?.supportInfo || { title: "Soporte", content: "No hay información de soporte disponible." });
            } catch (error) {
                console.error("Failed to fetch support info", error);
                setSupportInfo({ title: "Error", content: "No se pudo cargar la información de soporte." });
            } finally {
                setIsLoading(false);
            }
        }
        fetchSupportInfo();
    }, []);

    return (
        <>
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg w-fit">
                        <LifeBuoy className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl">{supportInfo?.title || ""}</CardTitle>
                        <CardDescription>Información y contacto para asistencia técnica.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        <span>Cargando información...</span>
                    </div>
                ) : (
                    <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                        <p>{supportInfo?.content}</p>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                 <Button onClick={() => setIsDialogOpen(true)}>
                    <Ticket className="mr-2 h-4 w-4" />
                    Solicitar Soporte
                </Button>
            </CardFooter>
        </Card>

        <SupportRequestDialog 
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            onSuccess={() => setIsDialogOpen(false)}
        />
        </>
    );
}
