
"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/auth-context";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, UserCog } from "lucide-react";
import { getCompanyProfileByPrefix } from "@/services/company-profile-service";
import type { CompanyProfile } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const formSchema = z.object({
  email: z.string().min(1, "El email o usuario es requerido."),
  password: z.string().min(1, "La contraseña es requerida."),
});

type FormValues = z.infer<typeof formSchema>;

export function LoginForm() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Default branding state
  const [appName, setAppName] = useState("Panel de Administración");
  const [footerText, setFooterText] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string>("#f4f4f5"); // Default muted gray

  const [lastCheckedPrefix, setLastCheckedPrefix] = useState<string | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Function to load default settings (from super admin)
  const loadDefaultSettings = useCallback(() => {
    const storedAppName = localStorage.getItem('appName');
    const storedFooterText = localStorage.getItem('footerText');
    setAppName(storedAppName || "Panel de Administración");
    setFooterText(storedFooterText || "");
    setLogoUrl(null); // Reset logo
    localStorage.removeItem('companyLogoUrl');
    window.dispatchEvent(new Event('storage'));
    setBackgroundColor("#f4f4f5"); // Reset background color
  }, []);

  useEffect(() => {
    loadDefaultSettings();
  }, [loadDefaultSettings]);


  const fetchCompanyProfile = useCallback(async (prefix: string) => {
    if (prefix === lastCheckedPrefix || isFetchingProfile) return;

    setIsFetchingProfile(true);
    setLastCheckedPrefix(prefix);

    try {
      const profile = await getCompanyProfileByPrefix(prefix);
      if (profile) {
        setAppName(profile.companyName);
        setLogoUrl(profile.logoUrl || null);
        setBackgroundColor(profile.loginBackgroundColor || "#f4f4f5");
        if (profile.logoUrl) {
            localStorage.setItem('companyLogoUrl', profile.logoUrl);
        } else {
            localStorage.removeItem('companyLogoUrl');
        }
        window.dispatchEvent(new Event('storage')); // Notify layout of the change
      } else {
        // If no profile found for the prefix, revert to default
        loadDefaultSettings();
      }
    } catch (error) {
      console.error("Error fetching company profile:", error);
      loadDefaultSettings(); // Revert on error
    } finally {
      setIsFetchingProfile(false);
    }
  }, [lastCheckedPrefix, isFetchingProfile, loadDefaultSettings]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    form.setValue("email", value); // Update form state

    const parts = value.split('.');
    if (parts.length > 1 && parts[0]) {
      const prefix = parts[0];
      fetchCompanyProfile(prefix);
    } else {
      // If the format doesn't match, reset to default branding
      if(lastCheckedPrefix !== null) {
          loadDefaultSettings();
          setLastCheckedPrefix(null);
      }
    }
  };


  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setError(null);
    try {
      await login(values.email, values.password);
      // On success, the AuthProvider will handle the redirect.
    } catch (e: any) {
      setError(e.message || "Ocurrió un error inesperado.");
      // Do not reset form on error, so user can correct their input
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div 
        className="flex min-h-screen items-center justify-center p-4 transition-colors duration-500"
        style={{ backgroundColor: backgroundColor }}
    >
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
             {logoUrl ? (
                <Avatar className="h-20 w-20">
                    <AvatarImage src={logoUrl} alt={appName} />
                    <AvatarFallback><UserCog className="h-10 w-10 text-primary" /></AvatarFallback>
                </Avatar>
             ) : (
                <UserCog className="h-12 w-12 text-primary" />
             )}
          </div>
          <CardTitle>{appName}</CardTitle>
          <CardDescription>
            Ingrese sus credenciales para acceder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario o Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ej. plaza.usuario"
                        {...field}
                        onChange={handleUsernameChange} // Use custom change handler
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ingresando...
                  </>
                ) : (
                  "Ingresar"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        {footerText && (
          <CardFooter>
            <p className="w-full text-center text-xs text-muted-foreground">
              {footerText}
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
