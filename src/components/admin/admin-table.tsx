
"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Admin, CompanyProfile } from "@/lib/data";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/auth-context";

type AdminTableProps = {
    data: Admin[];
    profiles: CompanyProfile[];
    onEdit: (admin: Admin) => void;
    onDelete: (id: string) => void;
}

// Helper to determine text color (black or white) based on background hex color
const getTextColorForBackground = (hexColor: string): string => {
  if (!hexColor) return '#18181b'; // Default dark text
  const rgb = parseInt(hexColor.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma < 128 ? '#ffffff' : '#18181b';
};


export function AdminTable({ data, profiles, onEdit, onDelete }: AdminTableProps) {
  const { user } = useAuth();
  const [filter, setFilter] = React.useState("");
  const [deleteConfirmationText, setDeleteConfirmationText] = React.useState('');
  
  const filteredData = data.filter((admin) =>
    Object.values(admin).some((value) =>
      String(value).toLowerCase().includes(filter.toLowerCase())
    )
  );

  const getStatusBadgeVariant = (status: "Activo" | "Inactivo") => {
    switch (status) {
      case "Activo":
        return "secondary";
      case "Inactivo":
        return "destructive";
    }
  };

  const getPrefixBadgeStyle = (prefix: string | undefined): React.CSSProperties => {
    if (!prefix || !user?.isSuperAdmin) return {};
    const profile = profiles.find(p => p.id === prefix);
    if (profile?.loginBackgroundColor) {
      return {
        backgroundColor: profile.loginBackgroundColor,
        color: getTextColorForBackground(profile.loginBackgroundColor),
        borderColor: 'transparent'
      };
    }
    return {};
  };

  return (
    <>
      <div className="flex items-center pb-4">
        <Input
          placeholder="Buscar por nombre, usuario o empresa..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Usuario</TableHead>
              {user?.isSuperAdmin && <TableHead>Empresa (Prefijo)</TableHead>}
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((admin) => {
                const expectedConfirmationText = `${admin.name} eliminar`;
                return (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.name}</TableCell>
                  <TableCell>{admin.username}</TableCell>
                  {user?.isSuperAdmin && (
                    <TableCell>
                      {admin.prefix ? <Badge style={getPrefixBadgeStyle(admin.prefix)}>{admin.prefix}</Badge> : <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline">{admin.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(admin.status)}>
                      {admin.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                     <AlertDialog onOpenChange={(open) => !open && setDeleteConfirmationText('')}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Alternar menú</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => onEdit(admin)}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción es irreversible. Se eliminará permanentemente al administrador.
                                Para confirmar, escribe <strong className="text-foreground">{expectedConfirmationText}</strong> a continuación.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Input
                            id="delete-confirm"
                            value={deleteConfirmationText}
                            onChange={(e) => setDeleteConfirmationText(e.target.value)}
                            placeholder={expectedConfirmationText}
                            autoComplete="off"
                            autoFocus
                            />
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                disabled={deleteConfirmationText !== expectedConfirmationText}
                                onClick={() => onDelete(admin.id)}
                                className="bg-destructive hover:bg-destructive/90"
                            >
                                Sí, eliminar administrador
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              )})
            ) : (
              <TableRow>
                <TableCell colSpan={user?.isSuperAdmin ? 6 : 5} className="h-24 text-center">
                  No se encontraron resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
