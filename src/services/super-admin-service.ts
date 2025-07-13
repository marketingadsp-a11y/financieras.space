'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SuperAdmin } from "@/lib/data";

const superAdminsCollectionRef = collection(db, "super-admins");

// Create initial super admin if none exist
(async () => {
    const snapshot = await getDocs(superAdminsCollectionRef);
    if (snapshot.empty) {
        console.log("No super admins found, creating default 'Cristobal' user...");
        await addDoc(superAdminsCollectionRef, {
            username: "Cristobal",
            password: "0120",
            prefix: "demo"
        });
    }
})();

export async function getSuperAdmins(): Promise<SuperAdmin[]> {
    const data = await getDocs(superAdminsCollectionRef);
    const admins = data.docs.map(doc => ({ ...doc.data(), id: doc.id })) as SuperAdmin[];
    return admins;
}

export async function addSuperAdmin(admin: Omit<SuperAdmin, 'id'>) : Promise<SuperAdmin> {
    const docRef = await addDoc(superAdminsCollectionRef, admin);
    return { ...admin, id: docRef.id };
}

export async function updateSuperAdmin(id: string, admin: Partial<Omit<SuperAdmin, 'id'>>) {
    const adminDoc = doc(db, "super-admins", id);
    await updateDoc(adminDoc, admin);
}

export async function deleteSuperAdmin(id: string) {
    const adminDoc = doc(db, "super-admins", id);
    await deleteDoc(adminDoc);
}

export async function getSuperAdminById(id: string): Promise<SuperAdmin | null> {
    const docRef = doc(db, "super-admins", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as SuperAdmin;
    }
    return null;
}


export async function getSuperAdminByUsername(username: string): Promise<SuperAdmin & {password: string} | null> {
    const q = query(superAdminsCollectionRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const adminDoc = querySnapshot.docs[0];
    return { id: adminDoc.id, ...adminDoc.data() } as SuperAdmin & {password: string};
}
