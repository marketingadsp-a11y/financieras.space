
"use client";

import * as React from "react";
import { PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryTable } from "@/components/tools/income-expenses/categories/category-table";
import { CategoryForm } from "@/components/tools/income-expenses/categories/category-form";
import type { TransactionCategory } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getTransactionCategories, addTransactionCategory, updateTransactionCategory, deleteTransactionCategory } from "@/services/transaction-category-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function CategoriesManagement() {
  const { user } = useAuth();
  const [categories, setCategories] = React.useState<TransactionCategory[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<TransactionCategory | null>(null);
  const [formCategoryType, setFormCategoryType] = React.useState<'income' | 'expense'>('expense');
  const { toast } = useToast();

  const fetchCategories = React.useCallback(async () => {
    if (!user?.prefix) return;
    try {
      setIsLoading(true);
      const categoriesFromDb = await getTransactionCategories(user.prefix);
      setCategories(categoriesFromDb);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las categorías.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.prefix, toast]);

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAddCategory = async (newCategory: Omit<TransactionCategory, 'id' | 'prefix'>) => {
    if (!user?.prefix) return;
    try {
      const categoryData = { ...newCategory, prefix: user.prefix };
      await addTransactionCategory(categoryData);
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

  const handleUpdateCategory = async (updatedCategory: TransactionCategory) => {
    try {
      const { id, ...dataToUpdate } = updatedCategory;
      await updateTransactionCategory(id, dataToUpdate);
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
      await deleteTransactionCategory(categoryId);
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
  
  const handleEditClick = (category: TransactionCategory) => {
      setEditingCategory(category);
      setFormCategoryType(category.type);
      setIsFormOpen(true);
  }
  
  const handleOpenNewDialog = (type: 'income' | 'expense') => {
    setEditingCategory(null);
    setFormCategoryType(type);
    setIsFormOpen(true);
  }

  const handleOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingCategory(null);
    }
  }

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <Tabs defaultValue="gastos">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
                    <div>
                        <CardTitle>Gestión de Categorías</CardTitle>
                        <CardDescription>
                        Crea, edita y elimina las categorías para los registros de ingresos y gastos.
                        </CardDescription>
                    </div>
                    <TabsList>
                        <TabsTrigger value="gastos">Gastos</TabsTrigger>
                        <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
                    </TabsList>
                </div>
            </CardHeader>
        </Card>
        
        <TabsContent value="gastos" className="mt-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl">Categorías de Gasto</CardTitle>
                            <CardDescription>Usadas para clasificar las salidas de dinero.</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => handleOpenNewDialog('expense')}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Agregar Categoría de Gasto
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                            <span>Cargando categorías...</span>
                        </div>
                    ) : (
                        <CategoryTable data={expenseCategories} onEdit={handleEditClick} onDelete={handleDeleteCategory} />
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="ingresos" className="mt-6">
             <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl">Categorías de Ingreso</CardTitle>
                             <CardDescription>Usadas para clasificar las entradas de dinero.</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => handleOpenNewDialog('income')}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Agregar Categoría de Ingreso
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                            <span>Cargando categorías...</span>
                        </div>
                    ) : (
                        <CategoryTable data={incomeCategories} onEdit={handleEditClick} onDelete={handleDeleteCategory} />
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingCategory ? 'Editar' : 'Agregar'} Categoría de {formCategoryType === 'income' ? 'Ingreso' : 'Gasto'}</DialogTitle>
                </DialogHeader>
                <CategoryForm
                    onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory}
                    category={editingCategory}
                    type={formCategoryType}
                />
            </DialogContent>
        </Dialog>
    </Tabs>
  );
}
