
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ConcentradoOficina } from "@/lib/data";

const oficinasCollectionRef = collection(db, "concentrado_oficinas");

export async function getConcentradoOficinas(prefix: string): Promise<ConcentradoOficina[]> {
    const q = query(oficinasCollectionRef, where("prefix", "==", prefix));
    const snapshot = await getDocs(q);
    const oficinas = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as ConcentradoOficina[];
    return oficinas.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addConcentradoOficina(oficina: Omit<ConcentradoOficina, 'id'>): Promise<ConcentradoOficina> {
    const docRef = await addDoc(oficinasCollectionRef, oficina);
    return { ...oficina, id: docRef.id };
}

export async function updateConcentradoOficina(id: string, oficina: Partial<Omit<ConcentradoOficina, 'id'>>) {
    const oficinaDoc = doc(db, "concentrado_oficinas", id);
    await updateDoc(oficinaDoc, oficina);
}

export async function deleteConcentradoOficina(id: string) {
    const oficinaDoc = doc(db, "concentrado_oficinas", id);
    await deleteDoc(oficinaDoc);
}
