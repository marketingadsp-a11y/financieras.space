
"use client";

import * as React from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseCategoryTable } from "@/components/tools/daily-control/categories/expense-category-table";
import { ExpenseCategoryForm } from "@/components/tools/daily-control/categories/expense-category-form";
import type { ExpenseCategory } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getExpenseCategories, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory } from "@/services/expense-category-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

export function ExpenseCategoryManagement() {
  const { user } = useAuth();
  const [categories, setCategories] = React.useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<ExpenseCategory | null>(null);
  const { toast } = useToast();

  const fetchCategories = React.useCallback(async () => {
    if (!user?.prefix) return;
    try {
      setIsLoading(true);
      const categoriesFromDb = await getExpenseCategories(user.prefix);
      setCategories(categoriesFromDb);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las categorías de gasto.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.prefix, toast]);

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAddCategory = async (newCategory: Omit<ExpenseCategory, 'id' | 'prefix'>) => {
    if (!user?.prefix) return;
    try {
      const categoryData = { ...newCategory, prefix: user.prefix };
      await addExpenseCategory(categoryData);
      await fetchCategories();
      setIsFormOpen(false);
       toast({
        title: "Éxito",
        description: "Categoría agregada correctamente.",
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo agregar la categoría.",
      });
    }
  };

  const handleUpdateCategory = async (updatedCategory: Pick<ExpenseCategory, 'id' | 'name' | 'icon'>) => {
    try {
      const { id, ...dataToUpdate } = updatedCategory;
      await updateExpenseCategory(id, dataToUpdate);
      await fetchCategories();
      setEditingCategory(null);
      setIsFormOpen(false);
      toast({
        title: "Éxito",
        description: "Categoría actualizada correctamente.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la categoría.",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
     try {
      await deleteExpenseCategory(categoryId);
      await fetchCategories();
      toast({
        title: "Éxito",
        description: "Categoría eliminada correctamente.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la categoría.",
      });
    }
  };
  
  const handleEditClick = (category: ExpenseCategory) => {
      setEditingCategory(category);
      setIsFormOpen(true);
  }

  const handleOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingCategory(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Categorías de Gasto</CardTitle>
            <CardDescription>
              Crea, edita y elimina las categorías utilizadas en los registros de gastos.
            </CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Categoría
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Editar' : 'Agregar'} Categoría</DialogTitle>
              </DialogHeader>
              <ExpenseCategoryForm
                onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory}
                category={editingCategory}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            <span>Cargando categorías...</span>
          </div>
        ) : (
          <ExpenseCategoryTable data={categories} onEdit={handleEditClick} onDelete={handleDeleteCategory} />
        )}
      </CardContent>
    </Card>
  );
}
