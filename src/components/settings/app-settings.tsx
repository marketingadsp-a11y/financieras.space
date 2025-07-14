
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription as FormDescriptionComponent
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AppWindow } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const appSettingsSchema = z.object({
  appName: z.string().min(3, "El nombre de la aplicación debe tener al menos 3 caracteres."),
  footerText: z.string().optional(),
});

type AppSettingsFormValues = z.infer<typeof appSettingsSchema>;

export function AppSettings() {
  const { toast } = useToast();
  const form = useForm<AppSettingsFormValues>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      appName: "",
      footerText: "",
    },
  });

  React.useEffect(() => {
    const storedAppName = localStorage.getItem("appName");
    const storedFooterText = localStorage.getItem("footerText");
    if (storedAppName) {
      form.setValue("appName", storedAppName);
    }
    if (storedFooterText) {
      form.setValue("footerText", storedFooterText);
    }
  }, [form]);

  const onSubmit = (data: AppSettingsFormValues) => {
    try {
      localStorage.setItem("appName", data.appName);
      localStorage.setItem("footerText", data.footerText || "");
      
      // Dispatch a storage event to notify other parts of the app (like the layout)
      window.dispatchEvent(new Event("storage"));

      toast({
        title: "Éxito",
        description: "La configuración de la aplicación ha sido actualizada.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la configuración de la aplicación.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
                <AppWindow className="h-6 w-6 text-primary"/>
            </div>
            <div>
                <CardTitle>Ajustes de la Aplicación</CardTitle>
                <CardDescription>
                Personaliza la configuración general de la plataforma.
                </CardDescription>
            </div>
        </div>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="appName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Aplicación</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Mi Panel Financiero" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="footerText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto del Pie de Página (Login)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej. © 2024 Mi Empresa. Todos los derechos reservados." {...field} />
                  </FormControl>
                   <FormDescriptionComponent>
                    Este texto aparecerá en la parte inferior de la pantalla de inicio de sesión.
                  </FormDescriptionComponent>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit">Guardar Cambios</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
