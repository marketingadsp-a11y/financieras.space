

"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCompanyProfileByPrefix, saveCompanyProfile } from "@/services/company-profile-service";
import { Loader2, Image, Save, MessageSquare, ThumbsDown } from "lucide-react";
import type { CompanyProfile } from "@/lib/data";
import { Textarea } from "@/components/ui/textarea";

export function VisorAppSettings() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [imageUrl, setImageUrl] = React.useState('');
    const [failureImageUrl, setFailureImageUrl] = React.useState('');
    const [successText, setSuccessText] = React.useState('');

    React.useEffect(() => {
        const fetchSettings = async () => {
            if (!user?.prefix) {
                setIsLoading(false);
                return;
            }
            try {
                const profile = await getCompanyProfileByPrefix(user.prefix);
                if (profile?.visorAppSuccessImageUrl) {
                    setImageUrl(profile.visorAppSuccessImageUrl);
                }
                 if (profile?.visorAppFailureImageUrl) {
                    setFailureImageUrl(profile.visorAppFailureImageUrl);
                }
                if (profile?.visorAppSuccessText) {
                    setSuccessText(profile.visorAppSuccessText);
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los ajustes.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, [user?.prefix, toast]);

    const handleSave = async () => {
        if (!user?.prefix) return;
        setIsSaving(true);
        try {
            await saveCompanyProfile(user.prefix, { 
                visorAppSuccessImageUrl: imageUrl,
                visorAppFailureImageUrl: failureImageUrl,
                visorAppSuccessText: successText,
            });
            toast({ title: "Éxito", description: "Ajustes guardados correctamente." });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron guardar los ajustes.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex justify-center items-center h-40">
                    <Loader2 className="mr-2 h-8 w-8 animate-spin" /> Cargando...
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configuración de VisorApp</CardTitle>
                <CardDescription>
                    Personaliza la pantalla que se muestra al registrar una visita.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="image-url">URL de la Imagen de Éxito</Label>
                    <div className="flex items-center gap-2">
                        <Image className="h-5 w-5 text-muted-foreground"/>
                        <Input
                            id="image-url"
                            placeholder="https://ejemplo.com/imagen_exito.png"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                        />
                    </div>
                </div>
                {imageUrl && (
                    <div className="border rounded-lg p-4 flex flex-col items-center gap-4">
                        <p className="text-sm font-medium">Vista Previa (Éxito)</p>
                        <img src={imageUrl} alt="Vista previa de la imagen de éxito" className="max-w-xs max-h-48 rounded-md object-contain" />
                    </div>
                )}

                 <div className="space-y-2">
                    <Label htmlFor="failure-image-url">URL de la Imagen de Error (No Éxito)</Label>
                    <div className="flex items-center gap-2">
                        <ThumbsDown className="h-5 w-5 text-muted-foreground"/>
                        <Input
                            id="failure-image-url"
                            placeholder="https://ejemplo.com/imagen_error.png"
                            value={failureImageUrl}
                            onChange={(e) => setFailureImageUrl(e.target.value)}
                        />
                    </div>
                </div>
                {failureImageUrl && (
                    <div className="border rounded-lg p-4 flex flex-col items-center gap-4">
                        <p className="text-sm font-medium">Vista Previa (Error)</p>
                        <img src={failureImageUrl} alt="Vista previa de la imagen de error" className="max-w-xs max-h-48 rounded-md object-contain" />
                    </div>
                )}

                 <div className="space-y-2">
                    <Label htmlFor="success-text">Texto de Éxito Personalizado</Label>
                    <div className="flex items-start gap-2">
                        <MessageSquare className="h-5 w-5 text-muted-foreground mt-2"/>
                        <Textarea
                            id="success-text"
                            placeholder="Ej. ¡Gracias por tu visita! Reporta cualquier incidencia."
                            value={successText}
                            onChange={(e) => setSuccessText(e.target.value)}
                        />
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                    Guardar Cambios
                </Button>
            </CardFooter>
        </Card>
    );
}
