

'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { startOfMonth, endOfMonth } from "date-fns";
import { db } from "@/lib/firebase";
import type { OficinaRegistro, OficinaSemanalRegistro } from "@/lib/data";

const oficinasCollectionRef = collection(db, "registro_oficinas");
const registrosCollectionRef = collection(db, "registro_semanal");

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
    const oficinaDoc = doc(db, "registro_oficinas", id);
    await deleteDoc(oficinaDoc);
}


// --- Weekly Registrations ---

export async function getRegistrosByOficinaAndMonth(oficinaId: string, month: Date): Promise<OficinaSemanalRegistro[]> {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const q = query(
        registrosCollectionRef,
        where("oficinaId", "==", oficinaId),
        where("weekStartDate", ">=", monthStart),
        where("weekStartDate", "<=", monthEnd)
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Defensive date conversion
        let weekStartDate = new Date(); // Default date
        if (data.weekStartDate && typeof data.weekStartDate.toDate === 'function') {
            weekStartDate = data.weekStartDate.toDate();
        }

        let updatedAt = new Date(); // Default date
        if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
            updatedAt = data.updatedAt.toDate();
        }
        
        return {
            ...data,
            id: doc.id,
            weekStartDate,
            updatedAt,
        } as OficinaSemanalRegistro;
    });
}

export async function addOrUpdateRegistroSemanal(registro: Omit<OficinaSemanalRegistro, 'id'>) {
    // ID is a composite of oficinaId and the week's start date
    const docId = `${registro.oficinaId}_${registro.weekStartDate.toISOString().split('T')[0]}`;
    const docRef = doc(db, "registro_semanal", docId);
    
    const dataWithTimestamps = {
        ...registro,
        weekStartDate: Timestamp.fromDate(registro.weekStartDate),
        updatedAt: Timestamp.fromDate(registro.updatedAt),
    };

    await setDoc(docRef, dataWithTimestamps, { merge: true });
}
