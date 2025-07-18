
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
import { AppWindow, Wrench, LifeBuoy, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { allTools, type Tool } from "@/lib/data";
import { useAuth } from "@/context/auth-context";
import { getAppSettings, saveAppSettings } from "@/services/app-settings-service";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const toolNameSchema = z.object({
  id: z.string(),
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
});

const supportInfoSchema = z.object({
    title: z.string().min(5, "El título es requerido.").optional(),
    content: z.string().min(10, "El contenido es requerido.").optional(),
});

const appSettingsSchema = z.object({
  appName: z.string().min(3, "El nombre de la aplicación debe tener al menos 3 caracteres."),
  footerText: z.string().optional(),
  toolNames: z.array(toolNameSchema).optional(),
  supportInfo: supportInfoSchema.optional(),
});

type AppSettingsFormValues = z.infer<typeof appSettingsSchema>;

export function AppSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  
  const form = useForm<AppSettingsFormValues>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
        appName: "Panel de Administración",
        footerText: "",
        toolNames: allTools.map(tool => ({ id: tool.id, name: tool.name })),
        supportInfo: {
            title: "",
            content: ""
        }
    },
  });
  
  React.useEffect(() => {
    const fetchSettings = async () => {
        setIsLoading(true);
        const storedAppName = localStorage.getItem("appName") || "Panel de Administración";
        const storedFooterText = localStorage.getItem("footerText") || "";
        const storedToolNames = JSON.parse(localStorage.getItem("toolNames") || "{}");
        const toolNames = allTools.map(tool => ({
            id: tool.id,
            name: storedToolNames[tool.id] || tool.name,
        }));
        
        const settings = await getAppSettings();
        
        form.reset({
            appName: storedAppName,
            footerText: storedFooterText,
            toolNames: toolNames,
            supportInfo: {
                title: settings?.supportInfo?.title || "Página de Soporte",
                content: settings?.supportInfo?.content || "Contacta a tu administrador para más información."
            }
        });
        setIsLoading(false);
    }
    fetchSettings();
  }, [form]);

  const onSubmit = async (data: AppSettingsFormValues) => {
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
      
      if (data.supportInfo) {
          await saveAppSettings({ supportInfo: data.supportInfo });
      }
      
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
  
    if (isLoading) {
        return <Card><CardContent className="flex justify-center items-center h-40"><Loader2 className="mr-2 h-8 w-8 animate-spin" /> Cargando configuración...</CardContent></Card>
    }

  return (
    <Card>
       <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
                <CardTitle>Ajustes de la Aplicación</CardTitle>
                <CardDescription>
                Personaliza la configuración general de la plataforma usando estas secciones.
                </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full space-y-4">
                
                {/* General Settings */}
                <AccordionItem value="general-settings" className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline text-left">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg"><AppWindow className="h-6 w-6 text-primary"/></div>
                        <div>
                            <p className="font-semibold text-base">Ajustes Generales</p>
                            <p className="text-sm text-muted-foreground font-normal">Nombre de la app y pie de página del login.</p>
                        </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 border-t">
                      <div className="space-y-6">
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
                      </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Tool Names */}
                {user?.isSuperAdmin && (
                  <AccordionItem value="tool-names" className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline text-left">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg"><Wrench className="h-6 w-6 text-primary"/></div>
                            <div>
                                <p className="font-semibold text-base">Nombres de Herramientas</p>
                                <p className="text-sm text-muted-foreground font-normal">Personaliza los nombres que se muestran en la app.</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-6 border-t">
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
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Support Page */}
                {user?.isSuperAdmin && (
                  <AccordionItem value="support-page" className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline text-left">
                       <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg"><LifeBuoy className="h-6 w-6 text-primary"/></div>
                            <div>
                                <p className="font-semibold text-base">Página de Soporte</p>
                                <p className="text-sm text-muted-foreground font-normal">Edita el contenido que verán tus usuarios.</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-6 border-t">
                       <div className="space-y-6">
                          <FormField
                              control={form.control}
                              name="supportInfo.title"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Título de la Página de Soporte</FormLabel>
                                  <FormControl>
                                      <Input placeholder="Ej. Contacto de Soporte Técnico" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <FormField
                              control={form.control}
                              name="supportInfo.content"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Contenido de la Página de Soporte</FormLabel>
                                  <FormControl>
                                      <Textarea className="min-h-[150px]" placeholder="Escribe aquí la información de contacto, horarios, etc. Se mostrará a todos los usuarios." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                  </FormItem>
                              )}
                          />
                        </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

              </Accordion>
            </CardContent>

            <CardFooter className="border-t px-6 py-4 mt-6">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Guardar Cambios
                </Button>
            </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
