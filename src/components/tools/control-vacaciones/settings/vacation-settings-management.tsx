"use client";
 
import * as React from "react";
import { PlusCircle, Loader2, Settings, Upload, Trash2, Image as ImageIcon, Smile, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getVacationRules, addVacationRule, updateVacationRule, deleteVacationRule, getVacationSettings, saveVacationSettings } from "@/services/vacaciones-service";
import type { VacationRule } from "@/lib/data";
import { VacationRulesTable } from "./vacation-rules-table";
import { VacationRuleForm, type VacationRuleFormValues } from "./vacation-rule-form";

const compressImage = (file: File, maxW: number, maxH: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                if (width > maxW) {
                    height = Math.round((height * maxW) / width);
                    width = maxW;
                }
                if (height > maxH) {
                    width = Math.round((width * maxH) / height);
                    height = maxH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", 0.8));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};
 
export function VacationSettingsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = React.useState<VacationRule[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<VacationRule | null>(null);


  const [logo, setLogo] = React.useState<string>("");
  const [mascot, setMascot] = React.useState<string>("");
  const [cardPrompt, setCardPrompt] = React.useState<string>("");
  const [imgbbApiKey, setImgbbApiKey] = React.useState<string>("");
  const [isSavingSettings, setIsSavingSettings] = React.useState(false);
 
  const fetchData = React.useCallback(async () => {
    if (!user?.prefix) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [rulesData, settingsData] = await Promise.all([
        getVacationRules(user.prefix),
        getVacationSettings(user.prefix)
      ]);
      setRules(rulesData);
      if (settingsData) {
        setLogo(settingsData.logoUrl || "");
        setMascot(settingsData.mascotUrl || "");
        setCardPrompt(settingsData.cardPrompt || "");
        setImgbbApiKey(settingsData.imgbbApiKey || "");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las reglas y ajustes de vacaciones." });
    } finally {
      setIsLoading(false);
    }
  }, [user?.prefix, toast]);

  const handleSaveSettings = async () => {
    if (!user?.prefix) return;
    setIsSavingSettings(true);
    try {
      await saveVacationSettings(user.prefix, {
        logoUrl: logo,
        mascotUrl: mascot,
        cardPrompt: cardPrompt,
        imgbbApiKey: imgbbApiKey,
      });
      toast({ title: "Éxito", description: "Identidad visual y ajustes de tarjetas guardados correctamente." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la configuración." });
    } finally {
      setIsSavingSettings(false);
    }
  };
 
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleFormSubmit = async (formData: VacationRuleFormValues) => {
    if (!user?.prefix) return;
 
    try {
      if (editingRule) {
        await updateVacationRule(editingRule.id, { ...formData });
        toast({ title: "Éxito", description: "Regla actualizada." });
      } else {
        await addVacationRule({ ...formData, prefix: user.prefix });
        toast({ title: "Éxito", description: "Regla registrada." });
      }
      setIsFormOpen(false);
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la regla." });
    }
  };
 
  const handleDelete = async (id: string) => {
    try {
      await deleteVacationRule(id);
      toast({ title: "Éxito", description: "Regla eliminada." });
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la regla." });
    }
  };
  
  const handleEdit = (rule: VacationRule) => {
    setEditingRule(rule);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingRule(null);
    setIsFormOpen(true);
  }
 
  const handleOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingRule(null);
    }
  };
 
  return (
    <div className="grid gap-6 md:grid-cols-3 items-start">
      {/* Left: Vacation rules management (Span 2) */}
      <div className="md:col-span-2">
        <Card className="premium-card hover:translate-y-0 hover:scale-100 border border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <Settings className="h-5 w-5 text-primary" />
                  Ajustes de Vacaciones
                </CardTitle>
                <CardDescription className="text-xs mt-1">Define los días de vacaciones correspondientes por año de antigüedad.</CardDescription>
              </div>
               <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    <Button size="sm" onClick={handleAddNew} className="bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                     <PlusCircle className="mr-2 h-4 w-4" />
                     Agregar Regla
                   </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg max-w-sm">
                  <DialogHeader className="border-b pb-3 mb-2">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      {editingRule ? 'Editar' : 'Agregar'} Regla de Vacaciones
                    </DialogTitle>
                  </DialogHeader>
                  <VacationRuleForm
                    onSubmit={handleFormSubmit}
                    rule={editingRule}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
             {isLoading ? (
              <div className="flex flex-col justify-center items-center h-40 gap-2">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground font-medium">Cargando reglas de asignación...</span>
              </div>
            ) : (
              <VacationRulesTable data={rules} onEdit={handleEdit} onDelete={handleDelete} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Visual Identity / Brand management (Span 1) */}
      <div className="md:col-span-1">
        <Card className="premium-card hover:translate-y-0 hover:scale-100 border border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <ImageIcon className="h-4.5 w-4.5 text-primary" />
              Identidad de Tarjetas
            </CardTitle>
            <CardDescription className="text-[11px] mt-0.5">
              Establece el logotipo y mascota para personalizar las tarjetas de cumpleaños.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            {/* LOGO */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-350 block">Logotipo de la Empresa</label>
              {logo ? (
                <div className="relative rounded-xl border border-slate-100 dark:border-slate-800 p-2 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col items-center gap-2">
                  <img src={logo} alt="Logo" className="max-h-24 object-contain rounded-lg" />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setLogo("")} 
                    className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg w-full"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover Logotipo
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors relative cursor-pointer group">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressed = await compressImage(file, 300, 300);
                          setLogo(compressed);
                        } catch (err) {
                          toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el logotipo." });
                        }
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                  <Upload className="mx-auto h-6 w-6 text-slate-400 group-hover:text-primary transition-colors mb-2" />
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Subir Logotipo</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Formatos: PNG, JPG (Autocomprimido)</p>
                </div>
              )}
            </div>

            {/* MASCOT */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-350 block">Mascota de Felicitación</label>
              {mascot ? (
                <div className="relative rounded-xl border border-slate-100 dark:border-slate-800 p-2 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col items-center gap-2">
                  <img src={mascot} alt="Mascota" className="max-h-24 object-contain rounded-lg" />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setMascot("")} 
                    className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg w-full"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover Mascota
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors relative cursor-pointer group">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressed = await compressImage(file, 300, 300);
                          setMascot(compressed);
                        } catch (err) {
                          toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la mascota." });
                        }
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
                  <Smile className="mx-auto h-6 w-6 text-slate-400 group-hover:text-primary transition-colors mb-2" />
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Subir Mascota</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Personaje para felicitar</p>
                </div>
              )}
            </div>

            {/* PROMPT PREDEFINIDO */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-350 block">Prompt de Generación (IA)</label>
              <textarea
                value={cardPrompt}
                onChange={(e) => setCardPrompt(e.target.value)}
                className="w-full h-24 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 outline-none focus:border-primary/60 transition-colors resize-none"
                placeholder="Ej. Genera una tarjeta de cumpleaños muy alegre con confeti para {name}. Usa el logo y mascota adjuntos..."
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Usa <code className="font-mono text-primary font-bold">{`{name}`}</code> para referirte al nombre del colaborador de forma dinámica.
              </p>
            </div>

            {/* IMGBB API KEY */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-350 block">Clave API de ImgBB</label>
              <input
                type="password"
                value={imgbbApiKey}
                onChange={(e) => setImgbbApiKey(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:border-primary/60 transition-colors"
                placeholder="Ingresa tu clave de API de ImgBB..."
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Para guardar el historial de tarjetas generadas, regístrate en <a href="https://imgbb.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">imgbb.com</a> y obtén una clave de API gratuita.
              </p>
            </div>

            <Button 
              onClick={handleSaveSettings} 
              disabled={isSavingSettings}
              className="w-full h-9 text-xs bg-gradient-to-r from-primary to-indigo-650 hover:from-primary/95 hover:to-indigo-650/95 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-lg"
            >
              {isSavingSettings ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Guardar Identidad
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
