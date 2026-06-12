"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getAdminById, updateAdmin } from "@/services/admin-service";
import { getSuperAdminById, updateSuperAdmin } from "@/services/super-admin-service";
import { getToolAdminById, updateToolAdmin } from "@/services/tool-admin-service";
import { getPlazaUserByUsername, updatePlazaUser } from "@/services/plaza-user-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Settings, Printer, Globe, AlertTriangle, Lock } from "lucide-react";

export function ImprentaTool() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [imprentaLink, setImprentaLink] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [inputUrl, setInputUrl] = React.useState("");
  const [unlockCodeInput, setUnlockCodeInput] = React.useState("");
  const [isUnlockDialogOpen, setIsUnlockDialogOpen] = React.useState(false);

  // Fetch link in real-time from Firestore on mount
  React.useEffect(() => {
    const fetchLink = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        let dbLink = "";
        if (user.isSuperAdmin) {
          const doc = await getSuperAdminById(user.id);
          dbLink = doc?.imprentaLink || "";
        } else if (user.isToolAdmin) {
          const doc = await getToolAdminById(user.id);
          dbLink = doc?.imprentaLink || "";
        } else if (user.isPlazaUser) {
          const doc = await getPlazaUserByUsername(user.username, user.prefix);
          dbLink = doc?.imprentaLink || "";
        } else {
          // Regular Admin
          const doc = await getAdminById(user.id);
          dbLink = doc?.imprentaLink || "";
        }
        setImprentaLink(dbLink);
        setInputUrl(dbLink);
        
        // If empty, trigger the modal automatically
        if (!dbLink) {
          setIsModalOpen(true);
        }
      } catch (error) {
        console.error("Error loading imprenta link:", error);
        toast({
          variant: "destructive",
          title: "Error de Carga",
          description: "No se pudo recuperar la configuración de la herramienta.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchLink();
  }, [user, toast]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockCodeInput === "012004") {
      setIsUnlockDialogOpen(false);
      setUnlockCodeInput("");
      setInputUrl(imprentaLink || "");
      setIsModalOpen(true);
    } else {
      toast({
        variant: "destructive",
        title: "Código Incorrecto",
        description: "El código de seguridad ingresado no es válido.",
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedUrl = inputUrl.trim();
    if (!trimmedUrl) {
      toast({
        variant: "destructive",
        title: "Campo requerido",
        description: "Por favor, ingresa una URL válida.",
      });
      return;
    }

    // Basic URL schema validation
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      toast({
        variant: "destructive",
        title: "URL Inválida",
        description: "El enlace debe comenzar con http:// o https://",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (user.isSuperAdmin) {
        await updateSuperAdmin(user.id, { imprentaLink: trimmedUrl });
      } else if (user.isToolAdmin) {
        await updateToolAdmin(user.id, { imprentaLink: trimmedUrl });
      } else if (user.isPlazaUser) {
        // Find doc first to get ID for PlazaUser
        const doc = await getPlazaUserByUsername(user.username, user.prefix);
        if (doc?.id) {
          await updatePlazaUser(doc.id, { imprentaLink: trimmedUrl });
        } else {
          throw new Error("Plaza user doc not found");
        }
      } else {
        // Regular Admin
        await updateAdmin(user.id, { imprentaLink: trimmedUrl });
      }

      setImprentaLink(trimmedUrl);
      updateUser({ imprentaLink: trimmedUrl });
      setIsModalOpen(false);

      toast({
        title: "Enlace Configurado",
        description: "El enlace de Imprenta se ha guardado correctamente.",
      });
    } catch (error) {
      console.error("Error saving imprenta link:", error);
      toast({
        variant: "destructive",
        title: "Error al Guardar",
        description: "Ocurrió un error al guardar la configuración.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative flex h-10 w-10">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-10 w-10 bg-indigo-600 flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          </span>
        </div>
        <p className="text-sm font-medium text-slate-500 animate-pulse">Cargando herramienta Imprenta...</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-[calc(100vh-120px)] w-full rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
      {imprentaLink ? (
        <div className="relative w-full h-full flex-1">
          <iframe
            src={imprentaLink}
            className="w-full h-full min-h-[calc(100vh-120px)] border-0 animate-fade-in"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
          {/* Floating settings gear */}
          <div className="absolute bottom-6 right-6 z-10">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur hover:scale-105 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 text-indigo-600 dark:text-indigo-400"
              onClick={() => {
                setIsUnlockDialogOpen(true);
              }}
            >
              <Settings className="h-5 w-5 animate-[spin_8s_linear_infinite]" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-full text-indigo-600 dark:text-indigo-400 mb-4">
            <Printer className="h-10 w-10 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold tracking-tight mb-2">Configuración requerida</h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Esta herramienta aún no tiene un enlace asignado. Configura el enlace de visualización para comenzar.
          </p>
          <Button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Configurar Enlace
          </Button>
        </div>
      )}

      {/* Embed Setup Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        // If there's no link yet, prevent closing the modal without configuring
        if (!imprentaLink && !open) {
          toast({
            title: "Acción requerida",
            description: "Debes configurar un enlace para habilitar la herramienta.",
          });
          return;
        }
        setIsModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-[480px] p-6 rounded-2xl">
          <form onSubmit={handleSave} className="space-y-6">
            <DialogHeader>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400 w-fit mb-2">
                <Globe className="h-6 w-6" />
              </div>
              <DialogTitle className="text-xl font-bold">Configurar Enlace de Imprenta</DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
                Ingresa el link web que deseas mostrar dentro de esta sección.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="imprenta-url" className="text-sm font-semibold">
                  URL del Enlace
                </Label>
                <Input
                  id="imprenta-url"
                  placeholder="https://ejemplo.com/visor-externo"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800"
                  disabled={isSaving}
                  required
                />
              </div>

              {/* Warning/Guide message about embed limitations */}
              <div className="flex gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Advertencia de Inserción (Iframe)</p>
                  <p>
                    Asegúrate de que la URL soporte ser embebida. Sitios web principales (como Google, Facebook o Wikipedia) pueden bloquear su inserción por motivos de seguridad.
                  </p>
                  <p className="font-medium mt-1">
                    Tip: Si usas Google Sheets o similar, utiliza la opción "Publicar en la web" y copia únicamente la URL resultante.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
              {imprentaLink && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="rounded-xl mr-auto"
                >
                  Cancelar
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl w-full sm:w-auto"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  "Guardar Enlace"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Unlock Security Dialog */}
      <Dialog open={isUnlockDialogOpen} onOpenChange={(open) => {
        setIsUnlockDialogOpen(open);
        if (!open) {
          setUnlockCodeInput("");
        }
      }}>
        <DialogContent className="sm:max-w-[400px] p-6 rounded-2xl">
          <form onSubmit={handleUnlock} className="space-y-6">
            <DialogHeader>
              <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl text-red-600 dark:text-red-400 w-fit mb-2">
                <Lock className="h-6 w-6" />
              </div>
              <DialogTitle className="text-xl font-bold">Código de Seguridad Requerido</DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
                Ingresa el código para poder editar la configuración de Imprenta.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="unlock-code" className="text-sm font-semibold">
                Código de Acceso
              </Label>
              <Input
                id="unlock-code"
                type="password"
                placeholder="••••••"
                value={unlockCodeInput}
                onChange={(e) => setUnlockCodeInput(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-center font-mono tracking-widest text-lg"
                autoComplete="off"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsUnlockDialogOpen(false)}
                className="rounded-xl mr-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
              >
                Desbloquear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
