
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import type { Plaza } from "@/lib/data";

const formSchema = z.object({
  name: z.string().min(3, "El nombre de la plaza es requerido (mínimo 3 caracteres)."),
});


type PlazaFormProps = {
  onSubmit: (data: any) => void;
  plaza?: Plaza | null;
};

export function PlazaForm({ onSubmit, plaza }: PlazaFormProps) {
    const isEditing = !!plaza;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: plaza?.name || "",
        },
    });

    const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
        const dataToSend: any = { ...values };
        if (isEditing) {
            dataToSend.id = plaza.id;
        }
        onSubmit(dataToSend);
    };


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre de la Plaza</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej. Oficina Centro" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full">
                    {isEditing ? 'Guardar Cambios' : 'Crear Plaza'}
                </Button>
            </form>
        </Form>
    );
}
