
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Plaza } from "@/lib/data";

const plazasCollectionRef = collection(db, "plazas");

export async function getPlazas(): Promise<Plaza[]> {
    const data = await getDocs(plazasCollectionRef);
    const plazas = data.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Plaza[];
    // Aquí podrías calcular pendingDebt y recoveryRate si fuera necesario
    return plazas.map(p => ({
        ...p,
        pendingDebt: p.pendingDebt || 0,
        recoveryRate: p.recoveryRate || 0
    }));
}

export async function getPlazaById(id: string): Promise<Plaza | null> {
    const plazaDocRef = doc(db, "plazas", id);
    const plazaDoc = await getDoc(plazaDocRef);

    if (plazaDoc.exists()) {
        const plazaData = plazaDoc.data() as Omit<Plaza, 'id'>;
        return { 
            id: plazaDoc.id, 
            ...plazaData,
            pendingDebt: plazaData.pendingDebt || 0,
            recoveryRate: plazaData.recoveryRate || 0
        };
    } else {
        return null;
    }
}


export async function addPlaza(plaza: Omit<Plaza, 'id' | 'pendingDebt' | 'recoveryRate'>) : Promise<Plaza> {
    const dataToSave = {
        name: plaza.name,
        pendingDebt: 0,
        recoveryRate: 0,
    }
    const docRef = await addDoc(plazasCollectionRef, dataToSave);
    return { ...dataToSave, id: docRef.id };
}

export async function updatePlaza(id: string, plaza: Partial<Omit<Plaza, 'id'>>) {
    const plazaDoc = doc(db, "plazas", id);
    await updateDoc(plazaDoc, plaza);
}

export async function deletePlaza(id: string) {
    const plazaDoc = doc(db, "plazas", id);
    await deleteDoc(plazaDoc);
}
