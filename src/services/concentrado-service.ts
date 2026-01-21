
'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ConcentradoOficina, ConcentradoSemanal } from "@/lib/data";

const oficinasCollectionRef = collection(db, "concentrado_oficinas");
const registrosSemanalCollectionRef = collection(db, "concentrado_registros_semanal");


export async function getConcentradoOficinas(prefix: string): Promise<ConcentradoOficina[]> {
    const q = query(oficinasCollectionRef, where("prefix", "==", prefix));
    const snapshot = await getDocs(q);
    const oficinas = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as ConcentradoOficina[];
    return oficinas.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getConcentradoOficinaById(id: string): Promise<ConcentradoOficina | null> {
    const docRef = doc(db, "concentrado_oficinas", id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as ConcentradoOficina : null;
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


// --- Weekly Registrations ---

export async function getRegistrosByOficina(oficinaId: string): Promise<ConcentradoSemanal[]> {
    const q = query(registrosSemanalCollectionRef, where("oficinaId", "==", oficinaId));

    const snapshot = await getDocs(q);
    
    const registros = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const toDateSafe = (timestamp: any): Date => {
             if (!timestamp) return new Date(0);
             if (timestamp instanceof Timestamp) return timestamp.toDate();
             if (timestamp && typeof (timestamp as any).toDate === 'function') return (timestamp as any).toDate();
             if (typeof timestamp === 'string' || typeof timestamp === 'number') {
                const d = new Date(timestamp);
                if (!isNaN(d.getTime())) return d;
             }
             return new Date(0);
        };
        
        return {
            ...data,
            id: docSnap.id,
            weekStartDate: toDateSafe(data.weekStartDate),
            updatedAt: toDateSafe(data.updatedAt),
        } as ConcentradoSemanal;
    });

    return registros;
}

export async function addOrUpdateRegistroSemanal(registro: Omit<ConcentradoSemanal, 'id'>) {
    const startDate = registro.weekStartDate;
    
    // Use UTC date parts for a timezone-agnostic ID
    const dateString = `${startDate.getUTCFullYear()}-${String(startDate.getUTCMonth() + 1).padStart(2, '0')}-${String(startDate.getUTCDate()).padStart(2, '0')}`;
    const docId = `${registro.oficinaId}_${dateString}`;
    
    const docRef = doc(db, "concentrado_registros_semanal", docId);
    
    const dataWithTimestamps = {
        ...registro,
        weekStartDate: Timestamp.fromDate(startDate),
        updatedAt: Timestamp.now(),
    };

    await setDoc(docRef, dataWithTimestamps, { merge: true });
}
