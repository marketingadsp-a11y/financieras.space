

'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc as getDoc_ } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ToolAdmin } from "@/lib/data";

const toolAdminsCollectionRef = collection(db, "toolAdmins");

export async function getAllToolAdmins(): Promise<ToolAdmin[]> {
    const data = await getDocs(toolAdminsCollectionRef);
    const admins = data.docs.map(doc => ({ ...doc.data(), id: doc.id })) as ToolAdmin[];
    
    // Return without password for security
    return admins.map(admin => {
        const { password, ...adminWithoutPassword } = admin;
        return adminWithoutPassword;
    });
}

// For Super Admin view, includes password
export async function getAllToolAdminsWithPasswords(): Promise<ToolAdmin[]> {
    const data = await getDocs(toolAdminsCollectionRef);
    return data.docs.map(doc => ({ ...doc.data(), id: doc.id })) as ToolAdmin[];
}


export async function getToolAdmins(toolId?: string, prefix?: string): Promise<ToolAdmin[]> {
    const constraints = [];
    if(toolId) {
        constraints.push(where("toolId", "==", toolId));
    }
    if(prefix) {
        constraints.push(where("prefix", "==", prefix));
    }
    const q = query(toolAdminsCollectionRef, ...constraints);
    const data = await getDocs(q);
    const admins = data.docs.map(doc => ({ ...doc.data(), id: doc.id })) as ToolAdmin[];
    
    // Return without password for security
    return admins.map(admin => {
        const { password, ...adminWithoutPassword } = admin;
        return adminWithoutPassword;
    });
}

export async function addToolAdmin(admin: Omit<ToolAdmin, 'id'>) : Promise<ToolAdmin> {
    const docRef = await addDoc(toolAdminsCollectionRef, admin);
    const { password, ...adminWithoutPassword } = admin;
    return { ...adminWithoutPassword, id: docRef.id };
}

export async function updateToolAdmin(id: string, admin: Partial<Omit<ToolAdmin, 'id'>>) {
    const adminDoc = doc(db, "toolAdmins", id);
    await updateDoc(adminDoc, admin);
}

export async function deleteToolAdmin(id: string) {
    const adminDoc = doc(db, "toolAdmins", id);
    await deleteDoc(adminDoc);
}

export async function getToolAdminById(id: string): Promise<ToolAdmin | null> {
    const docRef = doc(db, 'toolAdmins', id);
    const docSnap = await getDoc_(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        return { id: docSnap.id, ...data } as ToolAdmin;
    }
    return null;
}

export async function getToolAdminByUsername(username: string, prefix?: string): Promise<ToolAdmin & {password: string} | null> {
    const q = prefix
        ? query(toolAdminsCollectionRef, where("username", "==", username), where("prefix", "==", prefix))
        : query(toolAdminsCollectionRef, where("username", "==", username));

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const adminDoc = querySnapshot.docs[0];
    return { id: adminDoc.id, ...adminDoc.data() } as ToolAdmin & {password: string};
}
