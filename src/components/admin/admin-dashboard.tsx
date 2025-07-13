"use client";

import * as React from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminTable } from "@/components/admin/admin-table";
import { AdminForm } from "@/components/admin/admin-form";
import type { Admin } from "@/lib/data";
import { initialAdmins } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AdminDashboard() {
  const [admins, setAdmins] = React.useState<Admin[]>(initialAdmins);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingAdmin, setEditingAdmin] = React.useState<Admin | null>(null);

  const handleAddAdmin = (newAdmin: Omit<Admin, 'id'>) => {
    setAdmins(prev => [...prev, { ...newAdmin, id: `ADM${Date.now()}` }]);
    setIsFormOpen(false);
  };

  const handleUpdateAdmin = (updatedAdmin: Admin) => {
    setAdmins(prev => prev.map(admin => admin.id === updatedAdmin.id ? updatedAdmin : admin));
    setEditingAdmin(null);
    setIsFormOpen(false);
  };

  const handleDeleteAdmin = (adminId: string) => {
    setAdmins(prev => prev.filter(admin => admin.id !== adminId));
  };
  
  const handleEditClick = (admin: Admin) => {
      setEditingAdmin(admin);
      setIsFormOpen(true);
  }

  const handleOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingAdmin(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Administradores</CardTitle>
            <CardDescription>
              Crea, edita y elimina administradores de la plataforma.
            </CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Administrador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAdmin ? 'Editar' : 'Agregar'} Administrador</DialogTitle>
              </DialogHeader>
              <AdminForm
                onSubmit={editingAdmin ? handleUpdateAdmin : handleAddAdmin}
                admin={editingAdmin}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <AdminTable data={admins} onEdit={handleEditClick} onDelete={handleDeleteAdmin} />
      </CardContent>
    </Card>
  );
}
