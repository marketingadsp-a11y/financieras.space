
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
import { Briefcase, Loader2, Upload } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getCompanyProfileByPrefix, saveCompanyProfile } from "@/services/company-profile-service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const companyProfileSchema = z.object({
  companyName: z.string().min(3, "El nombre de la empresa debe tener al menos 3 caracteres."),
  logoUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
});

type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>;

export function CompanyProfileManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      companyName: "",
      logoUrl: "",
    },
  });

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.prefix) return;
      setIsLoading(true);
      try {
        const profile = await getCompanyProfileByPrefix(user.prefix);
        if (profile) {
          form.reset({
            companyName: profile.companyName,
            logoUrl: profile.logoUrl || "",
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar el perfil de la empresa.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [user?.prefix, form, toast]);

  const onSubmit = async (data: CompanyProfileFormValues) => {
    if (!user?.prefix) {
      toast({ variant: "destructive", title: "Error", description: "No tienes un prefijo de empresa asignado." });
      return;
    }
    setIsSaving(true);
    try {
      await saveCompanyProfile(user.prefix, data);
      toast({
        title: "Éxito",
        description: "El perfil de la empresa ha sido actualizado.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el perfil de la empresa.",
      });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleLogoUpload = () => {
    // Placeholder for actual file upload logic
    // In a real app, this would involve uploading to a storage service (like Firebase Storage)
    // and getting back a URL. For now, we'll just prompt for a URL.
    const url = prompt("Pega la URL de tu logotipo:");
    if (url) {
      form.setValue("logoUrl", url, { shouldValidate: true });
    }
  };
  
  const currentLogoUrl = form.watch("logoUrl");
  const currentCompanyName = form.watch("companyName");

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                 <CardTitle>Perfil de Empresa</CardTitle>
                 <CardDescription>Cargando perfil...</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center h-40">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
                <Briefcase className="h-6 w-6 text-primary"/>
            </div>
            <div>
                <CardTitle>Perfil de Empresa</CardTitle>
                <CardDescription>
                  Personaliza cómo se muestra tu empresa en el inicio de sesión. Estos cambios se aplicarán a todos los usuarios con el prefijo: <span className="font-bold">{user?.prefix}</span>.
                </CardDescription>
            </div>
        </div>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Empresa</FormLabel>
                  <FormControl>
                    <Input placeholder="El nombre de tu empresa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logotipo</FormLabel>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={currentLogoUrl} alt={currentCompanyName} />
                      <AvatarFallback><Briefcase className="h-10 w-10 text-muted-foreground"/></AvatarFallback>
                    </Avatar>
                    <div className="flex-grow">
                         <FormControl>
                            <Input placeholder="https://ejemplo.com/logo.png" {...field} />
                         </FormControl>
                         <FormDescriptionComponent className="mt-2">
                            Pega una URL a una imagen para el logotipo.
                        </FormDescriptionComponent>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
