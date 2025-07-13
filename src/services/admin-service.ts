'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Admin } from "@/lib/data";

const adminsCollectionRef = collection(db, "admins");

export async function getAdmins(): Promise<Admin[]> {
    const data = await getDocs(adminsCollectionRef);
    const admins = data.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Admin[];
    return admins;
}

export async function addAdmin(admin: Omit<Admin, 'id'>) : Promise<Admin> {
    const docRef = await addDoc(adminsCollectionRef, admin);
    return { ...admin, id: docRef.id };
}

export async function updateAdmin(id: string, admin: Partial<Omit<Admin, 'id'>>) {
    const adminDoc = doc(db, "admins", id);
    await updateDoc(adminDoc, admin);
}

export async function deleteAdmin(id: string) {
    const adminDoc = doc(db, "admins", id);
    await deleteDoc(adminDoc);
}
