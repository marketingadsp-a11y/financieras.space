

'use server';

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc, setDoc, Timestamp, orderBy } from "firebase/firestore";
import { startOfMonth, endOfMonth } from "date-fns";
import { db } from "@/lib/firebase";
import type { OficinaRegistro, OficinaSemanalRegistro } from "@/lib/data";

const oficinasCollectionRef = collection(db, "registro_oficinas");
const registrosCollectionRef = collection(db, "registro_semanal");

// Function to generate a unique 4-digit ID for an oficina
async function generateUniqueDisplayId(prefix: string): Promise<string> {
    let unique = false;
    let newId = '';
    while (!unique) {
        newId = Math.floor(1000 + Math.random() * 9000).toString();
        const q = query(oficinasCollectionRef, where("prefix", "==", prefix), where("displayId", "==", newId));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            unique = true;
        }
    }
    return newId;
}

export async function getOficinas(prefix: string): Promise<OficinaRegistro[]> {
    const q = query(oficinasCollectionRef, where("prefix", "==", prefix));
    const snapshot = await getDocs(q);
    const oficinas = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as OficinaRegistro[];
    return oficinas.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getOficinaById(id: string): Promise<OficinaRegistro | null> {
    if (!id) return null;
    const docRef = doc(db, "registro_oficinas", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as OficinaRegistro;
    }
    return null;
}


export async function addOficina(oficina: Omit<OficinaRegistro, 'id' | 'displayId'>): Promise<OficinaRegistro> {
    const displayId = await generateUniqueDisplayId(oficina.prefix);
    const dataToSave = { ...oficina, displayId };
    const docRef = await addDoc(oficinasCollectionRef, dataToSave);
    return { ...dataToSave, id: docRef.id };
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

export async function getTodosRegistrosPorOficina(oficinaId: string): Promise<OficinaSemanalRegistro[]> {
    const q = query(registrosCollectionRef, where("oficinaId", "==", oficinaId));

    const snapshot = await getDocs(q);
    
    const registros = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
         const toDateSafe = (timestamp: any): Date => {
            if (timestamp instanceof Timestamp) {
                return timestamp.toDate();
            }
            if (timestamp && typeof timestamp.toDate === 'function') {
                 return timestamp.toDate();
            }
            // Fallback for string or number dates
            if (typeof timestamp === 'string' || typeof timestamp === 'number') {
                const d = new Date(timestamp);
                if (!isNaN(d.getTime())) return d;
            }
            // Return a default or invalid date if conversion fails
            return new Date(0); 
        };
        
        return {
            ...data,
            id: docSnap.id,
            weekStartDate: toDateSafe(data.weekStartDate),
            updatedAt: toDateSafe(data.updatedAt),
        } as OficinaSemanalRegistro;
    });

    return registros;
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

// Kept the old function for reference, but it's no longer used by the panel
export async function getRegistrosByOficinaAndMonth(oficinaId: string, prefix: string, month: Date): Promise<OficinaSemanalRegistro[]> {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const q = query(
        registrosCollectionRef,
        where("oficinaId", "==", oficinaId),
        where("prefix", "==", prefix),
        where("weekStartDate", ">=", Timestamp.fromDate(monthStart)),
        where("weekStartDate", "<=", Timestamp.fromDate(monthEnd))
    );

    const snapshot = await getDocs(q);
    
    const registros = snapshot.docs.map(doc => {
        const data = doc.data();
        
        const toDate = (timestamp: unknown): Date => {
             if (timestamp instanceof Timestamp) {
              return timestamp.toDate();
            }
            if (timestamp && typeof (timestamp as any).toDate === 'function') {
                return (timestamp as any).toDate();
            }
            if (typeof timestamp === 'string' || typeof timestamp === 'number') {
              const d = new Date(timestamp);
              if (!isNaN(d.getTime())) return d;
            }
            return new Date(0); 
        };
        
        return {
            ...data,
            id: doc.id,
            weekStartDate: toDate(data.weekStartDate),
            updatedAt: toDate(data.updatedAt),
        } as OficinaSemanalRegistro;
    });

    return registros.sort((a, b) => a.weekStartDate.getTime() - b.weekStartDate.getTime());
}
