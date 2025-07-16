
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TransactionCategory } from "@/lib/data";

const categoriesCollectionRef = collection(db, "transactionCategories");

// Get all categories for a specific prefix
export async function getTransactionCategories(prefix: string): Promise<TransactionCategory[]> {
    const q = query(categoriesCollectionRef, where("prefix", "==", prefix));
    const data = await getDocs(q);
    const categories = data.docs.map(doc => ({ ...doc.data(), id: doc.id })) as TransactionCategory[];
    return categories.sort((a, b) => a.name.localeCompare(b.name));
}

// Add a new category
export async function addTransactionCategory(category: Omit<TransactionCategory, 'id'>): Promise<TransactionCategory> {
    const dataToAdd = {
        name: category.name,
        prefix: category.prefix,
        icon: category.icon || 'ListTree', // Default icon
        type: category.type
    };
    const docRef = await addDoc(categoriesCollectionRef, dataToAdd);
    return { ...dataToAdd, id: docRef.id };
}

// Update an existing category
export async function updateTransactionCategory(id: string, category: Partial<Omit<TransactionCategory, 'id'>>) {
    const categoryDoc = doc(db, "transactionCategories", id);
    await updateDoc(categoryDoc, category);
}

// Delete a category
export async function deleteTransactionCategory(id: string) {
    const categoryDoc = doc(db, "transactionCategories", id);
    await deleteDoc(categoryDoc);
}
