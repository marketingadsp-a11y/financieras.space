'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Admin } from "@/lib/data";

const adminsCollectionRef = collection(db, "admins");

export async function getAdmins(): Promise<Admin[]> {
    const data = await getDocs(adminsCollectionRef);
    const admins = data.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Admin[];
    return admins.map(admin => {
        const { password, ...adminWithoutPassword } = admin;
        return adminWithoutPassword;
    });
}

export async function addAdmin(admin: Omit<Admin, 'id'>) : Promise<Admin> {
    const docRef = await addDoc(adminsCollectionRef, admin);
    const { password, ...adminWithoutPassword } = admin;
    return { ...adminWithoutPassword, id: docRef.id };
}

export async function updateAdmin(id: string, admin: Partial<Omit<Admin, 'id'>>) {
    const adminDoc = doc(db, "admins", id);
    await updateDoc(adminDoc, admin);
}

export async function deleteAdmin(id: string) {
    const adminDoc = doc(db, "admins", id);
    await deleteDoc(adminDoc);
}

export async function getAdminByUsername(username: string): Promise<Admin & {password: string} | null> {
    const q = query(adminsCollectionRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const adminDoc = querySnapshot.docs[0];
    return { id: adminDoc.id, ...adminDoc.data() } as Admin & {password: string};
}
