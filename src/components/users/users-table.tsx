
"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Trash2, Shield, User, Building, Landmark, BookCheck, Files, Eye, EyeOff } from "lucide-react";
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
import type { PlazaUser, ToolAdmin } from "@/lib/data";
import { getCustomizedTools } from "@/lib/data";
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

type CombinedUser = PlazaUser | ToolAdmin;

type UsersTableProps = {
    data: CombinedUser[];
    onEdit: (user: any) => void;
    onDelete: (id: string) => void;
    isSuperAdminView?: boolean;
}

function isPlazaUser(user: any): user is PlazaUser {
    return 'plazaAccess' in user;
}

function isToolAdmin(user: any): user is ToolAdmin {
    return 'toolId' in user;
}

const PasswordCell = ({ password }: { password?: string }) => {
    const [showPassword, setShowPassword] = React.useState(false);
    if (!password) {
        return <span className="text-muted-foreground">N/A</span>
    }
    return (
        <div className="flex items-center gap-2">
            <span>{showPassword ? password : '••••••••'}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
        </div>
    )
}

export function UsersTable({ data, onEdit, onDelete, isSuperAdminView = false }: UsersTableProps) {
  const [filter, setFilter] = React.useState("");
  const allTools = getCustomizedTools();

  const filteredData = data.filter((user) =>
    user.name.toLowerCase().includes(filter.toLowerCase()) ||
    user.username.toLowerCase().includes(filter.toLowerCase()) ||
    user.prefix?.toLowerCase().includes(filter.toLowerCase())
  );

  const getStatusBadgeVariant = (status: "Activo" | "Inactivo") => {
    switch (status) {
      case "Activo":
        return "secondary";
      case "Inactivo":
        return "destructive";
    }
  };

  const getToolIcon = (toolId: string) => {
    const tool = allTools.find(t => t.id === toolId);
    return tool ? tool.icon : User;
  }

  const getToolName = (toolId: string) => {
    const tool = allTools.find(t => t.id === toolId);
    return tool ? tool.name : "Herramienta Desconocida";
  }

  return (
    <>
      <div className="flex items-center pb-4">
        <Input
          placeholder="Buscar usuarios..."
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
              {isSuperAdminView && <TableHead>Empresa (Prefijo)</TableHead>}
              <TableHead>Acceso Principal</TableHead>
              {isSuperAdminView && isToolAdmin(data[0]) && <TableHead>Contraseña</TableHead>}
              <TableHead>Estado</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  {isSuperAdminView && (
                    <TableCell>
                        <Badge variant="outline">{user.prefix}</Badge>
                    </TableCell>
                  )}
                   <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {isPlazaUser(user) && user.plazaAccess.map(pa => (
                        <Badge key={pa.plazaId} variant="outline" className="gap-1.5"><Building className="h-3 w-3" />{pa.plazaName}</Badge>
                      ))}
                      {isToolAdmin(user) && (
                        <Badge variant="secondary" className="gap-1.5">
                            {React.createElement(getToolIcon(user.toolId), { className: "h-3 w-3" })}
                            {getToolName(user.toolId)}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                   {isSuperAdminView && isToolAdmin(user) && (
                     <TableCell>
                        <PasswordCell password={user.password} />
                     </TableCell>
                   )}
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(user.status)}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Alternar menú</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => onEdit(user)}>
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
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el usuario.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(user.id)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isSuperAdminView ? 7 : 5} className="h-24 text-center">
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
