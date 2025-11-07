
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { OficinaRegistro } from "@/lib/data";

const oficinasCollectionRef = collection(db, "registro_oficinas");

export async function getOficinas(prefix: string): Promise<OficinaRegistro[]> {
    const q = query(oficinasCollectionRef, where("prefix", "==", prefix));
    const snapshot = await getDocs(q);
    const oficinas = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as OficinaRegistro[];
    return oficinas.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getOficinaById(id: string): Promise<OficinaRegistro | null> {
    const docRef = doc(db, "registro_oficinas", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as OficinaRegistro;
    }
    return null;
}

export async function addOficina(oficina: Omit<OficinaRegistro, 'id'>): Promise<OficinaRegistro> {
    const docRef = await addDoc(oficinasCollectionRef, oficina);
    return { ...oficina, id: docRef.id };
}

export async function updateOficina(id: string, oficina: Partial<Omit<OficinaRegistro, 'id'>>) {
    const oficinaDoc = doc(db, "registro_oficinas", id);
    await updateDoc(oficinaDoc, oficina);
}

export async function deleteOficina(id: string) {
    // TODO: Add logic to delete associated weekly/monthly records when they are implemented
    const oficinaDoc = doc(db, "registro_oficinas", id);
    await deleteDoc(oficinaDoc);
}
