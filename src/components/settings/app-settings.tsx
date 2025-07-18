
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
import { AppWindow, Wrench } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { allTools, type Tool } from "@/lib/data";
import { useAuth } from "@/context/auth-context";

const toolNameSchema = z.object({
  id: z.string(),
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
});

const appSettingsSchema = z.object({
  appName: z.string().min(3, "El nombre de la aplicación debe tener al menos 3 caracteres."),
  footerText: z.string().optional(),
  toolNames: z.array(toolNameSchema).optional(),
});

type AppSettingsFormValues = z.infer<typeof appSettingsSchema>;

export function AppSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const getDefaultValues = () => {
    const storedAppName = typeof window !== 'undefined' ? localStorage.getItem("appName") || "Panel de Administración" : "Panel de Administración";
    const storedFooterText = typeof window !== 'undefined' ? localStorage.getItem("footerText") || "" : "";
    const storedToolNames = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("toolNames") || "{}") : {};
    
    const toolNames = allTools.map(tool => ({
      id: tool.id,
      name: storedToolNames[tool.id] || tool.name,
    }));

    return {
      appName: storedAppName,
      footerText: storedFooterText,
      toolNames: toolNames,
    };
  };

  const form = useForm<AppSettingsFormValues>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: getDefaultValues(),
  });

  React.useEffect(() => {
    form.reset(getDefaultValues());
  }, [form]);

  const onSubmit = (data: AppSettingsFormValues) => {
    try {
      localStorage.setItem("appName", data.appName);
      localStorage.setItem("footerText", data.footerText || "");

      if (data.toolNames && user?.isSuperAdmin) {
        const toolNamesMap = data.toolNames.reduce((acc, tool) => {
            acc[tool.id] = tool.name;
            return acc;
        }, {} as Record<string, string>);
        localStorage.setItem("toolNames", JSON.stringify(toolNamesMap));
      }
      
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
       <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
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

            {user?.isSuperAdmin && (
              <>
                <CardHeader className="pt-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Wrench className="h-6 w-6 text-primary"/>
                        </div>
                        <div>
                            <CardTitle>Nombres de Herramientas</CardTitle>
                            <CardDescription>
                                Personaliza los nombres de las herramientas que se muestran en toda la aplicación.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {form.getValues('toolNames')?.map((tool, index) => (
                        <FormField
                            key={tool.id}
                            control={form.control}
                            name={`toolNames.${index}.name`}
                            render={({ field }) => {
                                const originalTool = allTools.find(t => t.id === tool.id);
                                return (
                                    <FormItem>
                                        <FormLabel>
                                            <div className="flex items-center gap-2">
                                                {originalTool && <originalTool.icon className="h-4 w-4 text-muted-foreground" />}
                                                <span>{originalTool?.name}</span>
                                            </div>
                                        </FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )
                            }}
                        />
                    ))}
                    </div>
                </CardContent>
              </>
            )}

            <CardFooter className="border-t px-6 py-4 mt-6">
                <Button type="submit">Guardar Cambios</Button>
            </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
