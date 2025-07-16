
"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Trash2, ShieldAlert, ShieldCheck, UserCog } from "lucide-react";
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
import type { ToolAdmin, Admin, SuperAdmin } from "@/lib/data";


type CombinedAdmin = (
  | (Omit<ToolAdmin, 'toolId'> & { role: 'Admin de Herramienta'; editable: true })
  | (Omit<Admin, 'role' | 'accessibleTools'> & { role: 'Admin Global'; editable: false })
  | (Omit<SuperAdmin, 'password'> & { name: string; status: 'Activo'; role: 'Super Admin'; editable: false })
);

type UsersTableProps = {
    data: CombinedAdmin[];
    onEdit: (admin: CombinedAdmin) => void;
    onDelete: (id: string) => void;
}

const RoleBadge = ({ role }: { role: CombinedAdmin['role'] }) => {
  switch (role) {
    case 'Super Admin':
      return <Badge variant="destructive" className="gap-1"><UserCog className="h-3 w-3" />{role}</Badge>;
    case 'Admin Global':
      return <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3"/>{role}</Badge>;
    case 'Admin de Herramienta':
      return <Badge variant="outline" className="gap-1"><ShieldAlert className="h-3 w-3"/>{role}</Badge>;
    default:
      return <Badge>{role}</Badge>;
  }
};


export function UsersTable({ data, onEdit, onDelete }: UsersTableProps) {
  const [filter, setFilter] = React.useState("");
  
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

  return (
    <>
      <div className="flex items-center pb-4">
        <Input
          placeholder="Buscar por nombre, usuario o rol..."
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
              <TableHead>Rol de Acceso</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.name}</TableCell>
                  <TableCell>{admin.username}</TableCell>
                  <TableCell>
                    <RoleBadge role={admin.role} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(admin.status)}>
                      {admin.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Alternar menú</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => onEdit(admin)} disabled={!admin.editable}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onSelect={() => onDelete(admin.id)} 
                          disabled={!admin.editable}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
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
