
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ExpenseCategory } from "@/lib/data";

const categoriesCollectionRef = collection(db, "expenseCategories");

// Get all categories for a specific prefix
export async function getExpenseCategories(prefix: string): Promise<ExpenseCategory[]> {
    const q = query(categoriesCollectionRef, where("prefix", "==", prefix));
    const data = await getDocs(q);
    const categories = data.docs.map(doc => ({ ...doc.data(), id: doc.id })) as ExpenseCategory[];
    return categories.sort((a, b) => a.name.localeCompare(b.name));
}

// Add a new category
export async function addExpenseCategory(category: Omit<ExpenseCategory, 'id'>): Promise<ExpenseCategory> {
    const dataToAdd = {
        name: category.name,
        prefix: category.prefix,
        icon: category.icon || 'ListTree', // Default icon
    };
    const docRef = await addDoc(categoriesCollectionRef, dataToAdd);
    return { ...dataToAdd, id: docRef.id };
}

// Update an existing category
export async function updateExpenseCategory(id: string, category: Partial<Omit<ExpenseCategory, 'id'>>) {
    const categoryDoc = doc(db, "expenseCategories", id);
    await updateDoc(categoryDoc, category);
}

// Delete a category
export async function deleteExpenseCategory(id: string) {
    const categoryDoc = doc(db, "expenseCategories", id);
    await deleteDoc(categoryDoc);
}
