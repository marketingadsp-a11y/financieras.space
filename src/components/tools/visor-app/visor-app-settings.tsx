

"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCompanyProfileByPrefix, saveCompanyProfile } from "@/services/company-profile-service";
import { Loader2, Image, Save } from "lucide-react";
import type { CompanyProfile } from "@/lib/data";

export function VisorAppSettings() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [imageUrl, setImageUrl] = React.useState('');

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
            await saveCompanyProfile(user.prefix, { visorAppSuccessImageUrl: imageUrl });
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
                    Personaliza la imagen que se muestra al registrar una visita exitosa en la aplicación de escaneo QR.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="image-url">URL de la Imagen de Éxito</Label>
                    <div className="flex items-center gap-2">
                        <Image className="h-5 w-5 text-muted-foreground"/>
                        <Input
                            id="image-url"
                            placeholder="https://ejemplo.com/imagen.png"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                        />
                    </div>
                </div>
                {imageUrl && (
                    <div className="border rounded-lg p-4 flex flex-col items-center gap-4">
                        <p className="text-sm font-medium">Vista Previa</p>
                        <img src={imageUrl} alt="Vista previa de la imagen de éxito" className="max-w-xs max-h-48 rounded-md object-contain" />
                    </div>
                )}
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
