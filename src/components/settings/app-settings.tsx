
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
import { AppWindow, Wrench, LifeBuoy, Loader2, Palette, Smartphone } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { allTools, type Tool } from "@/lib/data";
import { useAuth } from "@/context/auth-context";
import { getAppSettings, saveAppSettings } from "@/services/app-settings-service";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";

const toolSettingsSchema = z.object({
  id: z.string(),
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  color: z.string().optional(),
});

const supportInfoSchema = z.object({
    title: z.string().min(5, "El título es requerido.").optional(),
    content: z.string().min(10, "El contenido es requerido.").optional(),
});

const appSettingsSchema = z.object({
  appName: z.string().min(3, "El nombre de la aplicación debe tener al menos 3 caracteres."),
  footerText: z.string().optional(),
  toolSettings: z.array(toolSettingsSchema).optional(),
  supportInfo: supportInfoSchema.optional(),
  pwaShortName: z.string().optional(),
  pwaIconUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
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
        toolSettings: allTools.map(tool => ({ id: tool.id, name: tool.name, color: tool.color || '#3b82f6' })),
        supportInfo: {
            title: "",
            content: ""
        },
        pwaShortName: "",
        pwaIconUrl: "",
    },
  });
  
  React.useEffect(() => {
    const fetchSettings = async () => {
        setIsLoading(true);
        const storedAppName = localStorage.getItem("appName") || "Panel de Administración";
        const storedFooterText = localStorage.getItem("footerText") || "";
        const storedToolSettings = JSON.parse(localStorage.getItem("toolSettings") || "[]");
        const storedPwaShortName = localStorage.getItem("pwaShortName") || "";
        const storedPwaIconUrl = localStorage.getItem("pwaIconUrl") || "";
        
        const toolSettings = allTools.map(tool => {
            const storedSetting = storedToolSettings.find((s: any) => s.id === tool.id);
            return {
                id: tool.id,
                name: storedSetting?.name || tool.name,
                color: storedSetting?.color || tool.color || '#3b82f6'
            }
        });
        
        const settings = await getAppSettings();
        
        form.reset({
            appName: storedAppName,
            footerText: storedFooterText,
            toolSettings: toolSettings,
            supportInfo: {
                title: settings?.supportInfo?.title || "Página de Soporte",
                content: settings?.supportInfo?.content || "Contacta a tu administrador para más información."
            },
            pwaShortName: storedPwaShortName,
            pwaIconUrl: storedPwaIconUrl,
        });
        setIsLoading(false);
    }
    fetchSettings();
  }, [form]);

  const onSubmit = async (data: AppSettingsFormValues) => {
    try {
      localStorage.setItem("appName", data.appName);
      localStorage.setItem("footerText", data.footerText || "");
      localStorage.setItem("pwaShortName", data.pwaShortName || data.appName.substring(0, 12));
      localStorage.setItem("pwaIconUrl", data.pwaIconUrl || "");

       // Create and save a dynamic manifest.json
      const manifest = {
        theme_color: "#007bff",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/",
        name: data.appName,
        short_name: data.pwaShortName || data.appName.substring(0, 12),
        description: `${data.appName} - Panel de Administración`,
        icons: [
          { src: data.pwaIconUrl || '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: data.pwaIconUrl || '/icon-256x256.png', sizes: '256x256', type: 'image/png' },
          { src: data.pwaIconUrl || '/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: data.pwaIconUrl || '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      };
      localStorage.setItem('pwaManifest', JSON.stringify(manifest));

      if (data.toolSettings && user?.isSuperAdmin) {
        localStorage.setItem("toolSettings", JSON.stringify(data.toolSettings));
      }
      
      await saveAppSettings({
         supportInfo: data.supportInfo,
      });
      
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
  
  const watchPwaIconUrl = form.watch("pwaIconUrl");
  const watchAppName = form.watch("appName");


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
                 
                <AccordionItem value="pwa-settings" className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline text-left">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-green-500/10 rounded-lg"><Smartphone className="h-6 w-6 text-green-600"/></div>
                        <div>
                            <p className="font-semibold text-base">Ajustes de PWA (App Instalable)</p>
                            <p className="text-sm text-muted-foreground font-normal">Personaliza el nombre y el ícono de la app al instalarse.</p>
                        </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 border-t">
                      <div className="space-y-6">
                         <FormField
                            control={form.control}
                            name="pwaShortName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nombre Corto de la App</FormLabel>
                                <FormControl>
                                    <Input maxLength={12} placeholder="Ej. Panel" {...field} />
                                </FormControl>
                                <FormDescriptionComponent>Máximo 12 caracteres. Se muestra bajo el ícono de la app.</FormDescriptionComponent>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                        control={form.control}
                        name="pwaIconUrl"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Ícono de la App (URL)</FormLabel>
                             <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20 border rounded-lg">
                                    <AvatarImage src={watchPwaIconUrl} alt={watchAppName} />
                                    <AvatarFallback className="text-2xl rounded-lg bg-muted">{watchAppName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-grow">
                                    <FormControl>
                                        <Input placeholder="https://ejemplo.com/icon-512x512.png" {...field} />
                                    </FormControl>
                                    <FormDescriptionComponent className="mt-2">Pega una URL a una imagen PNG (512x512px recomendado).</FormDescriptionComponent>
                                </div>
                            </div>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                      </div>
                  </AccordionContent>
                </AccordionItem>

                {user?.isSuperAdmin && (
                  <AccordionItem value="tool-names" className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline text-left">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg"><Wrench className="h-6 w-6 text-primary"/></div>
                            <div>
                                <p className="font-semibold text-base">Personalización de Herramientas</p>
                                <p className="text-sm text-muted-foreground font-normal">Edita nombres y colores para cada herramienta.</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-6 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {form.getValues('toolSettings')?.map((tool, index) => {
                          const originalTool = allTools.find(t => t.id === tool.id);
                          return (
                            <div key={tool.id} className="p-4 border rounded-md space-y-4">
                              <div className="flex items-center gap-2">
                                  {originalTool && <originalTool.icon className="h-5 w-5 text-muted-foreground" />}
                                  <span className="font-semibold">{originalTool?.name}</span>
                              </div>
                              <FormField
                                  control={form.control}
                                  name={`toolSettings.${index}.name`}
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Nombre a mostrar</FormLabel>
                                          <FormControl>
                                              <Input {...field} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                               <FormField
                                  control={form.control}
                                  name={`toolSettings.${index}.color`}
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Color de la herramienta</FormLabel>
                                          <FormControl>
                                            <div className="flex items-center gap-2">
                                                <Input type="color" className="w-16 h-10 p-1" {...field} />
                                                <Input type="text" placeholder="#3b82f6" {...field} />
                                            </div>
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                            </div>
                          )
                      })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

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
