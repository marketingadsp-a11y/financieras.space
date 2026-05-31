
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      text: string;
      size: number;
      color: string;
      vx: number;
      vy: number;
      alpha: number;
      decay: number;
      rotation: number;
      rotSpeed: number;
    }> = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let lastX = 0;
    let lastY = 0;
    // Premium neon colors (emeralds, golds, soft indigos)
    const colors = ["#10b981", "#34d399", "#059669", "#fbbf24", "#f59e0b", "#6366f1"];

    const addParticle = (x: number, y: number, isAmbient = false) => {
      const size = Math.floor(Math.random() * 12) + 12; // 12px to 24px
      const color = colors[Math.floor(Math.random() * colors.length)];
      const vx = (Math.random() - 0.5) * 1.5;
      const vy = isAmbient ? -(Math.random() * 0.8 + 0.4) : (Math.random() - 0.5) * 1.5 - 0.5; // Ambient floats up slower, trail drifts
      const decay = Math.random() * 0.008 + 0.008; // slower fade out for trail
      const rotation = Math.random() * Math.PI * 2;
      const rotSpeed = (Math.random() - 0.5) * 0.02;

      particles.push({
        x,
        y,
        text: "$",
        size,
        color,
        vx,
        vy,
        alpha: 1,
        decay,
        rotation,
        rotSpeed
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
      if (dist > 15) {
        addParticle(e.clientX, e.clientY);
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Ambient floating dollar signs from the bottom of the screen
    const ambientInterval = setInterval(() => {
      if (particles.length < 50) {
        const x = Math.random() * window.innerWidth;
        const y = window.innerHeight + 20;
        addParticle(x, y, true);
      }
    }, 500);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.rotation += p.rotSpeed;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;
        ctx.font = `bold ${p.size}px "Inter", sans-serif`;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fillText(p.text, 0, 0);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(ambientInterval);
    };
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
        className="relative flex min-h-screen items-center justify-center p-4 transition-colors duration-500 overflow-hidden"
        style={{ backgroundColor: backgroundColor }}
    >
      {/* Interactive mouse trail canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Dynamic Keyframe Styles */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-40px, 40px) scale(1.05); }
        }
        @keyframes fadeInZoom {
          from {
            opacity: 0;
            transform: scale(0.97) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-float-1 {
          animation: float-slow 15s infinite ease-in-out;
        }
        .animate-float-2 {
          animation: float-delayed 12s infinite ease-in-out;
        }
        .login-card-animate {
          animation: fadeInZoom 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Floating Ambient Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] max-w-[450px] max-h-[450px] rounded-full opacity-30 dark:opacity-20 blur-[80px] animate-float-1"
          style={{ 
            background: `radial-gradient(circle, ${backgroundColor === '#f4f4f5' ? '#6366f1' : backgroundColor} 0%, transparent 70%)` 
          }} 
        />
        <div 
          className="absolute -bottom-[10%] -right-[10%] w-[55vw] h-[55vw] max-w-[500px] max-h-[500px] rounded-full opacity-25 dark:opacity-15 blur-[90px] animate-float-2"
          style={{ 
            background: `radial-gradient(circle, ${backgroundColor === '#f4f4f5' ? '#ec4899' : '#3b82f6'} 0%, transparent 75%)` 
          }} 
        />
      </div>

      <Card className="w-full max-w-sm border-white/20 dark:border-slate-800/40 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:shadow-primary/10 hover:border-primary/20 login-card-animate">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
             {logoUrl ? (
                <Avatar className="h-20 w-20 border-2 border-primary/20 p-1 bg-white dark:bg-slate-950 shadow-lg hover:scale-105 transition-transform duration-300">
                    <AvatarImage src={logoUrl} alt={appName} className="object-contain rounded-full" />
                    <AvatarFallback><UserCog className="h-10 w-10 text-primary" /></AvatarFallback>
                </Avatar>
             ) : (
                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 text-primary shadow-inner animate-pulse" style={{ animationDuration: '4s' }}>
                  <UserCog className="h-12 w-12" />
                </div>
             )}
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">{appName}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Ingrese sus credenciales para acceder al sistema.
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
                    <FormLabel className="text-xs font-semibold text-slate-700 dark:text-slate-300">Usuario o Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ej. plaza.usuario"
                        {...field}
                        onChange={handleUsernameChange} // Use custom change handler
                        className="transition-all duration-300 focus:scale-[1.01] focus:shadow-md focus:shadow-primary/5 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-xl h-9"
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
                    <FormLabel className="text-xs font-semibold text-slate-700 dark:text-slate-300">Contraseña</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        className="transition-all duration-300 focus:scale-[1.01] focus:shadow-md focus:shadow-primary/5 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-xl h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
              <Button 
                type="submit" 
                disabled={isLoading} 
                className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] rounded-xl h-9 text-xs font-bold"
              >
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
          <CardFooter className="pt-0 pb-4">
            <p className="w-full text-center text-[10px] text-muted-foreground">
              {footerText}
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
