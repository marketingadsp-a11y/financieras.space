"use client";

import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Trash2, Download, Eye, Images, RefreshCw, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getGeneratedCards, deleteGeneratedCard, type GeneratedCard } from "@/services/vacaciones-service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function TarjetasGeneradasPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cards, setCards] = React.useState<GeneratedCard[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedCard, setSelectedCard] = React.useState<GeneratedCard | null>(null);
  const [cardToDelete, setCardToDelete] = React.useState<GeneratedCard | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchCards = React.useCallback(async () => {
    if (!user?.prefix) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getGeneratedCards(user.prefix);
      setCards(data);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las tarjetas generadas." });
    } finally {
      setIsLoading(false);
    }
  }, [user?.prefix, toast]);

  React.useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleDeleteCard = async () => {
    if (!cardToDelete) return;
    setIsDeleting(true);
    try {
      await deleteGeneratedCard(cardToDelete.id);
      toast({ title: "Éxito", description: "Tarjeta eliminada del historial." });
      setCards(prev => prev.filter(c => c.id !== cardToDelete.id));
      setCardToDelete(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la tarjeta." });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (card: GeneratedCard) => {
    try {
      const response = await fetch(card.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Tarjeta_${card.employeeName.replace(/\s+/g, "_")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback redirect if blob download fails
      window.open(card.imageUrl, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gradient flex items-center gap-2">
            <Images className="h-8 w-8 text-primary" />
            Tarjetas Generadas
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Visualiza, descarga y administra el historial de tarjetas de felicitación creadas con IA.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchCards} 
          disabled={isLoading}
          className="h-8 text-xs rounded-xl flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Sincronizar
        </Button>
      </div>

      {/* Main Content */}
      <Card className="premium-card hover:translate-y-0 hover:scale-100 border border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-60 gap-2">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground font-medium">Cargando galería de tarjetas...</span>
            </div>
          ) : cards.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {cards.map(card => (
                <div 
                  key={card.id} 
                  className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02] flex flex-col"
                >
                  {/* Image container with overlays */}
                  <div className="relative aspect-[16/9] w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                    <img 
                      src={card.imageUrl} 
                      alt={`Tarjeta de ${card.employeeName}`} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    
                    {/* Hover Actions Panel */}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => setSelectedCard(card)}
                        className="h-8 w-8 rounded-full shadow-md hover:scale-110 transition-transform bg-white/90 text-slate-800"
                        title="Ver en pantalla completa"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleDownload(card)}
                        className="h-8 w-8 rounded-full shadow-md hover:scale-110 transition-transform bg-white/90 text-slate-800"
                        title="Descargar imagen"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="p-3.5 flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm truncate">
                        {card.employeeName}
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(card.createdAt, "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-900 flex justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCardToDelete(card)}
                        className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg"
                        title="Eliminar tarjeta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-800 mb-4 text-slate-400 dark:text-slate-650">
                <Images className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No hay tarjetas guardadas</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
                Las tarjetas generadas automáticamente con IA se guardarán e indexarán aquí siempre y cuando tengas configurada tu **Clave API de ImgBB** en Ajustes.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Screen Full Preview Dialog */}
      <Dialog open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
        <DialogContent className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg max-w-4xl w-[90vw] p-5 flex flex-col">
          <DialogHeader className="border-b pb-3 mb-4">
            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Tarjeta de Felicitación - {selectedCard?.employeeName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Creada el {selectedCard && format(selectedCard.createdAt, "PPP 'a las' p", { locale: es })}
            </DialogDescription>
          </DialogHeader>

          {selectedCard && (
            <div className="flex-grow flex flex-col gap-4">
              <div className="w-full flex justify-center items-center border bg-slate-950 rounded-xl overflow-hidden p-2 min-h-[300px] max-h-[70vh]">
                <img 
                  src={selectedCard.imageUrl} 
                  alt={`Tarjeta de ${selectedCard.employeeName}`} 
                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                />
              </div>

              <div className="flex justify-between items-center mt-2">
                {selectedCard.deleteUrl ? (
                  <a 
                    href={selectedCard.deleteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> Ver enlace de ImgBB
                  </a>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedCard(null)}
                    className="h-9 px-4 text-xs rounded-xl"
                  >
                    Cerrar
                  </Button>
                  <Button
                    onClick={() => selectedCard && handleDownload(selectedCard)}
                    className="h-9 px-5 text-xs bg-gradient-to-r from-primary to-indigo-600 hover:from-primary hover:to-indigo-650 text-white shadow-md rounded-xl flex items-center gap-1.5"
                  >
                    <Download className="h-4 w-4" /> Descargar Tarjeta
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!cardToDelete} onOpenChange={(open) => !open && setCardToDelete(null)}>
        <AlertDialogContent className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">¿Eliminar del historial?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground mt-2">
              ¿Estás seguro de que deseas eliminar del historial la tarjeta de <strong className="text-slate-800 dark:text-slate-200">{cardToDelete?.employeeName}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCard} 
              disabled={isDeleting}
              className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
