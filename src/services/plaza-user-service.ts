
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PlazaUser } from "@/lib/data";

const plazaUsersCollectionRef = collection(db, "plazaUsers");

export async function getPlazaUsersByPrefix(prefix: string): Promise<PlazaUser[]> {
    const q = query(plazaUsersCollectionRef, where("prefix", "==", prefix));
    const data = await getDocs(q);
    const users = data.docs.map(doc => ({ ...doc.data(), id: doc.id })) as PlazaUser[];
    return users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    });
}

export async function addPlazaUser(user: Omit<PlazaUser, 'id'>) : Promise<PlazaUser> {
    const docRef = await addDoc(plazaUsersCollectionRef, user);
    const { password, ...userWithoutPassword } = user;
    return { ...userWithoutPassword, id: docRef.id };
}

export async function updatePlazaUser(id: string, user: Partial<Omit<PlazaUser, 'id'>>) {
    const userDoc = doc(db, "plazaUsers", id);
    await updateDoc(userDoc, user);
}

export async function deletePlazaUser(id: string) {
    const userDoc = doc(db, "plazaUsers", id);
    await deleteDoc(userDoc);
}

export async function getPlazaUserByUsername(username: string, prefix?: string): Promise<PlazaUser & {password: string} | null> {
    let q;
    if (prefix) {
        q = query(plazaUsersCollectionRef, where("username", "==", username), where("prefix", "==", prefix));
    } else {
        q = query(plazaUsersCollectionRef, where("username", "==", username));
    }
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const userDoc = querySnapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as PlazaUser & {password: string};
}
