
"use client";

import { useState, useEffect } from "react";
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

const formSchema = z.object({
  email: z.string().min(1, "El email o usuario es requerido."),
  password: z.string().min(1, "La contraseña es requerida."),
});

type FormValues = z.infer<typeof formSchema>;

export function LoginForm() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appName, setAppName] = useState("Panel de Administración");
  const [footerText, setFooterText] = useState("");

  useEffect(() => {
    const storedAppName = localStorage.getItem('appName');
    const storedFooterText = localStorage.getItem('footerText');
    if (storedAppName) {
      setAppName(storedAppName);
    }
    if (storedFooterText) {
      setFooterText(storedFooterText);
    }
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

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
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
             <UserCog className="h-12 w-12 text-primary" />
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
