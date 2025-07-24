
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
import { Briefcase, Loader2, Pencil, Trash2, MessageSquare, Building, Palette } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getCompanyProfileByPrefix, saveCompanyProfile, getAllCompanyProfiles, deleteCompanyProfile } from "@/services/company-profile-service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { CompanyProfile } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
 import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription as AlertDialogDescriptionComponent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Textarea } from "../ui/textarea";

const companyProfileSchema = z.object({
  companyName: z.string().min(3, "El nombre de la empresa debe tener al menos 3 caracteres."),
  logoUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
  loginBackgroundColor: z.string().optional(),
  whatsappLinkTemplate: z.string().optional(),
});

type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>;

// Form component for reuse in dialogs
const ProfileForm = ({ profile, onSubmit, isSaving }: { profile?: Partial<CompanyProfile>, onSubmit: (data: CompanyProfileFormValues) => void, isSaving: boolean }) => {
    const form = useForm<CompanyProfileFormValues>({
        resolver: zodResolver(companyProfileSchema),
        defaultValues: {
            companyName: profile?.companyName || "",
            logoUrl: profile?.logoUrl || "",
            loginBackgroundColor: profile?.loginBackgroundColor || "#f4f4f5", // Default to muted gray
            whatsappLinkTemplate: profile?.whatsappLinkTemplate || "https://api.whatsapp.com/send?phone=52{TELEFONO}&text=Estimado%20{NOMBRE}%0A%0ATienes%20un%20saldo%20vencido%20por%20la%20cantidad%20de%3A%20%24{DEBE}%2C%20por%20favor%20acude%20a%20nuestra%20oficina%20de%20atenci%C3%B3n%20para%20evitar%20procesar%20su%20adeudo%20en%20materia%20legal.%20",
        },
    });
    
    const currentLogoUrl = form.watch("logoUrl");
    const currentCompanyName = form.watch("companyName");

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                 <Accordion type="multiple" className="w-full space-y-4" defaultValue={['item-1', 'item-2']}>
                    <AccordionItem value="item-1" className="border-b-0">
                        <div className="p-4 border rounded-lg">
                        <AccordionTrigger className="py-0 hover:no-underline">
                           <div className="flex items-center gap-4">
                                <div className="p-2 bg-primary/10 rounded-lg"><Briefcase className="h-6 w-6 text-primary"/></div>
                                <div>
                                    <p className="font-semibold text-base">Identidad de la Empresa</p>
                                    <p className="text-sm text-muted-foreground font-normal">Nombre, logo y color para el login.</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-6 mt-4 border-t">
                            <div className="space-y-6">
                                <FormField control={form.control} name="companyName" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Nombre de la Empresa</FormLabel>
                                    <FormControl><Input placeholder="El nombre de tu empresa" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="logoUrl" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Logotipo</FormLabel>
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-20 w-20"><AvatarImage src={currentLogoUrl} alt={currentCompanyName} /><AvatarFallback><Briefcase className="h-10 w-10 text-muted-foreground"/></AvatarFallback></Avatar>
                                        <div className="flex-grow">
                                            <FormControl><Input placeholder="https://ejemplo.com/logo.png" {...field} /></FormControl>
                                            <FormDescriptionComponent className="mt-2">Pega una URL a una imagen para el logotipo.</FormDescriptionComponent>
                                        </div>
                                    </div>
                                    <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="loginBackgroundColor" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Color de Fondo del Login</FormLabel>
                                    <FormControl>
                                    <div className="flex items-center gap-2">
                                        <Input type="color" className="w-16 h-10 p-1" {...field} />
                                        <Input type="text" placeholder="#f4f4f5" {...field} />
                                    </div>
                                    </FormControl>
                                    <FormDescriptionComponent>Selecciona un color para el fondo de la pantalla de inicio de sesión.</FormDescriptionComponent>
                                    <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                        </AccordionContent>
                        </div>
                    </AccordionItem>
                    <AccordionItem value="item-2" className="border-b-0">
                        <div className="p-4 border rounded-lg">
                        <AccordionTrigger className="py-0 hover:no-underline">
                           <div className="flex items-center gap-4">
                                <div className="p-2 bg-primary/10 rounded-lg"><MessageSquare className="h-6 w-6 text-primary"/></div>
                                <div>
                                    <p className="font-semibold text-base">Plantilla de WhatsApp</p>
                                    <p className="text-sm text-muted-foreground font-normal">Edita el enlace para los envíos de WhatsApp.</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-6 mt-4 border-t">
                             <FormField
                                control={form.control}
                                name="whatsappLinkTemplate"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Plantilla de Enlace de WhatsApp</FormLabel>
                                    <FormControl>
                                        <Textarea className="min-h-[150px] font-mono text-xs" placeholder="Pega aquí el enlace de WhatsApp" {...field} />
                                    </FormControl>
                                    <FormDescriptionComponent>
                                        Usa los marcadores <code className="bg-muted px-1 py-0.5 rounded-sm">{'{NOMBRE}'}</code>, <code className="bg-muted px-1 py-0.5 rounded-sm">{'{TELEFONO}'}</code> y <code className="bg-muted px-1 py-0.5 rounded-sm">{'{DEBE}'}</code> para insertar datos del cliente.
                                    </FormDescriptionComponent>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                        </AccordionContent>
                        </div>
                    </AccordionItem>
                </Accordion>
                 <CardFooter className="px-0 pt-6">
                    <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Cambios
                    </Button>
                </CardFooter>
            </form>
        </Form>
    );
};


// Main component: Admin view
function AdminProfileView() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    
    const [initialProfile, setInitialProfile] = React.useState<Partial<CompanyProfile>>({});
    
    React.useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.prefix) return;
            setIsLoading(true);
            try {
                const profile = await getCompanyProfileByPrefix(user.prefix);
                if (profile) {
                    setInitialProfile(profile);
                }
            } catch (error) {
                toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el perfil." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [user?.prefix, toast]);
    
    const onSubmit = async (data: CompanyProfileFormValues) => {
        if (!user?.prefix) return;
        setIsSaving(true);
        try {
            await saveCompanyProfile(user.prefix, data);
            toast({ title: "Éxito", description: "Perfil actualizado." });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el perfil." });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <Card><CardHeader><CardTitle>Perfil de Empresa</CardTitle><CardDescription>Cargando perfil...</CardDescription></CardHeader>
            <CardContent className="flex justify-center items-center h-40"><Loader2 className="mr-2 h-8 w-8 animate-spin" /></CardContent></Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Perfil de Empresa</CardTitle>
                <CardDescription>Personaliza cómo se muestra tu empresa en el inicio de sesión y otras configuraciones. Estos cambios se aplicarán a todos los usuarios con el prefijo: <span className="font-bold">{user?.prefix}</span>.</CardDescription>
            </CardHeader>
             <CardContent>
                <ProfileForm profile={initialProfile} onSubmit={onSubmit} isSaving={isSaving} />
            </CardContent>
        </Card>
    );
}

// Main component: SuperAdmin view
function SuperAdminProfileView() {
    const { toast } = useToast();
    const [profiles, setProfiles] = React.useState<CompanyProfile[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [editingProfile, setEditingProfile] = React.useState<CompanyProfile | null>(null);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    
    const fetchProfiles = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const allProfiles = await getAllCompanyProfiles();
            setProfiles(allProfiles);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los perfiles de empresa." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    const handleEditClick = (profile: CompanyProfile) => {
        setEditingProfile(profile);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (data: CompanyProfileFormValues) => {
        if (!editingProfile) return;
        setIsSaving(true);
        try {
            await saveCompanyProfile(editingProfile.id, data);
            toast({ title: "Éxito", description: `Perfil para ${editingProfile.id} actualizado.` });
            closeDialog();
            fetchProfiles();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el perfil." });
        } finally {
            setIsSaving(false);
        }
    };
    
     const handleDeleteProfile = async (prefix: string) => {
        try {
            await deleteCompanyProfile(prefix);
            toast({ title: "Éxito", description: `Perfil para ${prefix} eliminado.` });
            fetchProfiles();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el perfil." });
        }
    };
    
    const closeDialog = () => {
        setIsFormOpen(false);
        setEditingProfile(null);
    }
    
    return (
        <Card>
            <CardHeader>
                 <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Gestor de Perfiles de Empresa</CardTitle>
                        <CardDescription>Administra el nombre y logotipo para cada prefijo de empresa.</CardDescription>
                    </div>
                    {/* Placeholder for future "Add New" button */}
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                        <span>Cargando perfiles...</span>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                             <TableHeader>
                                <TableRow>
                                <TableHead className="w-[80px]">Logo</TableHead>
                                <TableHead>Nombre de Empresa</TableHead>
                                <TableHead>Prefijo (ID)</TableHead>
                                <TableHead>Color Login</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {profiles.length > 0 ? (
                                    profiles.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell>
                                                <Avatar><AvatarImage src={p.logoUrl} /><AvatarFallback><Building /></AvatarFallback></Avatar>
                                            </TableCell>
                                            <TableCell className="font-medium">{p.companyName}</TableCell>
                                            <TableCell><span className="font-mono text-xs bg-muted px-2 py-1 rounded">{p.id}</span></TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: p.loginBackgroundColor || '#FFFFFF' }}></div>
                                                    <span className="font-mono text-xs">{p.loginBackgroundColor || 'Default'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="icon" onClick={() => handleEditClick(p)}><Pencil className="h-4 w-4" /></Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                                <AlertDialogDescriptionComponent>Esta acción eliminará el perfil de la empresa <span className="font-bold">{p.companyName} ({p.id})</span>. No se puede deshacer.</AlertDialogDescriptionComponent>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteProfile(p.id)}>Eliminar</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">No hay perfiles de empresa. Se crearán cuando un admin los guarde.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

             <Dialog open={isFormOpen} onOpenChange={closeDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editando Perfil de: {editingProfile?.companyName}</DialogTitle>
                        <DialogDescription>Prefijo: <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{editingProfile?.id}</span></DialogDescription>
                    </DialogHeader>
                    {editingProfile && (
                        <ProfileForm
                            profile={editingProfile}
                            onSubmit={handleFormSubmit}
                            isSaving={isSaving}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    )
}


export function CompanyProfileManagement() {
  const { user } = useAuth();
  
  if (user?.isSuperAdmin) {
    return <SuperAdminProfileView />;
  }
  
  return <AdminProfileView />;
}
