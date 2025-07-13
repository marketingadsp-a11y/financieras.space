'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Admin } from "@/lib/data";

const adminsCollectionRef = collection(db, "admins");

// This function gets ALL admins, intended for SuperAdmin use
export async function getAdmins(): Promise<Admin[]> {
    const data = await getDocs(adminsCollectionRef);
    const admins = data.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Admin[];
    return admins.map(admin => {
        const { password, ...adminWithoutPassword } = admin;
        return adminWithoutPassword;
    });
}

// This function gets admins by a specific prefix
export async function getAdminsByPrefix(prefix: string): Promise<Admin[]> {
    const q = query(adminsCollectionRef, where("prefix", "==", prefix));
    const data = await getDocs(q);
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

export async function getAdminByUsername(username: string, prefix?: string): Promise<Admin & {password: string} | null> {
    const q = prefix 
        ? query(adminsCollectionRef, where("username", "==", username), where("prefix", "==", prefix))
        : query(adminsCollectionRef, where("username", "==", username)); // This case might be ambiguous if prefixes are used, but kept for flexibility
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const adminDoc = querySnapshot.docs[0];
    return { id: adminDoc.id, ...adminDoc.data() } as Admin & {password: string};
}
